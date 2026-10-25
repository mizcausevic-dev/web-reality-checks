# EP 03 — Watch What Happens When You Click 'Sign In'

**Central idea.** One implementation of sign-in — email/password over HTTPS, a salted password hash, and an opaque cookie that identifies a server-side session — where the password, the session id and the authorisation decision are three different objects and none becomes another.

## What this fixture is
- `fixtures/ep03-sign-in-session/` — a loopback-only Node 22 app on `express` 4.22.3 with `argon2` 0.41.1 (argon2id, random salt) for password hashing, `express-session` 1.19.0 (MemoryStore, opaque signed `sid` cookie) for sessions, and `csrf-csrf` 3.1.0 (+ `cookie-parser` 1.4.7) double-submit tokens on `POST /login` and `POST /logout`.
- Two synthetic users: `alice@example.test` (member) and `carol@example.test` (admin).
- Deliberate policies: `req.session.regenerate()` after a successful `argon2.verify` (pre-auth id destroyed, fresh id issued); cookie `HttpOnly; Secure; SameSite=Lax; Path=/` with **no `Domain`** (host-only); `GET /logout` → 405; `/admin/audit` checks session validity (401) and then, separately, `role === 'admin'` (403); logout destroys the server-side record and sends `Expires=Thu, 01 Jan 1970`; unknown user and wrong password share one 401 body.
- `createApp({regenerateOnLogin: false})` builds the flawed variant used only as a known-positive control in the tests.
- **TLS was not executed.** There is no trusted local CA in this environment, so the server runs plain HTTP on `127.0.0.1` with `app.set('trust proxy', 1)` and `cookie.secure = true`; the test client sends `X-Forwarded-Proto: https`, which makes `express-session` issue the `Secure` cookie. The HTTPS leg in the video is a labelled conceptual illustration (`sim: "CONCEPTUAL ILLUSTRATION"`), and the rest of the episode carries the persistent tag `LOCAL FIXTURE · TLS LEG CONCEPTUAL`.

## Evidence
- Executed: `cd fixtures/ep03-sign-in-session && node --test test.mjs` → `# tests 12  # pass 12  # fail 0` (includes a known-positive control: without `regenerate()` the pre-auth session id survives login).
- Executed: `node fixtures/ep03-sign-in-session/demo.mjs` → `evidence.json`: wrong password **401**; correct password **200** with `Set-Cookie sid=<opaque id>; Path=/; Expires=…; HttpOnly; Secure; SameSite=Lax`, `hasDomainAttribute: false`; session id **changed: true**; replay of pre-auth cookie after login **401**; `GET /me` with cookie **200** (`u_alice`, `member`); `GET /admin/audit` anonymous **401**, alice **403** (`required: admin, actual: member`), carol **200**; `POST /login` without CSRF header **403**; `GET /logout` **405**; `POST /logout` without CSRF header **403**; `POST /logout` with token **200**, `cookieExpired: true`; replay after logout **401**; request without `X-Forwarded-Proto: https` → `sessionCookieIssued: false`. Hash: `$argon2id$v=19$m=65536,t=3,p=4$…`, 97 chars, `differ: true`, `containsPassword: false`.
- Verified: `cd video && npx tsc --noEmit` passes with `video/src/episodes/ep03/*`.
- Executed: `node tools/build-timeline.mjs ep03 --no-audio` → `video/src/episodes/ep03/timeline.json` (estimated 104.6 s, no audio; to be rebuilt by the orchestrator once narration exists).
- Blocked: real HTTPS handshake, certificate validation, and a browser's `Secure`/`HttpOnly`/`SameSite` enforcement — no trusted local CA and no browser were available. Attributes were verified on the `Set-Cookie` header only.
- Not executed: narration audio and MP4 render (orchestrator fills `render-evidence.json`).
- The session ids shown on screen (`IXbv8tHA…`, `KCWMieVO…`) are the first eight characters of the ids recorded in `evidence.json` for one run; they are random and differ on every run.

## Build and render
```
cd fixtures/ep03-sign-in-session && npm install --no-audit --no-fund && node --test test.mjs && node demo.mjs
cd video && npm install
node tools/build-timeline.mjs ep03      # needs video/public/ep03/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep03 --concurrency 2
```

## Security requirements → where each is covered
| Requirement | Narration / on-screen | Fixture |
| --- | --- | --- |
| Hashing is not reversible encryption | scene `verify` (gate: "One way" pass, "Reversible encryption" struck) | `argon2.hash/verify`; test 1 |
| Fresh session id after authentication | scene `fresh_session` | `session.regenerate()`; tests 3–4 |
| Cookie scope set deliberately, host-only preferred | scene `cookie` ("Path=/ · no Domain") | no `domain` option; test 5 |
| HttpOnly limits ordinary JS access, not every session attack | scene `cookie`, caption | attribute asserted; browser behaviour not tested |
| SameSite is defence in depth, not complete CSRF protection | scenes `cookie`, `logout` | `csrf-csrf` on login and logout; tests 9–10 |
| Framework CSRF protection on login and logout | scene `logout` | `doubleCsrfProtection` middleware; tests 9–10 |
| No GET for state-changing operations | scene `logout` ("GET /logout → 405") | test 11 |
| HTTPS does not protect a compromised browser or server | scene `https` | n/a (TLS not executed) |
| One implementation, not all sign-in systems | scenes `click`, `end` | README |
| Secure-cookie exchange not faked | scene `https` tagged CONCEPTUAL ILLUSTRATION; sim tag everywhere else | test 6 shows the cookie is withheld on non-HTTPS |

## Limitations
- The HTTPS leg is illustrated, not measured. Nothing was encrypted in this environment.
- `MemoryStore` is for the loopback fixture only; it is not a production session store.
- `HttpOnly` and `SameSite` are browser-enforced; the fixture proves the attributes are set, not what a browser does with them.
- Not covered: rate limiting, lockout, MFA, password reset, remember-me, idle timeout, concurrent sessions, token-based/OAuth/OIDC/passkey sign-in.
- Correct cookie attributes, a fresh session id and CSRF tokens address the demonstrated concerns only; the application is not claimed to be fully secure.
- Timeline durations in `timeline.json` are a word-count estimate until real narration audio is supplied.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep03/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep03 → episodes/ep03/ep03.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 119.53 s, 9885270 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
