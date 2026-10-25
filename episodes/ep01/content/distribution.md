# EP01 distribution kit: Your AI-Built App Works. Is It Safe to Launch?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep01-authz/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your AI-Built App Works. Is It Safe to Launch?` (46) : the series title; names the audience's fear and the question the episode answers.
2. `Signed In Is Not Authorized: One Missing Check` (46) : states the mechanism in the title, so search intent around authentication vs authorization lands here.
3. `Alice Read Bob's Data. The Server Said 200 OK.` (46) : concrete scene from the fixture; the status code is the hook for engineers.
4. `A Working Interface Is Not an Authorization Test` (48) : the closing line of the episode as a thesis; good for shares.
5. `One Line Leaked Another User's Project` (38) : short, direct, centers the single missing condition.
6. `How an App Leaks Data Without Any Error` (39) : for general viewers; the absence of an error is the surprising part.

### Description

Your app passed the demo. Can it tell one user's data from another's? One missing check says no, and nothing on screen shows it.

In this episode we build a small project-management API on a laptop with two synthetic users, Alice and Bob, and one private project each. Alice signs in and reads her own project: 200 OK. Still signed in as Alice, we request Bob's project. The vulnerable endpoint returns it, 200 OK, Bob's private data in the body. The server checked that a user existed and never checked that this user owned this resource.

Then we repair it. The corrected endpoint resolves the user from the server-side session and looks the project up by ID and owner ID in one query. Retest: Alice's project 200, Bob's project 404. Sending a spoofed user ID and an "admin" role from the client changes nothing, because the server never reads them. The regression suite runs 7 tests, 7 pass, including a known-positive control that proves the vulnerable endpoint really does leak.

What this does not fix: the repair covers one read path. Lists, writes, exports and admin paths each need the same test.

Chapters
00:00 Demo complete
00:09 Four layers: browser, session, API, database
00:22 Alice reads her own project: 200
00:31 Controlled test: Alice requests Bob's project
00:39 The leak: 200 OK with Bob's data
00:50 Freeze on the missing ownership condition
01:01 The repair: query by ID and owner
01:14 Retest: 200 and 404
01:27 What this does not fix

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep01/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

web security, authorization, authentication vs authorization, broken object level authorization, IDOR, access control, node.js, api security, server-side session, ownership check, launch checklist, ai coding, ai-built app, vibe coding security, regression test, known-positive control, 404 vs 403, data leak, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything in this episode runs on a deliberately built local fixture with two synthetic users. The vulnerability was written by hand to show the mechanism; it is not a finding about any real product or AI tool. Fixture, 7 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Alice was signed in. She asked for project 2002. It belonged to Bob. The server said 200 OK.

Episode 1 of Web Reality Checks. The entire bug is one missing condition in one lookup.

Vulnerable endpoint: confirm a session exists, fetch the project by ID, return it. Authenticated, therefore authorized. The repair: resolve the user from the server-side session, then query by project ID AND owner ID together. No match, 404, whether the project is absent or simply not hers.

Two things I would push on any team:

1. Put the ownership condition in the query, not in a check after the fetch. "Fetch then filter" survives until the one handler someone forgets.

2. Keep a known-positive control. One of the 7 tests asserts the vulnerable endpoint returns Bob's data to Alice. If that test cannot see the leak, a pass on the fixed code proves nothing.

Also tested: spoofed ?user=u_bob, X-User-Id and an "admin" role header from the client. 404. The server never read them.

Scope: one read path. Lists, writes, exports and admin paths each need the same test. Synthetic fixture, loopback only, flaw written by hand; not a finding about any tool or product.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #Authorization #SoftwareEngineering

### Post 2: non-technical leaders

Your app passed the demo. Can it keep one customer's data away from another? The demo cannot tell you.

A demo shows a user looking at her own data. The failure in episode 1 of Web Reality Checks only appears when a signed-in user asks for someone else's record, and no screen has a button for that.

Two made-up users on a local app. Alice, signed in as herself, asked for Bob's project. The flawed version handed it over, 200 OK, no error anywhere. The fixed version said 404. The server had confirmed a user was signed in and never confirmed she owned what she asked for.

A hotel checks your ID, then hands you a key card that opens every room. Identity verified. Access never was.

Five questions before launch:
1. For every kind of record, is there a test where user A requests user B's record and is refused?
2. Does the server decide who the user is, or trust what the browser sends?
3. Is the owner check inside the lookup, or applied afterward?
4. Is there a deliberately broken version the tests catch?
5. What does the server return for a record you may not see, and is it written down?

Vague answers mean "unknown," not "secure."

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #StartupSecurity #Leadership

## X/Twitter thread

1/ Alice signed in. She asked the API for project 2002. It was Bob's. The server said 200 OK and sent Bob's private notes. No error, no log line, nothing wrong on screen. Episode 1 of Web Reality Checks is one missing condition in one query. Thread.

2/ Four layers: browser, server-side session, API, database. Authentication lives in the session. Authorization has to live in the query that touches the database. A gate that only asks "does a user exist?" passes the second question by default.

3/ The vulnerable handler: is there a session? yes. Fetch project by ID. Return it. The corrected handler: is there a session? yes. Fetch project by ID AND owner ID from the session. No match? 404. That is the whole diff.

4/ Why 404 and not 403 for Bob's project? A 403 confirms the object exists and belongs to someone. 404 for both absent and inaccessible means nobody can map real IDs by guessing. Deliberate policy, documented in the README, locked by a test.

5/ We also sent ?user=u_bob, X-User-Id: u_bob and x-ui-role: admin from the client, signed in as Alice. 404. The server never reads client identity claims. Hidden buttons and URL IDs are untrusted input.

6/ 7 tests, 7 pass (local synthetic fixture). The one that matters most: a KNOWN-POSITIVE CONTROL asserting the vulnerable endpoint returns Bob's project to Alice. If the test cannot see the leak, a pass on the fixed code proves nothing.

7/ Scope: this fixes one read path. Lists, writes, exports and admin paths each need the same test. The fixture is synthetic, loopback only, and the flaw was written by hand. Not a finding about any real product or AI tool.

8/ A working interface is not an authorization test. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture showing an authenticated-but-not-authorized project read, with the scoped-query fix and a known-positive control test

**First comment:** This is a deliberately constructed local fixture with two synthetic users; the vulnerable endpoint was written by hand to demonstrate the missing ownership condition, so it is not a finding about any real product or about any AI coding tool. The repair scopes the lookup by project ID and owner ID from the server-side session and returns 404 for both absent and inaccessible objects, which is a documented policy choice rather than a universal recommendation. The suite is 7 tests including a control that asserts the vulnerable endpoint leaks, and the limits (read path only, test-harness login, loopback only) are in the README.

## Short-form hook lines (≤ 12 words)

1. Alice asked for Bob's project. The server said 200 OK.
2. Signed in is not the same as allowed.
3. The gate asked "who are you?" and never asked "is this yours?"
4. One missing condition. Another user's private data. No error anywhere.
5. A working interface is not an authorization test.

## Alt text

**hero.png:** Diagram of a signed-in user, Alice, requesting project 2002 owned by Bob; the vulnerable endpoint responds 200 OK with Bob's private project data in the body, and the caption reads "Authenticated was mistaken for authorised."

**thumbnail.png:** Episode thumbnail for "Your AI-Built App Works. Is It Safe to Launch?" showing an authenticated-user badge passing through a gate while a resource-owner badge is never checked, with a 200 OK response on another user's data.
