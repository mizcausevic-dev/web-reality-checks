# EP03 distribution kit: Watch What Happens When You Click 'Sign In'

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep03-sign-in-session/` (evidence.json, test.mjs, README.md). The HTTPS leg was not executed in that environment; it is a labeled conceptual illustration in the video.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Watch What Happens When You Click 'Sign In'` (43) : the series title; names the everyday action and promises to show the hidden part.
2. `Your Password Never Becomes the Cookie. Here's Why.` (51) : states the central mechanic in one line; strong for engineers and curious general viewers.
3. `Sign In, Traced: Hash, Fresh Session, Opaque Cookie` (51) : names the three steps for search intent around session cookie authentication.
4. `The Cookie Identifies a Session. It Carries No Permission` (57) : the closing thesis; good for shares and for the authorization audience.
5. `One Login, Twelve Tests, One Known-Positive Control` (50) : the evidence angle; appeals to viewers who want proof rather than explanation.
6. `What a Website Does With Your Password After You Click` (54) : for general viewers; the question most people have never asked.

### Description

Wrong password: 401. Right password: 200 and one cookie. Everything that matters about sign-in happens behind those two numbers.

In this episode we build one implementation of sign-in on a laptop: email and password, a salted argon2id hash in the user database, a server-side session identified by an opaque cookie, and CSRF tokens on login and logout. Two synthetic users, alice (member) and carol (admin). Then we record what every step returns.

The password is never stored; the database holds a 97-character argon2id hash, and two hashes of the same password differ while both verify. On success the session is regenerated: the pre-login identifier is destroyed and replaying it returns 401. The cookie is HttpOnly, Secure, SameSite=Lax, Path=/, with no Domain attribute, and the value contains no credential or identity. A later request with the cookie returns 200 for alice. The admin route returns 401 with no cookie, 403 for alice as a member, 200 for carol as admin. GET /logout is 405. POST /logout without a CSRF token is 403. With the token: 200, cookie expired, and replaying the old cookie is 401. Twelve tests, twelve pass, including a known-positive control that shows the session id survives login when regenerate() is removed.

What was not executed: the HTTPS leg. There is no trusted local certificate authority in the environment, so the fixture ran over plain HTTP on loopback with a forwarded-proto header that makes the library issue the Secure cookie. That scene is a labeled conceptual illustration. HttpOnly and SameSite are browser-enforced; the attributes were verified on the header, no browser was run. MemoryStore is for the fixture only, not production. This is one implementation, not every sign-in system.

Chapters
00:00 You click Sign In: 401, then 200 and one cookie
00:12 Five lanes, three objects
00:21 The HTTPS leg (conceptual illustration, not executed)
00:33 Verify: a salted argon2id hash, not the password
00:45 Fresh session id on success
00:57 The cookie: HttpOnly, Secure, SameSite=Lax, no Domain
01:11 A later request carries the cookie
01:22 Two checks: valid session, then permission
01:33 Sign out: POST with CSRF token, record destroyed
01:49 The cookie identifies a session. The server enforces access.

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep03/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

web security, authentication, session cookie, session fixation, argon2id, password hashing, httponly cookie, samesite cookie, secure cookie, csrf protection, express-session, node.js, login security, session management, authorization, regression test, known-positive control, web development, how login works, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with two synthetic users. One implementation, not all sign-ins. The HTTPS leg was illustrated, not executed (no trusted local CA). Not a finding about any real product. Fixture, 12 tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Wrong password: 401. Right password: 200 and one cookie. Episode 3 of Web Reality Checks is everything behind those two numbers.

One implementation on a local fixture, maintained libraries only: argon2id, express-session, csrf-csrf. Two synthetic users.

Recorded:

Stored hash: 97 chars of argon2id. Two hashes of one password differ; both verify.

Session regenerated on login. Replay the pre-auth id: 401. A known-positive control removes regenerate() and asserts the id survives, so the fix test can see the difference.

Cookie: HttpOnly; Secure; SameSite=Lax; Path=/; no Domain. Value carries no email, id or password.

Protected route: 401 no cookie, 403 member, 200 admin. Two middlewares, two questions.

GET /logout 405. POST /logout without token 403. With token: 200, Expires=1970, replay 401.

12 tests, 12 pass.

Not executed: TLS. No trusted local CA, so plain HTTP on loopback with X-Forwarded-Proto and trust proxy. HttpOnly and SameSite verified on the header, not in a browser. MemoryStore is fixture-only.

Not every sign-in works this way. Synthetic fixture, not a finding about any product.

github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #Authentication #SoftwareEngineering

### Post 2: non-technical leaders

Your login page works. Do you know what it did with the password?

Episode 3 of Web Reality Checks follows one sign-in from click to dashboard on a practice system with two made-up users. The visible result: wrong password, 401; right password, 200 and one cookie. Everything that protects your customers happens where the demo cannot show it.

The practice system never stores the password; it keeps a one-way hash that cannot be turned back. On success it discards the pre-login session and issues a fresh one, so a planted identifier is worthless. The cookie is a random number with no name or password in it. Every protected page asks two questions: valid session, and allowed? Sign-out destroys the session on the server.

Five questions for your team or vendor:
1. How are passwords stored? "Encrypted" is the wrong answer; hashed is right.
2. Does the session identifier change on login? Ask for the test.
3. What is in the session cookie, and which attributes does it carry?
4. Is "allowed" checked separately from "signed in"?
5. Does the old session work after sign-out?

One limit: the encrypted connection was illustrated, not executed, in this fixture.

Synthetic fixture, no real product. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Cybersecurity #Leadership

## X/Twitter thread

1/ You click Sign In. Wrong password: 401. Right password: 200 and one cookie. Episode 3 of Web Reality Checks traces one sign-in implementation through everything behind those two numbers, on a local fixture with two synthetic users. Thread.

2/ Five lanes: browser, HTTPS, server, user database, session store. Three objects: password, session id, authorization decision. The whole design is keeping those three apart. The password never becomes the cookie. The cookie never carries a permission.

3/ The database never holds the password. It holds a salted argon2id hash, 97 chars. Hashing is one-way: no key turns it back. The server recomputes and compares. Two hashes of the same password differ; both verify (local synthetic fixture).

4/ On success: regenerate the session. The pre-login id is destroyed, a fresh one issued. Replay the old id after login: 401. A known-positive control removes regenerate() and asserts the id survives, so the fix test can actually see fixation.

5/ The cookie: sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/; no Domain. HttpOnly limits ordinary JS access, not every attack. SameSite=Lax is defense in depth, not full CSRF protection, so login and logout also need a CSRF token.

6/ A protected route asks two questions in order. Valid session? No cookie: 401. Permitted? Member on the admin route: 403. Admin: 200. Two middlewares, two status codes, because they are two different facts.

7/ Sign-out is a POST with a token. GET /logout: 405. No token: 403. With token: 200, server record destroyed, cookie Expires=1970. Replay the old cookie: 401. 12 tests, 12 pass. TLS was not executed here (no trusted local CA); that leg is illustrated and labeled.

8/ One implementation, not every sign-in. MemoryStore is fixture-only. The cookie identifies a session; the server enforces access. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A small Node fixture tracing email/password sign-in: argon2id hash, session regenerated on login, host-only opaque cookie, CSRF on login and logout, with a known-positive control for session fixation

**First comment:** This is a deliberately constructed local fixture with two synthetic users, built from maintained libraries (argon2, express-session, csrf-csrf) rather than hand-rolled crypto, and it is one implementation rather than a description of every sign-in system. The TLS leg was not executed because the environment has no trusted local CA; the server ran plain HTTP on loopback with X-Forwarded-Proto and trust proxy so express-session would issue the Secure cookie, and the video labels that scene as a conceptual illustration. The suite is 12 tests including a control that shows the pre-auth session id surviving login when regenerate() is removed, and the limits (MemoryStore, no browser run, no rate limiting or MFA) are in the README.

## Short-form hook lines (≤ 12 words)

1. Wrong password: 401. Right password: 200 and one cookie.
2. Your password never becomes the cookie.
3. The server stores a smudge, not your password.
4. Log in, get a fresh session. The old one dies.
5. The cookie identifies a session. The server enforces access.

## Alt text

**hero.png:** The Set-Cookie header from the fixture's login response, reading sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/ with no Domain attribute, each attribute labeled with what it does and does not protect, and the caption "The cookie identifies a session. It carries no permission."

**thumbnail.png:** Episode thumbnail for "Watch What Happens When You Click 'Sign In'" showing a Sign In button beside three distinct objects, a password, a session identifier and an authorization decision, kept in separate lanes with the tag "Local fixture · TLS leg conceptual."
