import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp, hashPassword, verifyPassword, seedUsers, SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER} from './server.mjs';
import {makeClient} from './client.mjs';

const alice = seedUsers[0];
const carol = seedUsers[1];

const fixture = await createApp();
const srv = await fixture.listen();
const base = `http://127.0.0.1:${srv.port}`;

const login = async (c, email, password) => {
  const token = await c.csrf();
  return c.post('/login', {email, password}, {headers: {[CSRF_HEADER]: token}});
};

test('password hash is not the password and is salted (two hashes of the same password differ)', async () => {
  const h1 = await hashPassword(alice.password);
  const h2 = await hashPassword(alice.password);
  assert.notEqual(h1, alice.password);
  assert.ok(!h1.includes(alice.password), 'hash must not embed the password');
  assert.ok(h1.startsWith('$argon2id$'), 'argon2id encoded hash');
  assert.notEqual(h1, h2, 'random salt => different encodings');
  assert.equal(await verifyPassword(h1, alice.password), true);
  assert.equal(await verifyPassword(h2, alice.password), true);
});

test('wrong password is rejected with 401 and no authenticated session', async () => {
  const c = makeClient(base);
  const r = await login(c, alice.email, 'not the password');
  assert.equal(r.status, 401);
  assert.equal((await c.get('/me')).status, 401);
  // unknown user: same status, no user-enumeration hint in the body
  const r2 = await login(c, 'nobody@example.test', 'whatever');
  assert.equal(r2.status, 401);
  assert.deepEqual(r2.body, r.body);
});

test('session id changes after successful login (pre-auth id invalidated)', async () => {
  const c = makeClient(base);
  await c.csrf(); // establishes a pre-authentication session
  const before = (await c.get('/_fixture/session-id')).body.sessionId;
  const preAuthCookie = c.cookie(SESSION_COOKIE).value;
  const r = await login(c, alice.email, alice.password);
  assert.equal(r.status, 200);
  const after = (await c.get('/_fixture/session-id')).body.sessionId;
  assert.notEqual(before, after, 'fresh session id after authentication');
  assert.notEqual(c.cookie(SESSION_COOKIE).value, preAuthCookie, 'cookie value replaced');
  // the old id must be dead on the server side
  const old = makeClient(base);
  const r2 = await old.get('/me', {headers: {cookie: `${SESSION_COOKIE}=${preAuthCookie}`}, cookies: false});
  assert.equal(r2.status, 401);
  await new Promise((res) => fixture.store.get(before.split('.')[0], (e, s) => { assert.equal(s ?? null, null, 'old id absent from store'); res(); }));
});

test('KNOWN-POSITIVE CONTROL: without regenerate(), the pre-auth session id survives login', async () => {
  const flawed = await createApp({regenerateOnLogin: false});
  const s2 = await flawed.listen();
  try {
    const c = makeClient(`http://127.0.0.1:${s2.port}`);
    await c.csrf();
    const before = (await c.get('/_fixture/session-id')).body.sessionId;
    const r = await login(c, alice.email, alice.password);
    assert.equal(r.status, 200);
    const after = (await c.get('/_fixture/session-id')).body.sessionId;
    assert.equal(before, after, 'the flaw must be observable or the fix test proves nothing');
  } finally { s2.close(); }
});

test('session cookie attributes: HttpOnly, Secure, SameSite=Lax, Path=/, no Domain; value is opaque', async () => {
  const c = makeClient(base);
  const r = await login(c, alice.email, alice.password);
  assert.equal(r.status, 200);
  const raw = r.setCookie.find((s) => s.startsWith(`${SESSION_COOKIE}=`));
  assert.ok(raw, 'login response sets the session cookie');
  assert.match(raw, /;\s*HttpOnly/i);
  assert.match(raw, /;\s*Secure/i);
  assert.match(raw, /;\s*SameSite=Lax/i);
  assert.match(raw, /;\s*Path=\//i);
  assert.doesNotMatch(raw, /;\s*Domain=/i, 'host-only cookie: no Domain attribute');
  const value = decodeURIComponent(c.cookie(SESSION_COOKIE).value);
  assert.ok(!value.includes(alice.password) && !value.includes(alice.email) && !value.includes('u_alice'), 'opaque: carries no credential or identity');
});

test('Secure cookie is only issued for a request the server considers HTTPS (plain HTTP gets none)', async () => {
  const c = makeClient(base, {forwardedProto: 'http'});
  const r = await c.get('/csrf-token');
  assert.equal(r.status, 200);
  assert.equal(r.setCookie.filter((s) => s.startsWith(`${SESSION_COOKIE}=`)).length, 0, 'express-session withholds a Secure cookie on an insecure request');
});

test('protected route: 401 without cookie, 403 with valid session but missing permission, 200 with both', async () => {
  const anon = makeClient(base);
  assert.equal((await anon.get('/admin/audit')).status, 401);

  const a = makeClient(base);
  assert.equal((await login(a, alice.email, alice.password)).status, 200);
  assert.equal((await a.get('/me')).status, 200, 'session is valid');
  const forb = await a.get('/admin/audit');
  assert.equal(forb.status, 403, 'valid session, wrong role');
  assert.equal(forb.body.actual, 'member');

  const k = makeClient(base);
  assert.equal((await login(k, carol.email, carol.password)).status, 200);
  const ok = await k.get('/admin/audit');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.entries.length, 1);
});

test('logout invalidates the server-side session and expires the cookie', async () => {
  const c = makeClient(base);
  await login(c, alice.email, alice.password);
  const sid = c.cookie(SESSION_COOKIE).value;
  const token = await c.csrf();
  const r = await c.post('/logout', {}, {headers: {[CSRF_HEADER]: token}});
  assert.equal(r.status, 200);
  const raw = r.setCookie.find((s) => s.startsWith(`${SESSION_COOKIE}=`));
  assert.ok(raw, 'logout sets an expiring cookie');
  assert.match(raw, /Expires=Thu, 01 Jan 1970/i);
  assert.equal(c.cookie(SESSION_COOKIE), undefined, 'client jar dropped it');
  // Replaying the old cookie value must fail: the server-side record is gone.
  const replay = makeClient(base);
  const r2 = await replay.get('/me', {headers: {cookie: `${SESSION_COOKIE}=${sid}`}, cookies: false});
  assert.equal(r2.status, 401);
});

test('POST /login without a CSRF token is rejected (403) even with correct credentials', async () => {
  const c = makeClient(base);
  await c.csrf(); // has the csrf cookie, but omits the header
  const r = await c.post('/login', {email: alice.email, password: alice.password});
  assert.equal(r.status, 403);
  assert.equal((await c.get('/me')).status, 401, 'no session was established');
  // and a token minted for a different session is also rejected
  const other = makeClient(base);
  const foreign = await other.csrf();
  const r2 = await c.post('/login', {email: alice.email, password: alice.password}, {headers: {[CSRF_HEADER]: foreign}});
  assert.equal(r2.status, 403);
});

test('POST /logout without a CSRF token is rejected and the session survives', async () => {
  const c = makeClient(base);
  await login(c, alice.email, alice.password);
  const r = await c.post('/logout', {});
  assert.equal(r.status, 403);
  assert.equal((await c.get('/me')).status, 200, 'still signed in');
});

test('GET /logout is not allowed (405) and does not end the session', async () => {
  const c = makeClient(base);
  await login(c, alice.email, alice.password);
  const r = await c.get('/logout');
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'POST');
  assert.equal((await c.get('/me')).status, 200);
});

test('CSRF cookie is also HttpOnly, Secure, host-only', async () => {
  const c = makeClient(base);
  const r = await c.get('/csrf-token');
  const raw = r.setCookie.find((s) => s.startsWith(`${CSRF_COOKIE}=`));
  assert.ok(raw);
  assert.match(raw, /HttpOnly/i); assert.match(raw, /Secure/i); assert.doesNotMatch(raw, /Domain=/i);
});

test.after(() => srv.close());
