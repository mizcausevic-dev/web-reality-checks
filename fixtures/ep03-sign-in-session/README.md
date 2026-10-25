# EP03 fixture — "Watch What Happens When You Click 'Sign In'"

A small, runnable sign-in system: email/password, `argon2id` password hashes, an `express-session`
server-side session identified by an opaque cookie, `csrf-csrf` double-submit tokens on login and
logout, and a protected route that checks the session and then separately checks a permission.

**This is one implementation, not the architecture of every sign-in system.** Token-based APIs,
OAuth/OIDC, passkeys and SSO work differently.

Loopback only (`127.0.0.1`, ephemeral port). Synthetic users only (`alice@example.test`, member;
`carol@example.test`, admin). Passwords are in `server.mjs` so the fixture can sign in; the hashes
are recomputed with a fresh random salt on every start.

## Run

```
cd fixtures/ep03-sign-in-session
npm install --no-audit --no-fund      # pinned: argon2 0.41.1, express 4.22.3, express-session 1.19.0, csrf-csrf 3.1.0, cookie-parser 1.4.7
node --test test.mjs
node demo.mjs                          # writes evidence.json
node server.mjs                        # optional: leaves a server running for manual curl
```

Manual curl must send `-H 'X-Forwarded-Proto: https'` or no session cookie is issued (see HTTPS below).

## Files

| File | Purpose |
| --- | --- |
| `server.mjs` | the application; `createApp({regenerateOnLogin})` so tests can build the flawed control variant |
| `client.mjs` | minimal cookie-jar fetch wrapper used by tests and demo (not a browser) |
| `test.mjs` | 12 regression tests, including one known-positive control |
| `demo.mjs` | the exact scenario the video shows; writes `evidence.json` |
| `evidence.json` | actual statuses, cookie attributes (values redacted as `<opaque id>`), hash prefixes |
| `sequence-diagram.md` | Mermaid sequence diagram of the exact flow and an object table |
| `framework-config.md` | every library option used and why |
| `test-notes.md` | what each test proves and what was not tested |

## Deliberate policies

- **Hashing, not encryption.** `argon2id` with a random per-hash salt. Two hashes of the same
  password differ; neither can be turned back into the password. The server can only recompute and
  compare.
- **Fresh session id after authentication.** `req.session.regenerate()` runs after `argon2.verify`
  succeeds and before `userId`/`role` are written. The pre-authentication id is destroyed and a
  replay of it returns 401.
- **Cookie scope set deliberately.** `sid` is `HttpOnly; Secure; SameSite=Lax; Path=/` and has
  **no `Domain` attribute**, so it is host-only: sent only to the exact host that set it, never to
  sibling subdomains. The value is a random id signed by `express-session`; it contains no
  credential, email or user id.
- **HttpOnly** keeps the cookie out of `document.cookie` for ordinary page scripts. It does **not**
  stop a script from making requests that the browser will attach the cookie to, nor does it help
  against a compromised browser, a stolen cookie, or a server-side bug.
- **SameSite=Lax is defence in depth**, not complete CSRF protection (same-site requests and
  top-level GET navigations are still allowed). Therefore login and logout are also protected by
  `csrf-csrf` double-submit tokens bound to the session id; a missing or foreign token is 403.
- **No GET for state changes.** `GET /logout` is 405 with `Allow: POST`.
- **Session validity and permission are two checks.** `/admin/audit` returns 401 with no valid
  session, 403 with a valid session lacking the `admin` role, 200 with both.
- **Sign-out** destroys the server-side record and sends `Expires=Thu, 01 Jan 1970` for the
  cookie. Replaying the old cookie value afterwards is 401.
- Unknown email and wrong password produce the same 401 body, and a dummy `argon2.verify` runs for
  unknown users so timings are similar (a mitigation, not a guarantee).

## HTTPS — what was and was not executed

This environment has **no trusted local certificate authority**, so the fixture does not run TLS.
Instead the server sets `app.set('trust proxy', 1)` and `cookie.secure = true`, and the test
client sends `X-Forwarded-Proto: https`. `express-session` therefore issues the `Secure` cookie,
and the tests verify the attribute on the wire. A request without that header gets **no** session
cookie (test 6; `evidence.json` → `sessionCookieIssued: false`).

**Not executed:** the TLS handshake, encrypted transport, certificate validation, and a browser's
decision to send a `Secure` cookie only over HTTPS. The video renders that leg as a labelled
conceptual illustration (sim tag `LOCAL FIXTURE · TLS LEG CONCEPTUAL`). HTTPS protects the data in
transit between an honest browser and an honest server; it does not protect against a compromised
browser, a compromised server, or malicious script already running in the page.

## Executed

```
$ node --test test.mjs
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

`node demo.mjs` → `evidence.json`: wrong password **401**; correct password **200** with
`Set-Cookie sid=<opaque id>; Path=/; Expires=…; HttpOnly; Secure; SameSite=Lax`, no `Domain`;
session id **changed** (`IXbv8tHA…` → a different id; values vary per run); replay of pre-auth id
**401**; `GET /me` with cookie **200** `u_alice`; `/admin/audit` anonymous **401**, as alice/member
**403**, as carol/admin **200**; `POST /login` without CSRF header **403**; `GET /logout` **405**;
`POST /logout` without CSRF header **403**; `POST /logout` with token **200** and
`Expires=Thu, 01 Jan 1970`; replay after logout **401**; plain-HTTP request → **no session cookie
issued**. Hash: `$argon2id$v=19$m=65536,t=3,p=4$…`, 97 chars, two hashes differ, neither contains
the password.

## Limitations / not tested

- `MemoryStore` is used for sessions. It is fine for a loopback fixture and **not for production**
  (no persistence, no sharing across processes, unbounded memory).
- No browser was run: `HttpOnly` and `SameSite` are browser-enforced; only the attributes were
  checked.
- No rate limiting, lockout, MFA, password reset, remember-me, idle-timeout or concurrent-session
  behaviour.
- The `/_fixture/session-id` route exists only so tests can prove the id changed; it is not part of
  an application surface.
- Correct cookie attributes, a fresh session id and CSRF tokens address the demonstrated concerns
  only. They do not make the application "secure"; phishing, credential stuffing, XSS that drives
  authenticated requests, and server-side bugs are out of scope here.
