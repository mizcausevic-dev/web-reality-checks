import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {open, initDb, reportsForRun, allReports, isComplete, classify, expectedReport, windowFor, refFor, REPORT_TYPE, SCHEDULED_UTC} from './db.mjs';
import {runWithBarrier, runOne, spawnWorker} from './harness.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wrc-ep30-'));
let n = 0;
const fresh = (variant) => { const f = path.join(tmp, `t${++n}.db`); initDb(f, variant); return f; };
test.after(() => fs.rmSync(tmp, {recursive: true, force: true}));

const W = (db, name, extra = {}) => ({db, name, ...extra});
const outcomes = (r) => r.results.map((x) => x.outcome).sort();
const withReader = (file, fn) => { const r = open(file, 1000); try { return fn(r); } finally { r.close(); } };
const rows = (file) => withReader(file, (r) => reportsForRun(r));

/** Start a worker, wait for the barrier arrival, release it. For tests that must act mid-flight. */
const startAndRelease = async (cfg) => {
  const w = spawnWorker(cfg);
  await Promise.race([w.waitFor('ready'), w.waitFor('checked')]);
  w.child.send({type: 'go'});
  return w;
};

test('test oracle: the expected report covers only rows inside the UTC window', () => {
  const e = expectedReport();
  assert.deepEqual(e.window, {from: '2026-03-01T02:00:00Z', to: '2026-03-02T02:00:00Z'});
  assert.equal(e.row_count, 7, 'two rows lie outside the window (one second early; exactly at the end instant)');
  assert.equal(e.total_cents, 12325);
});

test('scheduled instants must be explicit UTC strings', () => {
  assert.throws(() => windowFor('2026-03-02T03:00:00+01:00'), /UTC/);
  assert.throws(() => windowFor('2026-03-02 02:00:00'), /UTC/);
});

test('journal mode is WAL and every connection has a bounded busy timeout', () => {
  const f = fresh('corrected');
  const db = open(f, 1234);
  assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(db.prepare('PRAGMA busy_timeout').get().timeout, 1234);
  db.close();
});

test('schema: flawed has no uniqueness on the logical run; corrected has UNIQUE(report_type, scheduled_utc)', () => {
  const uniqueCols = (file) => withReader(file, (r) => {
    const out = [];
    for (const ix of r.prepare("PRAGMA index_list('reports')").all()) {
      if (!ix.unique) continue;
      out.push(r.prepare(`PRAGMA index_info('${ix.name}')`).all().map((c) => c.name).join(','));
    }
    return out;
  });
  assert.deepEqual(uniqueCols(fresh('flawed')), []);
  assert.ok(uniqueCols(fresh('corrected')).includes('report_type,scheduled_utc'));
});

test('KNOWN-POSITIVE CONTROL: coordinated race on the flawed schema commits TWO reports for ONE logical run', async () => {
  const f = fresh('flawed');
  const r = await runWithBarrier([W(f, 'A', {variant: 'flawed'}), W(f, 'B', {variant: 'flawed'})]);
  // separate processes, separate connections
  assert.equal(new Set([process.pid, ...r.workers.map((w) => w.pid)]).size, 3);
  // both existence checks happened (and said "absent") BEFORE the barrier released anyone
  assert.deepEqual(r.arrivals.map((m) => [m.type, m.found]), [['checked', 0], ['checked', 0]]);
  const release = r.events.indexOf('barrier: all workers arrived, releasing');
  assert.equal(release, 2);
  assert.deepEqual(r.events.slice(0, 2).sort(), ['A: checked, found 0', 'B: checked, found 0']);
  // short write contention was handled by the busy timeout: both inserts committed
  assert.deepEqual(outcomes(r), ['inserted', 'inserted']);
  assert.deepEqual(r.exits.map((e) => e.code), [0, 0]);
  const got = rows(f);
  assert.equal(got.length, 2, 'the flaw must be observable or the fix test proves nothing');
  assert.ok(got.every(isComplete));
  assert.deepEqual(got.map((x) => x.worker).sort(), ['A', 'B']);
  assert.equal(new Set(got.map((x) => `${x.report_type}|${x.scheduled_utc}`)).size, 1, 'one logical run');
});

test('corrected: both workers pass a stale "absent" check, yet exactly one report is committed (5 rounds)', async () => {
  for (let round = 0; round < 5; round++) {
    const f = fresh('corrected');
    const r = await runWithBarrier([W(f, 'A', {precheck: true}), W(f, 'B', {precheck: true})]);
    assert.deepEqual(r.arrivals.map((m) => [m.type, m.found]), [['checked', 0], ['checked', 0]], 'both saw "absent" before release');
    assert.deepEqual(outcomes(r), ['already-committed', 'committed'], `round ${round}`);
    assert.deepEqual(r.exits.map((e) => e.code), [0, 0]);
    const got = rows(f);
    assert.equal(got.length, 1);
    assert.ok(isComplete(got[0]));
    const winner = r.results.find((x) => x.outcome === 'committed');
    const loser = r.results.find((x) => x.outcome === 'already-committed');
    assert.equal(got[0].worker, winner.worker);
    assert.equal(loser.existingWorker, winner.worker, 'the loser verified the winner\'s committed report');
    assert.equal(loser.existingId, got[0].id);
    assert.equal(loser.changes, 0);
    assert.deepEqual(JSON.parse(got[0].body), expectedReport());
    assert.equal(got[0].row_count, 7);
    assert.equal(got[0].total_cents, 12325);
  }
});

test('corrected: with a widened lock-hold window (test hook), the loser still ends as already-committed (3 rounds)', async () => {
  for (let round = 0; round < 3; round++) {
    const f = fresh('corrected');
    const r = await runWithBarrier([W(f, 'A', {holdInTxnMs: 150}), W(f, 'B', {holdInTxnMs: 150})]);
    assert.deepEqual(outcomes(r), ['already-committed', 'committed']);
    const got = rows(f);
    assert.equal(got.length, 1);
    assert.ok(isComplete(got[0]));
    assert.deepEqual(JSON.parse(got[0].body), expectedReport());
  }
});

test('corrected: a later run after completion finds the committed report and changes nothing', async () => {
  const f = fresh('corrected');
  await runOne(W(f, 'first'));
  const before = rows(f);
  const again = await runOne(W(f, 'second'));
  assert.equal(again.results[0].outcome, 'already-committed');
  assert.deepEqual(rows(f), before);
});

test('corrected: distinct logical runs are independent (different scheduled instant)', async () => {
  const f = fresh('corrected');
  await runOne(W(f, 'A'));
  const next = '2026-03-03T02:00:00Z';
  const r = await runOne(W(f, 'B', {scheduledUtc: next, ref: refFor(REPORT_TYPE, next)}));
  assert.equal(r.results[0].outcome, 'committed');
  const all = withReader(f, (x) => allReports(x));
  assert.deepEqual(all.map((x) => x.scheduled_utc), [SCHEDULED_UTC, next]);
});

test('pre-commit failure (hard crash): the row is invisible, the crash leaves no report, the lock is released, a retry commits exactly one', async () => {
  const f = fresh('corrected');
  const a = await startAndRelease(W(f, 'A', {fault: 'die-after-insert'}));
  const inserted = await a.waitFor('inserted');
  assert.ok(inserted.rowId >= 1, 'worker A has inserted its row inside an open transaction');
  assert.equal(rows(f).length, 0, 'another connection sees nothing: the insert is not committed');
  a.child.send({type: 'continue'});
  const exit = await a.exited;
  assert.equal(exit.signal, 'SIGKILL');
  assert.equal(a.result, null, 'a crashed worker reports nothing');
  assert.equal(rows(f).length, 0, 'rollback leaves no row');
  // the write lock died with the process: a probe can take it immediately
  const probe = open(f, 200);
  probe.exec('BEGIN IMMEDIATE');
  probe.exec('ROLLBACK');
  probe.close();
  // retry
  const retry = await runOne(W(f, 'A-retry'));
  assert.equal(retry.results[0].outcome, 'committed');
  const got = rows(f);
  assert.equal(got.length, 1);
  assert.ok(isComplete(got[0]));
  assert.equal(got[0].worker, 'A-retry');
  assert.deepEqual(JSON.parse(got[0].body), expectedReport());
});

test('pre-commit failure (exception after the complete result is computed): explicit ROLLBACK, no row, a retry commits exactly one', async () => {
  const f = fresh('corrected');
  const r = await runOne(W(f, 'A', {fault: 'throw-before-commit'}));
  assert.equal(r.results[0].outcome, 'failed-rolled-back');
  assert.equal(r.results[0].rolledBack, true);
  assert.equal(r.exits[0].code, 3);
  assert.equal(rows(f).length, 0, 'even a fully computed result is discarded when the commit never happens');
  const retry = await runOne(W(f, 'A-retry'));
  assert.equal(retry.results[0].outcome, 'committed');
  assert.equal(rows(f).length, 1);
  assert.equal(withReader(f, (r) => allReports(r)).every(isComplete), true);
});

test('lock contention: exhausted busy timeout is a RETRYABLE failure, not "already completed"; no row is written', async () => {
  const f = fresh('corrected');
  const holder = open(f, 1000); // a third, independent connection
  holder.exec('BEGIN IMMEDIATE');
  try {
    const r = await runOne(W(f, 'A', {busyTimeoutMs: 30}));
    const res = r.results[0];
    assert.equal(res.outcome, 'retryable-busy');
    assert.notEqual(res.outcome, 'already-committed');
    assert.equal(res.errcode, 5, 'SQLITE_BUSY');
    assert.equal(r.exits[0].code, 75);
    assert.equal(res.rolledBack, false, 'it never got a transaction');
  } finally {
    holder.exec('ROLLBACK');
    holder.close();
  }
  assert.equal(rows(f).length, 0);
  const retry = await runOne(W(f, 'A-retry'));
  assert.equal(retry.results[0].outcome, 'committed');
  assert.equal(rows(f).length, 1);
});

test('lock contention while the holder is completing the SAME run: still retryable-busy; only after the commit does a retry say "already committed"', async () => {
  const f = fresh('corrected');
  const holder = open(f, 1000);
  holder.exec('BEGIN IMMEDIATE');
  holder.prepare(`INSERT INTO reports (report_type, scheduled_utc, ref, worker, status) VALUES (?, ?, ?, 'holder', 'pending')`).run(REPORT_TYPE, SCHEDULED_UTC, refFor(REPORT_TYPE, SCHEDULED_UTC));
  const busy = await runOne(W(f, 'A', {busyTimeoutMs: 30}));
  assert.equal(busy.results[0].outcome, 'retryable-busy', 'the busy worker cannot know the holder will succeed');
  assert.equal(rows(f).length, 0, 'nothing committed yet');
  const rep = expectedReport();
  holder.prepare(`UPDATE reports SET status='complete', row_count=?, total_cents=?, body=? WHERE worker='holder'`).run(rep.row_count, rep.total_cents, JSON.stringify(rep));
  holder.exec('COMMIT');
  holder.close();
  const retry = await runOne(W(f, 'A-retry'));
  assert.equal(retry.results[0].outcome, 'already-committed');
  assert.equal(retry.results[0].existingWorker, 'holder');
  assert.equal(rows(f).length, 1);
});

test('a UNIQUE violation from a DIFFERENT constraint (reports.ref) is not reported as "already completed"', async () => {
  const f = fresh('corrected');
  // A complete report for another logical run happens to own the reference this run would use.
  const seed = open(f, 1000);
  const rep = expectedReport('2026-03-01T02:00:00Z');
  seed.prepare(`INSERT INTO reports (report_type, scheduled_utc, ref, worker, status, row_count, total_cents, body) VALUES (?, ?, ?, 'old', 'complete', ?, ?, ?)`)
    .run(REPORT_TYPE, '2026-03-01T02:00:00Z', refFor(REPORT_TYPE, SCHEDULED_UTC), rep.row_count, rep.total_cents, JSON.stringify(rep));
  seed.close();
  const r = await runOne(W(f, 'A'));
  const res = r.results[0];
  assert.equal(res.outcome, 'constraint-violation');
  assert.notEqual(res.outcome, 'already-committed');
  assert.match(res.message, /UNIQUE constraint failed: reports\.ref/);
  assert.equal(res.rolledBack, true);
  assert.equal(r.exits[0].code, 4);
  assert.equal(rows(f).length, 0, 'no report exists for the requested run');
});

test('error classification: busy/locked are retryable; other constraint codes are not "completed"; the rest fail', () => {
  assert.equal(classify({errcode: 5}), 'retryable-busy');
  assert.equal(classify({errcode: 6}), 'retryable-busy');
  assert.equal(classify({errcode: 261}), 'retryable-busy', 'extended busy codes keep the primary code in the low byte');
  assert.equal(classify({errcode: 2067}), 'constraint-violation');
  assert.equal(classify({errcode: 1}), 'failed');
  assert.equal(classify(new Error('plain')), 'failed');
});

test('an in-process Boolean stops a repeat inside one process but cannot coordinate two processes (demonstration)', async () => {
  const f = fresh('flawed');
  const r = await runWithBarrier([W(f, 'A', {variant: 'boolean'}), W(f, 'B', {variant: 'boolean'})]);
  assert.deepEqual(r.results.map((x) => x.localCalls), [['inserted', 'skipped-by-boolean'], ['inserted', 'skipped-by-boolean']]);
  assert.equal(rows(f).length, 2);
});

test('invariant: every committed report in every scenario above is complete (spot check on a fresh corrected race)', async () => {
  const f = fresh('corrected');
  await runWithBarrier([W(f, 'A'), W(f, 'B'), W(f, 'C')]);
  const all = withReader(f, (r) => allReports(r));
  assert.equal(all.length, 1);
  assert.ok(all.every(isComplete));
  assert.ok(all.every((x) => x.status === 'complete' && x.body !== null));
});
