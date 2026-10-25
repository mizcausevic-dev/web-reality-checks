// Episode 18 fixture: the CORRECTED webhook receiver. Loopback only, ephemeral port.
//
//   POST /webhooks/subhub
//     1. read the RAW body bytes
//     2. verify  HMAC-SHA256(secret, `${ts}.${rawBytes}`)  with crypto.timingSafeEqual   -> 401 on mismatch
//     3. enforce |now - ts| <= TOLERANCE_S (default 300 s; clock is injectable)           -> 401 when outside
//     4. ONLY NOW parse JSON and validate the shape                                       -> 400 when invalid
//     5. db.applyEvent(): event record + state update in ONE transaction;
//        UNIQUE (provider, event_id) deduplicates; version must be > stored to apply
//     6. 200 only after COMMIT; 200 also for a verified duplicate already handled;
//        503 when the commit cannot complete (nothing was changed, the provider should retry)
//   GET  /state/:subscription_id   evidence helper
//   GET  /events                   evidence helper
//
// Test-only fault injection: header `X-Fault: fail-commit` makes the store throw at commit time.
// A production receiver would not have this header; it exists so the test can prove the 5xx path.
import http from 'node:http';
import crypto from 'node:crypto';
import {createDb} from './db.mjs';
import {PROVIDER, SECRET} from './provider.mjs';

export const TOLERANCE_S = 300;

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const readRaw = (req) => new Promise((resolve, reject) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });

/** Constant-time comparison of the expected and presented signatures. Returns false on any shape mismatch. */
export const verifySignature = (secret, tsHeader, rawBody, sigHeader) => {
  if (typeof tsHeader !== 'string' || !/^\d{1,12}$/.test(tsHeader)) return false;
  const m = /^v1=([0-9a-f]{64})$/.exec(sigHeader ?? '');
  if (!m) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${tsHeader}.`).update(rawBody).digest();
  const presented = Buffer.from(m[1], 'hex');
  if (expected.length !== presented.length) return false;
  return crypto.timingSafeEqual(expected, presented);
};

/** Validate the parsed event shape. Returns {ok, event} or {ok:false, error}. */
export const validateEvent = (x) => {
  const bad = (error) => ({ok: false, error});
  if (!x || typeof x !== 'object') return bad('body is not an object');
  if (typeof x.event_id !== 'string' || !/^evt_[0-9a-f]{12}$/.test(x.event_id)) return bad('event_id');
  if (typeof x.subscription_id !== 'string' || !/^sub_[A-Za-z0-9_]{1,32}$/.test(x.subscription_id)) return bad('subscription_id');
  if (typeof x.type !== 'string' || !/^subscription\.[a-z_]+$/.test(x.type)) return bad('type');
  if (!Number.isInteger(x.version) || x.version < 1) return bad('version');
  if (typeof x.event_ts !== 'string' || Number.isNaN(Date.parse(x.event_ts))) return bad('event_ts');
  const s = x.snapshot;
  if (!s || typeof s !== 'object') return bad('snapshot');
  if (s.subscription_id !== x.subscription_id || s.version !== x.version) return bad('snapshot does not match envelope');
  if (!['active', 'past_due', 'canceled', 'trialing'].includes(s.status)) return bad('snapshot.status');
  if (typeof s.plan !== 'string' || !s.plan) return bad('snapshot.plan');
  return {ok: true, event: {event_id: x.event_id, subscription_id: x.subscription_id, type: x.type, version: x.version, event_ts: x.event_ts, snapshot: {subscription_id: s.subscription_id, version: s.version, status: s.status, plan: s.plan}}};
};

/**
 * Create a receiver. `now` is an injectable clock (unix seconds) so freshness tests do not sleep.
 */
export const createReceiver = ({secret = SECRET, toleranceS = TOLERANCE_S, now = () => Math.floor(Date.now() / 1000), db = createDb()} = {}) => {
  const log = []; // {event_id, outcome, status} for evidence
  const app = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let m;
    if (req.method === 'POST' && url.pathname === `/webhooks/${PROVIDER}`) {
      const raw = await readRaw(req);
      const ts = req.headers['x-subhub-timestamp'];
      // (2) signature over the RAW bytes — before any JSON.parse / re-serialisation
      if (!verifySignature(secret, ts, raw, req.headers['x-subhub-signature'])) {
        log.push({outcome: 'rejected_signature', status: 401});
        return json(res, 401, {error: 'invalid signature'});
      }
      // (3) freshness of the DELIVERY, not of the event
      const age = Math.abs(now() - Number(ts));
      if (age > toleranceS) {
        log.push({outcome: 'rejected_timestamp', status: 401, age_s: age});
        return json(res, 401, {error: 'delivery timestamp outside tolerance', age_s: age, tolerance_s: toleranceS});
      }
      // (4) parse + validate only after the bytes are trusted
      let parsed;
      try { parsed = JSON.parse(raw.toString('utf8')); } catch { return json(res, 400, {error: 'invalid JSON'}); }
      const v = validateEvent(parsed);
      if (!v.ok) { log.push({outcome: 'rejected_invalid', status: 400, field: v.error}); return json(res, 400, {error: 'invalid event', field: v.error}); }
      // (5) one transaction: event record + state
      let r;
      try {
        r = db.applyEvent(PROVIDER, v.event, {failCommit: req.headers['x-fault'] === 'fail-commit'});
      } catch (e) {
        log.push({event_id: v.event.event_id, outcome: 'commit_failed', status: 503});
        return json(res, 503, {error: 'could not commit; retry later', detail: e.message}); // nothing was changed
      }
      // (6) 200 only here, after commit (or for a verified duplicate already committed earlier)
      log.push({event_id: v.event.event_id, version: v.event.version, outcome: r.outcome, status: 200});
      return json(res, 200, {received: true, event_id: v.event.event_id, outcome: r.outcome, stored_version: r.state?.version ?? null});
    }
    if (req.method === 'GET' && (m = url.pathname.match(/^\/state\/(sub_[A-Za-z0-9_]+)$/))) {
      const s = db.getState(m[1]);
      return s ? json(res, 200, s) : json(res, 404, {error: 'no such subscription'});
    }
    if (req.method === 'GET' && url.pathname === '/events') return json(res, 200, {count: db.countEvents(), events: db.listEvents()});
    json(res, 404, {error: 'not found'});
  });
  const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
  return {app, db, log, listen, close: () => new Promise((r) => app.close(() => { db.close(); r(); }))};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const rcv = createReceiver();
  rcv.listen().then((p) => console.log(`ep18 receiver (${rcv.db.kind}) on http://127.0.0.1:${p}`));
}
