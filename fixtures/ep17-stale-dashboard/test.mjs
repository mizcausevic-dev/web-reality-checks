import test from 'node:test';
import assert from 'node:assert/strict';
import {createClock} from './clock.mjs';
import {evaluate, naiveStatus, STALE_THRESHOLD_SECONDS, CONNECTION_WINDOW_SECONDS} from './state-rules.mjs';
import {createPipeline, COLLECT_INTERVAL_SECONDS, POLL_INTERVAL_SECONDS} from './pipeline.mjs';

test('shared clock is monotonic and explicit', () => {
  const c = createClock();
  const t0 = c.now();
  c.advanceSeconds(30);
  assert.equal(c.now() - t0, 30_000);
  assert.throws(() => c.advanceSeconds(-1), RangeError);
  assert.throws(() => c.setMs(t0), RangeError);
});

test('healthy scenario: successful polls do not reset measurement age; age grows between polls', () => {
  const p = createPipeline();
  // t=0 collect happened; poll at 30, 60, ... 570 all 200 OK with the same reading
  const rows = p.advance(570).filter((r) => r.event === 'poll');
  assert.equal(rows.length, 19);
  for (const r of rows) {
    assert.equal(r.pollStatus, 200);
    assert.equal(r.connection, 'connected');
    assert.equal(r.collectedAt, rows[0].collectedAt, 'polling does not produce a new collected reading');
    assert.equal(r.sourceObservedAt, rows[0].sourceObservedAt);
    assert.equal(r.measurementAgeSeconds, r.t, 'age derives from sourceObservedAt (t=0), not from the poll');
    assert.equal(r.naiveLabel, 'Live');
    assert.equal(r.naiveUpdatedSecondsAgo, 0, 'KNOWN-POSITIVE CONTROL: the naive label resets to "updated 0 s ago" on every poll');
  }
  const fresh = rows.filter((r) => r.measurementAgeSeconds <= STALE_THRESHOLD_SECONDS);
  const stale = rows.filter((r) => r.measurementAgeSeconds > STALE_THRESHOLD_SECONDS);
  assert.ok(fresh.every((r) => r.freshness === 'fresh'));
  assert.ok(stale.every((r) => r.freshness === 'stale'));
  assert.ok(stale.length > 0, 'the healthy pipeline still goes stale by policy before the next collection');
  // ages strictly increase between consecutive polls
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].measurementAgeSeconds > rows[i - 1].measurementAgeSeconds);
});

test('healthy scenario: the next collection (t=600) refreshes the measurement and age drops', () => {
  const p = createPipeline();
  p.advance(600);
  const last = p.trace.at(-1);
  assert.equal(last.event, 'poll');
  assert.equal(last.measurementAgeSeconds, 0);
  assert.equal(last.freshness, 'fresh');
  assert.notEqual(last.collectedAt, p.trace[0].collectedAt);
});

test('polling faster does not change collectedAt or sample the source faster', () => {
  const slow = createPipeline({pollInterval: 30});
  const fast = createPipeline({pollInterval: 5});
  slow.advance(599);
  fast.advance(599);
  const slowPolls = slow.trace.filter((r) => r.event === 'poll');
  const fastPolls = fast.trace.filter((r) => r.event === 'poll');
  assert.ok(fastPolls.length > slowPolls.length * 5);
  assert.equal(new Set(fastPolls.map((r) => r.collectedAt)).size, 1, 'every fast poll returned the same collectedAt');
  assert.equal(fastPolls.at(-1).collectedAt, slowPolls.at(-1).collectedAt);
  assert.equal(fast.collector.attempts.length, slow.collector.attempts.length, 'collector sampled the same number of times regardless of poll rate');
  // at the same simulated instant (t=570) both dashboards report the same age: faster polling bought nothing
  assert.equal(fastPolls.find((r) => r.t === 570).measurementAgeSeconds, slowPolls.find((r) => r.t === 570).measurementAgeSeconds);
});

test('collector failure: API still answers 200 with the old reading; dashboard says connected but stale', () => {
  const p = createPipeline();
  p.advance(570);
  p.collector.failing = true;
  const rows = p.advance(630); // covers the failed collections at t=600 and t=1200
  const failedCollects = rows.filter((r) => r.event === 'collect-failed');
  assert.equal(failedCollects.length, 2);
  const last = rows.at(-1);
  assert.equal(last.event, 'poll');
  assert.equal(last.pollStatus, 200, 'the HTTP response is a success');
  assert.equal(last.connection, 'connected');
  assert.equal(last.freshness, 'stale');
  assert.equal(last.measurementAgeSeconds, 1200, 'age keeps growing from the t=0 observation');
  assert.equal(last.collectedAt, p.trace[0].collectedAt, 'no new reading was collected');
  assert.equal(last.naiveLabel, 'Live', 'KNOWN-POSITIVE CONTROL: the naive dashboard still says Live');
  assert.match(last.warning, /1200 s old/);
});

test('API failure: failed poll keeps the last known value with an explicit warning; nothing is fabricated', () => {
  const p = createPipeline();
  p.advance(60);
  const before = p.dashboard.reading;
  p.api.failing = true;
  const rows = p.advance(60).filter((r) => r.event === 'poll');
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(r.pollStatus, 503);
    assert.equal(r.connection, 'disconnected');
    assert.equal(r.value, before.value, 'last known value retained');
    assert.equal(r.sourceObservedAt, before.sourceObservedAt);
    assert.match(r.warning, /Last poll failed \(503 Service Unavailable\); showing last known value\./);
    assert.equal(r.naiveLabel, 'Offline');
  }
  assert.equal(rows.at(-1).measurementAgeSeconds, 120, 'age still derives from sourceObservedAt during the outage');
  // recovery: a later successful poll reconnects without inventing a newer reading
  p.api.failing = false;
  const after = p.advance(30).at(-1);
  assert.equal(after.pollStatus, 200);
  assert.equal(after.connection, 'connected');
  assert.equal(after.collectedAt, before.collectedAt);
  assert.equal(after.measurementAgeSeconds, 150);
});

test('API failure before any reading: no value, unknown freshness, disconnected', () => {
  const p = createPipeline({collectAtStart: false});
  p.api.failing = true;
  const r = p.advance(30).at(-1);
  assert.equal(r.value, null);
  assert.equal(r.freshness, 'unknown');
  assert.equal(r.connection, 'disconnected');
  assert.match(r.warning, /No measurement has been received yet/);
});

test('future timestamp is flagged impossible-future, never shown as a negative age', () => {
  const now = createClock().now();
  const s = evaluate({reading: {value: 1, sourceObservedAt: new Date(now + 45_000).toISOString()}, nowMs: now, lastPoll: {at: now, ok: true}});
  assert.equal(s.measurementAgeSeconds, null);
  assert.equal(s.freshness, 'unknown');
  assert.equal(s.reason, 'impossible-future');
  assert.equal(s.connection, 'connected', 'the connection was fine; only the measurement is suspect');
  assert.match(s.warning, /in the future/);
});

test('missing or invalid timestamps produce an unknown state', () => {
  const now = createClock().now();
  for (const bad of [undefined, null, '', 'not-a-date', 12345, '2026-13-45T99:00:00Z']) {
    const s = evaluate({reading: {value: 1, sourceObservedAt: bad}, nowMs: now, lastPoll: {at: now, ok: true}});
    assert.equal(s.freshness, 'unknown', `sourceObservedAt=${String(bad)}`);
    assert.equal(s.measurementAgeSeconds, null);
    assert.equal(s.reason, 'invalid-timestamp');
  }
  const none = evaluate({reading: null, nowMs: now, lastPoll: null});
  assert.deepEqual([none.freshness, none.connection, none.reason], ['unknown', 'unknown', 'no-reading']);
});

test('stale threshold is the documented policy constant and is applied at the boundary', () => {
  const now = createClock().now();
  const at = (age) => evaluate({reading: {value: 1, sourceObservedAt: new Date(now - age * 1000).toISOString()}, nowMs: now, lastPoll: {at: now, ok: true}});
  assert.equal(at(STALE_THRESHOLD_SECONDS).freshness, 'fresh');
  assert.equal(at(STALE_THRESHOLD_SECONDS + 1).freshness, 'stale');
});

test('connection becomes unknown when the last successful poll is older than the connection window', () => {
  const now = createClock().now();
  const s = evaluate({reading: {value: 1, sourceObservedAt: new Date(now).toISOString()}, nowMs: now + (CONNECTION_WINDOW_SECONDS + 1) * 1000, lastPoll: {at: now, ok: true}});
  assert.equal(s.connection, 'unknown');
});

test('intervals match the brief: collect every 600 s, poll every 30 s', () => {
  assert.equal(COLLECT_INTERVAL_SECONDS, 600);
  assert.equal(POLL_INTERVAL_SECONDS, 30);
  assert.equal(naiveStatus({nowMs: 0, lastPoll: null}).label, 'Connecting…');
});
