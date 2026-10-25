# ep12-sw-update — two builds, one service-worker URL, explicit update approval

**SERVICE WORKER LIFECYCLE · ILLUSTRATIVE, NOT CAPTURED.** Plain Node 22 ESM, zero dependencies. The app, the worker and the loopback server are real and runnable in a browser; the lifecycle **model** (`sw-lifecycle-sim.mjs`) is what the automated tests and `demo.mjs` drive, because no browser was available where this fixture was built. No lifecycle event in `evidence.json` was captured from a browser.

## What it is

- `build1/` — blue page labelled **Build 1**; `build2/` — green page labelled **Build 2**. Each has `index.html`, `app.js` (identical except `BUILD`), `styles.css` and a generated `sw.js`.
- `sw.template.js` → `generate-sw.mjs` → `build1/sw.js`, `build2/sw.js`. Same URL `/sw.js`, different bytes. Versioned precache name `CACHE = 'wrc-ep12-v1'` / `'wrc-ep12-v2'`.
  - `install`: precache `/`, `/index.html`, `/app.js`, `/styles.css` into **this build's** cache. No `skipWaiting()` here, by policy.
  - `activate`: delete only caches whose name starts with `wrc-ep12-` and is not the current one (safe strategy: runs only once the previous worker is redundant, never touches other apps' caches), then `clients.claim()` so a first-install page becomes controlled without a reload. `clients.claim()` is part of the activation strategy; it is **not** what deletes caches.
  - `message`: `{type:'SKIP_WAITING'}` → `self.skipWaiting()`. Nothing else triggers it.
  - `fetch`: cache-first from this build's cache for same-origin GETs; `/sw.js` is never served from Cache Storage.
- `app.js` — registers `/sw.js`; **Check for update** button calls `registration.update()`; `updatefound`/`statechange` listeners; shows **Update available** when `registration.waiting` exists (or an installing worker reaches `installed`) *and* the page already has a controller; **Approve** posts `SKIP_WAITING` to the waiting worker; a `controllerchange` handler with a `refreshing` guard reloads **exactly once**. The pure decision logic sits between `@@logic-start`/`@@logic-end` markers so the Node tests exercise the shipped code, not a copy.
- `serve.mjs` — binds `127.0.0.1`, ephemeral port. `--build 1|2` selects which folder is served at `/`. `/sw.js` → `Cache-Control: no-cache`; app assets → `no-store` (keeps the HTTP cache out of the experiment). `/__build` reports the served build; `/__set-build/N` swaps it without a restart (test/demo convenience).
- `sw-lifecycle-sim.mjs` — deterministic model of the registration state machine (`installing → installed/waiting → activating → activated`, controller, `controllerchange`) with a fake `CacheStorage`. It runs the real `sw.js` source in a `vm` sandbox and extracts the real `app.js` logic block.
- `browser-test-checklist.md` — the manual UPDATE FLOW steps 1–10 for one controlled tab, plus multi-tab implications and unsaved-work risk.

## How to run

```
node --test test.mjs          # also regenerates build*/sw.js
node demo.mjs                 # writes evidence.json
node generate-sw.mjs && node serve.mjs --build 1    # then follow browser-test-checklist.md
```

## Executed

```
# tests 14
# suites 0
# pass 14
# fail 0
```

`node demo.mjs` (model steps, also in `evidence.json`):

| step | active | waiting | controller | caches | notice | page shows |
|---|---|---|---|---|---|---|
| 1–2 Build 1 installed, active, controlling | build1 | — | build1 | wrc-ep12-v1 | no | Build 1 |
| 3–4 deploy: server → Build 2; tab untouched | build1 | — | build1 | wrc-ep12-v1 | no | Build 1 |
| 5–6 `registration.update()` | build1 | **build2 (installed)** | build1 | wrc-ep12-v1, wrc-ep12-v2 | **yes** | Build 1 |
| 7 "Update available" | build1 | build2 | build1 | both | yes | Build 1 |
| 8–9 approve → SKIP_WAITING → activate → controllerchange | **build2** | — | **build2** | wrc-ep12-v2 | no | Build 2 after one reload |

Executed against the real loopback server: `/` → `<h1>Build 1</h1>` then `<h1>Build 2</h1>` after `/__set-build/2`; `/sw.js` → `Cache-Control: no-cache`, `const BUILD = 1;` vs `const BUILD = 2;` (byte-different, 2487 bytes each). `reloads=1`; a second `controllerchange` is `ignored` by the guard.

## Tests (test.mjs)

1. `sw.js` byte-different between builds at the same URL. 2. Precache names `wrc-ep12-v1` ≠ `wrc-ep12-v2`. 3. `app.js` differs only in `BUILD`; pages labelled Build 1/2, blue/green. 4. Worker never calls `skipWaiting()` during install. 5. Activate deletes only `wrc-ep12-*` caches other than the current one; `other-app-v9` survives; `clients.claim()` called. 6. **Known-positive control**: an unversioned cache name gives one shared cache with nothing to clean up. 7. `SKIP_WAITING` handled; other messages ignored. 8. First install activates and claims; no notice. 9. Byte-identical script → no new worker. 10. Build 2 waits behind Build 1; page still controlled by Build 1; both caches coexist; notice shown. 11. `updateAvailable` edge cases. 12. Approval → activation → v1 deleted → `controllerchange` → one reload. 13. Guard reloads once when the event fires twice. 14. `serve.mjs` build switching, `no-cache` on `/sw.js`, path traversal 404.

## Deliberate policies

- Explicit user approval before `skipWaiting()` is **this app's** update policy. Browsers do not require it; a worker may call `skipWaiting()` during install and take over immediately.
- `clients.claim()` on activation is used so the first-ever load becomes controlled. It is documented as part of the activation strategy, not as cache deletion.
- Old caches are deleted in `activate` of the *new* worker, after the old worker is redundant, filtered by this app's prefix.
- HTTP cache for app assets is disabled by the server (`no-store`) so that the only cache under study is service-worker Cache Storage. These are two different stores.

## Limitations / not tested

- **The browser lifecycle was not executed here.** Real `install`/`activate`/`controllerchange` timing, the browser's update-check heuristics, DevTools states, and the actual reload are covered only by `browser-test-checklist.md`. The model intentionally omits: `updateViaCache`, imported scripts, scope rules, the 24-hour byte-check, navigation-triggered checks, and multiple registrations.
- One controlled tab. Multi-tab behaviour (approval in one tab reloads all controlled tabs) is documented, not executed.
- This is **one** cause of stale content. HTTP caching, CDN/proxy caching, DNS, and deployments that never published are different causes with different diagnoses.
- The fetch handler is a minimal cache-first strategy for demonstration; it is not a production caching policy.
- Loopback only; synthetic content only.
