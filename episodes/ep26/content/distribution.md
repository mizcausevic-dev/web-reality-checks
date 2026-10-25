# EP26 distribution kit: One Page. 101 Database Queries. Here's Why.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep26-n-plus-one/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `One Page. 101 Database Queries. Here's Why.` (43) : the brief's title; the number is the hook and "Here's Why" promises a mechanism.
2. `One HTTP Request. 101 SELECTs. Counted, Not Guessed.` (52) : speaks to engineers and states that the number comes from instrumentation.
3. `The N+1 Query Problem, Counted With a Real Counter` (50) : carries the search term "N+1 query problem" for viewers who already know the name.
4. `Your Page Looks Fine. The Database Ran 101 Queries.` (51) : the gap between a correct page and hidden work, aimed at product and business viewers.
5. `100 Articles, 12 Authors, 101 Queries` (37) : three concrete numbers from the fixture; short and curiosity-driven.
6. `Why One Request Became 101 Database Queries` (43) : plain and descriptive, close to how people search for the problem.

### Description

One page. One HTTP request. Behind it, the database ran 101 SELECTs, and the page looked fine. Here is the counter that proves it.

In this episode we build a small article directory on a laptop with 100 synthetic articles and 12 synthetic authors. The flawed endpoint runs one SELECT for the list, then one more SELECT per article to fetch its author: 1 + 100 = 101. The count comes from a query-counting wrapper scoped to the article-list operation, not from narration. Setup, sign-in and BEGIN/COMMIT are excluded and logged as excluded.

The 100 articles share only 12 authors, so the same author is fetched again and again. One author is looked up 14 times, and 88 lookups repeat an author already fetched.

The repair is one explicit JOIN with ORDER BY on the article ID. Same fields, same order, no loop. The two JSON responses are byte-for-byte equal (13,544 bytes). Retest: flawed 101 SELECTs, corrected 1. A known-positive control with one hidden extra query reports 102, so the counter can see a one-statement difference. The suite runs 15 tests, 15 pass.

What this does not show: we counted statements and measured no timing, so there is no speed claim. Fewer queries do not always mean a faster page. This is one N+1 pattern in in-memory SQLite with no ORM, not every form of it.

Chapters
00:00 One request, 101 SELECTs
00:13 One list query plus 100 lookups
00:26 12 authors, 88 repeated lookups
00:39 The fix: one explicit JOIN
00:49 Same 100 articles, byte-equal JSON
01:00 Retest: 101 vs 1, control at 102
01:15 What we counted and what we did not

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep26/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

n+1 query problem, n+1 queries, database queries, sql join, sql performance, query counter, backend development, node.js, sqlite, orm n+1, database optimization, api performance, backend engineering, software testing, known-positive control, count sql queries, hidden backend work, web development, software engineering, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture: synthetic articles and authors, in-memory SQLite, no ORM. The 101 comes from a counter, not a guess. No timing was measured, so there is no speed claim. Fixture, 15 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

One HTTP request. 101 SELECTs. The JSON was correct.

Episode 26 of Web Reality Checks is a plain N+1: one SELECT for 100 articles, then one author SELECT per article inside the loop.

What I wanted was a number I could defend, so the fixture wraps the connection in a counter scoped to the article-list operation. It counts SELECTs executed in scope. Setup, the session lookup and BEGIN/COMMIT are logged and excluded, and any non-SELECT in scope is reported separately. Flawed: 101. Corrected: 1.

Three details worth stealing:

1. The 100 articles share 12 authors. One author was fetched 14 times; 88 lookups repeated an earlier author.
2. The fix is one JOIN with ORDER BY a.id. The bodies are byte-equal (13,544 bytes), and a test asserts it. The JOIN matches the loop only because author_id is NOT NULL with foreign keys enforced.
3. A known-positive control: one hidden extra query makes the counter report 102, and the 101 assertion fails on it.

Not claimed: any speed-up. I counted statements and timed nothing, on in-memory SQLite with no ORM.

Video, fixture, 15 tests: github.com/mizcausevic-dev/web-reality-checks

#Databases #BackendEngineering #SQL

### Post 2: non-technical leaders

A page can look perfect and still ask its database 101 questions to build one list.

Episode 26 of Web Reality Checks shows it on a made-up article directory. One visit is one request. Behind it, the flawed version asks one question for the list of 100 articles, then one more question for every article to find its author. 1 + 100 = 101. The fixed version asks once. Both produce exactly the same page, byte for byte.

That is why a demo cannot catch it. The screen is identical. The extra work sits between the application and the database, and it grows as the list grows.

Think of a clerk sent to the records room once per line on your list, instead of once with the whole list. Same answer on your desk. A different number of trips.

Five things to ask your team:
1. How many database statements does our busiest page run per visit?
2. Is that measured by a counter, or guessed from the code?
3. Would a test fail if someone added a query per row?
4. After a fix, does the page return the same items in the same order?
5. Was the speed measured in production conditions?

We counted queries, not seconds, so no speed claim is made. Synthetic fixture, no real product.

github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Engineering #SoftwareDevelopment

## X/Twitter thread

1/ One HTTP request. The database ran 101 SELECTs. The page looked fine and the JSON was correct. Episode 26 of Web Reality Checks: the N+1 pattern, counted by instrumentation instead of guessed. Thread.

2/ The flawed endpoint: one SELECT for all 100 articles, then inside the loop, one SELECT per article to fetch its author. 1 + 100 = 101. No ORM, no cache, no batching. Plain SQL in a loop.

3/ The 100 articles share only 12 authors. So the same author gets fetched again and again. One author: 14 lookups. In total, 88 of the 100 lookups repeated an author already fetched. (Local synthetic fixture.)

4/ The fix is one explicit JOIN with ORDER BY on the article ID. Same fields, no loop. Both endpoints return the same 100 articles in the same order. The two JSON bodies are byte-equal, 13,544 bytes.

5/ The 101 is not a constant. A counter wraps the connection and tallies SELECTs inside the article-list scope. Setup, the session lookup and BEGIN/COMMIT are excluded and logged as excluded. Retest: flawed 101, corrected 1.

6/ Does the counter notice a mistake? We planted one hidden extra query. It reported 102, and the "101" assertion failed on it. That known-positive control is why the passing run means something. 15 tests, 15 pass.

7/ What this does not show: we counted statements and timed nothing, so there is no speed claim. Fewer queries do not always mean a faster page. In-memory SQLite, no ORM, one N+1 shape, synthetic data.

8/ The interface made one request. The backend multiplied the work. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A small Node/SQLite fixture that counts SELECTs per request: N+1 (101 queries) versus one JOIN, with byte-equal output and a known-positive control

**First comment:** This is a deliberately constructed local fixture with synthetic articles and authors in in-memory SQLite and no ORM, so it is not a finding about any real product or framework. The counter wraps the connection and counts SELECTs inside one operation scope (101 flawed, 1 corrected, with setup, the session lookup and BEGIN/COMMIT excluded and logged), and a control with one hidden extra query reports 102. It counts statements only and measures no latency, so it makes no speed claim; the INNER JOIN matches the loop only because author_id is NOT NULL with foreign keys enforced.

## Short-form hook lines (≤ 12 words)

1. One page request. One hundred and one database queries.
2. The page looked fine. The database did 101 lookups.
3. 100 articles, 12 authors, and 88 repeated lookups.
4. Same page, byte for byte. One query instead of 101.
5. The interface made one request. The backend multiplied the work.

## Alt text

**hero.png:** Diagram of one HTTP request fanning out into a tree of database statements: one list SELECT for 100 articles and 100 author SELECTs, 101 in total, with the label "counted by instrumentation."

**thumbnail.png:** Episode thumbnail for "One Page. 101 Database Queries. Here's Why." showing a single browser request on the left expanding into a large branching tree of SELECT squares, with the number 101 prominent.
