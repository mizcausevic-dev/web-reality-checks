# EP 16 — Your App Isn't Broken. It's Being Rate-Limited.

**Central idea.** A client can exceed an API's request budget; coordinate the requests (debounce, sequence guard, abort, bounded Retry-After wait) instead of retrying immediately.

## What this fixture is
- `fixtures/ep16-rate-limit/` — a loopback-only Node 22 search API (`GET /search?q=`) behind a **fixed-window** limiter: 5 allowed requests per 10 s, keyed by a **server-established synthetic test identity** (`GET /login/:name`, opaque cookie; a harness, not production authentication). The limiter takes an injectable clock.
- Deliberate policies: rejected requests **do not consume allowance**; `Retry-After` is **integer delta-seconds until the window edge, rounded up, never 0**; shorter prefixes answer slower so out-of-order arrival is observable.
- `client-flawed.mjs`: request per keystroke, immediate retry on 429 (bounded to 3 per keystroke so tests terminate), no stale guard, no abort.
- `client-corrected.mjs`: 250 ms debounce; per-request sequence number (a response is applied only if still the latest); `AbortController` on the obsolete in-flight request; `Retry-After` parsed (seconds or HTTP-date), rounded **up**, at most **one** retry of the still-current query; scheduled retry cancelled when the query changes; fallback delay when the header is missing.
- Both clients are driven through the **identical scripted typing sequence** (`postgres`, one character per 80 ms) by the same harness.

## Evidence
- Executed: `node --test fixtures/ep16-rate-limit/test.mjs` → `# tests 17  # pass 17  # fail 0` (includes two known-positive controls asserting the flawed client is rate-limited on immediate retry and renders stale results; limiter boundary tests on a manual clock: 5th allowed, 6th rejected, reset exactly at the window edge, rejections not counted, Retry-After rounding).
- Executed: `node fixtures/ep16-rate-limit/demo.mjs` → `evidence.json`, `request-log-flawed.json`, `request-log-corrected.json`:
  - A. flawed, scripted typing: **17 requests** (8 keystrokes + 9 immediate retries), **12 × 429**, 5 × 200, 5 stale renders, final UI showed results for `"p"` while the input read `postgres`.
  - B. corrected, same typing: **1 request**, **0 × 429**, results for `"postgres"`.
  - B2. corrected, paused typing: 2 requests, 1 aborted by the client, 1 abort observed in the server log, 0 stale renders.
  - C. corrected, window pre-exhausted: first request 429 with `Retry-After: 3` at 7 725 virtual ms → retry at 10 889 ms → 200; exactly one retry.
- Observed: all `ms` values are **virtual fixture time** (scaled clock, 10 virtual ms per real ms); event order and counts are what the tests assert, not millisecond positions.
- Predicted (not executed): behaviour in a real browser. `fetch`/`AbortController` here are Node's.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep16    # from narration audio in video/public/ep16/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep16 --concurrency 2
```
Type-check: `cd video && npx tsc --noEmit` (passes).

## Limitations
- **Fixed-window accounting is this fixture's design**, not every API's. Sliding windows, token buckets, per-route limits and shared limits are out of scope.
- **Retry-After is not guaranteed** on real 429 responses. The header may be **delta-seconds or an HTTP-date**; this fixture emits seconds (the client parses both, but the HTTP-date path is not exercised end-to-end).
- **A browser abort does not prove the server stopped processing** or did not count the request. The fixture server logs the abort and stops its synthetic work as a courtesy; the sequence guard is what keeps the rendered result correct.
- **Debouncing does not replace server-side rate limiting**; it lowers the client's rate.
- **Do not reuse this retry policy for state-changing requests** without an idempotency mechanism (see EP15).
- The **shared test identity is a harness**, not production authentication.
- The flawed client's immediate-retry loop is bounded only so the tests terminate; real flawed clients may have no bound.
- Scene 1's keystroke→request animation runs slower than the fixture's 80 ms spacing for legibility; the counts it displays are the fixture's. Scene 7's ruler positions use the recorded virtual-ms values.

## Test timing note (observed during production)
- Observed: `node --test fixtures/ep16-rate-limit/test.mjs` passed 17/17 on three consecutive runs on an idle 2-vCPU box, and failed 1/17 once while a video render saturated both cores. The limiter and typing tests run on a scaled virtual clock, so heavy CPU contention can shift one timing assertion. Run the suite on an idle machine; a single failure under load is a scheduling artefact, not a limiter defect.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep16/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep16 → episodes/ep16/ep16.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 110.27 s, 9507725 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
