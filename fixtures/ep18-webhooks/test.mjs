import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvider, makeDelivery, deliver, sign, SECRET} from './provider.mjs';
import {createReceiver} from './receiver.mjs';
import {createNaiveReceiver} from './receiver-naive.mjs';
import {createDb, sqliteAvailable} from './db.mjs';

// Fixed clock for the receiver so freshness tests never sleep. Deliveries default to NOW.
const NOW = 1_768_000_000; // unix seconds, arbitrary fixed instant
const clock = {now: NOW};
const now = () => clock.now;

/** One subscription's life, in creation order. Every event carries the FULL snapshot. */
const makeEvents = () => {
  const p = createProvider();
  return {
    v1: p.makeEvent('sub_alpha', 'subscription.created', {status: 'trialing', plan: 'starter'}),
    v2: p.makeEvent('sub_alpha', 'subscription.updated', {status: 'past_due', plan: 'starter'}),
    v3: p.makeEvent('sub_alpha', 'subscription.updated', {status: 'active', plan: 'pro'}),
  };
};

const withReceiver = async (fn, opts = {}) => {
  const rcv = createReceiver({now, ...opts});
  const port = await rcv.listen();
  const base = `http://127.0.0.1:${port}`;
  try { await fn({base, rcv, send: (ev, o, h) => deliver(base, makeDelivery(ev, {deliveryTs: NOW, ...o}), h), state: async (id) => (await fetch(`${base}/state/${id}`)).json()}); }
  finally { await rcv.close(); }
};

test('valid signature + fresh timestamp -> 200, state applied', () => withReceiver(async ({send, state}) => {
  const {v1} = makeEvents();
  const r = await send(v1);
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, 'applied');
  assert.equal((await state('sub_alpha')).status, 'trialing');
}));

test('tampered body (one byte changed after signing) -> 401, nothing stored', () => withReceiver(async ({base, rcv}) => {
  const {v1} = makeEvents();
  const d = makeDelivery(v1, {deliveryTs: NOW});
  const tampered = {...d, body: d.body.replace('"trialing"', '"canceled"')};
  const r = await deliver(base, tampered);
  assert.equal(r.status, 401);
  assert.equal(rcv.db.countEvents(), 0);
  assert.equal(rcv.db.getState('sub_alpha'), null);
}));

test('signature from the wrong secret -> 401', () => withReceiver(async ({send, rcv}) => {
  const {v1} = makeEvents();
  const r = await send(v1, {secret: 'not_the_secret_' + SECRET});
  assert.equal(r.status, 401);
  assert.equal(rcv.db.countEvents(), 0);
}));

test('signature is verified over RAW bytes: whitespace-different body signed as sent -> 200; signed over a re-serialisation -> 401', () => withReceiver(async ({base}) => {
  const {v1} = makeEvents();
  const pretty = JSON.stringify(v1, null, 2); // same JSON value, different bytes
  // Signed over the exact bytes sent: accepted.
  const ok = await deliver(base, makeDelivery(v1, {deliveryTs: NOW, rawBody: pretty}));
  assert.equal(ok.status, 200);
  // Signed over JSON.stringify(JSON.parse(body)) but SENT as pretty bytes: a receiver that
  // re-serialised before verifying would accept this; the corrected one must not.
  const reserialised = JSON.stringify(JSON.parse(pretty));
  const bad = await deliver(base, {headers: {'content-type': 'application/json', 'x-subhub-timestamp': String(NOW), 'x-subhub-signature': `v1=${sign(SECRET, NOW, reserialised)}`}, body: pretty});
  assert.equal(bad.status, 401);
}));

test('valid signature but delivery timestamp older than tolerance (300 s) -> 401', () => withReceiver(async ({send, rcv}) => {
  const {v1} = makeEvents();
  const r = await send(v1, {deliveryTs: NOW - 301});
  assert.equal(r.status, 401, 'a valid signature does not establish freshness');
  assert.equal(r.body.age_s, 301);
  assert.equal(rcv.db.countEvents(), 0);
  // exactly at the edge is accepted
  assert.equal((await send(v1, {deliveryTs: NOW - 300})).status, 200);
}));

test('a legitimate retry carries a FRESH timestamp and signature and is accepted as a duplicate (200, no second apply)', () => withReceiver(async ({send, rcv}) => {
  const {v1} = makeEvents();
  const first = await send(v1, {deliveryTs: NOW - 200});
  const retry = await send(v1, {deliveryTs: NOW}); // new ts => new signature, same body bytes
  assert.equal(first.body.outcome, 'applied');
  assert.equal(retry.status, 200);
  assert.equal(retry.body.outcome, 'duplicate');
  assert.equal(rcv.db.countEvents(), 1, 'UNIQUE (provider, event_id) kept one record');
}));

test('duplicate event id with an identical fresh delivery -> 200 duplicate, state unchanged', () => withReceiver(async ({send, state, rcv}) => {
  const {v1, v2} = makeEvents();
  await send(v1); await send(v2);
  const before = rcv.db.stateDigest(['sub_alpha']);
  const r = await send(v2);
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, 'duplicate');
  assert.equal(rcv.db.stateDigest(['sub_alpha']), before);
  assert.equal((await state('sub_alpha')).version, 2);
}));

test('out-of-order: an OLDER version arriving after a newer one is recorded as stale and NOT applied', () => withReceiver(async ({send, state, rcv}) => {
  const {v1, v2, v3} = makeEvents();
  await send(v1);
  await send(v3); // v3 (active, pro) arrives before v2
  const late = await send(v2); // v2 (past_due) arrives late
  assert.equal(late.status, 200, 'accepted so the provider stops retrying');
  assert.equal(late.body.outcome, 'stale');
  const s = await state('sub_alpha');
  assert.equal(s.version, 3);
  assert.equal(s.status, 'active');
  assert.equal(rcv.db.listEvents().find((e) => e.event_id === v2.event_id).outcome, 'stale', 'the stale event is still recorded');
}));

test('KNOWN-POSITIVE CONTROL: the naive receiver applies in arrival order and regresses active -> past_due', async () => {
  const naive = createNaiveReceiver({now});
  const port = await naive.listen();
  const base = `http://127.0.0.1:${port}`;
  try {
    const {v1, v2, v3} = makeEvents();
    for (const ev of [v1, v3, v2]) assert.equal((await deliver(base, makeDelivery(ev, {deliveryTs: NOW}))).status, 200);
    const s = await (await fetch(`${base}/state/sub_alpha`)).json();
    assert.equal(s.status, 'past_due', 'the flaw must be observable or the fix test proves nothing');
    assert.equal(s.version, 2);
  } finally { await naive.close(); }
});

test('concurrent duplicate deliveries of one event -> exactly one applied, the rest duplicate, one record', () => withReceiver(async ({base, rcv}) => {
  const {v1} = makeEvents();
  const N = 6;
  const results = await Promise.all(Array.from({length: N}, (_, i) => deliver(base, makeDelivery(v1, {deliveryTs: NOW - i}))));
  assert.deepEqual(results.map((r) => r.status), Array(N).fill(200));
  const outcomes = results.map((r) => r.body.outcome).sort();
  assert.equal(outcomes.filter((o) => o === 'applied').length, 1);
  assert.equal(outcomes.filter((o) => o === 'duplicate').length, N - 1);
  assert.equal(rcv.db.countEvents(), 1);
}));

test('replay of the FULL delivery set (any order) leaves final state unchanged', () => withReceiver(async ({send, rcv}) => {
  const {v1, v2, v3} = makeEvents();
  for (const ev of [v1, v3, v2]) await send(ev);
  const digest = rcv.db.stateDigest(['sub_alpha']);
  const count = rcv.db.countEvents();
  for (const ev of [v2, v1, v3, v3, v2, v1]) { const r = await send(ev); assert.equal(r.status, 200); assert.equal(r.body.outcome, 'duplicate'); }
  assert.equal(rcv.db.stateDigest(['sub_alpha']), digest);
  assert.equal(rcv.db.countEvents(), count);
  assert.equal(rcv.db.getState('sub_alpha').status, 'active');
}));

test('commit failure -> 503 (non-2xx), no event record, no state change; the retry then succeeds', () => withReceiver(async ({send, rcv}) => {
  const {v1, v2} = makeEvents();
  await send(v1);
  const before = rcv.db.stateDigest(['sub_alpha']);
  const r = await send(v2, {}, {'x-fault': 'fail-commit'});
  assert.equal(r.status, 503);
  assert.equal(rcv.db.countEvents(), 1, 'the event record was rolled back with the state change');
  assert.equal(rcv.db.stateDigest(['sub_alpha']), before);
  const retry = await send(v2); // provider retries after the 5xx
  assert.equal(retry.status, 200);
  assert.equal(retry.body.outcome, 'applied');
  assert.equal(rcv.db.getState('sub_alpha').version, 2);
}));

test('verified but malformed payload -> 400, nothing stored', () => withReceiver(async ({send, rcv}) => {
  const {v1} = makeEvents();
  const broken = {...v1, snapshot: {...v1.snapshot, status: 'frozen'}};
  const r = await send(broken);
  assert.equal(r.status, 400);
  assert.equal(r.body.field, 'snapshot.status');
  assert.equal(rcv.db.countEvents(), 0);
}));

test('store backends: the in-process fallback has the same transaction + UNIQUE semantics as sqlite', () => {
  const kinds = sqliteAvailable() ? ['sqlite', 'memory'] : ['memory'];
  for (const kind of kinds) {
    const db = createDb({force: kind});
    assert.equal(db.kind, kind);
    const {v1, v2, v3} = makeEvents();
    assert.equal(db.applyEvent('subhub', v1).outcome, 'applied');
    assert.equal(db.applyEvent('subhub', v3).outcome, 'applied');
    assert.equal(db.applyEvent('subhub', v2).outcome, 'stale');
    assert.equal(db.applyEvent('subhub', v3).outcome, 'duplicate');
    assert.throws(() => db.applyEvent('subhub', {...v3, event_id: 'evt_aaaaaaaaaaaa', version: 4}, {failCommit: true}), /SIMULATED/);
    assert.equal(db.countEvents(), 3, `${kind}: failed commit left no record`);
    assert.equal(db.getState('sub_alpha').version, 3);
    db.close();
  }
});
