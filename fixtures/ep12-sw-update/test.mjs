import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateSw, writeAll} from './generate-sw.mjs';
import {FakeCaches, Registration, Worker, loadAppLogic, readSw} from './sw-lifecycle-sim.mjs';
import {listen} from './serve.mjs';

writeAll(); // generate build1/sw.js and build2/sw.js from the template
const sw1 = readSw(1), sw2 = readSw(2);
const logic = loadAppLogic(1);

/* ---------- static assertions on the generated workers ---------- */
test('sw.js is byte-different between builds, at the same URL', () => {
  assert.notEqual(sw1, sw2);
  assert.equal(generateSw(1), sw1);
  assert.equal(generateSw(2), sw2);
  assert.ok(sw1.includes("const BUILD = 1;") && sw2.includes("const BUILD = 2;"));
});

test('precache names differ per build (wrc-ep12-v1 vs wrc-ep12-v2)', () => {
  const w1 = new Worker(sw1, new FakeCaches(), 'b1'), w2 = new Worker(sw2, new FakeCaches(), 'b2');
  assert.equal(w1.cacheName, 'wrc-ep12-v1');
  assert.equal(w2.cacheName, 'wrc-ep12-v2');
});

test('build1 and build2 app.js differ only in the BUILD constant; pages are labelled Build 1 / Build 2', () => {
  const a1 = fs.readFileSync(new URL('./build1/app.js', import.meta.url), 'utf8');
  const a2 = fs.readFileSync(new URL('./build2/app.js', import.meta.url), 'utf8');
  assert.equal(a1.replace('var BUILD = 1;', 'var BUILD = 2;'), a2);
  assert.match(fs.readFileSync(new URL('./build1/index.html', import.meta.url), 'utf8'), /<h1 id="build-label">Build 1<\/h1>/);
  assert.match(fs.readFileSync(new URL('./build2/index.html', import.meta.url), 'utf8'), /<h1 id="build-label">Build 2<\/h1>/);
  assert.match(fs.readFileSync(new URL('./build1/styles.css', import.meta.url), 'utf8'), /Build 1 — blue/);
  assert.match(fs.readFileSync(new URL('./build2/styles.css', import.meta.url), 'utf8'), /Build 2 — green/);
});

test('worker never calls skipWaiting() on its own during install (explicit-approval policy)', async () => {
  const w = new Worker(sw2, new FakeCaches(), 'b2');
  await w.dispatch('install');
  assert.equal(w.skipWaitingCalled, false);
});

/* ---------- activate cleanup policy ---------- */
test('activate deletes only wrc-ep12-* caches other than the current one; foreign caches survive', async () => {
  const caches = new FakeCaches(['wrc-ep12-v1', 'wrc-ep12-v2', 'other-app-v9', 'wrc-ep12-v0']);
  const w = new Worker(sw2, caches, 'b2');
  await w.dispatch('activate');
  assert.deepEqual((await caches.keys()).sort(), ['other-app-v9', 'wrc-ep12-v2']);
  assert.equal(w.claimed, true, 'clients.claim() is part of the activation strategy (it is not what deletes caches)');
});

test('KNOWN-POSITIVE CONTROL: with an unversioned cache name both builds would write into one cache', async () => {
  // Shows why the versioned name matters: a single shared name cannot be told apart, so the
  // cleanup policy above would have nothing to delete and Build 1 entries would linger.
  const shared = sw1.replace("const CACHE = PREFIX + 'v' + BUILD;", "const CACHE = PREFIX + 'shared';");
  const caches = new FakeCaches();
  const a = new Worker(shared, caches, 'a'), b = new Worker(shared.replace('const BUILD = 1;', 'const BUILD = 2;'), caches, 'b');
  await a.dispatch('install'); await b.dispatch('install'); await b.dispatch('activate');
  assert.deepEqual(await caches.keys(), ['wrc-ep12-shared'], 'one cache, nothing distinguishes the builds');
});

/* ---------- message handler ---------- */
test('{type:"SKIP_WAITING"} message triggers self.skipWaiting(); other messages do not', async () => {
  const w = new Worker(sw2, new FakeCaches(), 'b2');
  await w.dispatch('message', {data: {type: 'HELLO'}});
  assert.equal(w.skipWaitingCalled, false);
  await w.dispatch('message', {data: {type: 'SKIP_WAITING'}});
  assert.equal(w.skipWaitingCalled, true);
});

/* ---------- registration state machine + app decision logic ---------- */
test('first install: Build 1 activates, claims the page, and no update notice is shown', async () => {
  const reg = new Registration();
  await reg.update(sw1, 'build1');
  const s = reg.snapshot();
  assert.equal(s.active.label, 'build1'); assert.equal(s.waiting, null); assert.equal(s.controller.label, 'build1');
  assert.equal(logic.updateAvailable(reg, reg.controller), false);
});

test('byte-identical script on update(): no new worker, no notice', async () => {
  const reg = new Registration();
  await reg.update(sw1, 'build1');
  assert.equal(await reg.update(sw1, 'build1-again'), null);
  assert.equal(reg.events.at(-1).ev, 'no-update');
  assert.equal(logic.updateAvailable(reg, reg.controller), false);
});

test('Build 2 installs and WAITS behind active Build 1; page stays controlled by Build 1; notice shown', async () => {
  const reg = new Registration();
  await reg.update(sw1, 'build1');
  await reg.update(sw2, 'build2');
  const s = reg.snapshot();
  assert.equal(s.active.label, 'build1');
  assert.equal(s.waiting.label, 'build2'); assert.equal(s.waiting.state, 'installed');
  assert.equal(s.controller.label, 'build1', 'the open page is still controlled by the old worker');
  assert.deepEqual((await reg.caches.keys()).sort(), ['wrc-ep12-v1', 'wrc-ep12-v2'], 'both caches coexist while Build 1 still serves pages');
  assert.equal(logic.updateAvailable(reg, reg.controller), true);
});

test('updateAvailable: installing worker in state "installed" with a controller also counts; without a controller never', () => {
  assert.equal(logic.updateAvailable({installing: {state: 'installed'}, waiting: null, active: {state: 'activated'}}, {state: 'activated'}), true);
  assert.equal(logic.updateAvailable({installing: {state: 'installing'}, waiting: null, active: {state: 'activated'}}, {state: 'activated'}), false);
  assert.equal(logic.updateAvailable({installing: null, waiting: {state: 'installed'}, active: null}, null), false);
});

test('approval → SKIP_WAITING → Build 2 activates → v1 cache deleted → controllerchange → exactly one reload', async () => {
  const reg = new Registration();
  await reg.update(sw1, 'build1');
  await reg.update(sw2, 'build2');
  let reloads = 0;
  const handler = logic.makeControllerChangeHandler(() => { reloads++; });
  reg.onControllerChange(handler);
  await reg.postMessage(reg.waiting, {type: 'SKIP_WAITING'});
  const s = reg.snapshot();
  assert.equal(s.active.label, 'build2'); assert.equal(s.waiting, null); assert.equal(s.controller.label, 'build2');
  assert.deepEqual(await reg.caches.keys(), ['wrc-ep12-v2']);
  assert.equal(reloads, 1);
  assert.equal(logic.updateAvailable(reg, reg.controller), false, 'after reload nothing is waiting');
});

test('controllerchange guard reloads once even if the event fires twice', () => {
  let reloads = 0;
  const handler = logic.makeControllerChangeHandler(() => { reloads++; });
  assert.equal(handler(), 'reloaded');
  assert.equal(handler(), 'ignored');
  assert.equal(handler(), 'ignored');
  assert.equal(reloads, 1);
});

/* ---------- loopback server ---------- */
test('serve.mjs: --build selects the folder at /, /sw.js is no-cache, both builds reachable', async () => {
  const {srv, port} = await listen(1);
  const base = `http://127.0.0.1:${port}`;
  try {
    let r = await fetch(base + '/'); assert.equal(r.status, 200); assert.match(await r.text(), /Build 1/);
    r = await fetch(base + '/sw.js'); assert.equal(r.headers.get('cache-control'), 'no-cache'); const s1 = await r.text(); assert.equal(s1, sw1);
    assert.equal((await fetch(base + '/__set-build/2')).status, 200);
    r = await fetch(base + '/'); assert.match(await r.text(), /Build 2/);
    r = await fetch(base + '/sw.js'); const s2 = await r.text(); assert.equal(s2, sw2); assert.notEqual(s1, s2);
    assert.equal((await fetch(base + '/../serve.mjs')).status, 404);
    assert.equal((await fetch(base + '/nope.txt')).status, 404);
  } finally { srv.close(); }
});
