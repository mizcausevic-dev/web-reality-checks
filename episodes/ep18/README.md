# EP 18 — Your Webhook Arrived Twice. Then an Older Update Arrived.

**Central idea.** A webhook receiver must not assume that each event is delivered once or that arrival order matches the order the resource actually changed.

## What this fixture is
- `fixtures/ep18-webhooks/` — a loopback-only Node 22 fixture with a **fictional** provider ("SubHub") that emits `{event_id, subscription_id, type, snapshot, version, event_ts}` events and signs each delivery as `HMAC-SHA256(secret, "${delivery_ts}.${rawBody}")` (synthetic secret; fresh timestamp + signature per retry). Two receivers:
  - `receiver-naive.mjs` (known-positive control): verifies signature and timestamp, then applies every event in **arrival order**. An older event arriving late overwrites newer state.
  - `receiver.mjs` (corrected): verifies the HMAC over the **raw body bytes** with `crypto.timingSafeEqual` **before** parsing; enforces a 300 s delivery-timestamp tolerance (injectable clock); parses and validates; deduplicates by `UNIQUE (provider, event_id)`; applies the snapshot only if `version > stored`; writes the event record and the state change in **one transaction**; returns 200 only after commit, 200 for verified duplicates and stale versions (recorded, not applied), 503 when the commit cannot complete (simulated via a test-only header).
- `db.mjs` uses `node:sqlite` (`DatabaseSync`) when available, otherwise an in-process store with the same explicit transaction + UNIQUE semantics; `db.kind` reports which. Here it ran on `sqlite`.
- Deliberate policies: duplicates and stale versions are answered **200** so the provider stops retrying; both are recorded with their outcome. Dedup is a constraint, not a lookup, so there is no check-then-insert race.
- No external side effects are performed: only rows in the local database change.

## Evidence
- Executed: `node --test fixtures/ep18-webhooks/test.mjs` → `# tests 14  # pass 14  # fail 0` (valid signature; tampered body; wrong secret; raw-bytes vs re-serialised signing; expired delivery timestamp with a valid signature; legitimate retry with fresh signature → duplicate; duplicate event; out-of-order older version → stale; **known-positive control** showing the naive receiver regress to `past_due`; 6 concurrent duplicate deliveries → 1 applied; replay of the full set → state unchanged; commit failure → 503 and no state change; malformed payload → 400; both store backends).
- Executed: `node fixtures/ep18-webhooks/demo.mjs` → `fixtures/ep18-webhooks/evidence.json` (receiver clock fixed at `1768000000`):
  - naive receiver, deliveries v1, v3, v2(late): final state **version 2, past_due / starter** (regressed).
  - corrected receiver, deliveries v1, v3, v2(late), v3(retry): outcomes applied, applied, **stale**, **duplicate**; final state version 3, active / pro.
  - tampered body → 401; wrong secret → 401; valid signature 301 s old → 401 (`age_s: 301, tolerance_s: 300`).
  - v4 with simulated commit failure → **503**, state digest unchanged, no event record; v4 retried → 200 applied.
  - 6 concurrent deliveries of new event v5 → 6 × 200; applied 1, duplicate 5, records added 1.
  - replay of v2, v3, v1, v3, v2, v1 → 6 × 200 duplicate; state digest `0d4e457d205b2702` before and after; records 5 → 5.
- Predicted: timings in the placeholder `video/src/episodes/ep18/timeline.json` were produced with `--no-audio` (word-count estimate); the orchestrator rebuilds it from the real narration.
- Blocked (by design of this task): no narration audio generated, no MP4 rendered, no frames inspected. `render-evidence.json` is filled by the orchestrator.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep18      # from narration audio in video/public/ep18/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep18 --concurrency 2
```

## Limitations
- **Raw-body verification precedes reserialisation.** The signature is checked over the exact bytes received; a receiver that re-serialises before verifying would accept bytes the provider never signed (tested).
- **A valid signature does not establish freshness**; the timestamp tolerance does. **Tolerance does not replace event-ID deduplication**: a retry inside the window is fresh, valid and still a duplicate.
- **Version-based skipping is safe only because this provider's events carry full snapshots.** For incremental events (deltas), every intermediate operation may matter; do not apply this strategy blindly.
- **Timestamps alone do not provide reliable ordering.** `event_ts` is informational; ordering uses the provider's per-subscription version.
- The full-snapshot and monotonic-version guarantees belong to this **fictional** provider; real providers do not universally offer them.
- **No external side effects** are performed. Emails, charges, queue publishes would require additional coordination (e.g. an outbox pattern or idempotent downstream operations), which this fixture does not demonstrate.
- Simulated: the commit failure (`X-Fault: fail-commit`) and the receiver clock. Not tested: secret rotation, provider-side retry scheduling, multi-process concurrency against a shared database, record retention/expiry.
- The fixture binds 127.0.0.1 on an ephemeral port; the signing scheme and secret are fixture-only.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep18/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep18 → episodes/ep18/ep18.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 111.93 s, 9135471 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
