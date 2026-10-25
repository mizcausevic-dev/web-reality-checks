# EP29 fixture — the server determines the order price

A loopback-only Node 22 mock checkout. "Order" means "insert a mock order row". No payment provider is
contacted, no money moves, nothing leaves 127.0.0.1. Zero npm dependencies (`node:sqlite`, `node:http`,
`node:test`, `node:worker_threads`).

## Files
- `store.mjs` — SQLite schema, validation, and the three order paths. Tables: `products` (the pricing
  authority), `orders`, `order_lines` (`unit_price_cents` is the **price snapshot**). Money is integer cents, one
  currency (USD), enforced by `CHECK` constraints and `INTEGER` columns.
  - `createOrderFlawed` — uses the client's `unitPriceCents` as the price (the flaw).
  - `createOrderCorrected` — ONE `BEGIN IMMEDIATE … COMMIT` transaction: read catalog row, compare, insert order +
    order line with the snapshot. On mismatch: `ROLLBACK`, return the current quote, no order.
  - `createOrderNoTransaction` — test-only control (not on HTTP) with the read and the insert as separate statements.
- `server.mjs` — HTTP API: `GET /catalog`, `GET /catalog/:id`, `POST /vuln/orders` (flawed),
  `POST /orders` (corrected), `GET /orders`.
- `barrier.mjs` + `price-writer.mjs` — a second, independent SQLite connection in a **worker thread**, driven through
  `SharedArrayBuffer`/`Atomics` so the main thread can block on it from inside a transaction hook (the barrier).
- `test.mjs`, `demo.mjs` -> `evidence.json`.

## Run
```
node --test fixtures/ep29-server-side-price/test.mjs
node fixtures/ep29-server-side-price/demo.mjs      # writes evidence.json
```
Node 22 prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Corrected endpoint contract
`POST /orders` body: `{productId, quantity, expectedUnitPriceCents, confirmPriceCents?}`

| outcome | status | notes |
|---|---|---|
| created | 201 | `unitPriceCents` is the catalog price read inside the transaction; `totalCents = unit × quantity` |
| price changed | 409 `price_changed` | any difference (up **or** down). Body has `quote` (current price, total) and `confirmWith`. **No order.** |
| invalid field | 400 | malformed JSON, non-object, bad `productId`, `quantity`, or price fields |
| unknown product | 404 `unknown_product` | |
| unavailable product | 409 `product_unavailable` | even if the expected price is right |
| total out of range | 422 `total_out_of_range` | exact BigInt check that `unit × quantity ≤ Number.MAX_SAFE_INTEGER` |
| body > 4 KiB | 413 | |
| lock timeout | 503 `busy_try_again` | application connection waits up to 2 s for the write lock |

## Deliberate policies
- **Expected price is a comparison value only.** It is never stored and never used to compute a total. Extra client fields
  (`unitPriceCents`, `totalCents`, …) are ignored (tested).
- **Confirmation:** a new attempt after `price_changed` must send `confirmPriceCents`. When present it replaces the
  expectation and must itself equal the catalog price *inside the new transaction*. If the price moved again, the client gets a
  fresh 409 and quote. Retrying the unchanged request is never silently accepted.
- **Quantity:** integer number, `1 … 100` inclusive (`MAX_QUANTITY = 100`). Strings, floats, 0, negatives, `null`, booleans, arrays,
  objects, missing and `≥ 2^53` values are rejected with 400. The schema repeats the range as a `CHECK`.
- **Price fields:** positive safe-integer *numbers*; strings and fractions are rejected.
- **Money formatting** uses BigInt division; there is no floating-point currency arithmetic anywhere.
- **Transaction strategy is SQLite-specific:** `BEGIN IMMEDIATE` takes the database write lock up front, so no other connection
  can modify `products` until `COMMIT`/`ROLLBACK`. Other databases need their own strategy (row locks, `SERIALIZABLE`, etc.).
- **Excluded explicitly:** taxes, discounts, shipping, inventory reservation, payment, currency conversion, authentication.

## Executed
```
# tests 37
# suites 0
# pass 37
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Includes two known-positive controls: (1) the flawed endpoint stores a $1.00 unit price while the page displays $10.00; (2) with no
transaction, a second connection reprices the product between the catalog read and the insert (the stored snapshot is 1000¢ while the
catalog says 1200¢ at insert time).

`node demo.mjs` summary (also in `evidence.json`):

| scenario | result |
|---|---|
| flawed, page $10.00, request `unitPriceCents: 100`, qty 2 | 201, stored total 200¢ (catalog total 2000¢), 1 order |
| corrected, same altered request | 409 `price_changed`, quote 1000¢ / total 2000¢, 0 orders |
| corrected, honest request | 201, snapshot 1000¢ |
| catalog 1000¢ → 1200¢ after page load | 409, quote 1200¢ / total 2400¢, 0 orders; retry 409; with `confirmPriceCents: 1200` 201, snapshot 1200¢ |
| second connection reprices inside the order transaction | `busy`; snapshot 1000¢; same change succeeds after commit |
| control: no transaction | second connection `ok`; snapshot 1000¢, catalog 1200¢ at insert |

## Limitations / NOT tested
- **Not a price lock.** Nothing reserves a price for a customer. The transaction only makes *this request's* catalog read and order
  insert atomic with respect to other writers on the same SQLite file. Each new attempt is compared to the catalog again.
- The transaction-consistency test calls the store function directly (not through HTTP) so the barrier can sit inside the transaction.
  The barrier is a real cross-thread handshake with a separate connection, but it exercises one interleaving, not every possible one.
- Single machine, single SQLite file. Multi-node or other-database behaviour is not tested.
- JSON `1.0` and `1` are the same number after parsing, so `1.0` cannot be distinguished from `1` and is accepted as `1`.
- No taxes, discounts, shipping, inventory reservation, payment, refunds, idempotency, or authentication. (Duplicate submissions are EP 15's
  topic; identity is EP 01's.)
- Rate limiting, audit logging and price-history retention are not implemented.
