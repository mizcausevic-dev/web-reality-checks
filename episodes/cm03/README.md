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
- The committed `timeline.json` was generated with `--no-audio` (word-count estimate, about 70 s). The orchestrator rebuilds it from the real narration; scene timings will shift and scene components are written to scale to `dur`.
- No audio and no video were generated for this package. No MP4 exists yet.
- Episodes 21, 22 and 24 had no rendered frames when this package was built, so no real footage of them is used.
- Episode 12's lifecycle is a model, not a browser capture, and the film does not claim otherwise.
