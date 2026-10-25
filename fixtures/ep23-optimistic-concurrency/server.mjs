// Episode 23 fixture: a tiny document service with a FLAWED unconditional save and a CORRECTED
// optimistic-concurrency save. Loopback only. Synthetic users. No real-time collaboration: this
// DETECTS conflicting saves, it does not merge them (no CRDT, no operational transformation).
//
//   GET /login/:user          test harness: server-side session, opaque cookie (alice, bob, mallory)
//   GET /docs/:id             read the document (members only; non-members get 404)
//   PUT /vuln/docs/:id        FLAWED:     body {title, body}                  -> unconditional UPDATE, always 200
//   PUT /docs/:id             CORRECTED:  body {title, body, expectedVersion} -> ONE conditional UPDATE
//        200  saved, response carries the new version
//        409  version conflict ONLY (no row matched id AND version); body carries the CURRENT server document
//        400  malformed body / missing or non-integer expectedVersion
//        401  no session            404  absent OR not a member (authorization is checked first, separately)
//        503  database busy/locked (retryable; NOT a version conflict)   Retry-After header set
//        500  any other unexpected database failure
//
// Authorization (session + membership) is resolved BEFORE the version check and never by it. A 409 body
// contains document content, so it must only ever be produced for an authorized user.
import http from 'node:http';
import crypto from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {createDb, isBusyError} from './db.mjs';

export const users = {alice: {id: 'u_alice'}, bob: {id: 'u_bob'}, mallory: {id: 'u_mallory'}};

const json = (res, code, body, headers = {}) => { res.writeHead(code, {'content-type': 'application/json', ...headers}); res.end(JSON.stringify(body)); };
const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const readBody = (req) => new Promise((r, j) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 65536) j(new Error('too large')); }); req.on('end', () => r(d)); req.on('error', j); });

const parseDocBody = (raw) => {
  let b; try { b = JSON.parse(raw || '{}'); } catch { return {error: 'invalid json'}; }
  if (typeof b !== 'object' || b === null) return {error: 'invalid body'};
  if (typeof b.title !== 'string' || b.title.length < 1 || b.title.length > 120) return {error: 'invalid title'};
  if (typeof b.body !== 'string' || b.body.length > 5000) return {error: 'invalid body text'};
  return {fields: {title: b.title, body: b.body}, raw: b};
};

/**
 * startFixture({file, busyTimeoutMs, processingMs}) -> {port, base, db, requests, stats, close}
 * processingMs is simulated pre-save work (validation, rendering); it keeps concurrent requests
 * genuinely in flight at the same time. It happens BEFORE the single conditional UPDATE.
 */
export const startFixture = async ({file = ':memory:', busyTimeoutMs = 0, processingMs = 20} = {}) => {
  const db = createDb({file, busyTimeoutMs});
  const sessions = new Map(); // opaque sid -> userId
  const requests = []; // {method, path, status}
  const stats = {inFlightPuts: 0, maxInFlightPuts: 0};

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const reply = (code, body, headers) => { requests.push({method: req.method, path: url.pathname, status: code}); json(res, code, body, headers); };
    let m;
    try {
      if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
        const u = users[m[1]]; if (!u) return reply(404, {error: 'no such test user'});
        const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, u.id);
        return reply(200, {ok: true, user: u.id}, {'set-cookie': `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`});
      }
      const userId = sessions.get(cookieOf(req).sid);
      if (!userId) return reply(401, {error: 'unauthenticated'});

      const corrected = (m = url.pathname.match(/^\/docs\/(\w+)$/));
      const vuln = !corrected && (m = url.pathname.match(/^\/vuln\/docs\/(\w+)$/));
      if (!corrected && !vuln) return reply(404, {error: 'not found'});
      const id = m[1];

      // Authorization: separate from versioning. 404 for absent OR inaccessible (no existence oracle).
      if (!db.isMember(id, userId)) return reply(404, {error: 'not found'});

      if (req.method === 'GET' && corrected) return reply(200, db.getDoc(id));
      if (req.method !== 'PUT') return reply(404, {error: 'not found'});

      const parsed = parseDocBody(await readBody(req));
      if (parsed.error) return reply(400, {error: parsed.error});
      stats.inFlightPuts++; stats.maxInFlightPuts = Math.max(stats.maxInFlightPuts, stats.inFlightPuts);
      try {
        await sleep(processingMs);
        if (req.headers['x-fault'] === 'db-error') throw new Error('injected database failure');

        if (vuln) {
          db.updateUnconditional(id, parsed.fields, userId);
          return reply(200, {endpoint: 'vulnerable', ...db.getDoc(id)});
        }

        const ev = parsed.raw.expectedVersion;
        if (!Number.isInteger(ev) || ev < 1) return reply(400, {error: 'expectedVersion (integer >= 1) is required'});
        const r = db.updateIfVersion(id, ev, parsed.fields, userId); // ONE atomic conditional UPDATE
        if (r.changes === 1) return reply(200, {endpoint: 'corrected', id, version: r.version, ...parsed.fields});
        // Zero rows matched id AND version. Re-read only to REPORT the current document; this read
        // plays no part in deciding whether the write was accepted.
        const cur = db.getDoc(id);
        return reply(409, {error: 'version_conflict', expectedVersion: ev, currentVersion: cur.version, current: cur});
      } finally { stats.inFlightPuts--; }
    } catch (e) {
      // A version conflict is NOT an error path. Everything landing here is infrastructure.
      if (isBusyError(e)) return reply(503, {error: 'database_busy', retryable: true}, {'retry-after': '1'});
      return reply(500, {error: 'internal'});
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {port, base: `http://127.0.0.1:${port}`, db, requests, stats, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => { try { db.close(); } catch {} r(); }); })};
};

if (import.meta.url === `file://${process.argv[1]}`) startFixture().then((f) => console.log(`ep23 fixture on ${f.base}`));
