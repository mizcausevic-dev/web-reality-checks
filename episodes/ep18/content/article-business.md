SEO title (≤60 chars): Why a Valid Webhook Can Still Corrupt Your Customer Records
Meta description (≤155 chars): A paying customer showed as past due because a late notification overwrote a newer one. Why demos cannot show this, and five questions to ask your team.
Slug: webhook-duplicates-ordering
Primary keyword: webhook reliability   Secondary keywords (3–5): subscription status sync, billing integration risk, out-of-order events, duplicate notifications, vendor integration questions
Medium tags (5): Product Management, Startup, SaaS, Software Development, Leadership

# Your Webhook Arrived Twice. Then an Older Update Arrived.

![Subscription sub_alpha is active on the pro plan at version 3; a late delivery of version 2 arrives with a valid signature and the naive receiver overwrites the record to past_due on the starter plan](../hero.png)

## The symptom as a business event

A customer upgraded to your pro plan and paid. An hour later they are locked out of pro features and their account page says past due on the starter plan. The billing provider's dashboard says active, pro, paid. Your database says past due, starter. Nobody changed anything by hand. No outage, no alert.

That is the event this episode reproduces on a local fixture with a fictional subscription provider. The provider sends three updates about one subscription, in order: trialing, past due, active on pro. They reach your system as first, third, then the second arriving late. The flawed receiver applies each as it arrives, so the late "past due" overwrites the correct "active on pro." Final record: past due, starter (local synthetic fixture). The corrected receiver, given the same deliveries, ends on active, pro.

Every update was authentic. The flaw was not in trusting a forged message. It was in assuming the order messages arrive is the order things happened.

## Why a demo cannot show this

In a demo, the integration is exercised one event at a time. Someone changes a subscription in the provider's sandbox, the notification arrives, your system updates. That path works, in the fixture too.

The failure needs two things a demo never has: more than one update in flight, and a delay or retry that reorders them. Both are normal in production. Providers retry when your server is slow to answer, and they send from several workers at once, so a retry of an old message can land after a newer one. None of that is visible when one person clicks one button in a sandbox.

The demo answers "does one update flow through?" The question that matters is "what happens when two updates arrive in the wrong order, or the same update arrives twice?" Only a deliberate test answers that, and in this episode it exists for both receivers.

## The mechanism in plain terms

Think of letters from your accountant, each describing the current state of an account. The accountant writes them in order, but the post does not promise to deliver them in order, and if a letter seems lost the accountant mails a copy. If you file each letter the moment it lands, a copy of Tuesday's letter arriving Thursday sits on top of Wednesday's, and your file shows Tuesday's balance as current.

The fix is not to distrust the accountant. It is to read the sequence number on each letter before filing, keep one copy of each and no more, and never let an older letter replace a newer one. That is what the corrected receiver does, with one caveat the analogy must carry: it only works because each letter states the whole account, not just the change since the last one. If the letters said "add fifty" and "subtract twenty," you could not skip any.

Concretely, the corrected receiver does four things in order. It checks a cryptographic signature over the exact bytes received, before reading the contents. It checks the delivery is within five minutes old, because a valid signature proves origin, not freshness. It records the message under its unique ID, and the database itself refuses a second copy of that ID, so a retry is acknowledged and ignored. And it applies the update only if the message's version number is higher than what is stored; an older version is logged and left alone. All of that is one atomic database step, and the receiver says "received" only after it is saved. If saving fails, it asks the provider to try again, and nothing has changed.

Given the same misordered deliveries plus a retry, that receiver recorded applied, applied, stale, duplicate, and ended on active, pro. Six copies of one new update at once: one applied, five duplicates. Six old deliveries replayed shuffled: nothing changed (local synthetic fixture).

## What to ask your team or vendor

1. When two updates about the same record arrive out of order, how does our system decide which wins? If the answer is "the last one to arrive," that is the flaw in this episode.
2. When the provider sends the same notification twice, which it will, what stops us acting on it twice? The answer should name a database constraint, not a check in code that looks before it writes.
3. Does the provider document a version number per record and the full current state in each notification? If not, the version-skipping approach here is not safe to copy.
4. Do we say "received" before or after we have saved our side? Before means a crash between the two loses the update, and the provider will not resend it because we already said yes.
5. Does this notification also trigger an email, a charge or a message to another system? What keeps those from firing twice? The fixture's protection covers its own database only, and says so.

Ask to see the test where an older update arrives after a newer one, and to see it fail on the version without the fix.

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is wrong state about paying customers. A customer marked past due who is not loses access they paid for and contacts support, or quietly leaves. A customer marked active who has lapsed keeps using a service you are not paid for. Both are silent until someone compares two systems by hand.

The indirect cost is the investigation. Because every message was authentic and every component "worked," the usual tools show nothing wrong. Engineers reconstruct delivery timelines from logs for one account, then wonder how many others have the same problem.

The compounding cost is anything downstream. If a wrong status change sends a dunning email, revokes access or triggers a charge, correcting the record does not undo the side effect. The fixture performs none of those and says protecting them needs additional coordination.

## FAQ

**Our webhook integration checks the signature. Is that enough?**
No. A signature proves the provider sent those exact bytes. It does not prove the message is recent, unprocessed, or the latest state. In the fixture, the flawed receiver checked signatures correctly and still ended with the wrong record.

**Why would a provider send the same notification twice?**
Because it cannot tell "your server failed" from "your server succeeded but the reply was lost." Retrying is the safe choice from its side. Your side has to recognize the repeat, which in this episode is done by the database refusing a second record with the same event ID.

**Can we fix this by sorting events by their timestamp?**
Not reliably. The timestamp says when the provider created the event, not whether you have already seen a later one, and clocks across systems disagree. The fixture orders by a version number the provider commits to per subscription and treats the timestamp as information only.

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Delivery order is not business order. Before trusting an integration with customer status, ask who tested the right messages arriving in the wrong order.

Miz Causevic, Kinetic Gain LLC
