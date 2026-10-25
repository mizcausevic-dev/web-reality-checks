// Runs the exact scenario the video shows and writes evidence.json (actual responses).
// Plain HTTP on loopback with X-Forwarded-Proto: https so express-session issues the Secure cookie.
// The TLS exchange itself is NOT executed here (no trusted local CA); see README.
import fs from 'node:fs';
import {createApp, hashPassword, seedUsers, SESSION_COOKIE, CSRF_HEADER} from './server.mjs';
import {makeClient} from './client.mjs';

const alice = seedUsers[0];
const carol = seedUsers[1];
const fixture = await createApp();
const srv = await fixture.listen();
const base = `http://127.0.0.1:${srv.port}`;
const log = [];
const redactCookie = (raw) => raw.replace(/^(\w[\w.-]*=)([^;]*)/, (_, n, v) => `${n}<opaque id>`);
const note = (label, extra) => log.push({label, ...extra});
const redactBody = (b) => (b && b.csrfToken ? {...b, csrfToken: `<${b.csrfToken.length} chars, per-session token>`} : b);
const rec = (label, method, path, r, extra = {}) => log.push({label, request: `${method} ${path}`, status: r.status, body: redactBody(r.body), setCookie: r.setCookie.map(redactCookie), ...extra});

// 0. hashing: what the database stores
const h1 = await hashPassword(alice.password);
const h2 = await hashPassword(alice.password);
note('stored password hash', {
  note: 'argon2id, random salt; what the user database holds for alice. Two hashes of the same password differ. Not reversible.',
  hashPrefix: h1.slice(0, 31) + '…', hashLength: h1.length, secondHashPrefix: h2.slice(0, 31) + '…', differ: h1 !== h2, containsPassword: h1.includes(alice.password),
});

// 1. click Sign In: wrong password first
const c = makeClient(base);
let token = await c.csrf();
const preAuthSid = (await c.get('/_fixture/session-id')).body.sessionId;
const preAuthCookie = c.cookie(SESSION_COOKIE).value; // the signed cookie value the browser held before login
note('pre-auth session', {sessionId: preAuthSid.slice(0, 8) + '…', authenticated: false, note: 'anonymous session created when the CSRF token was fetched'});
let r = await c.post('/login', {email: alice.email, password: 'wrong password'}, {headers: {[CSRF_HEADER]: token}});
rec('login wrong password', 'POST', '/login', r);

// 2. correct password
r = await c.post('/login', {email: alice.email, password: alice.password}, {headers: {[CSRF_HEADER]: token}});
const sessionCookieRaw = r.setCookie.find((s) => s.startsWith(`${SESSION_COOKIE}=`));
const attrs = sessionCookieRaw.split(';').slice(1).map((s) => s.trim());
rec('login correct password', 'POST', '/login', r, {sessionCookieAttributes: attrs, hasDomainAttribute: attrs.some((a) => /^domain=/i.test(a))});
const postAuthSid = (await c.get('/_fixture/session-id')).body.sessionId;
note('session id after login', {before: preAuthSid.slice(0, 8) + '…', after: postAuthSid.slice(0, 8) + '…', changed: preAuthSid !== postAuthSid});
const replayOld = makeClient(base);
r = await replayOld.get('/me', {headers: {cookie: `${SESSION_COOKIE}=${preAuthCookie}`}, cookies: false});
rec('replay pre-auth session id after login', 'GET', '/me', r);

// 3. subsequent request carries the cookie
r = await c.get('/me');
rec('subsequent request with cookie', 'GET', '/me', r);

// 4. session valid, permission separately checked
const anon = makeClient(base);
rec('admin route without cookie', 'GET', '/admin/audit', await anon.get('/admin/audit'));
rec('admin route as alice (member)', 'GET', '/admin/audit', await c.get('/admin/audit'));
const k = makeClient(base);
await k.post('/login', {email: carol.email, password: carol.password}, {headers: {[CSRF_HEADER]: await k.csrf()}});
rec('admin route as carol (admin)', 'GET', '/admin/audit', await k.get('/admin/audit'));

// 5. CSRF and GET guards
const noTok = makeClient(base);
await noTok.csrf();
rec('login without CSRF header', 'POST', '/login', await noTok.post('/login', {email: alice.email, password: alice.password}));
rec('logout via GET', 'GET', '/logout', await c.get('/logout'));
rec('logout without CSRF header', 'POST', '/logout', await c.post('/logout', {}));

// 6. sign out
const sidBeforeLogout = c.cookie(SESSION_COOKIE).value;
token = await c.csrf();
r = await c.post('/logout', {}, {headers: {[CSRF_HEADER]: token}});
rec('logout', 'POST', '/logout', r, {cookieExpired: /Expires=Thu, 01 Jan 1970/i.test(r.setCookie.find((s) => s.startsWith(`${SESSION_COOKIE}=`)) ?? '')});
const replay = makeClient(base);
rec('replay cookie after logout', 'GET', '/me', await replay.get('/me', {headers: {cookie: `${SESSION_COOKIE}=${sidBeforeLogout}`}, cookies: false}));

// 7. plain-HTTP request gets no Secure cookie
const plain = makeClient(base, {forwardedProto: 'http'});
r = await plain.get('/csrf-token');
rec('csrf-token over plain http (no forwarded https)', 'GET', '/csrf-token', r, {sessionCookieIssued: r.setCookie.some((s) => s.startsWith(`${SESSION_COOKIE}=`))});

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  transport: 'plain HTTP on loopback; X-Forwarded-Proto: https + trust proxy so Secure cookies are issued. TLS NOT executed.',
  libraries: {argon2: '0.41.1', express: '4.22.3', 'express-session': '1.19.0', 'csrf-csrf': '3.1.0', 'cookie-parser': '1.4.7'},
  log,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(log.map((l) => ({label: l.label, request: l.request ?? '-', status: l.status ?? '-', result: l.body?.error ?? l.body?.user?.id ?? (l.changed !== undefined ? `changed=${l.changed}` : l.differ !== undefined ? `differ=${l.differ}` : '-')})));
srv.close();
