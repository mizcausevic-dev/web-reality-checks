# EP12 distribution kit: Your Website Updated. Why Am I Still Seeing the Old Version?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep12-sw-update/` (evidence.json, test.mjs, README.md). The service-worker lifecycle events were produced by a Node model running the real worker and page code; they were not captured from a browser. The browser procedure is `browser-test-checklist.md`.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Website Updated. Why Am I Still Seeing the Old Version?` (60) : the series title; it is the exact sentence users type when this happens to them.
2. `You Deployed. The Open Tab Still Shows the Old Build.` (53) : states the scene in the first second; speaks to engineers who have watched this happen.
3. `The Service Worker Is Waiting. Your Users Are Stale.` (52) : names the mechanism for search intent around service worker updates.
4. `Deployment and Client Activation Are Different Events` (53) : the closing line as a thesis; good for shares and quotes.
5. `Refresh Did Nothing. Here Is the Worker That Blocked It.` (56) : for general viewers; the useless refresh is the recognizable moment.
6. `skipWaiting, controllerchange, One Reload: The Update Flow` (58) : for the engineer searching the API names directly.

### Description

You deployed. The server sends the new build. The tab that was already open still shows the old one, and refresh does nothing.

In this episode we build a tiny web app in two versions on a laptop: Build 1 in blue and Build 2 in green, each with its own versioned cache and a service worker at one stable URL, /sw.js. We open Build 1, switch the server to Build 2, and watch the open tab stay on Build 1. The new worker installs and waits. The old worker still controls the page and serves it from its own Cache Storage, which is a different store from the HTTP cache.

Then the update flow this app chooses: detect the waiting worker, show "Update available," wait for explicit approval, post SKIP_WAITING, let the new worker activate and delete only this app's old cache, handle controllerchange with a guard that reloads exactly once, and verify Build 2 with one cache left. Explicit approval is this app's policy, not a browser requirement. clients.claim() is part of the activation strategy; it is not what deletes caches.

Scope: this is one cause of stale content, not every cause. HTTP caching, CDNs, DNS and deploys that never published are different problems. The real browser lifecycle was not executed where this episode was built; every lifecycle scene is labeled illustrative and the browser steps live in a manual checklist in the repo. The automated suite runs 14 tests, 14 pass, against the Node model and the real loopback server.

Chapters
00:00 Deployment complete, tab still shows Build 1
00:14 Page, active worker, waiting worker, Cache Storage
00:29 Same URL, different bytes: the new worker waits
00:45 Update available, explicit approval, SKIP_WAITING
01:01 Activate, delete v1, controllerchange, one reload
01:14 Verify: Build 2, one cache left
01:27 Deployment and client activation are different events

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep12/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

service worker, service worker update, skipWaiting, controllerchange, registration.waiting, cache storage, http cache, stale content, old version after deploy, progressive web app, pwa update, web deployment, frontend engineering, javascript, versioned cache, update available notice, browser caching explained, web development, deployment verification, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with two synthetic builds. The lifecycle scenes come from a Node model running the real worker code; browser steps were not captured and live in a manual checklist. One cause of stale content. github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Deploy finished. Server sends Build 2. The tab that was already open still shows Build 1, and reload does nothing.

Episode 12 of Web Reality Checks isolates one cause: the new service worker installed and is waiting, while the old worker still controls the page and serves it from its own Cache Storage. Not the HTTP cache.

Two builds, one stable /sw.js, versioned caches wrc-ep12-v1 and wrc-ep12-v2. The flow this app chooses:

1. registration.update() finds new bytes; Build 2 installs and waits behind Build 1.
2. registration.waiting exists while the page has a controller: show "Update available."
3. User approves; page posts SKIP_WAITING. App policy, not a browser rule.
4. New worker activates, deletes only wrc-ep12-* caches that are not current, then clients.claim(). clients.claim() does not delete caches.
5. controllerchange fires; a guarded handler reloads exactly once.

14 tests, 14 pass, including a known-positive control with an unversioned cache name.

Scope: the browser lifecycle was NOT executed here. Events come from a Node model running the real sw.js and app.js logic; browser steps are a manual checklist. One tab modeled; approval in one tab reloads every controlled tab.

github.com/mizcausevic-dev/web-reality-checks

#ServiceWorkers #WebDevelopment #Frontend

### Post 2: non-technical leaders

"The fix shipped this morning." "I am looking at it right now and it is the old one." Both people are telling the truth.

Episode 12 of Web Reality Checks reproduces that moment on a local fixture. Two versions of a small app, blue and green. The server switches to green. A tab opened earlier stays blue, and refreshing does not change it.

Why: many web apps install a helper in the browser that serves the page from its own saved copy. On deploy, the browser installs the new helper but will not pull the old one off a tab it is still serving. The new one waits. How long, and whether the user is asked, is your app's decision.

Five questions for your team or vendor:
1. Does the app use a service worker, and what is the written update policy?
2. How does a tab opened before the deploy learn there is a new version?
3. Does the page reload itself, and only once?
4. A user approves in one of three open tabs. What happens to the other two and their unsaved work?
5. Are only this app's old files removed, and only after the old helper is retired?

"The deploy finished" is not "customers have the new version."

One cause among several; browser steps modeled, not captured. Synthetic fixture. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #ReleaseManagement #Leadership

## X/Twitter thread

1/ Deploy done. Server sends Build 2. The tab that was already open still shows Build 1. Reload: still Build 1. Episode 12 of Web Reality Checks isolates one cause: a service worker that installed and is waiting while the old one keeps serving the page. Thread.

2/ Four parts: the page, the worker controlling it, a second worker that may be waiting, and Cache Storage. Cache Storage is not the HTTP cache. Clearing one does nothing to the other. The fixture serves app assets no-store so only the worker's cache is in play.

3/ /sw.js is one stable URL. New deploy, new bytes. The browser installs the new worker, then waits, because the old worker still controls an open page and still answers from wrc-ep12-v1. Nothing in the running page was replaced. The browser is protecting running code.

4/ This app's policy: detect registration.waiting while the page already has a controller, show "Update available," wait for a click, post SKIP_WAITING. Explicit approval is the app's choice. Browsers allow skipWaiting() during install and many apps take over immediately.

5/ On activate: delete only caches starting with wrc-ep12- that are not the current one, then clients.claim(). clients.claim() takes control of uncontrolled pages. It does not delete caches. The filter line above it does.

6/ controllerchange fires on every controlled tab. The handler has a refreshing guard: first event reloads, second event ignored. In the model: reloads = 1, second event "ignored", caches after = [wrc-ep12-v2]. 14 tests, 14 pass (local synthetic fixture).

7/ Limits: the browser lifecycle was NOT executed here. Events come from a Node model running the real sw.js and app.js logic; browser steps are a manual 10-step checklist. One tab modeled. An update hits every tab on the registration. One cause of stale content, not all.

8/ Deployment and client activation are different events. Fixture, 14 tests, checklist, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal two-build service worker fixture showing the installed-and-waiting state, an explicit-approval update flow, and a single-reload controllerchange guard, with a Node model and a manual browser checklist

**First comment:** This is a deliberately constructed local fixture with two synthetic builds, and the lifecycle events in the evidence were produced by a Node model running the real sw.js and app.js logic rather than captured from a browser, because none was available where it was built; the real browser steps are a manual checklist in the repo. It demonstrates one cause of stale content, a waiting worker behind an active one, and keeps the HTTP cache out by serving assets no-store. The explicit-approval-before-skipWaiting flow is this app's policy rather than a browser requirement, clients.claim() is documented as part of activation and not as cache deletion, and the 14-test suite includes a known-positive control with an unversioned cache name.

## Short-form hook lines (≤ 12 words)

1. You deployed. The open tab did not notice.
2. Refresh went to the old worker. Same old build.
3. The new worker installed, then waited. By design.
4. Approve once, reload once. Every tab, though.
5. Deployment and client activation are different events.

## Alt text

**hero.png:** Diagram of a completed deployment: the server sends Build 2 in green, while an already-open browser tab still shows Build 1 in blue, controlled by the old service worker serving from cache wrc-ep12-v1; a second worker labeled Build 2 sits installed and waiting beside it.

**thumbnail.png:** Episode thumbnail for "Your Website Updated. Why Am I Still Seeing the Old Version?" showing a blue Build 1 browser tab next to a green Build 2 server, with a waiting service worker between them and the label "Illustrative, not captured."
