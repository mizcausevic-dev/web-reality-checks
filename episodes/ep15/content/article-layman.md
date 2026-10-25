SEO title (≤60 chars): Why Tapping Pay Once Can Still Charge You Twice
Meta description (≤155 chars): You tapped Pay once, saw an error, tried again, and ended up with two orders. A plain-language look at why that happens and what the fix actually is.
Slug: idempotency-keys-duplicate-orders
Primary keyword: why did I get charged twice   Secondary keywords (3–5): duplicate order after error, tapped pay once two orders, online checkout error try again, what is an idempotency key, app retry explained
Medium tags (5): Technology, Explainer, Online Shopping, Consumer, Software

# You Clicked Pay Once. Why Did the App Create Two Orders?

![One tap on Pay produces two order rows in the database; the first request committed, its response was lost, the retry inserted again](../hero.png)

You order a coffee at a busy counter. You say your order, hand over the money, and the barista turns away to make it. The room is loud. You never hear "got it." After a long pause you wonder if they heard you at all, so you order again. Two coffees arrive, and you are out the price of both.

You did not order twice on purpose. You ordered once, got no answer, and did the only sensible thing a person can do when they do not know whether they were heard. That is this entire episode.

## What the episode shows

We built a small pretend shop on a laptop with made-up users and a made-up product. Nothing here is real money or a real company (local synthetic fixture). "Pay" in this shop just means "write down an order."

A customer taps Pay once. The request reaches the shop's server, which writes down order number one. Then we cut the connection on purpose, after the order is saved and before the "success" message can travel back. On the customer's screen, that looks like a network error. The app has no idea whether the order went through. Neither would you.

So the app tries again, as the error message suggests. The flawed version of the shop has no memory of the first attempt. It sees a normal request and writes down order number two. One tap, two orders (local synthetic fixture).

## Why "just disable the button" does not fix it

The usual reaction is to grey out the button after the first tap. That would help if the problem were an impatient thumb. It is not. The second request came from a retry after an error, the kind your app, a refresh, or a second tab will send on your behalf. The button was not the problem. The barista's memory was.

## The fix, in one sentence

Give every order attempt a ticket number, and have the counter remember it. Imagine you hand over a numbered slip with your order. If you never hear back and come up again with the same slip, the barista checks the number, sees your coffee is already being made, and tells you so. No second coffee. A new slip is a new order, and you get a second coffee because you asked for one.

That is what the fixed version does. Same lost connection, same retry, but the retry carries the same ticket number. The server finds the first order and hands back the original confirmation. One tap, one order (local synthetic fixture). Five identical requests at the same moment with one ticket number: still one order. Two separate purchases with two numbers: two orders, because two were wanted.

One more guard: if someone reuses a ticket number but changes the order, say from one coffee to three, the fixed server refuses with an error instead of guessing. A changed order is a different order (local synthetic fixture).

## What this means for you

- If you tap Pay, see an error, try again, and later find two orders, you did nothing wrong. The app treated your retry as a new order because it could not recognize it as the same one. Tell the seller exactly that.
- A spinner followed by "please try again" does not mean your first attempt failed. It means the app never heard back. Before retrying a payment, check your email or order history; the first one may already be there.
- If you build apps, or pay someone who does: the fix is on the server, not in the button. Ask whether the shop remembers each attempt by a ticket number, and whether someone has tested it by cutting the connection on purpose.

## FAQ

**I tapped Pay once and got charged twice. How?**
Your first request probably reached the server and was saved, but the confirmation was lost on the way back. You saw an error and tried again, and the server had no way to tell that the second request was the same attempt, so it created a second order.

**Would disabling the Pay button after the first tap have prevented it?**
No. The second request was a retry after a network error, not a double tap. A refresh or a second tab can do the same thing. The server has to recognize a repeated attempt, which is what the ticket number (an idempotency key) is for.

**Does this fix mean I can never be double charged?**
Not quite. The fix protects the shop's own order records. A charge at a card processor is a separate step that needs its own safeguard. And if the shop forgets old ticket numbers after a while, a very late retry could be treated as new.

## Watch the episode

[YouTube link]

Related episodes: [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md) and [100% Uploaded. Why Isn't My File Ready?](../../ep14/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Ordering again when nobody answered is not a mistake. A counter that cannot remember your ticket is.

Miz Causevic, Kinetic Gain LLC
