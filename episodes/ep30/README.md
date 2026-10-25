# EP 30 — Your Scheduled Job Ran Twice. Was the Scheduler Wrong?

**Central idea.** Two invocations can target the same logical job; the application must coordinate which result is committed.

## What this fixture is
- `fixtures/ep30-scheduled-job-twice/` — two real worker processes (separate SQLite connections) share one WAL-mode database file. Logical run = report type + scheduled UTC instant. Reports are small aggregates of synthetic source rows stored in the same database. No emails, external files or third-party actions.
- Flawed: no UNIQUE on the logical run; autocommit check-then-insert; a test-controlled IPC barrier releases both workers after both checks say "absent"; the busy timeout lets both inserts commit → 2 rows.
- Corrected: `UNIQUE (report_type, scheduled_utc)`; `BEGIN IMMEDIATE`; `INSERT … ON CONFLICT (report_type, scheduled_utc) DO NOTHING`; `changes() == 0` → verify the committed report and exit; otherwise compute, store the complete result, commit. No incomplete placeholder is ever committed.
- Deliberate policies: exhausted busy timeout is a retryable database failure (exit 75), not "already completed"; a UNIQUE violation from another constraint (`reports.ref`) is a real error, not "already completed".

## Evidence
- Executed: `node --test fixtures/ep30-scheduled-job-twice/test.mjs` → `# tests 17  # pass 17  # fail 0` (3 consecutive runs, plus 6 parallel runs, all green; includes a known-positive control for the flaw).
- Executed: `node fixtures/ep30-scheduled-job-twice/demo.mjs` → `evidence.json`: flawed 2 rows; corrected 1 row (`committed` + `already-committed`); SIGKILL after insert → 0 rows visible while open, 0 after, 1 after retry; 30 ms busy timeout with a third connection holding the write lock → `retryable-busy`, 0 rows; `reports.ref` violation → `constraint-violation`, 0 rows; in-process Boolean across two processes → 2 rows.
- Observed: numbers on screen (2 rows, 1 row, 7 source rows / 12325 cents) are copied from `evidence.json`. Which worker wins varies per run, so the video does not name a winner.

## Accuracy checklist (from the brief)
- Not exactly-once execution: stated in the final scene and in the fixture README.
- Demonstrated guarantee: one committed database report per logical run.
- A unique constraint does not retry by itself: on-screen in "key" and "end".
- In-process Boolean cannot coordinate processes: narration and on-screen in "end" (tested: 2 rows).
- Not every violation is "already completed": narration and on-screen in "key" and "retry".
- Report generation short and database-local; no transaction around slow external work: on-screen in "key" and "end".
- External effects need coordination beyond this fixture: narration and on-screen in "end".
- Scheduled instants are UTC strings: on-screen in "key"; enforced by `windowFor()`.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep30    # from narration audio in video/public/ep30/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep30 --concurrency 2
```

## Limitations
- Simulated vs measured: workers, locks, rollbacks and row counts are real SQLite behaviour on one machine; the fault (SIGKILL) and the lock hold are injected by the test, and the scene diagrams are illustrative.
- WAL mode, local file, one database. Other journal modes, network filesystems and other databases are not tested. No timing claims.
- The video does not claim any specific scheduler duplicates runs; it forces two invocations.
- Scope of the fix: one committed row per logical run. Retry scheduling, leases and external side-effect coordination are out of scope.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep30/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep30 → episodes/ep30/ep30.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 105.67 s, 8385850 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
