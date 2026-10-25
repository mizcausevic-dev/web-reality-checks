# Web Reality Checks: series release kit

Author: Miz Causevic, Kinetic Gain LLC. Source of truth for per-episode facts: `episodes/epNN/script.json`, `episodes/epNN/README.md`, `fixtures/epNN-*/evidence.json`. This file covers the series as a whole; per-episode copy lives in `episodes/epNN/content/distribution.md`.

## 1. Series positioning

Web Reality Checks is a 20-episode series of 90 to 120 second videos in which a web app does something that looks fine on screen and is wrong underneath, and every result shown comes from a runnable local fixture with regression tests that you can clone and run. Each episode names the mechanism, repairs it, retests it, and says out loud what the demonstration does not prove.

## 2. YouTube playlist

### Playlist title (pick one, all 60 characters or fewer)

1. `Web Reality Checks: What the Screen Hides` (41)
2. `Web Reality Checks: 20 Bugs the Demo Never Shows` (48)
3. `Web Reality Checks: Tested, Repaired, Retested` (46)

### Playlist description (1,000 characters or fewer)

```
Twenty short episodes, each about a web app that looks finished and is not. One missing authorization check, three purchase events from one click, a progress bar that reaches 100% before the file exists, a dashboard labeled Live with ten-minute-old data. Every episode builds a small fixture on a laptop, shows the failure, names the mechanism, repairs it, and reruns the tests on screen. The pass counts shown are real node:test output. Each episode also states what it does not prove, because a repaired read path is not a repaired write path and a fixture is not production.

Series by Miz Causevic, Kinetic Gain LLC. Fixtures, tests, scripts and the render project are open source.

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
```

## 3. Publishing order and cadence

Cadence: two episodes per week, Tuesday and Thursday, 10 weeks. Each arc runs two to three weeks, and the first episode of each arc is the one with the widest hook so the arc opens to a general audience and closes with the deeper material. Publish ep01 first regardless: its title is the series title and its question (does it work, and is it safe) frames everything that follows. Drop to one per week only if the LinkedIn and Medium articles cannot keep pace; the articles are the long-tail asset, the videos are the hook.

| Week | Tue | Thu | Arc |
|---|---|---|---|
| 1 | ep01 | ep03 | Security & identity |
| 2 | ep13 | ep11 | Security & identity |
| 3 | ep02 | ep15 | Data integrity & delivery |
| 4 | ep18 | ep14 | Data integrity & delivery |
| 5 | ep05 | ep17 | Data integrity & delivery |
| 6 | ep08 | ep19 | Performance, accessibility & rendering |
| 7 | ep12 | ep09 | Performance, accessibility & rendering |
| 8 | ep04 | ep07 | Performance, accessibility & rendering (ep04), Infrastructure & networking (ep07) |
| 9 | ep10 | ep16 | Infrastructure & networking |
| 10 | ep06 | ep20 | Infrastructure & networking |

### Arc 1: Security & identity (4 episodes)

ep01 Your AI-Built App Works. Is It Safe to Launch? / ep03 Watch What Happens When You Click 'Sign In' / ep13 That API Key Is in Your JavaScript. Is That Always a Leak? / ep11 I Clicked 'Reject All.' What Did the Website Actually Do?

Rationale: these four share one mechanism, the gap between what the client claims and what the server enforces, so they teach each other and open the series on the question viewers care about most.

### Arc 2: Data integrity & delivery (6 episodes)

ep02 One Click. Three Purchase Events. Here’s What Went Wrong. / ep15 You Clicked Pay Once. Why Did the App Create Two Orders? / ep18 Your Webhook Arrived Twice. Then an Older Update Arrived. / ep14 100% Uploaded. Why Isn't My File Ready? / ep05 Your Directory Has 10,000 Listings. How Many Are Wrong? / ep17 Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.

Rationale: every episode here is about a record that is duplicated, reordered, incomplete or stale while the interface reports success, which is the same failure seen from the event, the payment, the webhook, the upload, the catalog and the chart.

### Arc 3: Performance, accessibility & rendering (5 episodes)

ep08 Why This Beautiful Website Feels Slow / ep19 The Browser Shows Your Page. What Does the Server Send? / ep12 Your Website Updated. Why Am I Still Seeing the Old Version? / ep09 This Form Looks Finished. Try Using It Without a Mouse. / ep04 I Put a Database Inside a Website

Rationale: these are the episodes where the browser itself is the subject, what it receives, what it paints, what it caches, who can operate it, and what it can store, and they belong together because the fix for each lives in the page rather than the server.

### Arc 4: Infrastructure & networking (5 episodes)

ep07 It Works Locally. Why Is Production Broken? / ep10 I Changed One DNS Record and Broke My Website / ep16 Your App Isn't Broken. It's Being Rate-Limited. / ep06 What Happens Between Your Prompt and the Answer? / ep20 HTTPS Encrypts Your Request. What Can the Network Still See?

Rationale: the failure in each of these is in the layers between the code and the user (addresses, caches, quotas, pipelines, transport), which is the hardest set to show on screen and the right place to end, with ep20 closing the series on what the padlock does and does not promise.

## 4. Episode index

Article paths are relative to the repository root. Each episode has three articles: `article-technical.md`, `article-business.md`, `article-layman.md` in `episodes/epNN/content/`.

| # | Full title | Slug | Top-ranked YouTube title | Articles |
|---|---|---|---|---|
| 01 | Your AI-Built App Works. Is It Safe to Launch? | ai-app-authorization | Your AI-Built App Works. Is It Safe to Launch? | episodes/ep01/content/article-{technical,business,layman}.md |
| 02 | One Click. Three Purchase Events. Here’s What Went Wrong. | duplicate-purchase-events | One Click. Three Purchase Events. Here's What Went Wrong. | episodes/ep02/content/article-{technical,business,layman}.md |
| 03 | Watch What Happens When You Click 'Sign In' | sign-in-session | Watch What Happens When You Click 'Sign In' | episodes/ep03/content/article-{technical,business,layman}.md |
| 04 | I Put a Database Inside a Website | pglite-notes | I Put a Database Inside a Website | episodes/ep04/content/article-{technical,business,layman}.md |
| 05 | Your Directory Has 10,000 Listings. How Many Are Wrong? | directory-quality | Your Directory Has 10,000 Listings. How Many Are Wrong? | episodes/ep05/content/article-{technical,business,layman}.md |
| 06 | What Happens Between Your Prompt and the Answer? | prompt-to-answer | What Happens Between Your Prompt and the Answer? | episodes/ep06/content/article-{technical,business,layman}.md |
| 07 | It Works Locally. Why Is Production Broken? | vite-env-localhost | It Works Locally. Why Is Production Broken? | episodes/ep07/content/article-{technical,business,layman}.md |
| 08 | Why This Beautiful Website Feels Slow | feels-slow | Why This Beautiful Website Feels Slow | episodes/ep08/content/article-{technical,business,layman}.md |
| 09 | This Form Looks Finished. Try Using It Without a Mouse. | keyboard-form | This Form Looks Finished. Try Using It Without a Mouse. | episodes/ep09/content/article-{technical,business,layman}.md |
| 10 | I Changed One DNS Record and Broke My Website | dns-caches | I Changed One DNS Record and Broke My Website | episodes/ep10/content/article-{technical,business,layman}.md |
| 11 | I Clicked 'Reject All.' What Did the Website Actually Do? | consent-gate | I Clicked 'Reject All.' What Did the Website Actually Do? | episodes/ep11/content/article-{technical,business,layman}.md |
| 12 | Your Website Updated. Why Am I Still Seeing the Old Version? | sw-update | Your Website Updated. Why Am I Still Seeing the Old Version? | episodes/ep12/content/article-{technical,business,layman}.md |
| 13 | That API Key Is in Your JavaScript. Is That Always a Leak? | api-key-capability | That API Key Is in Your JavaScript. Is That Always a Leak? | episodes/ep13/content/article-{technical,business,layman}.md |
| 14 | 100% Uploaded. Why Isn't My File Ready? | upload-stages | 100% Uploaded. Why Isn't My File Ready? | episodes/ep14/content/article-{technical,business,layman}.md |
| 15 | You Clicked Pay Once. Why Did the App Create Two Orders? | idempotency | You Clicked Pay Once. Why Did the App Create Two Orders? | episodes/ep15/content/article-{technical,business,layman}.md |
| 16 | Your App Isn't Broken. It's Being Rate-Limited. | rate-limit | Your App Isn't Broken. It's Being Rate-Limited. | episodes/ep16/content/article-{technical,business,layman}.md |
| 17 | Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old. | stale-dashboard | Your Dashboard Says Live. Its Data Is Ten Minutes Old. | episodes/ep17/content/article-{technical,business,layman}.md |
| 18 | Your Webhook Arrived Twice. Then an Older Update Arrived. | webhooks | Your Webhook Arrived Twice. Then an Older Update Arrived. | episodes/ep18/content/article-{technical,business,layman}.md |
| 19 | The Browser Shows Your Page. What Does the Server Send? | initial-html | The Browser Shows Your Page. What Does the Server Send? | episodes/ep19/content/article-{technical,business,layman}.md |
| 20 | HTTPS Encrypts Your Request. What Can the Network Still See? | https-visibility | HTTPS Encrypts Your Request. What Can the Network Still See? | episodes/ep20/content/article-{technical,business,layman}.md |

## 5. Launch copy

### LinkedIn series launch post (1,300 characters or fewer)

```
Your app passed the demo. That is not the same as your app being correct.

I built Web Reality Checks: 20 videos, 90 to 120 seconds each, about web apps that look finished on screen and are wrong underneath. One missing authorization check that returns 200 OK with another user's data. One click that fires three purchase events. A progress bar that hits 100% before the file exists. A dashboard labeled Live showing ten-minute-old numbers.

Every result on screen is the real output of a runnable fixture with regression tests. You can clone the repo, run node:test, and get the same pass count the narration reads out. Each episode shows the failure, names the mechanism, repairs it, retests, and says what the demonstration does not prove.

Four arcs: security and identity, data integrity and delivery, performance and rendering, infrastructure and networking. Two a week for ten weeks, starting with the question founders ask me most: it works, but is it safe to launch?

All fixtures are synthetic and local. Nothing is a finding about a real product. Open source: github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #SoftwareEngineering #Testing
```

### X launch post (280 characters or fewer)

```
Web Reality Checks: 20 videos about web apps that look finished and are not. Every result on screen is the output of a runnable fixture with tests you can clone. Failure, mechanism, repair, retest, and what it does not prove. Two a week for 10 weeks. Ep 1 is up.
```

### Medium "About this series" paragraph (120 words or fewer)

```
Web Reality Checks is a 20-part series from Miz Causevic, Kinetic Gain LLC, about web applications that look correct on screen and fail underneath: authorization that never checks ownership, events that fire three times, uploads that report 100% before the file exists, dashboards that say Live over stale data. Each part pairs a 90 to 120 second video with three articles for engineers, decision makers and general readers. Every number and pass count comes from a deliberately constructed local fixture with synthetic data and regression tests, and each part states what it does not prove. Nothing is a finding about a real product. Fixtures, tests and video source: github.com/mizcausevic-dev/web-reality-checks
```

## 6. SEO

### Series-level keywords (10)

1. web application security testing
2. authorization vs authentication
3. idempotency key
4. duplicate analytics events
5. service worker cache update
6. DNS TTL propagation
7. API rate limiting explained
8. keyboard accessibility forms
9. webhook ordering and retries
10. web app regression tests

### Medium tags (5)

1. Web Development
2. Software Engineering
3. Security
4. Testing
5. Programming

## 7. What is and is not claimed

```
WHAT THIS SERIES CLAIMS
Every on-screen result (status codes, request counts, pass counts, timings) is the output of a deliberately constructed local fixture in this repository, run on loopback with synthetic data, and reproducible with the fixture's test.mjs and demo.mjs. Each result is labeled on screen with its evidence state: Observed, Executed, Verified, Predicted or Blocked.

WHAT THIS SERIES DOES NOT CLAIM
Nothing in any episode is a finding about a real product, company, library or service. The fixtures are small by design and demonstrate one mechanism each. A repair shown for one path (for example one read endpoint) is not a claim about other paths in the same app, and a passing fixture is not a claim about production.

STEPS MARKED BLOCKED OR CONCEPTUAL
Some steps could not be executed inside the fixture and are presented as conceptual or marked Blocked on screen and in the episode README:
  ep03  the TLS leg of the sign-in flow (loopback fixture runs without a TLS handshake)
  ep04  the browser-side steps (PGlite persistence in a real browser is described, not executed by the test runner)
  ep07  the remote client (a second machine reaching the deployed page is modeled, not run)
  ep08  the browser lab (paint and interaction timing in a real browser is described, not measured by the fixture)
  ep09  the screen reader pass (announcements are described from the markup, not recorded from assistive technology)
  ep12  the browser service worker lifecycle (install, waiting and activate are explained, not driven by the fixture)
  ep20  the whole episode is conceptual (what the network sees under HTTPS is explained from protocol behavior; no capture was performed)

Each episode README lists its own limits under "What this does not prove." Where this file and an episode README differ, the README wins.
```

Miz Causevic, Kinetic Gain LLC
