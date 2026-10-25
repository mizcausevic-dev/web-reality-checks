// Runs the scenario the video shows against the deterministic lifecycle MODEL and the real
// loopback server, then writes evidence.json. No browser is involved: the lifecycle events in
// this file are produced by sw-lifecycle-sim.mjs running the real sw.js and app.js logic, not
// captured from a browser. The video labels them "ILLUSTRATIVE, NOT CAPTURED".
import fs from 'node:fs';
import {writeAll} from './generate-sw.mjs';
import {Registration, loadAppLogic, readSw} from './sw-lifecycle-sim.mjs';
import {listen} from './serve.mjs';

writeAll();
const sw1 = readSw(1), sw2 = readSw(2);
const logic = loadAppLogic(1);
const steps = [];
const reg = new Registration();
const snap = (label, extra = {}) => steps.push({label, ...reg.snapshot(), caches: [...reg.caches.store.keys()], updateAvailable: logic.updateAvailable(reg, reg.controller), ...extra});

// 1–2. Install and activate Build 1; page controlled by it.
await reg.update(sw1, 'build1'); snap('1-2 Build 1 installed, active, controlling the page', {pageShows: 'Build 1'});
// 3–4. Page kept open. Server now serves Build 2 (byte-different /sw.js) — the deployment.
snap('3-4 deploy: server switched to Build 2; open tab unchanged', {serverBuild: 2, pageShows: 'Build 1'});
// 5–6. registration.update() → new worker installs and waits behind the active one.
await reg.update(sw2, 'build2'); snap('5-6 registration.update(): Build 2 installed, WAITING behind Build 1', {pageShows: 'Build 1'});
// 7. "Update available" is shown by the page's decision logic.
snap('7 page shows "Update available"', {pageShows: 'Build 1'});
// 8–9. Explicit approval → SKIP_WAITING; controllerchange guard reloads once (fire it twice to show the guard).
let reloads = 0, results = [];
const handler = logic.makeControllerChangeHandler(() => { reloads++; });
reg.onControllerChange(handler);
await reg.postMessage(reg.waiting, {type: 'SKIP_WAITING'});
results.push(handler()); // a second controllerchange, were one to fire, is ignored by the guard
snap('8-9 approved: SKIP_WAITING → Build 2 active → controllerchange → one reload', {reloads, secondEventResult: results[0], pageShows: 'Build 2 (after the single reload)'});

// 10. Verify Build 2 from the real loopback server (this part IS executed, not modelled).
const {srv, port} = await listen(1);
const base = `http://127.0.0.1:${port}`;
const served = {};
for (const b of [1, 2]) {
  await fetch(`${base}/__set-build/${b}`);
  const html = await (await fetch(base + '/')).text();
  const swRes = await fetch(base + '/sw.js');
  const swText = await swRes.text();
  served[`build${b}`] = {h1: html.match(/<h1 id="build-label">(.*?)<\/h1>/)[1], swCacheControl: swRes.headers.get('cache-control'), swBytes: swText.length, swBuildConst: Number(swText.match(/const BUILD = (\d+);/)[1]), swCacheName: `wrc-ep12-v${swText.match(/const BUILD = (\d+);/)[1]}`};
}
srv.close();

const evidence = {
  generatedAt: new Date().toISOString(),
  note: 'Lifecycle events come from the deterministic model in sw-lifecycle-sim.mjs executing the real sw.js/app.js logic in Node. They were NOT captured from a browser. Server rows were executed against serve.mjs on 127.0.0.1.',
  executedServer: served,
  modelSteps: steps,
  lifecycleTrace: reg.events,
  summary: {buildsServed: ['Build 1', 'Build 2'], swByteDifferent: sw1 !== sw2, cacheNames: ['wrc-ep12-v1', 'wrc-ep12-v2'], cachesAfterActivation: [...reg.caches.store.keys()], reloads, controllerChangeEventsHandled: 2, finalController: reg.controller.label},
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(steps.map((s) => ({step: s.label, active: s.active?.label ?? '-', waiting: s.waiting?.label ?? '-', controller: s.controller?.label ?? '-', caches: s.caches.join(','), notice: s.updateAvailable, page: s.pageShows})));
console.table(served);
console.log(`reloads=${reloads}  (second controllerchange: ${results[0]})`);
