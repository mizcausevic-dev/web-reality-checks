# EP 08 — Why This Beautiful Website Feels Slow

**Central idea.** Visual polish, loading speed and interaction responsiveness are three different things; an oversized hero image slows the loading timeline and an expensive synchronous click handler slows the interaction timeline, and fixing one does nothing for the other.

## What this fixture is
- `fixtures/ep08-feels-slow/` — two visually equivalent static pages served from a loopback-only Node 22 server (`serve.mjs`, 127.0.0.1, ephemeral port, `Cache-Control: no-store`).
- **before/**: a 4000×2250 lossless PNG hero (12,173,721 bytes) for a 1600 px slot, plus a click handler that does an O(n²) nested scan over a seeded 20,000-item catalogue, synchronously.
- **after/**: the same picture as a 1600×900 WebP (17,004 bytes), plus an O(n) histogram handler with identical output (digest `ec44c9fd`).
- Both images are generated deterministically by `make-assets.mjs` (Python PIL + numpy via `child_process`); no third-party assets. Data is seeded (Mulberry32, seed 8). Synthetic only.
- Deliberate policy: the hero is above the fold and is the expected largest contentful element, so it is **not** lazy-loaded in either variant (`fetchpriority="high"`, intrinsic `width`/`height`).
- Deliberate policy: the repaired handler is still synchronous; the cost is removed by a cheaper algorithm, not hidden by a spinner, timeout or animation.

## Evidence
- Executed: `node --test fixtures/ep08-feels-slow/test.mjs` → `# tests 7  # pass 7  # fail 0` (includes a known-positive control asserting the before handler is slow, > 100 ms, and the after handler is faster with the same digest; asserts no `loading="lazy"` on the hero in either page).
- Executed: `node fixtures/ep08-feels-slow/demo.mjs` → `fixtures/ep08-feels-slow/evidence.json`: hero bytes before **12,173,721** / after **17,004**; handler CPU time in Node, 7 runs each, median before **4253.02 ms** (raw 4299.32 · 4921.91 · 4253.02 · 3555.42 · 3288.51 · 3891.63 · 4488.83) / after **1.40 ms** (raw 9.24 · 1.35 · 1.31 · 29.84 · 1.35 · 1.4 · 21.4); equal outputs `true`. Environment: Node v22.23.4, linux x64, 2 vCPU shared container.
- Label carried by every handler number on screen and in the fixture: **fixture-measured handler CPU time in Node, NOT browser INP**.
- Label carried by every byte figure: file bytes served by the loopback fixture, not a transfer time and not LCP.
- Observed: no LCP figure, no Event Timing figure and no INP figure appear anywhere in the video, because none were measured.
- **Blocked: browser lab measurement (LCP for loading; Event Timing for the scripted click).** No browser was available in this environment. Exact procedure for Miz to run locally, from `fixtures/ep08-feels-slow/test-conditions.md`:
  1. `node fixtures/ep08-feels-slow/make-assets.mjs` once, then `node fixtures/ep08-feels-slow/serve.mjs 4508`.
  2. One browser build (record `chrome://version`), fresh profile or extensions off; same machine on mains power.
  3. Viewport pinned to 1600×900 CSS px, DPR 1.
  4. One CPU throttle for every trial (e.g. DevTools 4×), one network preset for every trial (e.g. Fast 3G); never mixed.
  5. Cold = "Disable cache" on + hard reload per trial. Warm = cache enabled, `no-store` removed from `serve.mjs` for that run (documented deviation), one discarded priming load, then measure. Report cold and warm as separate tables.
  6. Record an initial Performance trace per variant first; confirm the LCP element is the hero `<img>` and the long task on click is inside `relatedCounts` before quoting numbers.
  7. ≥5 trials per variant per condition; report the median; keep every raw value.
  8. LCP via `PerformanceObserver({type:'largest-contentful-paint', buffered:true})`; interaction via `PerformanceObserver({type:'event', durationThreshold:16})` on the single scripted click, reported as a **lab measurement of one scripted interaction**, not a field INP assessment; TBT is not a substitute.
  9. Add results under a `browserLab` key in `evidence.json` with the conditions, then the Blocked lines above become Executed.
- Timeline: `video/src/episodes/ep08/timeline.json` was built with `--no-audio` (word-count estimate, 103.78 s). The orchestrator rebuilds it from real narration; scene boundaries will then snap to detected silences (heuristic, not forced alignment).

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep08      # from video/public/ep08/narration.mp3, or add --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep08 --concurrency 2
```
No MP4, audio or thumbnail is claimed by this README; the orchestrator renders and fills `render-evidence.json`.

## Limitations
- **Nothing in a browser was measured.** Byte size is a file property and Node CPU time is a proxy for the click's main-thread work; neither is a user-perceived latency. The video says so on screen (persistent sim tag `LOCAL FIXTURE · NO BROWSER LAB MEASUREMENT`) and states that loading and interaction are different tests.
- On loopback without throttling even 12 MB arrives in milliseconds; the loading comparison only becomes meaningful under the throttled conditions in `test-conditions.md`.
- The page mock in scene 1 is an illustrative `Box` drawing labelled ILLUSTRATIVE, not a browser capture.
- Raw Node timings vary by roughly ±20 % between runs in the shared container; the median is quoted and the raw list is kept. Re-running `demo.mjs` yields different absolute values; the video quotes the recorded `evidence.json`.
- One image and one handler were corrected. Fonts, CSS, scripts and other interactions were not examined. No claim is made about the page's overall performance.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep08/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep08 → episodes/ep08/ep08.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 103.37 s, 9347719 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
