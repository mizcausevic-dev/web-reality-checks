import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollector, COLLECTOR_LABEL} from './collector.mjs';
import {createPage, ORDER, ORDER_2, EMITTERS, makeClock} from './page.mjs';

const collector = createCollector();
const base = await collector.listen();
const received = async () => (await fetch(base + '/events')).json();
const reset = () => fetch(base + '/reset', {method: 'POST'});

test('collector is labelled as a local collector, not GA4, and stores envelopes verbatim', async () => {
  await reset();
  const r = await fetch(base + '/collect', {method: 'POST', body: JSON.stringify({event: 'purchase', transaction_id: 'T-x', emitter: 'test', ts: '2026-10-25T09:00:00.000Z'})});
  assert.equal(r.status, 202);
  const body = await received();
  assert.equal(body.label, COLLECTOR_LABEL);
  assert.equal(body.label, 'LOCAL EVENT COLLECTOR — NOT GA4');
  assert.deepEqual(body.events[0], {seq: 1, event: 'purchase', transaction_id: 'T-x', emitter: 'test', ts: '2026-10-25T09:00:00.000Z'});
});

test('collector rejects an envelope missing required fields', async () => {
  const r = await fetch(base + '/collect', {method: 'POST', body: JSON.stringify({event: 'purchase'})});
  assert.equal(r.status, 400);
  assert.deepEqual((await r.json()).missing, ['transaction_id', 'emitter', 'ts']);
});

test('KNOWN-POSITIVE CONTROL: flawed page emits three purchase envelopes for one order', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'flawed', clock: makeClock()});
  assert.equal(page.purchaseListeners(), 2, 'app handler + tag-manager trigger both listen');
  await page.completeOrder(ORDER);
  const body = await received();
  assert.equal(body.count, 3, 'the flaw must be observable or the fix test proves nothing');
  assert.deepEqual(body.events.map((e) => e.emitter), [EMITTERS.app, EMITTERS.tag, EMITTERS.mount]);
  assert.ok(body.events.every((e) => e.event === 'purchase' && e.transaction_id === ORDER.transaction_id));
  assert.equal(new Set(body.events.map((e) => e.ts)).size, 3, 'three distinct timestamps, three emissions');
});

test('flawed page: remounting the confirmation component emits a fourth envelope', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'flawed', clock: makeClock()});
  await page.completeOrder(ORDER);
  await page.remountConfirmation();
  const body = await received();
  assert.equal(body.count, 4);
  assert.equal(body.events[3].emitter, EMITTERS.mount);
});

test('corrected page: one order emits exactly one purchase envelope, from the app handler', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'corrected', clock: makeClock()});
  assert.equal(page.purchaseListeners(), 1, 'only the authoritative emitter listens');
  await page.completeOrder(ORDER);
  const body = await received();
  assert.equal(body.count, 1);
  assert.equal(body.events[0].emitter, EMITTERS.app);
  assert.equal(body.events[0].transaction_id, ORDER.transaction_id);
});

test('corrected page: remounting the confirmation component emits nothing', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'corrected', clock: makeClock()});
  await page.completeOrder(ORDER);
  await page.remountConfirmation();
  await page.remountConfirmation();
  assert.ok(page.ConfirmationComponent.isMounted(), 'the component still renders after remount');
  assert.equal((await received()).count, 1);
});

test('transaction id is per order, not per emission: two orders give two distinct ids, one envelope each (corrected)', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'corrected', clock: makeClock()});
  await page.completeOrder(ORDER);
  await page.completeOrder(ORDER_2);
  const body = await received();
  assert.equal(body.count, 2);
  assert.deepEqual(body.events.map((e) => e.transaction_id), [ORDER.transaction_id, ORDER_2.transaction_id]);
});

test('LIMIT (documented, not fixed): replaying the completion action for the same order emits again', async () => {
  await reset();
  const page = createPage({collectorBase: base, mode: 'corrected', clock: makeClock()});
  await page.completeOrder(ORDER);
  await page.completeOrder(ORDER); // e.g. a retry or a reload that re-runs the handler
  assert.equal((await received()).count, 2, 'order-level idempotency is a separate design concern and is not claimed here');
});

test.after(() => collector.close());
