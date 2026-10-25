SEO title (≤60 chars): Your Directory Counts Listings. Does It Count Evidence?
Meta description (≤155 chars): A listing count is not a quality measure. What a synthetic 10,000-row audit shows about overlapping flags, false closures, and what buyers should ask.
Slug: directory-quality
Primary keyword: directory data quality   Secondary keywords (3–5): listing accuracy, data quality metrics, vendor due diligence, review queue, dead link audit
Medium tags (5): Product Management, Data Quality, Startup, SaaS, Leadership

# Your Directory Has 10,000 Listings. How Many Are Wrong?

![Listing L00070 Copper Framing Co. with its website check showing a timeout, beside the ground-truth panel the checker never saw, which says the business is open](../hero.png)

## The symptom as a business event

The pitch deck says 10,000 listings. The homepage counter says 10,000. Then a customer calls about a plumber whose number has been disconnected for two years, or asks why the same bakery appears three times, or why a business that closed last spring is still marked "verified." Nobody can answer, because the only number the directory ever tracked was how many rows it had.

The second version is quieter and more expensive. Someone runs a link checker, sees a few hundred failures, and deletes them. Among the deletions are open businesses whose hosting lapsed for a week. Nobody told them.

This episode reproduces both failures on a synthetic dataset of exactly 10,000 generated listings with known planted problems. Five automated checks produced 3,875 issue instances on 3,303 distinct listings, because flags overlap. And 1,038 of the failed website checks landed on businesses that are open in the ground truth (local synthetic fixture). Every name and number is invented. Nothing here is a finding about any real directory.

## Why a demo cannot show this

A directory demo shows a search, a results page and a well-formatted listing. It cannot show whether the rows are right, because correctness is a relationship between a row and the world, and a screen only shows the row.

The headline count has the same limit. A directory can have 10,000 rows with 6,697 clean, or far fewer, and the counter looks identical. The only way to know is to measure each row against evidence, and report both what was found and what could not be seen.

## The mechanism in plain terms

Think of a warehouse inventory. The ledger says 10,000 pallets. A walk-through finds some pallets logged twice under different names, some with torn labels, some last confirmed three years ago, and some that moved bays after the ledger was written. One pallet can have several problems at once. Count problems and you get one number. Count pallets with problems and you get a smaller one. Add the columns together and you have invented pallets that do not exist.

That is the first thing the episode shows. Five checks ran over the public rows: required fields, likely duplicates, website address syntax, website response, and time since a human verified the row. The result was 3,875 issue instances across 3,303 distinct listings (local synthetic fixture). The gap is overlap: 2,775 flagged listings carried one flag, 485 two, 42 three, one four.

The second thing is what a check can see. When the crew phones the supplier on a pallet's label and nobody answers, that is a reason to follow up, not proof the supplier closed. In the fixture, the website check failed for 1,136 listings. 1,038 of those belonged to open businesses (local synthetic fixture). The on-screen example is a framing shop whose website timed out; in the ground truth it is open, and nobody has verified its row since January 2023.

So a failed check is a lead. Uncertain cases go to a review queue, each card carrying every reason it was flagged. A human records a decision with the evidence seen, a timestamp and a name. Marking a business closed requires two independent signals; one failed website check never qualifies.

The third thing is three dates that must never collapse into one. Last checked: a machine ran a probe. Last changed: someone edited the row. Last verified: a human confirmed the row against the real business. A re-check moves only the first. When the reviewer chose "keep the listing, re-check in a week," last checked moved to that day and last verified stayed at January 2023.

And the fixture reports what the checker missed. Of 400 moved businesses, 190 left no trace in the public row. Of 350 closed businesses, 126 still had a website answering normally (local synthetic fixture). A tool that reports only what it found overstates itself.

## What to ask your team or vendor

1. Do you report distinct flagged listings and total issue instances as two separate numbers? If you see one number, ask which it is and how it was computed.
2. What happens to a listing when its website fails a check? If the answer is "it gets removed" or "marked closed," ask what second signal was required. If none, open businesses are being deleted.
3. Are last checked, last changed and last verified three stored fields, and can an automated job ever move the verified date? It should not be able to.
4. How do you know what your checker misses? Ask whether it has been run against a labelled set with known answers, and what the miss rates were per category.
5. When a reviewer makes a decision, what gets recorded? It should include the evidence seen, a timestamp and who decided. "The row was updated" is not an audit trail.

Vague answers mean the honest state of the data is "unknown," not "clean."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost falls on the businesses listed. A directory that treats a failed probe as a closure hides open businesses, which lose whatever referrals the directory provided. They rarely find out.

The user-facing cost is trust. Someone who drives to a closed shop does not weigh the size of the catalog. They weigh whether to use the directory again.

The internal cost is inflated reporting. If per-check columns are summed, budgets get sized to a number that does not exist, and a cleanup that fixes the real 3,303 looks like it fell short of 3,875. The reverse also happens: a team that counts only what the checker found declares the data clean while moved and closed businesses sit untouched.

None of this shows on the counter. A directory can grow by a thousand rows a month and get worse every month, and the headline metric will celebrate the whole way down.

## FAQ

**Is a bigger directory a better directory?**
Not by itself. A listing count measures rows, not correctness. In the fixture, 10,000 rows produced 3,303 flagged listings and 6,697 clean ones, and the counter could not tell the difference (local synthetic fixture). Size matters only once each row is backed by evidence.

**If a business's website is down, should we remove the listing?**
No. A failed website check describes the server at one moment, not the business. In the fixture, 1,038 failed checks landed on open businesses (local synthetic fixture). Route it to review, re-check after an interval, and require a second independent signal before marking anything closed.

**How should we report data quality to a board or a buyer?**
Two numbers, never one: distinct listings with at least one flag, and total issue instances. Then per-check counts, noting that they overlap. Then what the checker is known to miss, measured against a labelled set. Anything less is a count dressed up as a quality measure.

## Watch the episode

[YouTube link]

Related episodes: [One Click. Three Purchase Events. Here's What Went Wrong.](../../ep02/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The counter tells you how many rows you have. Only evidence tells you how many are right. Before you trust a quality number, ask whether it counts listings or issues, and what the checker is known to miss.

Miz Causevic, Kinetic Gain LLC
