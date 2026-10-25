SEO title (≤60 chars): Your Consent Banner Works. Does Your Analytics Code Obey It?
Meta description (≤155 chars): A consent banner can store a rejection while the analytics code keeps sending. Why a demo cannot show it, and five questions for your team or vendor.
Slug: consent-gate
Primary keyword: consent banner not working   Secondary keywords (3–5): cookie banner compliance risk, consent management vendor questions, reject all still tracking, privacy by design product, analytics consent enforcement
Medium tags (5): Product Management, Privacy, Startup, Leadership, Marketing Technology

# I Clicked 'Reject All.' What Did the Website Actually Do?

![A visitor clicks Reject optional, the banner disappears, and the simulated analytics module posts four requests to the local collector, three of them stamped consentState rejected](../hero.png)

## The symptom as a business event

The consent banner project is closed. Legal reviewed the wording, design polished the buttons, the vendor's script is live. Then a customer, a journalist or an auditor opens the browser's network panel, clicks Reject, and watches analytics requests continue to leave the page. Nothing failed. Nothing errored. The page did exactly what it was built to do, and the banner was never wired to the part that sends.

This episode reproduces that event on a local fixture with synthetic data: a simulated page with Accept, Reject, Settings and Withdraw controls, a stored preference, a simulated analytics module and a local collector that counts every request. In the flawed build, the visitor rejects, the banner disappears, the choice is saved, and the collector receives four requests: one before the choice and three after the rejection (local synthetic fixture). In the corrected build, the same actions produce zero.

To be clear about what this is: a technical demonstration of a mechanism. It is not legal advice, it is not a compliance claim about any product, and no real website is depicted or accused.

## Why a demo cannot show this

A demo of a consent banner shows the banner. It appears, the presenter clicks a button, it disappears, and on reload it stays gone. Every one of those things happened in the flawed build too. The banner in this fixture is correct in every visible respect.

What the demo cannot show is what the analytics module did meanwhile, because requests leaving a page are invisible unless someone opens a tool to watch them. The only evidence of consent enforcement is the request log, and a request log is not part of any demo. If nobody on your team has counted requests per consent state, nobody knows whether the banner is connected to anything.

"Do we have a consent banner?" is the wrong question. The right one is "what leaves the page in each consent state, and who measured it?"

## The mechanism in plain terms

Think of a thermostat on the wall that is not connected to the furnace. You turn it down. The display shows the new setting. It remembers the setting after a power cut. The furnace keeps running at full, because nobody ran the wire from the thermostat to the furnace controller. The thermostat is working. The furnace is working. The system is wrong, and you can only tell by checking the furnace, not the thermostat.

In the fixture, the banner is the thermostat and the analytics module is the furnace. Clicking Reject writes "rejected" into storage, and that write succeeds. The analytics module starts when the page loads, listens for page views and clicks, and sends them in batches. At no point does it read the stored choice. The repair runs the wire: consent becomes an explicit set of states (no choice, rejected, accepted, withdrawn), one rule says optional analytics may run only in "accepted," and the module checks that rule when it starts, when it records an event, and when it sends. Withdrawing consent removes the listeners and discards anything not yet sent.

Three facts from the fixture change how the risk should be understood. The analytics module identifies the visitor with an id held in memory and sets no cookie, so "we block cookies until consent" does not by itself stop this. The collector is on the same domain as the page, first-party, and the requests are still optional; first-party describes where data goes, not whether the visitor agreed. And withdrawing consent stops future requests only. The three requests sent while accepted are still in the collector after withdrawal (local synthetic fixture). Nothing recalls a request that has reached a server.

## What to ask your team or vendor

1. For each consent state (no choice yet, rejected, accepted, withdrawn, and reload after rejection), how many optional requests leave the page, and where is the measurement? Ask for the request counts, not a description of the banner.
2. Does the analytics or tag code check the consent state at the moment it starts, at the moment it records an event, and at the moment it sends? Or does it read a flag once at page load and never again?
3. Is there a deliberately broken version that the test catches? In the fixture this is a known-positive control: a test that proves the flawed build sends after rejection. Without it, a passing test may be passing for the wrong reason.
4. When a visitor withdraws consent, what happens to events already queued but not sent, and to listeners already attached? "The banner updates" is not an answer to this question.
5. Does any tracking identifier live outside cookies, and are any same-domain endpoints treated as exempt simply because they are first-party?

If the answers are vague, the honest state of your consent implementation is "unknown," not "compliant."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is exposure. A banner that stores a rejection while requests continue is visible to anyone with a browser and a network panel. Whether a given gap is a violation depends on jurisdiction, the data involved and facts this fixture does not model; this article makes no claim about that. It does say that "we have a banner" is not evidence, and request logs are.

The indirect cost is trust. A visitor who clicked Reject and later learns that the click did nothing does not credit the design of the banner. Buyers who ask how consent is enforced will not be satisfied by the existence of a banner, and "we discovered it when a customer opened the network tab" is a worse answer than "here are our per-state request counts."

The quiet cost is data you cannot un-collect. Stopping future requests leaves everything already collected in place. Every day the gap stays open, the data collected against a stored rejection grows, and deletion is a separate, slower project than the fix.

## FAQ

**Our banner disappears and remembers the choice. Isn't that enough?**
No. In the fixture the flawed banner does both of those things correctly, and the analytics module sends anyway, because nothing in its code reads the stored choice. The banner's behavior proves the banner works. Only request counts per consent state prove the enforcement works.

**We only use first-party analytics. Does consent still apply to it?**
This fixture does not answer legal questions. It does show that a first-party collector receives the same optional requests as any other endpoint, and that where a request goes says nothing about whether the visitor agreed. Classify requests by purpose, not by domain.

**If a visitor withdraws consent, is their earlier data removed?**
Not by the withdrawal itself. In the fixture, withdrawal removes listeners and drops unsent events, and the three requests sent while accepted remain in the collector. Deleting collected data is a separate server-side process the fixture does not model.

## Watch the episode

[YouTube link]

Related episodes: [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md) and [HTTPS Encrypts Your Request. What Can the Network Still See?](../../ep20/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The button is a promise. The requests show the implementation. Before you call the consent project done, ask who counted the requests, and ask to see the count for "rejected."

Miz Causevic, Kinetic Gain LLC
