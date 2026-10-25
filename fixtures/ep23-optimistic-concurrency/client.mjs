// A minimal "editor" client. Each instance is an INDEPENDENT client: its own session cookie and its own
// local copy of the document. This stands in for two browser tabs/contexts; no real browser is involved.
//
// Client-side rules this episode is about:
//   - save() sends the loaded version as expectedVersion with the whole local document.
//   - On 409 the unsaved local text is PRESERVED, the current server document is kept for comparison,
//     and the client refuses to save again until the person resolves explicitly.
//   - There is NO automatic retry and NO automatic merge.
export class EditorClient {
  constructor(base, name) {
    this.base = base; this.name = name; this.cookie = '';
    this.docId = null; this.baseVersion = null; this.base_ = null; this.local = null;
    this.state = 'empty'; // empty | clean | dirty | conflict | save-failed
    this.conflict = null; // {server, yours, loadedVersion}
    this.sent = [];       // every PUT this client issued: {path, expectedVersion, status}
    this.lastError = null;
  }
  async login(user) {
    const r = await fetch(`${this.base}/login/${user}`);
    this.cookie = r.headers.get('set-cookie').split(';')[0];
    return this;
  }
  #req(path, init = {}) { return fetch(this.base + path, {...init, headers: {cookie: this.cookie, 'content-type': 'application/json', ...(init.headers || {})}}); }
  async load(docId) {
    const r = await this.#req(`/docs/${docId}`);
    if (r.status !== 200) throw new Error(`load failed: ${r.status}`);
    const d = await r.json();
    this.docId = docId; this.baseVersion = d.version;
    this.base_ = {title: d.title, body: d.body}; this.local = {title: d.title, body: d.body};
    this.state = 'clean'; this.conflict = null;
    return d;
  }
  edit(patch) { this.local = {...this.local, ...patch}; this.state = 'dirty'; return this; }
  /** One save attempt. `vuln: true` targets the flawed unconditional endpoint. Never retries. */
  async save({vuln = false, headers = {}} = {}) {
    if (this.state === 'conflict') throw new Error('unresolved conflict: call resolve() before saving again');
    const payload = vuln ? {...this.local} : {...this.local, expectedVersion: this.baseVersion};
    const path = `${vuln ? '/vuln' : ''}/docs/${this.docId}`;
    const r = await this.#req(path, {method: 'PUT', body: JSON.stringify(payload), headers});
    const body = await r.json();
    this.sent.push({path, expectedVersion: vuln ? null : this.baseVersion, status: r.status});
    if (r.status === 200) {
      this.baseVersion = body.version; this.base_ = {...this.local}; this.state = 'clean'; this.lastError = null;
    } else if (r.status === 409) {
      // keep unsaved text exactly as typed; keep the server's current document for comparison
      this.conflict = {loadedVersion: this.baseVersion, server: body.current, yours: {...this.local}};
      this.state = 'conflict';
    } else {
      // 503/500/400: not a version conflict. Keep local text and the loaded version; nothing is decided.
      this.lastError = {status: r.status, error: body.error}; this.state = 'save-failed';
    }
    return {status: r.status, body};
  }
  /** Explicit resolution after a conflict. Does not send anything; the next save() is a deliberate act. */
  resolve(choice, merged) {
    if (this.state !== 'conflict') throw new Error('nothing to resolve');
    const {server, yours} = this.conflict;
    if (choice === 'take-theirs') { this.local = {title: server.title, body: server.body}; this.base_ = {...this.local}; this.baseVersion = server.version; this.state = 'clean'; }
    else if (choice === 'keep-mine') { this.local = {...yours}; this.baseVersion = server.version; this.state = 'dirty'; } // explicit overwrite of server.version
    else if (choice === 'merged') { this.local = {...merged}; this.baseVersion = server.version; this.state = 'dirty'; } // human-composed content
    else throw new Error('unknown resolution');
    this.conflict = null;
    return this;
  }
}
