// A small, deterministic model of a service-worker REGISTRATION state machine:
// installing → installed(waiting) → activating → activated; plus the page's controller.
// It exists to test the app's decision logic (app.js @@logic block) and the single-reload
// guard WITHOUT a browser. It is a model, not a browser: no real lifecycle event is produced.
// The model also runs the worker's install/activate/message handlers against a fake
// CacheStorage so the cache-cleanup policy can be asserted.
import fs from 'node:fs';
import vm from 'node:vm';

const here = new URL('./', import.meta.url);

/* ---------- fake CacheStorage ---------- */
export class FakeCaches {
  constructor(names = []) { this.store = new Map(names.map((n) => [n, new Set()])); }
  async keys() { return [...this.store.keys()]; }
  async open(n) { if (!this.store.has(n)) this.store.set(n, new Set()); const s = this.store.get(n); return {addAll: async (urls) => { urls.forEach((u) => s.add(u)); }, match: async () => undefined}; }
  async delete(n) { return this.store.delete(n); }
}

/* ---------- a worker instance: runs real sw.js source in a sandbox ---------- */
export class Worker {
  constructor(source, caches, label) {
    this.label = label; this.state = 'parsed'; this.skipWaitingCalled = false; this.claimed = false;
    this.handlers = {};
    const self = {
      addEventListener: (type, fn) => { this.handlers[type] = fn; },
      skipWaiting: () => { this.skipWaitingCalled = true; },
      clients: {claim: async () => { this.claimed = true; }},
      location: {origin: 'http://127.0.0.1'},
    };
    this.caches = caches;
    vm.runInNewContext(source, {self, caches, URL, fetch: async () => ({}), console});
    this.cacheName = /CACHE = PREFIX \+ 'v' \+ BUILD/.test(source) ? 'wrc-ep12-v' + source.match(/const BUILD = (\d+);/)[1] : null;
  }
  async dispatch(type, event = {}) {
    const waits = [];
    const ev = {...event, waitUntil: (p) => waits.push(p), respondWith: () => {}};
    this.handlers[type]?.(ev);
    await Promise.all(waits);
  }
}

/* ---------- the registration + one controlled client page ---------- */
export class Registration {
  constructor({caches = new FakeCaches()} = {}) {
    this.caches = caches; this.installing = null; this.waiting = null; this.active = null;
    this.controller = null;     // the worker controlling the one modelled page
    this.events = [];           // ordered trace of lifecycle events (for evidence.json)
    this.scriptBytes = null;    // last installed script source
    this.controllerChangeListeners = [];
  }
  log(e) { this.events.push(e); }
  snapshot() { const s = (w) => (w ? {label: w.label, state: w.state} : null); return {installing: s(this.installing), waiting: s(this.waiting), active: s(this.active), controller: s(this.controller)}; }

  /** register()/update(): fetch the script; byte-identical ⇒ no new worker. */
  async update(source, label) {
    this.log({ev: 'update-check', label});
    if (this.scriptBytes !== null && source === this.scriptBytes) { this.log({ev: 'no-update', reason: 'byte-identical script'}); return null; }
    const w = new Worker(source, this.caches, label);
    this.scriptBytes = source;
    this.installing = w; w.state = 'installing'; this.log({ev: 'updatefound', worker: label});
    await w.dispatch('install');
    w.state = 'installed'; this.installing = null; this.log({ev: 'installed', worker: label, cacheName: w.cacheName});
    if (!this.active) {                       // first install: nothing to wait for
      await this.activate(w);
      // first-install policy: the worker calls clients.claim() in activate, so the open page becomes controlled.
      if (w.claimed) this.setController(w, 'clients.claim() on first install');
    } else {
      this.waiting = w; w.state = 'installed'; this.log({ev: 'waiting', worker: label, behind: this.active.label});
    }
    return w;
  }

  /** Page posts a message to a specific worker. */
  async postMessage(worker, data) {
    this.log({ev: 'message', to: worker.label, data});
    await worker.dispatch('message', {data});
    if (worker.skipWaitingCalled && this.waiting === worker) {
      this.log({ev: 'skipWaiting', worker: worker.label});
      await this.activate(worker);
    }
  }

  async activate(w) {
    const old = this.active;
    if (old) { old.state = 'redundant'; this.log({ev: 'redundant', worker: old.label}); }
    this.waiting = null; this.active = w; w.state = 'activating'; this.log({ev: 'activating', worker: w.label});
    await w.dispatch('activate');
    w.state = 'activated'; this.log({ev: 'activated', worker: w.label, cachesAfter: await this.caches.keys()});
    // Pages controlled by the old worker move to the new one → controllerchange on each.
    if (old && this.controller === old) this.setController(w, 'skipWaiting activation');
  }

  setController(w, why) {
    this.controller = w; this.log({ev: 'controllerchange', controller: w.label, why});
    this.controllerChangeListeners.forEach((fn) => fn());
  }
  onControllerChange(fn) { this.controllerChangeListeners.push(fn); }
}

/* ---------- extract the page's pure decision logic from the real app.js ---------- */
export const loadAppLogic = (build = 1) => {
  const src = fs.readFileSync(new URL(`./build${build}/app.js`, here), 'utf8');
  const m = src.match(/\/\/ @@logic-start[\s\S]*?\n([\s\S]*?)\/\/ @@logic-end/);
  if (!m) throw new Error('logic block not found in app.js');
  const ctx = {};
  vm.runInNewContext(m[1] + '\nthis.updateAvailable = updateAvailable; this.makeControllerChangeHandler = makeControllerChangeHandler;', ctx);
  return {updateAvailable: ctx.updateAvailable, makeControllerChangeHandler: ctx.makeControllerChangeHandler};
};

export const readSw = (build) => fs.readFileSync(new URL(`./build${build}/sw.js`, here), 'utf8');
