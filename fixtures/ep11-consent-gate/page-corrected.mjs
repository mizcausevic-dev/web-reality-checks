// Episode 11 fixture — CORRECTED page. Same simulated page as page-flawed.mjs, same UI actions,
// same preference store, same simulated analytics module and same loopback collector.
//
// THE REPAIR: an explicit consent state machine
//
//     no_choice ──reject──▶ rejected
//     no_choice ──accept──▶ accepted ──withdraw──▶ withdrawn
//
// drives an EVENT GATE. The gate is open only in `accepted`. Every path that could produce an
// optional analytics request goes through it:
//   1. init     — the optional module is not initialised unless the gate is open
//   2. track    — queueing an event checks the gate (a stale listener cannot queue)
//   3. flush    — the transport checks the gate again before each send (a stale queue cannot send)
// On withdrawal the gate closes, optional listeners are removed and the unsent optional queue is
// cleared. Requests that already reached the collector are NOT recalled: they are already there.
// The stored preference records the visitor's choice and survives a reload (a new page instance
// reading the same store file). A stored `rejected` keeps the gate shut from the first tick.
//
// Everything analytics-shaped here is SIMULATED and talks only to the loopback collector.
import fs from 'node:fs';

export const PAGE_MODE = 'corrected';
export const OPTIONAL_CATEGORY = 'analytics_optional';

/* ---------- deterministic helpers ---------- */
export const makeClock = (start = Date.parse('2026-10-25T09:00:00.000Z'), stepMs = 7) => { let n = 0; return () => new Date(start + stepMs * n++).toISOString(); };
const seededId = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 233280; x = x - Math.floor(x); return 'cid_' + Math.floor(x * 1e9).toString(16).padStart(8, '0'); };

/* ---------- preference store ---------- */
export const createStore = (filePath) => ({
  path: filePath,
  read: () => { try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; } },
  write: (pref) => fs.writeFileSync(filePath, JSON.stringify(pref, null, 2)),
  clear: () => { try { fs.unlinkSync(filePath); } catch { /* absent is fine */ } },
});

/* ---------- consent state machine ---------- */
export const STATES = ['no_choice', 'rejected', 'accepted', 'withdrawn'];
export const TRANSITIONS = {no_choice: ['rejected', 'accepted'], accepted: ['withdrawn'], rejected: [], withdrawn: []};
/** The policy, in one place: optional analytics may run only while consent is `accepted`. */
export const optionalAllowed = (state) => state === 'accepted';

const makeBus = () => {
  const handlers = new Map();
  return {
    on: (name, fn) => { (handlers.get(name) ?? handlers.set(name, []).get(name)).push(fn); return () => handlers.set(name, (handlers.get(name) ?? []).filter((h) => h !== fn)); },
    emit: (name, payload) => { for (const h of [...(handlers.get(name) ?? [])]) h(payload); },
    total: () => [...handlers.values()].reduce((n, a) => n + a.length, 0),
  };
};

export const createPage = ({collectorBase, storePath, clock = makeClock(), seed = 11}) => {
  const store = createStore(storePath);
  const bus = makeBus();
  const sent = [];
  const consent = {state: 'no_choice', updatedAt: null};
  const ui = {bannerVisible: true, settingsOpen: false};
  const gateLog = []; // every gate decision, for the tests and the video

  const gate = {
    isOpen: () => optionalAllowed(consent.state),
    check: (path) => { const open = gate.isOpen(); gateLog.push({path, state: consent.state, open, ts: clock()}); return open; },
  };

  /* ---------- simulated optional analytics module, consent-gated at every step ---------- */
  const analytics = {
    initialized: false, clientId: null, queue: [], offs: [],
    init() {
      if (!gate.check('init')) return false;                 // GATE 1: do not even start
      if (this.initialized) return true;
      this.initialized = true;
      this.clientId = seededId(seed);
      this.offs.push(bus.on('page:view', (p) => this.track('page_view', p)));
      this.offs.push(bus.on('ui:interact', (p) => this.track('interaction', p)));
      bus.emit('page:view', {path: '/'});
      return true;
    },
    track(event, detail) {
      if (!gate.check('track')) return false;                // GATE 2: a stray listener cannot queue
      this.queue.push({event, category: OPTIONAL_CATEGORY, module: 'analytics.sim', consentState: consent.state, pageMode: PAGE_MODE, clientId: this.clientId, detail, ts: clock()});
      return true;
    },
    async flush() {
      if (!gate.check('flush')) { this.queue.length = 0; return 0; } // GATE 3: a stale queue cannot send
      const batch = this.queue.splice(0);
      for (const env of batch) {
        const {detail, ...wire} = env;
        const r = await fetch(collectorBase + '/collect', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(wire)});
        sent.push({...wire, status: r.status});
      }
      return batch.length;
    },
    teardown() {
      // Withdrawal: remove optional listeners, drop unsent optional events, forget the client id.
      for (const off of this.offs.splice(0)) off();
      const dropped = this.queue.length;
      this.queue.length = 0;
      this.initialized = false;
      this.clientId = null;
      return {listenersRemoved: true, unsentDropped: dropped};
    },
    listenerCount() { return bus.total(); },
    queueLength() { return this.queue.length; },
  };

  const setState = (next) => {
    if (!TRANSITIONS[consent.state].includes(next)) throw new Error(`invalid consent transition ${consent.state} -> ${next}`);
    const prev = consent.state;
    consent.state = next; consent.updatedAt = clock();
    store.write({state: next, updatedAt: consent.updatedAt}); // the preference itself may remain stored
    // The state machine drives execution, not just the banner:
    if (optionalAllowed(next) && !optionalAllowed(prev)) analytics.init();
    if (!optionalAllowed(next) && optionalAllowed(prev)) analytics.teardown();
  };

  const page = {
    mode: PAGE_MODE, store, sent, analytics, gateLog,
    state: () => consent.state,
    ui: () => ({...ui}),
    gateOpen: () => gate.isOpen(),
    load() {
      const stored = store.read();
      if (stored && STATES.includes(stored.state)) { consent.state = stored.state; consent.updatedAt = stored.updatedAt; }
      ui.bannerVisible = consent.state === 'no_choice';
      analytics.init(); // gated: returns false unless the stored state is `accepted`
      return page;
    },
    acceptOptional() { setState('accepted'); ui.bannerVisible = false; },
    rejectOptional() { setState('rejected'); ui.bannerVisible = false; },
    openSettings() { ui.settingsOpen = true; },
    withdrawOptional() { setState('withdrawn'); ui.settingsOpen = false; },
    interact(name) { bus.emit('ui:interact', {name}); },
    flush: () => analytics.flush(),
  };
  return page;
};
