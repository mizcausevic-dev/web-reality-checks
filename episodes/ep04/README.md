# EP 04 — I Put a Database Inside a Website

**Central idea.** A real Postgres engine (PGlite, WASM) can run inside the page with browser-local persistence and a separately built offline shell — but that persistence belongs to one origin, one browser profile, one device, and the browser may remove it.

## What this fixture is
- `fixtures/ep04-pglite-notes/` — a notes app (`create / search / edit / delete` over a `notes` table) on `@electric-sql/pglite` **0.5.11**, pinned in `package.json` with a committed `package-lock.json`. `notes-db.mjs` takes the data-directory string verbatim: the browser passes `idb://video-notes` (IndexedDB), the Node tests pass a filesystem temp dir, and the known-positive control passes `memory://`.
- Browser app in `app/`: `index.html`, `app.js`, `sw.js`. PGlite is imported from a **local copy** of the package's `dist/` files (`app/vendor/pglite/`, produced by `build-vendor.mjs`) — never a CDN. The service worker precaches the shell plus all engine assets (`index.js`, 7 chunks, `fs/*.js`, `pglite.wasm` ~10 MB, `pglite.data` ~6 MB, `initdb.wasm`) under a **versioned cache name** (`ep04-notes-v0.5.11-<hash>`), cache-first for same-origin GETs, older caches deleted on activate, honest 503 text when offline and uncached.
- `serve.mjs` binds `127.0.0.1` only; `http://127.0.0.1` is a secure context, so no HTTPS is needed for service workers or IndexedDB.
- Deliberate policies: `relaxedDurability` is **not enabled** (default off; `NotesDb` throws if passed); every write is awaited before the UI reports it; no remote sync of any kind exists; synthetic data only (one note, "Groceries").
- API verified against the installed package (`node_modules/@electric-sql/pglite/README.md` and `dist/pglite-*.d.ts`): `new PGlite(dataDir)` with `idb://` / `memory://` / path, `waitReady`, `query`, `exec`, `close`. Path and `memory://` were executed; `idb://` is documented but **not executed** (needs a browser).

## Evidence
- Executed: `cd fixtures/ep04-pglite-notes && node --test test.mjs` → `# tests 6  # pass 6  # fail 0` (create/search/edit/delete on a filesystem dir; close + reopen same dir keeps the note; a different dir sees 0; **known-positive**: `memory://` loses the note after close; `relaxedDurability` refused; constructor guards). Run time ≈ 57 s here because each fresh data dir runs Postgres `initdb`.
- Executed: `node fixtures/ep04-pglite-notes/demo.mjs` → `evidence.json`: engine `PostgreSQL 18.6 (PGlite 0.5.11)`, fs type `filesystem`; create → `{id 1, "Groceries", "milk, eggs, coffee"}`; search `coffee` → **1** match; close + reopen same dir → count **1** (then edit body → `milk, eggs, coffee, bread`); different dir → **0**; `memory://` create, close, reopen → **0**; delete data dir, reopen → **0**; `relaxedDurability: false`.
- Executed: `node build-vendor.mjs` → 14 files, 17.4 MB copied to `app/vendor/pglite/`; `precache-manifest.js` lists 19 assets; `serve.mjs` smoke-tested with curl (200 + correct MIME for `.html/.js/.mjs/.wasm`, 404 for path traversal). `app.js` and `sw.js` pass `node --check` only — they were **not run in a browser**.
- Scenes 1–3 (`create`, `engine`, `memory_vs_disk`) carry sim tag `LOCAL FIXTURE · NODE + PGLITE` and show only numbers from `evidence.json`.
- **Blocked** (no browser in this environment; scenes 4–8 carry sim tag `BROWSER STEPS NOT EXECUTED HERE · ILLUSTRATIVE` and show expected behaviour, not results). Exact manual steps are in `fixtures/ep04-pglite-notes/browser-test-checklist.md`:
  - Blocked — scene 4 `reload`: online load at `http://127.0.0.1:8787/`, confirm all requests same-origin, engine ready, SW `activated · 19 assets cached`, IndexedDB database present; create "Groceries"; wait for `create → id 1`; reload → note present with id 1. (checklist §1–2)
  - Blocked — scene 5 `offline`: confirm Cache Storage holds all 19 entries, then DevTools Network → Offline. (checklist §3.1–3.2)
  - Blocked — scene 6 `offline_edit`: reload offline → page + engine served from the service worker; edit body to `milk, eggs, coffee, bread`; wait for `edit id 1 → ok`; reload offline again → edit present. If anything fails, record the message and re-narrate the scene as a failure. (checklist §3.3–3.5)
  - Blocked — scene 7 `clean_profile`: open a fresh profile (Chromium `--user-data-dir=<empty>` / Firefox `about:profiles`) at the same address → `notes: 0`. (checklist §4)
  - Blocked — scene 8 `clear_data`: DevTools → Application → Clear site data (IndexedDB, Cache Storage, service workers) in the original profile; reload → SW re-installs, initdb re-runs, `notes: 0`. (checklist §5)
  - Node analogues for scenes 7 and 8 **were** executed (different dir → 0; deleted dir → 0) and are labelled as such on screen.

## Build and render
```
cd fixtures/ep04-pglite-notes && npm install --no-audit --no-fund && node --test test.mjs && node demo.mjs && node build-vendor.mjs
cd video && npm install
node tools/build-timeline.mjs ep04    # from narration audio in video/public/ep04/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep04 --concurrency 2
```
Browser verification (separate, manual): `node fixtures/ep04-pglite-notes/serve.mjs 8787` then follow `browser-test-checklist.md`.

## Limitations
- Persistence is **per origin and per browser profile**. It is not shared across devices, profiles or even ports; nothing in this app synchronises anything. The narration and end card say so.
- Browser storage can be cleared by the user, by quota pressure or by privacy settings. No permanence is promised; `navigator.storage.persist()` is not requested.
- `relaxedDurability` was deliberately left off and its effect was not measured.
- No universal browser-compatibility claim: the checklist asks the tester to record browser and version; a current Chromium-based browser or Firefox is the target.
- Everything browser-side (IndexedDB, service worker install, offline reload, clean profile, clear site data) was **not executed** here. Filesystem temp directories under Node stand in for per-profile storage in the measured scenes; the on-screen tag and README label this. If the offline reload fails in a real browser, that failure must be reported, not simulated.
- Timings (`openMs`) in `evidence.json` are from this sandbox (initdb ≈ 15–26 s) and are not quoted in the video.
- The `~16 MB` / `~17 MB` engine-size figures are the vendored file sizes measured by `build-vendor.mjs` (uncompressed), not download sizes over the wire.
- Not tested: multi-tab concurrency (PGlite is single-connection), quota/eviction, export/backup (`dumpDataDir`), any server sync (none exists).

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep04/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep04 → episodes/ep04/ep04.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 101.83 s, 8847885 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
