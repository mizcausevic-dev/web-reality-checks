# EP11 distribution kit: I Clicked 'Reject All.' What Did the Website Actually Do?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep11-consent-gate/` (evidence.json, test.mjs, README.md). This is a technical demonstration, not legal advice or a compliance claim. No real website is depicted or accused.

## YouTube

### Title options (≤ 60 chars), ranked

1. `I Clicked 'Reject All.' What Did the Website Actually Do?` (57) : the series title; it is the exact question every viewer has asked themselves.
2. `Reject All Did Nothing. The Requests Prove It.` (46) : states the outcome and the evidence type in one line; strong for engineers.
3. `Your Cookie Banner Is a Promise. The Requests Are the Truth.` (59) : the episode's closing idea as a thesis; good for shares.
4. `The Banner Said No. The Analytics Sent Anyway.` (46) : the scene from the fixture, no jargon; works for general viewers.
5. `No Cookies, Still Tracked: What Reject All Misses` (49) : leads with the cookieless finding, which is the most searched surprise.
6. `A Consent State Machine That Actually Gates Requests` (51) : names the repair; lands search intent from developers implementing consent.

### Description

You clicked Reject. The banner vanished and the choice was saved. Four analytics requests went out anyway, three stamped "rejected."

In this episode we build a small consent banner on a laptop with no browser and no real analytics service: Accept, Reject, Settings and Withdraw as function calls, a stored preference, a simulated optional analytics module, and a local collector labelled SIMULATED ANALYTICS · LOCAL COLLECTOR that counts every request it receives. The flawed page stores the visitor's rejection correctly. The analytics module initializes on load and sends on every page event without ever reading that preference. Collector count after reject, browse and a reload: 4 requests, 1 before any choice and 3 after rejection. The module identifies the visitor with an in-memory id; no cookie is involved. The collector is first-party, and the requests are still optional.

Then we repair it with an explicit consent state machine (no choice, rejected, accepted, withdrawn) driving one gate that is open only in "accepted." Init, track and flush each check the gate at the moment they run. Withdrawal removes listeners and clears the unsent queue. Retest: no choice 0, rejected 0, reload with stored rejection 0, accepted 3, after withdraw still 3 with 1 unsent event dropped and 0 listeners left. The suite is 10 tests, 10 pass, including two known-positive controls that prove the flawed page really does emit after rejection.

What this does not do: withdrawal stops future requests only; the 3 sent while accepted remain in the collector. One optional category, no real browser, no third-party scripts or tag managers. Not a legal compliance certification.

Chapters
00:00 Reject optional, four requests anyway
00:12 Four parts: consent UI, store, analytics module, collector
00:26 The gap: written, never read; no cookie needed
00:44 The repair: a consent state machine drives one gate
01:00 Retest every state
01:15 The collector's actual logs
01:32 The button is a promise. The requests show the implementation.

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep11/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

consent banner, cookie banner, reject all, consent management, analytics consent, cookieless tracking, first-party analytics, privacy engineering, state machine, javascript, node.js, web privacy, tracking requests, withdraw consent, consent gate, regression test, known-positive control, web development, privacy by design, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture. The analytics is simulated, loopback only, and the flaw was written by hand to show the mechanism. Not legal advice, not a compliance claim, not about any real site. Fixture, 10 tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The visitor clicked "Reject optional." The banner hid. The store said "rejected." The analytics module sent 4 requests anyway, 3 stamped consentState: "rejected" on the wire.

Episode 11 of Web Reality Checks. The bug is a missing read: the buttons write the preference, nothing on the emission path reads it. init() runs from load(), track() queues, flush() sends.

Two details for code review:

1. No cookie exists in this fixture. The module uses an in-memory id. Gating cookies gates nothing.

2. The collector is same-origin. First-party says where a request goes, not whether it is optional.

The repair: a state machine (no_choice → rejected | accepted, accepted → withdrawn) and one policy, optionalAllowed(state) === (state === 'accepted'), checked by init, track and flush when each runs. Withdraw removes listeners and drops the unsent queue. Retest: 0, 0, 0 on reload with stored rejection, 3 accepted, still 3 after withdraw.

10 tests, 10 pass, including two known-positive controls proving the flawed page emits after rejection.

Limit: withdrawal stops new requests. The 3 already collected stay.

Synthetic fixture, loopback only. Not legal advice or a compliance claim.

github.com/mizcausevic-dev/web-reality-checks

#PrivacyEngineering #WebDevelopment #Analytics

### Post 2: non-technical leaders

Your consent banner works. Does the code behind it know that?

Episode 11 of Web Reality Checks reproduces a quiet failure on a small test page: the visitor clicks Reject, the banner disappears, the choice is saved and survives reload. And the analytics module keeps sending. Four requests, three after the rejection, on a page where everything visible was correct.

A thermostat not wired to the furnace. You turn it down, the display updates, the furnace keeps running.

Three things from the fixture:

1. No cookies involved. The tracking used an id held in memory. "We block cookies until consent" does not cover this.
2. The collector was on the site's own domain. First-party is a destination, not an exemption.
3. Withdrawing consent stopped new requests and left the three already collected in place.

Ask your team or vendor: How many optional requests leave the page in each consent state, and who measured it? Does the tracking code check consent when it starts, records and sends, or once at load? Is there a deliberately broken version the test catches? What happens to queued events on withdraw?

Vague answers mean "unknown," not "compliant."

Synthetic fixture, no real site, not legal advice. github.com/mizcausevic-dev/web-reality-checks

#Privacy #ProductManagement #Leadership

## X/Twitter thread

1/ The visitor clicked "Reject optional." The banner disappeared. The choice was saved. The analytics module sent 4 requests anyway, 3 stamped "rejected" as they left. Episode 11 of Web Reality Checks is one missing read between a button and the code that sends. Thread.

2/ Four parts: consent UI, a preference store, an optional analytics module, a collector. The buttons write to the store. The module initializes on load, attaches listeners, queues events, flushes in batches. Nothing on that path ever reads the store. Written, never read.

3/ No cookie exists in this fixture. The module identifies the visitor with an id held in memory and the collector gets it on every request. Blocking cookies would have blocked nothing. The thing being consented to is tracking, and tracking does not need a cookie.

4/ The collector is same-origin, "first-party." The requests are still optional. First-party describes where a request goes, not whether the visitor agreed to it.

5/ The repair: an explicit state machine, no_choice → rejected | accepted, accepted → withdrawn. One policy: optional analytics allowed only in "accepted." init, track and flush each check it when they run. Withdraw removes listeners and drops the unsent queue.

6/ Retest (local synthetic fixture): no choice 0, rejected 0, reload with stored rejection 0, accepted 3, after withdraw still 3 with 1 unsent event dropped. 10 tests, 10 pass, including two known-positive controls proving the flawed build emits after rejection.

7/ Honest limit: withdrawal stops new requests. It does not recall the 3 already in the collector, and nothing can. Simulated analytics, loopback only, one category, no real browser. A technical mechanism, not legal advice, not a compliance claim, not about any real site.

8/ The button is a promise. The requests show the implementation. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture where a consent banner stores "rejected" while the analytics module keeps sending, with a state-machine gate fix and known-positive control tests

**First comment:** This is a deliberately constructed local fixture with a simulated analytics module posting to a loopback collector; the flaw (init, track and flush never read the stored preference) was written by hand to show the mechanism, so it is not a finding about any real website and not legal advice or a compliance claim. The repair is an explicit consent state machine with one policy function checked on init, track and flush, plus listener removal and unsent-queue clearing on withdrawal; measured counts are 4 requests on the flawed build after rejection versus 0, 0, 0, 3, and still 3 after withdraw on the corrected one. The suite is 10 tests including two controls that assert the flawed page emits, and the limits (one category, no browser, no third-party scripts, no server-side deletion, withdrawal does not recall sent requests) are in the README.

## Short-form hook lines (≤ 12 words)

1. You clicked Reject. Four requests went out anyway.
2. The banner saved your "no." The code never read it.
3. No cookies. Still tracked. Here is how.
4. First-party is a destination, not an exemption.
5. The button is a promise. The requests show the implementation.

## Alt text

**hero.png:** Diagram of a simulated consent banner where the visitor has clicked Reject optional; the preference store shows state rejected while the simulated analytics module posts four requests to a local collector labelled SIMULATED ANALYTICS · LOCAL COLLECTOR, three of them stamped consentState rejected.

**thumbnail.png:** Episode thumbnail for "I Clicked 'Reject All.' What Did the Website Actually Do?" showing a Reject button with a stored "rejected" preference beside a request counter at 4, with the caption "The button is a promise. The requests show the implementation."
