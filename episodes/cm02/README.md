# CM 02: The Launch Review Your Demo Never Shows (launch film, package B)

**What it is.** A 55 to 75 second promotional film for the "launch review" article aimed at founders, product managers and buyers. Narration is 175 words in 8 scenes (`hook`, `problem`, `method`, `proof`, `live`, `range`, `limits`, `cta`). Copy, storyboard and YouTube kit: `launch/b-launch-review/commercial.md`.

## What is real and what is conceptual
- Real product frames (copied into `video/public/launch/`): `b-ep15-dup.png` (Episode 15 `frames/scene_dup.png`), `b-ep17-live.png` (Episode 17 `frames/scene_fail.png`), `b-ep01-thumb.png` (Episode 01 `thumbnail.png`), `b-ep16-fail.png` (Episode 16 `frames/scene_fail.png`). Frames are cropped from the top to hide their baked-in caption strip; their own on-screen labels stay visible.
- Real numbers: 2 attempts and 2 orders (flawed), 2 attempts and 1 order (repaired), from `fixtures/ep15-idempotency/evidence.json`; the ten-minute-old reading is the Episode 17 frame (simulated clock, `fixtures/ep17-stale-dashboard/evidence.json`).
- Conceptual, tagged CONCEPTUAL ILLUSTRATION on screen: `hook`, `problem`, `method`. Tagged PROMOTIONAL FILM: `limits`, `cta`.

## Evidence
- Executed: `node tools/build-timeline.mjs cm02 --no-audio` (estimated 71 s from the word count; replace by building from real narration).
- Executed: `cd video && npx tsc --noEmit` for `src/episodes/cm02/`.
- Observed: stills of scenes `hook`, `problem`, `method`, `proof`, `range`, `cta` were rendered and inspected for clipping during authoring. No video and no audio were rendered.
- Blocked: narration (ElevenLabs), MP4 render, `render-evidence.json`: the orchestrator does these.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs cm02      # needs video/public/cm02/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs cm02 --concurrency 2
```

## Limitations
- The film promotes a way of asking questions. It does not claim that the fixtures describe any real product, and it is not an audit or certification.
- Scene timing is a word-count estimate until real narration exists. Fonts: Inter and DejaVu Sans Mono if installed, otherwise system fallbacks.
