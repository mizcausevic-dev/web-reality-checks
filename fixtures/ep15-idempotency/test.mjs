import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {app, listen, db} from './server.mjs';
import {fingerprintOf} from './db.mjs';

const port = await listen();
const base = `http://127.0.0.1:${port}`;
const ORDER = {sku: 'SKU-100', qty: 1, amountCents: 4999, currency: 'usd'};
const loginAs = async (u) => (await fetch(`${base}/login/${u}`)).headers.get('set-cookie').split(';')[0];
const post = (p, cookie, body, headers = {}) => fetch(base + p, {method: 'POST', headers: {cookie, 'content-type': 'application/json', ...headers}, body: JSON.stringify(body)});
const key = () => 'ck_' + crypto.randomBytes(8).toString('hex');

/** Client with a bounded retry: on network error, retry the same request once. */
const withRetry = async (send) => {
  const attempts = [];
  for (let i = 0; i < 2; i++) {
    try { const r = await send(i); attempts.push({status: r.status}); return {r, attempts}; }
    catch (e) { attempts.push({networkError: e.cause?.code ?? e.message}); }
  }
  return {r: null, attempts};
};

test.beforeEach(() => db.clear());

test('unauthenticated POST is rejected on both endpoints', async () => {
  assert.equal((await post('/vuln/orders', '', ORDER)).status, 401);
  assert.equal((await post('/orders', '', ORDER, {'idempotency-key': key()})).status, 401);
});

test('KNOWN-POSITIVE CONTROL: lost response + retry on the vulnerable endpoint creates TWO orders', async () => {
  const c = await loginAs('alice');
  const {r, attempts} = await withRetry((i) => post('/vuln/orders', c, ORDER, i === 0 ? {'x-fault': 'lose-response'} : {}));
  assert.ok(attempts[0].networkError, 'first attempt must fail at the network level (response lost after commit)');
  assert.equal(r.status, 201);
  assert.equal(attempts.length, 2);
  assert.equal(db.countOrders('u_alice'), 2, 'the flaw must be observable or the fix test proves nothing');
});

test('corrected endpoint: lost response + retry with the same key creates ONE order (two attempts)', async () => {
  const c = await loginAs('alice');
  const k = key();
  const {r, attempts} = await withRetry((i) => post('/orders', c, ORDER, {'idempotency-key': k, ...(i === 0 ? {'x-fault': 'lose-response'} : {})}));
  assert.ok(attempts[0].networkError);
  assert.equal(attempts.length, 2);
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('idempotent-replayed'), 'true', 'retry must be served from the stored record');
  const body = await r.json();
  assert.equal(db.countOrders('u_alice'), 1);
  assert.equal(body.orderId, db.listOrders('u_alice')[0].id);
});

test('corrected endpoint: Idempotency-Key is required', async () => {
  const c = await loginAs('alice');
  assert.equal((await post('/orders', c, ORDER)).status, 400);
  assert.equal(db.countOrders('u_alice'), 0);
});

test('same key, same request (different field order / casing) -> identical stored result, no new order', async () => {
  const c = await loginAs('alice');
  const k = key();
  const a = await (await post('/orders', c, ORDER, {'idempotency-key': k})).json();
  const r2 = await post('/orders', c, {currency: 'USD', amountCents: 4999, qty: 1, sku: 'sku-100'}, {'idempotency-key': k});
  assert.equal(r2.status, 201);
  assert.equal(r2.headers.get('idempotent-replayed'), 'true');
  assert.deepEqual(await r2.json(), a);
  assert.equal(db.countOrders('u_alice'), 1);
});

test('same key, materially different request -> 422 and no new order', async () => {
  const c = await loginAs('alice');
  const k = key();
  assert.equal((await post('/orders', c, ORDER, {'idempotency-key': k})).status, 201);
  const r = await post('/orders', c, {...ORDER, qty: 3}, {'idempotency-key': k});
  assert.equal(r.status, 422);
  assert.equal(db.countOrders('u_alice'), 1);
});

test('concurrent same-key requests -> exactly ONE order; the second waits and receives the stored result', async () => {
  const c = await loginAs('alice');
  const k = key();
  const N = 5;
  const rs = await Promise.all(Array.from({length: N}, () => post('/orders', c, ORDER, {'idempotency-key': k})));
  assert.deepEqual(rs.map((r) => r.status), Array(N).fill(201));
  const bodies = await Promise.all(rs.map((r) => r.json()));
  assert.equal(new Set(bodies.map((b) => b.orderId)).size, 1, 'all callers must see the same order id');
  assert.equal(rs.filter((r) => r.headers.get('idempotent-replayed') === 'true').length, N - 1);
  assert.equal(rs.filter((r) => r.headers.get('idempotent-waited') === 'true').length, N - 1);
  assert.equal(db.countOrders('u_alice'), 1);
});

test('DB layer: the UNIQUE constraint alone (pre-check skipped) resolves a lost race and rolls back the extra order', () => {
  const fields = {sku: 'sku-100', qty: 1, amountCents: 4999, currency: 'USD'};
  const fp = fingerprintOf(fields);
  const a = db.createOrderIdempotent('u_alice', 'create_order', 'race-key-0001', fields, fp, 'corrected', {skipPrecheck: true});
  const b = db.createOrderIdempotent('u_alice', 'create_order', 'race-key-0001', fields, fp, 'corrected', {skipPrecheck: true});
  const c = db.createOrderIdempotent('u_alice', 'create_order', 'race-key-0001', {...fields, qty: 2}, fingerprintOf({...fields, qty: 2}), 'corrected', {skipPrecheck: true});
  assert.equal(a.kind, 'created');
  assert.equal(b.kind, 'replayed');
  assert.equal(b.orderId, a.orderId);
  assert.equal(c.kind, 'mismatch');
  assert.equal(c.status, 422);
  assert.equal(db.countOrders('u_alice'), 1, 'orders inserted inside the losing transactions must be rolled back');
});

test('control: concurrent requests on the vulnerable endpoint create N orders', async () => {
  const c = await loginAs('alice');
  await Promise.all(Array.from({length: 5}, () => post('/vuln/orders', c, ORDER)));
  assert.equal(db.countOrders('u_alice'), 5);
});

test('different logical purchases need different keys -> two orders', async () => {
  const c = await loginAs('alice');
  assert.equal((await post('/orders', c, ORDER, {'idempotency-key': key()})).status, 201);
  assert.equal((await post('/orders', c, ORDER, {'idempotency-key': key()})).status, 201);
  assert.equal(db.countOrders('u_alice'), 2);
});

test('keys are scoped to the session user: Bob reusing Alice\'s key gets his own order, not hers', async () => {
  const a = await loginAs('alice');
  const b = await loginAs('bob');
  const k = key();
  const ra = await (await post('/orders', a, ORDER, {'idempotency-key': k})).json();
  const rb = await post('/orders', b, ORDER, {'idempotency-key': k});
  assert.equal(rb.status, 201);
  assert.equal(rb.headers.get('idempotent-replayed'), 'false');
  assert.notEqual((await rb.json()).orderId, ra.orderId);
  assert.equal(db.countOrders('u_alice'), 1);
  assert.equal(db.countOrders('u_bob'), 1);
});

test('client-supplied user id is ignored: body.userId / X-User-Id cannot move the order or the key scope', async () => {
  const a = await loginAs('alice');
  const r = await post('/orders', a, {...ORDER, userId: 'u_bob'}, {'idempotency-key': key(), 'x-user-id': 'u_bob'});
  assert.equal(r.status, 201);
  assert.equal((await r.json()).authenticatedAs, 'u_alice');
  assert.equal(db.countOrders('u_bob'), 0);
  assert.equal(db.countOrders('u_alice'), 1);
});

test('invalid payload is rejected before any write, and does not create an idempotency record', async () => {
  const a = await loginAs('alice');
  const k = key();
  assert.equal((await post('/orders', a, {...ORDER, qty: 0}, {'idempotency-key': k})).status, 400);
  assert.equal(db.hasIdempotencyRecord('u_alice', 'create_order', k), false);
  assert.equal(db.countOrders('u_alice'), 0);
});

test.after(() => { app.close(); db.close(); });
