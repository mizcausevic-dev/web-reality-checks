// Episode 16 fixture: loopback-only search API behind a fixed-window rate limiter.
//
//   GET /login/:name        -> TEST HARNESS: server establishes a synthetic identity, sets opaque cookie.
//                              This is a test fixture, not production authentication.
//   GET /search?q=<prefix>  -> 200 {query, results} or 429 {error} + Retry-After: <integer seconds>
//
// Identity for limiting comes ONLY from the server-side identity table keyed by the cookie.
// Client-supplied identity claims (X-Identity header, ?identity=) are ignored by design.
//
// Deliberate fixture policies:
//   - fixed window, 5 allowed requests / 10 000 ms per identity (see limiter.mjs)
//   - rejected requests are answered immediately and do not consume allowance
//   - allowed requests take a deterministic synthetic latency that is LONGER for SHORTER prefixes
//     (a short prefix "matches more rows"); this is what makes out-of-order arrival observable
//   - synthetic catalogue only; no network beyond 127.0.0.1
import http from 'node:http';
import crypto from 'node:crypto';
import {createLimiter, realClock} from './limiter.mjs';

export const CATALOGUE = [
  'postgres', 'postgresql tuning', 'postgres replication', 'postfix', 'posix threads', 'post-mortem template',
  'pnpm workspaces', 'playwright', 'prometheus', 'pulumi', 'python asyncio', 'parquet',
];

/** Synthetic latency in clock ms for an allowed search: shorter prefix -> slower. */
export const latencyFor = (q) => 150 * (9 - Math.min(q.length, 8)); // "p" 1200 ms … "postgres" 150 ms

export const createApp = ({clock = realClock(), limit = 5, windowMs = 10_000} = {}) => {
  const limiter = createLimiter({limit, windowMs, clock});
  const identities = new Map(); // opaque cookie value -> identity id
  const log = []; // every /search request as the SERVER saw it
  let n = 0;

  const json = (res, code, body, headers = {}) => { res.writeHead(code, {'content-type': 'application/json', ...headers}); res.end(JSON.stringify(body)); };
  const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));

  const app = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let m;
    if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
      const sid = crypto.randomBytes(16).toString('hex');
      identities.set(sid, `id_${m[1]}`);
      res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
      return json(res, 200, {ok: true, identity: `id_${m[1]}`, note: 'synthetic test identity, not production auth'});
    }
    if (req.method === 'GET' && url.pathname === '/search') {
      const identity = identities.get(cookieOf(req).sid); // header/query identity claims are never read
      if (!identity) return json(res, 401, {error: 'no server-established identity'});
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const at = clock.now();
      const verdict = limiter.check(identity);
      const entry = {n: ++n, at, identity, q, status: verdict.allowed ? 200 : 429, remaining: verdict.remaining, retryAfter: verdict.allowed ? null : verdict.retryAfterSeconds};
      log.push(entry);
      res.setHeader('ratelimit-limit', String(verdict.limit));
      res.setHeader('ratelimit-remaining', String(verdict.remaining));
      if (!verdict.allowed) {
        // Retry-After as delta-seconds (this fixture's declared format; real servers may send an HTTP-date instead).
        return json(res, 429, {error: 'rate limited', retryAfterSeconds: verdict.retryAfterSeconds, resetAt: verdict.resetAt}, {'retry-after': String(verdict.retryAfterSeconds)});
      }
      const results = CATALOGUE.filter((s) => s.startsWith(q));
      const finish = () => { entry.servedAt = clock.now(); json(res, 200, {query: q, results, servedAt: entry.servedAt}); };
      if (q.length === 0) return finish();
      const id = clock.setTimeout(finish, latencyFor(q));
      // Client went away before we answered (e.g. AbortController). This fixture stops its synthetic
      // work as a courtesy; a real server may already have done the work. The abort is logged so the
      // evidence shows what the SERVER saw, not what the client assumed.
      req.on('close', () => { if (!res.writableEnded) { entry.abortedByClient = true; entry.abortedAt = clock.now(); clock.clearTimeout(id); } });
      return;
    }
    json(res, 404, {error: 'not found'});
  });

  const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
  const close = () => new Promise((r) => { app.closeAllConnections?.(); app.close(() => r()); });
  return {app, listen, close, log, limiter, clock, identities};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = createApp();
  s.listen().then((p) => console.log(`ep16 fixture on http://127.0.0.1:${p}  (GET /login/tester, then GET /search?q=po)`));
}
