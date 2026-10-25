import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCollector} from './collector.mjs';
import * as flawed from './page-flawed.mjs';
import * as fixed from './page-corrected.mjs';

const collector = createCollector();
const base = await collector.listen();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ep11-'));
let n = 0;
const storeFile = () => path.join(tmp, `pref-${++n}.json`);
const count = async () => (await (await fetch(base + '/events')).json()).count;
const optionalCount = async () => (await (await fetch(base + '/events')).json()).events.filter((e) => e.category === 'analytics_optional').length;
const reset = () => fetch(base + '/reset', {method: 'POST'});

// A "session": load the page, do some things the visitor would do, then let the batch timer fire.
const browse = async (page) => { page.interact('scroll'); page.interact('click:pricing'); await page.flush(); };

test('corrected: no choice → zero optional requests', async () => {
  await reset();
  const page = fixed.createPage({collectorBase: base, storePath: storeFile()}).load();
  assert.equal(page.state(), 'no_choice');
  assert.equal(page.ui().bannerVisible, true);
  await browse(page);
  assert.equal(await optionalCount(), 0);
  assert.equal(page.analytics.initialized, false);
});

test('corrected: reject → zero optional requests', async () => {
  await reset();
  const page = fixed.createPage({collectorBase: base, storePath: storeFile()}).load();
  page.rejectOptional();
  assert.equal(page.state(), 'rejected');
  assert.equal(page.gateOpen(), false);
  await browse(page);
  assert.equal(await optionalCount(), 0);
  assert.equal(page.sent.length, 0);
});

test('corrected: accept → optional requests flow (page_view + interactions)', async () => {
  await reset();
  const page = fixed.createPage({collectorBase: base, storePath: storeFile()}).load();
  page.acceptOptional();
  assert.equal(page.gateOpen(), true);
  assert.equal(page.analytics.initialized, true);
  await browse(page);
  const got = await optionalCount();
  assert.equal(got, 3, 'page_view + scroll + click');
  assert.ok(page.sent.every((s) => s.status === 202 && s.consentState === 'accepted'));
});

test('corrected: withdraw → listeners removed, unsent queue cleared, no new requests', async () => {
  await reset();
  const page = fixed.createPage({collectorBase: base, storePath: storeFile()}).load();
  page.acceptOptional();
  await page.flush();                       // page_view transmitted while accepted
  const before = await optionalCount();
  assert.equal(before, 1);
  page.interact('scroll');                  // queued but not yet sent
  assert.equal(page.analytics.queueLength(), 1);
  assert.ok(page.analytics.listenerCount() > 0);
  page.openSettings();
  page.withdrawOptional();
  assert.equal(page.state(), 'withdrawn');
  assert.equal(page.analytics.listenerCount(), 0, 'optional listeners removed');
  assert.equal(page.analytics.queueLength(), 0, 'unsent optional queue cleared');
  await browse(page);                       // more activity + a flush
  assert.equal(await optionalCount(), before, 'no new optional requests after withdrawal');
  // Honest limit: the request sent while accepted is still in the collector. Withdrawal does not recall it.
  assert.equal(await count(), 1);
});

test('corrected: reload with stored rejection → still zero', async () => {
  await reset();
  const file = storeFile();
  const first = fixed.createPage({collectorBase: base, storePath: file}).load();
  first.rejectOptional();
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).state, 'rejected', 'preference persisted');
  const second = fixed.createPage({collectorBase: base, storePath: file}).load(); // same "browser context"
  assert.equal(second.state(), 'rejected');
  assert.equal(second.ui().bannerVisible, false, 'banner not shown again');
  await browse(second);
  assert.equal(await optionalCount(), 0);
});

test('corrected: reload with stored acceptance → requests resume (the stored choice is honoured both ways)', async () => {
  await reset();
  const file = storeFile();
  fixed.createPage({collectorBase: base, storePath: file}).load().acceptOptional();
  const second = fixed.createPage({collectorBase: base, storePath: file}).load();
  await second.flush();
  assert.equal(await optionalCount(), 1, 'page_view on reload while accepted');
});

test('corrected: state machine rejects invalid transitions', () => {
  const page = fixed.createPage({collectorBase: base, storePath: storeFile()}).load();
  page.rejectOptional();
  assert.throws(() => page.acceptOptional(), /invalid consent transition rejected -> accepted/);
  assert.throws(() => page.withdrawOptional(), /invalid consent transition rejected -> withdrawn/);
  assert.deepEqual(fixed.TRANSITIONS, {no_choice: ['rejected', 'accepted'], accepted: ['withdrawn'], rejected: [], withdrawn: []});
});

test('KNOWN-POSITIVE CONTROL: flawed page emits optional requests after "Reject optional"', async () => {
  await reset();
  const page = flawed.createPage({collectorBase: base, storePath: storeFile()}).load();
  page.rejectOptional();
  assert.equal(page.state(), 'rejected', 'the choice IS stored');
  assert.equal(page.ui().bannerVisible, false, 'the banner DOES disappear');
  await browse(page);
  const got = await optionalCount();
  assert.ok(got > 0, 'the flaw must be observable or the fix tests prove nothing');
  assert.equal(got, 3);
  assert.ok(page.sent.some((s) => s.consentState === 'rejected'), 'requests carry state "rejected" while being sent');
});

test('KNOWN-POSITIVE CONTROL: flawed page emits before any choice and after reload with stored rejection', async () => {
  await reset();
  const file = storeFile();
  const first = flawed.createPage({collectorBase: base, storePath: file}).load();
  await first.flush();
  assert.equal(await optionalCount(), 1, 'page_view before any choice');
  first.rejectOptional();
  const second = flawed.createPage({collectorBase: base, storePath: file}).load();
  assert.equal(second.state(), 'rejected');
  await second.flush();
  assert.equal(await optionalCount(), 2, 'another page_view after reload despite stored rejection');
});

test('collector rejects malformed envelopes (a broken emission cannot pass silently)', async () => {
  const r = await fetch(base + '/collect', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({event: 'x'})});
  assert.equal(r.status, 400);
});

test.after(async () => { await collector.close(); fs.rmSync(tmp, {recursive: true, force: true}); });
