import test from 'node:test';
import assert from 'node:assert/strict';
import {DnsSim, runSequence, INTENDED_IP, WRONG_IP} from './simulator.mjs';

const {sim, snapshots} = runSequence();
const ev = sim.events;
const at = (t, client) => ev.find((e) => e.t === t && e.client === client);

test('t=0: resolver A caches the correct address with TTL 60 (cache miss, connect ok)', () => {
  const e = at(0, 'clientA');
  assert.equal(e.cacheHit, false);
  assert.equal(e.answer, INTENDED_IP);
  assert.equal(e.ttlRemaining, 60);
  assert.equal(e.connect, 'ok');
  assert.deepEqual(snapshots[0].resolverA, {status: 'fresh', answer: INTENDED_IP, ttlRemaining: 60, cachedAt: 0, expiresAt: 60});
  assert.equal(snapshots[0].resolverB.status, 'empty');
});

test('t=10: authoritative record changed to the wrong address; resolver A cache untouched', () => {
  const s = snapshots[10];
  assert.equal(s.authoritative.value, WRONG_IP);
  assert.equal(s.resolverA.answer, INTENDED_IP);
  assert.equal(s.resolverA.ttlRemaining, 50);
  assert.equal(s.resolverB.status, 'empty');
});

test('t=15: resolver B misses and caches the WRONG address with TTL 60 (KNOWN-POSITIVE CONTROL)', () => {
  const e = at(15, 'clientB');
  assert.equal(e.cacheHit, false);
  assert.equal(e.answer, WRONG_IP, 'the flaw must be observable: the wrong record is served');
  assert.equal(e.ttlRemaining, 60);
  assert.equal(e.connect, 'failed');
  assert.deepEqual(snapshots[15].resolverB, {status: 'fresh', answer: WRONG_IP, ttlRemaining: 60, cachedAt: 15, expiresAt: 75});
});

test('t=20: client A still correct (cache hit); client B wrong (cache hit) and connection fails', () => {
  const a = at(20, 'clientA'), b = at(20, 'clientB');
  assert.deepEqual([a.cacheHit, a.answer, a.ttlRemaining, a.connect], [true, INTENDED_IP, 40, 'ok']);
  assert.deepEqual([b.cacheHit, b.answer, b.ttlRemaining, b.connect], [true, WRONG_IP, 55, 'failed']);
});

test('resolution is NOT a failure: every answer in the run is a NOERROR answer; only connect fails', () => {
  for (const e of ev) assert.equal(typeof e.answer, 'string', `t=${e.t} ${e.client} received an address`);
  const failed = ev.filter((e) => e.connect === 'failed');
  assert.ok(failed.length > 0);
  for (const e of failed) assert.equal(e.answer, WRONG_IP, 'connection failed because the destination was wrong, not because DNS failed');
});

test('t=30: authoritative restored; resolver B still serves the cached wrong answer (45 s left)', () => {
  const s = snapshots[30];
  assert.equal(s.authoritative.value, INTENDED_IP);
  assert.equal(s.resolverB.answer, WRONG_IP);
  assert.equal(s.resolverB.ttlRemaining, 45);
  const b = at(30, 'clientB');
  assert.deepEqual([b.cacheHit, b.answer, b.connect], [true, WRONG_IP, 'failed']);
  const a = at(30, 'clientA');
  assert.deepEqual([a.cacheHit, a.answer, a.ttlRemaining, a.connect], [true, INTENDED_IP, 30, 'ok']);
});

test('t=60: resolver A entry expired (expiresAt=60); its next query refreshes from the authority', () => {
  const a = at(60, 'clientA');
  assert.equal(a.cacheHit, false, 'entry cached at t=0 with TTL 60 is no longer fresh at t=60');
  assert.deepEqual([a.answer, a.ttlRemaining, a.connect], [INTENDED_IP, 60, 'ok']);
  const b = at(60, 'clientB');
  assert.deepEqual([b.cacheHit, b.answer, b.ttlRemaining, b.connect], [true, WRONG_IP, 15, 'failed']);
});

test('t=75: resolver B bad entry expired; next query retrieves the corrected answer', () => {
  const b = at(75, 'clientB');
  assert.equal(b.cacheHit, false);
  assert.deepEqual([b.answer, b.ttlRemaining, b.connect], [INTENDED_IP, 60, 'ok']);
  const a = at(75, 'clientA');
  assert.deepEqual([a.cacheHit, a.answer, a.ttlRemaining, a.connect], [true, INTENDED_IP, 45, 'ok']);
  assert.equal(snapshots[75].resolverB.answer, INTENDED_IP);
});

test('expiry permits a new lookup; it does not push an update (stale entry sits until queried)', () => {
  const s = new DnsSim();
  s.at(0).query('clientB');          // caches 192.0.2.10, expires at 60
  s.at(5).setRecord(WRONG_IP);
  s.at(100);                         // well past expiry, but nobody has asked
  assert.equal(s.cacheState('B').status, 'expired');
  assert.equal(s.cacheState('B').answer, INTENDED_IP, 'the old value is still what is stored');
  assert.equal(s.events.length, 1, 'no query happened on its own');
  const e = s.query('clientB');      // only now does the resolver fetch the new record
  assert.equal(e.cacheHit, false);
  assert.equal(e.answer, WRONG_IP);
});

test('lowering the authoritative TTL is not retroactive for an answer already cached', () => {
  const s = new DnsSim();
  s.at(0).query('clientA');          // cached with TTL 60 → expires at 60
  s.at(5).setRecord(INTENDED_IP, 5); // TTL lowered at the source to 5 s
  s.at(20);
  const st = s.cacheState('A');
  assert.equal(st.status, 'fresh');
  assert.equal(st.expiresAt, 60, 'expiry is fixed when the answer was cached');
  assert.equal(st.ttlRemaining, 40);
  assert.equal(s.query('clientA').cacheHit, true);
  // only a lookup made after the change inherits the new TTL
  s.at(60).query('clientA');
  assert.equal(s.cacheState('A').expiresAt, 65);
});

test('the two resolvers are independent: no fixed global recovery moment', () => {
  const recoveredAt = (id) => ev.find((e) => e.resolver === id && e.t >= 30 && e.cacheHit === false && e.answer === INTENDED_IP).t;
  assert.equal(recoveredAt('A'), 60);
  assert.equal(recoveredAt('B'), 75);
  assert.notEqual(recoveredAt('A'), recoveredAt('B'));
});

test('virtual clock cannot run backwards', () => {
  const s = new DnsSim();
  s.at(10);
  assert.throws(() => s.at(5), RangeError);
});

test('evidence shape: every event has the required fields', () => {
  for (const e of ev) assert.deepEqual(Object.keys(e).sort(), ['answer', 'cacheHit', 'client', 'connect', 'resolver', 't', 'ttlRemaining']);
  assert.equal(ev.length, 10);
});
