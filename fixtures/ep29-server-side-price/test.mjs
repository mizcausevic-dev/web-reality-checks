import test, {after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore, initDatabase, openConnection, MAX_QUANTITY, formatUsd, safeProduct} from './store.mjs';
import {createApp, listen} from './server.mjs';
import {startPriceWriter} from './barrier.mjs';

// One temp database FILE (not :memory:) so a second connection can really share it.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep29-'));
const dbPath = path.join(dir, 'checkout.db');
initDatabase(dbPath);
const store = createStore(dbPath);              // the application's connection
const admin = openConnection(dbPath, {timeout: 0}); // an independent second connection (catalog admin)
const app = createApp(store);
const port = await listen(app);
const base = `http://127.0.0.1:${port}`;
const writer = await startPriceWriter(dbPath, 'p_mug'); // third connection, in a worker thread (the barrier)

const MUG = 1000;
const setPrice = (id, cents) => admin.prepare(`UPDATE products SET unit_price_cents = ? WHERE id = ?`).run(cents, id);
const post = (p, body) => fetch(base + p, {method: 'POST', headers: {'content-type': 'application/json'}, body: typeof body === 'string' ? body : JSON.stringify(body)});
const corrected = (b) => post('/orders', b);
const lines = () => store.listOrders();

beforeEach(() => { store.clearOrders(); setPrice('p_mug', MUG); admin.prepare(`DELETE FROM products WHERE id = 'p_huge'`).run(); });
after(async () => { await writer.stop(); app.close(); store.close(); admin.close(); fs.rmSync(dir, {recursive: true, force: true}); });

test('integer-only money formatting', () => {
  assert.equal(formatUsd(1000), '$10.00');
  assert.equal(formatUsd(2405), '$24.05');
  assert.equal(formatUsd(7), '$0.07');
});

test('KNOWN-POSITIVE CONTROL: flawed endpoint stores the client-submitted price (page shows $10.00, order priced $1.00)', async () => {
  const shown = await (await fetch(`${base}/catalog/p_mug`)).json();
  assert.equal(shown.unitPriceCents, 1000); // the page still displays $10.00
  const r = await post('/vuln/orders', {productId: 'p_mug', quantity: 2, unitPriceCents: 100});
  assert.equal(r.status, 201, 'the flaw must be observable or the fix test proves nothing');
  const body = await r.json();
  assert.equal(body.unitPriceCents, 100);
  assert.equal(body.totalCents, 200);
  const [row] = lines();
  assert.equal(row.unitPriceCents, 100);
  assert.equal(row.unitPriceCents < store.currentPriceCents('p_mug'), true, 'underpriced relative to the catalog');
});

test('corrected: the same altered-price request creates NO order (409 price_changed with the current quote)', async () => {
  const before = store.countOrders();
  const r = await corrected({productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 100});
  assert.equal(r.status, 409);
  const body = await r.json();
  assert.equal(body.error, 'price_changed');
  assert.equal(body.quote.currentUnitPriceCents, 1000);
  assert.equal(body.quote.totalCents, 2000);
  assert.equal(body.requiresConfirmation, true);
  assert.equal(store.countOrders(), before);
  assert.equal(store.countLines(), 0);
});

test('corrected: client-supplied unitPriceCents / totalCents fields are ignored; snapshot is the catalog price', async () => {
  const r = await corrected({productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 1000, unitPriceCents: 1, totalCents: 1, priceCents: 1});
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.unitPriceCents, 1000);
  assert.equal(body.totalCents, 2000);
  assert.equal(lines()[0].unitPriceCents, 1000);
});

test('corrected: an honest request is priced from the catalog, with a snapshot on the order line', async () => {
  const r = await corrected({productId: 'p_tote', quantity: 3, expectedUnitPriceCents: 2500});
  assert.equal(r.status, 201);
  assert.deepEqual(lines().map((l) => [l.productId, l.quantity, l.unitPriceCents, l.lineTotalCents, l.totalCents]), [['p_tote', 3, 2500, 7500, 7500]]);
});

// ---- quantity table -------------------------------------------------------------------------------
const QTY_REJECT = [
  ['zero', 0], ['negative', -1], ['fractional', 1.5], ['string number', '2'], ['null', null], ['boolean', true],
  ['array', [1]], ['object', {}], ['one over max', MAX_QUANTITY + 1], ['huge', 1e21], ['unsafe integer', 2 ** 53], ['missing', undefined],
];
for (const [label, q] of QTY_REJECT) {
  test(`quantity table: ${label} (${JSON.stringify(q)}) is rejected with 400 and creates no order`, async () => {
    const body = {productId: 'p_mug', expectedUnitPriceCents: 1000};
    if (q !== undefined) body.quantity = q;
    const r = await corrected(body);
    assert.equal(r.status, 400);
    assert.equal((await r.json()).field, 'quantity');
    assert.equal(store.countOrders(), 0);
  });
}
for (const q of [1, 2, MAX_QUANTITY]) {
  test(`quantity table: ${q} is accepted (documented range is 1..${MAX_QUANTITY})`, async () => {
    const r = await corrected({productId: 'p_mug', quantity: q, expectedUnitPriceCents: 1000});
    assert.equal(r.status, 201);
    assert.equal((await r.json()).totalCents, 1000 * q);
  });
}

test('price fields: string, fractional, zero, negative, missing and unsafe values are rejected (400)', async () => {
  for (const bad of ['1000', 10.5, 0, -1000, null, 2 ** 53, undefined]) {
    const b = {productId: 'p_mug', quantity: 1};
    if (bad !== undefined) b.expectedUnitPriceCents = bad;
    const r = await corrected(b);
    assert.equal(r.status, 400, `expectedUnitPriceCents ${String(bad)}`);
  }
  for (const bad of ['1000', 10.5, 0, -1]) {
    assert.equal((await corrected({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000, confirmPriceCents: bad})).status, 400);
  }
  assert.equal(store.countOrders(), 0);
});

test('malformed JSON, non-object bodies, and oversize bodies are rejected before any write', async () => {
  assert.equal((await post('/orders', '{"productId":')).status, 400);
  assert.equal((await post('/orders', '[1,2]')).status, 400);
  assert.equal((await post('/orders', 'null')).status, 400);
  assert.equal((await post('/orders', JSON.stringify({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000, pad: 'x'.repeat(5000)}))).status, 413);
  assert.equal(store.countOrders(), 0);
});

// ---- unknown / unavailable product ----------------------------------------------------------------
test('unknown product -> 404, no order', async () => {
  const r = await corrected({productId: 'p_nope', quantity: 1, expectedUnitPriceCents: 1000});
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error, 'unknown_product');
  assert.equal(store.countOrders(), 0);
});

test('malformed productId (number, empty, injection-shaped string) -> 400, no order', async () => {
  for (const id of [5, '', "p_mug'; DROP TABLE products;--", null]) {
    assert.equal((await corrected({productId: id, quantity: 1, expectedUnitPriceCents: 1000})).status, 400);
  }
  assert.equal(store.countOrders(), 0);
  assert.equal(store.quote('p_mug').unitPriceCents, 1000); // table still there
});

test('unavailable product -> 409 product_unavailable even when the expected price is right; no order', async () => {
  const r = await corrected({productId: 'p_retired', quantity: 1, expectedUnitPriceCents: 700});
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, 'product_unavailable');
  assert.equal((await post('/vuln/orders', {productId: 'p_retired', quantity: 1, unitPriceCents: 700})).status, 409);
  assert.equal(store.countOrders(), 0);
});

// ---- changed-price flow ---------------------------------------------------------------------------
test('changed price after page load: 409 + updated quote, no order; retrying unchanged is NOT silently accepted', async () => {
  const shown = (await (await fetch(`${base}/catalog/p_mug`)).json()).unitPriceCents; // page loads at 1000
  assert.equal(shown, 1000);
  setPrice('p_mug', 1200); // catalog changes after the page loaded
  for (let i = 0; i < 2; i++) {
    const r = await corrected({productId: 'p_mug', quantity: 2, expectedUnitPriceCents: shown});
    assert.equal(r.status, 409);
    const b = await r.json();
    assert.equal(b.quote.currentUnitPriceCents, 1200);
    assert.equal(b.quote.expectedUnitPriceCents, 1000);
    assert.equal(b.quote.totalCents, 2400);
    assert.deepEqual(b.confirmWith, {confirmPriceCents: 1200});
  }
  assert.equal(store.countOrders(), 0);
});

test('explicit confirmation: confirmPriceCents equal to the current price creates the order at the current price', async () => {
  setPrice('p_mug', 1200);
  const r = await corrected({productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 1000, confirmPriceCents: 1200});
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.equal(b.unitPriceCents, 1200);
  assert.equal(b.totalCents, 2400);
  assert.equal(store.countOrders(), 1);
});

test('confirmation is itself checked: a stale or wrong confirmation (price moved again) gets a fresh 409 and no order', async () => {
  setPrice('p_mug', 1500);
  const wrong = await corrected({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000, confirmPriceCents: 1200});
  assert.equal(wrong.status, 409);
  assert.equal((await wrong.json()).quote.currentUnitPriceCents, 1500);
  assert.equal(store.countOrders(), 0);
});

test('a price DECREASE also requires confirmation (any difference is a change)', async () => {
  setPrice('p_mug', 800);
  const r = await corrected({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000});
  assert.equal(r.status, 409);
  assert.equal(store.countOrders(), 0);
  const ok = await corrected({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000, confirmPriceCents: 800});
  assert.equal(ok.status, 201);
  assert.equal(lines()[0].unitPriceCents, 800);
});

test('a later catalog change does not rewrite an existing order-line snapshot', async () => {
  await corrected({productId: 'p_mug', quantity: 1, expectedUnitPriceCents: 1000});
  setPrice('p_mug', 9999);
  assert.equal(lines()[0].unitPriceCents, 1000);
});

// ---- transaction consistency ----------------------------------------------------------------------
test('transaction consistency: while the order transaction is open, a second connection cannot change the price; the snapshot equals the price in force', () => {
  let duringTxn;
  const r = store.createOrderCorrected({productId: 'p_mug', quantity: 2, price: 1000}, {
    afterCatalogRead: () => { duringTxn = writer.setPrice(1200); }, // barrier: other thread/connection tries to reprice NOW
  });
  assert.equal(duringTxn, 'busy', 'the write lock taken by BEGIN IMMEDIATE must keep the price change out until commit');
  assert.equal(r.status, 201);
  assert.equal(lines()[0].unitPriceCents, 1000, 'snapshot equals the price in force inside the transaction');
  assert.equal(lines()[0].totalCents, 2000);
  assert.equal(store.currentPriceCents('p_mug'), 1000, 'the blocked change did not land');
  // After COMMIT the same change goes through, and the existing snapshot is untouched.
  assert.equal(writer.setPrice(1200), 'ok');
  assert.equal(store.currentPriceCents('p_mug'), 1200);
  assert.equal(lines()[0].unitPriceCents, 1000);
  // The next request with the old displayed price now gets the price-changed response.
  const next = store.createOrderCorrected({productId: 'p_mug', quantity: 1, price: 1000});
  assert.equal(next.status, 409);
  assert.equal(store.countOrders(), 1);
});

test('KNOWN-POSITIVE CONTROL (race): without a transaction the price can change between the catalog read and the insert', () => {
  let duringGap;
  const r = store.createOrderNoTransaction({productId: 'p_mug', quantity: 2}, {afterCatalogRead: () => { duringGap = writer.setPrice(1200); }});
  assert.equal(duringGap, 'ok', 'with no lock held the second connection changes the price inside the gap');
  assert.equal(r.status, 201);
  assert.equal(lines()[0].unitPriceCents, 1000);
  assert.equal(store.currentPriceCents('p_mug'), 1200, 'the order was stored at a price that was no longer in force at insert time');
  assert.notEqual(lines()[0].unitPriceCents, store.currentPriceCents('p_mug'));
});

test('transaction consistency: a rejected request leaves no partial rows and releases the write lock', () => {
  const r = store.createOrderCorrected({productId: 'p_mug', quantity: 1, price: 999});
  assert.equal(r.status, 409);
  assert.equal(store.countOrders(), 0);
  assert.equal(store.countLines(), 0);
  assert.equal(writer.setPrice(1000), 'ok', 'rollback must have released the lock');
});

// ---- safe integers --------------------------------------------------------------------------------
test('safeProduct is exact at the edge of the safe-integer range', () => {
  assert.equal(safeProduct(90071992547409, 100), 9007199254740900); // still safe
  assert.equal(safeProduct(90071992547410, 100), null);              // 9007199254741000 > 9007199254740991
  assert.equal(safeProduct(Number.MAX_SAFE_INTEGER, 1), Number.MAX_SAFE_INTEGER);
  assert.equal(safeProduct(Number.MAX_SAFE_INTEGER, 2), null);
});

test('total that would exceed Number.MAX_SAFE_INTEGER is rejected (422), no order', async () => {
  admin.prepare(`INSERT INTO products (id, name, unit_price_cents, currency, available) VALUES ('p_huge', 'Synthetic overflow probe', 90071992547410, 'USD', 1)`).run();
  const r = await corrected({productId: 'p_huge', quantity: 100, expectedUnitPriceCents: 90071992547410});
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error, 'total_out_of_range');
  assert.equal(store.countOrders(), 0);
  const one = await corrected({productId: 'p_huge', quantity: 1, expectedUnitPriceCents: 90071992547410});
  assert.equal(one.status, 201, 'a single unit is still inside the safe range');
  assert.equal((await one.json()).totalCents, 90071992547410);
});

test('flawed endpoint also refuses a client price whose total overflows (so the control isolates trust, not arithmetic)', async () => {
  const r = await post('/vuln/orders', {productId: 'p_mug', quantity: 100, unitPriceCents: 90071992547410});
  assert.equal(r.status, 422);
  assert.equal(store.countOrders(), 0);
});

test('no floating point: integer fields round-trip exactly and the schema stores INTEGER cents', async () => {
  await corrected({productId: 'p_mug', quantity: 3, expectedUnitPriceCents: 1000});
  const types = admin.prepare(`SELECT typeof(unit_price_cents) a, typeof(line_total_cents) b FROM order_lines`).get();
  assert.equal(types.a, 'integer');
  assert.equal(types.b, 'integer');
  assert.equal(admin.prepare(`SELECT typeof(total_cents) t FROM orders`).get().t, 'integer');
});
