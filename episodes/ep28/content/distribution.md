# EP28 distribution kit: I Hid the Admin Button. The Admin Action Still Worked.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep28-hidden-admin-button/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `I Hid the Admin Button. The Admin Action Still Worked.` (54) : the series title; a concrete reversal that names the surprise and the audience's assumption.
2. `Hidden Is Not Denied: The Admin Action Still Ran` (48) : states the thesis, and "denied" lands search intent around access control.
3. `A Member With No Button Still Published. Here's Why.` (51) : a concrete scene from the fixture, with the curiosity gap of "why."
4. `Hiding a Button Is Not a Permission Check` (41) : the mechanism as a plain statement; good for shares among engineers.
5. `The Missing Button That Never Blocked Anything` (46) : short and visual, aimed at general viewers.
6. `201 Created: The Member Was Never Supposed to Publish` (52) : the status code as the hook for engineers.

### Description

The member's page has no publish button. A member's request published an announcement anyway. Hidden is not denied.

In this episode we build a small announcements app on a laptop with two synthetic users, an administrator and a member. The interface hides the publish button from the member. Then, with a valid member session and a valid CSRF token, we send the exact request the hidden button would have sent. The flawed endpoint answers 201 Created and the announcement count goes from 1 to 2. It checked the session and the token. It never asked whether this user may publish.

We separate three questions: authentication (no session is a 401), CSRF (a bad token is a 403 with the code EBADCSRFTOKEN) and authorization (may this user publish?). Only the third stops the member. The repair resolves the user from the session, looks up current permission in the server's own store and checks it before anything is written. Retest: the same member request gets 403 PERMISSION_DENIED and the count stays at 2. The administrator gets 201 and the count becomes 3. The suite runs 12 tests, 12 pass, including a known-positive control that proves the flawed endpoint really does let the member publish.

What this does not fix: this is a function-level check, not an object-ownership check, and it covers one route.

Chapters
00:00 Hidden button, working request
00:09 Controlled test: valid session, valid token
00:17 The leak: 201 Created, count 1 to 2
00:27 Three questions: who, from where, may they
00:42 The repair: server-side permission gate
00:56 Retest: 403 PERMISSION_DENIED, count stays 2
01:08 Administrator: 201, count becomes 3
01:15 What this does not fix

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep28/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

web security, authorization, access control, hidden button security, broken function level authorization, server-side permission check, role-based access control, rbac, csrf, csrf vs authorization, express, node.js, api security, 403 forbidden, 401 unauthorized, known-positive control, regression test, launch checklist, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic users. The flawed endpoint was written by hand to show the mechanism; it is not a finding about any real product. Fixture, 12 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The member's page had no publish button. The member's request published an announcement anyway.

Episode 28 of Web Reality Checks. A valid session and a valid CSRF token, sent to a route that never asked "may this user do this?"

Three different questions, three different answers:
- No session: 401
- Bad CSRF token: 403 EBADCSRFTOKEN
- Member without the permission: 403 PERMISSION_DENIED

The flawed route ran the first two and then inserted: 201, count 1 to 2. The repair adds one middleware between CSRF and the write. It reads the user from the session and the permission from the server's own store at request time. A role field sent by the browser is never read.

What I would push on any team:

1. Keep a known-positive control. One of the 12 tests has the member publish through the flawed route. If the test cannot see the flaw, a 403 on the fixed route proves nothing.
2. Test with a valid token, so CSRF cannot masquerade as authorization.
3. Assert the row count after the denied request, not only the status.

Scope: a function-level check on one route. Object ownership is a separate check (episode 1). Synthetic fixture, loopback only, flaw written by hand.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #Authorization #NodeJS

### Post 2: non-technical leaders

Your team hid the admin button from regular users. Did anyone block the action?

A demo cannot tell you. It follows the buttons on screen, and the regular user has no admin button to press.

Episode 28 of Web Reality Checks, on a small app with made-up users. The member's screen showed no publish button. A request from that member, signed in and carrying a valid security token, published an announcement anyway: the count went from 1 to 2. The app checked who the person was and that the request came from its own page. It never checked whether they could publish.

Think of a cashier's screen with the Refund button removed, on a register that still accepts the refund command.

Five questions for your team or vendor:
1. Where is the permission checked: the screen, or the server before anything is written?
2. Is there a test where a non-admin sends the admin request directly and is refused?
3. Does that test confirm the database did not change?
4. Is there a deliberately broken version the test catches?
5. If we remove someone's permission, does it apply to their current session?

"The button is hidden" is not an answer.

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #StartupSecurity #Leadership

## X/Twitter thread

1/ The member's page has no publish button. A request from that member just published an announcement anyway. Valid session, valid CSRF token, 201 Created, count 1 to 2. Episode 28 of Web Reality Checks: hidden is not denied. Thread.

2/ A privileged route answers three separate questions. Authentication: who is this? No session is a 401. CSRF: did this come from our page? Bad token is a 403 EBADCSRFTOKEN. Authorization: may this user do this? The flawed route never asked.

3/ The whole diff is one middleware: app.post('/vuln/announcements', authenticate, csrf, insert) versus app.post('/announcements', authenticate, csrf, requirePermission(PUBLISH), insert). The gate runs before the write.

4/ The permission comes from the server's own store, looked up at request time. Not from the session copy, and never from a role field in the body, query string or headers. Revoke it in the store and the live session loses it.

5/ Retest, same member, same session, same valid token: 403 PERMISSION_DENIED, count stays at 2. Administrator: 201, count becomes 3. The gate has to stop the member and still allow the admin, so the test checks both.

6/ 12 tests, 12 pass (local synthetic fixture). The one to copy is the KNOWN-POSITIVE CONTROL: the member publishes through the flawed route. If the test cannot see the flaw, a 403 on the fixed route proves nothing.

7/ Scope: a function-level check on one route, not object ownership. Test client, not a real browser. Flawed endpoint written by hand, synthetic data, not a finding about any real product.

8/ The browser can hide the action. Only the server can deny it. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Express fixture showing a hidden admin button with no server-side permission check, the permission-gate fix, and a known-positive control

**First comment:** This is a deliberately constructed local fixture with two synthetic users; the flawed route was written by hand to show that a valid session plus a valid CSRF token is not a permission check, so it is not a finding about any real product. The repair adds one middleware that reads the permission from a server-side store at request time, and the 12 tests include a control that asserts the member can publish through the flawed route. The limits (function-level only, one route, cookie-jar test client instead of a real browser, no HTTPS) are listed in the README.

## Short-form hook lines (≤ 12 words)

1. The button was hidden. The request still published.
2. Hidden is not denied.
3. The server checked the session and the token, never the permission.
4. A member with no button created an announcement anyway.
5. The browser can hide the action. Only the server can deny it.

## Alt text

**hero.png:** A member's read-only announcements page with no publish button, beside a 201 Created response showing the member's request published an announcement and the count went from 1 to 2.

**thumbnail.png:** Episode thumbnail for "I Hid the Admin Button. The Admin Action Still Worked." showing a page with the publish button removed and a 201 Created response arriving anyway.
