#!/usr/bin/env node
// Fills {{EPISODES}} {{TESTS}} {{RUNTIME}} {{ARCS}} in launch/*/article.md from verification.json (written by
// tools/verify-all.mjs) and assets/arcs.json. Refuses to run unless the numbers are complete and clean:
// every episode rendered, zero test failures. The generated launch/*/index.html is rebuilt by gen-site.mjs.
// Usage: node tools/fill-launch-placeholders.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dry = process.argv.includes('--dry');
const vp = path.join(root, 'verification.json');
if (!fs.existsSync(vp)) { console.error('BLOCKED: verification.json missing. Run node tools/verify-all.mjs first.'); process.exit(2); }
const v = JSON.parse(fs.readFileSync(vp, 'utf8'));
const T = v.totals;
const arcs = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'arcs.json'), 'utf8'));
const expected = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d)).length;
const problems = [];
if (!T) problems.push('verification.json has no totals');
else {
  if (T.episodes !== expected) problems.push(`totals.episodes ${T.episodes} != episode folders ${expected}`);
  if (T.episodesRendered !== T.episodes) problems.push(`rendered ${T.episodesRendered} of ${T.episodes}`);
  if (T.testFailures !== 0) problems.push(`${T.testFailures} test failures`);
  if (!(T.tests > 0)) problems.push('zero tests counted');
  if (!(T.episodeRuntimeSeconds > 0)) problems.push('no runtime');
}
if (problems.length) { console.error('BLOCKED: ' + problems.join('; ')); process.exit(2); }

const t = Math.floor(T.episodeRuntimeSeconds);
const vals = {EPISODES: String(T.episodes), TESTS: String(T.tests), RUNTIME: `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s`, ARCS: String(arcs.length)};
const report = [];
for (const d of fs.readdirSync(path.join(root, 'launch'))) {
  const dir = path.join(root, 'launch', d);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const p = path.join(dir, f);
    const src = fs.readFileSync(p, 'utf8');
    let n = 0;
    const out = src.replace(/\{\{(EPISODES|TESTS|RUNTIME|ARCS)\}\}/g, (_, k) => { n++; return vals[k]; });
    if (n) { if (!dry) fs.writeFileSync(p, out); report.push(`${d}/${f}: ${n} filled`); }
  }
}
console.log(JSON.stringify({values: vals, dry}), '\n' + report.join('\n'));
