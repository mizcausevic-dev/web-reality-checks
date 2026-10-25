# ep05 fixture — directory data quality on 10,000 synthetic listings

**SYNTHETIC DATASET · SEEDED.** Every business, address, phone number (555 exchange) and hostname (reserved `.test` TLD) is invented. No real website is contacted; the website check talks to an in-process mock responder. Nothing here is a finding about any real directory.

## What it is

| File | Role |
|---|---|
| `generate.mjs` | Own seeded PRNG (mulberry32, seed `20261025`). Builds exactly 10,000 listings and a **separate** ground-truth file. Seeds six overlapping defect classes: duplicates (320 groups → 640 labelled rows), malformed URLs (250), missing required fields (300), old verification timestamps (900), changed addresses (400), simulated closures (350). A listing may carry several labels. Also seeds 200 harmless "edited since verified" rows with no label. |
| `listings.json` | The public dataset: 10,000 rows, one per line (~3.1 MB). Fields: `id, name, category, address{street,city,state,zip}, phone, website, lastCheckedAt, lastChangedAt, lastVerifiedAt`. Dates are date-only ISO (UTC midnight) to keep the file small. |
| `ground-truth.json` | Evaluation only. `listings[id].labels` + per-class detail (e.g. the real current street for a moved business). **Never read by the checker.** |
| `check.mjs` | Five checks: completeness, duplicate candidates (blocking on phone / name+ZIP / street+ZIP+name-stem), URL validity (syntactic), website availability (**local mock responder keyed by hostname pattern**), verification age (stale, and edited-since-verified as separate codes). Builds the reason-coded review queue. `evaluate()` compares against ground truth and is called only after `inspect()`. |
| `demo.mjs` | Runs the video scenario, writes `inspection-results.json`, `review-queue.json` (with one recorded decision by `reviewer-synthetic-01`) and `evidence.json`. |
| `test.mjs` | 17 `node:test` tests including two known-positive controls. |
| `review-rules.md` | The decision policy (timestamps, flag meanings, routing, decision vocabulary). |

## Run

```
node generate.mjs        # regenerates listings.json + ground-truth.json (deterministic)
node demo.mjs            # writes inspection-results.json, review-queue.json, evidence.json
node --test test.mjs
```

Fixed "now" is `2026-10-25`, so ages are reproducible.

## Mock website world

The hostname's second-level label selects the mock response: `*.ok.test` → 200, `*.slow.test` → timeout, `*.down.test` → ECONNREFUSED, `*.nx.test` → ENOTFOUND, `*.gone.test` → 410, anything else → ENOTFOUND. The label is *world behaviour*, not a quality label: open businesses are given slow/down/nx sites (~12% of them), and 30% of seeded closures keep a site that still answers 200. The checker cannot see buckets; it only sees the response.

## Deliberate policies

- Unique flagged listings and total issue instances are two different numbers and are never summed into one.
- A failed website check routes to review as `site_unreachable` / `site_gone`. It is a lead, never a closure verdict (`review-rules.md` §2, §4).
- `stale_verification` is age, not error. `edited_since_verified` is a signal, not a diagnosis.
- `lastCheckedAt`, `lastChangedAt`, `lastVerifiedAt` are separate fields; a re-check updates only the first.
- Deterministic defects (missing field, malformed URL) do not create review-queue entries on their own.
- Duplicate blocking skips blocks larger than 6 rows; base phone numbers are unique by construction, so every detected pair is a seeded pair in this dataset (0 unseeded duplicate flags). In a real directory shared phone lines would produce false candidates; see `review-rules.md`.

## Executed

`node --test test.mjs`:

```
# tests 17
# suites 0
# pass 17
# fail 0
```

`node demo.mjs` (numbers in `evidence.json` / `inspection-results.json`):

```
listings: 10000   issue instances: 3875   unique flagged listings: 3303   clean: 6697
code                    instances  uniqueListings
malformed_url                 231     231
site_gone                     126     126
stale_verification            921     921
missing_required              300     300
edited_since_verified         525     525
site_unreachable             1136    1136
duplicate_candidate           636     636
flags per listing: 1→2775  2→485  3→42  4→1

class                 seeded  detected  missed
duplicate                640       636       4
malformed_url            250       231      19
missing_required         300       300       0
stale_verification       900       900       0
changed_address          400       210     190
closed                   350       224     126

review queue: 2901   website failures on OPEN businesses: 1038   mock responder calls: 8922   real network calls: 0
example: L00070 "Copper Framing Co." copper-framing-co.slow.test -> timeout; ground truth: open.
decision: keep_listing_schedule_recheck by reviewer-synthetic-01 at 2026-10-25T09:14:00Z
```

Why the misses are expected (all are reported, not hidden):
- `changed_address` 190 missed: the business moved but nobody edited the row, so the public row carries no signal at all.
- `closed` 126 missed: the closed business's website still answers 200 (seeded at 30%), or its URL was also malformed and so never probed.
- `malformed_url` 19 missed: the `typo_domain` kind (`.okk.test`) is syntactically valid; a syntax check cannot catch it (the website check then flags it as unreachable instead).
- `duplicate` 4 missed: hard variants where the copy has a different phone, a shortened name and a reworded street.

## Limitations / not tested

- Website availability is mocked. Real probes would see redirects, TLS errors, bot blocks and parked domains; none of that is modelled.
- Duplicate detection is exact-key blocking after normalisation, not fuzzy matching; recall on the "hard" variants is luck of the key, and precision on real data would be lower.
- No real-world data, no real HTTP, no persistence beyond the JSON files. The reviewer is synthetic; the one decision is an example of the record shape, not a workflow.
- Detection rates are properties of *this* seeded dataset and *this* checker. They say nothing about any real directory.
