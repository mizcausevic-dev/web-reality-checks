import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp, announcementCount, hasPermission, PUBLISH, CSRF_HEADER, CSRF_COOKIE} from './server.mjs';
import {makeClient} from './client.mjs';

const fx = createApp();
const srv = await fx.listen();
const base = `http://127.0.0.1:${srv.port}`;
const {db, trace} = fx;

/** A client with a VALID server-side session and a VALID CSRF token for that session. */
const signedIn = async (user) => {
  const c = makeClient(base);
  assert.equal((await c.login(user)).ok, true);
  const token = await c.csrf();
  return {c, token, h: {[CSRF_HEADER]: token}};
};
const announce = {title: 'Maintenance window', body: 'Synthetic announcement.'};
const publish = (who, path, extra = {}, headers) => who.c.post(path, {...announce, ...extra}, {headers: headers ?? who.h});

test('UI: the publish button is hidden from the member and shown to the administrator (both versions)', async () => {
  const member = await signedIn('member');
  const admin = await signedIn('admin');
  for (const page of ['/vuln/app', '/app']) {
    const m = await member.c.get(page);
    assert.equal(m.status, 200);
    assert.ok(!m.text.includes('data-testid="publish-button"'), `${page}: member must not see the button`);
    assert.ok(m.text.includes('data-testid="read-only"'));
    const a = await admin.c.get(page);
    assert.ok(a.text.includes('data-testid="publish-button"'), `${page}: admin sees the button`);
  }
});

test('KNOWN-POSITIVE CONTROL: member (valid session, valid CSRF token) publishes through the FLAWED endpoint', async () => {
  const member = await signedIn('member');
  assert.equal(hasPermission(db, 'u_member', PUBLISH), false, 'precondition: the store does not grant publish to member');
  const before = announcementCount(db);
  const r = await publish(member, '/vuln/announcements');
  assert.equal(r.status, 201, 'the flaw must be observable or the fix test proves nothing');
  assert.equal(r.body.publishedBy, 'u_member');
  assert.equal(announcementCount(db), before + 1);
});

test('CORRECTED: member with valid session and valid CSRF token gets 403 PERMISSION_DENIED; announcement count unchanged', async () => {
  const member = await signedIn('member');
  const before = announcementCount(db);
  const r = await publish(member, '/announcements');
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'PERMISSION_DENIED');
  assert.equal(r.body.error, 'forbidden');
  assert.equal(announcementCount(db), before, 'no side effect after a denied request');
  const byMember = () => db.prepare("SELECT COUNT(*) AS n FROM announcements WHERE published_by = 'u_member'").get().n;
  const memberRowsBefore = byMember();
  assert.equal((await publish(member, '/announcements')).status, 403);
  assert.equal(byMember(), memberRowsBefore, 'still no row authored by the member through the corrected route');
});

test('CORRECTED: administrator succeeds (201) and the row is stored with the administrator as publisher', async () => {
  const admin = await signedIn('admin');
  const before = announcementCount(db);
  const r = await publish(admin, '/announcements', {title: 'Admin notice'});
  assert.equal(r.status, 201);
  assert.equal(r.body.publishedBy, 'u_admin');
  assert.equal(announcementCount(db), before + 1);
  assert.equal(db.prepare('SELECT published_by AS p FROM announcements WHERE id = ?').get(r.body.id).p, 'u_admin');
});

test('UNAUTHENTICATED: no session is 401 on both endpoints, with or without a CSRF header, and nothing is written', async () => {
  const before = announcementCount(db);
  const anon = makeClient(base);
  for (const path of ['/vuln/announcements', '/announcements']) {
    assert.equal((await anon.post(path, announce)).status, 401, `${path} without CSRF`);
    assert.equal((await anon.post(path, announce, {headers: {[CSRF_HEADER]: 'forged'}})).status, 401, `${path} with forged CSRF`);
    const stale = makeClient(base);
    stale.jar.set('sid', 'not-a-real-session');
    const r = await stale.post(path, announce);
    assert.equal(r.status, 401, `${path} with unknown session id`);
    assert.equal(r.body.error, 'unauthenticated');
  }
  assert.equal((await anon.get('/csrf-token')).status, 401);
  assert.equal((await anon.get('/app')).status, 401);
  assert.equal(announcementCount(db), before);
});

test('logout deletes the server-side session: the old cookie is 401 afterwards', async () => {
  const member = await signedIn('member');
  assert.equal((await member.c.post('/_fixture/logout', {})).status, 200);
  assert.equal((await publish(member, '/announcements')).status, 401);
});

test('CSRF: missing, tampered, and another session\'s token are rejected 403 EBADCSRFTOKEN - a different failure from PERMISSION_DENIED', async () => {
  const admin = await signedIn('admin'); // the ADMIN: authorized, so only CSRF can be the reason for refusal
  const other = await signedIn('member');
  const before = announcementCount(db);
  const cases = {
    'no token header': {},
    'tampered token': {[CSRF_HEADER]: admin.token.slice(0, -4) + 'AAAA'},
    'token minted for another session': {[CSRF_HEADER]: other.token},
  };
  for (const [label, headers] of Object.entries(cases)) {
    const r = await admin.c.post('/announcements', announce, {headers});
    assert.equal(r.status, 403, label);
    assert.equal(r.body.code, 'EBADCSRFTOKEN', label);
    assert.notEqual(r.body.code, 'PERMISSION_DENIED', label);
  }
  // header present but CSRF cookie absent
  const noCookie = makeClient(base);
  noCookie.jar.set('sid', admin.c.jar.get('sid'));
  const r = await noCookie.post('/announcements', announce, {headers: admin.h});
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'EBADCSRFTOKEN');
  assert.equal(announcementCount(db), before, 'CSRF rejection writes nothing');
  assert.ok(admin.c.jar.has(CSRF_COOKIE));
});

test('CSRF and authorization are distinguishable: member with a BAD token gets CSRF error, member with a GOOD token gets permission error', async () => {
  const member = await signedIn('member');
  const bad = await member.c.post('/announcements', announce, {headers: {[CSRF_HEADER]: 'nope'}});
  const good = await publish(member, '/announcements');
  assert.equal(bad.status, 403);
  assert.equal(good.status, 403);
  assert.equal(bad.body.code, 'EBADCSRFTOKEN');
  assert.equal(good.body.code, 'PERMISSION_DENIED');
});

test('browser-submitted role / permission fields are ignored (body, query string and headers)', async () => {
  const member = await signedIn('member');
  const before = announcementCount(db);
  const r = await member.c.post('/announcements?role=admin&permissions=announcement:publish', {...announce, role: 'admin', permissions: [PUBLISH], isAdmin: true, user: 'u_admin'},
    {headers: {...member.h, 'x-role': 'admin', 'x-user-id': 'u_admin', 'x-ui-role': 'admin'}});
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'PERMISSION_DENIED');
  assert.equal(announcementCount(db), before);
  assert.equal(hasPermission(db, 'u_member', PUBLISH), false, 'the store was not changed by the request');
});

test('permission is resolved from the store at request time, so revoking it takes effect on the same live session', async () => {
  const admin = await signedIn('admin');
  assert.equal((await publish(admin, '/announcements', {title: 'before revoke'})).status, 201);
  db.prepare("DELETE FROM role_permissions WHERE role = 'admin' AND permission = ?").run(PUBLISH);
  try {
    const before = announcementCount(db);
    const r = await publish(admin, '/announcements', {title: 'after revoke'});
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'PERMISSION_DENIED');
    assert.equal(announcementCount(db), before);
    const ui = await admin.c.get('/app');
    assert.ok(!ui.text.includes('data-testid="publish-button"'), 'the UI follows the store as well');
  } finally {
    db.prepare("INSERT INTO role_permissions VALUES ('admin', ?)").run(PUBLISH);
  }
  assert.equal((await publish(admin, '/announcements', {title: 'after restore'})).status, 201);
});

test('ordering: authenticate, then CSRF, then permission, then insert; a denied request never reaches insert', async () => {
  const member = await signedIn('member');
  const admin = await signedIn('admin');
  trace.length = 0;
  await publish(member, '/announcements');
  assert.deepEqual(trace, ['authenticate', 'csrf', 'permission'], 'denied: no insert step');
  trace.length = 0;
  await publish(admin, '/announcements', {title: 'ordering'});
  assert.deepEqual(trace, ['authenticate', 'csrf', 'permission', 'insert']);
  trace.length = 0;
  await publish(member, '/vuln/announcements', {title: 'flawed ordering'});
  assert.deepEqual(trace, ['authenticate', 'csrf', 'insert'], 'the flawed route has no permission step');
});

test('a denied member request with an invalid body is still 403, not 400 (no validation oracle before authorization)', async () => {
  const member = await signedIn('member');
  const r = await member.c.post('/announcements', {title: '', body: 5}, {headers: member.h});
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'PERMISSION_DENIED');
});

test.after(() => srv.close());
