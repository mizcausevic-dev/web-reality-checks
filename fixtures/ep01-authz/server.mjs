// Episode 01 fixture: minimal project-management API with a deliberately vulnerable
// project-read endpoint and a corrected one. Loopback only. Synthetic users only.
//
//   GET  /login/:user           -> test harness: establishes a server-side session, sets cookie
//   GET  /vuln/projects/:id     -> VULNERABLE: authenticated? yes -> return project by id (no ownership check)
//   GET  /projects/:id          -> CORRECTED: lookup by (id, ownerId of session user); 404 if absent/inaccessible
//   POST /logout
//
// Identity comes only from the server-side session table keyed by an opaque cookie.
// Any client-supplied user id (header, query, body) is ignored by design.
import http from 'node:http';
import crypto from 'node:crypto';

export const db = {
  users: {alice: {id: 'u_alice', name: 'Alice'}, bob: {id: 'u_bob', name: 'Bob'}},
  projects: {
    p_1001: {id: 'p_1001', ownerId: 'u_alice', name: 'Alice private roadmap', notes: 'alice-only'},
    p_2002: {id: 'p_2002', ownerId: 'u_bob', name: 'Bob private budget', notes: 'bob-only'},
  },
};
const sessions = new Map(); // opaque id -> {userId}

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const currentUser = (req) => { const sid = cookieOf(req).sid; const s = sid && sessions.get(sid); return s ? db.users[Object.keys(db.users).find((k) => db.users[k].id === s.userId)] : null; };

// Vulnerable lookup: by id only.
export const findProjectById = (id) => db.projects[id] ?? null;
// Corrected lookup: by id AND owner. One query, one condition set.
export const findProjectForOwner = (id, ownerId) => { const p = db.projects[id]; return p && p.ownerId === ownerId ? p : null; };

export const app = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let m;
  if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
    const u = db.users[m[1]]; if (!u) return json(res, 404, {error: 'no such test user'});
    const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, {userId: u.id});
    res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
    return json(res, 200, {ok: true, user: u.id});
  }
  if (req.method === 'POST' && url.pathname === '/logout') { const sid = cookieOf(req).sid; sessions.delete(sid); return json(res, 200, {ok: true}); }

  const user = currentUser(req);
  if (req.method === 'GET' && (m = url.pathname.match(/^\/vuln\/projects\/(\w+)$/))) {
    if (!user) return json(res, 401, {error: 'unauthenticated'});
    const p = findProjectById(m[1]);                 // <-- missing: AND p.ownerId === user.id
    if (!p) return json(res, 404, {error: 'not found'});
    return json(res, 200, {endpoint: 'vulnerable', authenticatedAs: user.id, project: p});
  }
  if (req.method === 'GET' && (m = url.pathname.match(/^\/projects\/(\w+)$/))) {
    if (!user) return json(res, 401, {error: 'unauthenticated'});
    const p = findProjectForOwner(m[1], user.id);     // ownership-scoped query
    if (!p) return json(res, 404, {error: 'not found'}); // absent OR inaccessible -> 404 (deliberate policy)
    return json(res, 200, {endpoint: 'corrected', authenticatedAs: user.id, project: p});
  }
  json(res, 404, {error: 'not found'});
});

export const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
if (import.meta.url === `file://${process.argv[1]}`) listen().then((p) => console.log(`ep01 fixture on http://127.0.0.1:${p}`));
