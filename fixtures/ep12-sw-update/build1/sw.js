/* WRC EP12 service worker — GENERATED for Build 1. Do not edit; edit sw.template.js.
 * generate-sw.mjs substitutes the build number and writes build1/sw.js and build2/sw.js.
 * The script URL is stable (/sw.js); only its bytes change between builds.
 * Byte-different script ⇒ the browser installs a NEW worker, which WAITS while an
 * older worker still controls open pages.
 */
'use strict';

const BUILD = 1;
const PREFIX = 'wrc-ep12-';           // this app's cache namespace
const CACHE = PREFIX + 'v' + BUILD;   // versioned precache name: wrc-ep12-v1 / wrc-ep12-v2
const PRECACHE = ['/', '/index.html', '/app.js', '/styles.css'];

// install: precache this build's assets into ITS OWN versioned cache.
// Deliberately NO skipWaiting() here — a new worker must wait for explicit approval.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// activate: deliberate activation strategy.
//  1. Delete only caches that belong to this app (prefix) and are not the current one.
//     This runs only when this worker is activating, i.e. the previous worker is already
//     redundant, so no page is still being served from the cache being removed.
//     Caches of other apps on the origin (no prefix) are never touched.
//  2. clients.claim(): take control of open same-scope pages that are not yet controlled
//     (first install). clients.claim() does NOT delete caches; step 1 does.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const stale = names.filter((n) => n.startsWith(PREFIX) && n !== CACHE);
    await Promise.all(stale.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// message: the page's explicit approval. Only then does the waiting worker skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// fetch: cache-first from THIS build's cache for same-origin GETs; network otherwise.
// Never serve /sw.js itself from Cache Storage.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/__')) return;
  event.respondWith(caches.open(CACHE).then((cache) => cache.match(event.request)).then((hit) => hit || fetch(event.request)));
});
