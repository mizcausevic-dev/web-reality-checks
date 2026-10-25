SEO title (≤60 chars): What Sign In Does: Hash, Fresh Session, Opaque Cookie
Meta description (≤155 chars): One sign-in implementation, traced end to end on a local fixture: argon2id hash, session regenerated on login, host-only cookie, two-step authorization.
Slug: sign-in-session
Primary keyword: session cookie authentication   Secondary keywords (3–5): session fixation, argon2id password hashing, HttpOnly Secure SameSite, express-session regenerate, CSRF on login and logout
Medium tags (5): Web Security, Authentication, Node.js, Software Engineering, Web Development

# Watch What Happens When You Click 'Sign In'

![The Set-Cookie header from the fixture's login response, sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/ with no Domain attribute, and the note that the cookie identifies a session, not a permission](../hero.png)

You click Sign In and a second later you are on your dashboard. In between, three objects move through five parts of the system, and a sign-in goes wrong the moment one object becomes another: the password leaking into the cookie, or the pre-login session identifier surviving into the authenticated session.

This is episode three of Web Reality Checks. It traces one implementation, email and password over HTTPS with an opaque cookie identifying a server-side session, on a local fixture built from maintained libraries, and records what each step returned. Token-based APIs, OAuth/OIDC, passkeys and SSO work differently.

## What actually happens

Five lanes: browser, HTTPS connection, application server, user database, session store. Three objects: password, session identifier, authorization decision. The design keeps those three apart.

The password exists in the user's head and in the body of one POST request. The user database never holds it. It holds a salted argon2id hash, produced by a deliberately slow one-way function with a random salt. No key turns the hash back into the password; nothing was encrypted, so nothing can be decrypted. On a later login the server recomputes and compares. Because the salt is random, two hashes of the same password differ, and both verify.

On a successful verify, the server regenerates the session. The browser already had one before login, minted when the CSRF token was fetched. If that pre-authentication identifier simply acquired a `userId`, anyone who had planted it in the browser would now hold an authenticated session. Regeneration destroys the old record and issues a fresh identifier, so a planted one is worthless.

The fresh identifier travels in a cookie whose value is opaque: a random id signed by `express-session`, containing no password, email or user id. `HttpOnly` keeps it out of `document.cookie` for ordinary scripts; it does not stop a script from issuing requests the browser attaches the cookie to. `Secure` means HTTPS only. `SameSite=Lax` is defense in depth, not complete CSRF protection, because same-site requests and top-level GET navigations still carry the cookie. No `Domain` means host-only: the cookie returns only to the exact host that set it.

Later requests carry the cookie. The server looks the identifier up and finds `{userId, role}`. The identity lived in the store; no permission traveled with the cookie.

A protected action asks two questions in order. Valid session? If not, 401. Permitted? If not, 403. Two middlewares, two status codes, two facts.

Sign out is a POST protected by a CSRF token, since `SameSite=Lax` alone would let a top-level GET navigation end a session. The server destroys the record and expires the cookie; replaying the old value finds nothing.

## The fixture

`fixtures/ep03-sign-in-session/` is a loopback-only Node app on `express` 4.22.3, with `argon2` 0.41.1 for hashing, `express-session` 1.19.0 for the session store and cookie, and `csrf-csrf` 3.1.0 plus `cookie-parser` 1.4.7 for CSRF tokens (versions as pinned in the fixture README). Two synthetic users: `alice@example.test` (member) and `carol@example.test` (admin). No cryptography was written by hand.

The session configuration carries the cookie policy:

```js
  const store = new session.MemoryStore(); // fine for a loopback fixture; NOT for production
  app.use(session({
    name: SESSION_COOKIE,
    secret: crypto.randomBytes(32).toString('hex'), // per-process; fixture only
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 60 * 1000}, // no Domain => host-only
  }));
```

The login handler regenerates before writing anything about the user:

```js
    if (!regenerateOnLogin) return finish(); // FLAWED VARIANT (control only)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({error: 'session error'});
      store.destroy(preAuthId, () => finish()); // regenerate already destroys the old id; this is belt and braces
    });
```

`createApp({regenerateOnLogin: false})` builds the flawed variant, used only as a known-positive control.

One environment fact must be stated plainly. There is no trusted local certificate authority here, so the fixture does not run TLS. The server sets `app.set('trust proxy', 1)` and `cookie.secure = true`, and the test client sends `X-Forwarded-Proto: https`, which makes `express-session` issue the `Secure` cookie. The HTTPS leg in the video is a labeled conceptual illustration; every other scene carries the tag `LOCAL FIXTURE · TLS LEG CONCEPTUAL`.

## The test that proves it

`node --test test.mjs` runs twelve tests and reports `# tests 12  # pass 12  # fail 0` (local synthetic fixture):

- `password hash is not the password and is salted (two hashes of the same password differ)`
- `wrong password is rejected with 401 and no authenticated session`
- `session id changes after successful login (pre-auth id invalidated)`
- `KNOWN-POSITIVE CONTROL: without regenerate(), the pre-auth session id survives login`
- `session cookie attributes: HttpOnly, Secure, SameSite=Lax, Path=/, no Domain; value is opaque`
- `Secure cookie is only issued for a request the server considers HTTPS (plain HTTP gets none)`
- `protected route: 401 without cookie, 403 with valid session but missing permission, 200 with both`
- `logout invalidates the server-side session and expires the cookie`
- `POST /login without a CSRF token is rejected (403) even with correct credentials`
- `POST /logout without a CSRF token is rejected and the session survives`
- `GET /logout is not allowed (405) and does not end the session`
- `CSRF cookie is also HttpOnly, Secure, host-only`

The fourth test gives the third its meaning: it builds the flawed app, logs in, and asserts the session id is unchanged. Its assertion message says why: "the flaw must be observable or the fix test proves nothing."

The sixth test is the honest HTTPS story: a client that omits `X-Forwarded-Proto: https` receives no session cookie at all. The server's behavior is tested; a browser's on real TLS is not.

## The repair

This fixture is built correctly from the start, so the repair is the distance between the flawed variant and the shipped one: a single call.

Without `req.session.regenerate()`, the pre-authentication identifier becomes the authenticated one: the record gains `userId` and `role`, the cookie value stays the same, and whoever held it before login holds a signed-in session after. With `regenerate()`, called after `argon2.verify` succeeds and before `userId` or `role` is written, the old record is destroyed and a fresh id replaces the cookie value. Regeneration also invalidates the pre-login CSRF token, so `POST /login` returns a new one.

The other policies are refusals: `GET /logout` is 405 with `Allow: POST`; login and logout without a valid double-submit token are 403; unknown email and wrong password share one 401 body, with a dummy `argon2.verify` for unknown users so timing is similar (a mitigation, not a guarantee).

## Retest

From `evidence.json` (local synthetic fixture, one run; identifiers are random and differ per run):

- Stored hash: `$argon2id$v=19$m=65536,t=3,p=4$…`, 97 characters; second hash `differ: true`; `containsPassword: false`.
- `POST /login`, wrong password: 401, no `Set-Cookie`. Correct password: 200, `Set-Cookie: sid=<opaque id>; Path=/; Expires=…; HttpOnly; Secure; SameSite=Lax`, `hasDomainAttribute: false`.
- Session id before and after login: `changed: true`. Pre-authentication cookie replayed after login: 401.
- `GET /me` with the new cookie: 200, `u_alice`, `member`.
- `GET /admin/audit`: no cookie 401; alice 403 (`required: admin, actual: member`); carol 200.
- `POST /login` without CSRF header: 403. `GET /logout`: 405. `POST /logout` without CSRF header: 403. With token: 200, `cookieExpired: true`. Old cookie after logout: 401.
- `GET /csrf-token` without `X-Forwarded-Proto: https`: `sessionCookieIssued: false`.

## What this does not prove

- The HTTPS leg is illustrated, not measured. No handshake, certificate validation or encrypted transport ran. `Secure` was verified on the `Set-Cookie` header only.
- `HttpOnly` and `SameSite` are browser-enforced. No browser was run; the attributes are proven present, not their effect.
- `MemoryStore` is for the loopback fixture only, not production.
- Not covered: rate limiting, lockout, MFA, password reset, remember-me, idle timeout, concurrent sessions, token-based, OAuth/OIDC, passkey or SSO sign-in.
- Correct cookie attributes, a fresh session id and CSRF tokens address the demonstrated concerns only. Phishing, credential stuffing, XSS that drives authenticated requests and server-side bugs are out of scope. The application is not claimed to be secure. This is one implementation, not every sign-in system.

## Launch checklist

1. The user database stores a salted hash from a maintained library, never the password or a reversible encryption of it.
2. The session identifier is regenerated after authentication; a test replays the pre-authentication id and expects 401.
3. A known-positive control exists: a variant without regeneration that the same test catches.
4. The session cookie is `HttpOnly`, `Secure`, has an explicit `SameSite`, and no `Domain` unless cross-subdomain sharing is deliberate.
5. A test asserts the cookie value contains no password, email or user id.
6. Login and logout are POST, both CSRF-protected; `GET /logout` returns 405.
7. Protected routes check session validity and permission as two steps; a test covers 401, 403 and 200.
8. Sign-out destroys the server-side record and expires the cookie; a test replays the old cookie and expects 401.

## FAQ

**What is session fixation and how does regenerating the session id prevent it?**
Session fixation is when an attacker plants a session identifier in a victim's browser before login and uses it after the victim authenticates. Regenerating the id on login destroys the pre-authentication record and issues a fresh one, so the planted identifier is dead. In the fixture, replaying it returns 401.

**Does HttpOnly make a session cookie safe from XSS?**
No. `HttpOnly` keeps the cookie out of `document.cookie`, so an injected script cannot read the value. It does not stop that script from making requests the browser attaches the cookie to. It narrows one attack; it does not replace preventing XSS.

**Why does a cookie-based login need CSRF tokens if SameSite is set?**
`SameSite=Lax` still sends the cookie on same-site requests and top-level GET navigations, and older user agents may not honor it. The fixture requires a double-submit token on `POST /login` (against login CSRF) and `POST /logout` (so a third-party page cannot sign you out), and refuses `GET /logout` with 405.

## Watch the episode

[YouTube link]

- 00:00 You click Sign In: 401, then 200 and one cookie
- 00:12 Five lanes, three objects
- 00:21 The HTTPS leg (conceptual illustration, not executed)
- 00:33 Verify: a salted argon2id hash, not the password
- 00:45 Fresh session id on success
- 00:57 The cookie: HttpOnly, Secure, SameSite=Lax, no Domain
- 01:11 A later request carries the cookie
- 01:22 Two checks: valid session, then permission
- 01:33 Sign out: POST with CSRF token, record destroyed
- 01:49 The cookie identifies a session. The server enforces access.

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [HTTPS Encrypts Your Request. What Can the Network Still See?](../../ep20/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The cookie identifies a session. The server enforces access. Keep the password, the session id and the authorization decision as three objects, and write the test that proves none became another.

Miz Causevic, Kinetic Gain LLC
