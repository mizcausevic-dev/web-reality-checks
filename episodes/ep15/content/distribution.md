# EP15 distribution kit: You Clicked Pay Once. Why Did the App Create Two Orders?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep15-idempotency/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `You Clicked Pay Once. Why Did the App Create Two Orders?` (56) : the series title; names the customer's experience and the question the episode answers.
2. `A Lost Response Created a Second Order. Here Is Why.` (52) : states the mechanism in the title, so search intent around retries and duplicates lands here.
3. `Idempotency Keys: Two Attempts, One Order` (41) : names the fix and the fixture's headline result; strongest for engineers searching the term.
4. `A New Request Is Not Always a New Intention` (43) : the closing line of the episode as a thesis; good for shares.
5. `Disabling the Button Will Not Stop Duplicate Orders` (51) : leads with the wrong fix most teams reach for first.
6. `Why Tapping Pay Once Can Still Charge You Twice` (47) : for general viewers; the customer-side symptom is the hook.

### Description

One tap on Pay. Two orders in the database. The customer did not click twice. The server saved it, lost the response, and counted the retry as new.

In this episode we build a small mock order service on a laptop with synthetic users. "Pay" means "write an order row"; no payment provider is contacted. The first request reaches the server and the database commits order 1. Then the server deliberately destroys the socket before responding. The client sees a network error and cannot know whether the order exists, because no network gives you exactly-once delivery. So the client retries. Disabling the button would not have helped: this is a retry after an error, not a double click. The vulnerable endpoint has no memory of the first request and inserts again. Two attempts, two orders.

Then we repair it. One Idempotency-Key per checkout attempt, reused on every retry, scoped on the server to the session user and the operation, never to a client-supplied user ID. The validated fields are normalized into a fingerprint. The order row and the key record are written in one transaction, and a UNIQUE constraint makes the first writer win, with no check-then-insert race. Retest with the same lost response: two attempts, one order, and the retry receives the original result. Same key with a changed quantity: 422. Five concurrent requests with one key: one order. Two separate purchases with two keys: two orders. The suite runs 13 tests, 13 pass, including a known-positive control that proves the vulnerable endpoint really does duplicate.

What this does not fix: the transaction covers the local database only, not an external payment provider, which needs its own idempotency key and reconciliation. Expired key records would let a late enough retry count as new.

Chapters
00:00 One tap, two orders
00:10 The first request commits order 1
00:19 The response is lost after the commit
00:32 The client retries (a disabled button would not help)
00:42 The vulnerable endpoint inserts again
00:48 The repair: key, scope, fingerprint, one transaction, UNIQUE
01:09 Retest: commit, lose the response, retry with the same key
01:18 Two attempts, one order; 422; five concurrent, one order
01:28 Limits: payment provider, record expiry

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep15/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

idempotency key, idempotency, duplicate orders, retry safety, exactly-once delivery, lost response, distributed systems, node.js, sqlite, unique constraint, database transaction, race condition, check-then-insert, api design, checkout reliability, payment integration, backend engineering, regression test, known-positive control, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic users. "Pay" writes a mock order row; no payment provider is contacted. The lost response is a controlled fault. Not a finding about any real product. Fixture, 13 tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The server committed order 1, then destroyed the socket before responding. The client saw UND_ERR_SOCKET, retried, and the database ended with two orders. Nobody double-clicked.

Episode 15 of Web Reality Checks. The repair is an idempotency key; the argument is where correctness lives:

1. One key per checkout attempt, reused on every retry. Two purchases get two keys.

2. Scoped on the server to (session user, operation, key). X-User-Id and body.userId are ignored.

3. Order row and key record in ONE transaction under a UNIQUE constraint. The losing writer rolls back. One test skips the pre-read and the constraint alone resolves the race. No check-then-insert.

4. Fingerprint of the validated fields stored with the key. Same key, qty 1 to 3: 422.

Results (local synthetic fixture): lost response + retry, 2 attempts, 1 order. Five concurrent, one key: 1 order. 13 tests, 13 pass.

Limits: the transaction does not cover an external payment provider. Record expiry is not implemented; a late enough retry counts as new. No network gives exactly-once delivery; this makes repetition safe, not impossible.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#DistributedSystems #BackendEngineering #SoftwareEngineering

### Post 2: non-technical leaders

A customer taps Pay once, sees "something went wrong, try again," tries again, and gets two orders. Support closes it as "user clicked twice." The user did not.

Episode 15 of Web Reality Checks reproduces this on a local fixture, no real payments. The order was saved. The confirmation was lost on its way back. The device could not know whether the order existed, so it retried. The server counted that as new.

Mail a check with no reference number: the bank deposits it, the confirmation is lost, you send another, the bank deposits that too. A reference number lets the bank say "already done."

Five questions before launch:
1. If the confirmation is lost after the order is saved, what happens on retry? Ask to see the test.
2. Is each attempt identified by a key tied to the signed-in customer on the server, not an ID from the browser?
3. Is uniqueness enforced by the database, or by code that checks then inserts?
4. Are the order and its "already done" record saved in one transaction?
5. Who owns the same safeguard at the payment provider? The database fix does not reach it.

Disabling the Pay button does not fix this. It was a retry, not a double click.

Synthetic fixture, not a real product: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Ecommerce #Leadership

## X/Twitter thread

1/ The customer tapped Pay once. The server saved order 1, then the connection dropped before the confirmation got back. The app retried. Two orders. Nobody double-clicked. Episode 15 of Web Reality Checks: what the server knows vs what the client can know. Thread.

2/ A lost response is not a lost request. The commit already happened. The client sees a network error that carries zero information about server state: maybe saved, maybe never arrived. Both look identical. No network gives you exactly-once delivery, so the client retries.

3/ Disabling the Pay button does nothing here. The second request is a retry after an error, from the app's own error handling, a refresh, or a second tab. The fix has to be on the server, which is the only place that remembers the first request.

4/ The repair: one Idempotency-Key per checkout attempt, reused on every retry. Scoped on the server to (session user, operation, key). Client-supplied user IDs are ignored. Validated fields are normalized into a fingerprint and stored with the key.

5/ Where correctness lives: order row + key record in ONE transaction, UNIQUE constraint on the scope. Losing writer rolls back. One test skips the pre-read and the constraint alone still resolves the race. Check-then-insert is exactly the pattern that loses under concurrency.

6/ Results, local synthetic fixture: vulnerable, lost response + retry, 2 orders. Corrected, same scenario, same key: 1 order, retry gets the original orderId. Same key, qty 1 to 3: 422. Five concurrent, one key: 1 order. Two purchases, two keys: 2 orders. 13 tests, 13 pass.

7/ Limits: the transaction covers the local DB only. A payment-provider call is outside it and needs its own idempotency key plus reconciliation. Record expiry is not implemented; a late enough retry would count as new. The lost response is a controlled fault, not a partition.

8/ A new request is not always a new intention. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture showing how a lost response plus a retry creates a duplicate order, with an atomic idempotency-key repair and a test that skips the pre-read

**First comment:** This is a deliberately constructed local fixture with synthetic users on node:sqlite; "pay" inserts a mock order row and no payment provider is contacted, so it is not a finding about any real product. The lost response is a controlled server-side socket destroy after the commit, the repair scopes the key to (session user, operation, key) under a UNIQUE constraint with the order and key record in one transaction, and the concurrency policy (later in-flight requests wait, rather than 409) is a documented choice rather than a recommendation. The suite is 13 tests including a known-positive control that asserts the vulnerable endpoint duplicates, and the limits (local DB transaction does not cover an external payment provider, record expiry not implemented, single process) are in the README.

## Short-form hook lines (≤ 12 words)

1. One tap on Pay. Two orders. Nobody clicked twice.
2. The server saved it. The customer never heard. So they retried.
3. Disabling the button does not stop a retry after an error.
4. Two attempts, one order. Same key, same intention.
5. A new request is not always a new intention.

## Alt text

**hero.png:** Diagram of a single tap on a Pay button producing two order rows in a database; the first request commits order 1, its response is lost on the way back to the client, and the retry is inserted as order 2 by an endpoint with no memory of the first attempt.

**thumbnail.png:** Episode thumbnail for "You Clicked Pay Once. Why Did the App Create Two Orders?" showing one Pay tap on a checkout screen beside two identical order rows, with a broken response arrow between the server and the client.
