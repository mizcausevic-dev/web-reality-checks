# EP02 distribution kit: One Click. Three Purchase Events. Here's What Went Wrong.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep02-duplicate-purchase-events/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `One Click. Three Purchase Events. Here's What Went Wrong.` (57) : the series title; the contradiction between one and three is the hook.
2. `One Order, Three Purchase Events: Who Owns the Event?` (53) : states the mechanism and the fix in one line; lands search intent around duplicate analytics events.
3. `Your Analytics Say 1 Sale. Your Code Sent 3.` (44) : the report-versus-raw gap, which is the part most teams have never checked.
4. `Three Emitters, One Order: Fixing Duplicate Purchase Events` (59) : literal, keyword-dense, good for engineers searching the exact problem.
5. `GA4 Hid the Duplicate. The Code Still Sent It.` (46) : for the analytics crowd; names the documented dedup behavior without overclaiming it.
6. `Fix the Emitters. Then Verify the Reporting.` (44) : the closing line as a thesis; good for shares and reposts.

### Description

One click. One completed order. Three purchase events received for it, same transaction ID, three different senders. Here is what went wrong.

In this episode we build a small purchase-confirmation page in Node on a laptop, with one synthetic order and a plain local event collector that records every message it receives and deduplicates nothing. The collector is labelled "LOCAL EVENT COLLECTOR, NOT GA4" on every screen that shows it, because it is not GA4 and does not reproduce GA4's logic.

Three pieces of code are listening for the order to complete: the app's purchase handler, a simulated tag-manager trigger on the same event bus, and the confirmation component, which fires purchase every time it mounts. One click: 3 envelopes received. Same event name, same transaction_id T-20261025-0001, timestamps 7 and 14 milliseconds apart. Not three orders. Three claims on one order.

Then we repair it. The purchase handler that runs when the order actually completes is the one authoritative emitter. The tag-manager trigger is removed. The component still renders and no longer reports. Retest: complete the same order, remount the component twice. Received count: 1, from app.purchaseHandler. The regression suite runs 8 tests, 8 pass, including a known-positive control that proves the flawed page emits three, and a documented LIMIT test showing what the fix does not do.

Accuracy notes: three raw envelopes are not three GA4 conversions. GA4 documents deduplicating purchase by matching transaction_id on web data streams; that covers purchase, not every event, and it hides duplication rather than fixing it. One emitter in this tested scenario is not exactly-once delivery across reloads, retries or devices. Order-level idempotency is a separate design concern and is not implemented here.

Chapters
00:00 One order, three purchase envelopes
00:12 Rewind: one click, one completed order
00:21 Three emitters into the collector
00:37 Inspect: event, transaction ID, emitter, timestamp
00:49 The problem: several components claim one event
01:09 Choose one authoritative emitter
01:16 Remove the trigger and the mount emission
01:26 Retest: complete, then remount twice
01:32 Received count: 1, and the limits
01:47 Fix the emitters. Then verify the reporting.

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep02/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

duplicate purchase events, web analytics, ga4, transaction_id, event deduplication, tag manager, google tag manager, analytics data quality, conversion tracking, event ownership, ecommerce analytics, node.js, javascript, idempotency, known-positive control, regression test, event bus, component lifecycle, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with one synthetic order. The collector is a plain recorder labelled NOT GA4; it reproduces no platform's logic, and this is not a finding about any real product. Fixture, 8 tests and source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

One click. One completed order. Three purchase envelopes in the collector, same transaction_id, three emitters.

Episode 2 of Web Reality Checks. Three pieces of code each think they own one business event.

The fixture: a Node page, an event bus, a loopback collector storing raw envelopes with no dedup. Three paths emit purchase: app.purchaseHandler, a tag-manager trigger on the same bus, ConfirmationComponent.onMount. One completeOrder: 3 envelopes. Remount: a fourth.

The repair: one authoritative emitter, tied to the state change, not the screen. Remove the tag trigger and the mount emission. Retest with two remounts: count 1. 8 tests, 8 pass, with a known-positive control asserting the flawed page emits 3.

Two things I would push on any team:

1. Count raw envelopes by event + transaction_id + emitter before trusting a report. GA4 documents dedup of purchase by transaction_id on web streams. That covers purchase only, and hides duplication rather than fixing it.

2. Emitter ownership is not idempotency. A LIMIT test shows replaying completeOrder still emits twice. Retries and reloads need their own design.

Synthetic fixture, collector is not GA4, no real product.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebAnalytics #SoftwareEngineering #GA4

### Post 2: non-technical leaders

Your analytics tool says one sale. Your website may have reported it three times. The dashboard cannot tell you.

Episode 2 of Web Reality Checks, on a local fixture with one synthetic order. One click, one completed order. Behind the screen, three pieces of code each sent a "purchase" message: the checkout code, a marketing tool, and the thank-you screen, every time it appeared.

Three employees writing the same sale in the ledger. Nobody was told they were the only one.

Why the dashboard may not show it: GA4 documents collapsing purchase events that share a transaction ID on websites. The report looks right while the code sends three. Purchases only, and it hides the problem, not fixes it.

The fix is a decision as much as code: one owner per event, written down. Afterward, the same order plus two redraws of the thank-you screen gave 1 message.

Five questions:
1. Which single piece of code sends each event?
2. Does the tag manager also fire it?
3. Does the thank-you screen send anything when it appears?
4. Have we counted raw messages for one order, not just the report?
5. Is there a test proving the broken version sends duplicates?

Synthetic fixture, no real product. Video, write-ups: github.com/mizcausevic-dev/web-reality-checks

#Analytics #ProductManagement #Ecommerce

## X/Twitter thread

1/ One click. One completed order. Three purchase envelopes in the collector, same transaction_id, three different senders, 7 and 14 ms apart. Episode 2 of Web Reality Checks: three pieces of code that each think they own one business event. Thread.

2/ A purchase is one state change: order goes from pending to complete. An analytics event is a message about that change. Several components can notice it: the app handler, a tag-manager trigger on the same bus, the confirmation component on mount. Each sends its own message.

3/ The fixture: Node page, in-process event bus, loopback collector labelled NOT GA4 that stores raw envelopes with no dedup. Flawed mode: 2 listeners on order:completed plus a mount emission. completeOrder once: count 3. Remount the component: count 4. Local synthetic fixture.

4/ Why nobody notices: GA4 documents deduplicating purchase by matching transaction_id on web data streams. The report can show one while the code sends three. That covers purchase, not every event. It hides duplication; it does not fix it. Count the raw layer first.

5/ The repair: one authoritative emitter, tied to the state change, not the screen. app.purchaseHandler owns purchase. Remove the tag-manager trigger. Remove the mount-handler emission. The component still renders. It no longer reports.

6/ Retest: complete the same order, remount the component twice. Received count: 1, from app.purchaseHandler. 8 tests, 8 pass, including a KNOWN-POSITIVE CONTROL that asserts the flawed page emits 3. If the test cannot see the flaw, the fix test proves nothing.

7/ Scope: one emitter in this tested scenario is not exactly-once delivery across reloads, retries or devices. A LIMIT test shows replaying completeOrder still emits twice; order-level idempotency is a separate design. No real browser, tag manager or GA4 was used.

8/ Fix the emitters. Then verify the reporting. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture showing one order producing three purchase events from three emitters, with the one-owner fix, a known-positive control and a documented idempotency limit

**First comment:** This is a deliberately constructed local fixture with one synthetic order; the three emitters (app handler, simulated tag-manager listener, component mount handler) were configured by hand to show the mechanism, and the collector is a plain loopback recorder labelled NOT GA4 that applies no deduplication and does not reproduce any platform's logic. The repair is one authoritative emitter tied to the order-completion state change, which brings the raw count from 3 to 1 in the tested scenario, with 8 tests including a control that asserts the flawed configuration emits three. The README is explicit that GA4 documents purchase dedup by transaction_id on web streams only, that this is not exactly-once delivery, and that order-level idempotency is a separate concern the suite documents with a LIMIT test rather than fixing.

## Short-form hook lines (≤ 12 words)

1. One click. One order. Three purchase events. Same transaction ID.
2. Your dashboard says one sale. Your code sent three.
3. Three pieces of code, each sure it owns the purchase.
4. The thank-you screen was reporting a sale every time it appeared.
5. Fix the emitters. Then verify the reporting.

## Alt text

**hero.png:** One completed order, transaction T-20261025-0001, shown beside three received purchase envelopes in a local event collector labelled "LOCAL EVENT COLLECTOR, NOT GA4"; each envelope has the same event name and transaction ID and a different emitter: app.purchaseHandler, tagManager.purchaseTrigger, ConfirmationComponent.onMount.

**thumbnail.png:** Episode thumbnail for "One Click. Three Purchase Events. Here's What Went Wrong." showing a single order-completion signal splitting into three event envelopes headed for a collector, with the count 3 beside one order.
