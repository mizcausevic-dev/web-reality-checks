// Episode 13 fixture: ARTIFACT INSPECTION. Scans browser-delivered assets (.js, .mjs, .html,
// .json, .map) for credential-like strings and reports what it found and where.
//
//   node inspect-artifacts.mjs <dir> [...more dirs]
//
// Before reporting on the requested directories, the CLI runs a KNOWN-POSITIVE CONTROL against
// bundle-flawed/: if the scanner cannot find the secret that is deliberately planted there, it
// refuses to report "0 findings" for anything else. A clean scan is only meaningful once the
// scanner has proved it can see a leak.
//
// Classification is by shape, not by name:
//   secret-like      — matches a known secret prefix for this fixture (srv_secret_), a generic
//                      bearer header value, a private-key block, or a long high-entropy token
//                      sitting in a quoted string next to a key/token/secret-ish name.
//   identifier-like  — matches the fixture's public-identifier prefix (proj_pub_). Reported so a
//                      reviewer can ASK what it authorises; it is not, by itself, a leak.
//
// Limits (also stated in the README): absence of findings in the scanned files does not prove
// that no secret was delivered anywhere else (other routes, server-rendered pages, logs, caches,
// third-party scripts, build caches, source control history). Patterns are heuristic.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
export const SCAN_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.htm', '.json', '.map']);

const shannon = (s) => { const f = {}; for (const c of s) f[c] = (f[c] || 0) + 1; return -Object.values(f).reduce((a, n) => a + (n / s.length) * Math.log2(n / s.length), 0); };

export const RULES = [
  {id: 'fixture-secret-prefix', kind: 'secret-like', re: /srv_secret_[A-Za-z0-9_]{8,}/g},
  {id: 'bearer-literal', kind: 'secret-like', re: /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g},
  {id: 'private-key-block', kind: 'secret-like', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g},
  // "something_secret|token|key|password" : "<long value>"  (quoted assignment forms in JS/JSON/HTML)
  {id: 'named-secret-assignment', kind: 'secret-like', re: /(?:secret|token|password|api[_-]?key|private[_-]?key)["']?\s*[:=]\s*["']([A-Za-z0-9._~+/=-]{20,})["']/gi, valueGroup: 1, entropyMin: 3.0},
  {id: 'fixture-public-id-prefix', kind: 'identifier-like', re: /proj_pub_[A-Za-z0-9]{4,}/g},
];

const redact = (v) => (v.length <= 12 ? v.slice(0, 4) + '…' : v.slice(0, 10) + '…' + v.slice(-3));

export const listFiles = (dir) => {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (SCAN_EXT.has(path.extname(e.name))) out.push(p); } };
  walk(dir);
  return out.sort();
};

export const scanText = (text, file) => {
  const findings = [];
  const lines = text.split('\n');
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const value = rule.valueGroup ? m[rule.valueGroup] : m[0];
      if (rule.entropyMin && shannon(value) < rule.entropyMin) continue;
      const line = text.slice(0, m.index).split('\n').length;
      findings.push({file, line, rule: rule.id, kind: rule.kind, valueRedacted: redact(value), context: lines[line - 1].trim().slice(0, 100)});
    }
  }
  // dedupe identical (file, line, value, kind) hits produced by overlapping rules
  const seen = new Set();
  return findings.filter((f) => { const k = `${f.file}|${f.line}|${f.valueRedacted}|${f.kind}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

export const scanDir = (dir) => {
  const files = listFiles(dir);
  const findings = files.flatMap((f) => scanText(fs.readFileSync(f, 'utf8'), path.relative(dir, f)));
  const secrets = findings.filter((f) => f.kind === 'secret-like');
  const identifiers = findings.filter((f) => f.kind === 'identifier-like');
  return {dir, filesScanned: files.map((f) => path.relative(dir, f)), secretLike: secrets.length, identifierLike: identifiers.length, findings};
};

/** Known-positive control: the scanner must see the planted secret in bundle-flawed/. */
export const controlRun = () => {
  const r = scanDir(path.join(here, 'bundle-flawed'));
  return {...r, passed: r.secretLike > 0};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targets = process.argv.slice(2);
  if (!targets.length) { console.error('usage: node inspect-artifacts.mjs <dir> [...dirs]'); process.exit(2); }
  const control = controlRun();
  console.log(`[control] bundle-flawed: ${control.secretLike} secret-like, ${control.identifierLike} identifier-like → ${control.passed ? 'scanner can see a planted secret' : 'FAILED: scanner cannot see the planted secret; results below are not trustworthy'}`);
  if (!control.passed) process.exit(3);
  let exit = 0;
  for (const t of targets) {
    const r = scanDir(path.resolve(t));
    console.log(`\n[scan] ${t}  files: ${r.filesScanned.join(', ')}`);
    for (const f of r.findings) console.log(`  ${f.kind.padEnd(16)} ${f.file}:${f.line}  ${f.rule}  ${f.valueRedacted}`);
    console.log(`  → ${r.secretLike} secret-like, ${r.identifierLike} identifier-like`);
    if (r.secretLike) exit = 1;
  }
  console.log('\nNote: 0 secret-like findings in these files does not prove every delivery path is clean (other routes, SSR pages, logs, caches, third-party scripts, history).');
  process.exit(exit);
}
