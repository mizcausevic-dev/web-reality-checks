# EP 13 — That API Key Is in Your JavaScript. Is That Always a Leak?

**Central idea.** Classify a credential by what it authorises, not by its name or prefix: a public identifier names something, a secret grants capability.

## What this fixture is
- `fixtures/ep13-api-key-capability/` — a loopback-only Node 22 fixture with three parts: a **mock upstream** (fictional vendor: `GET /public/:projectId` open to anyone; `POST /privileged` requires `Authorization: Bearer SERVER_SECRET_TOKEN`), an **application backend** (test-harness sessions, two synthetic users `u_mara` maintainer / `u_vik` viewer, role check, a one-entry operation allow-list, upstream call made with the secret from backend-only config, response re-shaped), and two static browser bundles.
- Two synthetic values: `PUBLIC_PROJECT_ID = proj_pub_7f3a21` (an identifier) and `SERVER_SECRET_TOKEN = srv_secret_SYNTHETIC_…` (a bearer credential). Neither models any real vendor's format or policy.
- `bundle-flawed/` embeds **both** values (JS constant and inline HTML env block) and calls the upstream directly from the browser. `bundle-corrected/` embeds only the identifier and asks the backend for the one privileged operation.
- `inspect-artifacts.mjs` scans `.js/.mjs/.cjs/.html/.json/.map` for credential-like strings (fixture secret prefix, `Bearer <token>` literals, private-key blocks, `secret|token|key|password: "<long high-entropy value>"`), reports redacted values, and runs a **known-positive control** against the flawed bundle before it will report on anything else.
- Deliberate policies: upstream 401 (no bearer) vs 403 (wrong bearer); backend 401 (no session) vs 403 (role) vs 400 (operation not on the allow-list), kept distinct so the video can show which check fired. The backend never forwards a client-supplied operation, project id or credential. `delete_project` exists at the upstream so the secret is visibly more powerful than the single operation the backend exposes.

## Evidence
- Executed: `node --test fixtures/ep13-api-key-capability/test.mjs` → `# tests 16  # pass 16  # fail 0`. Includes known-positive controls: the synthetic secret **does** authorise the privileged operation (200); the scanner **does** find the planted secret in both `app.js` and `index.html`; the served flawed bundle **does** contain the secret; the upstream **would** perform `delete_project` for the secret-holder.
- Executed: `node fixtures/ep13-api-key-capability/demo.mjs` → `evidence.json`. Upstream: public id as bearer **403**, no credential 401, secret **200** (rotate_webhook and delete_project). Backend: unauthenticated **401**, viewer **403**, maintainer **200** (exactly 1 upstream call, made by the backend; `secretInResponse: false` across all 5 backend responses), over-broad `delete_project` **400** with no upstream call. Scanner: flawed bundle **2 secret-like** + 2 identifier-like; corrected bundle **0 secret-like** + 2 identifier-like, after the control run.
- Executed: `node tools/build-timeline.mjs ep13 --no-audio` → provisional `video/src/episodes/ep13/timeline.json` (estimated 109.7 s from a 2.55 words/s rate; to be rebuilt from real narration audio by the orchestrator). Narration: 258 words.
- Executed: `cd video && npx tsc --noEmit` passes for `src/episodes/ep13/*` (at the time of writing, unrelated in-progress episodes from other builders may show their own errors).
- Predicted: scene durations in `Scenes.tsx` are tuned for roughly 7–14 s per scene; the orchestrator's audio-aligned timeline will set the real values.
- Blocked (not done here, by spec): narration audio, render, `render-evidence.json`, thumbnail, git.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep13      # from narration audio in video/public/ep13/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep13 --concurrency 2
```

## Accuracy bullets from the brief → where they appear
| brief bullet | narration | on screen | fixture |
|---|---|---|---|
| A value is not safe merely because it is named PUBLIC | `inspect_leak`, `public_fail` | scene 1 amber line; scene 3 "tested fact, not a promise" | capability test: public id as bearer → 403 |
| Some browser-exposed vendor keys intentionally grant limited capability; this fixture does not establish another provider's policy | `end` | end card | fixture README |
| CORS is not authentication or authorisation | `end` | end card | nothing in the fixture relies on CORS; the harness is not a browser |
| Moving a secret to a backend does not make an unrestricted proxy safe | `fix`, `allow` | scene 5 "NOT ENOUGH ON ITS OWN"; scene 7 `delete_project` → 400 | allow-list test + control that the upstream would allow it |
| Inspect JavaScript, HTML, configuration payloads, and source maps if produced | `retest_scan` | scene 8 "Scanned" / "Source maps" boxes | scanner extensions `.js/.html/.json/.map`; `/config` payload tested |
| Absence from tested assets does not prove every leak is closed | `retest_scan`, `end` | scene 8 amber line; end card | scanner CLI note; README |
| Removing a leaked production secret does not revoke copies; rotation is a separate response | `end` | end card amber line | README (rotation not implemented) |

## Limitations
- **Simulated, not measured against anything real.** The upstream is a fictional vendor on loopback. No real credential, provider, format, TLS or network is involved.
- **No real browser executes the bundles.** The bundles are static artefacts that are served and scanned; browser behaviour is implied from the code. The video's bundle view is an illustrative code panel.
- **Scan scope.** The scanner is heuristic and covers the files in the two bundle folders plus the `/config` payload. It found no source map because this build produced none. It does not scan server-rendered pages, logs, caches, third-party scripts, build caches or source-control history.
- **Repair scope.** The backend exposes one operation to one role. Production backends also need rate limiting, audit logging, and real authentication; the session mechanism here is a test harness.
- **Rotation is not implemented.** The fixture shows removal from the bundle; it states, but does not demonstrate, that a real leaked secret would additionally require revocation or rotation at the issuer.
- The flawed bundle must never be deployed; everything binds to 127.0.0.1 on ephemeral ports.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep13/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep13 → episodes/ep13/ep13.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 109.6 s, 9765509 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
