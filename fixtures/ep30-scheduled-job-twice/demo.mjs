// Runs the exact scenarios the EP30 video shows and writes evidence.json.
// Everything in evidence.json is an observed output of real worker processes sharing one SQLite file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {open, initDb, reportsForRun, allReports, expectedReport, refFor, REPORT_TYPE, SCHEDULED_UTC, DEFAULT_BUSY_TIMEOUT_MS} from './db.mjs';
import {runWithBarrier, runOne, spawnWorker} from './harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wrc-ep30-demo-'));
let n = 0;
const fresh = (variant) => { const f = path.join(tmp, `d${++n}.db`); initDb(f, variant); return f; };
const rows = (f) => { const r = open(f, 1000); try { return reportsForRun(r).map(({id, worker, status, row_count, total_cents}) => ({id, worker, status, row_count, total_cents})); } finally { r.close(); } };
const brief = (r) => ({worker: r.worker, outcome: r.outcome, ...(r.existingWorker ? {verifiedCommittedBy: r.existingWorker} : {}), ...(r.errcode != null ? {errcode: r.errcode, errstr: r.errstr, message: r.message} : {})});
const sorted = (rs) => rs.map(brief).sort((a, b) => a.worker.localeCompare(b.worker));

const ev = {
  fixture: 'ep30-scheduled-job-twice',
  logicalRun: {report_type: REPORT_TYPE, scheduled_utc: SCHEDULED_UTC},
  expectedReport: expectedReport(),
  config: {node: process.version, journal_mode: 'wal', busy_timeout_ms_default: DEFAULT_BUSY_TIMEOUT_MS, workers: 'separate OS processes (child_process.fork), one connection each, one shared database file'},
};

// 1. FLAWED: both workers check (absent), barrier releases both, each inserts and commits.
{
  const f = fresh('flawed');
  const r = await runWithBarrier([{db: f, name: 'A', variant: 'flawed'}, {db: f, name: 'B', variant: 'flawed'}]);
  ev.flawed = {events: r.events, workerPids: r.workers.map((w) => w.pid), parentPid: process.pid, results: sorted(r.results), reportRowsForOneRun: rows(f).length, rows: rows(f)};
}

// 2. CORRECTED: same barrier, same stale "absent" check, but UNIQUE + BEGIN IMMEDIATE + targeted ON CONFLICT.
{
  const f = fresh('corrected');
  const r = await runWithBarrier([{db: f, name: 'A', precheck: true}, {db: f, name: 'B', precheck: true}]);
  ev.corrected = {events: r.events, results: sorted(r.results), reportRowsForOneRun: rows(f).length, rows: rows(f), exitCodes: r.exits.map((e) => e.code)};
}

// 3. Failure after insertion, before commit: hard crash (SIGKILL) while the transaction is open, then retry.
{
  const f = fresh('corrected');
  const a = spawnWorker({db: f, name: 'A', fault: 'die-after-insert'});
  await a.waitFor('ready');
  a.child.send({type: 'go'});
  await a.waitFor('inserted');
  const visibleWhileOpen = rows(f).length;
  a.child.send({type: 'continue'});
  const exit = await a.exited;
  const afterCrash = rows(f).length;
  const retry = await runOne({db: f, name: 'A-retry'});
  ev.preCommitFailure = {insertedInsideOpenTransaction: true, rowsVisibleToOtherConnectionWhileOpen: visibleWhileOpen, workerExit: exit, resultMessageFromCrashedWorker: a.result, rowsAfterCrash: afterCrash, retry: sorted(retry.results), rowsAfterRetry: rows(f).length, rows: rows(f)};
  // exception variant (explicit ROLLBACK)
  const g = fresh('corrected');
  const t = await runOne({db: g, name: 'B', fault: 'throw-before-commit'});
  const rowsAfterFailure = rows(g).length;
  const tRetry = await runOne({db: g, name: 'B-retry'});
  ev.exceptionBeforeCommit = {first: sorted(t.results), exitCode: t.exits[0].code, rowsAfterFailure, retry: sorted(tRetry.results), rowsAfterRetry: rows(g).length};
}

// 4. Lock contention: a third connection holds the write lock; the worker has a tiny busy timeout.
{
  const f = fresh('corrected');
  const holder = open(f, 1000);
  holder.exec('BEGIN IMMEDIATE');
  const busy = await runOne({db: f, name: 'A', busyTimeoutMs: 30});
  holder.exec('ROLLBACK');
  holder.close();
  const rowsAfterBusy = rows(f).length;
  const retry = await runOne({db: f, name: 'A-retry'});
  ev.lockContention = {busyTimeoutMs: 30, first: sorted(busy.results), exitCode: busy.exits[0].code, treatedAs: 'retryable database failure (not "already completed")', rowsAfterBusy, retry: sorted(retry.results), rowsAfterRetry: rows(f).length};
}

// 5. A UNIQUE violation from a different constraint (reports.ref).
{
  const f = fresh('corrected');
  const seed = open(f, 1000);
  const rep = expectedReport('2026-03-01T02:00:00Z');
  seed.prepare(`INSERT INTO reports (report_type, scheduled_utc, ref, worker, status, row_count, total_cents, body) VALUES (?, ?, ?, 'old', 'complete', ?, ?, ?)`).run(REPORT_TYPE, '2026-03-01T02:00:00Z', refFor(REPORT_TYPE, SCHEDULED_UTC), rep.row_count, rep.total_cents, JSON.stringify(rep));
  seed.close();
  const r = await runOne({db: f, name: 'A'});
  ev.otherConstraint = {results: sorted(r.results), exitCode: r.exits[0].code, reportRowsForRequestedRun: rows(f).length};
}

// 6. Optional: an in-process Boolean across two processes.
{
  const f = fresh('flawed');
  const r = await runWithBarrier([{db: f, name: 'A', variant: 'boolean'}, {db: f, name: 'B', variant: 'boolean'}]);
  ev.booleanGuard = {localCallsPerProcess: r.results.map((x) => x.localCalls), reportRowsForOneRun: rows(f).length};
}

ev.guarantee = 'One committed database report per logical run (report_type, scheduled_utc). Not exactly-once execution; external effects need their own coordination.';
fs.rmSync(tmp, {recursive: true, force: true});
fs.writeFileSync(path.join(here, 'evidence.json'), JSON.stringify(ev, null, 2) + '\n');
console.log(JSON.stringify({flawedRows: ev.flawed.reportRowsForOneRun, correctedRows: ev.corrected.reportRowsForOneRun, correctedOutcomes: ev.corrected.results.map((r) => r.outcome), midFlightVisible: ev.preCommitFailure.rowsVisibleToOtherConnectionWhileOpen, afterCrash: ev.preCommitFailure.rowsAfterCrash, afterRetry: ev.preCommitFailure.rowsAfterRetry, busy: ev.lockContention.first[0].outcome, otherConstraint: ev.otherConstraint.results[0].outcome, booleanRows: ev.booleanGuard.reportRowsForOneRun}));
