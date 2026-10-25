#!/usr/bin/env node
// Generates the README / site / article graphics as SVG (and PNG for Medium) from repository data.
// Numbers come from verification.json and episode folders, never typed by hand.
// Usage: node tools/gen-assets.mjs            (SVG only)
//        node tools/gen-assets.mjs --png      (also export PNG via Playwright Chromium)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'assets');
fs.mkdirSync(out, {recursive: true});
const C = {bg: '#0b0c10', bg2: '#12141a', panel: '#171a21', line: '#2a2e38', text: '#f3ede3', dim: '#9a978f', mute: '#5e5c57', cyan: '#3dd6f5', amber: '#f5b63d', red: '#f5533d', green: '#5fe08a', violet: '#a78bfa'};
const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const MONO = "ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

const epDirs = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d)).sort();
const eps = epDirs.map((d) => {
  const sp = path.join(root, 'episodes', d, 'script.json');
  const s = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : null;
  const re = path.join(root, 'episodes', d, 'render-evidence.json');
  const ev = fs.existsSync(re) ? JSON.parse(fs.readFileSync(re, 'utf8')) : null;
  return {id: d, n: s?.n ?? +d.slice(2), title: s?.title ?? d, fullTitle: s?.fullTitle ?? '', dur: ev?.duration_s ?? 0, rendered: !!ev};
});
const ver = fs.existsSync(path.join(root, 'verification.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'verification.json'), 'utf8')) : null;
const tests = ver ? ver.rows.reduce((a, r) => a + (r.tests?.pass ?? 0), 0) : 0;
const fails = ver ? ver.rows.reduce((a, r) => a + (r.tests?.fail ?? 0), 0) : 0;
const rendered = eps.filter((e) => e.rendered).length;
const runtime = eps.reduce((a, e) => a + e.dur, 0);
const mm = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;
const N = eps.length;

const reduce = '@media (prefers-reduced-motion: reduce){*{animation:none !important}}';

/* ---------------- banner ---------------- */
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 380" width="1280" height="380" role="img" aria-labelledby="t d">
<title id="t">Web Reality Checks</title><desc id="d">${N} short technical films, each backed by a runnable local fixture and regression tests. Flaw, control, repair, retest.</desc>
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="#101a22"/></linearGradient>
<linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="${C.red}"/><stop offset=".35" stop-color="${C.amber}"/><stop offset=".7" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.green}"/></linearGradient>
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${C.panel}" stroke-width="1"/></pattern>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
.f{font-family:${FONT}}.m{font-family:${MONO}}
.flow{stroke-dasharray:10 14;animation:dash 1.6s linear infinite}
@keyframes dash{to{stroke-dashoffset:-48}}
.pulse{animation:pulse 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.18);opacity:1}}
.d1{animation-delay:.3s}.d2{animation-delay:.6s}.d3{animation-delay:.9s}.d4{animation-delay:1.2s}
${reduce}
</style>
<rect width="1280" height="380" rx="24" fill="url(#g)"/><rect width="1280" height="380" rx="24" fill="url(#grid)" opacity=".55"/>
<rect x="1" y="1" width="1278" height="378" rx="23" fill="none" stroke="${C.line}"/>
<text x="64" y="86" class="f" font-size="16" font-weight="700" letter-spacing="6" fill="${C.cyan}">WEB REALITY CHECKS</text>
<text x="64" y="156" class="f" font-size="58" font-weight="800" letter-spacing="-1.5" fill="${C.text}">Break it on purpose.</text>
<text x="64" y="222" class="f" font-size="58" font-weight="800" letter-spacing="-1.5" fill="${C.text}">Prove the fix.</text>
<text x="64" y="272" class="f" font-size="20" fill="${C.dim}">${N} short technical films. Each one backed by a runnable local fixture,</text>
<text x="64" y="300" class="f" font-size="20" fill="${C.dim}">regression tests, narration, captions and a plain-language write-up.</text>
<g class="m" font-size="14" fill="${C.mute}"><text x="64" y="342">synthetic data · loopback only · every on-screen number comes from evidence.json</text></g>
<g transform="translate(760 120)">
 <path class="flow" d="M84 40 H124 M214 40 H254 M344 40 H384" stroke="url(#fl)" stroke-width="4" fill="none" stroke-linecap="round"/>
 <g class="pulse"><rect x="0" y="0" width="80" height="80" rx="16" fill="${C.panel}" stroke="${C.red}" stroke-width="3" filter="url(#glow)"/></g>
 <text x="40" y="52" text-anchor="middle" class="f" font-size="32" font-weight="800" fill="${C.red}">✕</text>
 <text x="40" y="116" text-anchor="middle" class="f" font-size="14" font-weight="700" letter-spacing="2" fill="${C.text}">FLAW</text>
 <g class="pulse d1"><rect x="130" y="0" width="80" height="80" rx="16" fill="${C.panel}" stroke="${C.amber}" stroke-width="3"/></g>
 <text x="170" y="54" text-anchor="middle" class="f" font-size="34" font-weight="800" fill="${C.amber}">?</text>
 <text x="170" y="116" text-anchor="middle" class="f" font-size="14" font-weight="700" letter-spacing="2" fill="${C.text}">CONTROL</text>
 <g class="pulse d2"><rect x="260" y="0" width="80" height="80" rx="16" fill="${C.panel}" stroke="${C.cyan}" stroke-width="3"/></g>
 <text x="300" y="54" text-anchor="middle" class="f" font-size="30" font-weight="800" fill="${C.cyan}">→</text>
 <text x="300" y="116" text-anchor="middle" class="f" font-size="14" font-weight="700" letter-spacing="2" fill="${C.text}">REPAIR</text>
 <g class="pulse d3"><rect x="390" y="0" width="80" height="80" rx="16" fill="${C.panel}" stroke="${C.green}" stroke-width="3"/></g>
 <text x="430" y="54" text-anchor="middle" class="f" font-size="32" font-weight="800" fill="${C.green}">✓</text>
 <text x="430" y="116" text-anchor="middle" class="f" font-size="14" font-weight="700" letter-spacing="2" fill="${C.text}">RETEST</text>
</g>
</svg>`;
fs.writeFileSync(path.join(out, 'banner.svg'), banner);

/* ---------------- stats ---------------- */
const tiles = [
  [`${rendered}`, 'narrated films', C.cyan],
  [mm(runtime), 'total runtime', C.amber],
  [`${tests}`, `fixture tests passing${fails ? ` (${fails} failing)` : ''}`, fails ? C.red : C.green],
  [`${ver ? ver.rows.filter((r) => r.tests).length : N}`, 'runnable fixtures', C.violet],
];
const stats = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 150" width="1280" height="150" role="img" aria-label="${rendered} narrated films, ${mm(runtime)} total runtime, ${tests} fixture tests passing, ${tiles[3][0]} runnable fixtures">
<style>.f{font-family:${FONT}}.up{animation:up .9s ease-out both}@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}${reduce}</style>
${tiles.map((t, i) => `<g class="up" style="animation-delay:${i * 0.12}s" transform="translate(${i * 322} 0)"><rect x="0" y="0" width="304" height="150" rx="18" fill="${C.panel}" stroke="${C.line}"/><rect x="0" y="0" width="6" height="150" rx="3" fill="${t[2]}"/><text x="32" y="82" class="f" font-size="52" font-weight="800" letter-spacing="-1.5" fill="${C.text}">${esc(t[0])}</text><text x="32" y="118" class="f" font-size="17" fill="${C.dim}">${esc(t[1])}</text></g>`).join('\n')}
</svg>`;
fs.writeFileSync(path.join(out, 'stats.svg'), stats);

/* ---------------- method pipeline ---------------- */
const steps = [
  ['1', 'Flaw', 'Reproduce the failure on a local, synthetic fixture.', C.red],
  ['2', 'Control', 'A known-positive test proves the detector can fail.', C.amber],
  ['3', 'Repair', 'The smallest fix, with its limits stated.', C.cyan],
  ['4', 'Retest', 'Same test, same schedule, real results on screen.', C.green],
];
const wrap = (s, n) => { const w = s.split(' '); const l = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > n) { l.push(c.trim()); c = x; } else c += ' ' + x; } if (c.trim()) l.push(c.trim()); return l; };
const pipeline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 280" width="1280" height="280" role="img" aria-labelledby="pt pd">
<title id="pt">The Web Reality Checks method</title><desc id="pd">Four steps: reproduce the flaw, prove the test can fail with a known-positive control, apply the repair, retest with the same schedule.</desc>
<style>.f{font-family:${FONT}}.flow{stroke-dasharray:8 12;animation:dash 1.8s linear infinite}@keyframes dash{to{stroke-dashoffset:-40}}${reduce}</style>
<rect width="1280" height="280" rx="22" fill="${C.bg2}" stroke="${C.line}"/>
${steps.map((s, i) => { const x = 36 + i * 308; const lines = wrap(s[2], 26); return `<g transform="translate(${x} 36)"><rect width="268" height="208" rx="18" fill="${C.panel}" stroke="${s[3]}" stroke-width="2.5"/><circle cx="40" cy="44" r="22" fill="${C.bg}" stroke="${s[3]}" stroke-width="2.5"/><text x="40" y="52" text-anchor="middle" class="f" font-size="22" font-weight="800" fill="${s[3]}">${s[0]}</text><text x="76" y="52" class="f" font-size="28" font-weight="800" fill="${C.text}">${s[1]}</text>${lines.map((l, j) => `<text x="24" y="${108 + j * 28}" class="f" font-size="19" fill="${C.dim}">${esc(l)}</text>`).join('')}</g>${i < 3 ? `<path class="flow" d="M${x + 272} 140 H${x + 304}" stroke="${C.mute}" stroke-width="3" stroke-linecap="round"/>` : ''}`; }).join('\n')}
</svg>`;
fs.writeFileSync(path.join(out, 'method.svg'), pipeline);

/* ---------------- arcs ---------------- */
const arcs = [
  ['Trust & access', C.red, [1, 3, 13, 24, 28, 29]],
  ['Duplicates & ordering', C.amber, [2, 15, 18, 23, 27, 30]],
  ['Data lifecycle', C.cyan, [4, 5, 21, 22, 25, 26]],
  ['Delivery & freshness', C.green, [7, 10, 12, 17, 19, 20]],
  ['Experience & speed', C.violet, [6, 8, 9, 11, 14, 16]],
];
const byN = new Map(eps.map((e) => [e.n, e]));
const arcsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 380" width="1280" height="380" role="img" aria-labelledby="at ad">
<title id="at">Thirty episodes in five arcs</title><desc id="ad">${arcs.map((a) => `${a[0]}: episodes ${a[2].join(', ')}`).join('. ')}.</desc>
<style>.f{font-family:${FONT}}.fade{animation:fade .8s ease-out both}@keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}${reduce}</style>
<rect width="1280" height="380" rx="22" fill="${C.bg2}" stroke="${C.line}"/>
${arcs.map((a, i) => { const x = 22 + i * 248; return `<g class="fade" style="animation-delay:${i * 0.1}s" transform="translate(${x} 22)"><rect width="236" height="336" rx="16" fill="${C.panel}" stroke="${C.line}"/><rect width="236" height="6" rx="3" fill="${a[1]}"/><text x="16" y="38" class="f" font-size="17" font-weight="800" fill="${a[1]}">${esc(a[0])}</text>${a[2].map((n, j) => { const e = byN.get(n); const t = e ? e.title : `Episode ${n}`; return `<text x="16" y="${72 + j * 42}" class="f" font-size="15" fill="${C.mute}" font-weight="700">${String(n).padStart(2, '0')}</text><text x="46" y="${72 + j * 42}" class="f" font-size="15" fill="${C.text}">${esc(t.length > 24 ? t.slice(0, 23) + '…' : t)}</text>`; }).join('')}</g>`; }).join('\n')}
</svg>`;
fs.writeFileSync(path.join(out, 'arcs.svg'), arcsSvg);
fs.writeFileSync(path.join(out, 'arcs.json'), JSON.stringify(arcs.map((a) => ({name: a[0], color: a[1], episodes: a[2]})), null, 2));


/* ---------------- loop (hero mark) and og card ---------------- */
const loopSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-labelledby="lt ld">
<title id="lt">Flaw, control, repair, retest</title><desc id="ld">Four linked steps: flaw in red, control in amber, repair in cyan, retest in green.</desc>
<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="${C.red}"/><stop offset=".35" stop-color="${C.amber}"/><stop offset=".7" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.green}"/></linearGradient></defs>
<style>.f{font-family:${FONT}}.flow{stroke-dasharray:10 14;animation:dash 1.6s linear infinite}@keyframes dash{to{stroke-dashoffset:-48}}.pulse{animation:pulse 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}.d1{animation-delay:.3s}.d2{animation-delay:.6s}.d3{animation-delay:.9s}${reduce}</style>
<path class="flow" d="M104 64 H126 M234 64 H256 M364 64 H386" stroke="url(#fl)" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(-16 0)"/>
${[['✕', 'FLAW', C.red, 0], ['?', 'CONTROL', C.amber, 1], ['→', 'REPAIR', C.cyan, 2], ['✓', 'RETEST', C.green, 3]].map((q) => `<g transform="translate(${q[3] * 130 + 4} 20)"><g class="pulse d${q[3]}"><rect width="88" height="88" rx="18" fill="${C.panel}" stroke="${q[2]}" stroke-width="3"/></g><text x="44" y="58" text-anchor="middle" class="f" font-size="36" font-weight="800" fill="${q[2]}">${q[0]}</text><text x="44" y="136" text-anchor="middle" class="f" font-size="14" font-weight="700" letter-spacing="2" fill="${C.text}">${q[1]}</text></g>`).join('\n')}
</svg>`;
fs.writeFileSync(path.join(out, 'loop.svg'), loopSvg);
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="Web Reality Checks. Break it on purpose. Prove the fix.">
<rect width="1200" height="630" fill="${C.bg}"/><rect x="24" y="24" width="1152" height="582" rx="28" fill="${C.panel}" stroke="${C.line}"/>
<rect x="24" y="24" width="1152" height="8" rx="4" fill="url(#og)"/>
<defs><linearGradient id="og" x1="0" x2="1"><stop offset="0" stop-color="${C.red}"/><stop offset=".35" stop-color="${C.amber}"/><stop offset=".7" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.green}"/></linearGradient></defs>
<text x="80" y="120" font-family="${FONT}" font-size="22" font-weight="800" letter-spacing="7" fill="${C.cyan}">WEB REALITY CHECKS</text>
<text x="80" y="236" font-family="${FONT}" font-size="86" font-weight="850" letter-spacing="-3" fill="${C.text}">Break it on purpose.</text>
<text x="80" y="334" font-family="${FONT}" font-size="86" font-weight="850" letter-spacing="-3" fill="${C.text}">Prove the fix.</text>
<text x="80" y="408" font-family="${FONT}" font-size="30" fill="${C.dim}">${N} short films. Runnable fixtures. Real test output.</text>
${[['FLAW', C.red], ['CONTROL', C.amber], ['REPAIR', C.cyan], ['RETEST', C.green]].map((q, i) => `<g transform="translate(${80 + i * 262} 470)"><rect width="238" height="84" rx="16" fill="${C.bg}" stroke="${q[1]}" stroke-width="3"/><text x="119" y="54" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" letter-spacing="3" fill="${q[1]}">${q[0]}</text></g>`).join('')}
</svg>`;
fs.writeFileSync(path.join(out, 'og.svg'), og);

console.log(JSON.stringify({episodes: N, rendered, runtime_s: +runtime.toFixed(1), tests, fails, svgs: ['banner', 'stats', 'method', 'arcs', 'loop', 'og']}));

if (process.argv.includes('--png')) {
  const {createRequire} = await import('node:module'); const {chromium} = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch();
  const pdir = path.join(out, 'png');
  fs.mkdirSync(pdir, {recursive: true});
  for (const name of ['banner', 'stats', 'method', 'arcs', 'loop', 'og']) {
    const svg = fs.readFileSync(path.join(out, `${name}.svg`), 'utf8');
    const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const w = +m[1], h = +m[2];
    const p = await b.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 2});
    await p.setContent(`<html><body style="margin:0;background:${C.bg}">${svg.replace(/animation:[^;}"]*/g, '')}</body></html>`);
    await p.screenshot({path: path.join(pdir, `${name}.png`), clip: {x: 0, y: 0, width: w, height: h}});
    await p.close();
  }
  await b.close();
  console.log('PNG exported to assets/png');
}
