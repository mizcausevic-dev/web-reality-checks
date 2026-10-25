// sw.js — service worker for the EP04 notes app.
//
// Strategy: PRECACHE the whole application shell plus every PGlite vendor asset (ESM chunks,
// fs shims, pglite.wasm, pglite.data, initdb.wasm) at install, then serve same-origin GET
// requests CACHE-FIRST, falling back to the network only for anything not in the cache.
// The cache name is versioned by build-vendor.mjs (hash of the shell + vendor files); on
// activate, caches from older versions are deleted.
//
// The database itself is NOT in this cache: PGlite writes to IndexedDB (idb://video-notes),
// which is separate browser storage. The service worker only keeps the code and engine
// binaries available offline. Both live in the same origin's site data and are removed
// together by "Clear site data".
//
// BROWSER-ONLY: not executed in the Node build environment. See ../browser-test-checklist.md.
importScripts('./precache-manifest.js');

const VERSION = self.__PRECACHE_VERSION;
const CACHE = VERSION; // e.g. ep04-notes-v0.5.11-<hash>
const ASSETS = self.__PRECACHE_ASSETS;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll fails the install if ANY asset fails, so a half-cached shell never activates.
    await cache.addAll(ASSETS.map((a) => new Request(a, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('ep04-notes-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({includeUncontrolled: true});
    for (const c of clients) c.postMessage({type: 'precached', version: VERSION, count: ASSETS.length});
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never proxy cross-origin (there should be none)
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      // offline and not precached: report honestly instead of a broken blank page
      return new Response(`offline and "${url.pathname}" is not in the precache (${VERSION})`, {status: 503, headers: {'content-type': 'text/plain'}});
    }
  })());
});
