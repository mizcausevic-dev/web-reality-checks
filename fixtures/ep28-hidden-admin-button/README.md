# EP28 fixture - hiding an admin button is not security

A small loopback-only application with one privileged but harmless action: **publish a synthetic announcement**.
Two endpoints share the same session and CSRF protection and differ in exactly one step: the permission check.

| Route | Chain | Result for the member |
| --- | --- | --- |
| `POST /vuln/announcements` (FLAWED) | authenticate, CSRF, insert | 201, announcement created |
| `POST /announcements` (CORRECTED) | authenticate, CSRF, **permission**, insert | 403 `PERMISSION_DENIED`, nothing written |

The UI render function (`renderApp`) hides the publish button from the member in **both** versions (`GET /vuln/app`, `GET /app`). The fixture shows that this is presentation only.

Users are synthetic: `u_admin` (role `admin`) and `u_member` (role `member`). Node 22 `node:http` is used through Express; storage is an in-memory `node:sqlite` database with tables `users`, `user_roles`, `role_permissions`, `sessions`, `announcements`. Everything binds to `127.0.0.1` on an ephemeral port.

## Run

```
cd fixtures/ep28-hidden-admin-button
npm install --no-audit --no-fund     # express 4.21.2, cookie-parser 1.4.7, csrf-csrf 3.1.0 (same pins as ep03); lockfile committed
node --test test.mjs
node demo.mjs                        # writes evidence.json
```

`node:sqlite` prints an ExperimentalWarning on Node 22; it is harmless.

## Three different checks, three different answers

| Question | Failure | Response |
| --- | --- | --- |
| Authentication: is there a live server-side session? | no or unknown session cookie | `401` `{error: "unauthenticated", code: "NO_SESSION"}` |
| CSRF: does the request carry a token bound to this session? | missing, tampered, foreign token | `403` `{error: "csrf_invalid", code: "EBADCSRFTOKEN"}` |
| Authorization: does the store grant `announcement:publish` to this user's role? | member | `403` `{error: "forbidden", code: "PERMISSION_DENIED"}` |

Authentication runs first, so an unauthenticated caller receives 401 consistently on both endpoints, with or without a CSRF header. CSRF runs second because the token is bound to the session id. Authorization runs third, before any write.

## CSRF: library, not hand-rolled

Express has no built-in CSRF protection. This fixture reuses the library the EP03 fixture uses, **`csrf-csrf` 3.1.0** (double-submit cookie token, bound to the server-side session id via `getSessionIdentifier`), with `cookie-parser` 1.4.7. The CSRF cookie is `HttpOnly; SameSite=Lax` and **not `Secure`** because the fixture runs over plain HTTP on loopback; a deployed site would set `secure: true`. Session management is a small table in the fixture, not `express-session`; sign-in itself is a test harness (`GET /_fixture/login/:user`), not production authentication (EP03 covers sign-in).

## Deliberate policies

- Permission is resolved from `user_roles` JOIN `role_permissions` **at request time**, never copied into the session, so revoking a permission takes effect on a live session (tested).
- A browser-submitted `role`, `permissions`, `isAdmin`, `user`, `x-role`, `x-user-id` or `?role=` is never read (tested).
- Permission is checked **before** body validation, so a denied caller cannot probe validation behaviour (denied + invalid body is 403, not 400).
- Tests use a **valid session and a valid CSRF token** for every authorization assertion, so a CSRF failure cannot masquerade as an authorization result. CSRF failures are tested separately with an authorized caller (the administrator), so only CSRF can be the reason for refusal.
- The UI does not rotate the CSRF token when it renders the form (`generateToken(..., false)`), so a token fetched earlier stays valid.

## Tests (`test.mjs`)

1. UI: button absent for the member, present for the administrator, on both versions' pages.
2. Known-positive control: member publishes through the flawed endpoint (201), and the store confirms the member lacks the permission.
3. Corrected: member with valid session and valid token gets 403 `PERMISSION_DENIED`; announcement count unchanged.
4. Corrected: administrator gets 201; row's publisher is `u_admin`.
5. Unauthenticated: 401 on both endpoints (no cookie, forged header, unknown session id); nothing written.
6. Logout deletes the server-side session; old cookie is 401.
7. CSRF: missing, tampered, other-session token, and absent CSRF cookie are 403 `EBADCSRFTOKEN`, never `PERMISSION_DENIED`; nothing written.
8. Member with a bad token gets the CSRF error; member with a good token gets the permission error.
9. Role/permission claims in body, query and headers are ignored.
10. Permission revoked in the store takes effect on the same live session (and in the UI).
11. Step order recorded by the server: `authenticate, csrf, permission` for a denied request (no `insert`); `authenticate, csrf, permission, insert` for the administrator; `authenticate, csrf, insert` on the flawed route.
12. Denied request with an invalid body is 403, not 400.

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

`node demo.mjs` writes `evidence.json`. Key values: flawed member publish 201 (count 1 to 2); corrected member publish 403 `PERMISSION_DENIED` (count 2 to 2); forged role claim 403 `PERMISSION_DENIED`; bad CSRF token 403 `EBADCSRFTOKEN`; no session 401 `NO_SESSION` on both endpoints; administrator publish on the corrected route 201 (count 2 to 3).

## Scope and limitations - what is NOT tested

- **This demonstrates function-level permission checks** ("may this role perform this action at all?"), **not object-level ownership** ("may this user touch this particular record?"; see EP01). There is one action and one permission; there is no per-announcement owner check.
- No real browser is used. The "member" is a test client with a cookie jar, so no rendering, no real SameSite enforcement, no cross-site request is exercised. Tests assert on the HTML string returned by the render function.
- No HTTPS; the CSRF and session cookies are not `Secure` here.
- Session handling is minimal (no expiry, no rotation on login, no rate limiting). Sign-in is a harness.
- Only the publish route is covered. Other routes in a real application each need their own permission check and test.
- The flawed endpoint was constructed by hand for this fixture and must never be deployed.
