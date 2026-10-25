# EP 24 — Why Did This Dashboard Show Someone Else's Name?

**Central idea.** A custom shared cache can leak personalised content when its key ignores the identity that changes the response.

## What this fixture is
- `fixtures/ep24-shared-cache-leak/` — a loopback-only (`127.0.0.1`) Node 22 `node:http` dashboard with synthetic users Alice and Bob, a server-side session table, and a **deliberately flawed in-process response cache keyed by `url.pathname` only**. It is application code in the fixture, not a CDN, proxy or browser cache, and not a real incident.
- Flawed route: authenticate, then serve/store the cached payload under `/dashboard`. Alice fills the slot; Bob (correctly authenticated) receives Alice's page.
- Control: the same flawed code **with** `Cache-Control: private, no-store` still leaks, because the custom cache never reads the header.
- Corrected route: bypasses the shared cache; authenticates (401) and authorises (403) every request; renders for the current user; `Cache-Control: private, no-store`; the old entry is explicitly purged (asserted).
- "Isolated browser contexts" are **two independent cookie-jar client instances**, not real browsers. The video panes are plain illustrative `Box` chrome labelled "Illustrative client".
- Deliberate policy: the repair bypasses the shared cache instead of making the key identity-aware.

## Evidence
- Executed: `node --test fixtures/ep24-shared-cache-leak/test.mjs` -> `# tests 18`, `# pass 18`, `# fail 0`.
- Executed: `node fixtures/ep24-shared-cache-leak/demo.mjs` -> `evidence.json`: Alice `200 MISS`; Bob `200 HIT` with viewer `u_alice` (renderSeq 1 for both); header-present variant still `HIT`/`u_alice`; unauthenticated `401`; purge `true` (entries 1 -> 0); retest of four requests all `200 BYPASS`, each viewer only their own id, four distinct renderSeq, shared-cache counters unchanged (reads 2, writes 1).
- Executed: `cd video && npx tsc --noEmit` -> no errors in `src/episodes/ep24/` (other episodes in progress may report their own errors).
- Narration: 237 words across eight scenes.
- Observed: all numbers shown in the video (statuses, `HIT`/`MISS`/`BYPASS`, render numbers, cache counters, purge result, test counts) are copied from `evidence.json` and the test run; they are hard-coded in `Scenes.tsx`, not read at render time.
- Blocked / not executed: no real browser, CDN or proxy.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep24      # from video/public/ep24/narration.mp3, or add --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep24 --concurrency 2
```

## Accuracy bullets and where they appear
- Deliberately flawed application cache, not a CDN incident: narration `leak`; on-screen `fail`, `leak`, `end`.
- Not implying CDNs cache authenticated responses by default: on-screen scope box in `leak`.
- Cache-Control does not repair custom code that ignores it: narration and on-screen `auth` (executed control).
- New headers cannot retract delivered responses: narration and on-screen `verify`.
- `Vary: Cookie` not universal: narration and on-screen `verify`.
- Identity-aware caching needs authorisation, partitioning, invalidation, data classification: on-screen `verify`; narration summarises.
- `no-store` does not remove every historical artifact: on-screen `verify`.
- Synthetic personal information only (`example.test` addresses): on-screen `fail`, `end`.

## Limitations
- The retest uses cookie jars, not browsers; browser cache, service workers and storage partitioning are not exercised. No HTTP caching semantics (RFC 9111) are implemented.
- Only `GET /dashboard` is repaired. No TTL, eviction, concurrency or multi-process behaviour.
- Caption timing in the provisional timeline is a word-count heuristic.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep24/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep24 → episodes/ep24/ep24.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 99.6 s, 8528594 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
