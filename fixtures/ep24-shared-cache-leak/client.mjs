// A "browser context" in this fixture is just an independent client instance with its own cookie jar.
// There is no real browser here. Two Client objects share nothing but the server they talk to.
export class Client {
  constructor(base, label) { this.base = base; this.label = label; this.jar = {}; this.history = []; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  async request(method, path) {
    const headers = {}; const c = this.cookieHeader(); if (c) headers.cookie = c;
    const r = await fetch(this.base + path, {method, headers, redirect: 'manual'});
    const sc = r.headers.get('set-cookie');
    if (sc) { const [kv] = sc.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0, i)] = kv.slice(i + 1); }
    const text = await r.text();
    let body = null; try { body = JSON.parse(text); } catch { body = text; }
    const rec = {method, path, status: r.status, headers: Object.fromEntries(r.headers), body};
    this.history.push(rec);
    return rec;
  }
  get(path) { return this.request('GET', path); }
  async login(user) { return this.request('POST', `/login/${user}`); }
}
