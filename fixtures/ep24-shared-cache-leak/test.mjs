import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp, cacheKey, USERS} from './server.mjs';
import {Client} from './client.mjs';

// Each test boots its own app on an ephemeral 127.0.0.1 port; two Clients = two independent cookie jars.
async function boot(mode, t) {
  const app = createApp({mode});
  const port = await app.listen();
  t.after(() => app.close());
  const base = `http://127.0.0.1:${port}`;
  const alice = new Client(base, 'alice'); const bob = new Client(base, 'bob');
  await alice.login('alice'); await bob.login('bob');
  return {app, alice, bob, base};
}

/* ---------- known-positive controls: the flaw must be observable ---------- */

test('CONTROL: flawed cache gives Bob the page Alice populated (authentication was correct)', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  assert.equal((await bob.get('/whoami')).body.id, 'u_bob', 'Bob\'s session resolves to Bob');
  const a = await alice.get('/dashboard');
  assert.equal(a.status, 200); assert.equal(a.headers['x-app-cache'], 'MISS');
  assert.equal(a.body.viewer.id, 'u_alice');
  const b = await bob.get('/dashboard');
  assert.equal(b.status, 200, 'Bob is authenticated, so the request succeeds');
  assert.equal(b.headers['x-app-cache'], 'HIT');
  assert.equal(b.body.viewer.id, 'u_alice', 'FLAW: Bob received Alice\'s payload');
  assert.equal(b.body.viewer.email, 'alice@example.test');
  assert.equal(b.body.greeting, 'Welcome back, Alice');
  assert.equal(b.body.renderSeq, a.body.renderSeq, 'same rendered payload, not rendered for Bob');
  assert.equal(app.cache.stats.hits, 1);
});

test('CONTROL: the cache key is the path only; no identity is part of it', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  assert.equal(cacheKey(new URL('http://127.0.0.1/dashboard')), '/dashboard');
  await alice.get('/dashboard');
  assert.deepEqual(app.cache.keys(), ['/dashboard']);
  assert.equal(app.cache.peek('/dashboard').populatedBy, 'u_alice');
  await bob.get('/dashboard');
  assert.deepEqual(app.cache.keys(), ['/dashboard'], 'Bob mapped onto the same single slot');
  assert.ok(!app.cache.keys().some((k) => k.includes('alice') || k.includes('bob')));
});

test('CONTROL: order does not matter; whoever arrives first fills the slot for everyone', async (t) => {
  const {alice, bob} = await boot('flawed', t);
  const b = await bob.get('/dashboard');
  const a = await alice.get('/dashboard');
  assert.equal(b.body.viewer.id, 'u_bob');
  assert.equal(a.body.viewer.id, 'u_bob', 'Alice now sees Bob\'s page');
});

test('CONTROL: Cache-Control does not repair custom code that ignores it (flawed server WITH the header still leaks)', async (t) => {
  const {app, alice, bob} = await boot('flawed-with-header', t);
  const a = await alice.get('/dashboard');
  assert.equal(a.headers['cache-control'], 'private, no-store', 'the correct header is present on the response');
  const b = await bob.get('/dashboard');
  assert.equal(b.headers['cache-control'], 'private, no-store');
  assert.equal(b.headers['x-app-cache'], 'HIT', 'the in-process cache never looked at the header');
  assert.equal(b.body.viewer.id, 'u_alice', 'still leaks');
  assert.equal(app.cache.size, 1, 'the entry was stored despite no-store');
});

/* ---------- unauthenticated ---------- */

test('unauthenticated request gets 401 and is never served a cached page (flawed server, populated cache)', async (t) => {
  const {app, alice, base} = await boot('flawed', t);
  await alice.get('/dashboard');
  assert.equal(app.cache.size, 1);
  const anon = new Client(base, 'anon');
  const r = await anon.get('/dashboard');
  assert.equal(r.status, 401);
  assert.equal(r.headers['x-app-cache'], undefined);
  const bad = new Client(base, 'bad'); bad.jar.sid = 'sid_not_in_table';
  assert.equal((await bad.get('/dashboard')).status, 401);
});

test('unauthenticated request gets 401 from the corrected route, with private, no-store', async (t) => {
  const {app, base} = await boot('corrected', t);
  const anon = new Client(base, 'anon');
  const r = await anon.get('/dashboard');
  assert.equal(r.status, 401);
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.equal(JSON.stringify(r.body).includes('Alice'), false);
  assert.equal(app.cache.stats.reads + app.cache.stats.writes, 0);
});

test('logout invalidates the session on the corrected route', async (t) => {
  const {alice} = await boot('corrected', t);
  assert.equal((await alice.get('/dashboard')).status, 200);
  await alice.request('POST', '/logout');
  assert.equal((await alice.get('/dashboard')).status, 401);
});

/* ---------- the repair: bypass + purge ---------- */

test('repair purges the old shared entry (purge assertions)', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  await alice.get('/dashboard');
  assert.equal(app.cache.has('/dashboard'), true, 'before: Alice\'s page sits in the shared slot');
  assert.equal(app.cache.size, 1);
  const out = app.repair({purge: true});
  assert.equal(out.mode, 'corrected');
  assert.equal(out.purged, true, 'purge() reported that an entry was removed');
  assert.equal(app.cache.has('/dashboard'), false, 'after: slot is gone');
  assert.equal(app.cache.size, 0);
  assert.equal(app.cache.stats.purges, 1);
  assert.deepEqual(app.cache.purgeLog.map((p) => [p.key, p.populatedBy]), [['/dashboard', 'u_alice']]);
  assert.equal(app.cache.purge('/dashboard', 'again'), false, 'a second purge finds nothing');
  const b = await bob.get('/dashboard');
  assert.equal(b.body.viewer.id, 'u_bob');
});

test('bypass alone leaves the old entry in memory; only the explicit purge removes it', async (t) => {
  const {app, alice} = await boot('flawed', t);
  await alice.get('/dashboard');
  app.repair({purge: false});
  assert.equal(app.cache.has('/dashboard'), true, 'unreachable by the route now, but still resident');
  assert.equal(app.cache.peek('/dashboard').body.includes('alice@example.test'), true);
  assert.equal(app.cache.purge('/dashboard', 'explicit'), true);
  assert.equal(app.cache.has('/dashboard'), false);
});

test('corrected route never reads or writes the shared cache', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  await alice.get('/dashboard');
  app.repair({purge: true});
  const before = {...app.cache.stats};
  for (let i = 0; i < 3; i++) { await alice.get('/dashboard'); await bob.get('/dashboard'); }
  assert.equal(app.cache.stats.reads, before.reads);
  assert.equal(app.cache.stats.writes, before.writes);
  assert.equal(app.cache.size, 0);
});

/* ---------- cross-user isolation after repair ---------- */

test('cross-user isolation: interleaved requests from independent jars each get only their own page', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  await alice.get('/dashboard'); await bob.get('/dashboard'); // leak happens first
  app.repair({purge: true});
  const seqs = new Set();
  for (let i = 0; i < 4; i++) {
    const a = await alice.get('/dashboard'); const b = await bob.get('/dashboard');
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.equal(a.body.viewer.id, 'u_alice'); assert.equal(a.body.greeting, 'Welcome back, Alice');
    assert.equal(b.body.viewer.id, 'u_bob'); assert.equal(b.body.greeting, 'Welcome back, Bob');
    assert.ok(!JSON.stringify(a.body).includes('bob@example.test'));
    assert.ok(!JSON.stringify(b.body).includes('alice@example.test'));
    assert.equal(a.headers['x-app-cache'], 'BYPASS'); assert.equal(b.headers['x-app-cache'], 'BYPASS');
    seqs.add(a.body.renderSeq); seqs.add(b.body.renderSeq);
  }
  assert.equal(seqs.size, 8, 'every response was rendered fresh for its own request');
});

test('cross-user isolation holds regardless of who goes first (corrected)', async (t) => {
  const {bob, alice} = await boot('corrected', t);
  assert.equal((await bob.get('/dashboard')).body.viewer.id, 'u_bob');
  assert.equal((await alice.get('/dashboard')).body.viewer.id, 'u_alice');
  assert.equal((await bob.get('/dashboard')).body.viewer.id, 'u_bob');
});

test('a second session for the same user is also isolated from the first user\'s jar', async (t) => {
  const {base, bob} = await boot('corrected', t);
  const alice2 = new Client(base, 'alice-second-jar'); await alice2.login('alice');
  assert.equal((await alice2.get('/dashboard')).body.viewer.id, 'u_alice');
  assert.equal((await bob.get('/dashboard')).body.viewer.id, 'u_bob');
});

test('corrected route authorizes every request: a revoked permission takes effect on the next request', async (t) => {
  const {app, alice, bob} = await boot('corrected', t);
  assert.equal((await bob.get('/dashboard')).status, 200);
  const saved = USERS.bob.permissions; USERS.bob.permissions = new Set();
  t.after(() => { USERS.bob.permissions = saved; });
  const r = await bob.get('/dashboard');
  assert.equal(r.status, 403);
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.equal((await alice.get('/dashboard')).status, 200);
  assert.equal(app.cache.stats.writes, 0);
});

/* ---------- response-header tests ---------- */

test('response headers: corrected 200 and 401 carry exactly "private, no-store"', async (t) => {
  const {alice, base} = await boot('corrected', t);
  const ok = await alice.get('/dashboard');
  assert.equal(ok.headers['cache-control'], 'private, no-store');
  assert.equal((await new Client(base, 'anon').get('/dashboard')).headers['cache-control'], 'private, no-store');
  assert.equal(ok.headers['vary'], undefined, 'this fixture does not rely on Vary');
});

test('response headers: the flawed variant sends no Cache-Control at all', async (t) => {
  const {alice} = await boot('flawed', t);
  assert.equal((await alice.get('/dashboard')).headers['cache-control'], undefined);
});

/* ---------- scope of the guarantee ---------- */

test('already-delivered responses are not retracted by the repair', async (t) => {
  const {app, alice, bob} = await boot('flawed', t);
  await alice.get('/dashboard');
  const leaked = await bob.get('/dashboard');
  app.repair({purge: true});
  const retest = await bob.get('/dashboard');
  assert.equal(retest.body.viewer.id, 'u_bob');
  // The fixture's client transcript still holds the earlier leaked body; nothing the server does now changes bytes already sent.
  assert.equal(bob.history[bob.history.indexOf(leaked)].body.viewer.id, 'u_alice');
  assert.equal(leaked.body.viewer.email, 'alice@example.test');
});

test('loopback only: servers bind 127.0.0.1', async (t) => {
  const {app} = await boot('corrected', t);
  assert.equal(app.server.address().address, '127.0.0.1');
});
