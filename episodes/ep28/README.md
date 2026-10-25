# EP 28 - I Hid the Admin Button. The Admin Action Still Worked.

**Central idea.** Client-side visibility is an interface decision; a privileged action needs a server-side permission check, resolved from trusted state before any side effect.

## What this fixture is
- `fixtures/ep28-hidden-admin-button/` - a loopback-only Express app on an ephemeral port with `node:sqlite` storage: a synthetic administrator (`u_admin`) and member (`u_member`), a server-side session table, a server-side role/permission store, and one harmless action (publish a synthetic announcement).
- Flawed route `POST /vuln/announcements`: authenticate, CSRF, insert. Corrected route `POST /announcements`: authenticate, CSRF, **permission**, insert.
- The UI render function hides the publish button from the member in **both** versions; a test asserts the button is absent.
- CSRF uses `csrf-csrf` 3.1.0 (same pin as the EP03 fixture): a maintained library, not hand-rolled. Express has no built-in CSRF protection.
- Deliberate policies: 401 for no session (before CSRF), 403 `EBADCSRFTOKEN` for CSRF failure, 403 `PERMISSION_DENIED` for authorization failure; permission read from the store at request time; browser-submitted role fields never read.
- **Scope:** function-level permission checks, not object-level ownership.

## Evidence
- Executed: `node --test fixtures/ep28-hidden-admin-button/test.mjs` -> `# tests 12`, `# pass 12`, `# fail 0` (includes a known-positive control: the member publishes through the flawed endpoint with a valid session and valid CSRF token).
- Executed: `node fixtures/ep28-hidden-admin-button/demo.mjs` -> `evidence.json`: flawed member publish 201 (count 1 to 2); corrected member 403 `PERMISSION_DENIED` (count 2 to 2); forged role claim 403; bad CSRF token 403 `EBADCSRFTOKEN`; no session 401 on both routes; administrator on the corrected route 201 (count 2 to 3).
- Observed: database announcement counts are read directly from the sqlite store after each request, not inferred from responses.
- Executed: `video/src/episodes/ep28/timeline.json` and `captions.srt` were generated with `--no-audio` (word-count estimate only). They must be rebuilt from the real narration.
- Not executed: narration audio, video render, inspection frames. No MP4 is claimed to exist; the orchestrator renders and fills `render-evidence.json`.

## Build and render
```
cd fixtures/ep28-hidden-admin-button && npm install --no-audit --no-fund && node --test test.mjs && node demo.mjs
cd video && npm install
node tools/build-timeline.mjs ep28    # from narration audio in video/public/ep28/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep28 --concurrency 2
```

## Accuracy checklist (brief -> where it appears)
- Loopback only: fixture binds 127.0.0.1; on-screen note in `setup` and `end`.
- Browser-submitted role is not authority: `fix` scene, narration, test 9.
- CSRF failure must not masquerade as authorization: all authorization tests use a valid session and valid token; `setup` scene; narration "valid CSRF token".
- Authentication vs CSRF vs authorization distinguished: `layers` and `retest` scenes, test 7 and 8.
- Database state verified after rejected requests: `retest` scene (count 2 to 2), tests 3, 5, 7.
- 401 for unauthenticated, consistently: test 5 (both endpoints, three variants).
- Function-level, not object ownership: narration and `end` scene, fixture README.

## Limitations
- Simulated: the "member" and "administrator" are a cookie-jar test client; no real browser, no real cross-site request, no HTTPS (cookies are not `Secure`). The on-screen "page" is an illustration of the render function's output, not a screenshot.
- Sign-in is a test harness (`/_fixture/login/:user`); sessions have no expiry or rotation.
- Only the publish route is covered. Every other privileged route needs its own check and test. The application is not claimed to be fully secure.
- The flawed endpoint is hand-constructed and must never be deployed.
