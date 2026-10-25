// SIMULATED CLIENT STATE. No real browser is available in this environment and none is driven here.
// BrowserSim is a plain object that remembers the search results it previously fetched, the way an
// already-open page keeps showing the list it rendered earlier. It has no DOM, no service worker,
// no HTTP cache, no tabs. It only models one fact: data the client already holds is not recalled by
// a server-side delete; it changes only when the client fetches again.
export class BrowserSim {
  constructor(base) {
    this.base = base;
    this.panels = new Map(); // query -> {ids, fetches, xCache}
  }
  async search(q) {
    const r = await fetch(`${this.base}/search?q=${encodeURIComponent(q)}`);
    const body = await r.json();
    const prev = this.panels.get(q);
    this.panels.set(q, {ids: body.results.map((x) => x.id), fetches: (prev?.fetches ?? 0) + 1, xCache: r.headers.get('x-cache')});
    return this.panels.get(q);
  }
  /** What the already-open display currently shows for this query (no network). */
  displayed(q) {
    return this.panels.get(q)?.ids ?? [];
  }
  /** User presses refresh: a new fetch of the same query replaces the displayed list. */
  refresh(q) {
    return this.search(q);
  }
}
