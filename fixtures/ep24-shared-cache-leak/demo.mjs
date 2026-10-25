// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
// "Isolated browser contexts" = two independent Client instances (separate cookie jars). No real browser.
import fs from 'node:fs';
import {createApp} from './server.mjs';
import {Client} from './client.mjs';

const app = createApp({mode: 'flawed'});
const port = await app.listen();
const base = `http://127.0.0.1:${port}`;
const alice = new Client(base, 'alice'); const bob = new Client(base, 'bob'); const anon = new Client(base, 'anon');
const log = [];
const row = (phase, who, r, extra = {}) => {
  const e = {phase, client: who, request: `${r.method} ${r.path}`, status: r.status, appCache: r.headers['x-app-cache'] ?? null, cacheControl: r.headers['cache-control'] ?? null,
    viewer: r.body?.viewer?.id ?? null, greeting: r.body?.greeting ?? null, renderSeq: r.body?.renderSeq ?? null, ...extra};
  log.push(e); return e;
};

await alice.login('alice'); await bob.login('bob');
const bobWho = await bob.get('/whoami');
row('0 sessions', 'bob', bobWho, {note: 'server-side session table resolves Bob\'s jar to Bob'});

// Phase 1: flawed cache, path-only key
const a1 = row('1 flawed', 'alice', await alice.get('/dashboard'));
const cacheAfterAlice = {keys: app.cache.keys(), populatedBy: app.cache.peek('/dashboard').populatedBy, size: app.cache.size};
const b1 = row('1 flawed', 'bob', await bob.get('/dashboard'), {note: 'Bob is authenticated as Bob'});
const cacheAfterBob = {keys: app.cache.keys(), hits: app.cache.stats.hits, size: app.cache.size};
const leakedBody = JSON.parse(JSON.stringify(bob.history.at(-1).body));

// Phase 1b: the correct header does not repair custom code that ignores it
const appH = createApp({mode: 'flawed-with-header'});
const baseH = `http://127.0.0.1:${await appH.listen()}`;
const aH = new Client(baseH, 'alice'); const bH = new Client(baseH, 'bob'); await aH.login('alice'); await bH.login('bob');
row('1b flawed + correct header', 'alice', await aH.get('/dashboard'));
const bHr = row('1b flawed + correct header', 'bob', await bH.get('/dashboard'));
await appH.close();

// Unauthenticated, flawed server with a populated cache
const anonFlawed = row('1c unauthenticated', 'anon', await anon.get('/dashboard'));

// Phase 2: repair = bypass the shared cache + explicit purge
const entryBefore = {present: app.cache.has('/dashboard'), size: app.cache.size};
const repairOut = app.repair({purge: true});
const entryAfter = {present: app.cache.has('/dashboard'), size: app.cache.size, purgeLog: app.cache.purgeLog};
const statsBeforeRetest = {...app.cache.stats};

// Phase 3: retest with independent jars, interleaved
for (let i = 0; i < 2; i++) {
  row('3 retest', 'alice', await alice.get('/dashboard'));
  row('3 retest', 'bob', await bob.get('/dashboard'));
}
const anonFixed = row('3 retest', 'anon', await anon.get('/dashboard'));
const statsAfterRetest = {...app.cache.stats};

const retest = log.filter((l) => l.phase === '3 retest' && l.client !== 'anon');
const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  note: 'Two independent cookie jars (Client instances) stand in for isolated browser contexts. No real browser. The cache is in-process application code, not a CDN.',
  cacheKey: {expression: 'url.pathname', value: '/dashboard', includesIdentity: false},
  flawed: {aliceStatus: a1.status, aliceAppCache: a1.appCache, aliceViewer: a1.viewer, bobStatus: b1.status, bobAppCache: b1.appCache, bobViewer: b1.viewer, bobGreeting: b1.greeting, leakedEmail: leakedBody.viewer.email,
    sameRenderSeq: a1.renderSeq === b1.renderSeq, bobWhoami: bobWho.body.id, cacheAfterAlice, cacheAfterBob},
  headerDoesNotRepair: {cacheControl: bHr.cacheControl, appCache: bHr.appCache, bobViewer: bHr.viewer},
  unauthenticated: {flawedWithPopulatedCache: anonFlawed.status, corrected: anonFixed.status, correctedCacheControl: anonFixed.cacheControl},
  repair: {entryBefore, repairOut, entryAfter, cacheStatsBeforeRetest: statsBeforeRetest, cacheStatsAfterRetest: statsAfterRetest,
    sharedCacheTouchedDuringRetest: statsAfterRetest.reads !== statsBeforeRetest.reads || statsAfterRetest.writes !== statsBeforeRetest.writes},
  retest: {requests: retest.length, aliceOnlyAlice: retest.filter((l) => l.client === 'alice').every((l) => l.viewer === 'u_alice'),
    bobOnlyBob: retest.filter((l) => l.client === 'bob').every((l) => l.viewer === 'u_bob'), allBypass: retest.every((l) => l.appCache === 'BYPASS'),
    allPrivateNoStore: retest.every((l) => l.cacheControl === 'private, no-store'), distinctRenderSeqs: new Set(retest.map((l) => l.renderSeq)).size},
  alreadyDelivered: {leakedBodyStillHeldByClient: bob.history.find((h) => h.body?.viewer?.id === 'u_alice') !== undefined, note: 'The repair changes later responses only. The leaked response had already been delivered and is not retracted.'},
  log,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(log.map((l) => ({phase: l.phase, client: l.client, status: l.status, cache: l.appCache ?? '-', viewer: l.viewer ?? '-', seq: l.renderSeq ?? '-'})));
await app.close();
