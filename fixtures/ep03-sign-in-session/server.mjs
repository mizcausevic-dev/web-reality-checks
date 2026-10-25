// Episode 03 fixture: email/password sign-in with a server-side session identified by an
// opaque cookie. One implementation, not the architecture of every sign-in system.
//
// Libraries (maintained, not hand-rolled):
//   argon2          password hashing (argon2id, random per-hash salt)      -> never reversible
//   express-session server-side session store + opaque session id cookie   -> MemoryStore here (NOT for production)
//   csrf-csrf       double-submit CSRF tokens bound to the session id       -> required on login and logout
//
// Routes
//   GET  /csrf-token          -> creates a pre-auth session if needed, returns a CSRF token (JSON)
//   POST /login               -> CSRF-protected; argon2.verify; on success session.regenerate() (fresh id)
//   GET  /me                  -> session check only
//   GET  /admin/audit         -> session check, THEN separate permission check (role === 'admin')
//   POST /logout              -> CSRF-protected; destroys server-side session; expires the cookie
//   GET  /logout              -> 405 (state changes never ride on GET)
//   GET  /_fixture/session-id -> FIXTURE-ONLY introspection so tests can prove the id changed
//
// HTTPS: this environment has no trusted local CA. The app runs over plain HTTP with
// `cookie.secure = true` and `trust proxy = 1`; tests send `X-Forwarded-Proto: https` so
// express-session issues the Secure cookie. The TLS exchange itself is NOT executed here.
//
// Loopback only. Synthetic users only.
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import {doubleCsrf} from 'csrf-csrf';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'sid';
export const CSRF_COOKIE = '__Host-wrc.x-csrf-token';
export const CSRF_HEADER = 'x-csrf-token';

// Synthetic users. Passwords exist only so the fixture can log in; hashes are computed at start-up.
export const seedUsers = [
  {id: 'u_alice', email: 'alice@example.test', password: 'correct horse battery staple', role: 'member'},
  {id: 'u_carol', email: 'carol@example.test', password: 'tr0ub4dor&3 but longer', role: 'admin'},
];

export const hashPassword = (pw) => argon2.hash(pw, {type: argon2.argon2id});
export const verifyPassword = (hash, pw) => argon2.verify(hash, pw);

export const buildUserDb = async () => {
  const byEmail = new Map();
  for (const u of seedUsers) byEmail.set(u.email, {id: u.id, email: u.email, role: u.role, passwordHash: await hashPassword(u.password)});
  return byEmail;
};

/**
 * @param {{regenerateOnLogin?: boolean}} opts  regenerateOnLogin=false is the FLAWED variant used only
 *        as a known-positive control in tests (session id survives authentication = fixation risk).
 */
export const createApp = async ({regenerateOnLogin = true} = {}) => {
  const users = await buildUserDb();
  const app = express();
  app.set('trust proxy', 1); // so X-Forwarded-Proto: https counts as a secure request
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  const store = new session.MemoryStore(); // fine for a loopback fixture; NOT for production
  app.use(session({
    name: SESSION_COOKIE,
    secret: crypto.randomBytes(32).toString('hex'), // per-process; fixture only
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 60 * 1000}, // no Domain => host-only
  }));

  const csrfSecret = crypto.randomBytes(32).toString('hex');
  const {generateToken, doubleCsrfProtection} = doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier: (req) => req.session.id, // token is only valid for the session that requested it
    cookieName: CSRF_COOKIE,
    cookieOptions: {httpOnly: true, secure: true, sameSite: 'lax', path: '/'},
    getTokenFromRequest: (req) => req.headers[CSRF_HEADER],
    errorConfig: {statusCode: 403, message: 'invalid csrf token', code: 'EBADCSRFTOKEN'},
  });

  // Session validity: is there a live server-side session with an authenticated user?
  const requireSession = (req, res, next) => {
    if (!req.session || !req.session.userId) return res.status(401).json({error: 'no valid session'});
    next();
  };
  // Permission: a separate question from "who are you?"
  const requireRole = (role) => (req, res, next) => {
    if (req.session.role !== role) return res.status(403).json({error: 'forbidden', required: role, actual: req.session.role});
    next();
  };

  app.get('/csrf-token', (req, res) => {
    req.session.preauth = true; // touch so a (pre-authentication) session + cookie exist
    // overwrite=true: always mint a token bound to the CURRENT session id (a stale token from a
    // pre-auth session is useless after regenerate(), by design)
    res.json({csrfToken: generateToken(req, res, true)});
  });

  app.post('/login', doubleCsrfProtection, async (req, res) => {
    const {email, password} = req.body ?? {};
    const u = typeof email === 'string' ? users.get(email) : undefined;
    // Verify against a dummy hash when the user is unknown so timing is similar; same 401 either way.
    const ok = u ? await verifyPassword(u.passwordHash, String(password ?? '')) : (await verifyPassword(DUMMY_HASH, String(password ?? '')), false);
    if (!ok) return res.status(401).json({error: 'invalid credentials'});
    const preAuthId = req.session.id;
    const finish = () => {
      req.session.userId = u.id;
      req.session.role = u.role;
      delete req.session.preauth;
      // the pre-auth CSRF token was bound to the old session id; issue one bound to the fresh id
      res.json({ok: true, user: {id: u.id, email: u.email, role: u.role}, sessionRegenerated: regenerateOnLogin, csrfToken: generateToken(req, res, true)});
    };
    if (!regenerateOnLogin) return finish(); // FLAWED VARIANT (control only)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({error: 'session error'});
      store.destroy(preAuthId, () => finish()); // regenerate already destroys the old id; this is belt and braces
    });
  });

  app.get('/me', requireSession, (req, res) => res.json({user: {id: req.session.userId, role: req.session.role}}));

  app.get('/admin/audit', requireSession, requireRole('admin'), (req, res) =>
    res.json({entries: [{at: '2026-01-01T00:00:00Z', actor: 'u_carol', action: 'seed'}]}));

  app.post('/logout', doubleCsrfProtection, (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({error: 'session error'});
      res.clearCookie(SESSION_COOKIE, {httpOnly: true, secure: true, sameSite: 'lax', path: '/'}); // Expires=1970
      res.clearCookie(CSRF_COOKIE, {httpOnly: true, secure: true, sameSite: 'lax', path: '/'});
      res.status(200).json({ok: true});
    });
  });
  app.get('/logout', (req, res) => res.set('Allow', 'POST').status(405).json({error: 'method not allowed; sign-out is a POST'}));

  // Fixture-only introspection. Not part of the application surface.
  app.get('/_fixture/session-id', (req, res) => res.json({sessionId: req.session.id, authenticated: Boolean(req.session.userId)}));

  app.use((req, res) => res.status(404).json({error: 'not found'}));
  app.use((err, req, res, _next) => {
    if (err && err.code === 'EBADCSRFTOKEN') return res.status(403).json({error: 'invalid csrf token'});
    res.status(500).json({error: 'server error'});
  });

  const listen = () => new Promise((r) => { const srv = app.listen(0, '127.0.0.1', () => r({port: srv.address().port, close: () => srv.close()})); });
  return {app, listen, store, users};
};

const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString('hex'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const {listen} = await createApp();
  const {port} = await listen();
  console.log(`ep03 fixture on http://127.0.0.1:${port}  (send X-Forwarded-Proto: https to receive Secure cookies)`);
}
