# EP23 distribution kit: Two Tabs. One Document. Where Did My Changes Go?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep23-optimistic-concurrency/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Two Tabs. One Document. Where Did My Changes Go?` (48) : the series title; names the exact moment users recognize and asks the question the episode answers.
2. `Both Saves Returned 200 OK. One Edit Still Vanished.` (52) : concrete and counterintuitive; the success code is the hook for engineers.
3. `The Lost Update Bug: Fix It With expectedVersion` (48) : search-friendly; names the problem and the repair.
4. `Why Your Saved Changes Disappear (and the 409 Fix)` (50) : plain-language search intent for general viewers.
5. `Last Writer Wins: How Two Saves Erase an Edit` (45) : states the mechanism in a short phrase; good for shares.
6. `Before Saving, Check What You Are Replacing` (43) : the episode's closing line as a thesis.

### Description

Tab A saves a new title: 200 OK. Tab B saves: the old title is back. No error anywhere. Here is why, and a repair that returns 409 instead.

In this episode two independent clients load the same document at version 1. A edits the title. B edits only the body, but B's local copy still holds the old title and saving sends the whole document. The flawed endpoint runs an unconditional update that only asks whether the ID matches, so the last writer wins: A gets 200 and version 2, B gets 200 and version 3, and the title is back to "Launch plan".

Then we repair it. The client sends expectedVersion with the edit. The server runs one atomic UPDATE that matches the ID and the version, replaces the content and increments the version, then checks how many rows changed. Never a read followed by a write. Retest: A saves against version 1 and gets 200, now version 2. B also sends version 1, matches no row, and receives 409 with the current version. B's unsaved text is kept, both versions are shown, and a person resolves it. The suite runs 16 tests, 16 pass, including a known-positive control and a six-thread barrier test where exactly one same-version update is accepted.

What this does not cover: only a version mismatch is a 409, while a locked database returns 503. This detects conflicts. It is not real-time collaboration and not a CRDT. The "tabs" are Node client objects, not real browsers.

Chapters
00:00 Tab A saves, tab B undoes it
00:10 Rewind: two clients load version 1
00:18 A edits the title, B edits the body
00:27 The flawed update: last writer wins
00:39 The repair: expectedVersion and one atomic UPDATE
00:53 Retest: 200 for A, 409 for B
01:04 Compare: a person resolves the conflict
01:15 Limits: 409 vs 503, one winner, not a CRDT
01:32 Before saving, check what you are replacing

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep23/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

optimistic concurrency, lost update, last write wins, 409 conflict, expectedVersion, version conflict, atomic update, conditional update, sqlite, node.js, api design, concurrency bugs, race condition, data loss, http status codes, 503 vs 409, known-positive control, regression test, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic users. The two "tabs" are Node client objects, not real browsers, and this is not a finding about any real product. Fixture, 16 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Tab A saved a new title and got 200 OK. Tab B saved a body edit and got 200 OK. The old title came back.

Episode 23 of Web Reality Checks. The bug is an UPDATE that only asks whether the ID matches. B's local copy still held the old title, saving sent the whole document, and last writer wins.

The repair: send expectedVersion and run one statement, UPDATE ... WHERE id = ? AND version = ?, with version = version + 1. Then let changes() decide. No SELECT first. A read followed by a write reopens the race.

What the 16 tests cover:
- A known-positive control showing the flawed endpoint loses A's title.
- A 409 for the stale save, with the current version in the body.
- A six-thread, six-connection barrier test: exactly one same-version update accepted.
- A locked database returns 503, not 409. Only a version mismatch is a conflict.

On 409 the client keeps the unsaved text, shows both versions, and never retries by overwriting.

Scope: one integer version per whole document, SQLite rollback-journal mode only, Node clients standing in for browsers. It detects conflicts. It is not a CRDT.

Synthetic fixture, not a finding about any product. Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#Concurrency #Databases #SoftwareEngineering

### Post 2: non-technical leaders

Your team's app said "saved." The customer's change still vanished. Nothing in the logs shows why.

Episode 23 of Web Reality Checks. Two people open the same document. One changes the title and saves. The other changes only the body, but their screen still holds the old title, so saving sends the old title back. The server said OK both times, and the first person's work was gone. No error, no alert.

A shared planning binder: two people photocopy page 1, both edit, both file. If the clerk only checks the page number, the last filing wins. The fix is a revision stamp the clerk checks while replacing the page, in one motion. In the fixture, the stale save was refused with a 409 and the person kept their unsaved text.

Five questions for your team or vendor:
1. When two people save the same record, what happens?
2. Does every save say which version it started from?
3. Is the check and the write one step, or two?
4. What does the user see on a conflict?
5. Is a busy database ever reported as a conflict?

"Last one wins" is the answer to be worried about.

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SoftwareQuality #Leadership

## X/Twitter thread

1/ Tab A saved a new title: 200 OK. Tab B saved a body edit: 200 OK. The old title came back. No error, no log line, nothing wrong on screen. Episode 23 of Web Reality Checks. Thread.

2/ Both clients loaded the document at version 1. B only edited the body, but its local copy still held the old title, and saving sends the whole document. The flawed endpoint asked one question: does the ID match? Last writer wins.

3/ The repair is one added condition. Send expectedVersion with the edit and run UPDATE ... WHERE id = ? AND version = ?, with version = version + 1. Then look at how many rows changed. 1 means saved. 0 means someone got there first.

4/ Why one statement? A SELECT followed by an UPDATE leaves a gap where two requests can both read version 1 and both write. In one statement the database does the check and the write together, so two same-version saves cannot both match.

5/ Retest on the synthetic fixture: A saves against version 1, 200, now version 2. B also sends version 1, matches no row, gets 409 with currentVersion 2. B's unsaved text is kept, both versions shown, a person resolves it. No overwrite retry.

6/ Only a version mismatch is a 409. With a second connection holding BEGIN IMMEDIATE, the server returned 503 database_busy, retryable, and stayed at version 1. A lock is not a conflict, and a client that treats it as one misleads the user.

7/ 16 tests, 16 pass. That includes a known-positive control that proves the flawed endpoint loses an update, and a six-thread barrier test where exactly one same-version update is accepted. Limits: Node clients, not browsers. Not a CRDT, not real-time collaboration.

8/ Before saving, check what you are replacing. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A minimal Node and SQLite fixture showing a lost update, fixed with expectedVersion, a single conditional UPDATE and a 409

**First comment:** This is a deliberately constructed local fixture with synthetic users, and the two "tabs" are independent Node client objects, not real browsers, so it is not a finding about any real product. The repair puts the version check and the write in one `UPDATE ... WHERE id = ? AND version = ?` statement and lets `changes()` decide, returning 409 only for a version mismatch and 503 for a locked database. The suite is 16 tests including a known-positive control and a six-thread barrier test, and the limits (one integer version per document, SQLite rollback-journal mode only, no CRDT or real-time merge) are in the README.

## Short-form hook lines (≤ 12 words)

1. Both saves returned 200 OK. One edit still vanished.
2. Tab B saved. The old title came back.
3. Last writer wins, and nothing logs an error.
4. One extra condition turns silent data loss into a 409.
5. Before saving, check what you are replacing.

## Alt text

**hero.png:** Two independent clients load a document titled "Launch plan" at version 1; client A saves a new title and receives 200 OK, then client B saves a body edit from its stale copy and also receives 200 OK, and the original title returns.

**thumbnail.png:** Episode thumbnail for "Two Tabs. One Document. Where Did My Changes Go?" showing two browser-tab shapes pointing at one document, a new title crossed out and replaced by the old one, with a 200 OK badge on both saves.
