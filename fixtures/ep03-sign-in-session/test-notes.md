# EP03 — test notes

Run: `node --test test.mjs` (from this folder, after `npm install --no-audit --no-fund`).
Node 22 `node:test`; the server binds `127.0.0.1` on an ephemeral port. The test client
(`client.mjs`) is a minimal cookie jar that sends `X-Forwarded-Proto: https` so the server, which has
`trust proxy = 1`, treats the request as HTTPS and issues `Secure` cookies. It is not a browser.

## Executed (2026-10-25)

```
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

| # | Test | What it proves | Status |
| --- | --- | --- | --- |
| 1 | hash is not the password and is salted | `argon2id` encoding, two hashes of the same password differ, both verify | pass |
| 2 | wrong password rejected | 401, no session established; unknown user gets an identical 401 body | pass |
| 3 | session id changes after login | fresh id after `regenerate()`, cookie value replaced, old id absent from the store and rejected on replay | pass |
| 4 | KNOWN-POSITIVE CONTROL | with `regenerateOnLogin:false` the pre-auth id survives login (the flaw is observable, so test 3 is meaningful) | pass |
| 5 | cookie attributes | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`; value contains no email/id/password | pass |
| 6 | Secure cookie only over "HTTPS" | a request without `X-Forwarded-Proto: https` receives no session cookie at all | pass |
| 7 | protected route | 401 without cookie; 403 with a valid member session; 200 with an admin session | pass |
| 8 | logout | server-side record destroyed, `Expires=Thu, 01 Jan 1970` cookie sent, replay of old value is 401 | pass |
| 9 | POST /login without CSRF token | 403 even with correct credentials; a token minted for a different session is also 403 | pass |
| 10 | POST /logout without CSRF token | 403 and the session survives | pass |
| 11 | GET /logout | 405 with `Allow: POST`; session survives | pass |
| 12 | CSRF cookie attributes | `HttpOnly`, `Secure`, host-only | pass |

## Not tested / not executed

- **Real TLS.** No trusted local CA exists in this environment, so no HTTPS handshake or encrypted
  exchange was performed. The `Secure` attribute was verified on the `Set-Cookie` header, and the
  server's refusal to issue it on a non-HTTPS request was verified; whether a browser would send the
  cookie back over a real TLS connection was not exercised.
- **Browser behaviour.** `HttpOnly` (hiding the cookie from `document.cookie`) and `SameSite=Lax`
  (not attaching the cookie on cross-site subrequests) are enforced by browsers, not by this server.
  The tests check that the attributes are present; they do not run a browser.
- Rate limiting, account lockout, password policy, MFA, password reset, "remember me", session
  expiry/idle timeout behaviour over time, concurrent-session limits.
- Store durability: `MemoryStore` is used and is explicitly not for production.
- Timing-attack resistance of the dummy-hash path is a mitigation, not measured.
- This is one implementation (email/password + server-side session + opaque cookie). It says
  nothing about token-based, OAuth/OIDC, passkey or SSO sign-in systems.
