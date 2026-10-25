# ep13-api-key-capability — classify a credential by what it authorises

**SIMULATED LOCAL FIXTURE.** Plain Node 22 ESM, zero dependencies, loopback (`127.0.0.1`) only, ephemeral ports. Every credential here is synthetic and invented for this fixture:

| value | shape | what it actually does at the mock upstream |
|---|---|---|
| `PUBLIC_PROJECT_ID = proj_pub_7f3a21` | identifier | names a project; `GET /public/:projectId` works for anyone; presented as a bearer credential it is **refused (403)** |
| `SERVER_SECRET_TOKEN = srv_secret_SYNTHETIC_…` | bearer credential | `POST /privileged` succeeds **(200)** for whoever holds it, for every operation the upstream offers (`rotate_webhook`, `delete_project`) |

Neither value reproduces, resembles on purpose, or tests any real vendor's credential format or policy.

## What it is

- `upstream.mjs` — the fictional vendor. `GET /public/:projectId` (no credential), `POST /privileged` (requires `Authorization: Bearer SERVER_SECRET_TOKEN`; 401 without a bearer, 403 with the wrong one, 400 for an unknown operation). Logs a redacted prefix only.
- `backend.mjs` — the application backend of the **corrected** architecture. Test-harness sessions (`GET /login/:user`, opaque cookie), two synthetic users (`u_mara` maintainer, `u_vik` viewer), `GET /config` (public id only), `GET /project` (public info via upstream), `POST /privileged` which **authenticates** (session), **authorises** (role), **validates the operation** against an allow-list of exactly one operation (`rotate_webhook`), and only then calls the upstream with the secret from backend-only config. The upstream's response is re-shaped; the secret appears in no response body or header. It also serves both bundles under `/bundle/flawed/*` and `/bundle/corrected/*`.
- `bundle-flawed/` — `app.js` + `index.html` with **both** values embedded (JS constant and inline `window.__ENV__`). The browser would call the upstream directly, presenting the secret itself. Never deploy.
- `bundle-corrected/` — only `PUBLIC_PROJECT_ID`; privileged work goes to the backend.
- `inspect-artifacts.mjs` — scans `.js/.mjs/.cjs/.html/.json/.map` files for credential-like strings (fixture secret prefix, `Bearer <token>` literals, private-key blocks, `secret|token|key|password: "<long high-entropy value>"` assignments) and identifier-like strings (`proj_pub_` prefix). Reports file, line, rule, kind and a **redacted** value. The CLI first runs a **known-positive control** against `bundle-flawed/` and refuses to report on anything if it cannot see the planted secret.
- `test.mjs`, `demo.mjs`, `evidence.json`.

## How to run

```
node --test test.mjs
node demo.mjs                                  # writes evidence.json
node inspect-artifacts.mjs bundle-flawed bundle-corrected   # exit 1 if any secret-like finding
```

## Executed

```
# tests 16
# suites 0
# pass 16
# fail 0
```

`node demo.mjs` (also in `evidence.json`):

| step | target | status | secret in response? |
|---|---|---|---|
| public id → `GET /public/proj_pub_7f3a21` | upstream | 200 | no |
| public id presented as bearer → `POST /privileged` | upstream | **403** | no |
| no credential → `POST /privileged` | upstream | 401 | no |
| CONTROL: synthetic secret → `POST /privileged` (rotate_webhook) | upstream | **200** | no |
| CONTROL: synthetic secret → `delete_project` | upstream | 200 | no |
| `GET /config` (browser payload) | backend | 200 | no |
| unauthenticated → `POST /privileged` | backend | **401** | no |
| vik (viewer) → `POST /privileged` | backend | **403** | no |
| mara (maintainer) → `POST /privileged` | backend | **200** | no (1 upstream call, made by the backend) |
| mara → `delete_project` through the backend | backend | **400** | no |

Scanner: flawed bundle **2 secret-like** (app.js:6, index.html:10) + 2 identifier-like; corrected bundle **0 secret-like** + 2 identifier-like, reported only after the control run found the planted ones.

## Tests (`test.mjs`)

Capability: public id reads public info (200); public id as bearer → 403; no credential → 401; **control** secret → 200. Inspection: **control** scanner finds the planted secret in both `app.js` and `index.html` and never reprints it in full; identifier flagged as identifier-like, not secret; corrected bundle 0 secret-like; the files the backend actually serves and the `/config` payload contain no secret (with a control that the served flawed bundle does). Backend: unauthenticated 401 and unauthorised 403 with **zero** upstream calls; authorised 200 with exactly one upstream call and no secret in body or headers; unknown/over-broad operation (`delete_project`, arbitrary, missing) → 400 before any upstream call, with a control that the upstream itself would perform `delete_project` for the secret-holder; client-supplied identity headers, a client-supplied bearer and a client-supplied project id change nothing; logout → 401.

## Deliberate policies

- The upstream distinguishes 401 (no bearer) from 403 (wrong bearer). The backend distinguishes 401 (no session), 403 (role), 400 (operation not on the allow-list). Any of these could be collapsed in a production design; they are kept separate here so the video can show which check fired.
- The backend never forwards a client-supplied operation, project id or credential. It performs **one** named operation, for **its** project, with **its** credential.
- `delete_project` exists at the upstream precisely so the secret is visibly more powerful than the single operation the backend exposes.

## Accuracy notes (the video and episode README repeat these)

- A value is not safe because it is named `PUBLIC`. The fixture's identifier happens to authorise nothing; that was established by **testing** it against the privileged endpoint, not by reading its name.
- Some real vendors issue browser-exposed keys that intentionally grant limited capability (and are expected to be restricted by other means). This fixture models one fictional vendor and establishes nothing about any real provider's policy.
- CORS is not authentication or authorisation. Nothing in this fixture relies on CORS; a `curl`/`fetch` from outside a browser ignores it entirely.
- Moving the secret behind a backend does not make an unrestricted proxy safe. The backend here authenticates, authorises **and** validates the operation. Test 13 shows what the allow-list is actually stopping.
- Inspect JavaScript, HTML, configuration payloads **and source maps** if your build produces them. This fixture scans `.js/.html/.json/.map`; it produced no source map, so none was scanned.
- The corrected scan shows 0 findings **in the tested assets**. That does not prove every possible leak is closed (other routes, server-rendered pages, logs, CDN/browser caches, third-party scripts, build caches, source-control history, screenshots). Patterns are heuristic.
- If this had been a real leaked production secret, removing it from the bundle would **not** revoke copies already downloaded. Revocation or rotation at the issuer is a separate, required response. This fixture does not implement rotation.

## What is NOT tested

- No real browser executes either bundle; the bundles are static artefacts that are served and scanned. The browser's behaviour is implied from the code, not observed.
- No real vendor API, no real credential format, no TLS, no network beyond loopback.
- Session handling is a test harness, not production authentication.
- Rotation/revocation, rate limiting, audit logging, and the many other properties a production backend needs.
