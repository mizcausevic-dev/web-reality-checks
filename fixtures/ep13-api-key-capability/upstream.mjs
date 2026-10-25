// Episode 13 fixture: MOCK UPSTREAM SERVICE (a fictional vendor API). Loopback only.
//
//   GET  /public/:projectId   -> public information about a project. No credential needed.
//   POST /privileged          -> one privileged operation. Requires
//                                Authorization: Bearer <SERVER_SECRET_TOKEN>.
//                                401 if no bearer credential, 403 if the credential does not authorise.
//
// Two values are "issued" by this fictional vendor:
//   PUBLIC_PROJECT_ID   — an identifier. It names a project. It authorises nothing.
//   SERVER_SECRET_TOKEN — a bearer credential. Possession performs the privileged operation.
// Both are SYNTHETIC. They do not correspond to any real provider, format or policy.
import http from 'node:http';

export const PUBLIC_PROJECT_ID = 'proj_pub_7f3a21';
export const SERVER_SECRET_TOKEN = 'srv_secret_SYNTHETIC_9c1e4b7d2f60a3';

// Operations the upstream will perform for the holder of the secret. Deliberately broader
// than what the application backend should ever expose (see backend.mjs ALLOWED_OPERATIONS).
export const UPSTREAM_OPERATIONS = ['rotate_webhook', 'delete_project'];

export const projects = {
  [PUBLIC_PROJECT_ID]: {projectId: PUBLIC_PROJECT_ID, name: 'Synthetic Demo Project', region: 'local', plan: 'sandbox', webhookVersion: 1},
};

// Observable state for tests: how many privileged calls reached the upstream, and with what outcome.
export const state = {privilegedAttempts: 0, privilegedSucceeded: 0, log: []};

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const readJson = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve(null); } }); });

export const upstream = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let m;
  if (req.method === 'GET' && (m = url.pathname.match(/^\/public\/([\w-]+)$/))) {
    const p = projects[m[1]];
    if (!p) return json(res, 404, {error: 'unknown project'});
    const {webhookVersion, ...pub} = p; // public view only
    return json(res, 200, pub);
  }
  if (req.method === 'POST' && url.pathname === '/privileged') {
    state.privilegedAttempts++;
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const body = await readJson(req);
    // Log only a redacted prefix of whatever was presented; never the full credential.
    const outcome = (code, payload) => { state.log.push({credentialPresented: bearer ? bearer.slice(0, 9) + '…' : null, status: code}); return json(res, code, payload); };
    if (!bearer) return outcome(401, {error: 'missing bearer credential'});
    if (bearer !== SERVER_SECRET_TOKEN) return outcome(403, {error: 'credential does not authorise this operation'});
    if (!body || !UPSTREAM_OPERATIONS.includes(body.operation)) return outcome(400, {error: 'unknown operation'});
    const p = projects[body.projectId];
    if (!p) return outcome(404, {error: 'unknown project'});
    state.privilegedSucceeded++;
    if (body.operation === 'rotate_webhook') { p.webhookVersion++; return outcome(200, {ok: true, operation: 'rotate_webhook', projectId: p.projectId, webhookVersion: p.webhookVersion}); }
    // delete_project exists upstream so the secret is visibly MORE powerful than the one operation
    // the backend exposes. It is never reachable through the corrected backend.
    return outcome(200, {ok: true, operation: 'delete_project', projectId: p.projectId, note: 'simulated; project state retained for the fixture'});
  }
  json(res, 404, {error: 'not found'});
});

export const listenUpstream = () => new Promise((r) => upstream.listen(0, '127.0.0.1', () => r(upstream.address().port)));
if (import.meta.url === `file://${process.argv[1]}`) listenUpstream().then((p) => console.log(`ep13 mock upstream on http://127.0.0.1:${p}`));
