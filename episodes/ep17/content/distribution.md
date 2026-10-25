# EP17 distribution kit: Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep17-stale-dashboard/` (evidence.json, test.mjs, README.md). All times are simulated on a compressed shared clock; nothing waited ten real minutes.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Dashboard Says Live. Its Data Is Ten Minutes Old.` (54) : the series title; names the contradiction in one line and matches the article H1.
2. `Freshly Fetched Is Not Freshly Observed` (39) : the episode's closing thesis; short, quotable, carries the mechanism.
3. `19 Polls, 19 × 200 OK, One Ten-Minute-Old Reading` (49) : concrete numbers from the fixture; the hook for engineers who read status codes.
4. `Connected and Stale Can Both Be True` (36) : the repair stated as a principle; good for shares among people who build dashboards.
5. `Why "Updated 0 s Ago" Hides a Stale Measurement` (47) : names the exact label most viewers have seen and distrusted.
6. `Polling Faster Won't Fix Your Stale Dashboard` (45) : counterintuitive claim, demonstrated by a test in the fixture; targets a common first instinct.

### Description

The panel says Live, updated 0 s ago. The measurement behind it was observed ten minutes ago. Both are true. The first is hiding the second.

In this episode we build a four-stage synthetic telemetry pipeline on a laptop: a source observes a value, a collector samples it every 600 simulated seconds, an API serves what the collector last stored, and a browser polls the API every 30 simulated seconds. Every stage stamps its own time from one shared clock that we advance by hand, so the on-screen tag SIMULATED PIPELINE · COMPRESSED CLOCK stays up throughout.

In the healthy run the browser makes 19 polls between two collections, every one 200 OK, every one labeled Live by the naive display, while the measurement age climbs from 30 to 570 seconds and crosses this fixture's 300 second stale policy at t=330. Then we replace Live with two facts: measurement age counted from sourceObservedAt, never reset by an arriving response, and connection status from the last poll. Connected and stale can both be true.

We break the collector: the API still answers 200 with the old reading, the age reaches 1200 seconds, the naive label still says Live. We break the API: 503, the last known value is kept with an explicit warning, nothing is invented, and recovery reconnects without resetting the age. Polling every 5 seconds instead of 30 produces 119 polls instead of 19 and an identical 570 second age. Future timestamps are flagged, never shown negative. 12 tests, 12 pass.

What this does not prove: one shared clock, so cross-system clock skew is not modeled. No sockets or real HTTP. The 300 s threshold is this dashboard's policy, not a universal rule. A WebSocket variant is reasoned about, not implemented.

Chapters
00:00 Live, updated 0 s ago. Observed ten minutes ago.
00:11 Four timelines: source, collector, API, browser
00:26 19 polls, 19 × 200 OK, same reading
00:37 Response freshness vs measurement freshness
00:46 The fix: measurement age and connection status
00:59 Advance the clock; the source value does not change
01:09 Age grows past the 300 s policy, still 200 OK
01:20 Collector failure, then API failure
01:36 Freshly fetched does not mean freshly observed

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep17/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

dashboard data freshness, stale data, real-time dashboard, measurement age, sourceObservedAt, telemetry pipeline, data latency, observability, polling vs websockets, node.js, data engineering, dashboard design, monitoring, status indicator, connection status, known-positive control, regression test, simulated clock, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with a synthetic sensor and a compressed simulated clock; no real product or data. The 300 s stale threshold is this dashboard's own policy, not a rule. Fixture, 12 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The panel said Live, updated 0 s ago. The reading behind it was observed 570 seconds earlier. Both true. Same instant.

Episode 17 of Web Reality Checks. Four stages on one shared clock: source observes, collector samples every 600 s, API serves the latest stored reading, browser polls every 30 s. Each stage stamps its own time: sourceObservedAt, collectedAt, servedAt.

The naive label derives "updated N s ago" from the last poll. Every 200 OK resets it to zero. So 19 polls between two collections, 19 × 200, 19 × Live, one reading aging 30 → 570 s. The display answers "is my connection working?" and presents it as "how old is this number?"

The repair, as a pure function:
- measurementAge = now - sourceObservedAt. Never collectedAt, never servedAt, never poll time. An arriving response does not reset it.
- connection from the last poll only: disconnected, connected within a 90 s window, else unknown.
- Connected and stale can both be true. The UI says both.

Under failure: collector down, API still 200 with the t=0 reading, age 1200 s, naive label still Live. API down, 503, last value kept with an explicit warning, nothing fabricated. Future timestamp: flagged impossible-future, never a negative age.

Polling every 5 s instead of 30: 119 polls vs 19, identical age at t=570. Faster delivery of the same old reading.

12 tests, 12 pass, including a known-positive control asserting the naive label is misleading. 300 s threshold is this fixture's policy, not a rule. One shared clock; skew not modeled. Synthetic data only.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#Observability #DataEngineering #SoftwareEngineering

### Post 2: non-technical leaders

Your dashboard says Live. Is the number on it current? Those are two different questions, and the label only answers one.

Episode 17 of Web Reality Checks builds a small synthetic pipeline on a laptop with a clock we wind forward by hand. A sensor is sampled every ten simulated minutes. The screen asks the server every thirty seconds. Every answer comes back OK. Every answer resets the label to Live, updated 0 seconds ago. Nineteen times in a row, the same ten-minute-old reading, each time described as fresh.

Think of a newspaper delivered reliably at 6 a.m. Delivery is fresh. The stories were written yesterday. "Updated just now" is the delivery time. It says nothing about when the information was gathered.

Worse: when the upstream sampler stops working, the server keeps handing out the last reading it has, and the screen stays green. The moment you need the dashboard to warn you is the moment it is most confidently reassuring you.

The fix is two indicators instead of one word: how old the measurement is, counted from when it was taken, and whether the connection is healthy. Both can be true at once. How old is too old is a product decision; this dashboard chose five minutes, a daily report could choose hours. The failure is hiding the age, not the age itself.

Five questions for your team or vendor:
1. Is "updated N seconds ago" counted from the measurement or from the last request?
2. Does each value carry its own observation timestamp?
3. What is the stale threshold, who chose it, where is it written?
4. If the upstream sampler fails but the server keeps answering, what does the screen show?
5. If the server fails, does the screen keep the last value with a warning, or invent one?

Synthetic fixture, compressed clock, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Data #Leadership

## X/Twitter thread

1/ The dashboard says Live, updated 0 s ago. The measurement behind it was observed ten minutes ago. Both are true at the same instant. The first is hiding the second. Episode 17 of Web Reality Checks is about the two clocks behind one word. Thread.

2/ Four stages on one shared clock: a source observes a value, a collector samples it every 600 s, an API serves the latest stored reading, a browser polls every 30 s. Each stage stamps its own time: sourceObservedAt, collectedAt, servedAt. No stage rewrites another's stamp.

3/ The naive label counts "updated N s ago" from the last poll and resets to zero on every 200 OK. Between two collections: 19 polls, 19 × 200, 19 × Live, one reading aging 30 → 570 s. It answers "is the connection working?" and presents it as "how old is this number?"

4/ The repair is two facts, not one word. Measurement age = now - sourceObservedAt, never reset by an arriving response. Connection status from the last poll alone. Connected and stale can both be true, and from t=330 to t=570 in the healthy run, they are.

5/ Break the collector: the API still answers 200 with the t=0 reading because that is the latest it has. Age reaches 1200 s. Connection green. Naive label still Live. Break the API: 503, last value kept with an explicit warning, nothing fabricated, age keeps counting from the source.

6/ Polling faster does not help. 5 s vs 30 s over 599 s: 119 polls vs 19, collector sampled once in both, identical 570 s age at the same instant. A WebSocket would deliver the same old reading sooner (stated as reasoning, not implemented in this fixture).

7/ Policy, not law: 300 s is this dashboard's stale threshold. A daily report could pick hours. Future timestamps are flagged impossible-future, never shown negative. Missing timestamps give an explicit unknown. 12 tests, 12 pass, including a control that asserts the naive label misleads.

8/ Limits: one shared clock, so cross-system skew is not modeled. No sockets or real HTTP. Synthetic sensor, compressed clock. Freshly fetched does not mean freshly observed. Fixture, tests, video, three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture showing why a dashboard's "Live, updated 0 s ago" label can sit on a ten-minute-old measurement, with the measurement-age repair and clock-controlled tests

**First comment:** This is a deliberately constructed local fixture: a four-stage source, collector, API and dashboard pipeline in plain Node with no sockets, driven by one shared clock advanced in one-second steps, so the ten simulated minutes are 600 explicit ticks rather than real waiting and nothing here is a finding about any real product. The repair computes measurement age from sourceObservedAt only and reports connection status separately from the last poll, and the 300 s stale threshold and 90 s connection window are this fixture's documented policies rather than recommendations. The suite is 12 tests including a known-positive control asserting the naive Live label is misleading, and the limits (single shared clock, no clock skew, no WebSocket variant implemented) are in the README.

## Short-form hook lines (≤ 12 words)

1. Live, updated 0 seconds ago. Observed ten minutes ago. Both true.
2. Freshly fetched does not mean freshly observed.
3. 19 polls, 19 OK, one ten-minute-old reading.
4. Connected and stale can both be true.
5. Polling faster delivers the same old number sooner.

## Alt text

**hero.png:** Simulated dashboard panel reading "Live · updated 0 s ago" beside four stacked timelines for source, collector, API and browser; the browser row shows repeated 200 OK polls while the source row shows a single observation ten simulated minutes earlier, under the tag SIMULATED PIPELINE · COMPRESSED CLOCK.

**thumbnail.png:** Episode thumbnail for "Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old." showing a green Live badge next to a measurement-age counter reading 570 s, with the caption "Freshly fetched is not freshly observed."
