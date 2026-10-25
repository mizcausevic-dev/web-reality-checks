# EP 27 — You Typed 'React.' Why Did Results for 'Re' Come Back?

**Central idea.** Responses can arrive out of order; an older response can overwrite newer search state unless the client checks which request is current.

## What this fixture is
- `fixtures/ep27-stale-search-responses/` — a **simulated controller**: a framework-free state machine (query, results, error, loading, generation) driven by a mock API whose responses are released one by one by the test. Every scene carries the persistent tag `SIMULATED CONTROLLER · NOT BROWSER EVIDENCE`. No browser, DOM, framework, network, or timer was involved.
- Flawed variant renders every arriving response (known-positive control: results for `re` overwrite results for `react`). Corrected variant uses a request-generation guard in the success, error and finally paths; `clear()` and `dispose()` invalidate pending generations; superseded requests can optionally be aborted.
- Deliberate policies: abort is an optimisation and the final state is identical without it; an `AbortError` is never shown as a user-facing error; the guard uses its own local counter, not server request ids.

## Evidence
- Executed: `node --test fixtures/ep27-stale-search-responses/test.mjs` → `# tests 22`, `# pass 22`, `# fail 0`.
- Executed: `node fixtures/ep27-stale-search-responses/demo.mjs` → `evidence.json` with five scenarios (stale success, stale failure, loading, cleared, disposed), each with the exact release schedule and flawed/corrected state timelines, plus an abort comparison. Key values shown in the video: flawed final = query `react` with results for `re`; corrected final = results for `react`, discards `success, finally`; stale failure → flawed error `network error (simulated)`, corrected none and discards `error, finally`; loading → flawed `false`, corrected `true`; cleared → flawed shows results for `re`, corrected none; disposed → 2 writes after dispose (flawed) vs 0 (corrected); final state identical with and without abort.
- Executed: `cd video && npx tsc --noEmit` → no errors.
- Executed: `node tools/build-timeline.mjs ep27 --no-audio` → provisional `timeline.json` and `captions.srt` (word-count estimate, to be rebuilt from real narration).
- Predicted: how a browser UI framework would behave with this logic follows from the state machine; it was not run in a browser.
- Blocked: no narration audio, no render (orchestrator fills `render-evidence.json`). No MP4 is claimed.

## Accuracy bullets
- Guard applied in success, error and finally paths (scenes `guard`, `discard`, `failure`).
- An older finally cannot clear the current loading state (`discard`, variant panel).
- Aborted obsolete requests are not shown as user-facing errors; abort is an optimisation, not the only correctness mechanism (`paths`; tests).
- Aborting a browser request does not prove server execution stopped (`paths`; narration).
- Debouncing alone does not guarantee response order (`paths`; narration).
- Server request ids are not assumed to be globally ordered (`guard`, `end`; test with unordered opaque ids).
- Local UI concurrency control, not a general distributed-ordering solution (`end`).
- Scene `paths` is an addition to the brief's eight scenes; it carries clear, dispose, abort and debounce.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep27      # needs video/public/ep27/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep27 --concurrency 2
```

## Limitations
- Entirely simulated: the controller and mock API are not a recording of a real browser or server. The search UI drawn in the video is a plain illustrative box.
- Not tested: real fetch/abort semantics, server behaviour, framework lifecycles, retries, caching.
- Caption/scene timing in the provisional timeline is a word-count heuristic; the orchestrator re-aligns to real audio.
