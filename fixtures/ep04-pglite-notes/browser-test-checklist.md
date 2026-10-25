# EP04 — browser test checklist (manual; NOT executed in the build environment)

The build environment for this fixture has Node 22 but no browser, so nothing below has been run.
Every step is a **Blocked** item until a person (or a real browser automation run) executes it and
records the result. Do not mark a step as passed from memory or from the Node tests.

Prerequisites

```
cd fixtures/ep04-pglite-notes
npm install --no-audit --no-fund      # pinned @electric-sql/pglite 0.5.11
node build-vendor.mjs                 # copies dist → app/vendor/pglite, writes app/precache-manifest.js
node serve.mjs 8787                   # http://127.0.0.1:8787/  (loopback = secure context)
```

Use a fixed port: IndexedDB storage and the service-worker registration are keyed by **origin**
(scheme + host + port). A different port is a different origin and will look like an empty profile.

Browser: a current Chromium-based browser or Firefox with IndexedDB and service workers enabled.
This fixture makes no claim of universal browser compatibility; record the exact browser and version.

## 1. Online load and database initialisation

1. Open `http://127.0.0.1:8787/` with DevTools → Network open.
2. Expect: every request is same-origin (`127.0.0.1:8787`); none to a CDN. Note the sizes of
   `pglite.wasm` (~10 MB), `pglite.data` (~6 MB), `initdb.wasm`.
3. Expect the status bar to show `engine: PostgreSQL … · ready in N ms` and `storage: idb://video-notes`.
   Record N (first open runs initdb and is the slow one).
4. Expect `service worker: activated · 19 assets cached` (count comes from `precache-manifest.js`).
   DevTools → Application → Cache Storage should list one cache named `ep04-notes-v0.5.11-<hash>`.
5. DevTools → Application → IndexedDB should show a database for the data dir (`/pglite/video-notes` or
   similar — record the exact name you see; PGlite names it, not this app).
6. Create a note: title `Groceries`, body `milk, eggs, coffee`. Wait for the log line `create → id 1`
   (the write is awaited before the log line prints). Type `coffee` in search → the note is listed.

Record: browser + version, ready time, cache name, IndexedDB name, PASS/FAIL.

## 2. Reload (same origin, same profile) — scene 4

1. Wait until the log shows the create completed (step 1.6), then press reload.
2. Expect: the note `Groceries` is listed again with the same `id 1`, `notes: 1`.

Record PASS/FAIL. If FAIL, the video must not show scene 4 as a pass.

## 3. Offline reload and edit — scenes 5 and 6

1. Confirm the service worker shows `activated` and the cache has all 19 entries **before** going offline
   (install uses `cache.addAll`, so a partial cache never activates — but check anyway).
2. DevTools → Network → throttling `Offline` (or disconnect the machine's network). Status shows `network: offline`.
3. Reload. Expect the page, `app.js`, the vendor ESM chunks and the WASM/data files to be served from the
   service worker (Network panel: "(ServiceWorker)" in the Size column), and the engine to start.
4. Expect the `Groceries` note to be present. Click `Edit`, change the body to `milk, eggs, coffee, bread`.
   Wait for `edit id 1 → ok`. Reload again while still offline → the edited body is shown.
5. If anything fails (blank page, 503 "offline and … not in the precache", engine fails to start),
   record the exact message. **Report the failure; do not simulate success.**

Record PASS/FAIL per sub-step.

## 4. Clean browser profile — scene 7

1. Open a fresh profile: Chromium → new Guest window or `--user-data-dir=<empty dir>`; Firefox →
   `about:profiles` → create and launch a new profile. (A normal private/incognito window is also a
   separate storage partition in most browsers, but record which you used.)
2. Go back online, open `http://127.0.0.1:8787/`.
3. Expect: `notes: 0`, "No notes yet in this browser profile." The `Groceries` note is **absent**,
   because IndexedDB is per profile and nothing synchronised it.

Record PASS/FAIL.

## 5. Clear site data in the original profile — scene 8

1. In the original profile, with the note present, open DevTools → Application → Storage → **Clear site data**
   (tick IndexedDB, Cache Storage and service workers), or use the browser's site-settings "Clear data".
2. Reload (online). Expect: the service worker re-installs and re-precaches; the engine runs initdb again
   (slow first open); `notes: 0`. The stored note is **gone** and there is no way to recover it from this app.

Record PASS/FAIL.

## Reporting

Paste the recorded results into `episodes/ep04/README.md` under Evidence, changing each item from
`Blocked` to `Observed` (with browser/version) or `Failed` (with the message). Scenes whose step failed
must be re-narrated to say so; the renderer must not show them as passing.
