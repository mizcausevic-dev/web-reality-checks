# EP 29 — The Browser Said $10. What Price Did the Server Trust?

**Central idea.** The browser can display a price, but the server must determine the authoritative price used to create an order.

## What this fixture is
- `fixtures/ep29-server-side-price/` — loopback-only Node 22 mock checkout on `node:sqlite` with a server-side product catalog, integer cents, one currency (USD), quantities bounded to 1..100, synthetic orders, and no payment provider.
- Flawed endpoint `POST /vuln/orders` trusts the client's `unitPriceCents`. Corrected endpoint `POST /orders` takes `productId`, `quantity`, `expectedUnitPriceCents` (comparison only), reads the catalog price inside one `BEGIN IMMEDIATE` transaction, and stores an order-line price snapshot.
- Deliberate policy: any difference between expected and current price (up or down) returns `409 price_changed` with the current quote and creates no order; a new attempt needs `confirmPriceCents` equal to the current price.
- Explicitly excluded: taxes, discounts, shipping, inventory reservation, payment. The fix is **not** a price lock.

## Evidence
- Executed: `node --test fixtures/ep29-server-side-price/test.mjs` → `# tests 37`, `# pass 37`, `# fail 0` (includes two known-positive controls: tampered price on the flawed endpoint, and a reprice in the gap when no transaction is used).
- Executed: `node fixtures/ep29-server-side-price/demo.mjs` → `evidence.json`: flawed 201 with stored total 200¢ vs catalog total 2000¢; corrected altered request 409, 0 orders; honest request 201 snapshot 1000¢; catalog moved to 1200¢ → 409 quote 2400¢, 0 orders, then confirmed 201 snapshot 1200¢; second connection mid-transaction → `busy`, snapshot 1000¢; no-transaction control → reprice `ok`, snapshot 1000¢ vs catalog 1200¢.
- Executed: the barrier uses a worker-thread SQLite connection and Atomics; it is real concurrency at one chosen interleaving.
- Observed / Predicted / Blocked: not applicable to the fixture results. Narration audio and MP4 are not produced by this build step (orchestrator renders).
- Page and button visuals are labelled illustrative; they are not a real product UI.

## Accuracy checklist (from the brief)
- Expected price is a comparison value only (narration `fix`, on-screen "comparison only").
- Malformed, negative, fractional, zero, excessive quantities rejected (tested; narration `retest`; on-screen "Quantity range is 1 to 100").
- Unknown and unavailable products rejected (tested; `retest`).
- Arithmetic stays inside the safe-integer range (tested, 422; stated in the fixture README).
- No floating-point currency (integer cents, BigInt formatting; tested).
- Transaction strategy specific to SQLite (`BEGIN IMMEDIATE`; named on screen and in the README).
- No silent price-lock claim (narration `confirm`, on-screen "NOT A PRICE LOCK").
- No real payments (on-screen `tamper`, `end`).
- Exclusions stated (narration and on-screen in `end`).

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep29      # from narration audio in video/public/ep29/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep29 --concurrency 2
```
`video/src/episodes/ep29/timeline.json` currently holds a `--no-audio` estimate (about 2.55 words per second); rebuild it from the real audio.

## Limitations
- The transaction-consistency test covers one deterministic interleaving through the store function, not HTTP, and only SQLite's write-lock behaviour. Other databases need their own strategy.
- No price lock, taxes, discounts, shipping, inventory reservation, payment, idempotency, or authentication.
- Scene animation timing was set against the estimated timeline; check against the real audio length after the orchestrator builds the timeline.
