// Framework-free search controllers. Plain state machines, no DOM, no timers.
// State: query, results, error, loading (+ generation for the corrected version).
import {isAbortError} from './mock-api.mjs';

class Store {
  constructor() {
    this.state = {query: '', results: null, error: null, loading: false};
    this.timeline = []; // every state write and every discarded outcome, in order
    this.stateWrites = 0;
    this.listeners = new Set();
  }
  generationValue() {
    return null;
  }
  snapshot() {
    const {query, results, error, loading} = this.state;
    return {
      query,
      loading,
      error,
      resultsFor: results ? results.query : null,
      resultsRequestId: results ? results.requestId : null,
      items: results ? [...results.items] : [],
      generation: this.generationValue(),
    };
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  write(event, patch) {
    this.state = {...this.state, ...patch};
    this.stateWrites++;
    this.timeline.push({seq: this.timeline.length + 1, kind: 'write', event, ...this.snapshot()});
    for (const fn of this.listeners) fn(this.snapshot());
  }
  discarded(event, extra) {
    // A discarded outcome never touches state; we only record that it happened.
    this.timeline.push({seq: this.timeline.length + 1, kind: 'discard', event, ...extra, ...this.snapshot()});
  }
}

/**
 * FLAWED: render every arriving response. No notion of "which request is current".
 * Kept as a known-positive control: tests assert the bug is observable here.
 */
export class FlawedSearchController extends Store {
  constructor(api) {
    super();
    this.api = api;
  }
  async search(query) {
    this.write(`start "${query}"`, {query, loading: true, error: null});
    try {
      const res = await this.api.search(query);
      this.write(`success "${res.query}" (${res.requestId})`, {results: res, error: null});
    } catch (e) {
      this.write(`error "${e.message}"`, {error: e.message});
    } finally {
      this.write('finally', {loading: false});
    }
  }
  clear() {
    this.write('clear', {query: '', results: null, error: null, loading: false}); // pending requests are not invalidated
  }
  dispose() {
    /* no-op: nothing stops late responses from writing state */
  }
}

/**
 * CORRECTED: request-generation guard.
 *  - every search() increments `generation` and captures the value
 *  - success, error AND finally only write state if the captured value is still current
 *  - clear() and dispose() also increment `generation`, invalidating everything pending
 *  - optional: abort superseded requests. Abort is an optimisation; the guard is what makes it correct.
 */
export class SearchController extends Store {
  constructor(api, {abortSuperseded = false} = {}) {
    super();
    this.api = api;
    this.abortSuperseded = abortSuperseded;
    this.generation = 0;
    this.disposed = false;
    this.abortController = null;
    this.discards = [];
  }
  generationValue() {
    return this.generation;
  }
  #abortInFlight() {
    if (this.abortSuperseded && this.abortController) this.abortController.abort();
    this.abortController = null;
  }
  #discard(path, gen, detail) {
    const entry = {path, generation: gen, current: this.generation, ...detail};
    this.discards.push(entry);
    this.discarded(`discard ${path} (gen ${gen} != ${this.generation})`, entry);
  }
  async search(query) {
    if (this.disposed) return;
    const gen = ++this.generation; // 1. new generation for every search
    this.#abortInFlight(); // optional: tell the transport the older request is no longer wanted
    const ac = this.abortSuperseded ? new AbortController() : null;
    this.abortController = ac;
    this.write(`start "${query}" gen ${gen}`, {query, loading: true, error: null});
    try {
      const res = await this.api.search(query, ac ? {signal: ac.signal} : {});
      if (gen !== this.generation) return this.#discard('success', gen, {query: res.query, requestId: res.requestId}); // 3a. success path
      this.write(`success "${res.query}" (${res.requestId}) gen ${gen}`, {results: res, error: null});
    } catch (e) {
      if (gen !== this.generation) return this.#discard('error', gen, {message: e.message, abort: isAbortError(e)}); // 3b. error path
      if (isAbortError(e)) return; // an abort is never a user-facing error (finally below still settles loading)
      this.write(`error "${e.message}" gen ${gen}`, {error: e.message});
    } finally {
      if (gen === this.generation) this.write(`finally gen ${gen}`, {loading: false}); // 3c. finally path
      else this.#discard('finally', gen, {});
    }
  }
  clear() {
    if (this.disposed) return;
    this.generation++; // invalidates every pending generation
    this.#abortInFlight();
    this.write(`clear gen ${this.generation}`, {query: '', results: null, error: null, loading: false});
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++; // invalidates every pending generation; late outcomes are discarded, state never written again
    this.#abortInFlight();
    this.listeners.clear();
    this.timeline.push({seq: this.timeline.length + 1, kind: 'dispose', event: `dispose gen ${this.generation}`, ...this.snapshot()});
  }
}
