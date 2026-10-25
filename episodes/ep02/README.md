# EP 02 — One Click. Three Purchase Events. Here’s What Went Wrong.

**Central idea.** One completed purchase can trigger multiple event emitters; raw event duplication and platform reporting are separate questions.

## What this fixture is
- `fixtures/ep02-duplicate-purchase-events/` — a purchase-confirmation "page" simulated in Node 22 (an in-process event bus, no browser) plus a loopback-only **local event collector** (`127.0.0.1`, ephemeral port) that records envelopes `{event, transaction_id, emitter, ts}` verbatim with **no deduplication**.
- One synthetic completed order, one stable `transaction_id` (`T-20261025-0001`), generated **per order, never per emission**.
- Three deliberately configured emission paths: `app.purchaseHandler` (application purchase-completion handler), `tagManager.purchaseTrigger` (simulated tag-manager listener on the same bus), `ConfirmationComponent.onMount` (confirmation-component mount handler).
- **Flawed mode**: all three emit for one order → 3 envelopes; remounting the component emits a 4th.
- **Corrected mode**: `app.purchaseHandler` is the single authoritative emitter; the tag-manager purchase trigger is removed; the component only renders, so remounting emits nothing.
- Deliberate policy: the collector is labelled `LOCAL EVENT COLLECTOR — NOT GA4` in every response and is used as the persistent on-screen sim tag for every scene that shows collector output. It does not reproduce GA4's internal logic.
- Deterministic: fixed-epoch clock (+7 ms per tick), no randomness, no wall-clock reads.

## Evidence
- Executed: `node --test fixtures/ep02-duplicate-purchase-events/test.mjs` → `# tests 8  # pass 8  # fail 0` (Node v22.23.4). Includes a known-positive control asserting the flawed page emits 3 envelopes for one order, and a documented-LIMIT test asserting that replaying the same completion action still emits again (deliberately not fixed).
- Executed: `node fixtures/ep02-duplicate-purchase-events/demo.mjs` → `fixtures/ep02-duplicate-purchase-events/evidence.json`: flawed run `receivedCount: 3` (emitters `app.purchaseHandler` @ `09:00:00.000Z`, `tagManager.purchaseTrigger` @ `.007Z`, `ConfirmationComponent.onMount` @ `.021Z`, all `event: purchase`, all `transaction_id: T-20261025-0001`); corrected run `completeOrder → 1`, `remountConfirmation() ×2 → 1`, `receivedCount: 1`, emitter `app.purchaseHandler`, `purchaseListenersOnBus: 1`.
- Executed: `cd video && npx tsc --noEmit` → no errors in `src/episodes/ep02/` (checked with a placeholder `timeline.json` from `build-timeline.mjs ep02 --no-audio`; the orchestrator regenerates it from real audio).
- Observed: every number shown in `video/src/episodes/ep02/Scenes.tsx` (3, 1, the three emitter names, the three timestamps, the per-action counts) is copied from `evidence.json`.
- Blocked: no narration audio generated, no MP4 rendered, no inspection frames — the orchestrator does those and fills `render-evidence.json`.
- Predicted: narration is 258 words; at the builder's 2.55 words/s estimate that is ≈101 s speech, ≈104 s total with lead/tail. Actual timing comes from the generated audio.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep02      # needs video/public/ep02/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep02 --concurrency 2
```
Fonts: the renderer uses Inter and DejaVu Sans Mono if installed; otherwise system fallbacks.

## Accuracy (from the brief; each is stated in narration/on-screen text)
- Three received envelopes are **raw emissions, not three GA4 conversions** (scenes `fail`, `problem`, `end`).
- GA4 documents purchase deduplication using matching `transaction_id` **for web data streams** (scene `problem`).
- That covers the `purchase` event; transaction IDs are **not** implied to deduplicate all event types (scene `problem`).
- One `transaction_id` **per order, not per emission** (fixture, test 7, scene `inspect`).
- No promise of **exactly-once delivery** across reloads, devices, retries or distributed systems (scenes `count`, `end`).
- Robust **order-level idempotency** is a separate design concern, not implemented; the LIMIT test documents it (scene `count`).
- The simulation is **not a reproduction of GA4's internal logic**; the collector is a plain recorder (sim tag on every collector scene; scenes `problem`, `end`).

## Limitations
- Simulated: the page, the tag-manager listener, the component lifecycle and the collector are all in-process Node code. No real browser, tag manager, GA4 or Measurement Protocol was used. The "checkout" and "confirmation" panels in scenes `rewind` are labelled illustrative and mimic no product.
- Measured: only the counts and envelopes in `evidence.json`, from the two scripted runs.
- Not tested: network loss, retries, offline queues, page reload, back/forward cache, multiple tabs, multiple devices, server-side order verification, what any analytics platform would report.
- Scope of the fix: one owner per business event in the tested scenario. It does not make the analytics pipeline correct in general and does not provide idempotency.
- The event-ownership checklist is in `fixtures/ep02-duplicate-purchase-events/README.md`.
