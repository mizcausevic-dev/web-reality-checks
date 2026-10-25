// Episode 13 fixture: APPLICATION BACKEND (corrected architecture). Loopback only. Synthetic users only.
//
//   GET  /login/:user          -> test harness: server-side session, opaque cookie (not production auth)
//   POST /logout
//   GET  /config               -> browser-safe configuration: PUBLIC_PROJECT_ID only
//   GET  /project              -> public project info, fetched from the upstream's public endpoint
//   POST /privileged           -> body {operation}. Authenticates the user (session), authorises them
//                                 (role), validates the operation against an allow-list, then calls the
//                                 upstream with SERVER_SECRET_TOKEN from backend-only config. The upstream
//                                 response is re-shaped; the secret never appears in body or headers.
//   GET  /bundle/corrected/*   -> serves bundle-corrected/ (what the browser actually downloads)
//   GET  /bundle/flawed/*      -> serves bundle-flawed/ (the leaking variant, for inspection only)
//
// The backend is NOT an unrestricted proxy: it forwards exactly one named operation, chosen by the
// backend, for the project the backend knows about. Any other operation is rejected before any
// upstream call is made.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {PUBLIC_PROJECT_ID, SERVER_SECRET_TOKEN as FIXTURE_SECRET} from './upstream.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);

// Backend-only configuration. In a deployment this comes from the environment / a secret store;
// here the fixture value is the default so the tests run without setup.
export const config = {
  publicProjectId: PUBLIC_PROJECT_ID,
  serverSecretToken: process.env.EP13_SERVER_SECRET_TOKEN || FIXTURE_SECRET,
  upstreamBase: null, // set by createBackend()
};

export const users = {
  mara: {id: 'u_mara', role: 'maintainer'}, // may rotate the webhook
  vik: {id: 'u_vik', role: 'viewer'},        // may not
};
const sessions = new Map();

// The ONLY operation the backend will ever ask the upstream to perform, and who may request it.
export const ALLOWED_OPERATIONS = {rotate_webhook: {roles: ['maintainer']}};

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const currentUser = (req) => { const sid = cookieOf(req).sid; const s = sid && sessions.get(sid); return s ? Object.values(users).find((u) => u.id === s.userId) : null; };
const readJson = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve(null); } }); });
const MIME = {'.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.map': 'application/json'};

export const createBackend = (upstreamBase) => {
  config.upstreamBase = upstreamBase;
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let m;
    if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
      const u = users[m[1]]; if (!u) return json(res, 404, {error: 'no such test user'});
      const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, {userId: u.id});
      res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
      return json(res, 200, {ok: true, user: u.id, role: u.role});
    }
    if (req.method === 'POST' && url.pathname === '/logout') { sessions.delete(cookieOf(req).sid); return json(res, 200, {ok: true}); }

    // Static bundles: what a browser would download.
    if (req.method === 'GET' && (m = url.pathname.match(/^\/bundle\/(flawed|corrected)\/([\w.-]+)$/))) {
      const file = path.join(here, `bundle-${m[1]}`, m[2]);
      if (!fs.existsSync(file)) return json(res, 404, {error: 'not found'});
      res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'});
      return res.end(fs.readFileSync(file));
    }

    // Browser-safe config payload. Deliberately contains the identifier and nothing else.
    if (req.method === 'GET' && url.pathname === '/config') return json(res, 200, {publicProjectId: config.publicProjectId});

    if (req.method === 'GET' && url.pathname === '/project') {
      const r = await fetch(`${config.upstreamBase}/public/${config.publicProjectId}`);
      return json(res, r.status, await r.json());
    }

    if (req.method === 'POST' && url.pathname === '/privileged') {
      const user = currentUser(req);
      if (!user) return json(res, 401, {error: 'unauthenticated'});               // 1. who is asking?
      const body = await readJson(req);
      const op = body?.operation;
      const rule = ALLOWED_OPERATIONS[op];
      if (!rule) return json(res, 400, {error: 'operation not permitted by this backend'}); // 2. is this something we do at all?
      if (!rule.roles.includes(user.role)) return json(res, 403, {error: 'forbidden for this user'}); // 3. may THIS user do it?
      // 4. perform it upstream, with the backend's own credential, for the backend's own project.
      const r = await fetch(`${config.upstreamBase}/privileged`, {
        method: 'POST',
        headers: {'content-type': 'application/json', authorization: `Bearer ${config.serverSecretToken}`},
        body: JSON.stringify({operation: op, projectId: config.publicProjectId}),
      });
      const up = await r.json();
      if (!r.ok) return json(res, 502, {error: 'upstream rejected the operation', upstreamStatus: r.status});
      // 5. re-shape: only fields the browser needs. Nothing from the upstream request headers.
      return json(res, 200, {ok: true, operation: op, performedBy: user.id, webhookVersion: up.webhookVersion});
    }
    json(res, 404, {error: 'not found'});
  });
};

export const listenBackend = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

if (import.meta.url === `file://${process.argv[1]}`) {
  const {listenUpstream} = await import('./upstream.mjs');
  const up = await listenUpstream();
  const be = createBackend(`http://127.0.0.1:${up}`);
  const p = await listenBackend(be);
  console.log(`ep13 upstream on http://127.0.0.1:${up}\nep13 backend  on http://127.0.0.1:${p}  (try /bundle/corrected/index.html)`);
}
