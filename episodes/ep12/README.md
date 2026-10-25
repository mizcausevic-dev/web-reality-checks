# EP 12 — Your Website Updated. Why Am I Still Seeing the Old Version?

**Central idea.** An open page can stay controlled by an older service worker, served from that worker's own Cache Storage, while the updated worker sits installed and waiting; deployment and client activation are different events.

## What this fixture is
- `fixtures/ep12-sw-update/` — two same-origin builds (`build1/` blue "Build 1", `build2/` green "Build 2"), each with `index.html`, `app.js`, `styles.css` and a generated `sw.js` at the stable URL `/sw.js`; `sw.template.js` + `generate-sw.mjs` produce the two byte-different workers with versioned precache names `wrc-ep12-v1` / `wrc-ep12-v2`.
- Worker policy: `install` precaches into this build's cache and never calls `skipWaiting()`; `activate` deletes only caches that start with `wrc-ep12-` and are not the current one (runs only once the previous worker is redundant; other apps' caches untouched), then `clients.claim()` so a first-install page becomes controlled — `clients.claim()` is part of the deliberate activation strategy and is not what deletes caches; `message {type:'SKIP_WAITING'}` → `self.skipWaiting()`.
- Page policy: registers `/sw.js`; a button calls `registration.update()`; `registration.waiting` (or an installing worker reaching `installed`) while the page already has a controller → "Update available" with an Approve button; Approve posts `SKIP_WAITING`; `controllerchange` handler with a `refreshing` guard reloads exactly once. **Explicit approval is this app's policy, not a browser requirement.**
- `serve.mjs` binds 127.0.0.1, `--build 1|2` selects the folder served at `/`, `/sw.js` is sent with `Cache-Control: no-cache`, app assets with `no-store` so the HTTP cache stays out of the experiment. HTTP cache and service-worker Cache Storage are two different stores and the episode keeps them apart.
- `sw-lifecycle-sim.mjs` is a deterministic model of the registration state machine (installing / waiting / active / controller) that runs the real `sw.js` and the real `app.js` logic block in Node. It is how the decision logic and the single-reload guard are tested without a browser.
- `browser-test-checklist.md` holds the ten-step UPDATE FLOW for one controlled tab, the multi-tab implications and the unsaved-work risk.
- Persistent sim tag on every lifecycle scene: `SERVICE WORKER LIFECYCLE · ILLUSTRATIVE, NOT CAPTURED`.

## Evidence
- Executed: `node --test fixtures/ep12-sw-update/test.mjs` → `# tests 14  # pass 14  # fail 0` (byte-different `sw.js`; distinct precache names; activate cleanup keeps only the current `wrc-ep12-*` cache and spares foreign caches; a known-positive control showing an unversioned cache name leaves nothing to clean; `SKIP_WAITING` handled and other messages ignored; first install claims with no notice; byte-identical script → no update; Build 2 waits behind Build 1 with the page still controlled by Build 1 and both caches present; approval → activation → `wrc-ep12-v1` deleted → `controllerchange` → one reload; guard ignores a second event; server build switching and `no-cache` on `/sw.js`).
- Executed: `node fixtures/ep12-sw-update/demo.mjs` → `fixtures/ep12-sw-update/evidence.json`: model steps 1–2 (Build 1 active, controller, cache `wrc-ep12-v1`), 3–4 (server → Build 2, tab unchanged), 5–7 (Build 2 `installed`/waiting, notice `true`, caches `wrc-ep12-v1, wrc-ep12-v2`), 8–9 (`SKIP_WAITING` → Build 2 active, controller Build 2, caches `[wrc-ep12-v2]`, `reloads: 1`, second `controllerchange` `ignored`). Real loopback server: `/` → `Build 1` then `Build 2` after switching; `/sw.js` `Cache-Control: no-cache`, `const BUILD = 1;` vs `2`, 2502 bytes each, byte-different.
- Observed (in the Remotion scenes): all displayed values are constants copied from `evidence.json` into `EV` at the top of `Scenes.tsx`.
- **Blocked: the real browser service-worker lifecycle was not executed** (no browser in the build environment). `install`/`activate`/`controllerchange` events, the actual reload and DevTools states are depicted from the Node model and labelled illustrative. Manual verification: `cd fixtures/ep12-sw-update && node generate-sw.mjs && node serve.mjs --build 1`, then follow `browser-test-checklist.md` steps 1–10 (open tab → confirm controller → keep open → `curl /__set-build/2` → click Check for update → observe waiting worker and both caches → "Update available" → Approve → one reload → Build 2, only `wrc-ep12-v2` left).

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep12      # needs video/public/ep12/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep12 --concurrency 2
```

## Limitations
- **One cause, not every cause.** A page can also be stale because of HTTP caching (`Cache-Control`, ETags), CDN or proxy caches, DNS, or a deployment that never actually published. None of those is a service-worker problem and the episode says so.
- HTTP cache ≠ Cache Storage. The fixture disables the HTTP cache for app assets so the only cache under study is the worker's.
- Explicit approval before `skipWaiting()` is this app's update policy. Browsers permit a worker to call `skipWaiting()` during install and take over at once; many apps do.
- An update belongs to the registration and can affect every open tab: approval in one tab activates the worker for all controlled tabs and, with this handler, reloads all of them. The main demonstration uses one controlled tab; multi-tab behaviour and unsaved-work risk are documented in the checklist, not executed.
- Old assets are deleted only during the new worker's `activate`, by prefix, after the previous worker is redundant. `clients.claim()` is not the mechanism that deletes caches.
- No lifecycle event was faked as a browser capture and no `controllerchange` reload loop is possible: one guard per document, one reload.
- The model omits `updateViaCache`, imported scripts, scope rules, the browser's 24-hour byte-check and navigation-triggered update checks, and multiple registrations. The fetch handler is a minimal cache-first strategy for demonstration, not a production caching policy.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep12/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep12 → episodes/ep12/ep12.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 100.4 s, 8671291 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
