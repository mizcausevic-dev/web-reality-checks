#!/usr/bin/env node
// Generates SERIES_RELEASE.md (series-level positioning, playlist, cadence, index, launch copy, SEO, claims)
// from episode folders so counts, titles and arcs never drift. Asserts length limits for the copy it writes.
// Usage: node tools/gen-series-release.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ex = (p) => fs.existsSync(path.join(root, p));
const arcs = JSON.parse(rd('assets/arcs.json'));
const eps = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d) && ex(`episodes/${d}/script.json`)).sort().map((id) => {
  const s = JSON.parse(rd(`episodes/${id}/script.json`));
  const dist = ex(`episodes/${id}/content/distribution.md`) ? rd(`episodes/${id}/content/distribution.md`) : '';
  const top = (dist.match(/### Title options[^\n]*\n\n1\. `([^`]+)`/) ?? [])[1] ?? s.fullTitle;
  return {id, n: s.n, full: s.fullTitle ?? s.title, slug: s.slug, top};
});
const N = eps.length;
const arcOf = (n) => arcs.find((a) => a.episodes.includes(n));
const byN = new Map(eps.map((e) => [e.n, e]));
const words = (s) => s.trim().split(/\s+/).length;
const fail = (m) => { console.error('LIMIT FAIL:', m); process.exit(2); };

const DISCLOSURE = 'This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks';
const playlistDesc = `${N} short episodes, each about a web app that looks finished and is not. A missing authorization check, one tap on Pay that creates two orders, a progress bar at 100% before the file exists, a dashboard labeled Live with ten-minute-old data, a deleted contact that still shows in search. Every number on screen comes from a runnable local fixture with tests you can clone. Each film reproduces the flaw, proves the test can fail, applies the smallest repair and retests.\n\nSeries by Miz Causevic, Kinetic Gain LLC. Fixtures, tests, scripts and the render project are open source.\n\n${DISCLOSURE}`;
if (playlistDesc.length > 1000) fail(`playlist description ${playlistDesc.length}`);

const linkedin = `Your app passed the demo. That is not the same as your app being correct.

I built Web Reality Checks: ${N} short films, about two minutes each, on web apps that look finished on screen and are wrong underneath. One missing authorization check that returns 200 OK with another user's data. One tap on Pay that creates two orders. A deleted contact that still shows in search. A deadline that displays one day early.

Every result on screen is the output of a runnable fixture with regression tests. Clone the repo, run node --test, and get the pass count the narration reads out. Each film shows the failure, proves the test can fail, repairs it, retests, and says what it does not prove.

Five arcs: trust and access, duplicates and ordering, data lifecycle, delivery and freshness, experience and speed. Three entry points: one for engineers, one for founders and buyers, one for everyone else.

All fixtures are synthetic and local. Nothing is a finding about a real product. Open source: github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #SoftwareEngineering #Testing`;
if (linkedin.length > 1300) fail(`linkedin ${linkedin.length}`);
if ((linkedin.match(/#\w+/g) ?? []).length > 3) fail('linkedin hashtags');
const xpost = `Web Reality Checks: ${N} short films about web apps that look finished and are not. Every result on screen is output from a fixture with tests you can clone. Flaw, control, repair, retest, plus what it does not prove. github.com/mizcausevic-dev/web-reality-checks`;
if (xpost.length > 280) fail(`x ${xpost.length}`);
const medium = `Web Reality Checks is a ${N}-part series from Miz Causevic, Kinetic Gain LLC, about web applications that look correct on screen and fail underneath: authorization that never checks ownership, retries that create duplicate orders, caches that hand one person's page to another, deletes that leave a copy in search, dates that move a day. Each part is a narrated film of about two minutes, backed by a runnable fixture and regression tests on synthetic data. The method never changes: reproduce the flaw, prove the test can fail, apply the smallest repair, retest, and state what the fixture does not prove. Every film comes with three write-ups, for engineers, for buyers and for general readers.`;
if (words(medium) > 120) fail(`medium ${words(medium)} words`);

// Publishing order: two per week (Tue, Thu), arcs run in sequence, three weeks for a six-episode arc.
const order = [[1, 3], [13, 24], [28, 29], [2, 15], [18, 23], [27, 30], [5, 21], [22, 25], [26, 4], [7, 12], [17, 19], [10, 20], [8, 9], [11, 14], [16, 6]];
const flat = order.flat();
if (new Set(flat).size !== flat.length || flat.some((n) => !byN.has(n)) || eps.some((e) => !flat.includes(e.n))) fail('publishing order does not cover every episode exactly once');

const conceptual = [
  ['ep03', 'the TLS leg of the sign-in flow (the loopback fixture runs without a TLS handshake)'],
  ['ep04', 'the browser-side steps (PGlite persistence in a real browser is described, not executed by the test runner)'],
  ['ep07', 'the remote client (a second machine reaching the deployed page is modeled, not run)'],
  ['ep08', 'the browser lab (paint and interaction timing in a real browser is described, not measured by the fixture)'],
  ['ep09', 'the screen reader pass (announcements are described from the markup, not recorded from assistive technology)'],
  ['ep12', 'the browser service worker lifecycle (install, waiting and activate are explained, not driven by the fixture)'],
  ['ep20', 'the whole episode is conceptual (what the network sees under HTTPS is explained from protocol behavior; no capture was performed)'],
  ['ep21', 'the already-open browser is simulated client state, not a real browser'],
  ['ep22', 'executed on Node only; browsers and other engines were not tested'],
  ['ep23', 'the two tabs are two independent Node clients, not real browsers'],
  ['ep24', 'the clients are cookie-jar test clients and the cache is a deliberately flawed in-process cache, not a CDN, proxy or browser cache'],
  ['ep27', 'the controller is a simulated state machine driven by a mock API, not recorded browser evidence'],
  ['ep28', 'the member and administrator are cookie-jar test clients; no real browser, no HTTPS, and the on-screen page illustrates the render function output'],
  ['ep30', 'the fault (a killed process) and the lock hold are injected by the test, and scene diagrams are illustrative'],
].filter(([id]) => byN.has(+id.slice(2)));

const md = `# Web Reality Checks: series release kit

Author: Miz Causevic, Kinetic Gain LLC. Generated by \`tools/gen-series-release.mjs\` from the episode folders. Source of truth for per-episode facts: \`episodes/epNN/script.json\`, \`episodes/epNN/README.md\`, \`fixtures/epNN-*/evidence.json\`. This file covers the series as a whole; per-episode copy lives in \`episodes/epNN/content/distribution.md\`; launch packages live in \`launch/\`. Nothing described here has been published to YouTube, Medium or social channels.

## 1. Series positioning

Web Reality Checks is a ${N}-episode series of narrated films, about 90 to 120 seconds each, in which a web app does something that looks fine on screen and is wrong underneath. Every result shown comes from a runnable local fixture with regression tests that you can clone and run. Each film follows one method, flaw, control, repair, retest, and states what the fixture does not prove. The episodes fall into five arcs: ${arcs.map((a) => a.name).join(', ')}. Three launch packages (engineers and AI-assisted builders, founders and buyers, general readers) each add an article, a launch film and a quiz.

## 2. YouTube playlist

### Playlist title (pick one, all 60 characters or fewer)

${[`Web Reality Checks: What the Screen Hides`, `Web Reality Checks: ${N} Bugs the Demo Never Shows`, `Web Reality Checks: Tested, Repaired, Retested`].map((t, i) => { if (t.length > 60) fail('playlist title'); return `${i + 1}. \`${t}\` (${t.length})`; }).join('\n')}

### Playlist description (${playlistDesc.length} of 1,000 characters)

\`\`\`
${playlistDesc}
\`\`\`

## 3. Publishing order and cadence (proposal)

Cadence: two films per week, Tuesday and Thursday, ${order.length} weeks. Each arc runs in sequence; the first episode of each arc has the widest hook. The order is a proposal, not a schedule that has been executed.

| Week | Tue | Thu | Arc |
|---|---|---|---|
${order.map(([a, b], i) => { const aa = arcOf(a).name, bb = arcOf(b).name; return `| ${i + 1} | ep${String(a).padStart(2, '0')} | ep${String(b).padStart(2, '0')} | ${aa === bb ? aa : `${aa} (ep${String(a).padStart(2, '0')}), ${bb} (ep${String(b).padStart(2, '0')})`} |`; }).join('\n')}

${arcs.map((a, i) => `### Arc ${i + 1}: ${a.name} (${a.episodes.length} episodes)\n\n${a.episodes.map((n) => `ep${String(n).padStart(2, '0')} ${byN.get(n)?.full ?? ''}`).join(' / ')}`).join('\n\n')}

## 4. Episode index

Article paths are relative to the repository root. Each episode has three articles: \`article-technical.md\`, \`article-business.md\`, \`article-layman.md\` in \`episodes/epNN/content/\`.

| # | Full title | Slug | Top-ranked YouTube title | Arc |
|---|---|---|---|---|
${eps.map((e) => `| ${String(e.n).padStart(2, '0')} | ${e.full} | ${e.slug} | ${e.top} | ${arcOf(e.n)?.name ?? ''} |`).join('\n')}

## 5. Launch copy

### LinkedIn series launch post (${linkedin.length} of 1,300 characters)

\`\`\`
${linkedin}
\`\`\`

### X launch post (${xpost.length} of 280 characters)

\`\`\`
${xpost}
\`\`\`

### Medium "About this series" paragraph (${words(medium)} of 120 words)

\`\`\`
${medium}
\`\`\`

## 6. SEO

### Series-level keywords (10)

${['web application security testing', 'authorization vs authentication', 'idempotency key', 'duplicate analytics events', 'service worker cache update', 'DNS TTL propagation', 'API rate limiting explained', 'optimistic concurrency control', 'N+1 query problem', 'web app regression tests'].map((k, i) => `${i + 1}. ${k}`).join('\n')}

### Medium tags (5)

1. Web Development
2. Software Engineering
3. Security
4. Testing
5. Programming

## 7. What is and is not claimed

\`\`\`
WHAT THIS SERIES CLAIMS
Every on-screen result (status codes, request counts, pass counts, timings) is the output of a deliberately constructed local fixture in this repository, run on loopback with synthetic data, and reproducible with the fixture's test.mjs and demo.mjs. Each result is labeled on screen as executed, observed, predicted or blocked where that distinction matters.

WHAT THIS SERIES DOES NOT CLAIM
Nothing in any episode is a finding about a real product, company, library or service. The fixtures are small by design and demonstrate one mechanism each. A repair shown for one path is not a claim about other paths in the same system. The series is not an audit and not a certification. Scene boundaries and chapter times come from a silence-based timeline heuristic and can be about a second off the spoken words.

STEPS MARKED BLOCKED, SIMULATED OR CONCEPTUAL
${conceptual.map(([id, t]) => `  ${id}  ${t}`).join('\n')}

Each episode README lists its own limits. Where this file and an episode README differ, the README wins.
\`\`\`

Miz Causevic, Kinetic Gain LLC
`;
fs.writeFileSync(path.join(root, 'SERIES_RELEASE.md'), md);
console.log(JSON.stringify({episodes: N, linkedin: linkedin.length, x: xpost.length, mediumWords: words(medium), playlistDesc: playlistDesc.length, weeks: order.length}));
