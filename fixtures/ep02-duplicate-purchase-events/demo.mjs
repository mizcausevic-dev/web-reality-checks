// Runs the exact scenario shown in the video and writes evidence.json (actual collector contents).
//
//   run A (flawed)    : complete ORDER once                         -> expect 3 envelopes
//   run B (corrected) : complete ORDER once, remount component x2  -> expect 1 envelope
import fs from 'node:fs';
import {createCollector, COLLECTOR_LABEL} from './collector.mjs';
import {createPage, ORDER, EMITTERS, makeClock} from './page.mjs';

const collector = createCollector();
const base = await collector.listen();
const snapshot = async () => (await fetch(base + '/events')).json();
const reset = () => fetch(base + '/reset', {method: 'POST'});

const run = async (label, mode, steps) => {
  await reset();
  const page = createPage({collectorBase: base, mode, clock: makeClock()});
  const actions = [];
  for (const s of steps) { await s.fn(page); actions.push({action: s.name, receivedSoFar: (await snapshot()).count}); }
  const {count, events} = await snapshot();
  return {label, mode, purchaseListenersOnBus: page.purchaseListeners(), actions, receivedCount: count, envelopes: events, byEmitter: Object.fromEntries(Object.values(EMITTERS).map((e) => [e, events.filter((x) => x.emitter === e).length]))};
};

const flawed = await run('flawed: one completed order', 'flawed', [
  {name: 'completeOrder(T-20261025-0001)', fn: (p) => p.completeOrder(ORDER)},
]);
const corrected = await run('corrected: same action, then remount the confirmation component twice', 'corrected', [
  {name: 'completeOrder(T-20261025-0001)', fn: (p) => p.completeOrder(ORDER)},
  {name: 'remountConfirmation()', fn: (p) => p.remountConfirmation()},
  {name: 'remountConfirmation()', fn: (p) => p.remountConfirmation()},
]);

const evidence = {
  generatedAt: new Date().toISOString(),
  collector: {label: COLLECTOR_LABEL, base: 'http://127.0.0.1:<ephemeral>', dedup: 'none — raw envelopes stored verbatim'},
  order: ORDER,
  emitters: EMITTERS,
  runs: {flawed, corrected},
  notes: [
    'Three received envelopes are three raw emissions, not three GA4 conversions; this collector is not GA4 and applies no deduplication.',
    'GA4 documents purchase deduplication using matching transaction_id for web data streams; that applies to purchase, not to all event types, and is not reproduced here.',
    'The corrected run demonstrates one emitter in the tested scenario only. It does not establish exactly-once delivery across reloads, devices, retries or distributed systems.',
    'Order-level idempotency (replaying the same completion action) is a separate design concern and is not implemented (see test.mjs LIMIT test).',
  ],
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));

console.log(`${COLLECTOR_LABEL}`);
for (const r of [flawed, corrected]) {
  console.log(`\n${r.label}  ->  received ${r.receivedCount}`);
  console.table(r.envelopes.map((e) => ({seq: e.seq, event: e.event, transaction_id: e.transaction_id, emitter: e.emitter, ts: e.ts})));
}
await collector.close();
