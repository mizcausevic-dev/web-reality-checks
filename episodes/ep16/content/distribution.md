# EP16 distribution kit: Your App Isn't Broken. It's Being Rate-Limited.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep16-rate-limit/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your App Isn't Broken. It's Being Rate-Limited.` (47) : the series title; names the misdiagnosis and the real cause in one line.
2. `8 Keystrokes, 17 Requests, 12 Rejections. Here's Why.` (53) : the fixture's own counts as the hook; engineers click on numbers.
3. `429 Too Many Requests: Stop Retrying Immediately` (48) : states the mechanism and the instruction; matches search intent for the status code.
4. `Your Search Box Is Spending Its Budget on Keystrokes` (52) : the budget framing, for leads who do not know the status code.
5. `Debounce, Guard, Abort, Retry-After: One Search Box` (51) : the four repairs in order; good for people hunting the pattern.
6. `Coordinate the Work. Don't Just Repeat It Faster.` (49) : the closing line as a thesis; good for shares.

### Description

Eight keystrokes became 17 requests and 12 rejections, and the search box showed results for the wrong word. Nothing was broken.

In this episode we build a small search API on a laptop with a fixed-window rate limiter: five allowed requests per ten seconds, per server-established identity. Rejected requests do not count against the allowance here, and the sixth request gets 429 Too Many Requests with a Retry-After header in whole seconds, rounded up. Those are this fixture's policies, not every API's.

Then we type "postgres" into a flawed client, one character per 80 ms. It sends on every keystroke and retries at once on 429. Result: 17 requests, 12 × 429, 5 stale renders, and a results list for "p" under an input that reads "postgres". The server told the client how long to wait. The client never read the header.

Same scripted typing, corrected client: debounce 250 ms, a sequence number so only the latest response renders, AbortController on the obsolete request, and Retry-After parsed, rounded up, with at most one retry of the still-current query. Result: 1 request, 0 × 429, results for "postgres". With the window pre-exhausted: one 429 with Retry-After: 3, one retry in the next window, 200. The suite runs 17 tests, 17 pass, including two known-positive controls that prove the flawed client really does burst and render stale results.

What this does not prove: fixed-window is this fixture's design; real 429s are not guaranteed to send Retry-After; a browser abort does not prove the server stopped processing; debouncing does not replace server-side limiting; this retry policy is for reads, not writes; the shared test identity is a harness, not production authentication.

Chapters
00:00 Eight keystrokes, eight requests, then 429
00:11 The fixed window: 5 per 10 s, per identity
00:26 Immediate retries, rejected again
00:37 Debounce the same typing
00:48 Stale results and the sequence guard
01:01 Abort the obsolete request
01:12 Respect Retry-After, at most one retry
01:25 Compare the request logs
01:37 Coordinate the work

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep16/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

rate limiting, 429 too many requests, retry-after header, debounce, search as you type, abortcontroller, fetch api, stale response, race condition, fixed window rate limiter, api design, node.js, javascript, web development, frontend performance, exponential backoff, request budget, known-positive control, api client best practices, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic data and a fixed-window limiter that is this fixture's design, not every API's. Not a finding about any real product. 17 tests, 17 pass, request logs and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Eight keystrokes. Seventeen requests. Twelve 429s. The list showed "p" while the box said "postgres".

Episode 16 of Web Reality Checks. A loopback Node fixture: search API behind a fixed-window limiter, 5 per 10 s per server-established identity, Retry-After in whole seconds rounded up. Two clients, one scripted typing sequence.

The flawed client fires per keystroke and retries at once on 429. The window has not moved, so the retry is rejected again. No stale guard: the slow answer for "p" arrives last and overwrites "postgres".

The corrected client:
1. Debounce 250 ms. Eight keystrokes, one request. This alone removed every 429.
2. Sequence number per request. Render only if still the latest.
3. AbortController on the obsolete request. An optimization: an abort does not prove the server stopped.
4. Retry-After: round up, retry the current query at most once, cancel if the query changes, fall back if absent.

Same typing: 1 request, 0 × 429, results for "postgres". Pre-exhausted window: 429, Retry-After: 3, one retry, 200.

17 tests, 17 pass, two known-positive controls. Fixed-window is this fixture's policy. Retry policy is for reads only. Synthetic fixture, no real product.

github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #APIDesign #SoftwareEngineering

### Post 2: non-technical leaders

"Search is broken." Engineering checks: nothing is down, the API is healthy, the vendor is fine. Everyone is right. The app is being rate-limited by its own typing.

Episode 16 of Web Reality Checks reproduces it on a local fixture with made-up data. The API allows five requests per ten seconds per user. The flawed app sends one per keystroke. "Postgres" is eight. The sixth is refused with a note saying how long to wait. The app ignores it and retries at once. Result: 17 requests, 12 refusals, results for "p" under a box reading "postgres".

A toll pass good for five trips every ten minutes. A driver who loops back through the gate on every wrong turn burns the pass, gets a "come back in three minutes" note, and ignores it. The road is fine.

The corrected app waits for a typing pause, discards stale answers, and when refused, waits as told and retries once. Same typing: 1 request, 0 refusals, correct results.

Five questions:
1. Does every search box wait for a typing pause? How long?
2. When a slow old answer arrives after a newer one, what does the user see?
3. On a 429: how many retries, how long a wait, is the server's wait time read?
4. Is the retry policy different for writes than reads? It must be.
5. Is there a deliberately flawed version the tests catch?

Synthetic fixture, no real product. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SaaS #Leadership

## X/Twitter thread

1/ Typed "postgres" into a search box. 8 keystrokes. The client sent 17 requests, got 12 × 429, and showed results for "p" under a box that said "postgres". Nothing was broken. Episode 16 of Web Reality Checks: the app is being rate-limited by its own typing. Thread.

2/ The fixture's limiter is a fixed window: 5 allowed per 10 s, per server-established identity. Sixth request: 429 + Retry-After in whole seconds, rounded up, never 0. Rejected requests do not count here. That is this fixture's policy, not every API's.

3/ The flawed client fires per keystroke and retries at once on 429. The window has not moved, so the retry is rejected. Again. Again. The server said how long to wait. The client never read the header. 8 keystrokes, 9 retries, 12 rejections (local synthetic fixture).

4/ Second flaw, nothing to do with the limiter: shorter prefixes answer slower (more matches). The response for "p" arrives last and overwrites the response for "postgres". No sequence guard, so whatever lands last wins. 5 stale renders.

5/ The repair, in order of value: debounce 250 ms (8 keystrokes become 1 request). Sequence number per request, render only if still latest. AbortController on the obsolete request. Retry-After: round up, retry the current query at most once, cancel if the query changes.

6/ Same scripted typing, corrected client: 1 request, 0 × 429, results for "postgres". Window pre-exhausted: 429 with Retry-After: 3, one retry in the next window, 200. 17 tests, 17 pass, two known-positive controls on the flawed client.

7/ Limits: fixed-window is this fixture's design. Real 429s may omit Retry-After (the client has a fallback). A browser abort does not prove the server stopped. Debounce does not replace server-side limiting. Retry policy is for reads, not writes. Synthetic fixture only.

8/ Coordinate the work. Don't just repeat it faster. Fixture, request logs, 17 tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture comparing a per-keystroke search client against a debounced one with a sequence guard and bounded Retry-After handling, behind a fixed-window 429 limiter

**First comment:** This is a deliberately constructed local fixture with synthetic data; the limiter is fixed-window (5 per 10 s, rejected requests not counted, Retry-After in whole seconds rounded up) because that is the policy the brief declared, not a claim about how real APIs behave, and the shared login is a test harness rather than production authentication. The flawed client's immediate-retry loop is bounded only so the tests terminate, and the corrected client's one-retry policy is scoped to an idempotent read and should not be reused for state-changing requests. The suite is 17 tests including two known-positive controls that assert the flawed client bursts and renders stale results, and the README lists what is not exercised (real browser, HTTP-date Retry-After end-to-end, sliding windows and token buckets).

## Short-form hook lines (≤ 12 words)

1. Eight keystrokes. Seventeen requests. Twelve rejections. Nothing broken.
2. The server said wait three seconds. The app asked again instantly.
3. The box says "postgres." The list shows results for "p."
4. A keystroke is not a transaction.
5. Coordinate the work. Don't just repeat it faster.

## Alt text

**hero.png:** A search input reading "postgres" above a request log; eight keystroke requests fan out, the first five return 200, and the rest return 429 Too Many Requests with Retry-After headers, while the results list beneath the box shows matches for the single letter "p".

**thumbnail.png:** Episode thumbnail for "Your App Isn't Broken. It's Being Rate-Limited." showing a search box mid-word with a stack of 429 responses piling up beside it and a Retry-After header the client never read.
