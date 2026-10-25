SEO title (≤60 chars): You Clicked Reject All. Why the Site Still Tracked You
Meta description (≤155 chars): A cookie banner can save your "no" and the tracking code can carry on anyway. A plain-language look at the missing wire, shown on a small test page.
Slug: consent-gate
Primary keyword: reject all cookies still tracked   Secondary keywords (3–5): cookie banner explained, does reject all work, tracking without cookies, website privacy explained, consent banner meaning
Medium tags (5): Privacy, Technology, Explainer, Internet, Consumer

# I Clicked 'Reject All.' What Did the Website Actually Do?

![A visitor clicks Reject optional, the banner disappears, and the simulated analytics module posts four requests to the local collector, three of them stamped consentState rejected](../hero.png)

Picture a thermostat on the wall of a rented apartment. You turn it down. The screen shows the lower number. Come back tomorrow and it still shows the lower number. But the radiators are as hot as ever, because the thermostat was never wired to the boiler. The dial works. The boiler works. The wire between them does not exist.

That is this episode. A cookie banner is a dial. Whether anything downstream pays attention to the dial is a separate question, and you cannot answer it by looking at the dial.

## What the episode shows

We built a small, deliberately flawed web page on a laptop. It has a consent banner with "Accept optional" and "Reject optional" buttons, a settings panel with a "Withdraw" option, a place where the page remembers your choice, a pretend analytics module, and a local box that counts every request the analytics module sends. Nothing contacts a real company. The analytics is simulated and labelled as such, and the whole thing is synthetic (local synthetic fixture). This is a demonstration of how such a thing can go wrong, not a claim about any real website.

Click "Reject optional." The banner goes away. The page writes down "rejected" and remembers it, even after a reload. So far the dial is doing its job.

Now look at the box that counts requests. Before you clicked anything, one request had already gone out. After you clicked Reject and scrolled around, three more went. Four in total, three of them stamped with the word "rejected" at the moment they were sent (local synthetic fixture). The page saved your "no" and then behaved as if you had said nothing at all.

Why? The analytics module starts the moment the page loads, listens for what you do, and sends it off in batches. Nowhere in that chain does it look at the stored choice. The buttons write the setting. Nothing that actually sends ever reads it. The wire from the thermostat to the boiler is missing.

## Two things that surprised people

First, no cookies were involved. The pretend analytics module gives you an id that lives in the page's memory and sends it along with each request. Blocking cookies would not have stopped a single one of these requests. "Cookie banner" is a nickname; the thing being decided is tracking, and tracking does not need a cookie.

Second, the counting box sits on the same address as the page itself, what the industry calls "first-party." That did not make the requests any less optional. Where the data goes and whether you agreed to it are two different questions.

## The fix, in one sentence

Run the wire. In the corrected version, your choice is treated as a real state the page is in (no choice yet, rejected, accepted, withdrawn), and the analytics module is allowed to run only in the "accepted" state. It checks that rule when it starts, when it records something you did, and when it is about to send. Retested: no choice, zero requests. Rejected, zero. Reload with the saved rejection, zero. Accepted, three. Withdraw afterwards, and one unsent event is thrown away, the listeners are removed, and the count stays at three (local synthetic fixture).

That last number matters. Withdrawing consent stops new requests. It does not reach into the box and pull out the three that were already sent. Nothing can. Turning the thermostat down does not cool the room that was already heated.

## What this means for you

- The banner disappearing tells you the banner works. It tells you nothing about whether the tracking stopped. The only evidence is the requests leaving the page, which you cannot see without opening your browser's developer tools and watching the network panel.
- "We only use cookies with your consent" and "we only use first-party analytics" do not, on their own, mean your "no" was honored. Tracking can run without cookies and can run on the site's own domain. Ask what stops when you click Reject, not what is stored.
- If you ever withdraw consent, expect it to stop future collection, not to erase the past. Deleting what was already collected is a separate request to the company, and a separate process on their side.

## FAQ

**I clicked Reject All. Does that stop tracking?**
Only if the site's tracking code actually reads your choice before it starts and before it sends. The banner and the tracking are separate pieces of software. In this episode's test page, the flawed version saved the "no" and kept sending anyway.

**Can a website track me without cookies?**
Yes. The test page in this episode identifies you with an id held in the page's memory and sets no cookie at all. Blocking cookies did not apply because there were none to block. Tracking is about requests, not about cookies.

**If I withdraw consent later, is my earlier data deleted?**
Not by the withdrawal itself. In the episode, withdrawing stopped new requests and discarded unsent ones, but the three already sent stayed in the collector. Deletion is a separate process the site has to run on its servers.

## Watch the episode

[YouTube link]

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [HTTPS Encrypts Your Request. What Can the Network Still See?](../../ep20/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The dial was never the point. The wire was. The button is a promise. The requests show the implementation.

Miz Causevic, Kinetic Gain LLC
