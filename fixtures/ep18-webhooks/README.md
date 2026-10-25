# EP18 fixture — webhook receiver: duplicates, retries and out-of-order deliveries

A loopback-only Node 22 fixture with a **fictional** subscription provider ("SubHub") and two
receivers. Synthetic data, synthetic secret, no network beyond 127.0.0.1, **no external side effects**
(no emails, no billing calls, no queues — only rows in a local database).

## Files
- `provider.mjs` — builds events `{event_id, subscription_id, type, snapshot, version, event_ts}` and
  signs each delivery. **Signing scheme:** `signed_payload = "${delivery_ts}.${rawBody}"`,
  `X-SubHub-Signature: v1=hex(HMAC-SHA256(secret, signed_payload))`, `X-SubHub-Timestamp: <unix s>`.
  Every delivery attempt — including a legitimate retry of the same event — gets a **fresh**
  `delivery_ts` and therefore a fresh signature; the event body bytes are identical across retries.
  `node:crypto` is the cryptographic library (`createHmac`, `timingSafeEqual`).
- `receiver-naive.mjs` — **known-positive control.** Verifies signature + timestamp exactly like the
  corrected receiver, then applies every verified event **in arrival order**. No dedup, no version
  comparison. An older event arriving late overwrites newer state.
- `receiver.mjs` — **corrected receiver.** `POST /webhooks/subhub`:
  1. read the **raw body bytes**;
  2. verify the HMAC over `"${ts}." + rawBytes` with `crypto.timingSafeEqual` → `401` on mismatch;
  3. enforce `|now − ts| ≤ 300 s` (clock injectable for tests) → `401` outside tolerance;
  4. **only then** `JSON.parse` + validate the shape → `400` when invalid;
  5. `db.applyEvent()`: insert the event record (dedup by `UNIQUE (provider, event_id)`), compare
     `version` with the stored version, apply the full snapshot only if newer — **in one transaction**;
  6. `200` only after `COMMIT`; `200` also for a verified duplicate already handled (outcome
     `duplicate`) and for an older version (outcome `stale`, recorded, not applied); `503` when the
     commit cannot complete (nothing changed; the provider should retry).
  Test-only fault injection: header `X-Fault: fail-commit` makes the store throw at commit time.
- `db.mjs` — store. Uses `node:sqlite` (`DatabaseSync`, in-memory) when it loads; otherwise an
  in-process store with the **same explicit `BEGIN/COMMIT/ROLLBACK` and `UNIQUE` semantics**
  (`db.kind` reports `'sqlite'` or `'memory'`). Both backends are exercised by the last test. In this
  environment `node:sqlite` was available and `evidence.json` records `"backend": "sqlite"`.
- `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep18-webhooks/test.mjs
node fixtures/ep18-webhooks/demo.mjs      # writes evidence.json
```
Node 22 prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Deliberate policies
- **Raw-body verification precedes any reserialisation.** The signature covers the exact bytes
  received. Test 4 shows that a body signed over `JSON.stringify(JSON.parse(body))` but sent with
  different bytes is rejected, while the same JSON value signed over the bytes actually sent is accepted.
- **A valid signature does not establish freshness.** A correctly signed delivery whose timestamp is
  301 s old is rejected (`401`); 300 s is accepted. The tolerance is about the *delivery*, not the event.
- **Timestamp tolerance does not replace event-ID dedup.** A retry inside the window is a verified,
  fresh, *duplicate* delivery; only the `UNIQUE (provider, event_id)` constraint stops a second apply.
- **Dedup is a database constraint, not a lookup.** There is no SELECT-then-INSERT decision, so six
  concurrent deliveries of one new event yield exactly one `applied` and one record (test 10, demo).
- **Version-based skipping is safe here only because every event carries the full snapshot.** Setting
  state from the newest snapshot loses nothing. For *incremental* events (deltas, "add 1 seat",
  "charge X") every intermediate operation may matter, and skipping older ones is **not** safe.
- **Timestamps alone do not order events.** `event_ts` is informational in this fixture; ordering uses
  the provider's per-subscription `version`. Clock skew and retries make timestamps unreliable for ordering.
- **Stale and duplicate deliveries return 200** so the provider stops retrying; both are recorded in
  `webhook_events` with their outcome.
- **The full-snapshot and monotonic-version guarantees belong to this fictional provider.** Real
  providers do not universally offer them; check the provider's documented contract.
- **No external side effects.** The transaction covers only the local database. A receiver that also
  sends an email, charges a card or publishes to a queue needs additional coordination (outbox pattern,
  idempotent downstream operations, or similar); that is outside this fixture.

## Executed
```
# tests 14
# suites 0
# pass 14
# fail 0
```
`node demo.mjs` summary (also in `evidence.json`; receiver clock fixed at `1768000000`):

| receiver | deliveries (wire order) | outcomes | final state |
|---|---|---|---|
| naive | v1, v3, v2 (late) | applied, applied, applied | **v2 past_due / starter** (regressed) |
| corrected | v1, v3, v2 (late), v3 (retry) | applied, applied, **stale**, **duplicate** | v3 active / pro |

| check (corrected) | status |
|---|---|
| tampered body, original signature | 401 |
| signed with the wrong secret | 401 |
| valid signature, delivery timestamp 301 s old | 401 |
| v4 with simulated commit failure | **503**, state unchanged, no record |
| v4 retried after the 5xx | 200 applied |
| 6 concurrent deliveries of new event v5 | 6 × 200; 1 applied, 5 duplicate, 1 record |
| replay of v2, v3, v1, v3, v2, v1 | 6 × 200 duplicate; state digest unchanged (`0d4e457d205b2702`) |

## Not tested / limitations
- No real provider, no public network, no TLS. The signing scheme is this fixture's own.
- Retry *scheduling* (backoff, max attempts) on the provider side is not modelled; `deliver()` is called
  by the tests directly.
- Secret rotation (accepting two secrets during a rollover) is not implemented.
- Multi-process concurrency against a shared database is not exercised; concurrency here is
  concurrent HTTP requests into one process backed by one SQLite connection, where the UNIQUE
  constraint and `BEGIN IMMEDIATE` serialise the writes.
- Event-record retention is unbounded for the lifetime of the in-memory database (fixture policy).
