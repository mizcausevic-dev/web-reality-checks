// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
//   A  flawed:    page shows $10.00, request carries unitPriceCents 100       -> underpriced order
//   B  corrected: the same altered request                                    -> 409 price_changed, no order
//   C  corrected: honest request                                              -> order at catalog price + snapshot
//   D  corrected: catalog changes after page load; 409 + quote; confirmation  -> order at the new price
//   E  transaction: second connection tries to reprice mid-transaction (BUSY); control without a transaction
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore, initDatabase, openConnection} from './store.mjs';
import {createApp, listen} from './server.mjs';
import {startPriceWriter} from './barrier.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep29-demo-'));
const dbPath = path.join(dir, 'checkout.db');
initDatabase(dbPath);
const store = createStore(dbPath);
const admin = openConnection(dbPath, {timeout: 0});
const app = createApp(store);
const port = await listen(app);
const base = `http://127.0.0.1:${port}`;
const writer = await startPriceWriter(dbPath, 'p_mug');
const post = async (p, body) => { const r = await fetch(base + p, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)}); return {status: r.status, body: await r.json()}; };
const setPrice = (cents) => admin.prepare(`UPDATE products SET unit_price_cents = ? WHERE id = 'p_mug'`).run(cents);
const reset = () => { store.clearOrders(); setPrice(1000); };
const snap = () => ({orderCount: store.countOrders(), orderLineCount: store.countLines(), orders: store.listOrders()});

const ev = {generatedAt: new Date().toISOString(), base: 'http://127.0.0.1:<ephemeral>', db: 'temporary SQLite file (node:sqlite), deleted after the run', currency: 'USD', unit: 'integer cents', maxQuantity: 100, scenarios: {}};

// A — flawed
reset();
{
  const page = await (await fetch(`${base}/catalog/p_mug`)).json();
  const r = await post('/vuln/orders', {productId: 'p_mug', quantity: 2, unitPriceCents: 100});
  const s = snap();
  ev.scenarios.flawed_tampered_price = {endpoint: 'POST /vuln/orders', pageDisplays: page.display, catalogUnitPriceCents: page.unitPriceCents, submitted: {productId: 'p_mug', quantity: 2, unitPriceCents: 100}, status: r.status, response: r.body, expectedTotalCents: 2000, storedTotalCents: r.body.totalCents, underpricedByCents: 2000 - r.body.totalCents, ...s};
}
// B — corrected, same altered request
reset();
{
  const r = await post('/orders', {productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 100});
  ev.scenarios.corrected_tampered_price = {endpoint: 'POST /orders', submitted: {productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 100}, status: r.status, response: r.body, ...snap()};
}
// C — corrected, honest
reset();
{
  const r = await post('/orders', {productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 1000});
  ev.scenarios.corrected_honest_request = {endpoint: 'POST /orders', submitted: {productId: 'p_mug', quantity: 2, expectedUnitPriceCents: 1000}, status: r.status, response: r.body, ...snap()};
}
// D — price changes after the page loads
reset();
{
  const page = await (await fetch(`${base}/catalog/p_mug`)).json(); // page loads at $10.00
  setPrice(1200);                                                    // catalog changes afterwards
  const submitted = {productId: 'p_mug', quantity: 2, expectedUnitPriceCents: page.unitPriceCents};
  const first = await post('/orders', submitted);
  const afterFirst = snap();
  const retry = await post('/orders', submitted);
  const confirmed = await post('/orders', {...submitted, confirmPriceCents: first.body.confirmWith.confirmPriceCents});
  ev.scenarios.corrected_price_changed_then_confirmed = {
    pageLoadedAt: page.display,
    catalogChangedTo: 1200,
    step1: {submitted, status: first.status, response: first.body, orderCount: afterFirst.orderCount},
    step2_retry_without_confirmation: {status: retry.status, error: retry.body.error},
    step3_confirmed: {submitted: {...submitted, confirmPriceCents: 1200}, status: confirmed.status, response: confirmed.body},
    ...snap(),
  };
}
// E — transaction consistency
reset();
{
  let during;
  const r = store.createOrderCorrected({productId: 'p_mug', quantity: 2, price: 1000}, {afterCatalogRead: () => { during = writer.setPrice(1200); }});
  const priceAfterCommitAttemptBlocked = store.currentPriceCents('p_mug');
  const afterCommit = writer.setPrice(1200);
  ev.scenarios.transaction_with_begin_immediate = {
    note: 'second connection (worker thread, busy timeout 0) tries to reprice p_mug after the catalog read, inside the order transaction',
    secondConnectionDuringTransaction: during, catalogPriceAfterBlockedAttempt: priceAfterCommitAttemptBlocked,
    orderStatus: r.status, snapshotUnitPriceCents: r.body.unitPriceCents,
    secondConnectionAfterCommit: afterCommit, catalogPriceNow: store.currentPriceCents('p_mug'), ...snap(),
  };
}
reset();
{
  let during;
  const r = store.createOrderNoTransaction({productId: 'p_mug', quantity: 2}, {afterCatalogRead: () => { during = writer.setPrice(1200); }});
  ev.scenarios.control_no_transaction = {
    note: 'catalog read and insert are separate statements; the same second connection reprices in the gap',
    secondConnectionDuringGap: during, snapshotUnitPriceCents: r.body.unitPriceCents, catalogPriceAtInsertTime: store.currentPriceCents('p_mug'), ...snap(),
  };
}
// F — rejected inputs (all 4xx, no order)
reset();
{
  const cases = [
    ['quantity 0', {productId: 'p_mug', quantity: 0, expectedUnitPriceCents: 1000}],
    ['quantity -1', {productId: 'p_mug', quantity: -1, expectedUnitPriceCents: 1000}],
    ['quantity 1.5', {productId: 'p_mug', quantity: 1.5, expectedUnitPriceCents: 1000}],
    ['quantity "2" (string)', {productId: 'p_mug', quantity: '2', expectedUnitPriceCents: 1000}],
    ['quantity 101 (max 100)', {productId: 'p_mug', quantity: 101, expectedUnitPriceCents: 1000}],
    ['expected price "1000" (string)', {productId: 'p_mug', quantity: 1, expectedUnitPriceCents: '1000'}],
    ['unknown product', {productId: 'p_nope', quantity: 1, expectedUnitPriceCents: 1000}],
    ['unavailable product', {productId: 'p_retired', quantity: 1, expectedUnitPriceCents: 700}],
  ];
  const out = [];
  for (const [label, b] of cases) { const r = await post('/orders', b); out.push({case: label, status: r.status, error: r.body.error ?? r.body.detail}); }
  ev.scenarios.rejected_inputs = {results: out, ...snap()};
}

const S = ev.scenarios;
ev.summary = {
  page_displays: S.flawed_tampered_price.pageDisplays,
  flawed_status: S.flawed_tampered_price.status,
  flawed_stored_total_cents: S.flawed_tampered_price.storedTotalCents,
  flawed_correct_total_cents: S.flawed_tampered_price.expectedTotalCents,
  corrected_tamper_status: S.corrected_tampered_price.status,
  corrected_tamper_orders: S.corrected_tampered_price.orderCount,
  honest_status: S.corrected_honest_request.status,
  honest_snapshot_cents: S.corrected_honest_request.response.unitPriceCents,
  changed_price_status: S.corrected_price_changed_then_confirmed.step1.status,
  changed_price_quote_cents: S.corrected_price_changed_then_confirmed.step1.response.quote.currentUnitPriceCents,
  changed_price_total_cents: S.corrected_price_changed_then_confirmed.step1.response.quote.totalCents,
  orders_after_unconfirmed: S.corrected_price_changed_then_confirmed.step1.orderCount,
  confirmed_status: S.corrected_price_changed_then_confirmed.step3_confirmed.status,
  confirmed_snapshot_cents: S.corrected_price_changed_then_confirmed.step3_confirmed.response.unitPriceCents,
  txn_second_connection: S.transaction_with_begin_immediate.secondConnectionDuringTransaction,
  txn_snapshot_cents: S.transaction_with_begin_immediate.snapshotUnitPriceCents,
  control_second_connection: S.control_no_transaction.secondConnectionDuringGap,
  control_snapshot_cents: S.control_no_transaction.snapshotUnitPriceCents,
  control_catalog_at_insert_cents: S.control_no_transaction.catalogPriceAtInsertTime,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(ev, null, 2));
console.table(ev.summary);
await writer.stop(); app.close(); store.close(); admin.close(); fs.rmSync(dir, {recursive: true, force: true});
