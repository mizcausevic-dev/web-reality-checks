// One scheduled-job worker process. Forked by harness.mjs; never imported.
// argv[2] = JSON config. Talks to the parent over the IPC channel so a TEST-CONTROLLED BARRIER can
// release workers together (no timing luck):
//   worker -> parent  {type:'checked', found}   (flawed / precheck) existence check done, result known
//   worker -> parent  {type:'ready'}            (no pre-check) connection open, nothing else done
//   parent -> worker  {type:'go'}               barrier release
//   worker -> parent  {type:'inserted'}         fault 'die-after-insert' only: row inserted, txn still open
//   parent -> worker  {type:'continue'}         fault 'die-after-insert' only
//   worker -> parent  {type:'result', outcome, ...}
//
// Variants
//   flawed     check-then-insert in autocommit mode, no uniqueness anywhere.
//   corrected  BEGIN IMMEDIATE; INSERT ... ON CONFLICT (report_type, scheduled_utc) DO NOTHING;
//              changes()==0 -> verify the committed report and exit 'already-committed';
//              otherwise compute the report, store the COMPLETE result, COMMIT.
//   boolean    flawed insert guarded only by an in-process Boolean ("I already ran in this process").
//
// Exit codes: 0 done (committed / inserted / already-committed), 3 failed and rolled back,
//             4 constraint violation (not "already completed"), 75 retryable busy (EX_TEMPFAIL).
import {open, computeReport, refFor, isComplete, classify} from './db.mjs';

const cfg = JSON.parse(process.argv[2]);
const {name, variant, reportType, scheduledUtc} = cfg;
const ref = cfg.ref ?? refFor(reportType, scheduledUtc);

const send = (m) => new Promise((res) => (process.send ? process.send({worker: name, pid: process.pid, ...m}, () => res()) : res()));
const expect = (type) => new Promise((res) => {
  const h = (m) => { if (m?.type === type) { process.off('message', h); res(m); } };
  process.on('message', h);
});
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const finish = async (result, code) => { await send({type: 'result', ...result}); process.exit(code); };

const db = open(cfg.db, cfg.busyTimeoutMs);
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM reports WHERE report_type = ? AND scheduled_utc = ?');

// ---- barrier -------------------------------------------------------------------------------------
let stale = null; // result of the autocommit existence check, taken BEFORE the barrier
const goP = expect('go');
if (variant === 'flawed' || cfg.precheck) {
  stale = Number(countStmt.get(reportType, scheduledUtc).n); // autocommit read; nothing is held afterwards
  await send({type: 'checked', found: stale});
} else {
  await send({type: 'ready'});
}
await goP;

const insertComplete = db.prepare(`INSERT INTO reports (report_type, scheduled_utc, ref, worker, status, row_count, total_cents, body) VALUES (?, ?, ?, ?, 'complete', ?, ?, ?)`);

// ---- flawed --------------------------------------------------------------------------------------
if (variant === 'flawed') {
  if (stale === 0) {
    const rep = computeReport(db, scheduledUtc);
    const r = insertComplete.run(reportType, scheduledUtc, ref, name, rep.row_count, rep.total_cents, JSON.stringify(rep)); // autocommit: commits here
    await finish({outcome: 'inserted', changes: r.changes, rowId: Number(r.lastInsertRowid), stale}, 0);
  }
  await finish({outcome: 'skipped-saw-existing', stale}, 0);
}

// ---- in-process Boolean (demonstration of what it cannot do) --------------------------------------
if (variant === 'boolean') {
  let ranInThisProcess = false;
  const job = () => {
    if (ranInThisProcess) return 'skipped-by-boolean';
    ranInThisProcess = true;
    const rep = computeReport(db, scheduledUtc);
    insertComplete.run(reportType, scheduledUtc, ref, name, rep.row_count, rep.total_cents, JSON.stringify(rep));
    return 'inserted';
  };
  const calls = [job(), job()]; // second call in the SAME process is stopped by the flag
  await finish({outcome: calls[0], localCalls: calls}, 0);
}

// ---- corrected -----------------------------------------------------------------------------------
const claim = db.prepare(`INSERT INTO reports (report_type, scheduled_utc, ref, worker, status) VALUES (?, ?, ?, ?, 'pending') ON CONFLICT (report_type, scheduled_utc) DO NOTHING`);
const finalize = db.prepare(`UPDATE reports SET status = 'complete', row_count = ?, total_cents = ?, body = ? WHERE id = ?`);
const existingStmt = db.prepare('SELECT id, worker, status, row_count, total_cents, body FROM reports WHERE report_type = ? AND scheduled_utc = ?');

try {
  db.exec('BEGIN IMMEDIATE'); // take the write lock now; waits up to the bounded busy timeout
  const r = claim.run(reportType, scheduledUtc, ref, name);
  if (r.changes === 0) {
    // Someone else's committed row owns this logical run. Look at it, release the lock, report.
    const existing = existingStmt.get(reportType, scheduledUtc);
    db.exec('ROLLBACK');
    if (existing && isComplete({...existing})) {
      await finish({outcome: 'already-committed', changes: 0, existingId: Number(existing.id), existingWorker: existing.worker, stale}, 0);
    }
    await finish({outcome: 'failed', detail: 'logical run exists but the stored report is not complete', stale}, 3);
  }
  const rowId = Number(r.lastInsertRowid);
  if (cfg.fault === 'die-after-insert') {
    const cont = expect('continue');
    await send({type: 'inserted', rowId}); // row exists only inside this open transaction
    await cont;
    process.kill(process.pid, 'SIGKILL'); // hard crash: no ROLLBACK, no cleanup, no result message
    await new Promise(() => {});
  }
  if (cfg.holdInTxnMs) sleepSync(cfg.holdInTxnMs); // TEST HOOK: widen the window so the other worker really blocks on the lock
  const rep = computeReport(db, scheduledUtc);
  finalize.run(rep.row_count, rep.total_cents, JSON.stringify(rep), rowId);
  if (cfg.fault === 'throw-before-commit') throw new Error('injected failure after insert, before commit');
  db.exec('COMMIT');
  await finish({outcome: 'committed', changes: 1, rowId, stale}, 0);
} catch (err) {
  let rolledBack = false;
  if (db.isTransaction) { try { db.exec('ROLLBACK'); rolledBack = true; } catch { /* connection already unusable */ } }
  const kind = classify(err);
  const base = {errcode: err.errcode ?? null, errstr: err.errstr ?? null, message: err.message, rolledBack, stale};
  if (kind === 'retryable-busy') await finish({outcome: 'retryable-busy', ...base}, 75);
  if (kind === 'constraint-violation') await finish({outcome: 'constraint-violation', ...base}, 4);
  await finish({outcome: 'failed-rolled-back', ...base}, 3);
}
