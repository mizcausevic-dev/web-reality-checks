# EP04 fixture — notes app on PGlite (Postgres in WASM)

A small notes application whose database is PGlite, a Postgres build compiled to WebAssembly, pinned to
`@electric-sql/pglite` **0.5.11** (the installed version; `node_modules/@electric-sql/pglite/README.md`
and `dist/pglite-*.d.ts` are the API references used here).

Two ways to run the same `notes-db.mjs`:

| Runtime | data dir string | filesystem | persistent? | exercised here? |
|---|---|---|---|---|
| Node 22 | `/tmp/.../profile-a` | NodeFS (real files) | yes | **yes** — `test.mjs`, `demo.mjs` |
| Node 22 | `memory://` | in-memory | **no** | **yes** — known-positive control |
| Browser | `idb://video-notes` | IndexedDB-backed (IDBFS) | yes, per origin + profile | **no** — needs a browser, see `browser-test-checklist.md` |

## Files

- `notes-db.mjs` — `NotesDb(dataDir, {PGlite})` with `create / search / edit / remove / list / get / count / close`
  over a `notes` table. Takes the data-dir string verbatim so the browser passes `idb://video-notes` and Node
  passes a filesystem path or `memory://`. `relaxedDurability` is refused if anyone tries to pass it.
- `test.mjs` — Node regression tests (below).
- `demo.mjs` → `evidence.json` — the scenario the Node-executed video scenes show, with real outputs.
- `app/` — browser app: `index.html`, `app.js`, `sw.js`, `notes-db.mjs` (copy), `precache-manifest.js` (generated),
  `vendor/pglite/` (generated: the package's `dist/index.js`, chunks, `fs/*.js`, `pglite.wasm`, `pglite.data`, `initdb.wasm`).
  PGlite is imported **from the local vendor copy, never a CDN**.
- `build-vendor.mjs` — copies `node_modules/@electric-sql/pglite/dist/*` → `app/vendor/pglite/` and writes the precache
  manifest with a **versioned cache name** (`ep04-notes-v0.5.11-<sha256 prefix of shell + vendor>`).
- `serve.mjs` — loopback-only static server (`127.0.0.1`, ephemeral or given port). `http://127.0.0.1` is a secure
  context, so service workers and IndexedDB work without HTTPS.
- `browser-test-checklist.md` — the manual steps for online load, reload, offline reload + edit, clean profile,
  clear site data. **None executed here.**

## Run

```
npm install --no-audit --no-fund       # installs the pinned 0.5.11; package-lock.json is committed
node --test test.mjs                   # ~1 min: each fresh data dir runs Postgres initdb (~15–25 s in this sandbox)
node demo.mjs                          # writes evidence.json
node build-vendor.mjs                  # → app/vendor/pglite + app/precache-manifest.js (17.4 MB copied)
node serve.mjs 8787                    # → http://127.0.0.1:8787/  then follow browser-test-checklist.md
```

## Executed (this environment: Node v22.23.4, Linux, no browser)

```
$ node --test test.mjs
ok 1 - create, search, edit, delete over a filesystem data dir
ok 2 - persistence: close, reopen the SAME data dir, the note is still there
ok 3 - isolation: a DIFFERENT data dir does not see the note
ok 4 - KNOWN-POSITIVE CONTROL: memory:// loses the note after close
ok 5 - relaxedDurability is refused by the fixture (deliberately not enabled)
ok 6 - constructor requires a data dir string and the PGlite class
# tests 6
# pass 6
# fail 0
```

```
$ node demo.mjs   (summary written to evidence.json)
engine: PostgreSQL 18.6 (PGlite 0.5.11), fsType filesystem, relaxedDurability false
create note            → {id: 1, title: "Groceries", body: "milk, eggs, coffee"}
search 'coffee'        → 1 match
close, reopen same dir → count 1 (then edit body → "milk, eggs, coffee, bread")
open different dir     → count 0
memory:// create, close, reopen → count 0
delete data dir, reopen → count 0
```

Timings in `evidence.json` (`openMs`) are from this sandbox and are not representative; the video does not quote them.

## Deliberate policies

- **No relaxed durability.** PGlite's `relaxedDurability` option exists; this fixture leaves it at its default (off)
  and `NotesDb` throws if it is passed. Each write is awaited before the app reports it.
- **No CDN.** Everything the engine needs is served from the app's own origin and listed in the precache.
- **Cache-first with a versioned precache.** `sw.js` uses `cache.addAll` at install (all-or-nothing), serves same-origin
  GETs from the cache, deletes older `ep04-notes-*` caches on activate, and returns a plain 503 text instead of a blank
  page when offline and uncached.
- **Loopback only.** `serve.mjs` binds `127.0.0.1`.
- **Synthetic data only.** One note, "Groceries".

## Verified against the installed package (0.5.11)

- `new PGlite(dataDir?, options?)` with `idb://` (IndexedDB, browser), `memory://` (in-memory), plain path (NodeFS) — type docs
  in `dist/pglite-C1eAkqkG.d.ts` and README "Browser" / "Node" sections. Verified by running the path and `memory://`
  cases under Node.
- `waitReady`, `query(sql, params)`, `exec(sql)`, `close()`, `closed` — executed.
- `PGliteOptions.relaxedDurability?: boolean` — present in the type definitions; **not enabled**, behaviour not measured.
- The browser ESM entry resolves `pglite.wasm`, `pglite.data`, `initdb.wasm` via `new URL(…, import.meta.url)` and dynamically
  imports `./fs/nodefs.js` / `./fs/opfs-ahp.js` — read from `dist/index.js`, which is why those files are vendored.

## Not verified / Blocked

- `idb://video-notes` in a real browser: persistence across reload, clean-profile isolation, clear-site-data removal.
- Service-worker precache and offline reload + edit.
- The exact IndexedDB database name the browser shows (from the type definitions it should be `/pglite/video-notes`;
  record what you see).
- Browser compatibility beyond "a current Chromium-based browser or Firefox": no universal claim is made.
- Whether `cache.addAll` of ~17 MB completes on slow connections before a tester goes offline — the checklist says to
  confirm the cache is complete first.

## What is NOT tested

- Concurrency (PGlite is single-connection), multi-tab use, quota / eviction behaviour, storage persistence permission
  (`navigator.storage.persist()`), backup/export (`dumpDataDir`), sync to any server (there is none).
