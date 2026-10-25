// Runs the exact scenario shown in the video and writes evidence.json (actual responses).
//
// One subscription, three events in CREATION order:
//   v1 created   (trialing, starter)
//   v2 updated   (past_due, starter)
//   v3 updated   (active, pro)
// Delivery order on the wire: v1, v3, then v2 arrives late; then the provider retries v3.
import fs from 'node:fs';
import {createProvider, makeDelivery, deliver} from './provider.mjs';
import {createReceiver} from './receiver.mjs';
import {createNaiveReceiver} from './receiver-naive.mjs';

const NOW = 1_768_000_000;
const now = () => NOW;
const prov = createProvider();
const v1 = prov.makeEvent('sub_alpha', 'subscription.created', {status: 'trialing', plan: 'starter'});
const v2 = prov.makeEvent('sub_alpha', 'subscription.updated', {status: 'past_due', plan: 'starter'});
const v3 = prov.makeEvent('sub_alpha', 'subscription.updated', {status: 'active', plan: 'pro'});
const byId = {[v1.event_id]: 'v1', [v2.event_id]: 'v2', [v3.event_id]: 'v3'};
const deliveryOrder = [v1, v3, v2, v3]; // v2 arrives late, then the provider retries v3

const evidence = {generatedAt: new Date().toISOString(), base: 'http://127.0.0.1:<ephemeral>', fixedReceiverClock: NOW, toleranceS: 300, events: {v1, v2, v3}, deliveryOrder: deliveryOrder.map((e) => byId[e.event_id])};

// The naive run receives only the first three deliveries (v1, v3, v2 late). A coincidental retry of v3
// would overwrite the regression again in the naive receiver, which is ordering by luck, not by design;
// it is excluded here so the regression is the recorded final state.
const run = async (label, make, order) => {
  const rcv = make({now});
  const port = await rcv.listen();
  const base = `http://127.0.0.1:${port}`;
  const log = [];
  let ts = NOW - 30;
  for (const ev of order) {
    ts += 10; // each delivery attempt gets a fresh delivery timestamp (and therefore a fresh signature)
    const d = makeDelivery(ev, {deliveryTs: ts});
    const r = await deliver(base, d);
    const state = await (await fetch(`${base}/state/sub_alpha`)).json();
    log.push({delivered: byId[ev.event_id], event_id: ev.event_id, version: ev.version, delivery_ts: ts, signature: d.headers['x-subhub-signature'].slice(0, 19) + '…', status: r.status, outcome: r.body.outcome, stateAfter: {version: state.version, status: state.status, plan: state.plan}});
  }
  const finalState = await (await fetch(`${base}/state/sub_alpha`)).json();
  const out = {backend: rcv.db.kind, log, finalState: {version: finalState.version, status: finalState.status, plan: finalState.plan}};
  evidence[label] = out;
  await rcv.close();
  return {base, out};
};

// 1. Naive receiver: arrival order == applied order -> regression
await run('naive', createNaiveReceiver, [v1, v3, v2]);

// 2. Corrected receiver: same deliveries
const rcv = createReceiver({now});
const port = await rcv.listen();
const base = `http://127.0.0.1:${port}`;
const log = [];
let ts = NOW - 30;
const send = async (ev, extra = {}, headers = {}) => {
  ts += 10;
  const d = makeDelivery(ev, {deliveryTs: ts, ...extra});
  const r = await deliver(base, d, headers);
  const s = await (await fetch(`${base}/state/sub_alpha`)).json();
  return {r, d, stateAfter: s.version ? {version: s.version, status: s.status, plan: s.plan} : null};
};
for (const ev of deliveryOrder) {
  const {r, d, stateAfter} = await send(ev);
  log.push({delivered: byId[ev.event_id], event_id: ev.event_id, version: ev.version, delivery_ts: ts, signature: d.headers['x-subhub-signature'].slice(0, 19) + '…', status: r.status, outcome: r.body.outcome, stateAfter});
}
evidence.corrected = {backend: rcv.db.kind, log};

// 3. Security checks on the corrected receiver
const checks = [];
{ // tampered body
  ts += 10;
  const d = makeDelivery(v3, {deliveryTs: ts});
  const r = await deliver(base, {...d, body: d.body.replace('"active"', '"canceled"')});
  checks.push({check: 'tampered body, original signature', status: r.status, body: r.body});
}
{ // wrong secret
  const {r} = await send(v3, {secret: 'wrong_secret'});
  checks.push({check: 'signed with the wrong secret', status: r.status, body: r.body});
}
{ // expired delivery timestamp with a VALID signature
  const d = makeDelivery(v3, {deliveryTs: NOW - 301});
  const r = await deliver(base, d);
  checks.push({check: 'valid signature, delivery timestamp 301 s old', status: r.status, body: r.body});
}
{ // commit failure
  const v4 = prov.makeEvent('sub_alpha', 'subscription.updated', {status: 'active', plan: 'enterprise'});
  const before = rcv.db.stateDigest(['sub_alpha']);
  const {r} = await send(v4, {}, {'x-fault': 'fail-commit'});
  const after = rcv.db.stateDigest(['sub_alpha']);
  checks.push({check: 'v4 with simulated commit failure', status: r.status, body: r.body, stateUnchanged: before === after, eventRecords: rcv.db.countEvents()});
  const retry = await send(v4);
  checks.push({check: 'v4 retried after the 5xx', status: retry.r.status, outcome: retry.r.body.outcome, stateAfter: retry.stateAfter});
}
evidence.checks = checks;

// 4. Concurrent duplicate deliveries of one brand-new event
{
  const v5 = prov.makeEvent('sub_alpha', 'subscription.updated', {status: 'active', plan: 'enterprise'});
  const before = rcv.db.countEvents();
  const N = 6;
  const results = await Promise.all(Array.from({length: N}, (_, i) => deliver(base, makeDelivery(v5, {deliveryTs: NOW - i}))));
  evidence.concurrent = {event: 'v5', attempts: N, statuses: results.map((r) => r.status), applied: results.filter((r) => r.body.outcome === 'applied').length, duplicate: results.filter((r) => r.body.outcome === 'duplicate').length, eventRecordsAdded: rcv.db.countEvents() - before};
}

// 5. Replay the whole delivery set, shuffled, against the corrected receiver
{
  const digestBefore = rcv.db.stateDigest(['sub_alpha']);
  const countBefore = rcv.db.countEvents();
  const replay = [v2, v3, v1, v3, v2, v1];
  const rs = [];
  for (const ev of replay) { const {r} = await send(ev); rs.push({delivered: byId[ev.event_id], status: r.status, outcome: r.body.outcome}); }
  const s = await (await fetch(`${base}/state/sub_alpha`)).json();
  evidence.replay = {order: replay.map((e) => byId[e.event_id]), results: rs, stateDigestBefore: digestBefore, stateDigestAfter: rcv.db.stateDigest(['sub_alpha']), unchanged: digestBefore === rcv.db.stateDigest(['sub_alpha']), eventRecordsBefore: countBefore, eventRecordsAfter: rcv.db.countEvents(), finalState: {version: s.version, status: s.status, plan: s.plan}};
}
evidence.eventTable = rcv.db.listEvents().map((e) => ({event_id: e.event_id, version: e.version, outcome: e.outcome}));
await rcv.close();

fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));

console.log(`backend: ${evidence.corrected.backend}`);
console.log('\nNAIVE receiver (arrival order applied):');
console.table(evidence.naive.log.map((l) => ({delivered: l.delivered, status: l.status, outcome: l.outcome, state: `v${l.stateAfter.version} ${l.stateAfter.status}/${l.stateAfter.plan}`})));
console.log('\nCORRECTED receiver:');
console.table(evidence.corrected.log.map((l) => ({delivered: l.delivered, status: l.status, outcome: l.outcome, state: `v${l.stateAfter.version} ${l.stateAfter.status}/${l.stateAfter.plan}`})));
console.table(evidence.checks.map((c) => ({check: c.check, status: c.status, outcome: c.outcome ?? c.body?.error ?? '-'})));
console.log('concurrent:', JSON.stringify(evidence.concurrent));
console.log('replay unchanged:', evidence.replay.unchanged, 'final:', JSON.stringify(evidence.replay.finalState));
