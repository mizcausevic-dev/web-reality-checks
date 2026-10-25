# EP27 distribution kit: You Typed 'React.' Why Did Results for 'Re' Come Back?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep27-stale-search-responses/` (evidence.json, test.mjs, README.md). The fixture is a simulated state-machine controller driven by a mock API. It is not a browser, and nothing here is browser evidence.

## YouTube

### Title options (≤ 60 chars), ranked

1. `You Typed 'React.' Why Did Results for 'Re' Come Back?` : the series title; names the exact symptom a developer has seen and the question the episode answers.
2. `Request Order Is Not Response Order: Stale Search Bug` : states the mechanism, so search intent around out-of-order responses lands here.
3. `The Last Response Is Not Always the Latest Answer` : the closing line as a thesis; broad and shareable.
4. `Why Old Search Results Overwrite New Ones` : plain phrasing for developers searching the symptom.
5. `One Counter Stops Stale Search Responses` : short, centers the generation-counter repair.
6. `Search Results Jump Backward. Here's the Cause.` : for general viewers; the visible symptom first.

### Description

Typed "react," got results for "re." The older request answered last, and the code rendered whatever arrived last.

This episode uses a simulated state-machine controller and a mock API, not a browser. A test releases each response by hand, so the ordering is the same on every run. Type "re," then "react." The "react" response is released first, then the "re" response. The flawed controller ends with the box saying "react" and results for "re" on screen, 6 state writes. The repair is a generation counter: every search increments it and captures the value, and a response is ignored unless its generation is still current. Same schedule, corrected controller: results for "react," 4 state writes, and the obsolete success and its finally block are discarded.

The same guard has to cover the error path and the finally path. An old failure no longer puts an error over current results, and an old finally no longer clears loading while the current request is pending. Clearing the box and disposing the component invalidate pending requests too. Abort is an optimization: the final state is identical with and without it. The suite runs 22 tests, 22 pass, including known-positive controls on the flawed controller.

What this does not prove: no browser, framework, real fetch, server or timer was involved, and this is local UI concurrency control for one search box, not distributed ordering.

Chapters
00:00 The fail: results for "re" replace "react"
00:12 Request order is not response order
00:23 The late response still says "re"
00:34 The fix: a generation counter
00:45 Retest: same release schedule
00:55 Generation 1 is not generation 2: discarded
01:05 Failures need the same guard
01:14 Clear, dispose, abort and debounce
01:30 The last response is not always the latest

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep27/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

stale search responses, out-of-order responses, race condition, async javascript, search as you type, autocomplete bug, generation counter, request cancellation, AbortController, debounce, stale state, frontend bug, state machine, node.js, regression test, known-positive control, loading state bug, web development, software engineering, web reality checks

### Pinned comment (≤ 300 chars)

This episode is a simulated controller driven by a mock API, not a browser recording. The data is synthetic and the flawed code was written by hand to show the mechanism, not a finding about any real product. Fixture, 22 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

You typed "react." The list shows results for "re." Request order is not response order.

Episode 27 of Web Reality Checks. A simulated controller, not a browser: a state machine and a mock API where the test releases each response by hand. Type "re," type "react," release request 2, then request 1. The flawed handler writes whatever arrives last.

The repair is a generation counter. Every search increments it and captures the value; success, error and finally all check it before writing. Same schedule, corrected: results for "react," obsolete success and finally discarded.

What I would push on a team:

1. Guard the error and finally paths, not only success. Otherwise an old failure sets an error over good results, and an old finally clears loading while the current request is pending.
2. clear() and dispose() bump the counter too. After dispose: 2 state writes flawed, 0 corrected.
3. Abort is an optimization. Final state is identical with and without it, and a client abort does not prove the server stopped.

Debouncing does not order responses either. 22 tests, 22 pass (local synthetic fixture). Not tested: real fetch, frameworks, servers.

github.com/mizcausevic-dev/web-reality-checks

#JavaScript #Frontend #SoftwareEngineering

### Post 2: non-technical leaders

Your search box can show the right answer and then replace it with the wrong one. A demo will not show you.

Episode 27 of Web Reality Checks. Someone types a word. Results appear. A moment later, results for the first two letters replace them, while the box still shows the full word. Nothing errors.

Think of two letters mailed to one office. The replies are not promised to arrive in order. A clerk who files each reply the moment it shows up leaves the older answer on top. The fix is to number each letter and set aside any reply whose number is no longer the latest.

This is a simulated model with made-up data, not a real product or a browser recording. A demo cannot show it because it needs two searches in flight and the older one finishing last.

Five questions for your team:
1. When two searches are in flight, which reply wins, and why?
2. Is there a test that returns replies in reverse order?
3. Does the protection cover errors and the loading indicator?
4. What happens if the box is cleared or the page closed mid-search?
5. Is there a deliberately broken version the tests catch?

Vague answers mean "unknown," not "fine."

Repo and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SoftwareQuality #Leadership

## X/Twitter thread

1/ You typed "react." The list shows results for "re." The older request answered last, and the code rendered whatever arrived last. Episode 27 of Web Reality Checks: a stale-response bug, reproduced on a simulated controller, not a browser. Thread.

2/ Requests leave in order: "re," then "react." Nothing promises responses return in that order. In the fixture the test releases response 2 first, then response 1. The flawed handler writes both. Final screen: box says "react," results are for "re."

3/ The late response still carries its own query ("re") and its own id (req-1). The flawed code never reads either. It has no idea which request is current. 6 state writes (local synthetic fixture).

4/ The fix is a generation counter. Every search increments it and captures the value. On return: is my generation still current? If not, discard. Same schedule, corrected: results for "react," 4 state writes, obsolete success and finally discarded.

5/ The guard has to be in three places: success, error and finally. Otherwise an old failure sets an error over good results, and an old finally clears loading while the current request is still pending. clear() and dispose() bump the counter too.

6/ Abort is an optimization, not the fix. Final state is identical with guard only, guard plus abort, and guard plus abort against an API that ignores the signal. A client abort does not prove the server stopped. Debouncing does not order responses either.

7/ Scope: a simulated state machine and a mock API. No browser, framework, real fetch or timers. 22 tests, 22 pass (local synthetic fixture). Local UI concurrency control for one search box, not distributed ordering.

8/ The last response is not always the latest answer. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A framework-free search controller showing stale-response overwrites, with a generation-counter guard and abort as an optimization

**First comment:** This is a simulated state-machine controller driven by a mock API in which the test releases each response by hand; it is not a browser recording, uses synthetic data, and the flawed variant was written to show the mechanism, so it is not a finding about any real product. The guard compares a local generation counter in the success, error and finally paths, and clear() and dispose() also invalidate pending work; the suite is 22 tests including known-positive controls on the flawed controller. Limits are in the README: real fetch and abort semantics, frameworks, servers, caching and retries are not exercised, and this is not a distributed-ordering solution.

## Short-form hook lines (≤ 12 words)

1. You typed "react." The results say "re."
2. Request order is not response order.
3. The last response is not always the latest answer.
4. One counter decides which response gets to write.
5. An old finally block can switch off your spinner.

## Alt text

**hero.png:** A search box reading "react" with the result list underneath showing redis, redux, regex and request, which are the results for the earlier query "re"; a persistent tag marks the scene as a simulated controller, not browser evidence.

**thumbnail.png:** Episode thumbnail for "You Typed 'React.' Why Did Results for 'Re' Come Back?" showing a search box with "react" above a list labeled "re," with two request arrows crossing, and a "simulated controller" tag.
