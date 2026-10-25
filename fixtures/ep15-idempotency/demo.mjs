// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
// Scenario A (vulnerable): one checkout intention, response lost after commit, client retries -> 2 orders.
// Scenario B (corrected):  same intention, same fault, same retry, one Idempotency-Key      -> 1 order.
// Scenario C (corrected):  same key reused with a different payload                        -> 422.
// Scenario D (corrected):  five concurrent requests with one key                           -> 1 order.
// Scenario E (corrected):  two logical purchases, two keys                                 -> 2 orders.
import fs from 'node:fs';
import {app, listen, db} from './server.mjs';

const port = await listen();
const base = `http://127.0.0.1:${port}`;
const ORDER = {sku: 'SKU-100', qty: 1, amountCents: 4999, currency: 'USD'};
const cookie = (await fetch(`${base}/login/alice`)).headers.get('set-cookie').split(';')[0];
const post = (p, body, headers = {}) => fetch(base + p, {method: 'POST', headers: {cookie, 'content-type': 'application/json', ...headers}, body: JSON.stringify(body)});

const attemptLog = async (path, headersFor) => {
  const attempts = [];
  for (let i = 1; i <= 2; i++) {
    try {
      const r = await post(path, ORDER, headersFor(i));
      attempts.push({attempt: i, status: r.status, replayed: r.headers.get('idempotent-replayed'), body: await r.json()});
      break;
    } catch (e) {
      attempts.push({attempt: i, networkError: e.cause?.code ?? e.message, note: 'server committed, then destroyed the socket before responding (X-Fault: lose-response)'});
    }
  }
  return attempts;
};
const snapshot = () => ({orderCount: db.countOrders('u_alice'), orders: db.listOrders('u_alice')});

const evidence = {generatedAt: new Date().toISOString(), base: 'http://127.0.0.1:<ephemeral>', user: 'u_alice (server-side session, opaque cookie)', order: ORDER, scenarios: {}};

// A — vulnerable
db.clear();
evidence.scenarios.vulnerable_lost_response = {endpoint: 'POST /vuln/orders', attempts: await attemptLog('/vuln/orders', (i) => (i === 1 ? {'x-fault': 'lose-response'} : {})), ...snapshot()};

// B — corrected, same fault, same key
db.clear();
const KEY = 'ck_7f3a9c21d4e8b6a0';
evidence.scenarios.corrected_lost_response = {endpoint: 'POST /orders', idempotencyKey: KEY, attempts: await attemptLog('/orders', (i) => ({'idempotency-key': KEY, ...(i === 1 ? {'x-fault': 'lose-response'} : {})})), ...snapshot()};

// C — same key, different payload
{
  const r = await post('/orders', {...ORDER, qty: 3}, {'idempotency-key': KEY});
  evidence.scenarios.corrected_mismatched_payload = {endpoint: 'POST /orders', idempotencyKey: KEY, change: 'qty 1 -> 3', status: r.status, body: await r.json(), ...snapshot()};
}

// D — concurrent
db.clear();
{
  const K2 = 'ck_c0ffee00deadbeef';
  const rs = await Promise.all(Array.from({length: 5}, () => post('/orders', ORDER, {'idempotency-key': K2})));
  const bodies = await Promise.all(rs.map((r) => r.json()));
  evidence.scenarios.corrected_concurrent = {endpoint: 'POST /orders', idempotencyKey: K2, concurrentRequests: 5, statuses: rs.map((r) => r.status), orderIds: bodies.map((b) => b.orderId), replayed: rs.filter((r) => r.headers.get('idempotent-replayed') === 'true').length, waited: rs.filter((r) => r.headers.get('idempotent-waited') === 'true').length, policy: 'second and later in-flight requests with the same key wait for the first, then receive the stored result', ...snapshot()};
}

// E — two purchases, two keys
db.clear();
{
  const a = await post('/orders', ORDER, {'idempotency-key': 'ck_purchase_one_0001'});
  const b = await post('/orders', ORDER, {'idempotency-key': 'ck_purchase_two_0002'});
  evidence.scenarios.corrected_two_purchases = {endpoint: 'POST /orders', keys: ['ck_purchase_one_0001', 'ck_purchase_two_0002'], statuses: [a.status, b.status], ...snapshot()};
}

evidence.summary = {
  vulnerable_attempts: evidence.scenarios.vulnerable_lost_response.attempts.length,
  vulnerable_orders: evidence.scenarios.vulnerable_lost_response.orderCount,
  corrected_attempts: evidence.scenarios.corrected_lost_response.attempts.length,
  corrected_orders: evidence.scenarios.corrected_lost_response.orderCount,
  mismatched_status: evidence.scenarios.corrected_mismatched_payload.status,
  concurrent_requests: 5,
  concurrent_orders: evidence.scenarios.corrected_concurrent.orderCount,
  two_keys_orders: evidence.scenarios.corrected_two_purchases.orderCount,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(evidence.summary);
app.close(); db.close();
