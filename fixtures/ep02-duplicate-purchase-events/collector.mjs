// Episode 02 fixture: a LOCAL EVENT COLLECTOR. Loopback only. Synthetic data only.
//
// This is NOT Google Analytics 4 and does not reproduce GA4's internal logic. It records
// exactly what it receives, one envelope per POST, with no deduplication of any kind, so
// that raw emission counts can be inspected separately from any platform's reporting.
//
//   POST /collect   body: {event, transaction_id, emitter, ts}  -> 202, stored verbatim (+ seq)
//   GET  /events    -> {label, count, events}
//   POST /reset     -> clears the store (used between scenario runs)
import http from 'node:http';

export const COLLECTOR_LABEL = 'LOCAL EVENT COLLECTOR — NOT GA4';
const REQUIRED = ['event', 'transaction_id', 'emitter', 'ts'];

export const createCollector = () => {
  const events = [];
  const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
  const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });

  const app = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/collect') {
      let env;
      try { env = JSON.parse(await readBody(req)); } catch { return json(res, 400, {error: 'invalid json'}); }
      const missing = REQUIRED.filter((k) => !(k in env));
      if (missing.length) return json(res, 400, {error: 'envelope missing fields', missing});
      const stored = {seq: events.length + 1, event: env.event, transaction_id: env.transaction_id, emitter: env.emitter, ts: env.ts};
      events.push(stored);                 // no dedup, by design: this is a raw collector
      return json(res, 202, {accepted: true, seq: stored.seq, label: COLLECTOR_LABEL});
    }
    if (req.method === 'GET' && url.pathname === '/events') return json(res, 200, {label: COLLECTOR_LABEL, count: events.length, events});
    if (req.method === 'POST' && url.pathname === '/reset') { events.length = 0; return json(res, 200, {ok: true}); }
    json(res, 404, {error: 'not found'});
  });

  const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${app.address().port}`)));
  const close = () => new Promise((r) => app.close(() => r()));
  return {app, events, listen, close};
};

if (import.meta.url === `file://${process.argv[1]}`) createCollector().listen().then((u) => console.log(`${COLLECTOR_LABEL} on ${u}`));
