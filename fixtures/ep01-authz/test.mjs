import test from 'node:test';
import assert from 'node:assert/strict';
import {app, listen} from './server.mjs';

const port = await listen();
const base = `http://127.0.0.1:${port}`;
const get = (p, headers = {}) => fetch(base + p, {headers, redirect: 'manual'});
const loginAs = async (u) => { const r = await get(`/login/${u}`); return r.headers.get('set-cookie').split(';')[0]; };

test('unauthenticated request is rejected (both endpoints)', async () => {
  assert.equal((await get('/projects/p_1001')).status, 401);
  assert.equal((await get('/vuln/projects/p_1001')).status, 401);
});

test('Alice can read Alice\'s project (corrected endpoint)', async () => {
  const c = await loginAs('alice');
  const r = await get('/projects/p_1001', {cookie: c});
  assert.equal(r.status, 200);
  assert.equal((await r.json()).project.id, 'p_1001');
});

test('KNOWN-POSITIVE CONTROL: vulnerable endpoint returns Bob\'s project to Alice', async () => {
  const c = await loginAs('alice');
  const r = await get('/vuln/projects/p_2002', {cookie: c});
  assert.equal(r.status, 200, 'the flaw must be observable or the fix test proves nothing');
  assert.equal((await r.json()).project.ownerId, 'u_bob');
});

test('Alice cannot read Bob\'s project after the repair (404 by policy)', async () => {
  const c = await loginAs('alice');
  const r = await get('/projects/p_2002', {cookie: c});
  assert.equal(r.status, 404);
});

test('absent project also returns 404 (indistinguishable from inaccessible, by policy)', async () => {
  const c = await loginAs('alice');
  assert.equal((await get('/projects/p_9999', {cookie: c})).status, 404);
});

test('client-side identity claims do not bypass server enforcement', async () => {
  const c = await loginAs('alice');
  const r = await get('/projects/p_2002?user=u_bob', {cookie: c, 'x-user-id': 'u_bob', 'x-ui-role': 'admin'});
  assert.equal(r.status, 404);
});

test('logout invalidates the session', async () => {
  const c = await loginAs('alice');
  await fetch(base + '/logout', {method: 'POST', headers: {cookie: c}});
  assert.equal((await get('/projects/p_1001', {cookie: c})).status, 401);
});

test.after(() => app.close());
