SEO title (≤60 chars): Out-of-Order Webhooks: Verify Bytes, Dedup, Gate by Version
Meta description (≤155 chars): A valid, signed webhook arrived late and set an active subscription to past due. The fixture, the control test, and the raw-body, UNIQUE-constraint repair.
Slug: webhook-duplicates-ordering
Primary keyword: webhook idempotency   Secondary keywords (3–5): webhook signature verification, out-of-order webhooks, webhook deduplication, HMAC raw body, webhook retry handling
Medium tags (5): Webhooks, Distributed Systems, Node.js, Software Engineering, API Design

# Your Webhook Arrived Twice. Then an Older Update Arrived.

![Subscription sub_alpha is active on the pro plan at version 3; a late delivery of version 2 arrives with a valid signature and the naive receiver overwrites the record to past_due on the starter plan](../hero.png)

The subscription was active on the pro plan. Then a correctly signed webhook arrived, the receiver applied it, and the record said past due on the starter plan. Nothing was forged and nothing failed: the receiver applied every verified event in the order it arrived, as built.

This is episode eighteen of Web Reality Checks: the gap between the order a resource changed and the order the notifications reached you, shown on a local fixture with a fictional provider, then repaired and retested. Every number below comes from that local synthetic fixture.

## What actually happens

A provider creates events in a definite sequence. In the fixture, subscription `sub_alpha` goes through v1 `trialing / starter`, v2 `past_due / starter`, v3 `active / pro`. That is creation order, the order the business cares about.

Delivery order is separate. Each event is an HTTP POST made by some worker, retried on failure, possibly in parallel with other workers. The fixture delivers v1, then v3, then v2 late. Retries and parallel delivery do this routinely, so a receiver that applies events in arrival order will sometimes write an older state over a newer one. The naive receiver here ends on version 2, `past_due / starter`, with every signature valid. Signature verification answers "did the provider send these bytes?" and nothing else.

Two more properties follow. A provider that retries sends the same event more than once, each time with a fresh delivery timestamp and therefore a fresh signature, so a retry is valid, fresh and still a duplicate. And `event_ts` cannot sort this out: it reflects the provider's clock at creation, says nothing about whether you have already seen a later version, and clock skew makes it unreliable as an ordering key. Ordering has to come from something the provider commits to per resource, here a monotonically increasing `version`.

## The fixture

`fixtures/ep18-webhooks/` is a loopback-only Node 22 fixture. A fictional provider, SubHub, emits `{event_id, subscription_id, type, snapshot, version, event_ts}` events. Every event carries the full subscription snapshot, not a delta, and `version` increases by one per subscription. Those guarantees belong to this fictional provider; real providers do not universally offer them.

Each delivery is signed over the delivery timestamp and the exact body bytes:

```js
export const sign = (secret, deliveryTs, rawBody) =>
  crypto.createHmac('sha256', secret).update(`${deliveryTs}.`).update(rawBody).digest('hex');
```

Headers are `X-SubHub-Timestamp` and `X-SubHub-Signature: v1=<hex>`. The secret is synthetic and fixture-only.

Two receivers sit side by side. `receiver-naive.mjs` is the known-positive control: it verifies signature and timestamp exactly like the corrected receiver, then calls `db.applyNaive()`, which overwrites state with whatever arrived. `receiver.mjs` is the corrected one. It verifies over the raw bytes with a constant-time compare, before anything is parsed:

```js
export const verifySignature = (secret, tsHeader, rawBody, sigHeader) => {
  if (typeof tsHeader !== 'string' || !/^\d{1,12}$/.test(tsHeader)) return false;
  const m = /^v1=([0-9a-f]{64})$/.exec(sigHeader ?? '');
  if (!m) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${tsHeader}.`).update(rawBody).digest();
  const presented = Buffer.from(m[1], 'hex');
  if (expected.length !== presented.length) return false;
  return crypto.timingSafeEqual(expected, presented);
};
```

Then it checks `|now - ts| <= 300` seconds against an injectable clock, and only then calls `JSON.parse` and `validateEvent`. The store, `db.mjs`, uses `node:sqlite` when it loads and an in-process backend with the same transaction and `UNIQUE` semantics otherwise (`db.kind` reports which; here, `sqlite`). The decision logic is one transaction:

```js
be.begin();
try {
  be.insertEvent({provider, event_id: ev.event_id, /* ... */ outcome: 'pending', received_at: nowIso()});
  const cur = be.getState(ev.subscription_id);
  const storedVersion = cur ? cur.version : 0;
  let outcome;
  if (ev.version > storedVersion) { be.setState({/* full snapshot */}); outcome = 'applied'; }
  else { outcome = 'stale'; }
  be.setOutcome(provider, ev.event_id, outcome);
  be.commit();
} catch (e) {
  be.rollback();
  if (be.isUniqueViolation(e)) return {outcome: 'duplicate', /* ... */};
  throw e;
}
```

The `webhook_events` table carries `UNIQUE (provider, event_id)`. Dedup is that constraint, not a lookup, so there is no SELECT-then-INSERT race between concurrent deliveries.

## The test that proves it

`node --test fixtures/ep18-webhooks/test.mjs` reports `# tests 14  # pass 14  # fail 0` (local synthetic fixture). The receiver clock is fixed at `1768000000` so freshness tests never sleep. The test names:

- `valid signature + fresh timestamp -> 200, state applied`
- `tampered body (one byte changed after signing) -> 401, nothing stored`
- `signature from the wrong secret -> 401`
- `signature is verified over RAW bytes: whitespace-different body signed as sent -> 200; signed over a re-serialisation -> 401`
- `valid signature but delivery timestamp older than tolerance (300 s) -> 401`
- `a legitimate retry carries a FRESH timestamp and signature and is accepted as a duplicate (200, no second apply)`
- `duplicate event id with an identical fresh delivery -> 200 duplicate, state unchanged`
- `out-of-order: an OLDER version arriving after a newer one is recorded as stale and NOT applied`
- `KNOWN-POSITIVE CONTROL: the naive receiver applies in arrival order and regresses active -> past_due`
- `concurrent duplicate deliveries of one event -> exactly one applied, the rest duplicate, one record`
- `replay of the FULL delivery set (any order) leaves final state unchanged`
- `commit failure -> 503 (non-2xx), no event record, no state change; the retry then succeeds`
- `verified but malformed payload -> 400, nothing stored`
- `store backends: the in-process fallback has the same transaction + UNIQUE semantics as sqlite`

The control gives the rest their meaning. It delivers v1, v3, v2 to the naive receiver and asserts `status` is `past_due` and `version` is 2; the assertion message says why: "the flaw must be observable or the fix test proves nothing." The fourth test is the subtle one: a pretty-printed body signed over those exact bytes gets 200, and the same bytes with a signature computed over `JSON.stringify(JSON.parse(body))` gets 401. A receiver that reserialized before verifying would accept bytes the provider never signed.

`demo.mjs` runs the scenario and writes `evidence.json`. From that file: the naive receiver, given v1, v3, v2 late, ends at version 2, `past_due / starter`. Three 200s, wrong final state.

## The repair

Verification does not change; the naive receiver already verified correctly, and the bug was in processing. The repair is four decisions, in order.

Trust the bytes first. Verify the HMAC over the timestamp and the raw body with `crypto.timingSafeEqual`, before `JSON.parse`. A tampered body or a wrong secret gets 401 and nothing is stored.

Then check freshness, which the signature does not establish. The delivery timestamp must be within 300 seconds of the receiver's clock. A valid signature 301 seconds old gets 401 with `age_s: 301, tolerance_s: 300`; 300 exactly is accepted. The tolerance is about the delivery, not the event.

Then let the database decide uniqueness. Inserting the event record under `UNIQUE (provider, event_id)` either succeeds or throws. A throw means "already handled": roll back and return 200 with outcome `duplicate`, so the provider stops retrying. Tolerance does not replace this step; a retry inside the window is fresh, correctly signed and still a duplicate.

Then compare versions. If the incoming `version` is greater than the stored one, write the full snapshot as the new state; otherwise record the event as `stale` and leave state alone. Stale also returns 200. Both decisions share the transaction with the event record, and 200 is sent only after `COMMIT`. If the commit cannot complete, the handler returns 503 with nothing changed, and the provider's retry does the work later.

## Retest

From `evidence.json` (local synthetic fixture), on the corrected receiver:

- Deliveries v1, v3, v2 late, v3 retry: outcomes `applied`, `applied`, `stale`, `duplicate`. Final state version 3, `active / pro`.
- Tampered body with the original signature: 401. Wrong secret: 401. Valid signature, delivery timestamp 301 s old: 401.
- v4 with the simulated commit failure (`X-Fault: fail-commit`): 503, state digest unchanged, event records still 3. v4 retried: 200, `applied`, version 4.
- Six concurrent deliveries of new event v5: six 200s; `applied` 1, `duplicate` 5, event records added 1.
- Replay of v2, v3, v1, v3, v2, v1: six 200s, all `duplicate`. State digest `0d4e457d205b2702` before and after. Event records 5 before and after.

The event table ends with one row per event ID, each with its outcome, including the stale v2: recorded, not applied.

## What this does not prove

The brief and the fixture README draw these lines.

- Version-based skipping is safe here only because every event carries the full snapshot. For incremental events (deltas, "add one seat", "charge X") every intermediate operation may matter, and skipping older ones is not safe.
- The full-snapshot and monotonic-version guarantees belong to this fictional provider. Real providers do not universally offer them. Read the documented contract.
- No external side effects are performed; the transaction covers the local database only. A receiver that sends an email, charges a card or publishes to a queue needs additional coordination, such as an outbox pattern or idempotent downstream operations, which this fixture does not demonstrate.
- The commit failure and the receiver clock are simulated. Not tested: secret rotation, provider-side retry scheduling, multi-process concurrency against a shared database, event-record retention. The signing scheme and secret are fixture-only; the fixture binds 127.0.0.1 on an ephemeral port.

## Launch checklist

1. Signature verification runs over the raw request bytes, before any parsing or reserialization, with a constant-time compare from a maintained cryptographic library.
2. A delivery-timestamp tolerance is enforced and tested at the boundary; it establishes freshness, not uniqueness.
3. Deduplication is a database uniqueness constraint on provider and event ID, not check-then-insert; a concurrent-delivery test proves exactly one apply.
4. Ordering uses a provider-committed per-resource version, not the event timestamp, and that contract is written down.
5. Before adopting version skipping, confirm the provider's events are full snapshots. If they are deltas, design to apply every one.
6. Event record and state change commit in one transaction; 2xx only after commit; a failed commit returns non-2xx so the provider retries.
7. Verified duplicates and stale versions return 2xx and are recorded with their outcome.
8. A known-positive control exists: a naive receiver the suite can see regress.

## FAQ

**Why do webhooks arrive twice or out of order?**
Providers retry deliveries that time out or get a non-2xx, and often deliver from parallel workers. Each attempt is an independent HTTP request, so the same event can arrive more than once and a later event can arrive before an earlier one. Delivery order is not the order the resource changed.

**Should a webhook receiver verify the signature before or after parsing JSON?**
Before, over the exact raw bytes received. Parsing and reserializing can produce different bytes from the same JSON value, so a receiver that verifies a reserialized body can accept bytes the provider never signed. In the fixture that case is tested and returns 401.

**Is a timestamp tolerance enough to stop duplicate webhooks?**
No. A tolerance rejects old deliveries, but a legitimate retry carries a fresh timestamp and signature, so it passes. Only a uniqueness constraint on provider and event ID stops a second apply. In the fixture a retry inside the window returns 200 with outcome duplicate.

## Watch the episode

[YouTube link]

- 00:00 Active on pro, then past due
- 00:13 Creation order versus delivery order
- 00:29 Verify HMAC over raw bytes, then freshness
- 00:50 Dedup by UNIQUE (provider, event_id)
- 01:04 Older version arrives: stale, not applied
- 01:19 Replay all six: state unchanged
- 01:34 Six concurrent deliveries, one applied
- 01:40 Delivery order is not business order

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your App Isn't Broken. It's Being Rate-Limited.](../../ep16/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Delivery order is not business order. Verify the bytes, let the database decide uniqueness, let the provider's version decide order, and commit before you say 200.

Miz Causevic, Kinetic Gain LLC
