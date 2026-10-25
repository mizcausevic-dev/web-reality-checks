// Episode 18 fixture: the NAIVE receiver (known-positive control). Loopback only.
//
// It verifies the signature and the delivery timestamp exactly like the corrected receiver, so the
// only difference under test is PROCESSING: it applies every verified event in ARRIVAL order.
// No event-id dedup, no version comparison. An older event arriving late overwrites newer state.
import http from 'node:http';
import {createDb} from './db.mjs';
import {PROVIDER, SECRET} from './provider.mjs';
import {TOLERANCE_S, validateEvent, verifySignature} from './receiver.mjs';

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const readRaw = (req) => new Promise((resolve, reject) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });

export const createNaiveReceiver = ({secret = SECRET, toleranceS = TOLERANCE_S, now = () => Math.floor(Date.now() / 1000), db = createDb()} = {}) => {
  const log = [];
  const app = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let m;
    if (req.method === 'POST' && url.pathname === `/webhooks/${PROVIDER}`) {
      const raw = await readRaw(req);
      const ts = req.headers['x-subhub-timestamp'];
      if (!verifySignature(secret, ts, raw, req.headers['x-subhub-signature'])) return json(res, 401, {error: 'invalid signature'});
      if (Math.abs(now() - Number(ts)) > toleranceS) return json(res, 401, {error: 'delivery timestamp outside tolerance'});
      let parsed;
      try { parsed = JSON.parse(raw.toString('utf8')); } catch { return json(res, 400, {error: 'invalid JSON'}); }
      const v = validateEvent(parsed);
      if (!v.ok) return json(res, 400, {error: 'invalid event', field: v.error});
      const state = db.applyNaive(v.event);              // <-- applies whatever arrived, in arrival order
      log.push({event_id: v.event.event_id, version: v.event.version, outcome: 'applied', status: 200});
      return json(res, 200, {received: true, event_id: v.event.event_id, outcome: 'applied', stored_version: state.version});
    }
    if (req.method === 'GET' && (m = url.pathname.match(/^\/state\/(sub_[A-Za-z0-9_]+)$/))) {
      const s = db.getState(m[1]);
      return s ? json(res, 200, s) : json(res, 404, {error: 'no such subscription'});
    }
    json(res, 404, {error: 'not found'});
  });
  const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
  return {app, db, log, listen, close: () => new Promise((r) => app.close(() => { db.close(); r(); }))};
};
