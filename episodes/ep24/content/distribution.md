# EP24 distribution kit: Why Did This Dashboard Show Someone Else's Name?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep24-shared-cache-leak/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Why Did This Dashboard Show Someone Else's Name?` (48) : the series title; it states the symptom as a question every user and every engineer recognizes.
2. `Bob Logged In. The Page Said "Welcome back, Alice."` (51) : a concrete scene from the fixture; the contradiction is the hook.
3. `A Cache Key Defines Who Gets Treated as the Same` (48) : the episode's closing line as a thesis; good for engineer shares.
4. `Cache-Control: private Didn't Stop This Cache Leak` (50) : targets the common assumption that a header fixes it; strong search intent.
5. `Correct Login, Wrong Page: How a Cache Leaks Data` (49) : explains the mechanism in the title for mid-technical viewers.
6. `Why You Saw Another User's Name After Signing In` (49) : plain-language phrasing for general viewers.

### Description

Bob signed in correctly and his dashboard said "Welcome back, Alice." The login worked; the cache key did not. The mechanism and the repair.

In this episode we build a small dashboard on a laptop with two synthetic users, Alice and Bob, and a deliberately flawed in-process response cache keyed by the path only: /dashboard. Alice loads the page: 200 MISS. Bob, authenticated as Bob, loads it: 200 HIT, with Alice's name, Alice's email and the same render number. Nothing was rendered for him.

We then run the same flawed code with Cache-Control: private, no-store on every response. Bob still receives Alice's page, because the custom cache never reads the header.

The repair bypasses the shared cache, authenticates and authorizes every request, renders for the current user, sends private, no-store, and explicitly purges the old entry. Retest with two independent cookie jars: Alice, Bob, Alice, Bob, four requests, all 200 BYPASS, each viewer sees only their own page, four distinct render numbers. The regression suite runs 18 tests, 18 pass, including four known-positive controls.

What this does not fix: responses already delivered cannot be retracted, Vary: Cookie is not a universal answer, and only GET /dashboard is repaired. This is an application cache in a fixture, not a CDN incident, and no real browser was used.

Chapters
00:00 Alice and Bob load the same dashboard
00:11 Bob receives Alice's name, email and render number
00:27 The cache key is the path only
00:39 Authentication was right, the payload was wrong
00:54 The repair: bypass, private no-store, purge
01:06 Retest with two independent cookie jars
01:19 Each user receives only their own page
01:33 A cache key defines which requests are equivalent

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep24/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

shared cache leak, cache key, response cache, personalized content caching, cache-control private no-store, application cache, cache bug, data leak, authentication vs authorization, node.js, backend development, web security, known-positive control, regression test, cache purge, session isolation, vary cookie, web development, software engineering, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic users. The flawed cache is application code written for this episode, not a CDN or a real incident. Fixture, 18 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Bob authenticated correctly. The dashboard said "Welcome back, Alice."

Episode 24 of Web Reality Checks. The cache key was url.pathname. For every user, that is /dashboard.

The flawed route: authenticate, build the key from the path, look in a shared in-process cache. Alice misses and fills the slot. Bob authenticates as Bob, hits the slot, and receives Alice's name, her email and the same render number. Nothing was rendered for him.

Worth pushing on: with Cache-Control: private, no-store on every response, Bob still got Alice's page. The header is an instruction, and a hand-written Map never reads it.

The repair: bypass the shared cache, authenticate and authorize every request, render per user, send private, no-store, and purge the old entry (bypass alone leaves Alice's page in memory, so a test asserts the purge). Retest with two cookie jars: four 200 BYPASS responses, four distinct render numbers.

18 tests, 18 pass, four of them known-positive controls.

Limits: cookie jars, not browsers. One route repaired. Delivered responses cannot be recalled. Synthetic fixture, not a CDN finding.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #Caching #SoftwareEngineering

### Post 2: non-technical leaders

A customer signs in and the dashboard greets them with someone else's name. Support sees no error. Engineering sees no failed login. What happened?

Episode 24 of Web Reality Checks reproduces it on a local app with two made-up users. Alice opens her dashboard. Bob signs in correctly and opens the same page. It says "Welcome back, Alice," with Alice's email on it.

The system keeps a saved copy of the page to be fast. The copy is labeled only with the page address, not with whose page it is. A coat check that tags coats "Cloakroom" and never records the owner will hand your red coat to the next person in line.

Adding a "private" setting did not help in the test, because the custom code never read it. And fixing the cache later cannot recall pages already delivered.

Five questions for your team or vendor:
1. Which pages change depending on who is signed in, and where is each one stored?
2. What is in the cache label for each?
3. Is there a test with two users, in both orders?
4. Which components actually honor our privacy headers?
5. Who deletes old copies when we fix a leak?

Vague answers mean "unknown," not "safe."

Synthetic fixture, no real product or CDN. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #DataPrivacy #Leadership

## X/Twitter thread

1/ Bob signed in with his own account. The dashboard said "Welcome back, Alice." His session was correct. The page was not. Episode 24 of Web Reality Checks: a cache key that left out the one thing that changes the response. Thread.

2/ The flawed route authenticates first, then builds the cache key from url.pathname. That is /dashboard for everyone. Alice misses and fills the slot. Bob hits it and gets Alice's name, her email and the same render number. Nothing was rendered for Bob.

3/ A cache key is a definition of equivalence. Same key means "same request," so the second visitor gets the first visitor's bytes. If identity changes the response, identity belongs in the key, or the page does not belong in the cache.

4/ I added Cache-Control: private, no-store to every response and ran the same code. Bob still got Alice's page. The header is an instruction. A hand-written in-process cache never reads it. A correct header cannot repair code that ignores it.

5/ The repair: bypass the shared cache, authenticate (401) and authorize (403) every request, render for the current user, send private, no-store, and purge the old entry. Bypass alone leaves Alice's page sitting in memory, so a test asserts the purge: size 1 to 0.

6/ Retest with two independent cookie jars: Alice, Bob, Alice, Bob. Four requests, all 200 BYPASS, each viewer only their own id, four distinct render numbers, cache counters unchanged. 18 tests, 18 pass, 4 known-positive controls (local synthetic fixture).

7/ Limits: cookie jars, not real browsers. One route repaired. Vary: Cookie is not a universal answer. Delivered responses cannot be recalled. This is a flawed application cache, not a CDN incident, and nothing here is about a real product.

8/ A cache key defines which requests you treat as equivalent. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture where a path-only response cache serves one authenticated user's dashboard to another, with a bypass-and-purge repair

**First comment:** This is a deliberately constructed local fixture with two synthetic users; the flawed in-process cache was written for the episode, so it is not a CDN or proxy incident and not a finding about any real product. The control worth noting is that the same flawed code still leaks with Cache-Control: private, no-store, because the custom cache never reads the header; the repair bypasses the shared cache and explicitly purges the old entry, which is a policy choice rather than a universal recommendation. The suite is 18 tests, including four known-positive controls, and the limits (cookie jars instead of browsers, one route repaired, no RFC 9111 semantics, no recall of delivered responses) are in the README.

## Short-form hook lines (≤ 12 words)

1. Bob logged in correctly. The page said "Welcome back, Alice."
2. Your cache key forgot to ask whose page this is.
3. The privacy header was right. The cache never read it.
4. Correct login, wrong page. Here is how.
5. A cache key defines which requests you treat as equivalent.

## Alt text

**hero.png:** Frame from the episode showing Bob signed in as Bob, loading /dashboard and receiving a response that reads "Welcome back, Alice" with Alice's email, labeled as a cache HIT on a single shared slot keyed by /dashboard.

**thumbnail.png:** Episode thumbnail for "Why Did This Dashboard Show Someone Else's Name?" showing two identity badges, Alice and Bob, both mapping to one shared cache slot labeled /dashboard, with Alice's name displayed on Bob's screen.
