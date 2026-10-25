// Episode 15 fixture: a mock order service with a deliberately vulnerable "create order" endpoint
// and a corrected, idempotent one. Loopback only. Synthetic users. NO payment provider is contacted;
// "pay" here means "create a mock order row".
//
//   GET  /login/:user        -> test harness: server-side session, opaque cookie
//   POST /vuln/orders        -> VULNERABLE: every request inserts one order
//   POST /orders             -> CORRECTED: requires Idempotency-Key; (session user, operation, key)
//                               is UNIQUE; order + idempotency record committed in ONE transaction;
//                               same key + same fingerprint -> stored result replayed (201, Idempotent-Replayed: true)
//                               same key + different fingerprint -> 422
//                               concurrent in-flight same key -> second waits, then receives stored result
//   GET  /orders             -> list the session user's orders (for evidence)
//
// Controlled fault: request header `X-Fault: lose-response` makes the server COMMIT the write and then
// destroy the socket without writing a response. The client sees a network error and cannot know
// whether the commit happened. That is the real-world ambiguity this episode is about.
//
// Identity comes only from the server-side session table. X-User-Id / body.userId are ignored.
import http from 'node:http';
import crypto from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {createDb, fingerprintOf} from './db.mjs';

export const users = {alice: {id: 'u_alice'}, bob: {id: 'u_bob'}};
const sessions = new Map(); // opaque sid -> {userId}
export const db = createDb();
const OPERATION = 'create_order';
const PROCESSING_MS = 25; // simulated pre-commit work (pricing, stock check); makes concurrency real

const json = (res, code, body, headers = {}) => { res.writeHead(code, {'content-type': 'application/json', ...headers}); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const currentUserId = (req) => { const s = sessions.get(cookieOf(req).sid); return s ? s.userId : null; };
const readBody = (req) => new Promise((r, j) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 65536) j(new Error('too large')); }); req.on('end', () => r(d)); req.on('error', j); });

/** Validate + normalise. Only these fields exist afterwards; anything else (e.g. userId) is dropped. */
export const validateOrder = (raw) => {
  let b; try { b = JSON.parse(raw || '{}'); } catch { return {error: 'invalid json'}; }
  const sku = typeof b.sku === 'string' ? b.sku.trim().toLowerCase() : '';
  const qty = Number(b.qty);
  const amountCents = Number(b.amountCents);
  const currency = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : '';
  if (!/^[a-z0-9_-]{1,40}$/.test(sku)) return {error: 'invalid sku'};
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return {error: 'invalid qty'};
  if (!Number.isInteger(amountCents) || amountCents < 1) return {error: 'invalid amountCents'};
  if (!/^[A-Z]{3}$/.test(currency)) return {error: 'invalid currency'};
  return {fields: {sku, qty, amountCents, currency}};
};

/** Deliver or deliberately lose the response. The DB write has already been committed either way. */
const respond = (req, res, code, body, headers) => {
  if (req.headers['x-fault'] === 'lose-response') { res.socket?.destroy(); return; } // commit happened; response lost
  json(res, code, body, headers);
};

// In-flight registry for the corrected endpoint: (user, op, key) -> promise of the DB outcome.
// Policy: a concurrent request with the same key WAITS for the first and then receives the stored result.
const inflight = new Map();

export const app = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let m;
  if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
    const u = users[m[1]]; if (!u) return json(res, 404, {error: 'no such test user'});
    const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, {userId: u.id});
    res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
    return json(res, 200, {ok: true, user: u.id});
  }
  const userId = currentUserId(req);
  if (!userId) return json(res, 401, {error: 'unauthenticated'});

  if (req.method === 'GET' && url.pathname === '/orders') return json(res, 200, {authenticatedAs: userId, count: db.countOrders(userId), orders: db.listOrders(userId)});

  if (req.method === 'POST' && url.pathname === '/vuln/orders') {
    const v = validateOrder(await readBody(req));
    if (v.error) return json(res, 400, {error: v.error});
    await sleep(PROCESSING_MS);
    const orderId = db.createOrder(userId, v.fields, 'vulnerable');          // <-- every request = one new order
    return respond(req, res, 201, {endpoint: 'vulnerable', orderId, authenticatedAs: userId, ...v.fields});
  }

  if (req.method === 'POST' && url.pathname === '/orders') {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) return json(res, 400, {error: 'Idempotency-Key header required (8-128 chars)'});
    const v = validateOrder(await readBody(req));
    if (v.error) return json(res, 400, {error: v.error});
    const fp = fingerprintOf(v.fields);
    const scope = `${userId}|${OPERATION}|${key}`;              // scoped to the SESSION user, never a client-supplied id
    let p = inflight.get(scope);
    let waited = false;
    if (!p) {
      p = (async () => { await sleep(PROCESSING_MS); return db.createOrderIdempotent(userId, OPERATION, key, v.fields, fp); })();
      inflight.set(scope, p);
      p.finally(() => inflight.delete(scope));
    } else {
      waited = true;
      await p; // wait for the in-flight writer, then resolve against the stored record with OUR fingerprint
    }
    let out;
    try { out = waited ? db.createOrderIdempotent(userId, OPERATION, key, v.fields, fp) : await p; }
    catch (e) { return json(res, 500, {error: 'internal', detail: String(e.message)}); }
    const headers = {'idempotent-replayed': String(out.kind === 'replayed'), ...(waited ? {'idempotent-waited': 'true'} : {})};
    return respond(req, res, out.status, out.body, headers);
  }
  json(res, 404, {error: 'not found'});
});

export const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
if (import.meta.url === `file://${process.argv[1]}`) listen().then((p) => console.log(`ep15 fixture on http://127.0.0.1:${p}`));
