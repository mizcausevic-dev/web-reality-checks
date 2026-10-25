# EP 21 — I Deleted the Record. Why Is It Still Showing Up?

**Central idea.** Deleting a primary record does not automatically remove derived copies from a search index, an application cache, or an already-open browser; deletion is a workflow when data has more than one home.

## What this fixture is
- `fixtures/ep21-deletion-copies/` — a loopback-only Node 22 synthetic contact directory: a primary `contacts` table, a separate denormalised `search_index` table, a deliberately implemented in-process response cache, an `outbox` table and an in-process cleanup worker. One stable, never-reused contact ID (`c_1003`) is followed through every layer.
- Flawed variant: `DELETE /vuln/contacts/:id` deletes the primary row only. Corrected variant: `DELETE /contacts/:id` deletes the row and inserts an outbox event in one transaction; the worker removes the index entry, clears the **whole** directory cache, and marks the event processed only after both steps succeed.
- The "already-open browser" is **SIMULATED CLIENT STATE**: a plain object holding previously fetched results (`client.mjs`). No real browser was used. Scenes that show it carry that tag.
- Deliberate policies: whole-cache invalidation (no dependency tracking); retries exhausted → explicit `failed` state plus an alert record, never silently processed; AUTOINCREMENT ids are not reused.

## Evidence
- Executed: `node --test fixtures/ep21-deletion-copies/test.mjs` → `# tests 20`, `# pass 20`, `# fail 0` (deletion, partial-failure, retry, replay, retries-exhausted, stale-browser, id-reuse and atomicity tests, plus known-positive controls).
- Executed: `node fixtures/ep21-deletion-copies/demo.mjs` → `evidence.json`: flawed delete leaves lookup 404 but cached search → `c_1003, c_1004` and the index row present with 0 outbox events; corrected run: attempt 1 pending (attempts 1, stepsDone `[search_index]`), attempt 2 processed (attempts 2); simulated browser refresh `harbourline` → `[c_1004]`; replay ×2 leaves state unchanged and the next new contact is `c_1006`; retries exhausted after 3 attempts → `failed` and 1 alert.
- Observed: numbers on screen are copied from `evidence.json`.
- Predicted / Blocked: no real browser behaviour (HTTP cache, service workers, multiple tabs) was executed.
- Executed: `cd video && npx tsc --noEmit` passes.

## Accuracy items covered
- Outbox records cleanup intent; it does not make all destinations update atomically (narration, `fix_outbox` on-screen limit box).
- A stale browser display can remain after backend cleanup (`refresh` scene, sim-tagged).
- Retries exhausted: explicit failed state and alert, never silently processed (narration + `retry` scene).
- A directory cache may expose stale data until invalidation succeeds (`partial_fail`; also a refresh during failure still returns the stale hit).
- Not a privacy-erasure implementation; backups, logs, exports and third-party copies are out of scope; deletion cannot retrieve already-downloaded information (narration + `end` scene).
- Deleted IDs are not reused (`c_1003` stays retired; the next contact is `c_1006`).

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep21    # from narration audio in video/public/ep21/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep21 --concurrency 2
```

## Limitations
- Simulated: the browser (client state object), the search index (SQLite table, same process), the cache (in-process Map), the alert (in-process record). Measured: only what the local fixture returned.
- Not tested: concurrent workers, real process crashes, cache re-population races, retry backoff, real alert delivery, real browser caching.
- Whole-cache invalidation is a fixture simplification, not a recommended general design.
- Narration is 257 words across nine scenes (script.json).

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep21/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep21 → episodes/ep21/ep21.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 105.03 s, 8838635 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
