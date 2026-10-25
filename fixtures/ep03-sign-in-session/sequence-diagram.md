# EP03 — sequence diagram (exact fixture flow)

This is the flow `demo.mjs` executes against `server.mjs`. The HTTPS leg is drawn as the deployment
intends it; in this environment the fixture ran over plain HTTP on loopback with
`X-Forwarded-Proto: https` so `express-session` would issue the `Secure` cookie. **The TLS handshake
and encrypted transport were not executed here.**

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant T as HTTPS connection (conceptual here)
    participant S as Application server (express)
    participant U as User database (argon2id hashes)
    participant M as Session store (express-session MemoryStore)

    Note over B,M: Pre-authentication
    B->>T: GET /csrf-token
    T->>S: GET /csrf-token
    S->>M: create anonymous session (pre-auth id)
    S-->>B: 200 {csrfToken}  +  Set-Cookie sid=<pre-auth id>; HttpOnly; Secure; SameSite=Lax<br/>+ Set-Cookie __Host-wrc.x-csrf-token=...; HttpOnly; Secure

    Note over B,M: Click "Sign In" (wrong password)
    B->>T: POST /login {email, password}  Cookie: sid, csrf  Header: x-csrf-token
    T->>S: POST /login
    S->>S: csrf-csrf: token hash matches cookie + bound to session id?
    S->>U: lookup alice@example.test -> passwordHash
    S->>S: argon2.verify(hash, password) -> false
    S-->>B: 401 {error: "invalid credentials"} (no Set-Cookie)

    Note over B,M: Click "Sign In" (correct password)
    B->>T: POST /login {email, password}  Cookie: sid, csrf  Header: x-csrf-token
    T->>S: POST /login
    S->>S: csrf-csrf check passes
    S->>U: lookup -> passwordHash
    S->>S: argon2.verify(hash, password) -> true
    S->>M: session.regenerate(): destroy pre-auth id, create fresh id
    S->>M: store {userId: u_alice, role: member} under fresh id
    S-->>B: 200 {ok, user, csrfToken(new)}  +  Set-Cookie sid=<fresh opaque id>; HttpOnly; Secure; SameSite=Lax; Path=/ (no Domain)

    Note over B,M: Subsequent request
    B->>T: GET /me  Cookie: sid=<fresh id>
    T->>S: GET /me
    S->>M: get(fresh id) -> {userId, role}
    S-->>B: 200 {user: {id: u_alice, role: member}}

    Note over B,M: Protected action: session check, then separate permission check
    B->>T: GET /admin/audit  Cookie: sid
    T->>S: GET /admin/audit
    S->>M: get(sid) -> session valid? (401 if not)
    S->>S: role === "admin"? (403 for alice/member; 200 for carol/admin)
    S-->>B: 403 {error: "forbidden", required: admin, actual: member}

    Note over B,M: Sign out (POST only; GET /logout -> 405)
    B->>T: POST /logout  Cookie: sid, csrf  Header: x-csrf-token
    T->>S: POST /logout
    S->>S: csrf-csrf check passes
    S->>M: destroy(sid)
    S-->>B: 200 {ok}  +  Set-Cookie sid=; Expires=Thu, 01 Jan 1970  (and csrf cookie expired)

    Note over B,M: Replay of the old cookie after logout
    B->>T: GET /me  Cookie: sid=<old id>
    T->>S: GET /me
    S->>M: get(old id) -> nothing
    S-->>B: 401 {error: "no valid session"}
```

## Objects, kept distinct on purpose

| Object | Where it lives | Where it travels | Never becomes |
| --- | --- | --- | --- |
| Password | user's head, request body once | browser -> server, inside TLS | the cookie, the stored value |
| Password hash (argon2id, salted) | user database | nowhere | the password (not reversible) |
| Session id (opaque, random) | session store key + `sid` cookie | browser <-> server on every request | a credential or a permission |
| Session record `{userId, role}` | session store only | nowhere | visible to the browser |
| CSRF token | `__Host-wrc.x-csrf-token` cookie (hash) + `x-csrf-token` header (value) | browser -> server on state changes | a substitute for the session |
| Authorization decision | server, per request | nowhere | something the cookie encodes |
