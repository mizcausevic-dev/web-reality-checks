#!/usr/bin/env node
// Generates README.md from repository data (episode folders, verification.json, launch packages).
// Usage: node tools/gen-readme.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ex = (p) => fs.existsSync(path.join(root, p));
const REPO = 'https://github.com/mizcausevic-dev/web-reality-checks';
const SITE = 'https://mizcausevic-dev.github.io/web-reality-checks/';
const hm = (s) => { const t = Math.floor(s); return `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s`; };
const arcs = JSON.parse(rd('assets/arcs.json'));
const ver = ex('verification.json') ? JSON.parse(rd('verification.json')) : null;
const rows = new Map((ver?.rows ?? []).map((r) => [r.ep, r]));

const films = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^(ep|cm|qz)\d\d$/.test(d) && ex(`episodes/${d}/render-evidence.json`) && ex(`episodes/${d}/script.json`)).sort().map((id) => {
  const s = JSON.parse(rd(`episodes/${id}/script.json`));
  const ev = JSON.parse(rd(`episodes/${id}/render-evidence.json`));
  return {id, n: s.n, title: s.fullTitle ?? s.title, short: s.title, dur: ev.duration_s, kind: id.slice(0, 2)};
});
const eps = films.filter((f) => f.kind === 'ep').sort((a, b) => a.n - b.n);
const arcOf = (n) => arcs.find((a) => a.episodes.includes(n));
const runtime = eps.reduce((a, f) => a + f.dur, 0);
const T = ver?.totals;
const pk = [
  ['a-break-it-on-purpose', 'Engineers and AI-assisted builders', 'cm01', 'qz01'],
  ['b-launch-review', 'Founders, product managers, buyers', 'cm02', 'qz02'],
  ['c-weird-websites', 'General audience', 'cm03', 'qz03'],
].filter(([d]) => ex(`launch/${d}/article.md`)).map(([d, who, cm, qz]) => ({d, who, cm, qz, title: (rd(`launch/${d}/article.md`).match(/^# (.+)$/m) ?? [])[1] ?? d}));
const fdir = (id) => fs.readdirSync(path.join(root, 'fixtures')).find((f) => f.startsWith(id + '-'));

const md = `<div align="center">

<img src="assets/banner.svg" alt="Web Reality Checks. Break it on purpose. Prove the fix. Flaw, Control, Repair, Retest." width="100%">

# Web Reality Checks

**${eps.length} short narrated films about the web bugs that survive demos. Each one is backed by a fixture you can run on a laptop and tests that fail when the flaw comes back.**

[Watch on the site](${SITE}) · [Episodes](#episodes) · [Launch packages](#launch-packages) · [Run a fixture](#run-a-fixture-in-one-minute) · [Reproduce a film](#reproduce-one-episode)

<img src="assets/stats.svg" alt="Series statistics: narrated films, total runtime, fixture tests passing, runnable fixtures" width="100%">

</div>

## What this is

A double charge. A page that will not update. Someone else's name on your dashboard. A date one day early. A deleted contact that still shows in search. These are not exotic failures, and a demo cannot show them, because a demo is one person, one browser, one happy path.

Web Reality Checks reproduces each failure on a local, synthetic fixture, proves the test can fail, applies the smallest repair, and runs the same test again. The film narrates what the test printed, so every number on screen is a number a file contains.

<img src="assets/method.svg" alt="Method: Flaw, Control, Repair, Retest" width="100%">

**Why the control step exists.** A passing test is only evidence if the same test fails when the flaw is present. The control step asserts the flaw is observable. It is also the fastest way to review AI-generated tests: ask whether the test has ever been seen failing.

## Episodes

<img src="assets/arcs.svg" alt="${eps.length} episodes grouped into five arcs" width="100%">

Total runtime ${hm(runtime)} across ${eps.length} episodes${T ? `; ${T.tests} fixture tests pass, ${T.testFailures} fail (see [VERIFICATION.md](VERIFICATION.md))` : ''}.

| # | Episode | Arc | Runtime | Fixture tests | Watch |
|---|---------|-----|---------|---------------|-------|
${eps.map((f) => { const r = rows.get(f.id); const t = r?.tests ? `${r.tests.pass}/${r.tests.pass + r.tests.fail}` : 'n/a'; const fx = fdir(f.id); return `| ${String(f.n).padStart(2, '0')} | [${f.short}](episodes/${f.id}/README.md) | ${arcOf(f.n)?.name ?? ''} | ${hm(f.dur)} | ${fx ? `[${t}](fixtures/${fx})` : t} | [page](${SITE}episodes/${f.id}/) |`; }).join('\n')}

## Launch packages

Three packages, one per audience. Each has a long article, a launch film and a five-question quiz. Nothing has been published to Medium, YouTube or social channels; the copy is ready in each folder.

| Audience | Article | Launch film | Quiz |
|----------|---------|-------------|------|
${pk.map((p) => `| ${p.who} | [${p.title}](launch/${p.d}/article.md) | [${p.cm}](episodes/${p.cm}/README.md)${films.find((f) => f.id === p.cm) ? ` (${hm(films.find((f) => f.id === p.cm).dur)})` : ''} | [${p.qz}](episodes/${p.qz}/README.md)${films.find((f) => f.id === p.qz) ? ` (${hm(films.find((f) => f.id === p.qz).dur)})` : ''} |`).join('\n')}

Each package folder also holds \`seo.md\`, \`social.md\`, \`commercial.md\`, \`quiz.md\` and \`images/\` with alt text.

## Run a fixture in one minute

Node 22 or newer. No install step and no network for fixtures without a \`package.json\`.

macOS and Linux:
\`\`\`
git clone ${REPO}.git
cd web-reality-checks/fixtures/ep15-idempotency
node --test
node demo.mjs
\`\`\`

Windows PowerShell 5.1 (one command per line, no \`&&\`):
\`\`\`
git clone ${REPO}.git
cd web-reality-checks\\fixtures\\ep15-idempotency
node --test
node demo.mjs
\`\`\`

\`node --test\` runs the regression tests, including the known-positive control. \`node demo.mjs\` rewrites \`evidence.json\`, the file the film reads its numbers from.

## Reproduce one episode

Requires Node 22+, ffmpeg and ffprobe on PATH, and Python 3 with Pillow (used only by \`tools/verify-all.mjs\`). Run everything from the repository root after cloning.

macOS and Linux (bash):
\`\`\`
git clone ${REPO}.git && cd web-reality-checks
cd video && npm install && npx remotion browser ensure && cd ..
node tools/build-timeline.mjs ep01
node tools/gen-root.mjs
node tools/render.mjs ep01 --concurrency 2
node tools/verify-all.mjs
\`\`\`

Windows PowerShell 5.1:
\`\`\`
git clone ${REPO}.git; cd web-reality-checks
cd video; npm install; npx remotion browser ensure; cd ..
node tools/build-timeline.mjs ep01
node tools/gen-root.mjs
node tools/render.mjs ep01 --concurrency 2
node tools/verify-all.mjs
\`\`\`

Narration is ElevenLabs, voice "Benedict - Premium British (RP) Male", model \`eleven_v4\`, saved to \`video/public/<id>/narration.mp3\`. Rebuild the site with \`node tools/gen-assets.mjs --png\`, \`node tools/gen-site.mjs\` and \`node tools/gen-readme.mjs\` (the site generator needs pandoc).

## Layout

| Path | Contents |
|------|----------|
| \`fixtures/epNN-slug/\` | Runnable fixture, \`test.mjs\` (node:test), \`demo.mjs\` which writes \`evidence.json\` |
| \`episodes/epNN/\` | \`script.json\`, \`captions.srt\` and \`.vtt\`, \`README.md\` (evidence and limits), MP4, thumbnail, hero, \`content/\` (three articles and a distribution kit) |
| \`episodes/cmNN/\`, \`episodes/qzNN/\` | Launch films and quizzes, same structure |
| \`launch/<package>/\` | Article, SEO notes, social copy, commercial and quiz scripts, images |
| \`video/\` | Remotion project: \`src/kit\` design system, \`src/episodes/<id>\` scenes and \`timeline.json\` |
| \`tools/\` | Timeline, render, verification, site, README and asset generators; \`check-limits.mjs\` measures social-copy limits; \`build-series-cut.mjs\` rebuilds the full-series MP4; \`youtube-upload.mjs\` uploads to your own channel (dry run and private by default, mock-API tests included) |
| \`index.html\`, \`assets/\` | Generated GitHub Pages site and graphics |

## Evidence vocabulary

**Observed**: inspected directly. **Executed**: a command ran and its output is available. **Verified**: acceptance evidence passed. **Predicted**: expected, not yet run. **Blocked**: insufficient access or evidence.

Scenes that could not be executed on the fixture (a browser behavior, a TLS leg, a screen reader) are labeled conceptual on screen. This series is not an audit and not a certification, and the fixtures use synthetic data only.

## License

Code: MIT, see [LICENSE](LICENSE). Narration audio and rendered video: all rights reserved. © 2026 Kinetic Gain LLC.
`;
fs.writeFileSync(path.join(root, 'README.md'), md);
console.log(JSON.stringify({episodes: eps.length, packages: pk.length, bytes: md.length}));
