SEO title (≤60 chars): Postgres in the Browser: What PGlite Persistence Means
Meta description (≤155 chars): A notes app on PGlite 0.5.11 with an IndexedDB data dir and a precaching service worker. What the Node tests prove, what needs a browser, and the limits.
Slug: pglite-notes
Primary keyword: PGlite IndexedDB persistence   Secondary keywords (3–5): Postgres in the browser, WebAssembly database, service worker precache, offline web app storage, browser storage limits
Medium tags (5): Web Development, PostgreSQL, WebAssembly, JavaScript, Offline First

# I Put a Database Inside a Website

![A browser boundary containing the notes app, the PGlite engine and IndexedDB storage, with no line leaving the box toward any server](../hero.png)

A real Postgres engine can run inside a web page, answer SQL, and keep your data across a reload with no server anywhere. The failure is what people then assume: that "it persisted" means "it is saved," when it means one origin, one browser profile, one device, until the browser decides otherwise.

Episode four of Web Reality Checks is a notes app on PGlite, Postgres compiled to WebAssembly. The Node side was executed and measured. The browser side (IndexedDB, service worker, offline reload, clean profile, clear site data) was not executed in the build environment and is shown as a manual checklist, not as a result.

## What actually happens

PGlite is the Postgres server compiled to WASM, so it runs in whatever JavaScript runtime loads it: a browser tab or a Node process. It still needs a filesystem for its data directory, because Postgres writes heap files, WAL and catalogs to disk. PGlite supplies that filesystem as a virtual layer and the caller picks which one with a single string. In the installed version, 0.5.11, a plain path means real files under Node (NodeFS), `memory://` means an in-memory filesystem, and `idb://name` means a filesystem backed by IndexedDB in the browser.

That string is the whole story. The engine's working memory inside the WASM instance is one place. The data directory is another. With `memory://`, both vanish when the instance closes. With a filesystem or IndexedDB directory, PGlite writes the data directory through after each query, so a close and reopen on the same directory finds the rows. Persistence comes entirely from the backing store you handed it.

In the browser, that store is IndexedDB, partitioned by origin (scheme, host and port) and by browser profile. Nothing copies it to another device, another profile, or the same app on a different port. And the browser owns it: clearing site data, a privacy setting, or quota pressure can remove it.

Offline is a separate mechanism. The engine is about 16 MB of assets (local synthetic fixture, vendored file sizes, uncompressed). If any of those files comes from the network on load, there is no database when the network is gone. A service worker that precaches the shell and every engine file from the same origin makes a second load possible offline. The two mechanisms share nothing except that both live in the origin's site data and are removed together by "Clear site data."

## The fixture

`fixtures/ep04-pglite-notes/` is a notes app (`create / search / edit / delete` over a `notes` table) on `@electric-sql/pglite` 0.5.11, pinned with a committed lockfile. One module, `notes-db.mjs`, is shared by the Node tests and the browser app. It takes the data-directory string verbatim and refuses the one option this episode leaves off:

```js
constructor(dataDir, {PGlite, options = {}} = {}) {
  if (typeof dataDir !== 'string' || !dataDir) throw new Error('NotesDb requires a data dir string');
  if (!PGlite) throw new Error('NotesDb requires the PGlite class via deps.PGlite');
  if (options.relaxedDurability) throw new Error('relaxedDurability is deliberately not enabled in this fixture');
  this.dataDir = dataDir;
  this.kind = dataDir.startsWith('idb://') ? 'indexeddb' : dataDir.startsWith('memory://') ? 'memory' : 'filesystem';
  this.persistent = this.kind !== 'memory';
  this.pg = new PGlite(dataDir, options);
  this.ready = this.pg.waitReady.then(() => this.pg.exec(SCHEMA)).then(() => this);
}
```

The browser app imports PGlite from a local copy of the package's `dist/` files, never a CDN, opens an IndexedDB-backed directory, and awaits every write before reporting it:

```js
import {PGlite} from './vendor/pglite/index.js';
import {NotesDb} from './notes-db.mjs';

const DATA_DIR = 'idb://video-notes';
// ...
db = await new NotesDb(DATA_DIR, {PGlite}).ready; // relaxedDurability deliberately left at its default (false)
// ...
const n = await db.create(title, body); // awaited: the write has completed before we report it
log(`create → id ${n.id}`);
```

The service worker precaches the shell plus all engine assets under a versioned cache name from `build-vendor.mjs`, serves same-origin GETs cache-first, deletes older caches on activate, and returns a plain 503 text when offline and uncached:

```js
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll fails the install if ANY asset fails, so a half-cached shell never activates.
    await cache.addAll(ASSETS.map((a) => new Request(a, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});
```

`cache.addAll` is all-or-nothing: a shell that cached the page but not `pglite.wasm` would load offline and then fail to start the engine. `serve.mjs` binds `127.0.0.1` only; `http://127.0.0.1` is a secure context, so service workers and IndexedDB work without HTTPS.

## The test that proves it

`node --test test.mjs` runs PGlite against filesystem temp directories, the Node analogue of the browser's `idb://` directory, plus `memory://` as a known-positive control. It reports `# tests 6  # pass 6  # fail 0` (local synthetic fixture):

- `create, search, edit, delete over a filesystem data dir`
- `persistence: close, reopen the SAME data dir, the note is still there`
- `isolation: a DIFFERENT data dir does not see the note`
- `KNOWN-POSITIVE CONTROL: memory:// loses the note after close`
- `relaxedDurability is refused by the fixture (deliberately not enabled)`
- `constructor requires a data dir string and the PGlite class`

The control gives the others meaning. It creates a note on `memory://`, closes, reopens, and asserts the count is 0. The assertion message in the source says why: "in-memory data must not survive close; if it did, the persistence claim would be meaningless."

`demo.mjs` runs the scripted scenario and writes `evidence.json`. From that file (local synthetic fixture): engine `PostgreSQL 18.6 (PGlite 0.5.11)`, fs type `filesystem`; create returns `{id: 1, title: "Groceries", body: "milk, eggs, coffee"}`; search `coffee` returns 1 match; `relaxedDurability: false`. The suite takes about a minute in that sandbox because each fresh directory runs Postgres `initdb`; per-step timings are sandbox numbers and are not quoted as representative.

## The repair

There is no bug to patch. The repair is the set of decisions that stop a persistence demo from lying, each visible in the fixture.

Pick a persistent data directory and say which one. `memory://` is the control, not the product. The browser gets `idb://video-notes`; Node tests get a real path. The `kind` and `persistent` fields on `NotesDb` make the choice inspectable, and the status bar prints both.

Await every write before reporting it. The checklist's reload step waits for the `create → id 1` log line because it prints only after the `INSERT ... RETURNING` has resolved. Reloading earlier tests your reflexes, not the storage.

Leave `relaxedDurability` off. The option exists in the 0.5.11 type definitions; the fixture refuses it so nobody can switch it on while filming a durability claim. Its effect was not measured.

Serve everything from one origin and precache all of it under a versioned name. Nineteen assets are listed in `precache-manifest.js` (local synthetic fixture): the shell, `index.js`, seven chunks, `fs/*.js`, `pglite.wasm` (~10 MB), `pglite.data` (~6 MB) and `initdb.wasm`. Older `ep04-notes-*` caches are deleted on activate.

State the boundary in the interface. The empty state in `app.js` reads "No notes yet in this browser profile."

## Retest

Executed under Node (local synthetic fixture, from `evidence.json`):

- Same data directory, close and reopen: count 1, the `Groceries` note with id 1, then an edit to `milk, eggs, coffee, bread` succeeds.
- Different data directory: count 0. Nothing synchronized the two; nothing exists to.
- `memory://` after close: count 0.
- Data directory deleted, reopen: count 0, and `initdb` runs again.

Not executed, and described here as the manual checklist in `browser-test-checklist.md`, not as verified behavior:

1. Online load at `http://127.0.0.1:8787/` with DevTools open. Expect every request same-origin, `storage: idb://video-notes` in the status bar, the service worker at `activated · 19 assets cached`, and an IndexedDB database present. Record browser and version, cache name and IndexedDB name.
2. Create `Groceries`, wait for `create → id 1`, reload. Expect the note present with id 1.
3. Confirm Cache Storage holds all 19 entries, then set DevTools Network to Offline. Reload. Edit the body to `milk, eggs, coffee, bread`, wait for `edit id 1 → ok`, reload offline again. Expect the edit present.
4. Open a fresh browser profile at the same address. Expect `notes: 0`.
5. In the original profile, Clear site data (IndexedDB, Cache Storage, service workers). Reload. Expect `initdb` to run again and `notes: 0`.

If any step fails, record the exact message and re-narrate the scene as a failure. Those scenes carry the on-screen tag `BROWSER STEPS NOT EXECUTED HERE · ILLUSTRATIVE` until Blocked becomes Observed in the episode README.

## What this does not prove

- Persistence is per origin and per browser profile. Not shared across devices, profiles or ports; nothing in this app synchronizes anything.
- Browser storage can be cleared by the user, by quota pressure or by privacy settings. No permanence is promised; `navigator.storage.persist()` is not requested.
- `relaxedDurability` was left off and its effect was not measured.
- No universal browser-compatibility claim. The target is a current Chromium-based browser or Firefox; the checklist asks the tester to record which.
- Everything browser-side was not executed. Filesystem temp directories under Node stand in for per-profile storage in the measured scenes.
- The `~16 MB` / `~17 MB` engine-size figures are vendored file sizes, not download sizes.
- Not tested: multi-tab concurrency (PGlite is single-connection), quota and eviction, export or backup (`dumpDataDir`), any server sync (none exists).

## Launch checklist

1. The data-directory string is explicit and logged; `memory://` appears only in tests as a control.
2. A known-positive control proves the in-memory variant loses data, so the persistence test cannot pass by accident.
3. Every write is awaited before the UI reports success; no reload test runs before the write resolves.
4. Relaxed-durability options are off and the code refuses them, unless you have measured and documented the trade.
5. All engine assets come from your own origin and sit in a versioned precache; no CDN dependency outside the cache.
6. The service worker install is all-or-nothing (`cache.addAll`), and offline misses return an explicit error, not a blank page.
7. The interface tells users their data is local to this browser profile.
8. The browser checklist has been executed in a named browser and version, each step recorded as Observed or Failed, before any persistence claim ships.

## FAQ

**Does PGlite persist data in the browser?**
Yes, when opened with an `idb://` data directory, which stores the Postgres data directory in IndexedDB. With `memory://` nothing survives a close. In this fixture the IndexedDB path is documented against PGlite 0.5.11 but was not executed; the Node filesystem path and `memory://` were (local synthetic fixture).

**Is IndexedDB storage permanent?**
No. It belongs to one origin and one browser profile, and the browser may remove it when the user clears site data, under quota pressure or by privacy settings. Treat it as local state, not as a backup.

**How do you make a WebAssembly database work offline?**
Serve every engine file from your own origin, list all of them in a service worker precache under a versioned cache name, use `cache.addAll` so a partial cache never activates, and finish the first online load before going offline. The database itself lives in IndexedDB, separate from the cache.

## Watch the episode

[YouTube link]

- 00:00 Create a note, search it with SQL
- 00:08 The engine: Postgres compiled to WebAssembly
- 00:20 Working memory vs the data directory
- 00:32 Browser reload (not executed here)
- 00:47 Service worker precache (not executed here)
- 01:02 Offline reload and edit (not executed here)
- 01:11 Clean profile: no notes (Node analogue executed)
- 01:20 Clear site data: note gone (Node analogue executed)
- 01:30 One origin, one profile, one device

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [It Works Locally. Why Is Production Broken?](../../ep07/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Postgres in the page is real, and the data directory you hand it decides everything. Local persistence is not cloud sync, and it is not a backup: one origin, one profile, one device, until the browser decides otherwise.

Miz Causevic, Kinetic Gain LLC
