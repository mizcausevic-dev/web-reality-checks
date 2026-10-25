# EP08 distribution kit: Why This Beautiful Website Feels Slow

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep08-feels-slow/` (evidence.json, test.mjs, README.md, test-conditions.md). Byte figures are file sizes served by the loopback fixture, not load times. Handler figures are fixture-measured handler CPU time in Node, not browser INP. No LCP, Event Timing or INP value was measured, and none appears here.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Why This Beautiful Website Feels Slow` (37) : the series title; names the everyday complaint and promises the mechanism.
2. `Slow to Load and Slow to Click Are Two Different Bugs` (53) : states the thesis; catches both search intents at once.
3. `A 12 MB Hero Image for a 1600 px Slot` (37) : concrete, from the fixture; the number is the hook for engineers.
4. `The Click Froze for 4 Seconds. Here's the Loop That Did It.` (58) : the handler scene; the Node figure is labelled in the description.
5. `Fixing Page Load Does Nothing for a Frozen Button` (48) : the misattribution angle for teams who fixed one and closed the ticket.
6. `Loading Quickly and Responding Quickly Are Different Tests` (57) : the closing line as a thesis; good for shares.

### Description

Your site looks finished and still feels slow. Two complaints, one word, two unrelated causes. Fixing one does nothing for the other.

In this episode we build two visually identical pages on a laptop. The flawed one requests a 4000×2250 lossless PNG of 12,173,721 bytes for a hero slot 1600 pixels wide, so the largest element cannot paint until every byte arrives and decodes. Its button runs a handler that compares each of 20,000 items against every other, synchronously, on the main thread, so nothing can repaint until the loop returns. In Node, that handler took a median of 4253 ms across 7 runs (fixture-measured handler CPU time in Node, not browser INP).

Then we repair both. Same picture at 1600×900 as WebP: 17,004 bytes. Still above the fold, still not lazy-loaded, because it is the element you are waiting for. Same handler rewritten as a one-pass histogram: identical output, digest ec44c9fd, median 1.40 ms in Node. The cost was removed, not hidden behind a spinner. 7 tests, 7 pass, including a known-positive control that proves the slow variant really is slow.

What was not measured: LCP and Event Timing, because no browser lab was available. The exact procedure (one browser build, 1600×900 viewport, one CPU throttle, one network preset, cold and warm as separate tables, five or more trials, median, initial trace first) is in test-conditions.md for anyone to run.

Chapters
00:00 The page looks finished, then feels slow
00:09 Loading and interaction are two timelines
00:22 The hero request: 12 MB PNG for a 1600 px slot
00:36 The handler: 20,000 items against every other
00:51 Correct the image: 1600×900 WebP
01:05 Correct the handler: count once, look up
01:17 Measured here, and what was not
01:32 Two different tests

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep08/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

web performance, largest contentful paint, interaction to next paint, core web vitals, hero image optimization, webp, image compression, main thread, long tasks, synchronous javascript, event handler performance, O(n²), algorithm complexity, lazy loading, fetchpriority, frontend performance, javascript performance, performance testing, known-positive control, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with a synthetic image and seeded data; not a finding about any real site. Handler times are Node CPU time, not browser INP; no LCP or Event Timing was measured. Fixture, 7 tests, lab procedure: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

A 12,173,721-byte lossless PNG for a 1600 px slot, and a click handler doing 400 million comparisons on the main thread. Same page, two unrelated reasons it feels slow.

Episode 8 of Web Reality Checks: two visually identical pages, one flawed, one repaired.

Loading: the largest element cannot paint until the hero's bytes arrive and decode. Repair: same picture, 1600×900 WebP, 17,004 bytes. Still NOT lazy-loaded, because it is the element the user is waiting for.

Interaction: the handler is O(n²) over 20,000 items, synchronous, inside the click listener. Repair: one-pass histogram, O(n), identical digest ec44c9fd. Still synchronous. Cost removed, not hidden.

Numbers, labelled: handler CPU time in Node, 7 runs, median 4253.02 ms before, 1.40 ms after. Fixture-measured Node CPU time, NOT browser INP. Byte counts are file sizes, not load times.

Not measured: LCP and Event Timing. No browser lab was available. test-conditions.md has the procedure: one browser build, one viewport, one throttle, cold and warm separate, 5+ trials, median.

7 tests, 7 pass, including a known-positive control. Synthetic fixture.

Fixture, tests, video: github.com/mizcausevic-dev/web-reality-checks

#WebPerformance #JavaScript #SoftwareEngineering

### Post 2: non-technical leaders

Your site looks great and customers say it feels slow. Which kind of slow? That decides whether the fix works.

Episode 8 of Web Reality Checks reproduces both on a small local page with made-up data.

Kind one: the banner picture arrives late. 12,173,721 bytes where 17,004 bytes shows the same picture. The browser cannot draw it until every byte lands.

Kind two: a button is pressed and nothing happens. The code behind it did about 400 million comparisons before the screen could change. Test environment: about 4.25 s before, about 1.4 ms after, identical answer (Node code timing, not a browser measurement).

A slow kitchen and a busy waiter are both "slow service." Fixing the kitchen does nothing for the waiter.

Five questions for your team:
1. How many bytes is the biggest image on each key page? Is it sized to its slot?
2. Is that image lazy-loaded? Why?
3. What does the main button do, and how does its cost grow with real data?
4. Were loading and responsiveness measured separately, under one set of conditions, several runs, raw kept?
5. Is there a test that fails on the slow version?

Limit: nothing in a browser was timed here; the lab procedure is published.

Synthetic fixture: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #WebPerformance #Leadership

## X/Twitter thread

1/ The page looks finished. The hero arrives late. The first click sits there. Two complaints, one word: slow. Episode 8 of Web Reality Checks is two unrelated bottlenecks on one page, and why fixing one does nothing for the other. Thread.

2/ Two timelines. Loading asks: how soon is the largest element painted? Interaction asks: how soon does the page respond after you act? Different mechanisms, different metrics, different fixes. Measuring one and calling the page fast answers half the question.

3/ The hero: a 4000×2250 lossless PNG, 12,173,721 bytes, for a 1600 px slot. The largest element cannot paint until every byte arrives and decodes. Repair: same picture, 1600×900 WebP, 17,004 bytes. (File bytes from the local fixture, not a load time.)

4/ Not lazy-loaded, in either variant. The hero is above the fold and is the element you are waiting for. loading="lazy" would delay it further. fetchpriority="high" and intrinsic width/height stay. A test asserts this.

5/ The click: a handler that compares each of 20,000 items against every other, synchronously, on the main thread. 400 million comparisons before the next frame. Node CPU time, 7 runs, median 4253 ms. That is fixture-measured Node CPU time, NOT browser INP.

6/ Repair: count each collection once, then look it up. O(n), identical digest ec44c9fd, median 1.40 ms in Node. Still synchronous. The cost was removed, not hidden behind a spinner or a setTimeout. 7 tests, 7 pass, including a control proving the slow one is slow.

7/ Not measured: LCP and Event Timing. No browser lab was available, so no such number appears anywhere. The procedure is written down: one browser build, one viewport, one throttle, cold vs warm as separate tables, 5+ trials, median, initial trace first.

8/ Loading quickly and responding quickly are different tests. Run both, under the same conditions. Synthetic fixture, loopback only, not a finding about any real site. Fixture, tests, video, three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal fixture separating a page's loading bottleneck (oversized hero PNG) from its interaction bottleneck (O(n²) synchronous click handler), with tests and an unexecuted browser-lab procedure

**First comment:** This is a deliberately constructed local fixture with a synthetic generated image and seeded data; nothing here is a finding about a real site or product. The only numbers are file byte sizes and handler CPU time measured in Node (median of 7 runs, raw kept), which are explicitly labelled as not LCP and not INP; no browser was available, so no LCP or Event Timing value exists, and test-conditions.md documents the exact lab procedure that still needs to run. The 7-test suite includes a known-positive control asserting the slow variant is slow, and the README lists the limits (one image and one handler corrected, loopback only, container timings vary by roughly ±20 %).

## Short-form hook lines (≤ 12 words)

1. Slow to load and slow to click are different bugs.
2. A 12 MB picture for a space that needed 17 KB.
3. The button froze because the loop ran 400 million times.
4. Fixing the image did nothing for the click.
5. Loading quickly and responding quickly are different tests.

## Alt text

**hero.png:** Diagram of two separate timelines for one web page: the loading track is blocked by a 12 MB hero image request that must arrive and decode before the largest element can paint, and the interaction track is blocked by a synchronous O(n²) click handler running on the main thread, with the caption "Two timelines, two different fixes."

**thumbnail.png:** Episode thumbnail for "Why This Beautiful Website Feels Slow" showing a polished dark page with a hero image slot still loading and a button pressed with no response, split by a vertical line labelled loading on one side and interaction on the other.
