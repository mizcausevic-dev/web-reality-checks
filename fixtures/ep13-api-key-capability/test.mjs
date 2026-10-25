import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {upstream, listenUpstream, PUBLIC_PROJECT_ID, SERVER_SECRET_TOKEN, state as upState} from './upstream.mjs';
import {createBackend, listenBackend} from './backend.mjs';
import {scanDir, controlRun} from './inspect-artifacts.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const upPort = await listenUpstream();
const UP = `http://127.0.0.1:${upPort}`;
const backend = createBackend(UP);
const bePort = await listenBackend(backend);
const BE = `http://127.0.0.1:${bePort}`;

const privilegedUpstream = (bearer) => fetch(`${UP}/privileged`, {method: 'POST', headers: {'content-type': 'application/json', ...(bearer ? {authorization: `Bearer ${bearer}`} : {})}, body: JSON.stringify({operation: 'rotate_webhook', projectId: PUBLIC_PROJECT_ID})});
const loginAs = async (u) => (await fetch(`${BE}/login/${u}`)).headers.get('set-cookie').split(';')[0];
const privilegedBackend = (cookie, body = {operation: 'rotate_webhook'}) => fetch(`${BE}/privileged`, {method: 'POST', headers: {'content-type': 'application/json', ...(cookie ? {cookie} : {})}, body: JSON.stringify(body)});

/* ---- capability tests: what does each value actually DO at the upstream? ---- */

test('public identifier reads public info (200) — that is what an identifier is for', async () => {
  const r = await fetch(`${UP}/public/${PUBLIC_PROJECT_ID}`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).projectId, PUBLIC_PROJECT_ID);
});

test('public identifier presented as a bearer credential does NOT authorise the privileged operation (403)', async () => {
  const r = await privilegedUpstream(PUBLIC_PROJECT_ID);
  assert.equal(r.status, 403);
});

test('no credential at all → 401 from upstream', async () => {
  assert.equal((await privilegedUpstream(null)).status, 401);
});

test('KNOWN-POSITIVE CONTROL: possession of the synthetic secret authorises the privileged operation (200)', async () => {
  const r = await privilegedUpstream(SERVER_SECRET_TOKEN);
  assert.equal(r.status, 200, 'if the secret did nothing, finding it in a bundle would prove nothing');
  assert.equal((await r.json()).operation, 'rotate_webhook');
});

/* ---- artifact inspection: scanner must prove itself before a clean result counts ---- */

test('KNOWN-POSITIVE CONTROL: scanner finds the planted secret in bundle-flawed (JS and HTML)', () => {
  const c = controlRun();
  assert.ok(c.passed);
  assert.equal(c.secretLike, 2, 'one in app.js, one in the inline env block of index.html');
  assert.deepEqual([...new Set(c.findings.filter((f) => f.kind === 'secret-like').map((f) => f.file))].sort(), ['app.js', 'index.html']);
  assert.ok(c.findings.every((f) => !f.valueRedacted.includes(SERVER_SECRET_TOKEN)), 'report must not reprint the full secret');
});

test('scanner also flags the identifier in the flawed bundle as identifier-like, not as a secret', () => {
  const c = controlRun();
  assert.equal(c.identifierLike, 2);
  assert.ok(c.findings.filter((f) => f.kind === 'identifier-like').every((f) => f.valueRedacted.startsWith('proj_pub_')));
});

test('corrected bundle contains 0 secret-like strings and still carries the public identifier', () => {
  assert.ok(controlRun().passed, 'control must pass first or this result is meaningless');
  const r = scanDir(path.join(here, 'bundle-corrected'));
  assert.deepEqual(r.filesScanned, ['app.js', 'index.html']);
  assert.equal(r.secretLike, 0);
  assert.equal(r.identifierLike, 2);
});

test('the bundle the backend actually serves is the corrected one, and it does not contain the secret', async () => {
  for (const f of ['app.js', 'index.html']) {
    const txt = await (await fetch(`${BE}/bundle/corrected/${f}`)).text();
    assert.ok(!txt.includes(SERVER_SECRET_TOKEN), `${f} served to the browser must not contain the secret`);
    assert.ok(txt.includes(PUBLIC_PROJECT_ID));
  }
  const cfg = await (await fetch(`${BE}/config`)).text();
  assert.ok(!cfg.includes(SERVER_SECRET_TOKEN), 'config payload must not contain the secret');
  assert.ok(!cfg.includes('srv_secret_'));
});

test('control: the flawed bundle, when served, DOES contain the secret (so the serving test above is meaningful)', async () => {
  const txt = await (await fetch(`${BE}/bundle/flawed/app.js`)).text();
  assert.ok(txt.includes(SERVER_SECRET_TOKEN));
});

/* ---- backend authentication + authorization + operation validation ---- */

test('unauthenticated request to the backend privileged route is rejected (401) and never reaches the upstream', async () => {
  const before = upState.privilegedAttempts;
  assert.equal((await privilegedBackend(null)).status, 401);
  assert.equal(upState.privilegedAttempts, before);
});

test('authenticated but unauthorised user (viewer) is rejected (403) and never reaches the upstream', async () => {
  const before = upState.privilegedAttempts;
  const r = await privilegedBackend(await loginAs('vik'));
  assert.equal(r.status, 403);
  assert.equal(upState.privilegedAttempts, before);
});

test('authorised user (maintainer) succeeds (200); response body and headers never contain the secret', async () => {
  const before = upState.privilegedSucceeded;
  const r = await privilegedBackend(await loginAs('mara'));
  assert.equal(r.status, 200);
  const text = await r.text();
  const body = JSON.parse(text);
  assert.equal(body.ok, true);
  assert.equal(body.operation, 'rotate_webhook');
  assert.equal(body.performedBy, 'u_mara');
  assert.ok(!text.includes(SERVER_SECRET_TOKEN) && !text.includes('srv_secret_'), 'body leaks secret');
  const headerBlob = JSON.stringify([...r.headers.entries()]);
  assert.ok(!headerBlob.includes(SERVER_SECRET_TOKEN) && !headerBlob.includes('srv_secret_'), 'headers leak secret');
  assert.equal(upState.privilegedSucceeded, before + 1, 'exactly one upstream call, made by the backend');
});

test('backend validates the operation: unknown/over-broad operation is rejected (400) even for an authorised user, no upstream call', async () => {
  const c = await loginAs('mara');
  const before = upState.privilegedAttempts;
  // delete_project IS something the upstream would do for the secret-holder; the backend must not be a relay for it.
  assert.equal((await privilegedBackend(c, {operation: 'delete_project'})).status, 400);
  assert.equal((await privilegedBackend(c, {operation: 'anything_else'})).status, 400);
  assert.equal((await privilegedBackend(c, {})).status, 400);
  assert.equal(upState.privilegedAttempts, before, 'validation happens before any upstream call');
});

test('control: the upstream itself WOULD perform delete_project for the secret-holder (so the backend allow-list is doing real work)', async () => {
  const r = await fetch(`${UP}/privileged`, {method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${SERVER_SECRET_TOKEN}`}, body: JSON.stringify({operation: 'delete_project', projectId: PUBLIC_PROJECT_ID})});
  assert.equal(r.status, 200);
});

test('client-supplied identity claims and client-supplied credentials do not change the backend decision', async () => {
  const c = await loginAs('vik');
  const r = await fetch(`${BE}/privileged`, {method: 'POST', headers: {'content-type': 'application/json', cookie: c, 'x-user-id': 'u_mara', 'x-role': 'maintainer', authorization: `Bearer ${SERVER_SECRET_TOKEN}`}, body: JSON.stringify({operation: 'rotate_webhook', projectId: 'other_project'})});
  assert.equal(r.status, 403, 'the viewer stays a viewer; the backend uses its own credential and its own project, never the request\'s');
});

test('logout invalidates the session', async () => {
  const c = await loginAs('mara');
  await fetch(`${BE}/logout`, {method: 'POST', headers: {cookie: c}});
  assert.equal((await privilegedBackend(c)).status, 401);
});

test.after(() => { backend.close(); upstream.close(); });
