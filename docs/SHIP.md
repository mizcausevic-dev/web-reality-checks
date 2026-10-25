# Shipping an episode: one command

```
node tools/ship.mjs --series ../ffmpeg-reality-checks ff01              # tests, narrate, render, collect
node tools/ship.mjs --series ../ffmpeg-reality-checks ff01 --upload     # same, then upload PRIVATE and add to the playlist
node tools/ship.mjs --series ../ffmpeg-reality-checks ff01 --publish --confirm-public   # after you review it in Studio
node tools/ship.mjs --series ../ffmpeg-reality-checks ff01 --stills     # one QA still per scene, no narration, no render
```

Measured on the first run (Windows PC, Remotion render at concurrency 2): tests 1 s, narration 1 call, render 159 s for a
103 s film, upload 9 s. A rerun with unchanged text spends no narration credits.

## What a series repo contains

```
series.json                       name, idPrefix, channel handle, hashtags, playlist title and description, narration voice and model
episodes/<id>/script.json         scenes with narration, captions and a chapter title each
episodes/<id>/fixture/ and test/  the runnable experiment and its tests (the gate: ship stops if they fail)
episodes/<id>/video/Scenes.tsx    the visuals (uses the engine's kit)
episodes/<id>/video/index.tsx
episodes/<id>/content/distribution.md   titles, description, tags, pinned comment, <!-- chapters --> block
```

The engine (this repo) supplies the render kit, fonts, narration (`tools/narrate.mjs`), chapters, and the uploader.

## Guards

- Nothing goes public without `--publish` and `--confirm-public`.
- Every upload checks the token's channel against `series.json` `channel` before sending anything.
- Secrets are read from environment variables only (`ELEVENLABS_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`) and never printed.
- Chapters are generated from the real narration timing (at least three, each at least 10 s) and written between the `<!-- chapters:start -->` markers.

## Known limits

- The pinned comment is printed, not posted: the YouTube API cannot pin comments.
- In OAuth Testing status the refresh token expires after 7 days; rerun `--auth --store-token`.
- Captions upload (`--captions`) costs 400 quota units per film and is not part of `ship`.
