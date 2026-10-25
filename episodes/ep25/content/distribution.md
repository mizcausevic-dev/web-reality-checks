# EP25 distribution kit: Your Backup Says 'Successful.' Can You Actually Restore It?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep25-restore-tests/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Backup Says 'Successful.' Can You Restore It?` (50) : the series title trimmed to fit; names the reassuring status and the question it leaves open.
2. `Integrity Check Passed. The Backup Was Still Wrong.` (51) : the surprising result from the fixture, aimed at engineers who trust that one pragma.
3. `A Backup Is Not a Restore: Test It Before You Need It` (53) : states the thesis and the action; strong for search and shares.
4. `Same Row Counts, One Orphan Order, Failed Backup` (48) : concrete scene from the fixture; shows counts alone prove nothing.
5. `How to Test a SQLite Backup Restore` (35) : plain search-intent title for people looking for the method.
6. `Why 'Backup Successful' Proves Almost Nothing` (45) : for general viewers; the gap between a status and a result.

### Description

Your backup job says "successful." It has not been opened once. Here is what that status does and does not prove, and how to test it.

In this episode we build a small synthetic SQLite shop with 12 customers and 40 orders and back it up with SQLite's Online Backup API. The job reports success: a file exists and the call returned no error. Then we restore it into a new, isolated path, never touching the source, and run eight checks on the copy. The good backup passes all eight, including the application's real order-total query for all 12 customers.

Then five deliberately broken artifacts. A text file named like a backup fails at the first check with a structured result instead of a crash. An artifact with one order pointing at a missing customer keeps the same counts (12 and 40) and passes integrity_check, but fails foreign_key_check. An artifact with one amount 100 cents too high passes integrity, foreign-key and count checks, and fails the known-value and order-total checks. A control shows that copying only the main file of a live WAL database fails validation, while the Online Backup API on the same database passes. The suite runs 16 tests, 16 pass.

What this does not cover: one tiny synthetic database, no recovery-time or recovery-point claim, and nothing about files, object storage, secrets or infrastructure.

Chapters
00:00 Backup reports success
00:10 What success established
00:24 Restore into a fresh path
00:41 Two checks, two questions
00:56 Known values and the real query
01:07 Invalid backups fail validation
01:27 What this does not cover

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep25/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

database backup, backup and restore, restore testing, test your backups, sqlite, sqlite backup, sqlite online backup api, python sqlite3, wal mode, integrity_check, foreign_key_check, foreign keys, data integrity, disaster recovery, backup verification, backup strategy, node.js test runner, software engineering, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture: a synthetic SQLite shop, 12 customers, 40 orders. The broken backups were built by hand. Not a finding about any real product, and no recovery-time claim. Fixture, 16 tests, video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The backup reported success. integrity_check returned ok. Counts matched: 12 customers, 40 orders. The backup was still wrong.

Episode 25 of Web Reality Checks. A SQLite fixture, restored into a fresh path and run through eight separate checks.

Three artifacts that pass something people trust:

1. One order re-pointed at customer 999, counts unchanged. integrity_check says ok. foreign_key_check returns a row. Different questions.

2. One amount 100 cents too high, no orphan, counts unchanged. Only the known-value check and the app's real order-total query fail (Hugo Placeholder: 19911 expected, 20011 found).

3. The main file of a live WAL database, copied alone: 4096 bytes, with 49472 still in the -wal file. It opens and passes integrity_check. Schema, tables and counts fail. The Online Backup API on the same database passes all eight.

What I would push on a team: restore into a new path, derive expected values outside the database under test, and keep a deliberately broken artifact so the suite can be seen failing. 16 tests, 16 pass.

Scope: one tiny synthetic database, constructed corruption, no recovery-time claim.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#SQLite #DatabaseReliability #SoftwareEngineering

### Post 2: non-technical leaders

Your backup dashboard says "successful." When did anyone last open the backup?

Episode 25 of Web Reality Checks. "Successful" means a file was written and no error was raised. It does not mean your data comes back whole, and nothing on the dashboard can tell you the difference.

On a small made-up shop (12 customers, 40 orders), the good backup passed all eight restore checks. Then we built broken ones. One had every count right but an order belonging to a customer who was not there. One had a single amount wrong by 100 cents. Both would pass a check that only counts records or asks "does it open?"

An extinguisher's inspection tag says someone looked. Only a fire drill shows you can put out a fire.

Five questions for your team or vendor:
1. When was a backup last restored into a separate environment, and where is the record?
2. What does that test check beyond "it opened"?
3. Is the backup made with the database's supported method?
4. Does a failed test alert a person?
5. What does the test not cover, such as recovery time and recent data loss?

Vague answers mean "unknown," not "protected."

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#BusinessContinuity #DataBackup #Leadership

## X/Twitter thread

1/ The backup job said "successful." A file existed and the call returned no error. Nothing had been opened or read back. Episode 25 of Web Reality Checks: a backup is a claim, and the restore is the test. Thread.

2/ Fixture: a synthetic SQLite shop, 12 customers, 40 orders, schema version 3, WAL mode. Backup via the Online Backup API (Python sqlite3.Connection.backup). Restore into a fresh path, never the source. Then eight checks on the copy. Good backup: 8 of 8 pass.

3/ Broken artifact one: an order re-pointed at customer 999, counts still 12 and 40. integrity_check says ok. foreign_key_check returns a row. Structure and relationships are different questions. Passing one does not answer the other.

4/ Broken artifact two: one amount 100 cents too high. No orphan, counts unchanged, integrity and foreign keys pass. The app's real order-total query catches it: Hugo Placeholder expected 19911, found 20011. Counts alone could never show this.

5/ Control: copy only the main file of a live WAL database. 4096 bytes in the main file, 49472 still in the -wal file. It opens and passes integrity_check, then fails schema, tables, counts and values. The Online Backup API on the same database passes all eight.

6/ A text file named like a backup fails at the first check with "file is not a database" and a structured result. No crash. The validator never opens the source, and the restored copy holds the backup's data: source 41 orders, backup 40.

7/ Scope: one tiny synthetic database, constructed corruption, no recovery-time or recovery-point claim, nothing about files, object storage or secrets. 16 tests, 16 pass. The flaws are built by hand, not findings about any product.

8/ A backup is a claim. The restore is the test. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A small SQLite fixture showing why integrity_check, row counts and "it opened" each pass backups that are still wrong, with a restore-validation suite

**First comment:** This is a deliberately constructed local fixture with a synthetic 12-customer, 40-order database; the broken backups were built by explicit edits, so it is not a finding about any real product and it does not simulate real on-disk corruption. The validator restores each artifact into a fresh path and runs eight checks, and the suite includes controls where integrity_check passes on an orphaned order, counts pass on a wrong amount, and a main-file-only copy of a live WAL database fails while the Online Backup API passes. It makes no recovery-time or recovery-point claim, and the limits are listed in the README.

## Short-form hook lines (≤ 12 words)

1. The backup said successful. Nobody had ever opened it.
2. integrity_check said ok. The backup was still wrong.
3. Same row counts. One order pointing at a customer who is gone.
4. A backup is a claim. The restore is the test.
5. Copying a live database's main file is not a backup.

## Alt text

**hero.png:** A backup job reports success while a restored copy fails the foreign-key check and the order-totals query with the same record counts as the good backup.

**thumbnail.png:** Episode thumbnail for "Your Backup Says 'Successful.' Can You Actually Restore It?" showing a green "successful" backup badge beside a restored database failing validation checks, with 12 customers and 40 orders unchanged.
