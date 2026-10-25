// Runs the exact scenario shown in the video and writes evidence.json plus the two collector logs
// (collector-log-flawed.json, collector-log-corrected.json) — the real contents of the local collector.
//
//   run A (flawed)    : load → "Reject optional" → browse → flush      : expect optional requests anyway
//   run B (corrected) : the same five states the tests cover:
//                       no_choice → rejected (reload) ... and separately accepted → withdrawn
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCollector, COLLECTOR_LABEL} from './collector.mjs';
import * as flawed from './page-flawed.mjs';
import * as fixed from './page-corrected.mjs';

const collector = createCollector();
const base = await collector.listen();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ep11-demo-'));
const here = (f) => new URL(`./${f}`, import.meta.url);
const snapshot = async () => (await fetch(base + '/events')).json();
const reset = () => fetch(base + '/reset', {method: 'POST'});
const optional = (events) => events.filter((e) => e.category === 'analytics_optional').length;

// Each step records the consent state and the collector's optional-request count after the step.
const run = async (label, mod, storeName, steps) => {
  const storePath = path.join(tmp, storeName);
  let page = null;
  const actions = [];
  for (const s of steps) {
    page = await s.fn(page, storePath);
    const snap = await snapshot();
    actions.push({action: s.name, consentState: page.state(), bannerVisible: page.ui().bannerVisible, analyticsInitialized: page.analytics.initialized, listeners: page.analytics.listenerCount(), unsentQueue: page.analytics.queueLength(), optionalRequestsReceived: optional(snap.events)});
  }
  const snap = await snapshot();
  return {label, mode: mod.PAGE_MODE, storedPreference: page.store.read(), actions, optionalRequestsReceived: optional(snap.events), collectorLog: snap.events};
};

const browse = async (p) => { p.interact('scroll'); p.interact('click:pricing'); await p.flush(); return p; };

/* ---------- Run A: flawed ---------- */
await reset();
const flawedRun = await run('flawed: Reject optional, then browse', flawed, 'flawed.json', [
  {name: 'load()', fn: (_, sp) => flawed.createPage({collectorBase: base, storePath: sp}).load()},
  {name: 'rejectOptional()', fn: (p) => { p.rejectOptional(); return p; }},
  {name: 'interact + flush()', fn: browse},
  {name: 'reload: load() with stored rejection', fn: (_, sp) => flawed.createPage({collectorBase: base, storePath: sp}).load()},
  {name: 'flush()', fn: async (p) => { await p.flush(); return p; }},
]);
fs.writeFileSync(here('collector-log-flawed.json'), JSON.stringify({label: COLLECTOR_LABEL, pageMode: 'flawed', count: flawedRun.collectorLog.length, events: flawedRun.collectorLog}, null, 2));

/* ---------- Run B1: corrected — no choice, reject, reload ---------- */
await reset();
const rejectRun = await run('corrected: no choice → reject → reload', fixed, 'corrected-reject.json', [
  {name: 'load()', fn: (_, sp) => fixed.createPage({collectorBase: base, storePath: sp}).load()},
  {name: 'interact + flush() (no choice yet)', fn: browse},
  {name: 'rejectOptional()', fn: (p) => { p.rejectOptional(); return p; }},
  {name: 'interact + flush()', fn: browse},
  {name: 'reload: load() with stored rejection', fn: (_, sp) => fixed.createPage({collectorBase: base, storePath: sp}).load()},
  {name: 'interact + flush()', fn: browse},
]);

/* ---------- Run B2: corrected — accept, then withdraw ---------- */
const acceptRun = await run('corrected: accept → withdraw', fixed, 'corrected-accept.json', [
  {name: 'load()', fn: (_, sp) => fixed.createPage({collectorBase: base, storePath: sp}).load()},
  {name: 'acceptOptional()', fn: (p) => { p.acceptOptional(); return p; }},
  {name: 'interact + flush()', fn: browse},
  {name: 'interact (queued, not yet sent)', fn: (p) => { p.interact('scroll'); return p; }},
  {name: 'openSettings() + withdrawOptional()', fn: (p) => { p.openSettings(); p.withdrawOptional(); return p; }},
  {name: 'interact + flush()', fn: browse},
]);
const correctedLog = (await snapshot()).events; // B1 contributed 0, so this log is exactly B2's accepted-window requests
fs.writeFileSync(here('collector-log-corrected.json'), JSON.stringify({label: COLLECTOR_LABEL, pageMode: 'corrected', count: correctedLog.length, events: correctedLog}, null, 2));

const byState = (run) => Object.fromEntries(['no_choice', 'rejected', 'accepted', 'withdrawn'].map((s) => [s, run.collectorLog.filter((e) => e.consentState === s).length]));

const evidence = {
  generatedAt: new Date().toISOString(),
  collector: {label: COLLECTOR_LABEL, base: 'http://127.0.0.1:<ephemeral>', policy: 'raw recorder; stores whatever reaches it; no filtering'},
  policy: {
    states: fixed.STATES,
    transitions: fixed.TRANSITIONS,
    optionalAllowedOnlyIn: 'accepted',
    gatedPaths: ['init', 'track', 'flush'],
    onWithdraw: 'remove optional listeners, clear unsent optional queue; already-sent requests are not recalled',
  },
  runs: {flawed: flawedRun, correctedReject: rejectRun, correctedAccept: acceptRun},
  summary: {
    flawed: {optionalRequestsReceived: flawedRun.optionalRequestsReceived, byConsentState: byState(flawedRun)},
    corrected: {
      noChoice: rejectRun.actions[1].optionalRequestsReceived,
      rejected: rejectRun.actions[3].optionalRequestsReceived,
      reloadWithStoredRejection: rejectRun.actions[5].optionalRequestsReceived,
      accepted: acceptRun.actions[2].optionalRequestsReceived,
      afterWithdraw: acceptRun.actions[5].optionalRequestsReceived,
      unsentDroppedOnWithdraw: acceptRun.actions[3].unsentQueue,
      listenersAfterWithdraw: acceptRun.actions[4].listeners,
      byConsentState: byState(acceptRun),
    },
  },
  notes: [
    'Analytics here is SIMULATED and posts only to a loopback collector. No real analytics or advertising service was contacted.',
    'The simulated module identifies the visitor with an in-memory client id; no cookie exists in this fixture. Tracking does not require cookies.',
    'The collector is same-origin ("first-party") to the simulated page. First-party does not make a request necessary or exempt from the choice.',
    'Withdrawal stops future optional requests. It does not delete data already collected, and a request that already reached the collector cannot be cancelled.',
    'This is a technical fixture, not a legal compliance certification.',
  ],
};
fs.writeFileSync(here('evidence.json'), JSON.stringify(evidence, null, 2));

console.log(COLLECTOR_LABEL);
for (const r of [flawedRun, rejectRun, acceptRun]) {
  console.log(`\n${r.label}  ->  optional requests received: ${r.optionalRequestsReceived}`);
  console.table(r.actions.map((a) => ({action: a.action, state: a.consentState, init: a.analyticsInitialized, listeners: a.listeners, queue: a.unsentQueue, received: a.optionalRequestsReceived})));
}
console.log('\ncollector-log-flawed.json   :', flawedRun.collectorLog.length, 'requests');
console.log('collector-log-corrected.json:', correctedLog.length, 'requests');
await collector.close();
fs.rmSync(tmp, {recursive: true, force: true});
