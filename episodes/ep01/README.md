# EP 01 — Your AI-Built App Works. Is It Safe to Launch?

**Central idea.** A polished interface does not establish server-side authorization; one missing ownership condition leaks another user's data.

## What this fixture is
- `fixtures/ep01-authz/` — a loopback-only Node 22 HTTP API with two synthetic users (Alice, Bob), one private project each, an opaque server-side session table, a deliberately vulnerable read endpoint (`GET /vuln/projects/:id`, authenticated-only) and a corrected one (`GET /projects/:id`, scoped by project id **and** owner id).
- Identity comes only from the server-side session; client-supplied user ids (headers, query, body) are ignored by design.
- Deliberate policy: the corrected endpoint returns **404 for both absent and inaccessible** projects so a response cannot confirm that someone else's project id exists.
- The vulnerability was constructed by hand for this fixture. No claim is made that an AI tool generated it.

## Evidence
- Executed: `node --test fixtures/ep01-authz/test.mjs` → `# tests 7  # pass 7  # fail 0` (includes a known-positive control asserting the vulnerable endpoint leaks).
- Executed: `node fixtures/ep01-authz/demo.mjs` → `fixtures/ep01-authz/evidence.json`: unauthenticated 401; Alice→own (vuln) 200; Alice→Bob (vuln) **200**; Alice→own (fixed) 200; Alice→Bob (fixed) 404; Alice→Bob with spoofed `?user=u_bob` + `X-User-Id` (fixed) 404.
- Executed: narration generated with ElevenLabs (voice "Benedict - Premium British (RP) Male", model eleven_v4), 96.2 s, saved to `video/public/ep01/narration.mp3`.
- Executed: `node tools/render.mjs ep01` → see `render-evidence.json` (ffprobe: h264 1920×1080 30 fps yuv420p, AAC 48 kHz; duration 98.8 s).
- Observed: inspection frames in `frames/` reviewed for clipping, overlap and readability.
- Caption timing: scene boundaries are snapped to silences detected in the real narration (`ffmpeg silencedetect`); line-level timing inside a scene is proportional to word count. This is a heuristic alignment, not forced alignment.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep01      # needs video/public/ep01/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep01 --concurrency 2
```
Fonts: the renderer uses Inter and DejaVu Sans Mono if installed; otherwise system fallbacks.

## Limitations
- The repair covers the demonstrated **read** path only. Lists, writes, exports and admin paths each need the same ownership test. The application is not claimed to be fully secure.
- The session mechanism is a test harness (`GET /login/:user`), not production authentication.
- The vulnerable fixture must never be deployed; it binds to 127.0.0.1 on an ephemeral port.

## Launch-review checklist (authorization)
1. Every resource read, list, write, delete and export resolves the user from a server-side session, never from the request.
2. Every object lookup is scoped by owner/tenant in the query itself, not filtered afterwards.
3. A test exists per endpoint where user A requests user B's object and expects 404/403 per policy.
4. A known-positive control exists (a deliberately vulnerable variant that the test catches).
5. Client-side state (roles in the UI, hidden buttons, ids in URLs) is treated as untrusted input.
6. Error responses do not confirm the existence of objects the caller cannot access.
