// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
// A  flawed:     delete the primary row only            -> index, cached response, open display all still show c_1003
// B  corrected:  delete + outbox in one transaction; worker; cache step fails once; retry; replay; browser refresh
// C  exhausted:  cache step keeps failing -> explicit failed state + alert, never marked processed
// The "browser" is client.mjs BrowserSim: SIMULATED CLIENT STATE, not a real browser.
import fs from 'node:fs';
import {createApp} from './server.mjs';
import {BrowserSim} from './client.mjs';

const TARGET = 'c_1003';
const run = async (label, opts, scenario) => {
  const app = createApp(opts);
  const port = await app.listen();
  const base = `http://127.0.0.1:${port}`;
  const j = async (method, p, body) => {
    const r = await fetch(base + p, {method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
    return {status: r.status, xCache: r.headers.get('x-cache'), body: r.status === 204 ? null : await r.json()};
  };
  const browser = new BrowserSim(base);
  const search = async (q) => { const r = await j('GET', `/search?q=${q}`); return {query: q, status: r.status, xCache: r.xCache, ids: r.body.results.map((x) => x.id)}; };
  const where = () => { const s = app.dir.snapshot(TARGET); return {primary: s.primary, searchIndex: s.searchIndex, cachedQueriesContainingIt: s.cacheQueriesContaining, cacheEntries: s.cacheEntries}; };
  try { return await scenario({app, j, browser, search, where}); } finally { await app.close(); }
};

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  note: 'Synthetic contacts. The browser is a plain object (SIMULATED CLIENT STATE), not a real browser. Backups, logs, exports and third-party copies are out of scope.',
  targetContact: TARGET,
  scenarios: {},
};

// A — flawed
evidence.scenarios.flawed = await run('flawed', {}, async ({app, j, browser, search, where}) => {
  const out = {};
  out.before = {primaryGet: (await j('GET', `/contacts/${TARGET}`)).status, ...where()};
  out.browserFetch = await browser.search('harbourline');
  out.search_harbourline_before_delete = await search('harbourline');
  out.deleteVuln = (await j('DELETE', `/vuln/contacts/${TARGET}`)).status;
  out.afterDelete = {primaryGet: (await j('GET', `/contacts/${TARGET}`)).status, ...where(), outboxEvents: app.dir.outbox().length};
  out.search_harbourline_cached = await search('harbourline'); // served from the application cache
  out.search_dana_uncached = await search('dana'); // served from the search index
  out.browserDisplayed = browser.displayed('harbourline');
  return out;
});

// B — corrected
evidence.scenarios.corrected = await run('corrected', {}, async ({app, j, browser, search, where}) => {
  const out = {};
  out.browserFetch = await browser.search('harbourline');
  out.browserFetchDana = await browser.search('dana');
  out.search_harbourline = await search('harbourline');
  out.search_dana = await search('dana');
  out.cacheEntriesBefore = app.dir.snapshot(TARGET).cacheEntries;
  const del = await j('DELETE', `/contacts/${TARGET}`);
  out.delete = {status: del.status, body: del.body};
  out.afterDeleteBeforeWorker = {primaryGet: (await j('GET', `/contacts/${TARGET}`)).status, ...where(), outbox: app.dir.outbox()};
  app.dir.injectFault('cache', 1);
  out.attempt1 = (await j('POST', '/admin/worker/run')).body.results[0];
  out.afterAttempt1 = {...where()};
  out.search_harbourline_during_failure = await search('harbourline'); // stale, from cache
  out.search_ravi_during_failure = await search('ravi'); // uncached, from index
  out.browserRefreshDuringFailure = await browser.refresh('harbourline');
  out.attempt2 = (await j('POST', '/admin/worker/run')).body.results[0];
  out.afterAttempt2 = {...where()};
  out.verifyBackend = {primary: app.dir.snapshot(TARGET).primary, searchIndex: app.dir.snapshot(TARGET).searchIndex, cachedQueriesContainingIt: app.dir.snapshot(TARGET).cacheQueriesContaining};
  out.browserStillDisplays_beforeRefresh = {harbourline: browser.displayed('harbourline'), dana: browser.displayed('dana')};
  out.browserRefreshed = {harbourline: (await browser.refresh('harbourline')).ids, dana: (await browser.refresh('dana')).ids};
  // replay + id reuse
  const created = await j('POST', '/contacts', {name: 'Noor Ashby', email: 'noor.ashby@example.test', phone: '555-0106', org: 'Harbourline Studio'});
  const stateBefore = JSON.stringify({outbox: app.dir.outbox(), index: app.dir.searchIndexRows(), primary: app.dir.primaryIds()});
  app.dir.worker.replay(1);
  app.dir.worker.replay(1);
  const stateAfter = JSON.stringify({outbox: app.dir.outbox(), index: app.dir.searchIndexRows(), primary: app.dir.primaryIds()});
  out.replay = {replays: 2, stateUnchanged: stateBefore === stateAfter, newContactId: created.body.id, newContactIdDiffersFromDeleted: created.body.id !== TARGET, newContactStillIndexed: app.dir.snapshot(created.body.id).searchIndex, finalOutbox: app.dir.outbox()};
  return out;
});

// C — retries exhausted
evidence.scenarios.retriesExhausted = await run('exhausted', {maxAttempts: 3}, async ({app, j, search, where}) => {
  const out = {maxAttempts: 3};
  await search('harbourline');
  await j('DELETE', `/contacts/${TARGET}`);
  app.dir.injectFault('cache', 99);
  out.attempts = [];
  for (let i = 0; i < 3; i++) out.attempts.push((await j('POST', '/admin/worker/run')).body.results[0]);
  out.finalEvent = app.dir.outbox()[0];
  out.alerts = (await j('GET', '/admin/alerts')).body.alerts;
  out.stillStale = {...where(), search_harbourline: await search('harbourline')};
  out.workerPassAfterFailed = (await j('POST', '/admin/worker/run')).body.results;
  return out;
});

fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log('evidence.json written');
const c = evidence.scenarios.corrected;
console.log('flawed: after delete -> primary GET', evidence.scenarios.flawed.afterDelete.primaryGet, '| index', evidence.scenarios.flawed.afterDelete.searchIndex, '| cached ids', evidence.scenarios.flawed.search_harbourline_cached.ids.join(','));
console.log('corrected: attempt1', c.attempt1.status, 'attempts', c.attempt1.attempts, '| attempt2', c.attempt2.status, 'attempts', c.attempt2.attempts, '| refreshed', JSON.stringify(c.browserRefreshed));
console.log('exhausted:', evidence.scenarios.retriesExhausted.finalEvent.status, 'alerts', evidence.scenarios.retriesExhausted.alerts.length);
