# EP 23 - Two Tabs. One Document. Where Did My Changes Go?

**Central idea.** Two editors can load the same version and silently overwrite each other if the server accepts unconditional updates; sending `expectedVersion` and applying it in one atomic conditional UPDATE turns the silent loss into a detectable 409.

## What this fixture is
- `fixtures/ep23-optimistic-concurrency/` - a loopback-only Node 22 document service (`node:http`, `node:sqlite`, zero dependencies) with a flawed unconditional save and a corrected `UPDATE ... WHERE id = ? AND version = ?` save (`changes()` decides).
- "Two tabs" = **two independent client instances in Node** with separate sessions and local copies. No real browser was used; the video labels scenes `SIMULATED LOCAL FIXTURE` and says so on screen (scene `rewind`).
- Deliberate policies: 409 only for a version mismatch; 503 for a locked database; 500 for other database failures; 404 for absent or non-member documents (authorization checked first, separately); the client preserves unsaved text, shows the current server version, never retries by overwriting, and never merges automatically.

## Evidence
- Executed: `node --test fixtures/ep23-optimistic-concurrency/test.mjs` -> `# tests 16  # pass 16  # fail 0` (includes a known-positive control, an HTTP barrier test and a six-thread/six-connection barrier test asserting exactly one accepted update).
- Executed: `node fixtures/ep23-optimistic-concurrency/demo.mjs` -> `evidence.json`: flawed path A 200 (v2) then B 200 (v3), final title back to "Launch plan"; corrected path A 200 (v2), B 409 with `currentVersion` 2, server final v2, B sent one PUT; explicit person-chosen merge saved with `expectedVersion` 2 -> 200 (v3); concurrent same-version saves -> one 200 and one 409; locked database -> 503, not 409, server still v1.
- Executed: `cd video && npx tsc --noEmit` -> no errors in `src/episodes/ep23/` (an unrelated error in another episode folder may be present while that episode is being built).
- Executed: `node tools/build-timeline.mjs ep23 --no-audio` -> provisional `timeline.json` / `captions.srt` from a word-count estimate; the orchestrator rebuilds them from real narration.
- Narration: 250 words (`script.json`).
- Blocked / not executed: no real browsers, no narration audio, no render (the orchestrator fills `render-evidence.json`). Scene frames were not visually inspected by this builder.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep23      # from narration audio in video/public/ep23/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep23 --concurrency 2
```

## Accuracy bullets (where each is reflected)
- Check is not a separate unprotected read and write: scene `fix` (single statement, "NOT THIS" box); narration "Never a read followed by a write".
- Version conflicts vs database lock failures: scene `limits` (409 vs 503, observed 503 with server still v1); narration.
- Not every database error is 409: scene `limits` (500 note); fixture test `only a version mismatch yields 409`.
- Detects conflicts, not real-time collaboration; not a CRDT or operational transformation: scene `limits`, narration.
- Document ID and user authorization checked separately: scene `fix` gate (401 / 404 before the version), scene `limits`.
- Unsaved edits not discarded on conflict; current server version offered; explicit resolution; no overwrite retry: scenes `retest`, `compare`, narration.

## Limitations
- Simulated: the "tabs" are Node client objects; the conflict screen in scene `compare` is an illustration of the client state the fixture holds, not a real UI.
- Measured: only status codes, versions and document text shown in `evidence.json`; no timings are claimed.
- Scope: one integer version per whole document; no field-level merge, history, or deletion. The cross-thread test uses SQLite rollback-journal mode only.
