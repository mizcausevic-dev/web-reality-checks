# EP30 fixture — a scheduled job that runs twice

Two real, independent worker processes (`child_process.fork` of `worker.mjs`), each with its own
`node:sqlite` connection, share one SQLite database file. The logical run is
`(report_type, scheduled_utc)`. The "report" is a small aggregate computed from synthetic
`sales_source` rows and stored in the same database. No email, no external file, no network, no
third-party action.

## Files
- `db.mjs` — schema (flawed and corrected variants), seeded source rows, report computation, error classification.
- `worker.mjs` — one worker process. Variants: `flawed`, `corrected`, `boolean`. Fault hooks for tests.
- `harness.mjs` — parent-side fork helper and the **explicit barrier** (workers report `checked`/`ready`
  over IPC; only when every worker has reported does the parent send `go`). No sleeps decide the interleaving.
- `test.mjs`, `demo.mjs` (writes `evidence.json`).

## Run
```
node --test fixtures/ep30-scheduled-job-twice/test.mjs
node fixtures/ep30-scheduled-job-twice/demo.mjs      # writes evidence.json
```
Node 22 prints an `ExperimentalWarning` for `node:sqlite`; this is expected. Tests use `os.tmpdir()` for
their database files and delete them afterwards.

## Design decisions
- **Journal mode: WAL.** Readers do not block the writer and vice versa, so a test connection can observe
  committed state while a worker holds the write lock. Writers still serialise: one write lock at a time.
- **Bounded busy timeout.** Every connection is opened with the supported `timeout` option (verified
  equal to `PRAGMA busy_timeout` on this Node). Default 5000 ms; lock-contention tests use 30 ms.
- **Scheduled instants are UTC strings** ending in `Z` (`2026-03-02T02:00:00Z`); `windowFor()` rejects anything else.
  The report covers the 24 h before the instant, end exclusive; two source rows deliberately fall outside it.
- **Flawed:** `reports` has no uniqueness on the logical run. Each worker does an autocommit
  `SELECT COUNT(*)`, reports `absent`, waits at the barrier, then computes and `INSERT`s a complete row in
  autocommit mode. The busy timeout absorbs the short write contention so both inserts commit.
- **Corrected:** `UNIQUE (report_type, scheduled_utc)`. Each worker runs `BEGIN IMMEDIATE`, then
  `INSERT … ON CONFLICT (report_type, scheduled_utc) DO NOTHING` (targeted at the logical-run constraint).
  - `changes() == 0` → read the existing row, `ROLLBACK` (nothing to write), confirm it is `complete`, exit `already-committed`.
  - otherwise compute the report from the source rows, `UPDATE` the row to `complete` with the full result, `COMMIT`.
  - The claim row inserted at the start is `pending` with NULL result columns **inside the open transaction only**.
    It is never committed in that state: a crash or error rolls it back; tests check every committed row is `complete`.
- **Targeted conflict clause on purpose.** `reports.ref` is a second, unrelated UNIQUE column. Because the
  conflict target names only the logical-run constraint, a violation of `ref` still raises, and the worker reports
  `constraint-violation`, never `already-committed`. (`INSERT OR IGNORE` would have hidden it.)
- **Exhausted lock wait = retryable database failure.** `SQLITE_BUSY` (errcode 5, any extended code) after the
  bounded wait → outcome `retryable-busy`, exit code 75, no row written. It says nothing about whether another
  worker finished (one test holds the write lock *while completing the same run*, and the busy worker still must not say "already completed").
- Exit codes: 0 done, 3 failed and rolled back, 4 constraint violation, 75 retryable busy; a killed worker has signal `SIGKILL` and sends nothing.
- `holdInTxnMs` is a **test hook** that holds the winner's transaction briefly so the other worker is likely to
  block on the lock. Real report generation here is short and database-local; the transaction is never held around slow external work.

## Guarantee (and what it is not)
**One committed database report per logical run.** This is *not* exactly-once execution: both workers still run,
and a worker can run its code and do nothing. Anything outside the database (email, files, API calls) is outside this
transaction and needs its own coordination (its own idempotency key, outbox, or lease). A UNIQUE constraint does not
retry anything by itself; retry is the scheduler's/operator's job after `retryable-busy` or a crash.

## Tests (17)
Oracle and UTC checks; WAL + busy timeout; schema control (no UNIQUE vs UNIQUE); **known-positive control** (coordinated
race on the flawed schema → 2 committed rows, barrier order asserted); corrected race with stale `absent` checks (5 rounds,
either worker may win); corrected race with a widened hold window (3 rounds); re-run after completion; independent runs;
pre-commit failure by `SIGKILL` (row invisible to another connection, still 0 after the kill, lock freed, retry commits one);
pre-commit failure by exception (explicit rollback, retry commits one); lock contention via a third connection holding the
write lock (tiny timeout → retryable, 0 rows, retry commits); lock contention while the holder completes the same run;
different-constraint UNIQUE violation; error classification; in-process Boolean demonstration; completeness invariant.

## Executed
```
$ node --test fixtures/ep30-scheduled-job-twice/test.mjs      (run 3 times in a row, plus 6 in parallel; no failures)
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
`node demo.mjs` → `evidence.json` (values below are from the last run; which worker wins varies run to run):

| scenario | observed |
|---|---|
| flawed, both `absent`, barrier, both insert | **2** rows for one run, both complete |
| corrected, same stale check and barrier | **1** row; outcomes `committed` + `already-committed` |
| corrected, worker SIGKILLed after insert, before commit | 0 rows visible while open, 0 after the kill, **1** after retry |
| corrected, exception before commit | `failed-rolled-back` (exit 3), 0 rows, **1** after retry |
| 30 ms busy timeout, third connection holds write lock | `retryable-busy` (errcode 5, exit 75), 0 rows; retry commits 1 |
| different UNIQUE constraint (`reports.ref`) | `constraint-violation` (errcode 2067, exit 4), 0 rows for the run |
| in-process Boolean, two processes | each process skipped its own repeat, **2** rows |

Report content for every committed row: 7 source rows, 12325 cents total (`east 2500, north 2050, south 4575, west 3200`).

## Limitations / NOT tested
- Not a scheduler. Nothing here claims any particular scheduler fires twice, or how often; two invocations are simply forced.
- Single machine, local file, WAL mode. Network filesystems, other journal modes, and other databases (different locking and isolation) are not tested.
- The lock-hold hook and the `SIGKILL` fault are controlled test devices, not measurements of real crash or timing behaviour. No timings are claimed.
- Which of two workers wins is not controlled; tests accept either order.
- No lease/heartbeat, no retry scheduler, no expiry of old reports. External side effects are not modelled.
- `PRAGMA synchronous`/power-loss durability is not tested.
