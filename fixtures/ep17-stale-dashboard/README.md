# ep17-stale-dashboard — a four-stage telemetry pipeline on one controlled clock

**SIMULATED PIPELINE · COMPRESSED CLOCK.** Plain Node 22 ESM, zero dependencies, no sockets, no `Date.now()`. Every stage reads time from one shared clock object (`clock.mjs`) that is advanced explicitly in one-second steps. "Ten simulated minutes" is six hundred `advanceSeconds(1)` calls, not six hundred seconds of waiting. The sensor value is a deterministic function of simulated time (synthetic "inlet temperature"); nothing is measured from a real device.

## What it is

```
source ──(collector samples every 600 s)──> collector store ──(API serves latest)──> dashboard polls every 30 s
```

| file | role |
|---|---|
| `clock.mjs` | shared monotonic clock: `now()`, `iso()`, `advanceSeconds(s)`; rejects negative advances |
| `pipeline.mjs` | `createSource`, `createCollector`, `createApi`, `createDashboard`, and `createPipeline()` which wires them on one clock and drives the schedule |
| `state-rules.mjs` | pure `evaluate({reading, nowMs, lastPoll})` → `{measurementAgeSeconds, connection, freshness, warning, reason}`; plus `naiveStatus()` (the flawed "Live" label, kept as a known-positive control) |
| `test.mjs` | regression tests (`node --test test.mjs`) |
| `demo.mjs` | runs the three video scenarios and writes `evidence.json` with a poll-by-poll table |

Each reading carries **four separate timestamps/fields** and no stage rewrites another's:

- `sourceObservedAt` — when the source produced the value
- `collectedAt` — when the collector sampled the source
- `servedAt` — when the API answered that particular request
- `value`

## State rules (deliberate policies)

- **Measurement age = now − `sourceObservedAt`.** Never `collectedAt`, never `servedAt`, never poll time. A successful poll does not reset it.
- **Connection status reflects recent API communication only**: `connected` if the last poll succeeded within `CONNECTION_WINDOW_SECONDS` (90 s); `disconnected` if the last poll failed; otherwise `unknown`.
- **`STALE_THRESHOLD_SECONDS = 300` is this fixture's product policy.** A measurement older than five minutes is labelled `stale`. This is a choice for this synthetic dashboard. Ten-minute-old data is not unacceptable for every use case; a daily report or a slow-moving sensor could set the threshold at hours.
- **A successful poll can coexist with stale data** (`connection: connected`, `freshness: stale`).
- **A failed poll retains the last known value** with an explicit warning (`Last poll failed (503 …); showing last known value.`). No current reading is fabricated.
- **Negative ages are never displayed.** A `sourceObservedAt` in the future is flagged `reason: impossible-future`, `freshness: unknown`, `measurementAgeSeconds: null`.
- **Missing or unparseable `sourceObservedAt`** → `reason: invalid-timestamp`, `freshness: unknown`.
- The collector keeps its last good sample when a sampling attempt fails; the API serves it with a 200 because, from the API's point of view, it is the latest reading it has.

## How to run

```
node --test test.mjs
node demo.mjs          # writes evidence.json
```

## Executed

```
# tests 12
# suites 0
# pass 12
# fail 0
```

`node demo.mjs` (all times simulated; see `evidence.json` for the full rows):

**Healthy** — collector samples at t=0 and t=600; 19 polls before the re-collection, every one `200`, every one labelled `Live · updated 0 s ago` by the naive rule, while the measurement age climbs 30 → 570 s; `stale` by policy from t=330. At t=600 the collector samples again (value 21.2 → 22.8) and the age drops to 0.

| t | event | http | value | age (s) | freshness | connection | naive label |
|---|---|---|---|---|---|---|---|
| 30 | poll | 200 | 21.2 | 30 | fresh | connected | Live |
| 300 | poll | 200 | 21.2 | 300 | fresh | connected | Live |
| 330 | poll | 200 | 21.2 | 330 | **stale** | connected | Live |
| 570 | poll | 200 | 21.2 | 570 | **stale** | connected | Live |
| 600 | collect + poll | 200 | 22.8 | 0 | fresh | connected | Live |

**Collector failure** — collector marked failing at t=570; collections at t=600 and t=1200 fail (2 failed). API keeps returning the t=0 reading with `200`. Final poll at t=1200: `connection: connected`, `freshness: stale`, `measurementAgeSeconds: 1200`, naive label still `Live`.

**API failure** — API returns `503` from t=60 to t=120; polls at t=90 and t=120 fail (2 failed). Value 21.2 retained throughout with warning `Last poll failed (503 Service Unavailable); showing last known value.`; `connection: disconnected`; age continues 90 → 120 from `sourceObservedAt`. Recovery poll at t=150: `200`, `connected`, same `collectedAt`, age 150.

**Polling faster** — poll every 5 s vs every 30 s over 599 s: 119 polls vs 19, collector sampled exactly once in both, one distinct `collectedAt` in both, identical age (570 s) at t=570.

**Timestamp checks** — future (+45 s): `impossible-future`, age `null`; missing and `"yesterday-ish"`: `invalid-timestamp`, age `null`.

## Limitations

- **One shared clock.** Real sources, collectors, APIs and browsers each have their own clock. Skew, drift and timezone mistakes between them are real sources of wrong ages (including apparent negative ages) and are **not modelled** here. The `impossible-future` flag exists precisely because production code must expect them.
- No sockets, no HTTP, no real browser. The "API" and "dashboard" are in-process objects; status codes are simulated values in the returned object.
- Polling faster does not make the collector sample faster, and a push transport (WebSockets, SSE) would deliver the same stale upstream reading sooner — neither changes `sourceObservedAt`. The fixture demonstrates the first claim directly (side check A) and does not implement a WebSocket variant.
- The stale threshold and connection window are this fixture's policies, not universal values.
- Not tested: partial/garbled responses, clock skew, retries/backoff, multiple sources, aggregation windows.
