# EP 17 — Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.

**Central idea.** A newly received response can contain an old measurement: response freshness and measurement freshness are two different numbers, and a "Live" label reports only the first.

## What this fixture is
- `fixtures/ep17-stale-dashboard/` — a four-stage synthetic telemetry pipeline (source → collector → API → dashboard) in plain Node 22 ESM with zero dependencies, no sockets and no `Date.now()`. Every stage reads one shared clock (`clock.mjs`) that is advanced explicitly in one-second steps; "ten simulated minutes" is 600 steps, not 600 seconds of waiting. Hence the persistent on-screen tag **SIMULATED PIPELINE · COMPRESSED CLOCK**.
- Each reading carries `sourceObservedAt`, `collectedAt`, `servedAt` and `value`. No stage rewrites another stage's stamp.
- Collector samples the source every **600 s**; dashboard polls the API every **30 s**.
- `state-rules.mjs` is a pure function: measurement age = now − `sourceObservedAt` (never poll time, never reset by an arriving response); connection = outcome and recency of the last poll; `freshness ∈ {fresh, stale, unknown}`; explicit warning text.
- **Deliberate policy:** `STALE_THRESHOLD_SECONDS = 300` is this fixture's product choice. Ten-minute-old data is not unacceptable for every use case; a daily report or a slow sensor could set hours.
- **Deliberate policy:** a failed poll keeps the last known value with a warning (`Last poll failed (503 …); showing last known value.`). No current reading is fabricated.
- **Deliberate policy:** negative ages are never displayed; a `sourceObservedAt` in the future is flagged `impossible-future` (`freshness: unknown`, age `null`). Missing or unparseable timestamps → `invalid-timestamp`, `freshness: unknown`.
- The naive "Live · updated 0 s ago" label (`naiveStatus()`) is kept only as a known-positive control that the tests assert is misleading.

## Evidence
- Executed: `node --test fixtures/ep17-stale-dashboard/test.mjs` → `# tests 12  # pass 12  # fail 0` (healthy, collector failure, API failure before/after a reading, future timestamp, invalid/missing timestamps, polling-faster control, threshold boundary, connection window, monotonic clock).
- Executed: `node fixtures/ep17-stale-dashboard/demo.mjs` → `fixtures/ep17-stale-dashboard/evidence.json`:
  - Healthy: 19 polls before the next collection, all HTTP 200, naive label `Live · 0 s ago` on every one; measurement age climbs 30 → 570 s; `stale` by policy from sim t=330; at t=600 the collector samples again (21.2 → 22.8) and age drops to 0.
  - Collector failure: 2 failed collections (t=600, t=1200); API still 200 with the t=0 reading; at t=1200 `connection: connected`, `freshness: stale`, `measurementAgeSeconds: 1200`, naive label still `Live`.
  - API failure: 2 failed polls (503 at t=90, t=120); value 21.2 retained with explicit warning; `connection: disconnected`; age continues from `sourceObservedAt` (120 s at t=120); recovery poll at t=150 → 200, connected, same `collectedAt`, age 150.
  - Polling faster: 5 s vs 30 s polling over 599 s → 119 vs 19 polls, collector sampled exactly once in both, identical age (570 s) at t=570.
  - Timestamp checks: +45 s future → `impossible-future`, age `null`; missing / `"yesterday-ish"` → `invalid-timestamp`, age `null`.
- Executed: `node tools/build-timeline.mjs ep17 --no-audio` → `video/src/episodes/ep17/timeline.json` (estimated 102.21 s from 254 narration words) and `episodes/ep17/captions.srt`. These are placeholders until the orchestrator supplies narration audio and rebuilds.
- Executed: `cd video && npx tsc --noEmit` → no errors in `src/episodes/ep17/*`. (Pre-existing errors in other episodes' folders were not touched.)
- Predicted: narration ~254 words ≈ 100 s of speech; final scene timing depends on the real audio.
- Blocked: no narration audio generated, no MP4 rendered, no QA stills rendered (orchestrator step; also `video/src/Root.tsx` currently references episodes whose `Scenes.tsx` is missing, so a bundle would not build until those land).
- Not executed: a WebSocket/SSE variant. The claim "a push transport delivers the same stale upstream reading sooner" is stated as reasoning, not demonstrated by this fixture.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep17    # from narration audio in video/public/ep17/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep17 --concurrency 2
```

## Scenes (script.json)
`fail` → `timelines` → `poll_ok` → `compare` → `fix` → `advance` → `age_grows` → `failures` → `end`. All content scenes carry `sim: "SIMULATED PIPELINE · COMPRESSED CLOCK"`; the end card has `sim: null`. Every number on screen (21.2, 22.8, 19 polls, 330 s, 570 s, 1200 s, 503, 119 vs 19) is copied from `evidence.json`.

## Limitations
- **One shared clock.** Real sources, collectors, APIs and browsers each have their own clock; skew, drift and timezone errors between them are a real cause of wrong ages (including apparent negative ones) and are **not modelled**. The `impossible-future` flag exists because production code must expect them.
- No sockets, no HTTP, no real browser: the API and dashboard are in-process objects and status codes are simulated values. The on-screen panel is illustrative chrome, not any real product.
- Polling faster does not make the collector sample faster (demonstrated). WebSockets do not fix a stale upstream measurement by themselves (stated, not implemented).
- The stale threshold (300 s) and connection window (90 s) are this fixture's policies, not universal values.
- Not tested: partial/garbled responses, clock skew, retries/backoff, multiple sources, aggregation windows.
