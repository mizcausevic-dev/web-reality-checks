SEO title (≤60 chars): Why Your Account Said Past Due After You Paid: Late Messages
Meta description (≤155 chars): Apps update each other by sending messages, and messages arrive late, twice, or out of order. A plain-language look at how a correct message can set a wrong record.
Slug: webhook-duplicates-ordering
Primary keyword: why apps show wrong account status   Secondary keywords (3–5): how apps talk to each other, webhooks explained simply, duplicate notifications, account status wrong after payment, software explainer
Medium tags (5): Technology, Explainer, Software, Internet, Consumer Tech

# Your Webhook Arrived Twice. Then an Older Update Arrived.

![Subscription sub_alpha is active on the pro plan at version 3; a late delivery of version 2 arrives with a valid signature and the naive receiver overwrites the record to past_due on the starter plan](../hero.png)

Imagine your bank mails you a statement after every change to your account. Monday's statement says you are overdrawn. Tuesday's says your paycheck landed and you are fine. The mail carrier delivers Tuesday's first, and Monday's arrives two days late. If you file whichever statement arrived last as the current one, your folder now says you are overdrawn, and every statement in it is real.

That is the whole of this episode. When one piece of software tells another that something changed, it sends a message. Those messages can arrive late, arrive twice, or arrive in the wrong order. A program that files each one the moment it lands will sometimes end up believing an old truth.

## What the episode shows

We built a small, deliberately flawed system on a laptop. One part plays a made-up subscription company, which we call SubHub, and the other part is the app that listens for its messages. Nothing here is real data, and SubHub is not a real company (local synthetic fixture).

SubHub sends three messages about one customer's subscription, in this order: first a trial on the starter plan, then past due on the starter plan, then active on the pro plan. The correct final state is active on pro, which is what the customer paid for.

The messages arrive at the app in a different order: first, third, then the second one late. The flawed version of the app files each as it comes. After the late "past due" message lands on top of "active on pro," the app's record says past due, starter. The customer paid, the subscription company knows it, and the app has it wrong (local synthetic fixture).

Every message was authentic. Each one carried a seal, a cryptographic signature, that the app checked and found valid. The seal proved who sent the letter. It said nothing about which letter was the newest.

## The fix, in plain words

Back to the statements. Three habits would have kept the folder right. Check the seal on each envelope before reading it, so a forged letter never gets in. Keep exactly one copy of each statement, so a duplicate mailed because the first "seemed lost" does not get filed twice. And look at the statement number printed on the page: if a lower number arrives after a higher one, note that it came, but do not let it replace the newer page.

The fixed app does these in that order. It checks the seal over the exact bytes it received, before reading the contents. It checks the message was sent recently, within five minutes, because a real seal on an old letter is still an old letter. It saves the message under its unique ID, and the database refuses to save the same ID twice. And it updates the subscription only when the message's version number is higher than the one already stored; an older version is logged and left alone. All of that is saved as a single step, and only then does the app tell SubHub "got it." If saving fails, it says "try again later" and nothing has changed.

Given the same mixed-up deliveries plus a repeat, the fixed app ends on active, pro. Six copies of a new message arriving at the same instant: one filed, five recognized as copies. Six old messages replayed in a shuffled order: nothing changed (local synthetic fixture).

One thing the analogy has to carry carefully. Skipping the old statement is only safe because each statement shows the whole account. If the letters instead said "add fifty dollars" and "take away twenty," you could not skip any of them without getting the balance wrong. SubHub's messages are the whole-account kind, by design. Not every real company's messages are, and the episode does not claim they are.

## What this means for you

- If an app ever shows your account as unpaid, downgraded or canceled right after you did the opposite, it may not be a billing mistake at all. It may be an old message that arrived late and was filed as new. Take a screenshot, note the time, and contact support; that timing detail helps them find it.
- "The payment went through" and "the app knows the payment went through" are two different facts held by two different systems. When they disagree, the system that took your money is usually the one to check first.
- If you build software, or pay people who do: ask what happens when two updates about the same thing arrive in the wrong order, and what happens when the same update arrives twice. In the episode there is a test for each, and a separate test proves the flawed version gets it wrong, so the passing tests mean something.

## FAQ

**How can a message be real and still cause a wrong result?**
The seal on a message proves who sent it, not when it should be applied. In the episode every message was authentic. The flaw was in treating the arrival order as the order things happened, so a late older message overwrote a newer one.

**Why would a company send the same notification twice?**
Because when it does not hear back quickly, it cannot tell whether your side failed or just replied slowly. Sending again is the safe choice from their side. The receiving app has to recognize the repeat, which the fixed version does by refusing to save the same message ID twice.

**Should the app just use the time stamped on each message?**
Not on its own. The time says when the message was written, not whether a newer one has already arrived, and clocks on different computers disagree. The fixed app uses a version number the sender puts on each message and treats the time as information only.

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The newest envelope in the mailbox is not always the newest news. Delivery order is not business order.

Miz Causevic, Kinetic Gain LLC
