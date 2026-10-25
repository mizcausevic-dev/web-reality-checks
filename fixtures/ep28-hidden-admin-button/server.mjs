// Episode 28 fixture: "Why hiding an admin button is not security".
//
// One privileged but harmless action: publish a synthetic announcement.
// Two endpoints that differ in exactly ONE thing:
//
//   POST /vuln/announcements   FLAWED     authenticate -> CSRF -> insert          (no permission check)
//   POST /announcements        CORRECTED  authenticate -> CSRF -> PERMISSION -> insert
//
// Both versions share the same UI render function; the publish button is hidden from the member in BOTH:
//   GET /vuln/app , GET /app   -> HTML (button present only when the server-side store says "can publish")
//
// Three separate questions, three separate answers:
//   authentication  no valid server-side session            -> 401 unauthenticated
//   CSRF            missing/invalid double-submit token     -> 403 code EBADCSRFTOKEN (csrf_invalid)
//   authorization   session user lacks announcement:publish -> 403 code PERMISSION_DENIED (forbidden)
//
// Scope: this demonstrates FUNCTION-LEVEL permission checks ("may this role perform this action at all?").
// It does NOT demonstrate object-level ownership checks (EP01 covers that).
//
// CSRF: csrf-csrf 3.1.0 (same library and pin as the EP03 fixture), double-submit token bound to the
// server-side session id. Express has no built-in CSRF protection, so "the framework's CSRF protection"
// here means this maintained library, not hand-rolled code.
//
// Storage: node:sqlite in-memory database (users, user_roles, role_permissions, sessions, announcements).
// Identity and permission come ONLY from those tables. Any role/permission claim in the request is ignored.
// Loopback only (127.0.0.1, ephemeral port). Synthetic users only.
import express from 'express';
import cookieParser from 'cookie-parser';
import {doubleCsrf} from 'csrf-csrf';
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'sid';
export const CSRF_COOKIE = 'wrc.x-csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
export const PUBLISH = 'announcement:publish';

export const seedUsers = [
  {id: 'u_admin', name: 'Ada (administrator)', role: 'admin'},
  {id: 'u_member', name: 'Max (member)', role: 'member'},
];

export const openDb = () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE user_roles (user_id TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE role_permissions (role TEXT NOT NULL, permission TEXT NOT NULL);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, published_by TEXT NOT NULL);
  `);
  for (const u of seedUsers) {
    db.prepare('INSERT INTO users VALUES (?, ?)').run(u.id, u.name);
    db.prepare('INSERT INTO user_roles VALUES (?, ?)').run(u.id, u.role);
  }
  db.prepare('INSERT INTO role_permissions VALUES (?, ?)').run('admin', PUBLISH);
  db.prepare('INSERT INTO role_permissions VALUES (?, ?)').run('member', 'announcement:read');
  db.prepare('INSERT INTO role_permissions VALUES (?, ?)').run('admin', 'announcement:read');
  db.prepare('INSERT INTO announcements (title, body, published_by) VALUES (?, ?, ?)').run('Welcome', 'Seed announcement.', 'u_admin');
  return db;
};

/** Current permission, read from the server-side store at call time (never cached in the session). */
export const hasPermission = (db, userId, permission) =>
  Boolean(db.prepare(
    `SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role = ur.role
     WHERE ur.user_id = ? AND rp.permission = ? LIMIT 1`).get(userId, permission));

export const announcementCount = (db) => db.prepare('SELECT COUNT(*) AS n FROM announcements').get().n;
export const listAnnouncements = (db) => db.prepare('SELECT id, title, published_by FROM announcements ORDER BY id').all();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/**
 * The interface decision. Same function for the flawed and the corrected version.
 * The publish button is rendered only when the server-side store says the viewer may publish.
 * This is presentation: it controls what a person sees, not what the server will accept.
 */
export const renderApp = ({user, canPublish, action, csrfToken}) => `<!doctype html>
<html><body>
<h1>Announcements</h1>
<p data-testid="viewer">Signed in as ${esc(user.name)}</p>
${canPublish
    ? `<form method="post" action="${esc(action)}" data-testid="publish-form"><input name="title"><input name="body"><input type="hidden" name="csrf" value="${esc(csrfToken)}"><button data-testid="publish-button">Publish announcement</button></form>`
    : '<p data-testid="read-only">Read-only view</p>'}
</body></html>`;

/**
 * @param {{db?: DatabaseSync, trace?: string[]}} opts  `trace` (tests only) records the order of server-side steps.
 */
export const createApp = ({db = openDb(), trace = []} = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({extended: false}));

  const sessionIdOf = (req) => req.cookies?.[SESSION_COOKIE];
  const lookupSession = (sid) => (sid ? db.prepare('SELECT s.id, s.user_id AS userId, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(sid) : undefined);

  // 1. AUTHENTICATION: is there a live server-side session? (401 otherwise, before anything else)
  const authenticate = (req, res, next) => {
    trace.push('authenticate');
    const s = lookupSession(sessionIdOf(req));
    if (!s) return res.status(401).json({error: 'unauthenticated', code: 'NO_SESSION'});
    req.sessionId = s.id;
    req.user = {id: s.userId, name: s.name};
    next();
  };

  // 2. CSRF: cookie-authenticated state change must carry a token bound to THIS session id.
  const csrfSecret = crypto.randomBytes(32).toString('hex');
  const {generateToken, doubleCsrfProtection} = doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier: (req) => req.sessionId,
    cookieName: CSRF_COOKIE,
    cookieOptions: {httpOnly: true, secure: false, sameSite: 'lax', path: '/'}, // plain HTTP on loopback; a deployed site would set secure: true
    getTokenFromRequest: (req) => req.headers[CSRF_HEADER],
    errorConfig: {statusCode: 403, message: 'invalid csrf token', code: 'EBADCSRFTOKEN'},
  });
  const csrf = (req, res, next) => { trace.push('csrf'); doubleCsrfProtection(req, res, next); };

  // 3. AUTHORIZATION: current permission from the server-side store, BEFORE any side effect.
  //    Nothing from the request body, query or headers is consulted.
  const requirePermission = (permission) => (req, res, next) => {
    trace.push('permission');
    if (!hasPermission(db, req.user.id, permission)) return res.status(403).json({error: 'forbidden', code: 'PERMISSION_DENIED', required: permission});
    next();
  };

  const insertAnnouncement = (req, res, endpoint) => {
    const {title, body} = req.body ?? {}; // NOTE: any `role` / `permissions` field in the body is deliberately never read
    if (typeof title !== 'string' || !title.trim() || title.length > 80 || typeof body !== 'string' || body.length > 500) return res.status(400).json({error: 'invalid announcement', code: 'BAD_INPUT'});
    trace.push('insert');
    const info = db.prepare('INSERT INTO announcements (title, body, published_by) VALUES (?, ?, ?)').run(title.trim(), body, req.user.id);
    res.status(201).json({endpoint, published: true, id: Number(info.lastInsertRowid), publishedBy: req.user.id});
  };

  // Fixture-only test harness for a session (stands in for sign-in, which EP03 covers).
  app.get('/_fixture/login/:user', (req, res) => {
    const u = db.prepare('SELECT id FROM users WHERE id = ?').get(`u_${req.params.user}`);
    if (!u) return res.status(404).json({error: 'no such test user'});
    const sid = crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?, ?)').run(sid, u.id);
    res.cookie(SESSION_COOKIE, sid, {httpOnly: true, sameSite: 'lax', path: '/'});
    res.json({ok: true, user: u.id});
  });
  app.post('/_fixture/logout', authenticate, (req, res) => { db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId); res.json({ok: true}); });

  // Token for the current session (authentication required: the token is bound to the session id).
  app.get('/csrf-token', authenticate, (req, res) => res.json({csrfToken: generateToken(req, res, true)}));

  // UI (identical render function for both versions; only the form target differs).
  const ui = (action) => (req, res, next) => authenticate(req, res, () => {
    const canPublish = hasPermission(db, req.user.id, PUBLISH);
    res.type('html').send(renderApp({user: req.user, canPublish, action, csrfToken: canPublish ? generateToken(req, res, false) : '' /* reuse the live token; do not rotate it under the page */}));
  });
  app.get('/vuln/app', ui('/vuln/announcements'));
  app.get('/app', ui('/announcements'));

  app.get('/announcements', authenticate, (req, res) => res.json({announcements: listAnnouncements(db)}));

  // FLAWED: authenticated + CSRF-valid is treated as "allowed".
  app.post('/vuln/announcements', authenticate, csrf, (req, res) => insertAnnouncement(req, res, 'vulnerable'));
  // CORRECTED: the same chain plus one permission gate before the side effect.
  app.post('/announcements', authenticate, csrf, requirePermission(PUBLISH), (req, res) => insertAnnouncement(req, res, 'corrected'));

  app.use((req, res) => res.status(404).json({error: 'not found'}));
  app.use((err, req, res, _next) => {
    if (err && err.code === 'EBADCSRFTOKEN') return res.status(403).json({error: 'csrf_invalid', code: 'EBADCSRFTOKEN'});
    res.status(500).json({error: 'server error'});
  });

  const listen = () => new Promise((resolve) => { const srv = app.listen(0, '127.0.0.1', () => resolve({port: srv.address().port, close: () => srv.close()})); });
  return {app, db, trace, listen};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const {listen} = createApp();
  const {port} = await listen();
  console.log(`ep28 fixture on http://127.0.0.1:${port}`);
}
