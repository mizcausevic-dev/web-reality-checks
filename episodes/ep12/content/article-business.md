SEO title (≤60 chars): You Shipped the Update. Why Customers Still See the Old App
Meta description (≤155 chars): The release went out, the server sends the new version, and open tabs still show the old one. Why this happens, why demos miss it, five questions to ask.
Slug: sw-update
Primary keyword: customers seeing old version after deploy   Secondary keywords (3–5): web app update rollout, stale app after release, service worker update policy, offline-capable web app risk, release verification questions
Medium tags (5): Product Management, Software Development, Startup, Web Apps, Release Management

# Your Website Updated. Why Am I Still Seeing the Old Version?

![The deployment is complete and the server sends Build 2 in green, but the open browser tab still shows Build 1 in blue, controlled by the old service worker](../hero.png)

## The symptom as a business event

The release is out. The pipeline is green and the deploy log says done. Then a customer writes in: "You said the fix shipped this morning. I am looking at the app right now and it is the old one." Someone on your team opens the site and sees the new version. The customer refreshes and still sees the old one. Both are right.

That is the event this episode reproduces on a local fixture. Two versions of a small web app, Build 1 in blue and Build 2 in green. The server is switched to Build 2. A tab that was already open stays on Build 1, and a plain reload does not move it (local synthetic fixture).

Scope first. This is one controlled cause of stale content, not every cause. A page can also be stale because of ordinary HTTP caching, a CDN or proxy, DNS, or a deployment that never published. Those are different problems with different fixes. And the real browser steps were not executed where this episode was built; the lifecycle in the evidence comes from a Node model running the real code, and the browser procedure is a manual checklist in the repo. The episode says so on screen.

## Why a demo cannot show this

A demo opens a fresh tab and loads the new version. Fresh tabs get the new version. The failure only exists for a tab that was open before the deploy and has not been closed since, which describes your heaviest users: the ones who keep your app open all day.

So a release checklist that says "open the site and confirm the new version" answers the wrong question. It confirms the server is sending the new build. It says nothing about pages already open in customers' browsers, and those generate the tickets.

## The mechanism in plain terms

Many web apps install a small program in the browser called a service worker. It sits between the page and the network, keeps a copy of the app's files in its own storage so the app loads fast and works offline, and answers the page's requests from that copy. Think of it as a staff member assigned to that one open tab, holding a binder of the app's files.

When you deploy, the browser notices the new worker script, installs a new staff member, and hands them the new binder. But it does not pull the old staff member off a tab they are still serving. The new one stands beside them and waits. The old one keeps answering from the old binder. Reloading asks the same old staff member again, so the answer is the same old version. To the server the update is done. To the tab nothing has changed.

The analogy is accurate on the point that matters: the delay is the browser refusing to swap running code out from under a page, not a bug. What happens next is up to the application. It can tell the new worker to take over immediately, which many apps do, or show an "Update available" notice and wait for approval, which is what this fixture does. Explicit approval is this app's policy, not a browser requirement.

Two more facts. The worker's storage is not the browser's ordinary cache; clearing one does not clear the other. And a worker belongs to the whole site in that browser, not to one tab. When the update lands, it lands for every open tab. In this fixture, approving in one tab reloads all of them, and unsaved work in the others is gone. The fixture documents this; it does not execute it.

In the model run, after approval the new worker takes over, removes only its own app's old storage, and the page reloads exactly once, landing on Build 2 with one copy of the files left. Fourteen tests, fourteen pass (local synthetic fixture, Node model, not a browser capture).

## What to ask your team or vendor

1. Does the app use a service worker? If yes, what is the update policy: take over immediately, or wait for user approval? Ask for the written policy.
2. How does a tab that was open before the deploy find out there is a new version, and how long can it stay on the old one?
3. When the new version takes over, does the page reload on its own, and is it guaranteed to reload only once? A reload loop is worse than a stale page.
4. A customer has three tabs open and accepts the update in one. Do the other two reload, and what happens to anything unsaved in them?
5. When the old version's files are removed, is it only this app's old files, only after the old worker is retired, and never another app's data on the same domain?

If the answers are vague, "the deploy finished" is all you know, and it is not the same as "customers have the new version."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The immediate cost is support load. "We fixed it" followed by "no you did not" erodes trust fastest when both sides are telling the truth. Each ticket of that kind costs a support conversation and an engineering interruption to re-verify a deploy that was fine.

The sharper cost is a fix that does not reach the people it was for. If the release corrected a pricing display, a legal notice or a broken checkout step, every long-lived tab keeps the defect alive until the user closes it.

The hidden cost is in the multi-tab case. An app that reloads every tab the moment one user approves an update can throw away unsaved work in the others. A user who loses a half-written form that way does not file a ticket about service workers. They stop trusting the product to hold their work.

## FAQ

**Our deploy succeeded and the new version is live. Why do customers say it is not?**
Tabs that were already open can stay on the previous version because the browser keeps the old service worker in charge of them until the new one is allowed to take over. The server and the customer are both right. This is one cause among several; ordinary caching and CDNs are others.

**Should we force every open tab to update immediately?**
It is a policy choice. Immediate takeover gets the fix out fast but can reload tabs mid-task. Asking for approval respects the user's work but leaves old versions running longer. Either way, write it down and test the multi-tab and unsaved-work cases.

**Is this a bug in the browser?**
No. The browser is deliberately refusing to swap out the code of a page that is still running. How and when the swap happens is decided by the application's own update code, so the question belongs to your team or vendor.

## Watch the episode

[YouTube link]

Related episodes: [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md) and [It Works Locally. Why Is Production Broken?](../../ep07/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Deployment and client activation are different events. The first is on your dashboard. The second is in your customers' browsers, and your app's code decides when it happens.

Miz Causevic, Kinetic Gain LLC
