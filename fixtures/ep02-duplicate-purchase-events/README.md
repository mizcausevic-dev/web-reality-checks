# EP02 fixture — duplicate purchase events

A purchase-confirmation "page" simulated in Node 22 (no browser) and a loopback-only **local event collector**. One synthetic completed order with one stable `transaction_id`. Three code paths can emit `purchase`; the flawed configuration lets all three fire for one order.

The collector is labelled **`LOCAL EVENT COLLECTOR — NOT GA4`** in every response. It stores raw envelopes verbatim and applies **no deduplication** of any kind. It is not Google Analytics 4 and does not reproduce GA4's internal logic.

## Files
- `collector.mjs` — `POST /collect` (envelope `{event, transaction_id, emitter, ts}`, 202), `GET /events`, `POST /reset`. Binds `127.0.0.1`, ephemeral port.
- `page.mjs` — in-process event bus with three emitters: `app.purchaseHandler`, `tagManager.purchaseTrigger` (simulated tag-manager listener on the same bus), `ConfirmationComponent.onMount`. `mode: 'flawed' | 'corrected'`. Deterministic clock (fixed epoch, +7 ms per tick); no wall-clock reads, no randomness.
- `test.mjs` — regression tests (`node:test`, zero dependencies).
- `demo.mjs` — the exact video scenario; writes `evidence.json`.
- `evidence.json` — captured event log (the numbers the video shows).

## Run
```
node --test fixtures/ep02-duplicate-purchase-events/test.mjs
node fixtures/ep02-duplicate-purchase-events/demo.mjs
```

## Deliberate policies
- **One `transaction_id` per order**, never per emission. Both runs use `T-20261025-0001`; the second test order uses `T-20261025-0002`.
- **Flawed mode**: the app handler and a tag-manager "purchase" trigger both listen on `order:completed`, and the confirmation component fires `purchase` in its mount handler. One click → three envelopes. Remounting the component sends a fourth.
- **Corrected mode**: `app.purchaseHandler` is the single authoritative emitter. The tag-manager purchase trigger is removed from the bus; the confirmation component only renders. Remounting emits nothing.
- The collector rejects envelopes missing any of the four fields (400) so a malformed emission cannot pass silently.

## Executed
`node --test test.mjs` (Node v22.23.4):
```
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Includes a **known-positive control** (`flawed page emits three purchase envelopes for one order`) and a **documented-limit test** (`replaying the completion action for the same order emits again`), which asserts the thing we do *not* fix.

`node demo.mjs` → `evidence.json`:
- flawed run: `receivedCount: 3`; emitters `app.purchaseHandler`, `tagManager.purchaseTrigger`, `ConfirmationComponent.onMount`; all `event: "purchase"`, all `transaction_id: "T-20261025-0001"`; timestamps `09:00:00.000Z`, `.007Z`, `.021Z`.
- corrected run: `completeOrder` → 1, `remountConfirmation()` ×2 → still 1; `receivedCount: 1`; emitter `app.purchaseHandler`; `purchaseListenersOnBus: 1`.

## Accuracy notes (from the brief; all reflected in the video and README)
- Three received envelopes are three **raw emissions**, not three GA4 conversions. Raw event duplication and platform reporting are separate questions.
- GA4 documents purchase deduplication using matching `transaction_id` for **web data streams**. That applies to the `purchase` event; it does **not** mean transaction IDs deduplicate all event types.
- This fixture does **not** promise exactly-once delivery across reloads, devices, retries or distributed systems. The corrected run shows one emitter in the tested scenario only.
- Robust **order-level idempotency** (not re-emitting when the same completion action replays) is a separate design concern. It is deliberately not implemented; the LIMIT test documents that replaying `completeOrder` emits again.
- Nothing here depicts GA4's internal logic. The collector is a plain recorder.

## Limitations / not tested
- No real browser, no real tag manager, no real GA4 or Measurement Protocol. The "page", the tag-manager listener and the component lifecycle are in-process simulations.
- Network loss, retries, offline queues, page reloads, back/forward cache, multiple tabs and multiple devices are not simulated.
- No server-side verification of the order against a backend is performed.
- The fix is "one owner per business event"; it does not make the analytics pipeline correct in general.

## Event-ownership checklist
1. **One owner per business event.** For each event (`purchase`, `sign_up`, `refund`, …) name exactly one code path that is allowed to emit it. Write it down.
2. **The owner is tied to the state change, not the screen.** Emit `purchase` where the order is confirmed complete, not where the thank-you component renders. Mount/render/visibility handlers must not emit business events.
3. **Audit the tag container.** If a tag-manager trigger also fires the event, either the app code or the trigger is the owner, never both. Remove the other.
4. **One `transaction_id` per order**, generated once and carried unchanged; never per emission, per page view or per emitter.
5. **Inspect the raw log, not the report.** Count envelopes at a local collector or network inspector by `event + transaction_id + emitter`. Platform reports may already deduplicate (GA4 documents this for `purchase` on web streams) and will hide the raw duplication.
6. **Retest with remount and re-navigation.** After the fix, complete the action, remount the component, navigate back and forward; the raw count for that `transaction_id` must stay at one in the tested scenario.
7. **Treat idempotency separately.** Retries, reloads, multi-tab and multi-device replays need an order-level idempotency design of their own; emitter ownership does not provide it.
8. **Keep a known-positive control.** Retain the flawed configuration in tests so that the fix test is proven to detect the duplication.
9. **Then verify the reporting.** Only after raw emissions are correct, confirm what the analytics platform reports for the same transaction IDs.
