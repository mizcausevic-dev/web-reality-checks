SEO title (≤60 chars): Idempotency Keys: Why a Retry Created a Second Order
Meta description (≤155 chars): A lost response after a database commit makes a retry create a duplicate order. The fixture, the control test, and the atomic idempotency-key repair.
Slug: idempotency-keys-duplicate-orders
Primary keyword: idempotency key   Secondary keywords (3–5): duplicate orders on retry, idempotent POST, exactly-once delivery, unique constraint race condition, lost response retry
Medium tags (5): Software Engineering, Distributed Systems, Node.js, Backend Development, API Design

# You Clicked Pay Once. Why Did the App Create Two Orders?

![One tap on Pay produces two order rows in the database; the first request committed, its response was lost, the retry inserted again](../hero.png)

One tap on Pay. Two orders in the database. The customer did not click twice: the first request committed, its response never arrived, and the retry that followed was treated as a brand new intention.

This is episode fifteen of Web Reality Checks: the gap between what the server knows (the order exists) and what the client can know (nothing, after a network error), demonstrated on a local fixture with synthetic data, then repaired and retested. The repair is an idempotency key. The interesting part is where correctness has to live for the key to mean anything.

## What actually happens

The browser sends `POST /orders`. The server authenticates the session, validates the body, writes a row, and the database commits. From the server's view the work is done.

Now lose the response. Not the request, the response. The socket drops after the commit and before the client reads a status line. The client sees a network error that carries no information about server state: the commit may have happened, or the request may never have arrived. Both look identical from the browser. No transport gives you exactly-once delivery, so a client that cares about the outcome must retry, and a retry is a second request.

The vulnerable endpoint has no memory of the first request. It sees a valid POST and inserts again. Two attempts, two orders. A double click did not cause this. Disabling the Pay button does nothing here, because the second request is a retry after an error, issued by the client's error handling, a refresh, or a second tab. Only the server can recognize "this is the same intention I already fulfilled."

## The fixture

`fixtures/ep15-idempotency/` is a loopback-only Node 22 mock order service on `node:sqlite` (in-memory). "Pay" means "insert a mock order row". No payment provider is contacted. Identity comes only from a server-side session cookie; `X-User-Id` and `body.userId` are read by nothing.

`POST /vuln/orders` inserts one order per request. `POST /orders` requires an `Idempotency-Key` header, scoped to `(session user, create_order, key)`. The schema puts the guarantee where a race cannot bypass it:

```sql
CREATE TABLE idempotency (
  user_id     TEXT NOT NULL,
  operation   TEXT NOT NULL,
  key         TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status      INTEGER NOT NULL,
  body        TEXT NOT NULL,
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  created_at  TEXT NOT NULL,
  UNIQUE (user_id, operation, key)
);
```

The fingerprint is SHA-256 of canonical JSON of the validated, normalized fields only (`sku`, `qty`, `amountCents`, `currency`). Field order and casing do not change it; a different quantity does. Validation drops everything else, so a client-supplied `userId` cannot reach it.

The corrected write is one transaction. Order row and idempotency record are inserted together, and the `UNIQUE` constraint decides who wins:

```js
sql.exec('BEGIN IMMEDIATE');
try {
  const orderId = Number(insOrder.run(userId, fields.sku, fields.qty, fields.amountCents, fields.currency, via, now()).lastInsertRowid);
  const body = JSON.stringify({endpoint: 'corrected', orderId, authenticatedAs: userId, sku: fields.sku, qty: fields.qty, amountCents: fields.amountCents, currency: fields.currency});
  insIdem.run(userId, operation, key, fingerprint, 201, body, orderId, now());
  sql.exec('COMMIT');
  return {kind: 'created', status: 201, body, orderId};
} catch (e) {
  sql.exec('ROLLBACK'); // the order insert is undone with the failed key insert
  if (/UNIQUE constraint failed/.test(e.message)) {
    return resolveExisting(getIdem.get(userId, operation, key), fingerprint);
  }
```

A losing writer hits the constraint, rolls back (order insert included), and gets the stored record instead. Matching fingerprint: the original 201 with `Idempotent-Replayed: true`. Different fingerprint: 422.

The controlled fault is three lines in the response path. The write has already committed either way:

```js
const respond = (req, res, code, body, headers) => {
  if (req.headers['x-fault'] === 'lose-response') { res.socket?.destroy(); return; } // commit happened; response lost
  json(res, code, body, headers);
};
```

The client sees `UND_ERR_SOCKET` and cannot tell whether the commit happened.

## The test that proves it

`node --test fixtures/ep15-idempotency/test.mjs` reports `# tests 13  # pass 13  # fail 0` (local synthetic fixture). The names state the contract:

- `unauthenticated POST is rejected on both endpoints`
- `KNOWN-POSITIVE CONTROL: lost response + retry on the vulnerable endpoint creates TWO orders`
- `corrected endpoint: lost response + retry with the same key creates ONE order (two attempts)`
- `corrected endpoint: Idempotency-Key is required`
- `same key, same request (different field order / casing) -> identical stored result, no new order`
- `same key, materially different request -> 422 and no new order`
- `concurrent same-key requests -> exactly ONE order; the second waits and receives the stored result`
- `DB layer: the UNIQUE constraint alone (pre-check skipped) resolves a lost race and rolls back the extra order`
- `control: concurrent requests on the vulnerable endpoint create N orders`
- `different logical purchases need different keys -> two orders`
- `keys are scoped to the session user: Bob reusing Alice's key gets his own order, not hers`
- `client-supplied user id is ignored: body.userId / X-User-Id cannot move the order or the key scope`
- `invalid payload is rejected before any write, and does not create an idempotency record`

The known-positive control's assertion message says why it exists: "the flaw must be observable or the fix test proves nothing."

The DB-layer test proves where correctness lives. It calls `createOrderIdempotent` with `skipPrecheck: true`, so the optimizing `SELECT` never runs, then writes the same key twice plus once with a different quantity. Result: one `created`, one `replayed` with the same `orderId`, one `mismatch` at 422, one order row. The constraint and the transaction alone resolve the race. Check-then-insert loses under concurrency: two requests both read "no record", both insert, two orders.

## The repair

Generate one idempotency key per logical checkout attempt on the client and send it on every retry of that attempt. On the server, scope the key to the session user and the operation, never to any identity the client claims. Derive a fingerprint from the validated fields, and write the order and the idempotency record in one transaction under a `UNIQUE` constraint.

Three fixture decisions are documented policies, not universal laws. Concurrent in-flight requests with the same key wait for the first writer and receive the stored result with `Idempotent-Waited: true`; an immediate 409 would be equally valid. Records live for the lifetime of the in-memory test database, which is not a recommendation of indefinite retention. A same-key request with a different fingerprint returns 422, because a changed quantity is a different purchase. The in-process wait map does not span nodes; the database constraint does.

## Retest

From `evidence.json` (local synthetic fixture):

- Vulnerable, lost response then retry: attempt 1 `UND_ERR_SOCKET`, attempt 2 status 201. Order count 2.
- Corrected, same scenario, one key: attempt 1 `UND_ERR_SOCKET`, attempt 2 status 201 with `Idempotent-Replayed: true` and the same `orderId` (1). Order count 1.
- Corrected, same key, `qty` 1 to 3: status 422. Order count still 1.
- Corrected, five concurrent requests, one key: all five 201, all return `orderId` 1, four replayed, four waited. Order count 1.
- Corrected, two purchases, two keys: order count 2.

The key identifies the attempt, not the cart.

## What this does not prove

- Nothing here gives exactly-once network delivery. The repair makes a repeated request safe; it does not make repetition impossible.
- The transaction covers the local `orders` and `idempotency` rows only. A real payment-provider call is an external side effect outside it and needs its own idempotency key at the provider plus reconciliation. Not modeled, not tested.
- Record expiry is not implemented. In a service that expires records, a retry arriving after expiry would be treated as new. Stated, not demonstrated.
- The lost response is a deliberate server-side socket destroy, not a real network partition. The counts, statuses and headers are actual fixture outputs.
- Single process, single SQLite connection. The session harness is not production authentication. The vulnerable fixture must never be deployed.

## Launch checklist

1. Every state-changing endpoint a client may retry accepts an idempotency key; the client generates one key per logical attempt and reuses it on every retry.
2. The key is scoped server-side to the authenticated user and the operation. No client-supplied user ID participates.
3. Uniqueness is enforced by a database constraint, not a read followed by a write. A test skips any pre-read and still ends with one row.
4. The result record and the business row are committed in one transaction.
5. A fingerprint of the validated, normalized request is stored with the key; a same-key request with a different fingerprint is rejected, not replayed.
6. The policy for concurrent same-key requests (wait, or 409) and the retention period are written down, with the consequence of expiry stated.
7. Any payment-provider call carries its own provider-side idempotency key and a reconciliation path, because the local transaction does not cover it.

## FAQ

**What is an idempotency key and how does it prevent duplicate orders?**
A unique value the client generates once per checkout attempt and sends with every retry. The server stores it with the result in the same transaction as the order, under a unique constraint. A retry with the same key gets the stored result back instead of a second order.

**Why does disabling the Pay button not prevent duplicate orders?**
The duplicate comes from a retry after a lost response, not a double click. Error handling, a page refresh or a second tab can all resend the request. Only the server can recognize the second request as the same intention, which is what the idempotency key is for.

**Should an idempotency key be checked with a SELECT before the INSERT?**
Only as an optimization. Two concurrent requests can both read "no record" and both insert. Put a unique constraint on (user, operation, key) and write the order and key record in one transaction; the losing writer rolls back.

## Watch the episode

[YouTube link]

- 00:00 One tap, two orders
- 00:10 The first request commits order 1
- 00:19 The response is lost after the commit
- 00:32 The client retries (a disabled button would not help)
- 00:42 The vulnerable endpoint inserts again
- 00:48 The repair: key, scope, fingerprint, one transaction, UNIQUE
- 01:09 Retest: commit, lose the response, retry with the same key
- 01:18 Two attempts, one order; 422; five concurrent, one order
- 01:28 Limits: payment provider, record expiry

Related episodes: [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md) and [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A new request is not always a new intention. Let the client say "same attempt," and let the database, not the handler, enforce it.

Miz Causevic, Kinetic Gain LLC
