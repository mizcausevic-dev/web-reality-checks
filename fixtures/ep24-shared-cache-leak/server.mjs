// Episode 24 fixture: a loopback-only dashboard with a deliberately flawed IN-PROCESS response cache.
// This is application code in this fixture, not a CDN, proxy or browser cache.
//
//   POST /login/:user   -> test harness: creates a server-side session, sets an opaque cookie
//   POST /logout
//   GET  /whoami        -> who the session table says you are (never cached)
//   GET  /dashboard     -> personalized page; behaviour depends on `mode`:
//        'flawed'               authenticate, then look in the shared cache keyed by PATH ONLY
//        'flawed-with-header'   same flawed cache code, but it also sends Cache-Control: private, no-store
//                               (the custom code never reads that header, so nothing changes)
//        'corrected'            bypass the shared cache; authenticate + authorize every request;
//                               render for the current user; Cache-Control: private, no-store
//
// Identity comes only from the server-side session table (opaque cookie -> user id).
// Synthetic users only. Session ids come from a seeded generator: fixture-only, NOT secure.
import http from 'node:http';

export const USERS = {
  alice: {id: 'u_alice', name: 'Alice', email: 'alice@example.test', permissions: new Set(['dashboard:read'])},
  bob: {id: 'u_bob', name: 'Bob', email: 'bob@example.test', permissions: new Set(['dashboard:read'])},
};

// Seeded PRNG (mulberry32) so session ids are reproducible. Not for real use.
const seeded = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The deliberately flawed piece: a shared in-process response cache. */
export class ResponseCache {
  constructor() { this.map = new Map(); this.stats = {reads: 0, hits: 0, writes: 0, purges: 0}; this.purgeLog = []; }
  get(key) { this.stats.reads++; const e = this.map.get(key); if (e) { this.stats.hits++; e.hits++; } return e ?? null; }
  set(key, entry) { this.stats.writes++; this.map.set(key, {...entry, hits: 0}); }
  has(key) { return this.map.has(key); }
  keys() { return [...this.map.keys()]; }
  get size() { return this.map.size; }
  peek(key) { return this.map.get(key) ?? null; } // inspection only: does not count as a read
  purge(key, reason) {
    const e = this.map.get(key);
    const removed = this.map.delete(key);
    if (removed) { this.stats.purges++; this.purgeLog.push({key, populatedBy: e.populatedBy, reason}); }
    return removed;
  }
}

/** THE FLAW: the key is the request path. The user whose data fills the response is not in it. */
export const cacheKey = (url) => url.pathname;

export function createApp({mode = 'flawed', seed = 24} = {}) {
  const rnd = seeded(seed);
  const sessions = new Map(); // opaque id -> {userId}
  const cache = new ResponseCache();
  let renderSeq = 0;
  const state = {mode};

  const userById = (id) => Object.values(USERS).find((u) => u.id === id) ?? null;
  const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
  const authenticate = (req) => { const sid = cookieOf(req).sid; const s = sid && sessions.get(sid); return s ? userById(s.userId) : null; };
  const authorize = (user) => user.permissions.has('dashboard:read');

  const render = (user) => ({
    greeting: `Welcome back, ${user.name}`,
    viewer: {id: user.id, name: user.name, email: user.email},
    renderSeq: ++renderSeq, // proves whether this response was rendered fresh for this request
  });

  const send = (res, code, headers, body, appCache) => {
    const h = {'content-type': 'application/json', ...headers};
    if (appCache) h['x-app-cache'] = appCache;
    res.writeHead(code, h);
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let m;
    if (req.method === 'POST' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
      const u = USERS[m[1]];
      if (!u) return send(res, 404, {}, {error: 'no such test user'});
      const sid = 'sid_' + Array.from({length: 4}, () => Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, '0')).join('');
      sessions.set(sid, {userId: u.id});
      return send(res, 200, {'set-cookie': `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`}, {ok: true, user: u.id});
    }
    if (req.method === 'POST' && url.pathname === '/logout') {
      const sid = cookieOf(req).sid; if (sid) sessions.delete(sid);
      return send(res, 200, {}, {ok: true});
    }
    if (req.method === 'GET' && url.pathname === '/whoami') {
      const user = authenticate(req);
      if (!user) return send(res, 401, {}, {error: 'unauthenticated'});
      return send(res, 200, {'cache-control': 'private, no-store'}, {id: user.id, name: user.name});
    }
    if (req.method === 'GET' && url.pathname === '/dashboard') {
      if (state.mode === 'corrected') {
        const hdr = {'cache-control': 'private, no-store'};
        const user = authenticate(req);
        if (!user) return send(res, 401, hdr, {error: 'unauthenticated'}, 'BYPASS');
        if (!authorize(user)) return send(res, 403, hdr, {error: 'forbidden'}, 'BYPASS');
        return send(res, 200, hdr, render(user), 'BYPASS'); // never touches the shared cache
      }
      // flawed and flawed-with-header
      const hdr = state.mode === 'flawed-with-header' ? {'cache-control': 'private, no-store'} : {};
      const user = authenticate(req);
      if (!user) return send(res, 401, hdr, {error: 'unauthenticated'});
      const key = cacheKey(url);
      const hit = cache.get(key); // note: the Cache-Control header is never consulted
      if (hit) return send(res, hit.status, hit.headers, hit.body, 'HIT');
      const body = JSON.stringify(render(user));
      cache.set(key, {status: 200, headers: hdr, body, populatedBy: user.id});
      return send(res, 200, hdr, body, 'MISS');
    }
    send(res, 404, {}, {error: 'not found'});
  });

  return {
    server, cache, state, sessions,
    listen: () => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port))),
    close: () => new Promise((resolve) => server.close(() => resolve())),
    /** Deploy the repair: switch the dashboard route to the bypass path; optionally purge the old shared entry. */
    repair({purge = true} = {}) {
      state.mode = 'corrected';
      const purged = purge ? cache.purge('/dashboard', 'repair: shared entry held one user\'s personalized page') : null;
      return {mode: state.mode, purged};
    },
  };
}
