# CM 01: Break It on Purpose (launch film, package A)

**What it is.** A 55 to 75 second trailer for engineers and AI-assisted builders. Idea: a green test only means something if the same test could have gone red (the known-positive control). Written plan: `launch/a-break-it-on-purpose/commercial.md`. Script: `script.json` (157 narrated words, 7 scenes: `hook`, `problem`, `method`, `proof`, `access`, `range`, `cta`).

## Evidence and sources
- Real product frames (copied into `video/public/launch/`, prefix `a-`): `episodes/ep01/frames/scene_retest.png`, `episodes/ep15/frames/scene_fail.png`, `episodes/ep15/frames/scene_retest.png`, and the thumbnails of episodes 01, 15 and 17.
- Numbers shown (2 → 2, 2 → 1, 13 of 13 tests; 200 → 404, 7 of 7 tests; 13, 7 and 12 pass lines) come from `fixtures/ep15-idempotency/evidence.json`, `fixtures/ep01-authz/evidence.json` and the executed `node --test` runs. Executed 2026-10-25: ep15 `# pass 13 # fail 0`, ep01 `# pass 7 # fail 0`, ep17 `# pass 12 # fail 0`.
- Conceptual: the four-panel method scene (`method`, tag CONCEPTUAL ILLUSTRATION). Promotional: the call-to-action card.
- Persistent tag per scene: `FOOTAGE FROM EPISODE NN` where real frames are on screen, `CONCEPTUAL ILLUSTRATION`, or `PROMOTIONAL FILM`.

## Build and render (orchestrator)
```
cd video && npm install
node tools/build-timeline.mjs cm01        # from video/public/cm01/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs cm01 --concurrency 2
```

## Limitations
- `video/src/episodes/cm01/timeline.json` was generated with `--no-audio` (word-count estimate, about 64 s). No narration audio was generated and no MP4 was rendered by the builder; the orchestrator rebuilds the timeline from real narration.
- Real frames are cropped from 1920x1080 stills and scaled; they were not re-rendered.
- The trailer does not claim the repairs cover anything beyond the demonstrated paths.
