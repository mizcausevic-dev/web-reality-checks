# EP03 — framework configuration

All values below are the ones in `server.mjs`; nothing here is aspirational. Versions are pinned in
`package.json` and `package-lock.json`.

| Library | Version | Role |
| --- | --- | --- |
| `argon2` | 0.41.1 (prebuilt native binary installed fine) | Password hashing and verification, `argon2id` |
| `express` | 4.22.3 | HTTP framework |
| `express-session` | 1.19.0 | Server-side session + opaque id cookie |
| `csrf-csrf` | 3.1.0 | Double-submit CSRF tokens bound to the session id |
| `cookie-parser` | 1.4.7 | Required by `csrf-csrf` to read its cookie |

## Password hashing

```js
argon2.hash(pw, {type: argon2.argon2id})   // library defaults: m=65536 KiB, t=3, p=4, 16-byte random salt
argon2.verify(storedHash, submitted)        // constant-time compare inside the library
```

- The encoded string (`$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>`, 97 chars) is what the user
  database stores. The password itself is never stored.
- Hashing is one-way. There is no key that turns the hash back into the password; the server can
  only recompute and compare.
- Unknown email: the server still runs `argon2.verify` against a dummy hash so the response time is
  similar and the body is identical (`401 {error: "invalid credentials"}`). This is a mitigation,
  not a guarantee against enumeration.

## Session

```js
app.set('trust proxy', 1);                 // honour X-Forwarded-Proto from the first proxy hop
app.use(session({
  name: 'sid',
  secret: crypto.randomBytes(32).toString('hex'),   // per-process; fixture only
  store: new session.MemoryStore(),                 // fixture only — NOT for production
  resave: false,
  saveUninitialized: false,
  cookie: {httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 60 * 1000},
  // no `domain` => host-only cookie: sent only to the exact host that set it
}));
```

- `secure: true` means `express-session` only sets the cookie on a request it considers HTTPS.
  Because there is no trusted local CA in this environment, the fixture is exercised over plain
  HTTP on 127.0.0.1 with the test client sending `X-Forwarded-Proto: https`, which `trust proxy`
  accepts. A request without that header receives **no** session cookie (tested, and recorded in
  `evidence.json` as `sessionCookieIssued: false`). The TLS leg itself was not executed.
- In a real deployment, remove the reliance on a forwarded header unless a trusted reverse proxy
  sets it, and terminate TLS there or in Node.
- `MemoryStore` leaks and does not scale or survive restarts. Use a backed store (Redis, a
  database) in production.
- After `argon2.verify` succeeds: `req.session.regenerate(cb)` destroys the pre-authentication
  record and issues a fresh id; only then are `userId` and `role` written. The flawed variant
  (`createApp({regenerateOnLogin: false})`) exists solely as a known-positive control in `test.mjs`.
- Sign-out: `req.session.destroy(cb)` removes the server-side record, then
  `res.clearCookie('sid', {...same attributes})` sends `Expires=Thu, 01 Jan 1970`.

## CSRF

```js
doubleCsrf({
  getSecret: () => csrfSecret,                       // per-process random secret
  getSessionIdentifier: (req) => req.session.id,     // token is only valid for the session that minted it
  cookieName: '__Host-wrc.x-csrf-token',
  cookieOptions: {httpOnly: true, secure: true, sameSite: 'lax', path: '/'},
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  errorConfig: {statusCode: 403, ...},
});
app.post('/login',  doubleCsrfProtection, ...);
app.post('/logout', doubleCsrfProtection, ...);
```

- `GET /csrf-token` mints a token with `overwrite = true`, so it is always bound to the current
  session id. `POST /login` returns a new token in its body because `regenerate()` changed the id
  and the pre-auth token is no longer valid (by design).
- Login is CSRF-protected to prevent *login CSRF* (an attacker logging the victim into the
  attacker's account). Logout is protected so a third-party page cannot sign the user out.
- `SameSite=Lax` is defence in depth. It does not stop same-site requests, top-level GET
  navigations, or old user agents, which is why the double-submit token is also required.
- `GET /logout` returns `405 Allow: POST`. No state changes ride on GET.

## Authorization

```js
const requireSession = (req, res, next) => req.session?.userId ? next() : res.status(401)...;
const requireRole = (role) => (req, res, next) => req.session.role === role ? next() : res.status(403)...;
app.get('/admin/audit', requireSession, requireRole('admin'), handler);
```

Two separate questions, two separate middlewares, two separate status codes: 401 when there is no
valid session, 403 when there is a valid session without the permission.
