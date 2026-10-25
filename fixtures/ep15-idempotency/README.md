# EP15 fixture — idempotent order creation

A loopback-only Node 22 mock order service. "Pay" means "insert a mock order row". No payment
provider is contacted, no money moves, no network leaves 127.0.0.1.

## Files
- `db.mjs` — `node:sqlite` (`DatabaseSync`, in-memory). Tables `orders` and `idempotency` with
  `UNIQUE (user_id, operation, key)`. `createOrderIdempotent()` inserts the order **and** the
  idempotency record in one `BEGIN IMMEDIATE … COMMIT`; a losing concurrent writer hits the UNIQUE
  constraint, is rolled back (its order insert included), and the stored result is returned instead.
  `fingerprintOf()` = SHA-256 of canonical JSON of the **validated, normalised** fields.
- `server.mjs` — HTTP API:
  - `GET /login/:user` test-harness session (`alice`, `bob`), opaque `sid` cookie.
  - `POST /vuln/orders` **vulnerable**: every request inserts one order.
  - `POST /orders` **corrected**: requires `Idempotency-Key` (8–128 chars), scoped to
    `(session user, "create_order", key)`. Same key + same fingerprint → stored result replayed with
    `Idempotent-Replayed: true`. Same key + different fingerprint → `422`. Missing key → `400`.
  - `GET /orders` list for evidence.
  - Controlled fault: header `X-Fault: lose-response` makes the server commit, then destroy the socket
    without writing a response. The client sees `UND_ERR_SOCKET` and cannot tell whether the commit happened.
- `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep15-idempotency/test.mjs
node fixtures/ep15-idempotency/demo.mjs      # writes evidence.json
```
Node 22 prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Deliberate policies
- **Identity** comes only from the server-side session. `X-User-Id` and `body.userId` are ignored
  (tested). Keys are scoped per session user, so Bob reusing Alice's key gets his own order, not hers.
- **Fingerprint** covers validated fields only (`sku`, `qty`, `amountCents`, `currency`), after
  normalisation (sku lower-cased, currency upper-cased). Field order and casing do not change the
  fingerprint; a different `qty` does.
- **Concurrent in-flight same key**: the second and later requests **wait** for the first to finish,
  then resolve against the stored record with their own fingerprint (so a mismatched concurrent
  request still gets `422`). They carry `Idempotent-Waited: true`. The alternative (immediate `409`)
  is equally valid; this fixture implements the wait policy.
- **Correctness does not depend on the in-flight map or the pre-read.** Both are optimisations.
  Test 8 skips the pre-read and proves the UNIQUE constraint + transaction alone resolve the race.
- **Retention**: idempotency records live for the lifetime of the in-memory database. This is a
  fixture policy, not a recommendation of indefinite retention.
- Invalid payloads are rejected (`400`) before any write and leave no idempotency record.

## Executed
```
# tests 13
# suites 0
# pass 13
# fail 0
```
`node demo.mjs` summary (also in `evidence.json`):

| scenario | attempts / requests | orders |
|---|---|---|
| vulnerable, lost response + retry | 2 | **2** |
| corrected, lost response + retry, one key | 2 | **1** |
| corrected, same key, qty 1 → 3 | 1 | 422, still 1 |
| corrected, 5 concurrent, one key | 5 | **1** (4 replayed, 4 waited) |
| corrected, two purchases, two keys | 2 | 2 |

## Limitations / NOT tested
- Nothing here gives exactly-once network delivery. It makes a repeated request *safe*, not impossible.
- The DB transaction covers the local order row and the idempotency record only. A real payment
  provider call is an external side effect **outside** this transaction; it needs its own
  idempotency key at the provider and reconciliation. Not modelled here.
- Record expiry is not implemented. In a service that expires records, a retry arriving after expiry
  would be treated as a new request. Stated, not tested.
- Single process, single SQLite connection. Multi-node deployments need the same UNIQUE constraint
  in the shared database; the in-process wait map would not span nodes (the constraint still would).
- Client-side button disabling is not part of the fix and is not tested; it cannot prevent a retry
  after a lost response, a refresh, or a second tab.
- Session harness (`GET /login/:user`) is not production authentication.
