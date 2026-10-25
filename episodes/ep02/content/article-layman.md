SEO title (≤60 chars): You Bought One Thing. The Website Counted It Three Times.
Meta description (≤155 chars): One click, one order, three "purchase" messages behind the scenes. A plain-language look at why websites miscount sales and why the report may not show it.
Slug: duplicate-purchase-events
Primary keyword: why websites miscount sales   Secondary keywords (3–5): website analytics explained, duplicate events, how online tracking works, purchase tracking, web analytics for beginners
Medium tags (5): Technology, Explainer, Ecommerce, Analytics, Software

# One Click. Three Purchase Events. Here's What Went Wrong.

![One completed order, transaction T-20261025-0001, beside three received purchase envelopes in a local event collector labelled not GA4, each with the same transaction ID and a different emitter](../hero.png)

Imagine you buy a coffee, and three different employees each walk to the back office and write "sold one coffee" in the sales book. The barista writes it because they made the drink. The manager writes it because they were told to log every sale. The person who hands you the cup writes it because they saw you leave with one. You bought one coffee. The book says three.

That is the whole episode, except the coffee shop is a website and the sales book is the analytics system that tells the business how it is doing.

## What the episode shows

We built a small, deliberately flawed checkout on a laptop, with one made-up order and a plain "sales book" that writes down every message it receives and never crosses anything out. Nothing here is real data or about a real company (local synthetic fixture).

A customer confirms one order. The order completes once. The thank-you screen appears once. Then we look at the sales book. It has three entries, all saying "purchase," all with the same order number, each from a different part of the website's code, written a few thousandths of a second apart (local synthetic fixture: 3 messages received for 1 order).

Who wrote them? Three employees, in software form. The part of the website that completes the order wrote one. A marketing tracking tool that listens for completed orders wrote one. And the thank-you screen itself wrote one, because somebody once set it to say "purchase" every time it shows up.

Nobody decided that three entries per sale was a good idea. It happened because nobody decided who was in charge of writing it down.

## Why nobody noticed

Two reasons, and the second one is the sneaky one.

First, you cannot see this from the front of the shop. The customer got one click, one order, one receipt. The mess is in the back office.

Second, some analytics systems tidy the book for you, at least for purchases. Google Analytics 4 documents that for purchase events on websites, several entries with the same order number are treated as one. So the report on the manager's desk might say "one sale" even though three entries were written. Helpful, but it means the report cannot tell you the three employees are still writing. It covers purchases, not every kind of entry, and it does not stop the duplicate writing. The problem is hidden, not fixed.

## The fix, in one sentence

Pick one person to write in the book. In the episode, the part of the website that actually completes the order is the one that gets to say "purchase," because it is the only part that knows for sure a purchase happened. The marketing tool's duplicate entry is switched off. The thank-you screen keeps showing up, as it should, but it no longer writes anything down.

Then we ran it again: complete the same order, then redraw the thank-you screen twice more, the way a page might if you came back to it. The book had one entry, from the order-completion code (local synthetic fixture: 1 message received). The flawed version wrote a fourth entry every time the thank-you screen reappeared.

## What this does not fix

Having one person write in the book does not stop that person writing twice if they are asked to do the same job twice, for example if a page reloads and re-runs the order step. The episode shows that happening and says plainly that it is a different problem with a different fix. One writer per event is the first step, not the last.

## What this means for you

- If you run a shop or site, the sales numbers in your analytics tool are not the same thing as your sales. They are a count of messages your website chose to send, and those can be wrong while every customer is happy.
- A report that looks right is not proof the plumbing behind it is right. Ask whoever built your site to count the raw messages for one order, not just read the dashboard.
- If you hear "marketing's numbers and finance's numbers do not match," this is one common reason. The fix is a decision as much as a code change: one owner per event, written down.

## FAQ

**Does this mean the customer was charged three times?**
No. In the episode the customer was charged once and the order completed once. The three entries were three reports about the same sale, going into the analytics system. Charging someone twice is a different problem with a different cause.

**Why would a website send the same message three times?**
Because three separate pieces of it were each told to report purchases, by different people at different times, and nobody noticed they overlapped. Each piece is doing its job. The job was given out three times.

**If Google Analytics removes duplicates, why does it matter?**
Google documents that behavior for purchase events on websites, so purchase reports may look right. It does not cover every kind of event, and it does not stop the duplicate messages being sent. A report that looks tidy can be hiding code that is still misbehaving.

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

One coffee, one entry in the book. Decide who holds the pen before you trust the totals. Fix the emitters. Then verify the reporting.

Miz Causevic, Kinetic Gain LLC
