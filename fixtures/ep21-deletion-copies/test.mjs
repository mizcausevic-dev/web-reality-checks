import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './server.mjs';
import {BrowserSim} from './client.mjs';

/** Fresh server + fresh in-memory database per test. */
const boot = async (opts) => {
  const app = createApp(opts);
  const port = await app.listen();
  const base = `http://127.0.0.1:${port}`;
  const api = {
    get: async (p) => { const r = await fetch(base + p); return {status: r.status, xCache: r.headers.get('x-cache'), body: r.status === 204 ? null : await r.json()}; },
    del: async (p) => { const r = await fetch(base + p, {method: 'DELETE'}); return {status: r.status, body: r.status === 204 ? null : await r.json()}; },
    post: async (p, b) => { const r = await fetch(base + p, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(b ?? {})}); return {status: r.status, body: await r.json()}; },
  };
  return {...app, base, api, browser: new BrowserSim(base)};
};
const ids = (r) => r.body.results.map((x) => x.id);
const TARGET = 'c_1003'; // Dana Whitlock, org Harbourline Studio (shares the org with c_1004)
const withApp = (name, opts, fn) =>
  test(name, async () => {
    const app = await boot(opts);
    try { await fn(app); } finally { await app.close(); }
  });

withApp('server binds loopback only', {}, async ({server}) => {
  assert.equal(server.address().address, '127.0.0.1');
});

withApp('seed: primary, search index and search results agree before any deletion', {}, async ({api, dir}) => {
  assert.deepEqual(dir.primaryIds(), dir.searchIndexRows());
  assert.equal((await api.get(`/contacts/${TARGET}`)).status, 200);
  assert.deepEqual(ids(await api.get('/search?q=harbourline')), ['c_1003', 'c_1004']);
});

withApp('CONTROL (known positive): deleting only the primary row leaves the index and the cached response returning the contact', {}, async ({api, dir}) => {
  const first = await api.get('/search?q=harbourline');
  assert.equal(first.xCache, 'miss');
  assert.equal((await api.del(`/vuln/contacts/${TARGET}`)).status, 204);
  assert.equal((await api.get(`/contacts/${TARGET}`)).status, 404, 'primary record is gone');
  const cached = await api.get('/search?q=harbourline');
  assert.equal(cached.xCache, 'hit');
  assert.ok(ids(cached).includes(TARGET), 'cached search response still returns the deleted contact');
  const uncached = await api.get('/search?q=dana');
  assert.equal(uncached.xCache, 'miss');
  assert.ok(ids(uncached).includes(TARGET), 'search index still returns the deleted contact');
  const snap = dir.snapshot(TARGET);
  assert.equal(snap.primary, false);
  assert.equal(snap.searchIndex, true);
  assert.deepEqual(snap.outbox, [], 'the flawed path records no cleanup intent at all');
});

withApp('corrected delete: primary row and outbox event are written together; derived copies are untouched until the worker runs', {}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  const r = await api.del(`/contacts/${TARGET}`);
  assert.equal(r.status, 202);
  assert.deepEqual(r.body, {contactId: TARGET, eventId: 1, cleanup: 'pending'});
  const snap = dir.snapshot(TARGET);
  assert.equal(snap.primary, false);
  assert.equal(snap.outbox.length, 1);
  assert.equal(snap.outbox[0].status, 'pending');
  assert.equal(snap.outbox[0].contactId, TARGET);
  // The outbox records cleanup INTENT. It does not make the other destinations update atomically.
  assert.equal(snap.searchIndex, true);
  assert.deepEqual(snap.cacheQueriesContaining, ['harbourline']);
});

withApp('atomicity: if the outbox insert fails, the primary delete rolls back too', {}, async ({api, dir}) => {
  dir.injectFault('outbox_insert', 1);
  const r = await api.del(`/contacts/${TARGET}`);
  assert.equal(r.status, 500);
  assert.equal((await api.get(`/contacts/${TARGET}`)).status, 200, 'contact still exists: no half-done delete');
  assert.deepEqual(dir.outbox(), []);
  // Retrying the delete now succeeds and yields exactly one event.
  assert.equal((await api.del(`/contacts/${TARGET}`)).status, 202);
  assert.equal(dir.outbox().length, 1);
});

withApp('double DELETE does not create a second cleanup event', {}, async ({api, dir}) => {
  assert.equal((await api.del(`/contacts/${TARGET}`)).status, 202);
  assert.equal((await api.del(`/contacts/${TARGET}`)).status, 404);
  assert.equal(dir.outbox().length, 1);
});

withApp('unknown and malformed ids: 404 and 400, no events', {}, async ({api, dir}) => {
  assert.equal((await api.del('/contacts/c_9999')).status, 404);
  assert.equal((await api.del('/contacts/not-an-id')).status, 400);
  assert.equal((await api.get('/contacts/c_9999')).status, 404);
  assert.deepEqual(dir.outbox(), []);
});

withApp('deletion: worker removes the index entry, invalidates the whole directory cache, then marks the event processed', {}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  await api.get('/search?q=dana');
  await api.get('/search?q=northpier'); // unrelated query, also cached
  assert.equal(dir.cache.size, 3);
  await api.del(`/contacts/${TARGET}`);
  const res = await api.post('/admin/worker/run');
  assert.equal(res.body.results.length, 1);
  assert.deepEqual(res.body.results[0], {eventId: 1, type: 'contact.deleted', contactId: TARGET, status: 'processed', attempts: 1, stepsDone: ['search_index', 'cache'], lastError: null});
  const snap = dir.snapshot(TARGET);
  assert.equal(snap.primary, false);
  assert.equal(snap.searchIndex, false);
  assert.deepEqual(snap.cacheQueriesContaining, []);
  assert.equal(dir.cache.size, 0, 'whole-directory invalidation: unrelated cached queries are dropped too (deliberate, simple policy)');
  const after = await api.get('/search?q=harbourline');
  assert.equal(after.xCache, 'miss');
  assert.deepEqual(ids(after), ['c_1004'], 'the other contact in the same organisation is untouched');
  assert.deepEqual(ids(await api.get('/search?q=dana')), []);
});

withApp('partial failure: cache invalidation fails once after the index entry was removed; event stays pending and stale data is served from the cache', {}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('cache', 1);
  const [ev] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev.status, 'pending', 'must NOT be marked processed');
  assert.equal(ev.attempts, 1);
  assert.deepEqual(ev.stepsDone, ['search_index']);
  assert.match(ev.lastError, /injected failure: cache/);
  const snap = dir.snapshot(TARGET);
  assert.equal(snap.primary, false);
  assert.equal(snap.searchIndex, false, 'index step had completed');
  assert.deepEqual(snap.cacheQueriesContaining, ['harbourline'], 'cache not yet invalidated');
  const stale = await api.get('/search?q=harbourline');
  assert.equal(stale.xCache, 'hit');
  assert.ok(ids(stale).includes(TARGET), 'a directory cache exposes stale data until invalidation succeeds');
  // A query that was never cached goes to the (already clean) index and does not return the contact.
  const fresh = await api.get('/search?q=whitlock');
  assert.equal(fresh.xCache, 'miss');
  assert.deepEqual(ids(fresh), []);
});

withApp('retry: the next pass completes only the failed step and then marks the event processed', {}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('cache', 1);
  await api.post('/admin/worker/run');
  const [ev] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev.status, 'processed');
  assert.equal(ev.attempts, 2);
  assert.deepEqual(ev.stepsDone, ['search_index', 'cache']);
  assert.equal(ev.lastError, null);
  const snap = dir.snapshot(TARGET);
  assert.deepEqual([snap.primary, snap.searchIndex, snap.cacheQueriesContaining.length], [false, false, 0]);
  assert.deepEqual(ids(await api.get('/search?q=harbourline')), ['c_1004']);
  assert.deepEqual((await api.post('/admin/worker/run')).body.results, [], 'processed events are not picked up again');
});

withApp('partial failure in the other order: index step fails first, nothing is marked done, retry succeeds', {}, async ({api, dir}) => {
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('search_index', 1);
  const [ev] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev.status, 'pending');
  assert.deepEqual(ev.stepsDone, []);
  assert.equal(dir.snapshot(TARGET).searchIndex, true);
  const [ev2] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev2.status, 'processed');
  assert.equal(dir.snapshot(TARGET).searchIndex, false);
});

withApp('replay: re-running every cleanup step of a processed event is safe and changes nothing else', {}, async ({api, dir}) => {
  await api.del(`/contacts/${TARGET}`);
  await api.post('/admin/worker/run');
  const before = JSON.stringify({outbox: dir.outbox(), index: dir.searchIndexRows(), primary: dir.primaryIds()});
  dir.worker.replay(1);
  dir.worker.replay(1);
  assert.equal(JSON.stringify({outbox: dir.outbox(), index: dir.searchIndexRows(), primary: dir.primaryIds()}), before);
  assert.deepEqual(dir.searchIndexRows(), ['c_1001', 'c_1002', 'c_1004', 'c_1005'], 'other contacts keep their index entries');
  assert.throws(() => dir.worker.replay(99), /only defined for processed/);
});

withApp('replay after a lost acknowledgement: event redelivered as pending after cleanup already happened', {}, async ({api, dir}) => {
  await api.del(`/contacts/${TARGET}`);
  await api.post('/admin/worker/run');
  // Simulate "worker did the work but its status update was lost": put the event back to its initial pending state.
  dir.sql.exec(`UPDATE outbox SET status = 'pending', attempts = 0, steps_done = '[]' WHERE event_id = 1`);
  const [ev] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev.status, 'processed');
  assert.equal(dir.snapshot(TARGET).searchIndex, false);
  assert.equal(dir.outbox().length, 1, 'no duplicate event');
});

withApp('replay never touches a newer contact: the deleted id is not reused', {}, async ({api, dir}) => {
  await api.del(`/contacts/${TARGET}`);
  await api.post('/admin/worker/run');
  const created = await api.post('/contacts', {name: 'Noor Ashby', email: 'noor.ashby@example.test', phone: '555-0106', org: 'Harbourline Studio'});
  assert.equal(created.body.id, 'c_1006');
  assert.notEqual(created.body.id, TARGET);
  dir.worker.replay(1);
  assert.equal(dir.snapshot('c_1006').searchIndex, true);
  assert.deepEqual(ids(await api.get('/search?q=harbourline')), ['c_1004', 'c_1006']);
});

withApp('retries exhausted: explicit failed state, an alert is raised, and the event is NOT silently completed', {maxAttempts: 3}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('cache', 99);
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await api.post('/admin/worker/run')).body.results[0].status);
  assert.deepEqual(statuses, ['pending', 'pending', 'failed']);
  const [ev] = dir.outbox();
  assert.equal(ev.status, 'failed');
  assert.equal(ev.attempts, 3);
  assert.match(ev.lastError, /injected failure: cache/);
  const alerts = (await api.get('/admin/alerts')).body.alerts;
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0], {kind: 'cleanup_failed', eventId: 1, contactId: TARGET, attempts: 3, step: 'cache', error: 'injected failure: cache'});
  // Still stale, and the system says so rather than pretending otherwise.
  assert.ok(ids(await api.get('/search?q=harbourline')).includes(TARGET));
  // A failed event is not retried automatically.
  assert.deepEqual((await api.post('/admin/worker/run')).body.results, []);
  assert.equal(dir.outbox()[0].attempts, 3);
});

withApp('retries exhausted: an operator can reopen the failed event after the cause is fixed', {maxAttempts: 2}, async ({api, dir}) => {
  await api.get('/search?q=harbourline');
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('cache', 99);
  await api.post('/admin/worker/run');
  await api.post('/admin/worker/run');
  assert.equal(dir.outbox()[0].status, 'failed');
  assert.equal((await api.post('/admin/worker/retry/1')).status, 200);
  dir.injectFault('cache', 0); // cause fixed
  const [ev] = (await api.post('/admin/worker/run')).body.results;
  assert.equal(ev.status, 'processed');
  assert.deepEqual(ids(await api.get('/search?q=harbourline')), ['c_1004']);
  assert.equal((await api.post('/admin/worker/retry/1')).status, 409, 'only failed events can be reopened');
});

withApp('SIMULATED CLIENT STATE: an already-open display keeps showing the contact after backend cleanup until it fetches again', {}, async ({api, dir, browser}) => {
  const shown = await browser.search('harbourline');
  assert.deepEqual(shown.ids, ['c_1003', 'c_1004']);
  await api.del(`/contacts/${TARGET}`);
  await api.post('/admin/worker/run');
  const snap = dir.snapshot(TARGET);
  assert.deepEqual([snap.primary, snap.searchIndex, snap.cacheQueriesContaining.length], [false, false, 0], 'backend is clean');
  assert.deepEqual(browser.displayed('harbourline'), ['c_1003', 'c_1004'], 'stale display remains: the server cannot recall what the client already holds');
  const refreshed = await browser.refresh('harbourline');
  assert.deepEqual(refreshed.ids, ['c_1004']);
  assert.deepEqual(browser.displayed('harbourline'), ['c_1004']);
});

withApp('SIMULATED CLIENT STATE: refreshing while cache invalidation is still pending still shows the contact', {}, async ({api, dir, browser}) => {
  await browser.search('harbourline');
  await api.del(`/contacts/${TARGET}`);
  dir.injectFault('cache', 1);
  await api.post('/admin/worker/run');
  const r = await browser.refresh('harbourline');
  assert.equal(r.xCache, 'hit');
  assert.ok(r.ids.includes(TARGET), 'refresh is served from the stale directory cache');
  await api.post('/admin/worker/run');
  assert.deepEqual((await browser.refresh('harbourline')).ids, ['c_1004']);
});

test('contact ids are never reused: AUTOINCREMENT, even when the highest id is deleted', async () => {
  const app = await boot();
  try {
    assert.equal((await app.api.del('/contacts/c_1005')).status, 202); // highest id
    const a = await app.api.post('/contacts', {name: 'Noor Ashby', email: 'n@example.test', phone: '555-0106', org: 'Quayside Co-op'});
    assert.equal(a.body.id, 'c_1006');
    assert.equal((await app.api.get('/contacts/c_1005')).status, 404);
  } finally { await app.close(); }
});

test('CONTROL: a table WITHOUT AUTOINCREMENT does reuse the highest deleted id (why the fixture uses it)', () => {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO t (id, v) VALUES (1,'a'),(2,'b'); DELETE FROM t WHERE id = 2;`);
  assert.equal(Number(s.prepare(`INSERT INTO t (v) VALUES ('c')`).run().lastInsertRowid), 2);
});
