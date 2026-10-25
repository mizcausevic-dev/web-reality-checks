# CM 03: Why Do Websites Do Weird Things? (launch film, package C)

**What it is.** A 55 to 75 second promotional trailer for the general-audience article in `launch/c-weird-websites/`. Narration is about 171 words in seven scenes (hook, problem, method, proof, range, limits, cta). Script: `script.json` (n 103, tag "Launch film", kicker "Official trailer").

## Evidence used
- Real frames and thumbnails from rendered episodes 12 and 15, copied to `video/public/launch/c-*.png` and cropped on screen. Counts "2 attempts, 2 orders" and "2 attempts, 1 order" and "# pass 13 # fail 0" come from `fixtures/ep15-idempotency/evidence.json` and its `node --test` run.
- Conceptual cards for episodes 21, 22 and 24 use values copied from those fixtures' `evidence.json` and carry the label "Conceptual card".
- Scene labels: "FOOTAGE FROM EPISODE 15", "PROMOTIONAL FILM", "CONCEPTUAL ILLUSTRATION".

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs cm03        # from video/public/cm03/narration.mp3, or add --no-audio
node tools/gen-root.mjs
node tools/render.mjs cm03 --concurrency 2
```

## Limits
- Episodes 21, 22 and 24 had no rendered frames when this package was built, so no real footage of them is used.
- Episode 12's lifecycle is a model, not a browser capture, and the film does not claim otherwise.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/cm03/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs cm03 → episodes/cm03/cm03.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 63.37 s, 5299989 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
