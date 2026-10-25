SEO title (≤60 chars): Flagged Listings vs Issue Instances: Never Sum the Columns
Meta description (≤155 chars): 10,000 synthetic listings, five checks, 3,875 issue instances on 3,303 listings. Why the numbers differ, why a timeout is not a closure, how to review.
Slug: directory-quality
Primary keyword: directory data quality   Secondary keywords (3–5): duplicate detection, dead link checker, verification timestamps, review queue, synthetic dataset
Medium tags (5): Data Quality, Data Engineering, Node.js, Software Engineering, Web Development

# Your Directory Has 10,000 Listings. How Many Are Wrong?

![Listing L00070 Copper Framing Co. with its website check showing a timeout, beside the ground-truth panel the checker never saw, which says the business is open](../hero.png)

The directory has 10,000 listings, and that is the only number it has. Run five automated checks over the rows and you get 3,875 issue instances on 3,303 distinct listings, and the largest single flag, a failed website check, landed 1,038 times on businesses that are open (local synthetic fixture).

This is episode five of Web Reality Checks. The dataset is generated from a fixed seed, every business is invented, and the ground truth that says what was planted lives in a separate file the checker is forbidden to read. That lets us say how many problems exist, how many the checker found, how many it missed, and how badly the headline number lies if you add the columns together.

## What actually happens

A listing count measures how many rows exist, not how many are right. A row can be present and still be a duplicate, point at a URL that does not parse, or hold an address nobody has confirmed in three years. These problems do not partition the data. One row can carry several at once.

That overlap drives the most common reporting mistake in this space. A dashboard shows a column per check: 1,136 unreachable sites, 921 stale verifications, 636 duplicate candidates. Someone sums the column and announces "3,875 bad listings." But a listing with a stale date and a timed-out website is one listing with two flags. The sum of per-code counts is issue instances. Distinct flagged listings is a smaller number, found only by grouping instances by listing ID and counting the groups.

The second mechanism is what a probe can see. A website check observes one response at one moment: 200, 410, connection refused, DNS miss, timeout. It observes nothing about whether the business behind the hostname exists. Hosting lapses and slow servers produce failures on open businesses; a closed business with prepaid hosting answers 200 for years. Treating a probe result as a closure verdict converts a transport fact into a business fact with no step that justifies the conversion.

The third mechanism is timestamps. "Last checked," "last changed" and "last verified" are three events with three actors: a probe, an editor, and a human. Store one date, or let a re-check advance the verification date, and you can no longer tell a confirmed row from a merely probed one.

## The fixture

`fixtures/ep05-directory-quality/` is plain Node 22 ESM with zero dependencies. `generate.mjs` uses its own mulberry32 PRNG seeded with `20261025` to build exactly 10,000 listings and a separate `ground-truth.json`. It seeds six overlapping defect classes: duplicates (320 groups, 640 labelled rows), malformed URLs (250), missing required fields (300), old verification timestamps (900), changed addresses (400) and closures (350) (local synthetic fixture). A fixed "now" of `2026-10-25` makes every age reproducible.

`check.mjs` runs five checks on the public rows only. The website check never touches the network; it calls an in-process mock responder keyed by the hostname's second-level label:

```js
export const mockResponder = (hostname) => {
  const bucket = hostname.split('.').slice(-2, -1)[0];
  switch (bucket) {
    case 'ok': return {status: 200, ms: 20};
    case 'slow': return {error: 'timeout', ms: SITE_TIMEOUT_MS}; // exceeds SITE_TIMEOUT_MS
    case 'down': return {error: 'ECONNREFUSED', ms: 5};
    case 'nx': return {error: 'ENOTFOUND', ms: 3};
    case 'gone': return {status: 410, ms: 18};
    default: return {error: 'ENOTFOUND', ms: 3}; // unknown hosts (e.g. typo domains) resolve to nothing
  }
};
```

The bucket is world behavior, not a quality label. About 12% of open businesses get slow, down or nx sites, and 30% of seeded closures keep a site answering 200.

The verification check emits two codes, because age and edit-after-verification are different facts, and the evidence payload carries the policy in plain text:

```js
if (days > STALE_DAYS) out.push({listingId: l.id, check: 'verification', code: 'stale_verification', evidence: {verifiedDaysAgo: days, note: 'age is a reason to re-verify, not evidence the row is wrong'}});
if (!Number.isNaN(c) && c > v) out.push({listingId: l.id, check: 'verification', code: 'edited_since_verified', evidence: {lastChangedAt: l.lastChangedAt, lastVerifiedAt: l.lastVerifiedAt}});
```

Routing is explicit. Deterministic defects are repair tasks; everything that only suggests a real-world fact goes to a human:

```js
export const REVIEW_CODES = new Set(['site_unreachable', 'site_gone', 'duplicate_candidate', 'edited_since_verified', 'stale_verification']);
export const PRIORITY = {site_gone: 1, duplicate_candidate: 2, site_unreachable: 3, edited_since_verified: 4, stale_verification: 5};
```

`inspect()` returns `totalIssueInstances` and `uniqueFlaggedListings` as two fields and builds one review-queue card per listing. `evaluate()` is separate, runs only after inspection, and reports detected versus missed per seeded class.

## The test that proves it

`node --test fixtures/ep05-directory-quality/test.mjs` reports `# tests 17  # pass 17  # fail 0` (local synthetic fixture). The names that carry the argument:

- `the checker never reads ground-truth.json` (scans `check.mjs` source for any ground-truth reference, file read or network import)
- `every public listing separates lastCheckedAt, lastChangedAt, lastVerifiedAt`
- `unique flagged listings is reported separately from total issue instances and is never their sum`
- `KNOWN-POSITIVE CONTROL: website failures occur on businesses that are OPEN in ground truth`
- `KNOWN-POSITIVE CONTROL: some seeded defects are missed by the checker (and are reported as missed)`
- `review queue holds only judgement-call codes, one entry per listing, with evidence`

The two controls are the ones most teams would not write. The first asserts `unreachableButOpen.count` is greater than zero: "if this were 0 the 'lead, not proof' lesson would be untestable." The second asserts that `changed_address`, `closed` and `malformed_url` each have misses and that `detected + missed === seeded` for every class.

From `evidence.json` (local synthetic fixture): 10,000 listings, 3,875 issue instances, 3,303 distinct flagged listings, 6,697 clean. Per code: `site_unreachable` 1,136, `stale_verification` 921, `duplicate_candidate` 636 (318 pairs), `edited_since_verified` 525, `missing_required` 300, `malformed_url` 231, `site_gone` 126. Each code fires at most once per listing, so overlap lives across codes: 2,775 flagged listings carry one flag, 485 two, 42 three, one four. Mock responder calls 8,922; real network calls 0.

## The repair

There is no single bug to patch. The repair is the set of reporting and routing rules in `review-rules.md`, enforced by the tests above.

Report two numbers, never one. `uniqueFlaggedListings` counts listings; `totalIssueInstances` counts issues. A test fails if they are ever equal while overlap exists.

Route by evidence type. `missing_required` and `malformed_url` are deterministic and never enter the review queue on their own. The five judgement codes go to a human, one card per listing, every flag on the card, sorted by highest-priority flag.

Make closure expensive. `mark_closed` requires two independent signals, for example site gone plus phone disconnected. A single failed website check is never sufficient. The weak-signal path is `keep_listing_schedule_recheck`, which advances `lastCheckedAt` and re-probes later.

Record decisions as evidence: `listingId`, `decision`, `reason`, `evidence`, `reviewedAt`, `reviewer` and `fieldsUpdated`. A re-check never advances `lastVerifiedAt`. Only a `verify_*` decision does.

## Retest

The worked example from `evidence.json` (local synthetic fixture): `L00070`, "Copper Framing Co.", website `copper-framing-co.slow.test`. The mock returned a timeout, so the checker emitted `site_unreachable`. The listing also carried `stale_verification`: last verified `2023-01-20`. In ground truth, which the checker never saw, the only label is `stale_verification`. The business is open.

The decision is `keep_listing_schedule_recheck` by `reviewer-synthetic-01` at `2026-10-25T09:14:00Z`. `lastCheckedAt` moved from `2026-10-13` to `2026-10-25`. `lastVerifiedAt` stayed at `2023-01-20`, because nothing was verified. The final test asserts `'lastVerifiedAt' in d.fieldsUpdated` is false.

Across the dataset, 1,038 of the 1,136 `site_unreachable` flags landed on listings with no `closed` label in ground truth (local synthetic fixture). Treating a failed probe as a closure would have hidden over a thousand open businesses.

Detected versus missed per seeded class (local synthetic fixture): duplicate 640 seeded, 636 detected, 4 missed. malformed_url 250 / 231 / 19. missing_required 300 / 300 / 0. stale_verification 900 / 900 / 0. changed_address 400 / 210 / 190. closed 350 / 224 / 126. Moved businesses with no edit trail leave no signal in the public row; closures still answering 200 are invisible to a probe; typo domains like `.okk.test` are syntactically valid. All are reported as missed, not dropped.

## What this does not prove


- Everything is simulated: generated dataset, mock responses, synthetic reviewer. The detection rates belong to this dataset and this checker, not to any real directory.
- Real HTTP behavior is not modelled: redirects, TLS errors, bot blocks and parked domains all produce signals this fixture never sees.
- Duplicate detection is exact-key blocking after normalization, not fuzzy matching. Base phones are unique by construction, so every detected pair here is seeded. Real shared office lines would produce false candidates, which is why the code routes to review.
- The one recorded decision shows the record shape, not a workflow.

## Launch checklist

1. Quality reports show distinct flagged listings and total issue instances as two numbers; nobody sums the per-check columns.
2. `lastCheckedAt`, `lastChangedAt` and `lastVerifiedAt` are three stored fields; a re-check can only touch the first.
3. A failed website probe routes to review as a lead. No code path marks a listing closed on one failed probe.
4. Closure requires two independent signals, and the policy is written down.
5. Deterministic defects go to a repair queue, not a human review queue.
6. Each review card carries every flag and its evidence for that listing.
7. Every decision records evidence, timestamp and reviewer identity.
8. The checker is evaluated against a labelled set it never reads; misses are reported per class.

## FAQ

**Why is the number of flagged listings smaller than the number of issues?**
Because problems overlap. One listing can have a stale verification date and an unreachable website at once: two issue instances, one listing. In the fixture the gap is 3,875 instances against 3,303 listings (local synthetic fixture). Summing per-check columns counts listings more than once.

**Does a failed website check mean the business closed?**
No. A timeout, refused connection or DNS miss describes the server at one moment, not the business. In the fixture, 1,038 failed checks landed on open businesses (local synthetic fixture). Treat it as a lead, route it to review, and require a second independent signal before marking closed.

**What is the difference between last checked and last verified?**
Last checked records that an automated probe ran. Last verified records that a human confirmed the row against the real business. A re-check should move only the first. If one date serves both roles, you cannot tell a confirmed row from a merely probed one.

## Watch the episode

[YouTube link]

- 00:00 10,000 listings: a count, not a quality measure
- 00:10 Problems overlap: one row, several flags
- 00:27 Five checks on the public rows only
- 00:41 The numbers: 3,875 instances, 3,303 listings
- 00:55 A timeout on a business that is open
- 01:08 The review queue
- 01:18 Recording a decision
- 01:30 What the checker missed

Related episodes: [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A count tells you how many rows exist. Evidence tells you how many are right. A failed website check is a lead, not proof.

Miz Causevic, Kinetic Gain LLC
