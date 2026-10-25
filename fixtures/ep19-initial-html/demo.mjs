// Runs the exact scenario the video shows and writes evidence.json (actual outputs).
//   1. build both variants   2. serve   3. raw HTTP fetch of each route (+ a missing route)
//   4. headless-Chrome DOM capture with JS on and off   5. summarise.
import fs from 'node:fs';
import path from 'node:path';
import {build} from './build.mjs';
import {app, listen, requestLog} from './server.mjs';
import {inspectRaw, inspectDom, fetchRaw} from './inspect.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const built = build();
const port = await listen();
const base = `http://127.0.0.1:${port}`;

const raw = await inspectRaw(base);
const missing = {};
for (const v of ['csr', 'ssg']) { const r = await fetchRaw(base, `/${v}/missing/`); missing[v] = {route: r.route, status: r.status, servesShell: r.html.includes('id="app"')}; }
const dom = await inspectDom(base);

const pick = (x) => x.blocked ? {blocked: true, reason: x.reason} : {status: x.status ?? x.mainStatus, bytes: x.bytes, title: x.title, description: x.description, robots: x.robots, h1: x.h1Count, h2: x.h2Count, articleParagraphs: `${x.articleParagraphsPresent}/${x.articleParagraphsExpected}`, articleWords: `${x.articleWordsPresent}/${x.articleWordsExpected}`, links: x.linkCount, linkHrefs: x.linkHrefs, scriptTags: x.scriptTags, loadingShell: x.containsLoadingShell, renderedByClientJs: x.renderedByClientJs, requests: x.requests};

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  build: Object.fromEntries(Object.entries(built).map(([k, p]) => [k, {file: path.relative(here, p), bytes: fs.statSync(p).size}])),
  rawResponse: {csr: pick(raw.csr), ssg: pick(raw.ssg)},
  missingRoute: missing,
  renderedDom: {
    method: dom.csr.blocked ? 'BLOCKED' : 'headless Chrome 157 (Remotion bundle, chrome-headless-shell) driven over the DevTools protocol from Node; outerHTML read after the load event plus a 1.5 s settle. JS-disabled runs use Emulation.setScriptExecutionDisabled in a fresh temporary profile.',
    csr_js: pick(dom.csr), ssg_js: pick(dom.ssg), csr_nojs: pick(dom['csr-nojs']), ssg_nojs: pick(dom['ssg-nojs']),
  },
  serverLog: requestLog.filter((r) => r.method === 'GET').map((r) => `${r.status} GET ${r.path}`),
  notes: [
    'Both variants share title, description, robots (noindex), heading structure and href links; only when the article enters the document differs.',
    'A plain HTTP fetch is not a search-engine rendering test; a browser with scripts disabled is not a Googlebot simulator. Google can execute JavaScript.',
    'Nothing here measures crawling, indexing or ranking. No timings or timelines are claimed.',
    'robots=noindex is deliberate: this is a local teaching fixture and must not be indexed if deployed by mistake.',
  ],
};
fs.writeFileSync(path.join(here, 'evidence.json'), JSON.stringify(evidence, null, 2));
console.table([
  ['raw CSR', evidence.rawResponse.csr], ['raw SSG', evidence.rawResponse.ssg],
  ['DOM CSR (JS on)', evidence.renderedDom.csr_js], ['DOM SSG (JS on)', evidence.renderedDom.ssg_js],
  ['DOM CSR (JS off)', evidence.renderedDom.csr_nojs], ['DOM SSG (JS off)', evidence.renderedDom.ssg_nojs],
].map(([k, v]) => ({capture: k, status: v.blocked ? 'BLOCKED' : v.status, bytes: v.bytes ?? '-', paragraphs: v.articleParagraphs ?? '-', h2: v.h2 ?? '-', links: v.links ?? '-'})));
console.log('missing routes:', missing.csr.status, missing.ssg.status);
app.close();
