# QZ 03: Why Do Websites Do Weird Things? The Five-Question Quiz (package C)

**What it is.** A five-question multiple-choice quiz video for a general audience. Scenes: `hook`, then `q1`/`a1` to `q5`/`a5`, then `close`. Script: `script.json` (n 113, tag "Quiz"), about 351 narrated words. Question and answer sources are listed in `launch/c-weird-websites/quiz.md`.

## Evidence used
Each reveal shows an episode chip and the exact value from a fixture evidence file: Episode 15 `corrected_lost_response.orderCount = 1`; Episode 12 `waiting = build2, active = build1` (model); Episode 24 `flawed.bobGreeting = "Welcome back, Alice"`; Episode 22 flawed New York `2026-01-14, 19:00`; Episode 21 `search_dana_uncached.ids = [c_1003]`. The Episode 15 test run (`# pass 13`) was re-run for this package.

## Build and render
Narration is one text-to-speech take of the scene paragraphs in order, saved as `video/public/qz03/raw.mp3`.
```
cd video && npm install
node tools/build-quiz.mjs qz03            # cuts at silences, inserts 6 s of think time after each q scene
node tools/gen-root.mjs
node tools/render.mjs qz03 --concurrency 2
```

## Limits
- The committed `timeline.json` was generated with `node tools/build-timeline.mjs qz03 --no-audio` only so the project type-checks. It does not include the 6 s think pauses. Rebuild with `build-quiz.mjs` once `raw.mp3` exists.
- The countdown ring shows only during the last 6 s of each `q` scene (`t >= dur - 6`).
- Question 2 is labelled "CONCEPTUAL ILLUSTRATION" because Episode 12's lifecycle is a model, not a browser capture.
- No audio and no video were generated for this package.
