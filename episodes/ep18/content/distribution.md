# EP18 distribution kit: Your Webhook Arrived Twice. Then an Older Update Arrived.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep18-webhooks/` (evidence.json, test.mjs, README.md). The provider, SubHub, is fictional.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Webhook Arrived Twice. Then an Older Update Arrived.` (57) : the series title; states both failure modes in the order the episode shows them.
2. `Every Signature Was Valid. The Record Was Still Wrong.` (54) : the surprising part for engineers; valid is not the same as latest.
3. `Delivery Order Is Not Business Order` (36) : the closing line as a thesis; short and quotable.
4. `Webhooks: Verify Bytes, Dedup by Constraint, Skip by Version` (60) : names the three repair steps, so search intent around webhook handling lands here.
5. `A Late Webhook Set a Paying Customer to Past Due` (47) : the business symptom; works for product and founder viewers.
6. `Six Deliveries, One Event. What Should Happen?` (46) : the concurrency scene as a question; invites the viewer to answer before the reveal.

### Description

Active on pro. Then a correctly signed webhook arrives late, and the record says past due. Nothing was forged. The receiver trusted arrival order.

In this episode we build a fictional subscription provider and two webhook receivers on a laptop. The provider emits three versions of one subscription: trialing, past due, then active on the pro plan. They are delivered v1, v3, then v2 late, with every signature valid. The naive receiver applies each as it arrives and ends on version 2, past due on the starter plan. Three 200s, wrong final state.

Then the corrected receiver. It verifies the HMAC over the delivery timestamp and the raw body bytes with a constant-time compare, before parsing. Tampered body: 401. Wrong secret: 401. Valid signature 301 seconds old: 401, because valid does not mean fresh. It records each event under a UNIQUE (provider, event_id) constraint, so a legitimate retry, fresh and correctly signed, is answered 200 duplicate without a second apply. It applies the snapshot only when the version is higher than the one stored, so the late v2 is recorded as stale and not applied. Record and state change commit in one transaction; 200 is sent only after commit; a failed commit returns 503 with nothing changed. Retest: the same deliveries end on version 3, active, pro. Six concurrent deliveries of one new event: one applied, five duplicate, one record. Replay of all six shuffled: six 200s, all duplicate, state digest unchanged. 14 tests, 14 pass, including a known-positive control that proves the naive receiver regresses.

What this does not prove: version skipping is safe here only because this fictional provider's events carry full snapshots and a monotonic version. Real providers do not universally offer that. The fixture writes only to its own database; emails, charges and queue publishes need extra coordination.

Chapters
00:00 Active on pro, then past due
00:13 Creation order versus delivery order
00:29 Verify HMAC over raw bytes, then freshness
00:50 Dedup by UNIQUE (provider, event_id)
01:04 Older version arrives: stale, not applied
01:19 Replay all six: state unchanged
01:34 Six concurrent deliveries, one applied
01:40 Delivery order is not business order

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep18/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

webhooks, webhook security, webhook idempotency, hmac signature, raw body verification, timing safe equal, out of order events, duplicate events, event deduplication, unique constraint, database transaction, node.js, node sqlite, distributed systems, api integration, subscription billing, retry handling, known-positive control, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with a fictional provider ("SubHub") and synthetic data. Its full-snapshot and version guarantees are the fixture's, not a claim about real providers. Fixture, 14 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Three webhooks about one subscription. Delivered v1, v3, then v2 late. Every signature valid. Final record: past due on starter, for a customer who is active on pro.

Episode 18 of Web Reality Checks. The naive receiver verified signatures correctly and still got it wrong, because it applied events in arrival order.

The corrected receiver, in order:

1. Verify HMAC-SHA256 over the delivery timestamp and the RAW body bytes, with crypto.timingSafeEqual, before JSON.parse. A body signed over a reserialization but sent as different bytes: 401.

2. Enforce a 300 s delivery-timestamp tolerance. Valid signature, 301 s old: 401. Valid is not fresh.

3. Insert the event under UNIQUE (provider, event_id). The constraint is the dedup decision, not a lookup. A retry is fresh and correctly signed and still a duplicate: 200, no second apply.

4. Apply the snapshot only if version > stored. Late v2 after v3: recorded as stale, not applied.

Record and state in one transaction. 200 only after commit. Failed commit: 503, nothing changed.

Retest: v1, v3, v2, v3 retry gives applied, applied, stale, duplicate. Six concurrent deliveries of one event: 1 applied, 5 duplicate, 1 record. Replay of all six shuffled: state digest unchanged. 14 tests, 14 pass, with a known-positive control.

Scope: version skipping is safe here only because this fictional provider sends full snapshots. Deltas need every event. The fixture touches only its own database; external side effects need extra coordination.

Fixture, tests, video: github.com/mizcausevic-dev/web-reality-checks

#Webhooks #DistributedSystems #SoftwareEngineering

### Post 2: non-technical leaders

A customer upgraded to pro and paid. An hour later your system says past due. The billing provider says active. Nobody touched anything.

Episode 18 of Web Reality Checks reproduces this on a local fixture with a fictional provider. Three updates about one subscription are sent in order: trial, past due, active on pro. They arrive out of order, with the "past due" message landing last. The flawed receiver files each message as it arrives, so an old truth overwrites the current one. Every message was authentic.

Think of bank statements arriving by mail. If Monday's late statement lands on top of Tuesday's and you file whichever came last, your folder is wrong and every page in it is real.

The fix: check the seal before reading, keep one copy of each statement, and never let a lower-numbered page replace a higher one. That last step only works because each statement shows the whole account, which is a promise this fictional provider makes and real ones do not all make.

Five questions for your team or vendor:
1. When two updates about the same record arrive out of order, which one wins?
2. When the same notification arrives twice, what stops us acting twice?
3. Does the provider promise a version number and full state per message?
4. Do we say "received" before or after we have saved our side?
5. Does the notification also send emails or charges, and what keeps those from firing twice?

Synthetic fixture, fictional provider. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SaaS #Leadership

## X/Twitter thread

1/ A subscription was active on pro. A webhook arrived, correctly signed, and the record flipped to past due on starter. Nothing forged, nothing failed. The receiver applied events in arrival order. Episode 18 of Web Reality Checks. Thread.

2/ Two orders. Creation order at the provider: v1 trialing, v2 past_due, v3 active/pro. Delivery order on the wire: v1, v3, then v2 late. Retries and parallel workers do this routinely. The naive receiver ends on v2, past_due (local synthetic fixture).

3/ Step one of the repair: trust the bytes. HMAC-SHA256 over the delivery timestamp and the RAW body, constant-time compare, before JSON.parse. A signature computed over a reserialized body but sent as different bytes: 401. Reserialize first and you accept bytes nobody signed.

4/ Step two: freshness. Valid signature, delivery timestamp 301 s old: 401. 300 s: accepted. A signature proves origin, not recency. And tolerance does not replace dedup: a retry inside the window is fresh, valid and still a duplicate.

5/ Step three: let the database decide. UNIQUE (provider, event_id). The second arrival violates it, rolls back, gets 200 duplicate so the provider stops retrying. No check-then-insert race: six concurrent deliveries of one event gave 1 applied, 5 duplicate, 1 record.

6/ Step four: version, not timestamp. v2 arrives after v3; stored is 3, so v2 is stale: recorded, not applied. Safe ONLY because this fictional provider sends full snapshots. For deltas, every event matters. Real providers do not universally promise snapshots or monotonic versions.

7/ Record + state in one transaction. 200 only after commit. Simulated commit failure: 503, state digest unchanged, no record. Replay all six deliveries shuffled: six 200s, all duplicate, digest identical before and after. 14 tests, 14 pass, with a known-positive control.

8/ Delivery order is not business order. The fixture writes only to its own database; emails, charges and queues need extra coordination. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture for webhook receivers: raw-body HMAC verification, dedup by UNIQUE constraint, version-gated apply, and a naive control that regresses on out-of-order delivery

**First comment:** This is a deliberately constructed local fixture with a fictional provider ("SubHub") and synthetic data; its guarantees of full-snapshot events and a monotonic per-subscription version are the fixture's own and are not a claim that real providers offer them. The corrected receiver verifies HMAC-SHA256 over the delivery timestamp and raw bytes with timingSafeEqual before parsing, enforces a 300 s tolerance, deduplicates by UNIQUE (provider, event_id), applies the snapshot only when version > stored, and commits the record and state in one transaction before answering 200. The suite is 14 tests including a known-positive control where the naive receiver regresses active to past_due, and the README lists what is not covered (deltas, external side effects, secret rotation, multi-process concurrency).

## Short-form hook lines (≤ 12 words)

1. Every signature was valid. The record was still wrong.
2. Delivery order is not business order.
3. Valid does not mean fresh. Fresh does not mean unique.
4. Six deliveries of one event. One applied. Five duplicates.
5. A late webhook set a paying customer to past due.

## Alt text

**hero.png:** Diagram of subscription sub_alpha at version 3, active on the pro plan; a late delivery of version 2 arrives with a valid HMAC signature, and the naive receiver overwrites the record to past_due on the starter plan, with the caption "Every signature was valid. The receiver applied events in arrival order."

**thumbnail.png:** Episode thumbnail for "Your Webhook Arrived Twice. Then an Older Update Arrived." showing three numbered webhook envelopes delivered as 1, 3, 2, with the late envelope 2 landing on top and a subscription badge flipping from active to past due.
