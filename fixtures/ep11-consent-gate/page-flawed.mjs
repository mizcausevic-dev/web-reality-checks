// Episode 11 fixture — FLAWED page. A consent banner simulated in Node (no browser).
//
// The "page" is an in-process object. UI actions are function calls:
//   load()              — the page boots (simulates navigation / reload). Reads the stored preference.
//   acceptOptional()    — banner: "Accept optional"
//   rejectOptional()    — banner: "Reject optional"
//   openSettings()      — footer control: reopen the consent settings panel
//   withdrawOptional()  — settings panel: withdraw a previous acceptance
//   interact(name)      — the visitor clicks / scrolls something on the page
//   flush()             — the analytics transport's batch send fires (simulated beacon timer)
//
// The preference store persists to a JSON file so that a *second* page instance pointing at the
// same file behaves like a reload in the same browser context.
//
// THE FLAW: the banner records the visitor's choice correctly, but the analytics module is
// initialised at load() and emits on every page event regardless of that choice. Nothing in the
// emission path ever reads the preference. The button is a promise; the requests are the behaviour.
//
// The analytics module is SIMULATED. It posts to a loopback collector and contacts no real service.
// It identifies the visitor with a generated client id held in memory — no cookie is involved —
// to show that tracking does not require cookies. The collector is same-origin ("first-party") here;
// that does not make the requests necessary or exempt from the visitor's choice.
import fs from 'node:fs';

export const PAGE_MODE = 'flawed';
export const OPTIONAL_CATEGORY = 'analytics_optional';

/* ---------- deterministic helpers (no wall clock, no Math.random) ---------- */
export const makeClock = (start = Date.parse('2026-10-25T09:00:00.000Z'), stepMs = 7) => { let n = 0; return () => new Date(start + stepMs * n++).toISOString(); };
const seededId = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 233280; x = x - Math.floor(x); return 'cid_' + Math.floor(x * 1e9).toString(16).padStart(8, '0'); };

/* ---------- preference store: a JSON file standing in for localStorage / a first-party cookie ---------- */
export const createStore = (filePath) => ({
  path: filePath,
  read: () => { try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; } },
  write: (pref) => fs.writeFileSync(filePath, JSON.stringify(pref, null, 2)),
  clear: () => { try { fs.unlinkSync(filePath); } catch { /* absent is fine */ } },
});

/* ---------- consent state: recorded, but (in this version) never consulted ---------- */
export const STATES = ['no_choice', 'rejected', 'accepted', 'withdrawn'];
const TRANSITIONS = {no_choice: ['rejected', 'accepted'], accepted: ['withdrawn'], rejected: [], withdrawn: []};

const makeBus = () => {
  const handlers = new Map();
  return {
    on: (name, fn) => { (handlers.get(name) ?? handlers.set(name, []).get(name)).push(fn); return () => handlers.set(name, (handlers.get(name) ?? []).filter((h) => h !== fn)); },
    emit: (name, payload) => { for (const h of handlers.get(name) ?? []) h(payload); },
    listenerCount: (name) => (handlers.get(name) ?? []).length,
    total: () => [...handlers.values()].reduce((n, a) => n + a.length, 0),
  };
};

export const createPage = ({collectorBase, storePath, clock = makeClock(), seed = 11}) => {
  const store = createStore(storePath);
  const bus = makeBus();
  const sent = []; // local trace of every request this page instance transmitted
  const consent = {state: 'no_choice', updatedAt: null};
  const ui = {bannerVisible: true, settingsOpen: false};

  const setState = (next) => {
    if (!TRANSITIONS[consent.state].includes(next)) throw new Error(`invalid consent transition ${consent.state} -> ${next}`);
    consent.state = next; consent.updatedAt = clock();
    store.write({state: next, updatedAt: consent.updatedAt}); // the choice IS stored correctly
  };

  /* ---------- simulated optional analytics module ---------- */
  const analytics = {
    initialized: false, clientId: null, queue: [], offs: [],
    init() {
      // FLAW: no consent check here. Called unconditionally from load().
      this.initialized = true;
      this.clientId = seededId(seed);
      this.offs.push(bus.on('page:view', (p) => this.track('page_view', p)));
      this.offs.push(bus.on('ui:interact', (p) => this.track('interaction', p)));
      bus.emit('page:view', {path: '/'});
    },
    track(event, detail) {
      // FLAW: no consent check here either. Whatever happens on the page is queued.
      this.queue.push({event, category: OPTIONAL_CATEGORY, module: 'analytics.sim', consentState: consent.state, pageMode: PAGE_MODE, clientId: this.clientId, detail, ts: clock()});
    },
    async flush() {
      // FLAW: and none here. The batch timer sends whatever is queued.
      const batch = this.queue.splice(0);
      for (const env of batch) {
        const {detail, ...wire} = env;
        const r = await fetch(collectorBase + '/collect', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(wire)});
        sent.push({...wire, status: r.status});
      }
      return batch.length;
    },
    listenerCount() { return bus.total(); },
    queueLength() { return this.queue.length; },
  };

  const page = {
    mode: PAGE_MODE, store, sent, analytics,
    state: () => consent.state,
    ui: () => ({...ui}),
    load() {
      const stored = store.read();
      if (stored && STATES.includes(stored.state)) { consent.state = stored.state; consent.updatedAt = stored.updatedAt; }
      ui.bannerVisible = consent.state === 'no_choice'; // the banner honours the stored choice…
      analytics.init();                                   // …the analytics module does not. (THE BUG)
      return page;
    },
    acceptOptional() { setState('accepted'); ui.bannerVisible = false; },
    rejectOptional() { setState('rejected'); ui.bannerVisible = false; },
    openSettings() { ui.settingsOpen = true; },
    withdrawOptional() { setState('withdrawn'); ui.settingsOpen = false; /* nothing tells the analytics module */ },
    interact(name) { bus.emit('ui:interact', {name}); },
    flush: () => analytics.flush(),
  };
  return page;
};
