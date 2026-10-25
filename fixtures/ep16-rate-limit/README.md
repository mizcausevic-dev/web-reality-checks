# EP16 fixture — rate-limited search, flawed vs corrected client

A loopback-only Node 22 fixture: a search API behind a **fixed-window** rate limiter, and two clients
driven through the **same scripted typing sequence**. Zero npm dependencies. Synthetic catalogue only.

## Files
- `limiter.mjs` — `createLimiter({limit: 5, windowMs: 10_000, clock})`. Fixed window aligned to multiples
  of `windowMs` on the injected clock. **Rejected requests do not consume allowance.** `Retry-After` =
  integer seconds until the window edge, **rounded up**, never 0. Also exports the clocks (`manualClock`
  for pure limiter tests, `scaledClock` for live server+client runs) and the shared typing harness
  (`TYPING_SCRIPT`, `TYPING_SCRIPT_PAUSED`, `runTyping`).
- `server.mjs` — `GET /login/:name` (test harness: server establishes a synthetic identity, opaque cookie)
  and `GET /search?q=` (200 with results, or 429 with `Retry-After: <int>` and `RateLimit-Remaining: 0`).
  The limiter is keyed by the server-established identity only; `X-Identity` / `?identity=` are ignored.
  Allowed searches take a deterministic synthetic latency that is *longer for shorter prefixes*
  (`latencyFor("p")` = 1200 ms … `latencyFor("postgres")` = 150 ms), which is what makes out-of-order
  arrival observable. Every `/search` the server sees is logged, including client aborts it observed.
- `client-flawed.mjs` — fires on every keystroke; on 429 retries immediately (ignores `Retry-After`);
  no sequence guard; no abort. The immediate-retry loop is **bounded** (`maxImmediateRetries = 3` per
  keystroke) only so the tests terminate.
- `client-corrected.mjs` — debounce (250 ms); request sequence number so a response is applied only if
  still current; `AbortController` aborts the obsolete in-flight request (can be disabled with
  `abort: false` to show the sequence guard alone suffices); reads `Retry-After`, rounds **up**, schedules
  **at most one** retry of the still-current query; a scheduled retry is cancelled when the query changes.
- `test.mjs`, `demo.mjs`, `evidence.json`, `request-log-flawed.json`, `request-log-corrected.json`.

## Run
```
node --test fixtures/ep16-rate-limit/test.mjs
node fixtures/ep16-rate-limit/demo.mjs      # writes evidence.json + the two request logs
```

## Clock
Limiter boundary tests use `manualClock` (time moves only when the test says so). Live scenarios use
`scaledClock(10)`: 10 virtual ms per real ms, so a 10 s window costs 1 s of wall time. **All `at`/`ms`
values in the logs and in `evidence.json` are virtual fixture time.** Because the scaled clock magnifies
event-loop jitter, the nominal 80 ms keystroke spacing appears as roughly 90–160 virtual ms in the logs;
the *order* of events, the request counts and the 429 counts are not affected by that jitter.

## Scripted typing
`TYPING_SCRIPT`: `postgres`, one character per keystroke, 80 ms apart — identical for both clients.
`TYPING_SCRIPT_PAUSED`: same characters with one 600 ms pause after `post`; used only to make the
debounced `post` request leave the client so that it can be observed being aborted (or, with abort
disabled, being answered and then dropped by the sequence guard).

## Deliberate policies (this fixture's, not every API's)
- Fixed-window accounting, 5 per 10 s, per identity. Many real APIs use sliding windows or token buckets.
- Rejected requests are **not** counted against the allowance.
- `Retry-After` is sent as **delta-seconds**. RFC 9110 also allows an HTTP-date; the corrected client's
  parser accepts both forms but this fixture only emits seconds. Real 429s are **not guaranteed** to carry
  `Retry-After` at all; the corrected client falls back to its own delay when the header is absent.
- The shared test identity (`GET /login/tester`) is a **test harness**, not production authentication.
- The retry policy (one retry after `Retry-After`) is for an idempotent read. **Do not reuse it for
  state-changing requests** without an idempotency mechanism.
- The server stops its synthetic work when it sees the client abort. That is a fixture courtesy: a browser
  abort does **not** prove a real server stopped processing or did not count the request.
- Debouncing reduces the client's request rate; it does **not** replace server-side rate limiting.

## Executed
```
# tests 17
# suites 0
# pass 17
# fail 0
```
`node demo.mjs` summary (also in `evidence.json`; A and B use the identical `TYPING_SCRIPT`):

| run | client requests | retries | 429s | server 200s | aborted | stale renders | results shown for |
|---|---|---|---|---|---|---|---|
| A. flawed, scripted typing | **17** | 9 | **12** | 5 | 0 | 5 | `p` (input was `postgres`) |
| B. corrected, same typing | **1** | 0 | **0** | 1 | 0 | 0 | `postgres` |
| B2. corrected, paused typing | 2 | 0 | 0 | 2 | 1 | 0 | `postgres` |
| C. corrected, window pre-exhausted | 2 | 1 | 1 | 1 (+5 pre-exhaust) | 0 | 0 | `postgres` |

Run C detail: first request 429 with `Retry-After: 3` at 7 725 ms → retry scheduled for 3 000 ms →
retry sent at 10 889 ms (inside the next window) → 200. These two timestamps jitter by a few
virtual ms between demo runs (scaled clock); the header value, the 3 000 ms wait and the 200 do not.

## Not tested / limitations
- No real browser: `fetch` + `AbortController` are Node's. Browser abort semantics beyond "the client
  stops waiting" are not exercised.
- Sliding-window / token-bucket limiters, per-route limits, and shared limits across identities are out
  of scope.
- `Retry-After` as an HTTP-date is parsed but not served or tested end-to-end.
- Exact keystroke timing under the scaled clock is approximate (see Clock); the tests assert ordering and
  counts, not millisecond positions.
