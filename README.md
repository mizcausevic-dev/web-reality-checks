# Web Reality Checks

Short technical explainer videos (about 90–120 s each) where every on-screen result comes from a runnable local fixture with regression tests. Synthetic data only, loopback only, labeled on screen.

Preview gallery: GitHub Pages for this repository (branch `main`, folder `/`) → `index.html`.

Status (2026-10-25): 20 episodes rendered and narrated; independent verification in `VERIFICATION.md`; release copy in `SERIES_RELEASE.md` and each `episodes/epNN/content/`.

## Layout
- `briefs/` producer briefs (global rules + per-episode).
- `fixtures/epNN-slug/` runnable fixture, `test.mjs` (node:test), `demo.mjs` → `evidence.json`.
- `episodes/epNN/` `script.json`, `captions.srt`, `README.md` (evidence + limits), rendered `epNN.mp4`, `thumbnail.png` (1280×720), `hero.png` (1600×900), `frames/` inspection stills, `render-evidence.json`, `content/` (articles + distribution kit).
- `video/` Remotion project. `src/kit` design system; `src/episodes/epNN` scene components + `timeline.json`.
- `tools/` `build-timeline` (aligns scenes to narration), `gen-root`, `render` (render + ffprobe + stills), `qa-stills`, `gen-site`.

## Reproduce one episode
```
cd video && npm install && npx remotion browser ensure
cd .. && node tools/build-timeline.mjs ep01   # or --no-audio for a caption-led silent cut
node tools/gen-root.mjs
node tools/render.mjs ep01 --concurrency 2
```
Narration: ElevenLabs, voice "Benedict - Premium British (RP) Male", model `eleven_v4`, one take per episode; MP3 saved to `video/public/epNN/narration.mp3`.

Evidence vocabulary used throughout: **Observed** (inspected), **Executed** (command ran, output available), **Verified** (acceptance evidence passed), **Predicted** (not yet run), **Blocked**.

© 2026 Kinetic Gain LLC. Code: MIT (see LICENSE). Narration audio and rendered video: all rights reserved.
