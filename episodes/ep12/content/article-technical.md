SEO title (≤60 chars): Service Worker Stuck Waiting: Why Users See the Old Build
Meta description (≤155 chars): You deployed, the server sends the new build, and the open tab shows the old one. The waiting service worker, the fixture, 14 tests, the one-reload fix.
Slug: sw-update
Primary keyword: service worker update   Secondary keywords (3–5): skipWaiting, controllerchange reload, registration.waiting, Cache Storage vs HTTP cache, stale content after deploy
Medium tags (5): Service Workers, JavaScript, Web Development, Progressive Web Apps, Frontend

# Your Website Updated. Why Am I Still Seeing the Old Version?

![The deployment is complete and the server sends Build 2 in green, but the open browser tab still shows Build 1 in blue, controlled by the old service worker](../hero.png)

The deployment finished and the server now sends Build 2. The tab that was already open still shows Build 1, and a plain reload changes nothing.

Episode twelve of Web Reality Checks isolates one cause of that symptom: an open page that stays controlled by an older service worker, served from that worker's own Cache Storage, while the updated worker sits installed and waiting. One cause, not every cause. HTTP caching, CDN and proxy caches, DNS, and deployments that never published are different problems with different diagnoses, and the fixture keeps them out.

One disclosure up front: the real browser service-worker lifecycle was not executed, because no browser was available in the build environment. The lifecycle events in the evidence come from a deterministic Node model that runs the real worker and page code; the browser steps live in a manual checklist. Every lifecycle scene in the video carries the tag `SERVICE WORKER LIFECYCLE · ILLUSTRATIVE, NOT CAPTURED`.

## What actually happens

Four parts are involved: the page, the service worker that currently controls it, a second worker that may be installed and waiting, and Cache Storage. Cache Storage is a separate store from the HTTP cache. The HTTP cache belongs to the browser's network layer and is governed by `Cache-Control` and ETags. Cache Storage belongs to the origin's scripts and is written and read by the worker. Clearing one does nothing to the other.

The worker script lives at one stable URL, `/sw.js`. When a deployment changes its bytes, the browser's next update check notices and installs the new worker. Installing is not activating. The new worker runs its `install` handler, reaches `installed`, and then waits, because a worker is still active and still controlling at least one client. The old worker keeps controlling the open page and keeps answering its fetches from its own versioned cache. Nothing in the running page was replaced. The server sends Build 2 to every new visitor while the open tab stays on Build 1, and a plain reload stays inside the old worker's control.

That waiting state is the browser protecting a running page from having its code swapped underneath it. Whether to stay there until the user agrees is an application decision. Browsers permit `skipWaiting()` during install, and many apps take over at once. This fixture's app asks first. Explicit approval is this app's policy, not a browser requirement.

## The fixture

`fixtures/ep12-sw-update/` is plain Node 22 ESM with zero dependencies: two same-origin builds, `build1/` blue and labeled Build 1, `build2/` green and labeled Build 2, each with `index.html`, `app.js`, `styles.css` and a generated `sw.js`. `sw.template.js` plus `generate-sw.mjs` produce the two byte-different workers, each with its own versioned precache name:

```js
const BUILD = __BUILD__;
const PREFIX = 'wrc-ep12-';           // this app's cache namespace
const CACHE = PREFIX + 'v' + BUILD;   // versioned precache name: wrc-ep12-v1 / wrc-ep12-v2
const PRECACHE = ['/', '/index.html', '/app.js', '/styles.css'];

// install: precache this build's assets into ITS OWN versioned cache.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});
```

There is deliberately no `skipWaiting()` in `install`. The `activate` handler is where old assets are removed, and it is the step most often misdescribed. It deletes only caches that start with this app's prefix and are not the current one. It runs only when this worker is activating, so the previous worker is already redundant and no page is being served from the cache being removed. Other apps' caches on the origin are untouched. Then it calls `clients.claim()` so a first-install page becomes controlled without a reload. `clients.claim()` is part of the deliberate activation strategy. It is not what deletes caches; the filter above it does.

```js
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const stale = names.filter((n) => n.startsWith(PREFIX) && n !== CACHE);
    await Promise.all(stale.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
```

On the page side, `app.js` registers `/sw.js`, offers a Check for update button that calls `registration.update()`, and shows Update available when a waiting worker exists while the page already has a controller. The decision logic and the single-reload guard sit between `@@logic-start` and `@@logic-end` markers so the Node tests exercise the shipped code:

```js
function updateAvailable(reg, controller) {
  if (!controller) return false;
  if (reg.waiting) return true;
  if (reg.installing && reg.installing.state === 'installed') return true;
  return false;
}
function makeControllerChangeHandler(reload) {
  var refreshing = false;
  return function onControllerChange() {
    if (refreshing) return 'ignored';
    refreshing = true;
    reload();
    return 'reloaded';
  };
}
```

`serve.mjs` binds 127.0.0.1 and sends `/sw.js` with `Cache-Control: no-cache` and app assets with `no-store`, so the HTTP cache cannot contribute to anything observed. `/__set-build/2` swaps the served build. `sw-lifecycle-sim.mjs` is the deterministic model of the registration state machine (installing, waiting, active, controller, `controllerchange`). It runs the real `sw.js` source in a `vm` sandbox against a fake `CacheStorage` and extracts the real `app.js` logic block.

## The test that proves it

`node --test fixtures/ep12-sw-update/test.mjs` runs fourteen tests and reports `# tests 14  # pass 14  # fail 0` (local synthetic fixture, Node model). The names describe the contract:

- `sw.js is byte-different between builds, at the same URL`
- `worker never calls skipWaiting() on its own during install (explicit-approval policy)`
- `activate deletes only wrc-ep12-* caches other than the current one; foreign caches survive`
- `KNOWN-POSITIVE CONTROL: with an unversioned cache name both builds would write into one cache`
- `byte-identical script on update(): no new worker, no notice`
- `Build 2 installs and WAITS behind active Build 1; page stays controlled by Build 1; notice shown`
- `approval → SKIP_WAITING → Build 2 activates → v1 cache deleted → controllerchange → exactly one reload`
- `controllerchange guard reloads once even if the event fires twice`

The waiting test reproduces the symptom. After Build 1 installs and claims the page, Build 2 is fed to `update()`. The snapshot shows `active` is build1, `waiting` is build2 in state `installed`, and the controller is still build1. Both caches coexist, because Build 1 is still serving pages from `wrc-ep12-v1`. `updateAvailable` returns true.

The known-positive control shows why the versioned name matters. With `CACHE` replaced by one shared name, both builds write into one cache, the cleanup filter has nothing to distinguish, and the model ends with a single `wrc-ep12-shared`. A policy that cannot be made to fail is not a tested policy.

`demo.mjs` writes `evidence.json`. From that file (local synthetic fixture): steps 1 to 2, Build 1 active and controlling, caches `[wrc-ep12-v1]`. Steps 3 to 4, the server switches to Build 2 and the tab is unchanged. Steps 5 to 7, after `registration.update()`, Build 2 is `installed` and waiting, `updateAvailable` is true, caches are `wrc-ep12-v1, wrc-ep12-v2`, page still shows Build 1. The loopback server rows were executed, not modeled: `/` returns Build 1, then Build 2 after `/__set-build/2`; `/sw.js` is served `Cache-Control: no-cache`, `const BUILD = 1;` versus `const BUILD = 2;`, byte-different, 2502 bytes each per evidence.json.

## The repair

The repair is a policy that makes the update visible and lets the user choose when it lands. When the page detects a waiting worker behind an existing controller, it shows Update available with an Approve button. Approve posts `{type: 'SKIP_WAITING'}` to `registration.waiting`. That is the only message the worker acts on. The waiting worker calls `self.skipWaiting()`, the old worker becomes redundant, the new worker's `activate` deletes only `wrc-ep12-v1`, and the browser fires `controllerchange` on every controlled client.

The `controllerchange` handler reloads the page exactly once. The `refreshing` guard turns any second event into a no-op. The reload is a full navigation, so the new document gets a fresh script and a fresh guard, and the new controller does not change again on its own, so there is no loop.

## Retest

From `evidence.json` (local synthetic fixture, Node model), steps 8 to 9: after `SKIP_WAITING`, `active` is build2, `waiting` is null, controller is build2, caches are `[wrc-ep12-v2]`, `reloads` is 1, `secondEventResult` is `ignored`, and the page shows Build 2 after the single reload. The summary records two `controllerchange` events handled across the whole trace and one reload. Every event in that trace was produced by the model, not captured from a browser.

## What this does not prove

- The browser lifecycle was not executed. Real `install`, `activate` and `controllerchange` timing, the browser's update heuristics, DevTools states and the actual reload are covered only by `browser-test-checklist.md`, steps 1 to 10 for one controlled tab.
- The model omits `updateViaCache`, imported scripts, scope rules, the browser's 24-hour byte-check, navigation-triggered update checks and multiple registrations. The fetch handler is a minimal cache-first demonstration, not a production caching policy.
- One controlled tab. An update belongs to the registration, so approval in one tab activates the worker for every controlled tab and, with this handler, reloads all of them. Unsaved work in those tabs is lost. The checklist documents this; the fixture does not execute it.
- One cause. If your page is stale because of `Cache-Control` headers, a CDN, a proxy, DNS or a deploy that never published, nothing here applies.
- Explicit approval before `skipWaiting()` is this app's choice. Immediate takeover is a legitimate policy for apps that can tolerate it.

## Launch checklist

1. Give every build its own versioned Cache Storage name under an app-specific prefix; delete only prefixed, non-current caches during the new worker's `activate`.
2. Write down your update policy: immediate `skipWaiting()` during install, or explicit approval via a message. Neither is required by the browser.
3. If you prompt, detect `registration.waiting` or an installing worker reaching `installed`, and only when the page already has a controller.
4. Guard the `controllerchange` handler so it reloads at most once per document.
5. Serve the worker script with `Cache-Control: no-cache` so the update check sees new bytes promptly.
6. Treat the HTTP cache and Cache Storage as separate stores with separate diagnoses.
7. Test the multi-tab case: approve in one tab and watch the others. Persist drafts or replace auto-reload with a "reload when ready" prompt.
8. Keep a known-positive control that shows what an unversioned cache name does.

## FAQ

**Why does my site show the old version after deploying with a service worker?**
The updated worker installed but is waiting while the old worker still controls the open page and serves it from its own Cache Storage. A plain reload stays under the old worker. The page must detect the waiting worker and approve or auto-activate it. One cause of stale content, not every cause.

**Does clients.claim() delete old caches?**
No. `clients.claim()` makes an activating worker take control of open pages in scope that are not yet controlled. Old caches are deleted by your own code in the `activate` handler, typically by filtering cache names by prefix and removing the ones that are not current.

**Is skipWaiting() required to update a service worker?**
No. Without it, the new worker activates once no page is controlled by the old one, for example after all tabs close. `skipWaiting()` makes it activate at once. Whether to call it during install or only after user approval is an app policy.

## Watch the episode

[YouTube link]

- 00:00 Deployment complete, tab still shows Build 1
- 00:14 Page, active worker, waiting worker, Cache Storage
- 00:29 Same URL, different bytes: the new worker waits
- 00:45 Update available, explicit approval, SKIP_WAITING
- 01:01 Activate, delete v1, controllerchange, one reload
- 01:14 Verify: Build 2, one cache left
- 01:27 Deployment and client activation are different events

Related episodes: [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Deployment and client activation are different events. The server finished its job when it started sending Build 2. The page's job starts when the waiting worker is noticed, and your code decides when that is.

Miz Causevic, Kinetic Gain LLC
