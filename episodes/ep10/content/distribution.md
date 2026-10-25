# EP10 distribution kit: I Changed One DNS Record and Broke My Website

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep10-dns-caches/` (evidence.json, test.mjs, README.md). The simulator is a model with a virtual clock; it contacts no real DNS infrastructure.

## YouTube

### Title options (≤ 60 chars), ranked

1. `I Changed One DNS Record and Broke My Website` (45) : the series title; a first-person incident that most people who have touched DNS recognize.
2. `Fixing the DNS Record Did Not Fix the Site. Here's Why.` (54) : states the surprising half of the episode, the fix that changed nothing for a full cache.
3. `Why DNS Propagation Is Not One Number` (37) : targets the most searched phrase in this space and corrects it in the title.
4. `Same Domain, Same Minute, Two Different Answers` (47) : the compare scene as a sentence; concrete and curiosity-driven.
5. `Lowering the TTL Will Not Save You Now` (38) : for engineers mid-incident; the retroactivity point is the one most teams get wrong.
6. `DNS Did Not Fail. It Sent You to the Wrong Address.` (51) : the accuracy point in the brief, phrased as the twist.

### Description

One DNS edit. One client loads the site, the other cannot connect. You fix the record. The broken client stays broken. Here is the clock behind it.

In this episode we run a deterministic DNS cache simulator with a virtual clock: one authoritative A record for example.test, two recursive resolver caches, two clients, and a simplified connect stage. At t=0 resolver A caches the correct address (192.0.2.10) with TTL 60. At t=10 the record is changed to the wrong address (192.0.2.20). At t=15 resolver B misses and caches the wrong address, also TTL 60. At t=20 client A connects and client B fails. At t=30 the record is restored, and client B still fails, because resolver B's entry expires at t=75 whatever happens at the source.

Resolution never failed: all 10 queries returned an address. Four connections failed, every one of them to the wrong address. Resolver A recovered at t=60 and resolver B at t=75. Two caches, two recovery times, no single propagation interval. The test suite runs 13 tests, 13 pass, including a known-positive control that proves the wrong record really is served and cached, a test that lowering the TTL is not retroactive, and a test that expiry permits a lookup but pushes nothing.

What the model leaves out: serve-stale, prefetch, browser and operating-system DNS caches, and AAAA records. Real investigations must check AAAA as well as A, and record TTL says nothing about how long your page content is cached. Separate clocks.

Chapters
00:00 One A-record edit, two different results
00:10 Resolution versus connection
00:21 Three copies of one answer
00:36 Restore the record; client B still fails
00:47 Why the stale answer stays until t=75
01:02 Expiry and the next query
01:17 Recovery: 10 queries, 0 resolution failures, 4 failed connections
01:32 Fixing the source does not erase every cached answer

Fixture, tests, diagnostic checklist and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep10/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

dns, dns cache, dns propagation, dns ttl, time to live, authoritative dns, recursive resolver, a record, aaaa record, dns troubleshooting, website down after dns change, dns explained, domain migration, site reliability, networking, web development, node.js, simulation, incident response, web reality checks

### Pinned comment (≤ 300 chars)

Everything in this episode runs on a deterministic local simulator with a virtual clock: a documentation domain, two modeled resolver caches, no real network. A simplified model, not a measurement of any DNS software. Simulator, 13 tests and checklist: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The record was fixed at t=30. Client B kept failing until t=75. Nothing done at the authority could have changed that.

Episode 10 of Web Reality Checks: a deterministic DNS cache simulator with a virtual clock. One authoritative A record, two recursive resolvers, two clients.

Resolver A caches the correct address at t=0 (TTL 60). The record is changed to the wrong address at t=10. Resolver B misses at t=15 and caches the wrong one (TTL 60, expiresAt=75). Restore at t=30. Client B still fails: cache hit, 45 s left on a wrong answer.

Three things the tests pin down:

1. Resolution never failed. All 10 queries returned NOERROR with an address. 4 connections failed, all to the wrong address.

2. Lowering the TTL is not retroactive. expiresAt = cachedAt + ttlAtFetch. Lower it to 5 at t=5 and the entry cached at t=0 still expires at t=60.

3. Expiry pushes nothing. Jump to t=100 with nobody asking; the stale entry is still stored, no query happened on its own.

A recovered at t=60, B at t=75. No single propagation time. Not modeled: serve-stale, prefetch, browser and OS caches, AAAA. Check AAAA for real.

13 tests, 13 pass (local synthetic fixture). Simulator, tests, four-layer checklist: github.com/mizcausevic-dev/web-reality-checks

#DNS #SiteReliability #WebDevelopment

### Post 2: non-technical leaders

"We fixed it." "I still can't get in." Both true at once, and the incident is not over.

Episode 10 of Web Reality Checks: a DNS record goes wrong and gets corrected. The fix reaches the source. Copies of the old record sit in caches your company does not run, each letting go on its own schedule.

In a local simulation, one resolver asked before the bad change and kept the right address. Another asked after and kept the wrong one. The record was corrected at 30 seconds; the affected client kept failing until 75, because the wrong answer was stored at 15 with a 60-second lifetime (local synthetic fixture).

Printed address books with an expiry date: updating the registry does not swap the books already on desks.

Five questions during a DNS incident:
1. Was the lookup failing, or returning the wrong address?
2. Which resolvers did you check, and what did each return, with time remaining?
3. Are both A (IPv4) and AAAA (IPv6) records verified?
4. Was the TTL lowered before the change, or during the incident, when it changes nothing for existing copies?
5. "It has propagated": a list of checked caches, or a number from a FAQ?

Synthetic simulation, no real product: github.com/mizcausevic-dev/web-reality-checks

#Leadership #IncidentResponse #ProductManagement

## X/Twitter thread

1/ I changed one DNS record. One client loaded the site, the other could not connect. I fixed the record. The broken client stayed broken for 45 more seconds and nothing I could do at the source would have changed that. Episode 10 of Web Reality Checks. Thread.

2/ Two steps hide in "load a website." Resolve: ask your resolver for an address. Connect: reach that address. Resolvers cache answers for the record's TTL. Editing the record changes what the next cache miss fetches. It touches nothing already cached.

3/ The simulation (virtual clock, no real network): resolver A caches the right address at t=0, TTL 60. Record changed to the wrong address at t=10. Resolver B misses at t=15 and caches the wrong one, TTL 60, so it expires at t=75. Client A connects, client B fails.

4/ Restore the record at t=30. Client B queries, cache hit, wrong address, 45 seconds left, connection fails. The fix changed nothing for a cache already full. Resolver A recovered at t=60, resolver B at t=75. Two caches, two moments, no single propagation time.

5/ Accuracy point 1: resolution never failed. All 10 queries returned NOERROR with an address. 4 connections failed, all to the wrong address. "DNS is down" is the wrong layer.

6/ Accuracy point 2: lowering the TTL is not retroactive. expiresAt = cachedAt + ttlAtFetch. A test lowers TTL to 5 at t=5; the entry cached at t=0 still expires at t=60. Point 3: expiry pushes nothing. The stale entry sits there until someone asks.

7/ Model limits: no serve-stale, no prefetch, no browser or OS caches, A record only. Real investigations must check AAAA too. And record TTL says nothing about content caching (Cache-Control, CDN). Separate clocks.

8/ 13 tests, 13 pass, including a known-positive control that the wrong record really is served (local synthetic fixture). Simulator, tests, four-layer diagnostic checklist and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A deterministic DNS cache simulator with a virtual clock showing why a corrected authoritative record does not reach already-cached resolvers, with 13 state-transition tests and a layered diagnostic checklist

**First comment:** This is a deliberately constructed local simulation (Node 22, zero dependencies, virtual clock, RFC 5737 documentation addresses held as strings), not a measurement of any resolver software or a finding about any real product. The model is simplified on purpose: one authoritative record, two resolver caches, two clients, a connect stage that is a string comparison, and no serve-stale, prefetch, browser or OS caches, or AAAA, all of which the README lists. The tests pin the points the episode makes: every answer is NOERROR and only connect fails, lowering the TTL is not retroactive for an entry already cached, expiry permits a lookup but pushes nothing, and the two resolvers recover at t=60 and t=75 with no single global interval.

## Short-form hook lines (≤ 12 words)

1. I fixed the DNS record. The site stayed broken. Here is why.
2. Same domain, same minute, two different answers.
3. DNS did not fail. It sent you to the wrong address.
4. Lowering the TTL now does nothing for a cache already full.
5. Fixing the source does not erase every cached answer.

## Alt text

**hero.png:** Diagram of two clients looking up example.test in the same minute: client A's resolver answers 192.0.2.10 from cache and the connection succeeds, while client B's resolver answers 192.0.2.20 from a cache entry stored after the bad edit and the connection fails, even though the authoritative record has been restored to 192.0.2.10. Tag reads "SIMULATED DNS MODEL · NO REAL NETWORK".

**thumbnail.png:** Episode thumbnail for "I Changed One DNS Record and Broke My Website" showing one authoritative record and two resolver cache boxes holding different addresses with different seconds remaining, one client connected and one failing, over a simulated-model label.
