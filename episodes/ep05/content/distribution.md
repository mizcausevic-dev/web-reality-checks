# EP05 distribution kit: Your Directory Has 10,000 Listings. How Many Are Wrong?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep05-directory-quality/` (evidence.json, test.mjs, README.md, review-rules.md). The dataset is generated from a fixed seed; every business, address, phone number and hostname is invented.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Directory Has 10,000 Listings. How Many Are Wrong?` (55) : the series title; the question every directory owner has and has never measured.
2. `3,875 Problems, 3,303 Listings: Why the Columns Don't Add` (57) : the two real numbers side by side; the gap is the hook for anyone who has built a quality dashboard.
3. `A Failed Website Check Is a Lead, Not Proof` (43) : the closing line as a thesis; names the policy the episode argues for.
4. `1,038 "Dead" Websites. The Businesses Were Open.` (48) : the headline fact; the quote marks do the work.
5. `Last Checked Is Not Last Verified` (33) : short, mechanism-first; good for search intent around data freshness.
6. `We Planted Problems in 10,000 Listings. What Got Missed?` (55) : the detected-vs-missed angle for engineers who distrust tools that report only hits.

### Description

Your directory has 10,000 listings. That is the only number it has. We ran five checks and found the count was hiding a different story.

In this episode we generate exactly 10,000 synthetic directory listings from a fixed seed, plant overlapping problems in them (duplicates, malformed URLs, missing fields, old verification dates, moved businesses, closures) and record what we planted in a separate ground-truth file the checker is forbidden to read. Then we run five checks on the public rows only: completeness, duplicate candidates, URL syntax, website availability (against a local mock responder, zero real network calls) and verification age.

Result: 3,875 issue instances, but only 3,303 distinct flagged listings, because one row can carry several flags. Add the columns together and you invent problems that do not exist. The biggest single category, 1,136 failed website checks, landed 1,038 times on businesses that are open in ground truth. The on-screen example is Copper Framing Co., whose site timed out while the business is fine.

So failed checks are leads, not verdicts. They go to a review queue, one card per listing with every flag on it. A reviewer records a decision with evidence, timestamp and name. Last checked moves. Last verified does not, because nothing was verified.

The checker also missed planted problems: 190 of 400 moved businesses left no trace in the row, and 126 of 350 closures still had a site answering 200. Those are reported as missed, not hidden. 17 tests, 17 pass, including two known-positive controls.

Chapters
00:00 10,000 listings: a count, not a quality measure
00:10 Problems overlap: one row, several flags
00:27 Five checks on the public rows only
00:41 The numbers: 3,875 instances, 3,303 listings
00:55 A timeout on a business that is open
01:08 The review queue
01:18 Recording a decision
01:30 What the checker missed

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep05/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

data quality, directory listings, duplicate detection, dead link checker, website availability, data verification, review queue, synthetic dataset, seeded random data, ground truth, node.js, data engineering, listing accuracy, business directory, false positives, known-positive control, data audit, last verified, web development, web reality checks

### Pinned comment (≤ 300 chars)

Every listing here is synthetic: 10,000 rows from a fixed seed, invented names, 555 numbers, .test hostnames, website checks against a local mock. No real site was contacted; nothing here is about a real directory. Fixture and 17 tests: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

3,875 issue instances. 3,303 flagged listings. If your dashboard calls the first number "bad listings," it is wrong by 572.

Episode 5 of Web Reality Checks. 10,000 synthetic directory listings from a fixed seed, six overlapping defect classes planted, ground truth in a file the checker never reads (a test proves it).

Five checks on the public rows: completeness, duplicates, URL syntax, website availability via a local mock (0 real calls), verification age. Each code fires once per listing, so summing the per-code column gives instances, not listings. 485 listings carried two flags, 42 three, one four.

Three things I would push on any team:

1. Report uniqueFlaggedListings and totalIssueInstances as two fields. A test asserts unique < instances.

2. A failed probe is a lead. 1,038 of 1,136 site_unreachable flags were on open businesses. Route to review; mark_closed needs two independent signals.

3. lastCheckedAt, lastChangedAt, lastVerifiedAt are three fields. A re-check moves only the first.

The checker missed 190 of 400 moved businesses and 126 of 350 closures. Reported, not hidden. 17 tests, 17 pass.

All synthetic; not a finding about any real directory. github.com/mizcausevic-dev/web-reality-checks

#DataQuality #DataEngineering #SoftwareEngineering

### Post 2: non-technical leaders

Your directory says 10,000 listings. How many are right? If the only metric is the count, the honest answer is "unknown."

Episode 5 of Web Reality Checks. A synthetic directory of exactly 10,000 invented businesses, known problems planted, the checks a real directory would run.

Two findings for your next review.

First, flags overlap. The checks raised 3,875 issues on 3,303 listings. One entry can have an old verification date and a dead link at once. Add the columns and you overstate the problem and size a cleanup to a number that does not exist.

Second, a failed check is not a verdict. 1,038 failed website checks landed on open businesses. A directory that deletes on a failed probe removes real businesses and never tells them.

A warehouse ledger says 10,000 pallets. It cannot say how many labels are torn. Only a walk-through can.

Five questions for your team or vendor:
1. Flagged listings and issue instances: two numbers or one?
2. What happens to a listing when its website fails a check?
3. Are last checked, last changed and last verified three fields?
4. Have you measured what your checker misses?
5. What does a reviewer's decision record?

Synthetic data, no real directory. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #DataQuality #Leadership

## X/Twitter thread

1/ A directory says 10,000 listings. We built one with exactly that many synthetic rows, planted known problems, ran five checks. The count hid everything. 3,875 issues. 3,303 flagged listings. 1,038 "dead" websites on open businesses. Episode 5 of Web Reality Checks. Thread.

2/ Flags overlap. One row can be a duplicate candidate, carry a stale verification date and have a timed-out site at once. Issues: 3,875. Listings with issues: 3,303. 485 rows had two flags, 42 had three, one had four. Sum the columns and you invent 572 listings that do not exist.

3/ Five checks on the public rows only: completeness, duplicate candidates, URL syntax, website availability, verification age. Website checks hit a local mock keyed by hostname. 8,922 mock calls, 0 real. The checker never reads ground truth; a test scans its source to prove it.

4/ site_unreachable fired 1,136 times. 1,038 of those were businesses open in ground truth. Example: Copper Framing Co., site timed out, ground truth says open, only real issue is nobody verified the row since Jan 2023. A probe describes a server, not a business.

5/ So a failed check routes to a review queue, one card per listing, every flag on the card, highest-priority flag first. mark_closed needs two independent signals. One timeout never qualifies. The decision records evidence, timestamp and reviewer identity.

6/ Three dates, three meanings. lastCheckedAt: a probe ran. lastChangedAt: someone edited. lastVerifiedAt: a human confirmed. Decision: keep_listing_schedule_recheck. lastCheckedAt moved to 2026-10-25. lastVerifiedAt stayed at 2023-01-20. Nothing verified, nothing moved.

7/ The checker also missed things, reported rather than hidden: 190 of 400 moved businesses left no trace in the row. 126 of 350 closures still had a site answering 200. 19 typo domains passed a syntax check. 17 tests, 17 pass, two known-positive controls assert the misses exist.

8/ A failed website check is a lead, not proof. All data synthetic, seeded, .test hostnames, 555 numbers; not a finding about any real directory. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A seeded synthetic directory of 10,000 listings with a separate ground-truth file, five zero-dependency checks, and per-class detected vs missed reporting

**First comment:** This is a deliberately constructed local fixture: every one of the 10,000 listings is generated from a fixed seed with invented names, 555 phone numbers and reserved .test hostnames, website checks go to an in-process mock responder, and nothing here is a finding about any real directory. The point of the exercise is reporting discipline: unique flagged listings (3,303) and total issue instances (3,875) are two fields that are never summed, a failed website probe routes to a review queue as a lead rather than a closure (1,038 of 1,136 unreachable flags were on open businesses in ground truth), and evaluate() runs only after the checker and reports what it missed per seeded class (190 of 400 moved businesses, 126 of 350 closures). Limits are in the README: no real HTTP behavior, exact-key duplicate blocking rather than fuzzy matching, and detection rates that belong to this dataset and this checker only.

## Short-form hook lines (≤ 12 words)

1. 10,000 listings. The only number the directory has.
2. 3,875 problems. 3,303 listings. The columns do not add.
3. The website timed out. The business was open.
4. Last checked moved. Last verified did not.
5. A failed website check is a lead, not proof.

## Alt text

**hero.png:** Listing card for L00070 "Copper Framing Co." showing a website check result of timeout on copper-framing-co.slow.test, beside a ground-truth panel labelled "never seen by the checker" that reads "open, stale_verification only," with the corner tag "SYNTHETIC DATASET · SEEDED."

**thumbnail.png:** Episode thumbnail for "Your Directory Has 10,000 Listings. How Many Are Wrong?" showing a large 10,000 counter with listing cards sliding beneath it into reason-coded review queues, one card carrying several flags, and the caption "A failed website check is a lead, not proof."
