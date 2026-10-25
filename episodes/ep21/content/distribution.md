# EP21 distribution kit: I Deleted the Record. Why Is It Still Showing Up?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep21-deletion-copies/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `I Deleted the Record. Why Is It Still Showing Up?` (49) : the series title; it states the exact confusion viewers search for.
2. `Deleted, But Search Still Returns It. Here's Why.` (49) : names the symptom and promises the cause; strong for search intent.
3. `Why Deleting a Record Doesn't Delete Its Copies` (47) : states the mechanism as a thesis; good for engineers and shares.
4. `The Record Is Gone. The Search Result Isn't.` (44) : a short, concrete contrast that fits the opening scene.
5. `Delete Is a Workflow When Data Has Four Homes` (45) : the closing line of the episode; suits the architecture crowd.
6. `Your Delete Worked. Your Cache Didn't Get the Memo.` (51) : playful and specific; for viewers who already know what a cache is.

### Description

You deleted the record and the lookup says 404. So why does search still return it? Because deleting one row does not delete its copies.

In this episode we follow one fictional contact, c_1003, through four homes: the primary table, a search index with a denormalized copy, an application response cache, and an already-open browser page (a simulated client state, not a real browser). The flawed delete removes only the primary row, records no cleanup intent, and search still returns her.

The repair deletes the row and inserts an outbox event in one transaction. A worker removes the index entry and clears the cache. We then break it on purpose: the index entry goes, cache invalidation fails once, the event stays pending, and the cache keeps serving the old answer. Attempt 2 succeeds and the event is processed only after both steps. Replaying it changes nothing and the next new contact gets c_1006, not a reused ID. With retries exhausted after 3 attempts, the event becomes failed and raises 1 alert. The suite runs 20 tests, 20 pass, including known-positive controls.

What this does not cover: the outbox records intent, it does not make every destination update atomically. This is not a privacy-erasure system. Backups, logs, exports and third-party copies are out of scope, and a server cannot recall data a page already downloaded.

Chapters
00:00 Record gone, search still returns it
00:11 One contact, four homes
00:20 Flawed delete: primary row only
00:29 The fix: delete plus outbox event
00:46 Partial failure: cache invalidation fails
00:56 Retry, replay and exhausted retries
01:11 Verify the backend copies
01:17 The open page until refresh
01:27 What this does not cover

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep21/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

delete record, deleted but still showing, stale search results, cache invalidation, search index, transactional outbox, outbox pattern, idempotent worker, retry and replay, data deletion, derived data, stale cache, backend engineering, node.js, sqlite, distributed systems basics, software engineering, data consistency, soft vs hard delete, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with fictional contacts. The browser is a simulated client state, not a real browser, and this is not a privacy-erasure system. Fixture, 20 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The record lookup returned 404. Search still returned the contact. Nothing was broken.

Episode 21 of Web Reality Checks. One contact, c_1003, lives in four places: the primary table, a denormalized search index, a response cache, and a page already open in a browser. The flawed delete removes the first and records no cleanup intent at all.

The repair: delete the row and insert an outbox event in one transaction, then let a worker remove the index entry and clear the cache. Each step is idempotent, and the event is marked processed only after both succeed.

Then the part worth testing. Cache invalidation failed once: the event stayed pending and the cache kept serving the deleted contact. Attempt 2 cleared it. After 3 failed attempts the event becomes failed and raises an alert, never silently closed.

Limits up front: the outbox records intent, it does not make the table, index and cache update atomically. Deleted IDs are never reused, so replays cannot hit a newer record.

20 tests, 20 pass (local synthetic fixture), including a known-positive control for the flawed delete. The browser is simulated client state. Not a privacy-erasure system.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#SoftwareEngineering #Backend #Caching

### Post 2: non-technical leaders

A customer asks you to remove a contact. Your team deletes it. The record page says "not found." Then someone searches and the contact is still there.

Nothing crashed. The delete worked on the one copy it knew about.

Episode 21 of Web Reality Checks shows it on a fictional contact directory. The data lives in four places: the main table, a search index, a stored copy of recent answers, and the screen someone already has open. The flawed delete reached only the first. The fixed version records "cleanup owed" in the same step as the delete, and a background worker finishes the rest, retrying if a step fails and raising an alert if it keeps failing.

Think of a phone directory: crossing a name off the master list leaves the reception binder, the laminated sheet and the page on someone's desk unchanged.

Five questions to ask your team or vendor:
1. Where else does a deleted record live?
2. Is cleanup recorded in the same step as the delete?
3. What happens when one cleanup step fails?
4. How long can deleted data still appear in search or open screens?
5. Which copies does the process never reach: backups, logs, exports, third parties?

Fictional data. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #DataPrivacy #Leadership

## X/Twitter thread

1/ We deleted contact c_1003. The record lookup says 404. Search still returns her, and so does the page already open. Nothing is broken. Episode 21 of Web Reality Checks: deleting a record does not delete its copies. Thread.

2/ One ID, four homes: the primary table, a search index with a denormalized copy, an application response cache, and the browser's already-fetched results. A database cascade only reaches what the database owns.

3/ The flawed delete removes the primary row only. Outbox events: 0. Nothing in the system records that other copies need cleaning, so the index and the cached response keep returning c_1003.

4/ The fix: one transaction deletes the row and inserts an outbox event. A worker removes the index entry and clears the cache. The outbox records cleanup intent. It does not make every destination update atomically.

5/ We broke it on purpose. The index entry was removed, cache invalidation failed once, the event stayed pending, and the cache kept serving c_1003. Attempt 2 cleared the cache and only then was the event processed. Replay changes nothing.

6/ If retries run out (3 attempts in the fixture), the event becomes failed and 1 alert is raised. It is never silently marked processed. Deleted IDs are never reused: the next new contact is c_1006, not c_1003.

7/ The open page is a simulated client state, not a real browser. A server cannot recall data a client already holds. After a refresh, only c_1004 remains. This is not a privacy-erasure system: backups, logs, exports and third parties are out of scope.

8/ Deletion is a workflow when data has more than one home. 20 tests, 20 pass (local synthetic fixture). Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A Node fixture showing why deleting a primary record leaves stale copies in a search index and cache, with an outbox-based cleanup and its failure cases

**First comment:** This is a deliberately constructed local fixture with fictional contacts and synthetic data, so it is not a finding about any real product. The repair writes a cleanup event in the same transaction as the primary delete and runs idempotent steps (index entry, then a whole-cache clear) with retries, a failed state and an alert; the outbox records intent and does not make the destinations update atomically. The "open browser" is a simulated client-state object rather than a real browser, the index and cache are in-process stand-ins, and it is not a privacy-erasure design: backups, logs, exports and third-party copies are out of scope.

## Short-form hook lines (≤ 12 words)

1. I deleted the record. Search still returned it.
2. Deleting a row does not delete its copies.
3. The lookup said 404. Search said she was still here.
4. One contact. Four homes. One delete.
5. Deletion is a workflow, not a single statement.

## Alt text

**hero.png:** Diagram of contact c_1003 after a flawed delete: the record lookup returns 404, while the search index, the response cache and an open results page all still show Dana Whitlock, labeled as simulated client state.

**thumbnail.png:** Episode thumbnail for "I Deleted the Record. Why Is It Still Showing Up?" showing a 404 on the record lookup beside a search result that still lists the deleted contact, with four labeled homes for one ID.
