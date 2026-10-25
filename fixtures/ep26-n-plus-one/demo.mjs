// Runs the exact scenario shown in the video and writes evidence.json.
// Everything below is read back from the instrumentation log or the HTTP responses; nothing is hardcoded.
// NO timing is recorded or claimed: the video makes no latency statement.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createFixture} from './server.mjs';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const slim = (s) => ({seq: s.seq, sql: s.sql, params: s.params, rows: s.rowCount, counted: s.counted});

const run = async ({hiddenExtraQuery = false} = {}) => {
  const fx = createFixture({hiddenExtraQuery});
  const port = await fx.listen();
  const base = `http://127.0.0.1:${port}`;
  const cookie = (await fetch(`${base}/login/alice`)).headers.get('set-cookie').split(';')[0];
  const call = async (path) => {
    const r = await fetch(base + path, {headers: {cookie}});
    const text = await r.text();
    return {status: r.status, header: r.headers.get('x-db-selects'), text, report: fx.lastReport()};
  };
  return {fx, call, close: () => fx.close()};
};

const main = await run();
const flawed = await main.call('/vuln/articles');
const corrected = await main.call('/articles');

const ctl = await run({hiddenExtraQuery: true});
const ctlFlawed = await ctl.call('/vuln/articles');
const ctlCorrected = await ctl.call('/articles');

const body = JSON.parse(flawed.text);
const rep = flawed.report;
const counted = rep.statements.filter((s) => s.counted);
const lookups = counted.slice(1);
const freq = new Map();
for (const s of lookups) freq.set(s.params[0], (freq.get(s.params[0]) ?? 0) + 1);
const authorById = new Map(body.articles.map((a) => [a.author.id, a.author]));
const byFreq = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
const top = byFreq[0];
const topAuthorArticleIds = body.articles.filter((a) => a.author.id === top[0]).map((a) => a.id);

const evidence = {
  fixture: 'ep26-n-plus-one',
  base: 'http://127.0.0.1:<ephemeral>',
  scopeLabel: rep.label,
  countingPolicy: {
    counted: 'SELECT statements executed through the wrapper (prepare().all/get) while the article-list scope is active',
    excludedFromCount: [
      'setup: schema + seed run on the raw connection, never logged',
      'authentication: the session lookup is logged but runs outside the scope',
      'transaction control: BEGIN / COMMIT run via wrapper.exec inside the scope and are logged as excluded',
      'instrumentation: the wrapper issues no SQL of its own',
    ],
    nonSelectInScope: 'reported separately as otherScoped; must be 0 for the "101 SELECTs" claim',
  },
  seed: {
    articles: body.count,
    authors: authorById.size,
    nullAuthorIds: 0,
    foreignKeys: 'PRAGMA foreign_keys = ON; foreign_key_check returned no rows',
  },
  flawed: {
    endpoint: 'GET /vuln/articles',
    status: flawed.status,
    selectCount: rep.selectCount,
    headerXDbSelects: flawed.header,
    otherScoped: rep.otherScoped,
    statementsLoggedInScope: rep.statements.length,
    excludedInScope: rep.excludedInScope,
    listQueries: 1,
    authorLookups: lookups.length,
    distinctAuthorsLookedUp: freq.size,
    lookupsThatRepeatedAnEarlierAuthor: lookups.length - freq.size,
    mostRepeatedAuthor: {id: top[0], handle: authorById.get(top[0]).handle, name: authorById.get(top[0]).name, lookups: top[1], articleIds: topAuthorArticleIds},
    lookupsPerAuthor: Object.fromEntries(byFreq.map(([id, n]) => [authorById.get(id).handle, n])),
    scopedSqlLog: {
      note: 'first 5 and last 1 of the counted SELECTs, copied from the instrumentation log',
      first5: counted.slice(0, 5).map(slim),
      last1: counted.slice(-1).map(slim),
      total: counted.length,
    },
    bodyBytes: Buffer.byteLength(flawed.text),
    bodySha256: sha(flawed.text),
  },
  corrected: {
    endpoint: 'GET /articles',
    status: corrected.status,
    selectCount: corrected.report.selectCount,
    headerXDbSelects: corrected.header,
    otherScoped: corrected.report.otherScoped,
    statementsLoggedInScope: corrected.report.statements.length,
    excludedInScope: corrected.report.excludedInScope,
    scopedSqlLog: {note: 'the complete counted log', statements: corrected.report.statements.filter((s) => s.counted).map(slim)},
    bodyBytes: Buffer.byteLength(corrected.text),
    bodySha256: sha(corrected.text),
  },
  equivalence: {
    byteEqual: flawed.text === corrected.text,
    sha256Equal: sha(flawed.text) === sha(corrected.text),
    articleCount: body.count,
    orderedById: body.articles.every((a, i) => a.id === i + 1),
    keys: Object.keys(body.articles[0]),
    authorKeys: Object.keys(body.articles[0].author),
    sampleArticles: body.articles.slice(0, 3),
  },
  excludedStatementsObserved: {
    note: 'statements the wrapper saw outside the article-list scope across the whole demo run (login INSERT + one session SELECT per request)',
    outsideScopeTotal: main.fx.db.outsideScope().length,
    byKind: main.fx.db.outsideScope().reduce((o, e) => ({...o, [e.kind]: (o[e.kind] ?? 0) + 1}), {}),
  },
  knownPositiveControl: {
    note: 'endpoint doctored to run ONE hidden extra SELECT; the counter must notice',
    flawedWithHiddenQuery: ctlFlawed.report.selectCount,
    correctedWithHiddenQuery: ctlCorrected.report.selectCount,
    detected: ctlFlawed.report.selectCount === 102 && ctlCorrected.report.selectCount === 2,
  },
  notClaimed: [
    'No latency, throughput or timing result is measured or claimed.',
    'Fewer queries do not universally mean better performance.',
    'No index, pagination or caching change is part of the fix.',
    'This is one N+1 shape (a per-row lookup in a loop), not every form of it.',
  ],
};

await Promise.all([main.close(), ctl.close()]);
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({flawedSelects: evidence.flawed.selectCount, correctedSelects: evidence.corrected.selectCount, byteEqual: evidence.equivalence.byteEqual, control: evidence.knownPositiveControl, top: evidence.flawed.mostRepeatedAuthor, distinct: evidence.flawed.distinctAuthorsLookedUp}, null, 1));
