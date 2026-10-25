SEO title (≤60 chars): A Backup Is Not a Restore: Why 'Successful' Proves Little
Meta description (≤155 chars): An app says the backup succeeded. That only means a file was saved. A plain-language look at why only a test restore shows your data comes back.
Slug: backup-restore-tests
Primary keyword: is my backup working   Secondary keywords (3–5): backup vs restore, how to test a backup, backup successful but data missing, why backups fail
Medium tags (5): Technology, Data Backup, Privacy, Explainer, Software

# Your Backup Says 'Successful.' Can You Actually Restore It?

![A backup job reports success while a restored copy fails the foreign-key check and the order-totals query with the same record counts as the good backup](../hero.png)

Imagine you are moving house. You pack the kitchen into a box, tape it shut and write "KITCHEN" on the side. The box exists and is sitting in the truck. But you have not opened it in the new house, so you do not know whether the plates arrived in one piece, whether the lids match the pots, or whether half of it is still on the counter back home.

A backup that says "successful" is that taped, labeled box. It tells you a box was packed, not what is inside.

## What the episode shows

We built a tiny online shop on a laptop, with made-up data: 12 customers and 40 orders (local synthetic fixture). We made a backup. The program reported success: a file existed and nothing went wrong while it was written.

What does that prove? A file was written. Not that it opens, that every order still belongs to a customer, or that the numbers add up.

So we did the step that is easy to skip: unpack the box. We restored the backup into a new, separate place, leaving the original untouched, and ran eight checks on the copy. The good backup passed all eight, including: the file opens, every order points at a real customer, and the shop's own "totals per customer" report gave the expected answer for all twelve customers.

## Broken boxes that still look fine

Then we packed boxes badly on purpose (local synthetic fixture).

**A box with a fake label.** A plain text file named like a backup. Opening it failed, and the check said so in a clear report.

**A box where one receipt points at nothing.** The counts match the good backup: 12 customers, 40 orders. The structure check passes. But one order belongs to a customer who is not in the box. Counting items never reveals that. Checking every receipt does.

**A box where one price is wrong.** Same counts, no missing links, one amount off by 100 cents. Only comparing against values we knew in advance, and re-running the shop's own totals report, exposed it.

**A box packed while the kitchen was in use.** Some databases keep their newest changes in a side file before folding them into the main one. Copy only the main file and you pack the cupboard but leave the freshest items on the counter. That copy opened fine and was still missing data. The database's own backup tool, which knows about the side file, produced a complete copy.

A file that exists and opens can still be wrong, and each kind of wrongness needs its own check.

## A backup is a snapshot

After the backup, we added one more order to the original shop: 41 orders there, 40 in the restored copy. A backup is a photograph of one moment.

## What this episode does not claim

It is one small, made-up database. It says nothing about how long a real restore takes, how much recent work could be lost, or whether things stored outside the database, such as files, would come back. The broken backups were built on purpose, not by real file damage.

## What this means for you

- A green "backup complete" message is the start of the question, not the answer. Ask when anyone last restored a copy and looked at the result.
- Put a restore test on the calendar: restore into a separate place, then check that real things are there, like a customer you know, a recent order, a total you can verify by hand.
- If you pay someone to handle backups, ask to see the last test restore and what was checked. "It runs every night" is a schedule, not a result.

## FAQ

**If my backup says it succeeded, is my data safe?**
Not necessarily. Success usually means a file was saved without an error. In the episode, backups that were wrong in different ways still produced files. Only restoring and checking showed it.

**What does it mean to "restore" a backup?**
It means putting the saved copy back into working form, ideally in a separate place, and checking that it holds the right information. Saving and getting back are different jobs.

**Can I check my own backup without being technical?**
A little, yes. Restore it somewhere separate, then look for things you know are true: a customer you remember, last week's order, a total you can check by hand. It beats trusting the status message.

## Watch the episode

[YouTube link]

- 00:00 Backup reports success
- 00:11 What success established
- 00:24 Restore into a fresh path
- 00:41 Two checks, two questions
- 00:55 Known values and the real query
- 01:06 Invalid backups fail validation
- 01:28 What this does not cover

Related episodes: [I Deleted the Record. Why Is It Still Showing Up?](../../ep21/content/article-technical.md) and [Two Tabs. One Document. Where Did My Changes Go?](../../ep23/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The label was never the point. Opening the box in the new house is. A backup is a claim, and the restore is the test.

Miz Causevic, Kinetic Gain LLC
