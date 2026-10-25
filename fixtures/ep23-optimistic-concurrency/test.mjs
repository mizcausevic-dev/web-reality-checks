import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {startFixture} from './server.mjs';
import {EditorClient} from './client.mjs';
import {SEED} from './db.mjs';

const F = await startFixture();
test.after(() => F.close());
test.beforeEach(() => { F.db.reset(); F.requests.length = 0; F.stats.maxInFlightPuts = 0; });

const ORIGINAL = {title: SEED.doc_1.title, body: SEED.doc_1.body};
const tab = async (name, user = 'alice') => new EditorClient(F.base, name).login(user);
/** Two independent client instances, both loaded at version 1. */
const twoTabs = async () => {
  const a = await tab('A'), b = await tab('B');
  await a.load('doc_1'); await b.load('doc_1');
  return {a, b};
};
const putRaw = async (cookie, p, body, headers = {}) => fetch(F.base + p, {method: 'PUT', headers: {cookie, 'content-type': 'application/json', ...headers}, body: JSON.stringify(body)});
const cookieOf = async (user) => (await fetch(`${F.base}/login/${user}`)).headers.get('set-cookie').split(';')[0];

test('both clients load version 1 and hold independent local copies', async () => {
  const {a, b} = await twoTabs();
  assert.equal(a.baseVersion, 1); assert.equal(b.baseVersion, 1);
  assert.notEqual(a.cookie, b.cookie, 'independent sessions');
  a.edit({title: 'A title'});
  assert.equal(b.local.title, ORIGINAL.title, 'editing in A must not touch B local copy');
});

test('KNOWN-POSITIVE CONTROL: unconditional update lets B silently overwrite A (lost update)', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'Launch plan (approved)'});
  const ra = await a.save({vuln: true});
  assert.equal(ra.status, 200);
  assert.equal(F.db.getDoc('doc_1').title, 'Launch plan (approved)', 'A change is accepted and visible');
  b.edit({body: 'Draft: audience, schedule, budget.'});          // B never touched the title...
  const rb = await b.save({vuln: true});                         // ...but saves the WHOLE (stale) document
  assert.equal(rb.status, 200, 'flawed endpoint accepts B without complaint');
  const final = F.db.getDoc('doc_1');
  assert.equal(final.title, ORIGINAL.title, "A's accepted title change is gone");
  assert.equal(final.body, 'Draft: audience, schedule, budget.');
  assert.equal(final.version, 3, 'version moved forward twice; nothing recorded that A was replaced');
});

test('corrected: A saves (200, version 2); B, same expectedVersion, gets 409 with the current server version', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'Launch plan (approved)'});
  const ra = await a.save();
  assert.equal(ra.status, 200); assert.equal(ra.body.version, 2);
  b.edit({body: 'Draft: audience, schedule, budget.'});
  const rb = await b.save();
  assert.equal(rb.status, 409);
  assert.equal(rb.body.error, 'version_conflict');
  assert.equal(rb.body.expectedVersion, 1);
  assert.equal(rb.body.currentVersion, 2, 'conflict response offers the current server version');
  assert.equal(rb.body.current.title, 'Launch plan (approved)', 'and the current server content for comparison');
  const final = F.db.getDoc('doc_1');
  assert.equal(final.version, 2); assert.equal(final.title, 'Launch plan (approved)');
  assert.equal(final.body, ORIGINAL.body, "B's rejected body did not reach the database");
});

test('on conflict the client preserves unsaved text, keeps both versions, and does NOT retry or overwrite', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'Launch plan (approved)'}); await a.save();
  b.edit({body: 'Draft: audience, schedule, budget.'});
  F.requests.length = 0;
  await b.save();
  assert.equal(b.state, 'conflict');
  assert.deepEqual(b.local, {title: ORIGINAL.title, body: 'Draft: audience, schedule, budget.'}, 'unsaved text intact');
  assert.equal(b.conflict.yours.body, 'Draft: audience, schedule, budget.');
  assert.equal(b.conflict.server.version, 2); assert.equal(b.conflict.server.title, 'Launch plan (approved)');
  assert.equal(b.sent.length, 1, 'exactly one save request: no automatic retry');
  assert.deepEqual(F.requests.filter((r) => r.method === 'PUT').map((r) => r.status), [409]);
  await assert.rejects(() => b.save(), /unresolved conflict/, 'saving again requires explicit resolution');
  assert.equal(F.requests.filter((r) => r.method === 'PUT').length, 1, 'the refused save sent nothing');
  assert.equal(F.db.getDoc('doc_1').version, 2);
});

test('explicit resolution: person composes merged text, then saves against the CURRENT version', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'Launch plan (approved)'}); await a.save();
  b.edit({body: 'Draft: audience, schedule, budget.'}); await b.save();
  const {server, yours} = b.conflict;
  b.resolve('merged', {title: server.title, body: yours.body}); // a human decision, not an automatic merge
  assert.equal(b.baseVersion, 2);
  assert.equal(b.state, 'dirty');
  const r = await b.save();
  assert.equal(r.status, 200); assert.equal(r.body.version, 3);
  const final = F.db.getDoc('doc_1');
  assert.deepEqual({title: final.title, body: final.body}, {title: 'Launch plan (approved)', body: 'Draft: audience, schedule, budget.'});
});

test('explicit "keep mine" overwrites only after the person chooses it, and still uses the current version', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'Launch plan (approved)'}); await a.save();
  b.edit({body: 'Draft: audience, schedule, budget.'}); await b.save();
  b.resolve('keep-mine');
  assert.equal(b.baseVersion, 2);
  assert.equal(b.sent.length, 1, 'resolving sends nothing');
  assert.equal((await b.save()).status, 200);
  assert.equal(F.db.getDoc('doc_1').title, ORIGINAL.title, 'explicit choice replaced A: allowed because it was deliberate');
});

test('stale expectedVersion (older or newer than current) is rejected with 409 and changes nothing', async () => {
  const c = await cookieOf('alice');
  F.db.updateIfVersion('doc_1', 1, {title: 'v2', body: 'x'}, 'u_alice'); // server now at 2
  for (const ev of [1, 3, 99]) {
    const r = await putRaw(c, '/docs/doc_1', {title: 'nope', body: 'nope', expectedVersion: ev});
    assert.equal(r.status, 409, `expectedVersion ${ev}`);
  }
  assert.deepEqual({t: F.db.getDoc('doc_1').title, v: F.db.getDoc('doc_1').version}, {t: 'v2', v: 2});
});

test('expectedVersion is required and must be an integer; no write happens on 400', async () => {
  const c = await cookieOf('alice');
  for (const bad of [undefined, null, '1', 1.5, 0, -1]) {
    const body = {title: 't', body: 'b'}; if (bad !== undefined) body.expectedVersion = bad;
    assert.equal((await putRaw(c, '/docs/doc_1', body)).status, 400, String(bad));
  }
  assert.equal(F.db.getDoc('doc_1').version, 1);
});

test('document id is part of the match: doc_1 version does not authorise a write to doc_2', async () => {
  const c = await cookieOf('bob'); // bob is a member of both docs; doc_1 is v1, doc_2 is v4
  const r = await putRaw(c, '/docs/doc_2', {title: 'x', body: 'y', expectedVersion: 1});
  assert.equal(r.status, 409);
  assert.equal((await r.json()).currentVersion, 4);
  assert.equal(F.db.getDoc('doc_2').title, SEED.doc_2.title);
  assert.equal(F.db.getDoc('doc_1').version, 1, 'other document untouched');
});

test('authorization is separate: 401 without a session, 404 for non-members (even with the right version)', async () => {
  assert.equal((await putRaw('', '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1})).status, 401);
  const m = await cookieOf('mallory');
  const right = await putRaw(m, '/docs/doc_1', {title: 'pwn', body: 'pwn', expectedVersion: 1});
  const wrong = await putRaw(m, '/docs/doc_1', {title: 'pwn', body: 'pwn', expectedVersion: 7});
  assert.equal(right.status, 404); assert.equal(wrong.status, 404, 'a non-member must not learn the version via 409');
  assert.equal(JSON.stringify(await wrong.json()).includes('Launch'), false, 'no document content in the denial');
  const a = await cookieOf('alice');
  assert.equal((await fetch(`${F.base}/docs/doc_2`, {headers: {cookie: a}})).status, 404, 'alice is not a member of doc_2');
  assert.deepEqual({...F.db.getDoc('doc_1')}, {id: 'doc_1', ...ORIGINAL, version: 1, updatedBy: null});
});

test('identity comes from the session only: updatedBy ignores client-supplied user fields', async () => {
  const c = await cookieOf('alice');
  const r = await putRaw(c, '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1, userId: 'u_bob', updatedBy: 'u_bob'}, {'x-user-id': 'u_bob'});
  assert.equal(r.status, 200);
  assert.equal(F.db.getDoc('doc_1').updatedBy, 'u_alice');
});

test('COORDINATED CONCURRENT SAVE (HTTP, barrier): two requests with the same expectedVersion -> exactly one accepted', async () => {
  const {a, b} = await twoTabs();
  a.edit({title: 'title from A'}); b.edit({body: 'body from B'});
  let release; const gate = new Promise((r) => { release = r; });
  let ready = 0; const barrier = async () => { if (++ready === 2) release(); await gate; };
  const fire = async (c) => { await barrier(); return c.save(); };
  const [ra, rb] = await Promise.all([fire(a), fire(b)]);
  const statuses = [ra.status, rb.status].sort();
  assert.deepEqual(statuses, [200, 409], 'one 200, one 409 -- never two 200s');
  assert.equal(F.stats.maxInFlightPuts, 2, 'both requests were in flight together (processing delay overlaps)');
  const final = F.db.getDoc('doc_1');
  assert.equal(final.version, 2, 'version advanced exactly once');
  const winner = ra.status === 200 ? 'A' : 'B';
  assert.equal(final.title === 'title from A', winner === 'A');
  const loser = winner === 'A' ? b : a;
  assert.equal(loser.state, 'conflict'); assert.equal(loser.conflict.server.version, 2);
});

test('COORDINATED CONCURRENT SAVE (separate threads + connections, barrier): only one same-version update is accepted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep23-'));
  const file = path.join(dir, 'docs.db');
  const setup = (await import('./db.mjs')).createDb({file});
  const N = 6;
  const shared = new SharedArrayBuffer(8);
  const runs = await Promise.all(Array.from({length: N}, (_, i) => new Promise((res, rej) => {
    const w = new Worker(new URL('./worker.mjs', import.meta.url), {workerData: {file, n: N, who: `w${i}`, expectedVersion: 1, shared}});
    w.once('message', res); w.once('error', rej);
  })));
  assert.deepEqual(runs.filter((r) => r.error), [], 'no worker should fail');
  const accepted = runs.filter((r) => r.changes === 1);
  assert.equal(accepted.length, 1, `exactly one of ${N} same-version updates accepted`);
  assert.equal(accepted[0].version, 2);
  assert.equal(runs.filter((r) => r.changes === 0).length, N - 1);
  const final = setup.getDoc('doc_1');
  assert.equal(final.version, 2);
  assert.equal(final.updatedBy, accepted[0].who);
  assert.equal(final.title, `title by ${accepted[0].who}`);
  setup.close(); fs.rmSync(dir, {recursive: true, force: true});
});

test('database BUSY/locked is 503 (retryable), not 409; local text and version are preserved; nothing is written', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep23-busy-'));
  const file = path.join(dir, 'docs.db');
  const B = await startFixture({file, busyTimeoutMs: 50});
  try {
    const t = await new EditorClient(B.base, 'T').login('alice'); await t.load('doc_1');
    t.edit({title: 'unsaved title'});
    const locker = new DatabaseSync(file);
    locker.exec('BEGIN IMMEDIATE'); // another connection holds the write lock
    let r;
    try { r = await t.save(); } finally { locker.exec('ROLLBACK'); locker.close(); }
    assert.equal(r.status, 503, 'lock failure is NOT reported as a version conflict');
    assert.notEqual(r.status, 409);
    assert.equal(r.body.error, 'database_busy'); assert.equal(r.body.retryable, true);
    assert.equal(t.state, 'save-failed'); assert.equal(t.conflict, null, 'no conflict UI for an infrastructure failure');
    assert.equal(t.local.title, 'unsaved title', 'unsaved text preserved'); assert.equal(t.baseVersion, 1);
    assert.equal(B.db.getDoc('doc_1').version, 1, 'nothing written');
    // The person retries explicitly once the lock is gone; same expectedVersion still valid.
    const again = await t.save();
    assert.equal(again.status, 200); assert.equal(again.body.version, 2);
  } finally { await B.close(); fs.rmSync(dir, {recursive: true, force: true}); }
});

test('unexpected database failure is 500, not 409, and writes nothing', async () => {
  const c = await cookieOf('alice');
  const r = await putRaw(c, '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1}, {'x-fault': 'db-error'});
  assert.equal(r.status, 500);
  assert.equal(F.db.getDoc('doc_1').version, 1);
  const t = await tab('T'); await t.load('doc_1'); t.edit({title: 'keep me'});
  const rr = await t.save({headers: {'x-fault': 'db-error'}});
  assert.equal(rr.status, 500); assert.equal(t.state, 'save-failed'); assert.equal(t.local.title, 'keep me');
});

test('only a version mismatch yields 409: the status set across all failure kinds is disjoint', async () => {
  const seen = {};
  const a = await cookieOf('alice'), m = await cookieOf('mallory');
  seen.conflict = (await putRaw(a, '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 9})).status;
  seen.badRequest = (await putRaw(a, '/docs/doc_1', {title: 't', body: 'b'})).status;
  seen.unauthenticated = (await putRaw('', '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1})).status;
  seen.forbiddenAsNotFound = (await putRaw(m, '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1})).status;
  seen.dbFailure = (await putRaw(a, '/docs/doc_1', {title: 't', body: 'b', expectedVersion: 1}, {'x-fault': 'db-error'})).status;
  assert.deepEqual(seen, {conflict: 409, badRequest: 400, unauthenticated: 401, forbiddenAsNotFound: 404, dbFailure: 500});
});
