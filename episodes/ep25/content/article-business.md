SEO title (≤60 chars): Backup Says Successful? Ask Whether Anyone Has Restored It
Meta description (≤155 chars): A green backup dashboard proves a file was written, not that your data comes back. What the failure looks like, why it hides, five questions to ask.
Slug: backup-restore-tests
Primary keyword: backup restore testing   Secondary keywords (3–5): backup verification, disaster recovery questions, data backup risk, vendor backup assurance, business continuity
Medium tags (5): Startup, Product Management, Business Continuity, Data Backup, Leadership

# Your Backup Says 'Successful.' Can You Actually Restore It?

![A backup job reports success while a restored copy fails the foreign-key check and the order-totals query with the same record counts as the good backup](../hero.png)

## The symptom as a business event

The database fails on a Tuesday. Someone opens the backup folder and finds last night's file, right where the dashboard said it would be, marked "successful." They restore it. The application starts. Then support reports that some orders belong to customers who no longer exist, and finance reports that a customer's total is slightly off. Nobody can say which other numbers are wrong, because the file is the only copy of the truth and it looks fine.

No alarm went off. The backup job did what it was asked to do: it finished without an error. Nobody asked whether the result could be used.

This episode reproduces that gap on a local fixture with a small, made-up shop: 12 customers and 40 orders (local synthetic fixture). The backup reports success. We restore it into a separate location and check it, then build several deliberately broken backups to see what the checks catch.

## Why a demo cannot show this

A backup demo looks like this: run the job, show the green status, show the file in the folder. Everything in that sequence is true. The status is green and the file is there. The demo ends before the only step that matters, which is opening the file and asking whether the business could run from it.

That step gets skipped because restoring takes effort, feels risky, and shows no visible reward when it works. So the dashboard fills the gap with the one signal it has: the job did not fail. That signal is about the process. "It works" is about the data, and the data is never examined unless someone builds a check that examines it.

## The mechanism in plain terms

Think of a fire-safety drill versus a fire-extinguisher inspection tag. The tag says someone looked at the extinguisher on a given day. It does not tell you whether you, in a smoke-filled hallway, can pull the pin and put out a fire. Only a drill tells you that. A backup status is the tag. A restore test is the drill.

The analogy holds because the tag and the drill answer different questions about the same object.

In the fixture, the restore test runs eight separate checks on the restored copy. Each one is aimed at a different way a backup can be wrong:

- Does the file open as a database at all?
- Is the file's internal structure sound?
- Does every order still point at a customer that exists?
- Is it the right version of the design?
- Does it contain exactly the expected tables?
- Are the record counts right?
- Do specific known values match what they should be?
- Does the application's own order-total report produce the right numbers for all twelve customers?

The fixture shows why one check is not enough. One broken backup has the right number of customers and orders and a clean internal structure, but one order points at a customer who is not there. Another has the right counts, no missing links, and one amount that is 100 cents too high. Only the checks that look at relationships and real values caught those (local synthetic fixture). A third case is a backup made by copying only the main file of a database that was still being written to: it opened, and it was missing data.

## What to ask your team or vendor

1. When did someone last restore a backup into a separate environment, and can I see the record of that restore? A schedule is not a record.
2. What does the restore test check besides "it opened"? Ask specifically about relationships between records and about values compared against something known in advance.
3. Is the backup made with the database's supported backup method, or by copying files while the database is running? The second can silently leave out recent data.
4. Does the test run automatically and alert a person when it fails, or does it depend on someone remembering? A failed check that returns a clear result is useful. A crash that nobody sees is not.
5. What does the restore test not cover? A good answer names recovery time, how much recent data could be lost, and anything stored outside the database. A missing answer is information too.

If the answers are vague, the accurate state of your recovery plan is "unknown," not "protected."

## What it costs if ignored

No figures here, only the shape of the cost.

The first cost is discovery at the worst moment. You learn the backup is unusable during the outage instead of on a quiet afternoon, when the same finding costs a ticket.

The second is partial recovery nobody can trust. A restore that opens but holds a wrong amount or a missing link can be worse than an obvious failure, because the business resumes on data it cannot vouch for. Reconciling it later means finance, support and engineering comparing records by hand.

The third is the conversation with customers and, for some businesses, auditors. "We had backups" is weaker than "we restore them on a schedule and here is the result."

Scope matters too. The fixture is one small database. It says nothing about how long a real restore takes, how much recent data you could lose, or whether files, object storage, secrets and infrastructure come back.

## FAQ

**If my backup job shows success, is my data safe?**
Not necessarily. Success usually means the copy finished without an error. It does not mean anyone opened the result. In the fixture, backups that were wrong in different ways still produced files, and only a restore plus checks showed the difference.

**How often should we test restores?**
This episode does not measure that, so it gives no number. The reasoning is to test often enough that a broken backup is caught while the previous good one still exists, and after any change to how backups are made. Your recovery goals set the real answer.

**Does a restore test guarantee we can recover from a disaster?**
No. The fixture's test shows one small database restores and passes eight checks. It makes no claim about recovery time, how much recent data would be lost, or anything outside the database.

## Watch the episode

[YouTube link]

- 00:00 Backup reports success
- 00:10 What success established
- 00:24 Restore into a fresh path
- 00:41 Two checks, two questions
- 00:56 Known values and the real query
- 01:07 Invalid backups fail validation
- 01:27 What this does not cover

Related episodes: [I Deleted the Record. Why Is It Still Showing Up?](../../ep21/content/article-technical.md) and [Two Tabs. One Document. Where Did My Changes Go?](../../ep23/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A backup is a claim. Before you rely on it, ask who restored it, when, and what they checked.

Miz Causevic, Kinetic Gain LLC
