SEO title (≤60 chars): Why You Got the Same Email Twice: Two Jobs, One Task
Meta description (≤155 chars): Why a computer sometimes does the same scheduled task twice, and how a simple "one slot only" rule keeps a second copy from sticking. Plain language.
Slug: scheduled-job-twice
Primary keyword: why did I get the same email twice   Secondary keywords (3–5): duplicate emails explained, scheduled tasks explained, why apps do things twice, duplicate charges explained, how computers avoid duplicates
Medium tags (5): Technology, Explainer, Software, Programming, Productivity

# Your Scheduled Job Ran Twice. Was the Scheduler Wrong?

![One scheduled instant, daily_sales at 2026-03-02T02:00:00Z, feeds two invocations that each commit a report row; the reports table with no UNIQUE on the logical run shows two complete rows](../hero.png)

Imagine an office where a monthly report is supposed to go into a single folder on a shared shelf. The boss tells two assistants, by accident, to prepare it. Each walks to the shelf, sees that the folder is empty, goes to their desk, writes the report and slides it in. When the boss checks, there are two copies of the same report.

Neither assistant was careless. Each looked first, then did the work. But "look" and "put it on the shelf" are two separate moments, and the other assistant slipped in between.

## What the episode shows

We built a tiny version of this on a laptop with made-up data. A small program is supposed to produce one sales report for one scheduled time. We start two copies of that program at once, as two completely separate processes, each with its own connection to the same database. Nothing here is real (local synthetic fixture).

In the first version, each copy checks whether the report exists. Both checks say no. A test control holds both back until each has finished checking, then lets them go together. Both write their report, and the database ends up with 2 reports for one scheduled time (local synthetic fixture). Nothing crashed. The computer did what it was told, twice.

This is not an accusation against the clock that starts such jobs. The episode forces two starts, because a task can be started twice after a retry, a restart or a second button press. The question is what the task does then.

## The fix, in one sentence

Give the shelf a rule: this slot holds exactly one report for this scheduled time, and the shelf refuses a second one.

In the fixed version the database itself enforces that rule. When both copies run again, with the same stale check and the same release, only one can write at a time. The first finishes the whole report and saves it. The second is refused, checks the report already there, and quietly stops. The result is 1 report (local synthetic fixture).

## What if a copy fails halfway?

The episode also kills one copy at the worst moment, after it started writing but before it finished. Because the report only counts once it is completely saved, the half-done work vanished. Another look at the database showed 0 reports, and running the job again produced exactly 1 (local synthetic fixture).

One more detail: if a copy cannot get its turn at the shelf because another one is holding it, it does not assume the job is done. It reports "try again later" and saves nothing. Not getting a turn does not mean someone else finished.

A sticky note on your own desk saying "I already did this" does not help when the other assistant has a different desk. In the episode, each copy had its own note, each skipped its own repeat, and the database still ended up with 2 reports.

## The limit

The rule guarantees one saved report per scheduled time. Both copies still ran, and one of them did nothing. And it covers only what is saved in that one database. If the task also sends an email, that email is outside the shelf, and it needs its own rule so it is not sent twice.

## What this means for you

- A duplicate email or report does not automatically mean the sender's clock is broken. Often the same task was started twice, and nothing stopped the second copy from counting.
- If you build or buy software that runs things on a schedule, ask one question: "If this job starts twice at the same moment, what gets saved?" A good answer names a rule inside the database, not a promise to be careful.
- If you get a duplicate, tell the company what you received and when. Do not retry it yourself; that can create a third copy.

## FAQ

**Why did I get the same email twice?**
A common cause is that the same task was started twice, for example after a retry or restart, and nothing stopped the second run from sending. The episode shows this for a saved report, not for email, and it does not test any real mail system.

**Can software guarantee a task only happens once?**
Not in general. This episode shows a narrower guarantee: one saved report per scheduled time. Actions outside the database, like sending an email, need their own protection. The fix also does not retry on its own.

**Is a duplicate always someone's mistake?**
Not always. Two starts is a normal risk, so the system should cope. The mistake is a design with no rule that says "only one result counts."

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Starting a task is easy. Deciding which result counts is the part someone has to build.

Miz Causevic, Kinetic Gain LLC
