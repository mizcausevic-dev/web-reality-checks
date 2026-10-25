# EP30 distribution kit: Your Scheduled Job Ran Twice. Was the Scheduler Wrong?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep30-scheduled-job-twice/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Scheduled Job Ran Twice. Was the Scheduler Wrong?` : the series title; it asks the question the viewer is already asking and answers it with "not necessarily."
2. `Two Workers, One Report Run, Two Rows in the Database` : concrete scene from the fixture; the row count is the hook for engineers.
3. `Why Your Cron Job Ran Twice (and the Fix)` : matches the search phrase people type when they hit this bug.
4. `A Boolean Flag Cannot Stop a Duplicate Job` : states a tested result (2 rows across two processes) as a thesis.
5. `Check-Then-Insert Is a Race. Use a Unique Key.` : short, direct, centers the repair for developers.
6. `Why You Got the Same Report Twice` : for general viewers; the duplicate output is the familiar symptom.

### Description

Two reports for one scheduled run. The scheduler may be fine: the app committed both. Here is the race, and the repair.

In this episode two real worker processes, each with its own connection to one shared SQLite database, are started for the same logical run: daily_sales at 2026-03-02T02:00:00Z. Each checks whether the report exists and sees nothing. A test barrier releases both, and both commit. The database holds 2 reports for one run.

The repair is a unique key on report type and scheduled UTC instant, inside an immediate write transaction. Zero changes means the run exists, so the worker verifies it and exits. A busy lock is a retryable failure, not proof anyone finished. A violation of a different constraint is a real error. With the same stale check and barrier, the corrected version commits 1 report (outcomes: committed and already-committed).

We also kill a worker after its insert but before the commit: 0 rows visible, 0 after the kill, 1 after a retry. The suite runs 17 tests, 17 pass, including a known-positive control for the flaw. An in-process Boolean across two processes still left 2 rows.

What this does not fix: the guarantee is one committed database report per logical run, not exactly-once execution. Outside effects such as email need their own coordination, and the fix does not retry anything by itself.

Chapters
00:00 Two reports for one scheduled run
00:10 Two processes pass the same stale check
00:22 The repair: a unique key on the logical run
00:38 Rerun with the same barrier
00:49 One worker commits, one verifies
01:01 Killed before commit: nothing visible
01:12 Rollback, retry, and busy is not done
01:25 What the guarantee is and is not

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep30/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

scheduled job ran twice, duplicate scheduled job, cron job duplicate, idempotency, race condition, check-then-insert, unique constraint, sqlite, node.js, BEGIN IMMEDIATE, database transactions, WAL mode, busy timeout, background jobs, job scheduling, backend development, reliability engineering, known-positive control, software testing, web reality checks

### Pinned comment (≤ 300 chars)

A deliberately built local fixture with synthetic data. It forces two invocations and does not claim any real scheduler duplicates runs. Guarantee: one committed report per logical run, not exactly-once. Fixture, 17 tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Two workers. One scheduled run. Two committed reports. The database had no rule against it.

Episode 30 of Web Reality Checks. Two real processes, each with its own SQLite connection, run check-then-insert for one logical run. Both checks say absent. A barrier releases both. Both commit: 2 rows (local synthetic fixture).

The repair:

1. UNIQUE (report_type, scheduled_utc), so the schema names the logical run.
2. BEGIN IMMEDIATE, then INSERT ... ON CONFLICT (report_type, scheduled_utc) DO NOTHING. Target the constraint on purpose: a violation of reports.ref still raises as a real error.
3. changes() == 0: verify the report and exit. Lock timeout: retryable, 0 rows, not "already completed."

Same stale check, same barrier: 1 row. Kill a worker after insert, before commit: 0 rows visible, 0 after, 1 after retry. An in-process Boolean across two processes: still 2 rows.

17 tests, 17 pass, including a known-positive control that proves the flaw is observable.

Scope: one committed database report per logical run, not exactly-once execution. Email and other outside effects need their own idempotency key, outbox or lease. WAL mode, one local file.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#SoftwareEngineering #SQLite #Reliability

### Post 2: non-technical leaders

The same report landed twice. Everyone blamed the scheduler. Did anyone check what the application does when a job starts twice?

Episode 30 of Web Reality Checks. A demo starts a job once, so it works. The duplicate only appears when two copies start for the same run at the same moment, and nobody demos that.

On a local fixture with synthetic data, two copies of a report job each checked for an existing report, found none, and both saved one. Result: 2 reports for one scheduled run. After the fix: 1.

Think of two clerks who each check an empty filing cabinet, then each file a folder. The fix is a labeled slot that refuses a second folder, enforced in the shared cabinet, not in any clerk's head.

Five questions for your team or vendor:
1. What is the "logical run" for each scheduled job, and where is it enforced?
2. If the job starts twice at once, what is committed? Show the test.
3. Is there a deliberately broken version the tests catch?
4. If a worker dies or cannot get a lock, what is left behind and who retries?
5. Which outside effects, like email, are guarded separately?

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Reliability #Leadership

## X/Twitter thread

1/ One scheduled instant. Two reports in the database. The scheduler may be fine: two invocations reached one logical job and the application committed both. Episode 30 of Web Reality Checks. Thread.

2/ Setup: two real worker processes, two SQLite connections, one shared file. Each checks "does this report exist?" and sees nothing. A test barrier releases both. Both insert and commit. Result: 2 rows for one run (local synthetic fixture).

3/ Why both commit: the check was a read that held nothing, so "absent" was stale at insert time. Writers serialize on one write lock, but the second just waits out the busy timeout and then commits. No constraint said it was a duplicate.

4/ The repair: UNIQUE (report_type, scheduled_utc), BEGIN IMMEDIATE, INSERT ... ON CONFLICT on that target DO NOTHING. changes() == 0 means the run exists: verify it and exit. Same barrier, same stale check: 1 row.

5/ Failure cases, all tested: killed after insert, before commit: 0 rows visible, 0 after, 1 after retry. Lock timeout: retryable, 0 rows, not "done." Different constraint (reports.ref): real error. In-process Boolean across two processes: still 2 rows.

6/ 17 tests, 17 pass, including a known-positive control that asserts the flawed schema commits two reports. If the race cannot be made to fail, a green fix proves nothing.

7/ Scope: one committed database report per logical run, not exactly-once execution. Email and outside effects need their own coordination. Nothing here claims a real scheduler duplicates runs. WAL mode, one local file.

8/ Scheduling starts work. Coordination decides what commits. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A SQLite fixture where two worker processes commit duplicate reports for one scheduled run, and the UNIQUE plus BEGIN IMMEDIATE fix

**First comment:** This is a deliberately constructed local fixture with synthetic data: two forked Node processes share one WAL-mode SQLite file, and a test barrier forces both to pass a stale existence check, so it is not a finding about any real scheduler. The corrected path uses a UNIQUE constraint on the logical run with a targeted ON CONFLICT clause, and the guarantee is one committed database report per logical run, not exactly-once execution. The suite is 17 tests including a known-positive control, and the limits (one machine, WAL only, no retry scheduler, outside effects not modeled) are in the README.

## Short-form hook lines (≤ 12 words)

1. One scheduled run. Two committed reports. No crash, no error.
2. Both workers checked. Both saw nothing. Both committed.
3. A Boolean flag cannot coordinate two processes.
4. A busy lock does not mean someone else finished.
5. Scheduling starts work. Coordination decides what commits.

## Alt text

**hero.png:** Diagram of one scheduled instant, daily_sales at 2026-03-02T02:00:00Z, feeding two invocations that each write to a reports table with no unique rule on the logical run; the table shows two complete rows and a counter reading 2, captioned "Same run, committed twice."

**thumbnail.png:** Episode thumbnail for "Your Scheduled Job Ran Twice. Was the Scheduler Wrong?" showing two worker processes both writing a report row for the same scheduled run, with a count of 2 in red and a unique key icon marking the repair.
