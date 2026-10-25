SEO title (≤60 chars): Your Scheduled Job Ran Twice: What to Ask Your Team
Meta description (≤155 chars): A report generated twice for one scheduled run is not always the scheduler's fault. Why demos miss it, the plain-terms mechanism, five questions to ask.
Slug: scheduled-job-twice
Primary keyword: scheduled job ran twice   Secondary keywords (3–5): duplicate reports, duplicate scheduled tasks, software reliability questions, vendor due diligence, background job failures
Medium tags (5): Product Management, Startup, Software Development, Reliability, Leadership

# Your Scheduled Job Ran Twice. Was the Scheduler Wrong?

![One scheduled instant, daily_sales at 2026-03-02T02:00:00Z, feeds two invocations that each commit a report row; the reports table with no UNIQUE on the logical run shows two complete rows](../hero.png)

## The symptom as a business event

Monday morning, the daily sales report for the same day shows up twice. Or the customer who was supposed to get one statement has two in the inbox. Someone blames the scheduler, and a third person re-runs the job "to be safe," which adds a third copy.

This episode reproduces the smallest version of that event on a local fixture with synthetic data. One logical job, a report for a given type and a given scheduled time, is started by two separate worker processes. In the flawed version the database ends up with 2 complete reports for that one run. In the corrected version it holds 1 (local synthetic fixture).

The fixture does not claim any particular scheduler misbehaves, or how often. It forces two invocations on purpose, because the interesting question is not "who fired twice?" It is "what does our application do when it happens?"

## Why a demo cannot show this

A demo starts the job once. Once, it works: the report appears, the numbers match, everyone nods. The duplicate only appears when two invocations overlap within the same moment, and no one demonstrates that on purpose. In the fixture it takes a test barrier that holds both workers until each has finished looking and found nothing, then releases them together. Without that control, the flaw can wait for a busy night or a deploy that overlaps a schedule.

So a passing demo answers "can the job produce a report?" It cannot answer "what happens when two copies of the job start for the same run?" Only a deliberate test can, and the fixture includes one that is built to fail on the flawed version so the team knows the test can see the problem.

## The mechanism in plain terms

Picture a records room with one filing cabinet. The monthly report goes in one folder. Two clerks are told to produce it. Each opens the cabinet, sees no folder, goes off to prepare the report, and files it. Neither did anything wrong by their own logic: each checked first. But the check and the filing were separate steps, and the other clerk did the same thing in between. Now there are two folders.

The repair is not "tell the clerks to be careful." It is to label one slot in the cabinet for exactly that report, and make the cabinet refuse a second folder in that slot. In the fixture that label is a database rule on the pair "report type plus scheduled time in UTC." A clerk who arrives second gets refused, looks at the folder already in the slot, confirms it is complete, and goes home. The analogy holds for the part that matters: the rule lives in the shared cabinet, not in any one clerk's head. One limit of the analogy: a real worker may have to wait briefly for the lock, and if the wait runs out it reports a retryable failure instead of guessing.

The fixture shows three more details that matter to a business reader:

- A worker that crashes halfway leaves nothing behind. A killed worker left 0 rows visible, and a retry then produced exactly 1 (local synthetic fixture). No half-finished report was ever saved as if it were done.
- "I could not get the lock" is not the same as "someone already finished." The fixture treats a lock timeout as a retryable failure with 0 rows, not as success.
- A flag kept in one program's memory does not help across two programs. Two processes each skipped their own repeat, and the database still held 2 rows.

## What to ask your team or vendor

1. For each scheduled job, what is the "logical run," and where in the database is it enforced? Ask for the rule by name, not for a description of good intentions.
2. If the same job starts twice at the same moment, what is committed? Ask to see a test that forces that overlap and shows one result.
3. Is there a deliberately broken version the tests catch? Without one, a green test may only mean the race was never triggered.
4. If a worker dies midway, or cannot get a lock, what state is left behind, and who retries? "Retries automatically" needs an owner and a rule for when a lock timeout counts as failure rather than success.
5. Does the job also send emails, call other systems or write files? Those happen outside the database rule and need their own protection against being done twice.

Vague answers mean the behavior is unknown, not safe.

## What it costs if ignored

No invented figures, only the shape of the cost.

The visible cost is duplicate output: a statement sent twice, a total counted twice, a downstream system fed the same record again. The invisible cost is trust in your numbers: once a team has seen one duplicate, people start reconciling by hand.

There is also a diagnosis cost. Without a rule of its own, every duplicate becomes an argument about whether the scheduler, the deploy or the retry logic is to blame. A rule in the database turns the question from "who fired twice?" into "did we commit twice?"

## Scope and limits

The guarantee demonstrated is one committed database report per logical run. It is not "the job runs exactly once": both workers still run, and one of them does nothing. External actions need their own coordination. The fixture also does not retry anything for you, and it was tested on one machine with one local database file, so it makes no claims about other databases or about timing.

## FAQ

**Is a duplicated report proof that the scheduler is broken?**
No. A second invocation can come from a retry, an overlapping deploy or a manual re-run. This episode does not test any scheduler. It shows that the application should survive two invocations without committing two results.

**Will a duplicate-prevention rule stop duplicate emails too?**
Not by itself. In the fixture the rule protects what is stored in the database. An email sent while the job runs is outside that rule and needs its own protection, so ask how each outside effect is guarded.

**Can we fix this by running only one copy of the job?**
That lowers the odds but does not remove the risk. Retries, restarts and manual runs can still overlap. The fixture shows the reliable version: let the database refuse the second result.

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Scheduling starts work. Coordination decides what commits. Ask who owns the second half.

Miz Causevic, Kinetic Gain LLC
