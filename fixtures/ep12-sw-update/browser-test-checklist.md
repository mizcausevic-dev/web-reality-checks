# EP12 — manual browser test checklist

The real service-worker lifecycle was **not** executed in the build environment (no browser). This checklist is the manual procedure that verifies the UPDATE FLOW in a real browser. Record each step's observed result; do not tick a step you did not observe.

Prerequisites: Node 22; a current Chromium-, Firefox- or WebKit-based browser. `http://127.0.0.1` and `http://localhost` are treated as secure contexts, so service workers register without HTTPS.

```
cd fixtures/ep12-sw-update
node generate-sw.mjs            # writes build1/sw.js and build2/sw.js
node serve.mjs --build 1        # prints http://127.0.0.1:<port>/
```

Keep the printed port. Use **one** tab for the main run (step 11 covers extra tabs). Open the browser's service-worker inspector (Application → Service Workers in Chromium DevTools, `about:debugging#/runtime/this-firefox` in Firefox) beside the tab. Do **not** enable "Update on reload" or "Bypass for network"; those change the behaviour under test.

## UPDATE FLOW (one controlled tab)

| # | Step | Expected observation | Observed |
|---|------|----------------------|----------|
| 1 | Open `http://127.0.0.1:<port>/` | Blue page, heading **Build 1**. Log shows `registered /sw.js`, then the installing worker goes `installing → installed → activating → activated`. Cache Storage shows `wrc-ep12-v1` containing `/`, `/index.html`, `/app.js`, `/styles.css`. | |
| 2 | Confirm the page is controlled | Status panel: `controller: yes (activated)`, `active: activated`, `waiting: —`. (First load: the worker's `clients.claim()` took control without a reload. If `controller: none`, reload once and re-check.) | |
| 3 | Keep that tab open | Nothing changes. Do not reload. | |
| 4 | Deploy Build 2: in another terminal run `curl http://127.0.0.1:<port>/__set-build/2` (or stop the server and start `node serve.mjs --build 2` on the same port) | `curl http://127.0.0.1:<port>/__build` → `{"build":2}`. `curl -i http://127.0.0.1:<port>/sw.js` shows `Cache-Control: no-cache` and `const BUILD = 2;`. The open tab still shows **Build 1** (blue). | |
| 5 | In the tab, click **Check for update (registration.update())** | Log: `registration.update() requested`, `updatefound: new worker installing (byte-different /sw.js)`, `new worker → installed`. | |
| 6 | Read the status panel and the inspector | `active: activated` (Build 1), `waiting: installed` (Build 2), `controller: yes`. Cache Storage now has **both** `wrc-ep12-v1` and `wrc-ep12-v2`. The page is still blue, still Build 1. The new worker is waiting; it did not replace the running page's code. | |
| 7 | Look for the notice | Yellow panel **Update available** is visible with an **Approve and reload** button. | |
| 8 | Click **Approve and reload** | Log: `approved: posting SKIP_WAITING to the waiting worker`. Inspector: Build 1 worker becomes redundant; Build 2 goes `activating → activated`. | |
| 9 | Watch the reload | Log (briefly, before navigation): `controllerchange → reloading once`. The tab reloads **once**. It must not reload again on its own; wait 10 s and confirm. | |
| 10 | Verify | Green page, heading **Build 2**. Status: `controller: yes (activated)`, `waiting: —`. Cache Storage shows only `wrc-ep12-v2` (`wrc-ep12-v1` was deleted during Build 2's `activate`). Log: `page script running: Build 2`. | |

Negative control (optional but recommended): repeat step 5 without changing the server build. Expected: `update check complete`, no `updatefound`, no notice, because `/sw.js` is byte-identical.

## 11. Multi-tab implications

The registration belongs to the origin+scope, not to a tab. Open a **second** tab of the same URL at step 6 and observe:

- Both tabs are controlled by the Build 1 worker; both see the same `waiting` worker; both show **Update available**.
- Approve in tab A only. The waiting worker calls `skipWaiting()`, activates, and takes over **every** controlled client. `controllerchange` fires in tab A **and** tab B. With this app's handler, **both** tabs reload once. Tab B reloads without its own user having approved anything.
- Consequence: an approval in one tab is an approval for the whole origin. Apps that need per-tab consent must coordinate (e.g. BroadcastChannel to show a "another tab updated, reload when ready" message instead of reloading) or avoid auto-reload entirely.

## 12. Unsaved-work risk

The reload in step 9 discards any unsaved in-page state (form fields, in-memory edits). This fixture's notice text warns the user, and the reload happens only after an explicit click, but in a multi-tab situation the other tabs reload without a click. Before shipping a pattern like this: persist drafts before reloading, or replace the automatic reload with a "reload when ready" prompt in every tab.

## What this checklist does not cover

- HTTP-cache staleness of HTML/CSS/JS unrelated to service workers (the server sends `Cache-Control: no-store` for app assets precisely to keep that cause out of the experiment).
- CDN or proxy caching, DNS, or build pipelines that did not actually publish.
- Browsers' own update heuristics (the 24-hour byte-check, navigation-triggered checks). The fixture triggers the check manually so the timing is controlled; a real deployment would usually be picked up on the next navigation.
- Scope variations, `updateViaCache`, imported scripts, or Workbox.
