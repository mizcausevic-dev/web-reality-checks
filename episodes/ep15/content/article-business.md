SEO title (≤60 chars): Your Customer Paid Once. Why Did They Get Two Orders?
Meta description (≤155 chars): Duplicate orders after one checkout are not a double-click problem. Why a demo cannot show this, the mechanism in plain terms, and five questions to ask.
Slug: idempotency-keys-duplicate-orders
Primary keyword: duplicate orders   Secondary keywords (3–5): duplicate charges after retry, checkout reliability, idempotency explained, payment system risk, vendor due diligence questions
Medium tags (5): Product Management, Startup, Ecommerce, Software Development, Leadership

# You Clicked Pay Once. Why Did the App Create Two Orders?

![One tap on Pay produces two order rows in the database; the first request committed, its response was lost, the retry inserted again](../hero.png)

## The symptom as a business event

A customer taps Pay once. Their screen shows a spinner, then an error: "Something went wrong, please try again." They try again. It works. Two days later they write in: there are two orders on their account for the same thing.

Support refunds the second one. Engineering sees two valid requests from the same customer a few seconds apart and closes the ticket as "user clicked twice." The customer did not click twice. They did what the error message told them to do.

This episode reproduces that event on a local fixture with synthetic data: one checkout attempt, with the response deliberately lost after the server saved the order, followed by one retry. The vulnerable version ends with two orders. The corrected version ends with one, and the retry receives the original confirmation (local synthetic fixture). The difference is whether the server can recognize the second request as the same intention.

## Why a demo cannot show this

A demo runs on a good network in a quiet room. The request goes out, the response comes back, the confirmation screen appears. The gap this episode is about only opens when a response is lost on its way back after the server has already finished the work.

That is not a rare edge case. It is what mobile networks, flaky Wi-Fi and load balancer timeouts do routinely. The server finished. The customer never heard. All the customer's device can say is "I do not know whether that worked," which in practice becomes a retry.

The demo answers "does checkout work when everything goes right?" The question that costs money is "what happens when the confirmation never arrives?" If nobody has written a test that loses the response on purpose, nobody knows.

## The mechanism in plain terms

Think of mailing a check with a note that says "please deposit this." The bank deposits it. The bank's confirmation letter back to you is lost in the mail. You have no idea whether the check cleared. If you mail a second check, the bank deposits that one too, because each envelope looks like a new instruction.

Now put a reference number on the note: "payment attempt 4471." If the confirmation is lost and you send a second note with the same number, the bank looks up 4471, sees it already deposited that check, and sends you the original confirmation instead of depositing again. A note with a new number is a new payment.

That reference number is what engineers call an idempotency key. Three details make the analogy hold. The number is tied to the customer and the kind of operation, so references cannot collide across customers. The bank records the deposit and the reference in the same ledger entry, so one never exists without the other. And the bank checks what the note asked for: in the fixture, reusing the same reference with a different quantity is refused with an error, because a changed quantity is a different purchase (local synthetic fixture).

The fixture also shows what the fix is not: disabling the Pay button. The second request came from a retry after an error, not a double click. The fix lives on the server, where the memory of the first request lives.

## What to ask your team or vendor

1. If a customer's confirmation is lost after the server has saved the order, what happens when they try again? Ask for a test that loses the response on purpose and shows one order at the end.
2. Is each repeated attempt identified by a key tied to the signed-in customer on the server, rather than to a customer ID the browser supplies? Anything the browser sends can be changed.
3. Is uniqueness enforced by the database itself, or by code that checks first and then inserts? Check-then-insert fails when two requests check at the same moment.
4. Are the order and its "already done" record saved in a single database transaction? Saved separately, there is a window where one exists without the other.
5. Who owns the same safeguard at the payment provider? The database transaction covers only the local order. A real charge is an external action that needs its own idempotency key at the provider and a reconciliation process.

If the answers are vague, the honest state of your checkout is "unknown," not "reliable."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The visible cost is refunds and support time, one ticket at a time, each opened by a customer who did nothing wrong. Because the logs show two valid requests, the pattern is easy to misdiagnose as customer error, so the fix gets deferred and the tickets keep coming.

The quieter cost is trust at the moment it matters most. Checkout is where a customer decides to hand you money. A duplicate order teaches them the system cannot be trusted with that decision, and a refund does not fully undo the lesson. In a subscription or marketplace model, the same mechanism duplicates subscriptions and payouts, not just line items.

The structural cost is that the flaw is systemic. Every state-changing action a client can retry has the same gap. A team that discovers this in production tends to discover it one endpoint at a time.

One limit to carry into any conversation: fixing the local order record does not fix a double charge at the payment provider. That is a separate side effect outside the database transaction, and it needs its own safeguard.

## FAQ

**Why did my customer get two orders when they only paid once?**
Most likely the first request reached the server and was saved, but the confirmation was lost on the way back. The customer saw an error and retried, and the server treated the retry as a new order because it could not recognize it as the same attempt.

**Is this a double-click problem we can fix in the app's interface?**
No. The second request is a retry after a network error, which can also come from a refresh or a second tab. Disabling the button does not address it. The server has to recognize a repeated attempt, which is what an idempotency key provides.

**Does fixing duplicate orders also fix duplicate charges?**
Not by itself. In the fixture, the database transaction covers the local order record only. A charge at a payment provider is outside that transaction and needs its own idempotency key at the provider plus reconciliation.

## Watch the episode

[YouTube link]

Related episodes: [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md) and [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A new request is not always a new intention. Before launch, ask who wrote the test that loses the confirmation on purpose, and ask what the order count was at the end.

Miz Causevic, Kinetic Gain LLC
