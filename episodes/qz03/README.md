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
- The countdown ring shows only during the last 6 s of each `q` scene (`t >= dur - 6`).
- Question 2 is labelled "CONCEPTUAL ILLUSTRATION" because Episode 12's lifecycle is a model, not a browser capture.
- No audio and no video were generated for this package.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/qz03/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs qz03 → episodes/qz03/qz03.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 172.4 s, 13028215 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
