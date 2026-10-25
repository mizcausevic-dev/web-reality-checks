# EP 15 — You Clicked Pay Once. Why Did the App Create Two Orders?

**Central idea.** A lost response leaves the client uncertain even after the server has committed; retrying then duplicates the operation unless the server can recognise the retry as the same intention.

## What this fixture is
- `fixtures/ep15-idempotency/` — a loopback-only Node 22 mock order service on `node:sqlite` (in-memory `DatabaseSync`). "Pay" means "insert a mock order row"; no payment provider is contacted.
- `POST /vuln/orders` (vulnerable) inserts one order per request. `POST /orders` (corrected) requires `Idempotency-Key`, scoped to `(session user, create_order, key)` with a `UNIQUE` constraint; the order row and the idempotency record are committed in **one** transaction; the stored result is replayed for the same key + same fingerprint; `422` for the same key + materially different fingerprint; `400` for a missing key.
- Fingerprint = SHA-256 of canonical JSON of the validated, normalised fields (`sku`, `qty`, `amountCents`, `currency`). Field order and casing do not matter; a different quantity does.
- Controlled fault: `X-Fault: lose-response` makes the server commit and then destroy the socket before responding. The client sees `UND_ERR_SOCKET` and cannot know whether the commit happened.
- Identity comes only from the server-side session cookie. `X-User-Id` and `body.userId` are ignored (tested).
- Deliberate policy for concurrent in-flight requests with the same key: the second and later requests **wait** for the first, then receive the stored result (`Idempotent-Waited: true`). An immediate `409` would be an equally valid policy; this fixture implements the wait.
- Deliberate policy on retention: idempotency records live for the lifetime of the in-memory test database. This is not a claim that production records should be retained indefinitely.
- Correctness does not rest on a pre-read or on the in-flight map (both are optimisations). Test 8 skips the pre-read and shows the `UNIQUE` constraint + transaction alone resolve the race and roll back the losing insert. No check-then-insert logic decides the outcome.

## Evidence
- Executed: `node --test fixtures/ep15-idempotency/test.mjs` → `# tests 13  # pass 13  # fail 0` (includes a known-positive control asserting the vulnerable endpoint creates two orders after a lost response + retry, and a control that five concurrent vulnerable requests create five orders).
- Executed: `node fixtures/ep15-idempotency/demo.mjs` → `fixtures/ep15-idempotency/evidence.json`:
  - vulnerable, lost response + retry: **2 attempts → 2 orders**
  - corrected, lost response + retry, one key: **2 attempts → 1 order** (attempt 2 `201`, `Idempotent-Replayed: true`, same `orderId`)
  - corrected, same key, `qty` 1 → 3: **422**, still 1 order
  - corrected, 5 concurrent requests, one key: **1 order** (all five `201` with the same `orderId`; 4 replayed, 4 waited)
  - corrected, two purchases, two keys: 2 orders
- Executed: `cd video && npx tsc --noEmit` → clean.
- Executed: `node tools/build-timeline.mjs ep15 --no-audio` → provisional `video/src/episodes/ep15/timeline.json` (102.6 s estimated, 22 captions) so the composition type-checks. The orchestrator regenerates it from real narration audio.
- Blocked (by spec, for the builder): narration audio, render, thumbnail, `render-evidence.json` — produced by the orchestrator. No MP4 is claimed here.
- Predicted: the vulnerable-endpoint behaviour in the first scene is an illustrative checkout mock-up (plain `Box` chrome), labelled "Illustrative checkout"; the counts on it are from `evidence.json`.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep15      # needs video/public/ep15/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep15 --concurrency 2
```

## Accuracy bullets from the brief → where they appear
| Brief bullet | Narration / on-screen |
|---|---|
| Do not claim exactly-once network delivery | `lost` narration + caption; `end` footnote |
| Disabling a button is not sufficient | `retry` narration + "Would a disabled button help?" gate |
| Avoid non-atomic check-then-insert | `fix` narration ("No check-then-insert race") + AVOIDED box |
| Do not trust a client-supplied user ID | `fix` narration + checklist row "not X-User-Id"; test 12 |
| DB transaction does not cover external payment side effects | `end` narration + on-screen amber line |
| Different logical purchases require different keys | `count` narration + box; test 10 |
| Expiring a record lets a late retry be treated as new | `end` narration + on-screen amber line |

## Limitations
- Simulated: the lost response is a deliberate server-side socket destroy, not a real network partition. Measured: the order counts, statuses and headers in `evidence.json` are actual outputs of the fixture.
- The transaction covers the local `orders` + `idempotency` rows only. An external payment-provider call is outside it and would need its own provider-side idempotency key and reconciliation; not modelled or tested.
- Record expiry is not implemented; the consequence (a sufficiently late retry treated as new) is stated, not demonstrated.
- Single process, single SQLite connection. In a multi-node deployment the in-process wait map does not span nodes; the database `UNIQUE` constraint still does, which is why correctness is placed there.
- The fingerprint covers only the validated order fields. Fields deliberately excluded from validation (e.g. a client `userId`) cannot affect it.
- Session harness (`GET /login/:user`) is not production authentication. The vulnerable fixture binds to 127.0.0.1 on an ephemeral port and must never be deployed.
- `node:sqlite` is marked experimental in Node 22; it prints an `ExperimentalWarning`.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep15/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep15 → episodes/ep15/ep15.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 103.93 s, 8485468 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
