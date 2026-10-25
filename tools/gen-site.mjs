#!/usr/bin/env node
// Generates the GitHub Pages site from repository data. Pages source: branch main, folder "/".
//   index.html                       landing page (method, arcs, launch packages, episode grid, run-it)
//   episodes/<id>/index.html         one page per film: player, WebVTT captions, chapters, rendered README (evidence + limits)
//   launch/<pkg>/index.html          rendered launch article for each package
//   episodes/<id>/captions.vtt       WebVTT converted from captions.srt
//   assets/site.css, assets/site.js  shared styles and a small progressive-enhancement script
// Numbers on the page come from verification.json, render-evidence.json and timeline.json, never typed by hand.
// Requires: Node 22+, pandoc (Markdown to HTML). Usage: node tools/gen-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = 'https://github.com/mizcausevic-dev/web-reality-checks';
const SITE = 'https://mizcausevic-dev.github.io/web-reality-checks/';
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ex = (p) => fs.existsSync(path.join(root, p));
const wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), {recursive: true}); fs.writeFileSync(path.join(root, p), s); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hm = (s) => { const t = Math.floor(s); return `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s`; };
const warnings = [];

/* ---------- data ---------- */
const arcs = JSON.parse(rd('assets/arcs.json'));
const arcOf = (n) => arcs.find((a) => a.episodes.includes(n));
const ver = ex('verification.json') ? JSON.parse(rd('verification.json')) : null;
const T = ver?.totals ?? null;

const films = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^(ep|cm|qz)\d\d$/.test(d) && ex(`episodes/${d}/script.json`) && ex(`episodes/${d}/render-evidence.json`) && ex(`episodes/${d}/${d}.mp4`)).sort().map((id) => {
  const script = JSON.parse(rd(`episodes/${id}/script.json`));
  const ev = JSON.parse(rd(`episodes/${id}/render-evidence.json`));
  const tl = ex(`video/src/episodes/${id}/timeline.json`) ? JSON.parse(rd(`video/src/episodes/${id}/timeline.json`)) : null;
  const kind = id.slice(0, 2) === 'ep' ? 'episode' : id.slice(0, 2) === 'cm' ? 'trailer' : 'quiz';
  const fixture = kind === 'episode' ? fs.readdirSync(path.join(root, 'fixtures')).find((f) => f.startsWith(id + '-')) : null;
  return {id, kind, n: script.n, title: script.fullTitle ?? script.title, short: script.title, ev, tl, fixture, hasContent: ex(`episodes/${id}/content/article-technical.md`)};
});
const episodes = films.filter((f) => f.kind === 'episode');
const byId = new Map(films.map((f) => [f.id, f]));

const packages = [
  {dir: 'a-break-it-on-purpose', letter: 'A', audience: 'Engineers and AI-assisted builders', angle: 'Break it on purpose', tag: 'Test-first bug prevention', cm: 'cm01', qz: 'qz01', color: '#3dd6f5'},
  {dir: 'b-launch-review', letter: 'B', audience: 'Founders, product managers and buyers', angle: 'The launch review your demo never shows', tag: 'Ten questions before you ship', cm: 'cm02', qz: 'qz02', color: '#f5b63d'},
  {dir: 'c-weird-websites', letter: 'C', audience: 'Everyone else', angle: 'Why websites do strange things', tag: 'Five glitches, no code', cm: 'cm03', qz: 'qz03', color: '#5fe08a'},
].filter((p) => ex(`launch/${p.dir}/article.md`));
for (const p of packages) {
  const a = rd(`launch/${p.dir}/article.md`);
  p.title = (a.match(/^# (.+)$/m) ?? [])[1] ?? p.angle;
  p.subtitle = ((a.match(/^\*(.+)\*$/m) ?? [])[1]) ?? '';
  p.words = a.split(/\s+/).filter(Boolean).length;
  p.hero = ex(`launch/${p.dir}/images/hero.png`) ? `launch/${p.dir}/images/hero.png` : null;
}

/* ---------- markdown helpers ---------- */
const pandoc = (src) => execFileSync('pandoc', ['-f', 'gfm-raw_html', '-t', 'html5', '--wrap=none', '--no-highlight'], {input: src, encoding: 'utf8', maxBuffer: 1 << 27});
const KEEP = /\.(png|svg|jpg|jpeg|gif|webp|mp4|srt|vtt|html|css|js)$/i;
const fixLinks = (html, baseDir) => html.replace(/(href|src)="([^"]+)"/g, (m, attr, u) => {
  if (/^(https?:|mailto:|#|data:)/i.test(u)) return m;
  const [p, hash] = u.split('#');
  const abs = path.resolve(root, baseDir, decodeURIComponent(p));
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..')) return m;
  if (!fs.existsSync(abs)) { warnings.push(`missing link target: ${baseDir} -> ${u}`); return m; }
  if (KEEP.test(rel) && attr === 'src') return m;
  if (KEEP.test(rel)) return m;
  const isDir = fs.statSync(abs).isDirectory();
  return `${attr}="${REPO}/${isDir ? 'tree' : 'blob'}/main/${rel}${hash ? '#' + hash : ''}"`;
});
const tidy = (html) => html.replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>').replace(/<img /g, '<img loading="lazy" decoding="async" ');

/* ---------- shared assets ---------- */
const css = String.raw`
:root{color-scheme:dark;--bg:#0b0c10;--bg2:#12141a;--panel:#171a21;--line:#2a2e38;--text:#f3ede3;--dim:#a8a59d;--mute:#7c7a74;--cyan:#3dd6f5;--amber:#f5b63d;--red:#f5533d;--green:#5fe08a;--violet:#a78bfa;--max:1160px;--r:18px;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%}
a{color:var(--cyan);text-underline-offset:3px}a:hover{color:#8fe9ff}
:focus-visible{outline:3px solid var(--amber);outline-offset:3px;border-radius:6px}
.skip{position:absolute;left:-999px;top:8px;background:var(--amber);color:#000;padding:10px 16px;border-radius:8px;z-index:100;font-weight:700}.skip:focus{left:8px}
.wrap{max-width:var(--max);margin:0 auto;padding:0 20px}
header.top{position:sticky;top:0;z-index:50;background:rgba(11,12,16,.96);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;align-items:center;gap:20px;min-height:64px;flex-wrap:wrap}
.brand{font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:10px}
.brand i{display:inline-block;width:12px;height:12px;border-radius:4px;background:linear-gradient(135deg,var(--red),var(--amber) 40%,var(--cyan) 70%,var(--green))}
nav.main{display:flex;gap:4px;flex-wrap:wrap;margin-left:auto}nav.main a{color:var(--dim);text-decoration:none;padding:10px 12px;border-radius:10px;font-size:15px;min-height:44px;display:inline-flex;align-items:center}nav.main a:hover{color:var(--text);background:var(--panel)}
.hero{padding:56px 0 24px}
.kicker{color:var(--cyan);letter-spacing:.22em;text-transform:uppercase;font-size:12px;font-weight:800}
h1{font-size:clamp(34px,6.2vw,64px);line-height:1.04;letter-spacing:-.03em;margin:12px 0 18px;font-weight:850}
h2{font-size:clamp(26px,3.6vw,38px);line-height:1.15;letter-spacing:-.02em;margin:0 0 12px}
h3{font-size:20px;margin:0 0 8px;line-height:1.3}
.lede{color:var(--dim);font-size:clamp(18px,2.2vw,21px);max-width:760px;margin:0 0 26px}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 34px}
.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:12px;font-weight:700;text-decoration:none;border:1px solid var(--line);color:var(--text);background:var(--panel)}
.btn:hover{border-color:var(--cyan);color:var(--text)}.btn.pri{background:var(--cyan);color:#041014;border-color:var(--cyan)}.btn.pri:hover{background:#8fe9ff;color:#041014}
.herogrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:32px;align-items:center}.loopbox{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:24px;text-align:center}.loopbox img{width:100%;height:auto;display:block}.loopbox p{color:var(--dim);font-size:15px;margin:14px 0 0}@media(max-width:900px){.herogrid{grid-template-columns:1fr}}.banner{display:block;width:100%;height:auto;border-radius:22px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:18px 0 0;padding:0;list-style:none}
.stats li{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;border-left:5px solid var(--c,var(--cyan))}
.stats b{display:block;font-size:34px;letter-spacing:-.02em;line-height:1.1}.stats span{color:var(--dim);font-size:15px}
section.blk{padding:64px 0 8px}
.sub{color:var(--dim);max-width:760px;margin:0 0 26px}
.grid{display:grid;gap:16px}.g2{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}.g3{grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}.g5{grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px;display:flex;flex-direction:column;gap:10px;min-width:0}
.card.arc{border-top:5px solid var(--c,var(--cyan))}.card.arc h3{color:var(--c)}
.card ol,.card ul{margin:0;padding-left:0;list-style:none;font-size:15px}.card li{padding:3px 0}.card li a{color:var(--text);text-decoration:none}.card li a:hover{color:var(--cyan);text-decoration:underline}.card li b{font-family:var(--mono);color:var(--mute);font-size:13px;margin-right:8px}
.pk{border-top:5px solid var(--c)}.pk .who{color:var(--c);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase}.pk img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);background:#000}
.links{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:15px;margin-top:auto}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.chip{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:999px;min-height:44px;padding:0 16px;font:inherit;font-size:15px;cursor:pointer}.chip[aria-pressed=true]{background:var(--text);color:#0b0c10;border-color:var(--text);font-weight:700}
.ep{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:var(--text);transition:border-color .15s,transform .15s}
.ep:hover{border-color:var(--c,var(--cyan));transform:translateY(-2px)}.ep img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#000}
.ep .b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px}.ep .n{font-family:var(--mono);font-size:13px;color:var(--c,var(--cyan));font-weight:700}.ep h3{font-size:17px;margin:0}.ep .m{color:var(--dim);font-size:14px}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.yes li::marker{color:var(--green)}.no li::marker{color:var(--amber)}.two ul{padding-left:20px}
pre{background:#0e1015;border:1px solid var(--line);border-radius:14px;padding:16px 18px;overflow-x:auto;font:14px/1.55 var(--mono);color:#e7e1d6;max-width:100%}code{font-family:var(--mono);font-size:.92em}
:not(pre)>code{background:#1d2028;border-radius:6px;padding:2px 6px;overflow-wrap:anywhere}li,p{overflow-wrap:break-word}
.codewrap{position:relative}.copy{position:absolute;top:8px;right:8px;min-height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--dim);font:13px var(--mono);cursor:pointer}
footer.foot{margin-top:72px;border-top:1px solid var(--line);padding:32px 0 56px;color:var(--dim);font-size:14px}footer.foot p{max-width:820px;margin:0 0 10px}
/* film page */
.crumb{font-size:14px;color:var(--dim);margin:28px 0 8px}.crumb a{color:var(--dim)}
.film{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:24px;align-items:start;margin:8px 0 24px}
@media(max-width:900px){.film{grid-template-columns:1fr}}
.player{width:100%;aspect-ratio:16/9;background:#000;border-radius:14px;border:1px solid var(--line);display:block}
.badge{display:inline-block;font-size:13px;padding:3px 11px;border-radius:999px;border:1px solid var(--line);color:var(--dim);margin:0 6px 6px 0}.badge.ok{color:var(--green);border-color:#2f6b45}
.chap{list-style:none;margin:8px 0 0;padding:0;font-size:15px;max-height:430px;overflow:auto}.chap button{all:unset;cursor:pointer;display:flex;gap:12px;width:100%;padding:8px 10px;border-radius:8px;box-sizing:border-box}.chap button:hover,.chap button:focus-visible{background:#1d2028}.chap b{font-family:var(--mono);color:var(--cyan);font-weight:600}
.note{color:var(--mute);font-size:13px;margin-top:8px}
.pn{display:flex;justify-content:space-between;gap:12px;margin:36px 0 0;flex-wrap:wrap}.pn a{min-height:44px;display:inline-flex;align-items:center}
/* prose */
.prose{max-width:780px;margin:0 auto}.prose h1{font-size:clamp(30px,5vw,46px);margin-top:28px}.prose h2{margin:44px 0 12px;font-size:clamp(24px,3.2vw,32px)}.prose h3{margin:30px 0 8px}
.prose p,.prose li{font-size:18px}.prose img{max-width:100%;height:auto;border-radius:14px;border:1px solid var(--line);display:block;margin:20px auto}
.prose blockquote{margin:22px 0;padding:6px 20px;border-left:4px solid var(--amber);background:var(--panel);border-radius:0 12px 12px 0;color:var(--dim)}.prose blockquote p{font-size:17px}
.prose hr{border:0;border-top:1px solid var(--line);margin:36px 0}
.tw{overflow-x:auto;margin:20px 0}table{border-collapse:collapse;width:100%;font-size:15px;min-width:520px}th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}th{background:var(--panel)}
.prose.compact p,.prose.compact li{font-size:16px}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.ep{transition:none}.ep:hover{transform:none}}
@media(max-width:640px){body{font-size:16px}.hero{padding-top:36px}header.top .wrap{padding-top:6px;padding-bottom:6px}nav.main{margin-left:0}}
`;
wr('assets/site.css', css.trim() + '\n');

const js = `(() => {
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  // arc filter: without JavaScript every card stays visible
  const chips = $('.chip[data-arc]');
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const arc = c.dataset.arc;
    $('.ep[data-arc]').forEach((e) => { e.hidden = arc !== 'all' && e.dataset.arc !== arc; });
    const n = $('.ep[data-arc]').filter((e) => !e.hidden).length;
    const live = document.getElementById('count'); if (live) live.textContent = n + ' of ' + $('.ep[data-arc]').length + ' episodes shown';
  }));
  // chapter buttons seek the player
  const v = document.querySelector('video.player');
  $('.chap button').forEach((b) => b.addEventListener('click', () => { if (!v) return; v.currentTime = parseFloat(b.dataset.t); v.play().catch(() => {}); }));
  // copy buttons on code blocks
  $('pre').forEach((p) => {
    if (!navigator.clipboard) return;
    const w = document.createElement('div'); w.className = 'codewrap'; p.parentNode.insertBefore(w, p); w.appendChild(p);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy code to clipboard');
    b.addEventListener('click', () => navigator.clipboard.writeText(p.innerText).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); }));
    w.appendChild(b);
  });
})();
`;
wr('assets/site.js', js);

/* ---------- page shell ---------- */
const shell = ({title, desc, pathRel, depth, body, ogImage, jsonld}) => {
  const up = '../'.repeat(depth);
  const canon = SITE + pathRel;
  const og = SITE + (ogImage ?? 'assets/png/og.png');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta name="theme-color" content="#0b0c10">
<meta property="og:type" content="website"><meta property="og:site_name" content="Web Reality Checks"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${og}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230b0c10'/%3E%3Crect x='6' y='6' width='20' height='20' rx='5' fill='%233dd6f5'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${up}assets/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap"><a class="brand" href="${up}index.html"><i aria-hidden="true"></i>Web Reality Checks</a>
<nav class="main" aria-label="Primary"><a href="${up}index.html#method">Method</a><a href="${up}index.html#arcs">Arcs</a><a href="${up}index.html#launch">Launch</a><a href="${up}index.html#episodes">Episodes</a><a href="${up}index.html#run">Run it</a><a href="${REPO}">GitHub</a></nav></div></header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap">
<p><strong>Synthetic data only.</strong> Every fixture runs on loopback with made-up people and made-up records. Nothing here is a finding about a real product or company, and this series is not an audit or a certification. Scenes labeled <em>conceptual</em> or <em>promotional</em> on screen are illustrations, not product output.</p>
<p>Narration is a synthetic voice (ElevenLabs, model eleven_v4). Code is MIT licensed; narration audio and rendered video are all rights reserved. Kinetic Gain LLC. <a href="${REPO}">Source repository</a>.</p>
</div></footer>
<script src="${up}assets/site.js" defer></script>
</body></html>`;
};

/* ---------- WebVTT ---------- */
const vtt = (srt) => 'WEBVTT\n\n' + srt.replace(/\r/g, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
for (const f of films) wr(`episodes/${f.id}/captions.vtt`, vtt(rd(`episodes/${f.id}/captions.srt`)));

/* ---------- film pages ---------- */
const label = (f) => f.kind === 'episode' ? `Episode ${String(f.n).padStart(2, '0')}` : f.kind === 'trailer' ? 'Launch film' : 'Quiz';
const orderedEps = episodes.slice().sort((a, b) => a.n - b.n);
for (const f of films) {
  const arc = f.kind === 'episode' ? arcOf(f.n) : null;
  const pkg = f.kind !== 'episode' ? packages.find((p) => p.cm === f.id || p.qz === f.id) : null;
  const color = arc?.color ?? pkg?.color ?? '#3dd6f5';
  const readme = tidy(fixLinks(pandoc(rd(`episodes/${f.id}/README.md`)), `episodes/${f.id}`)).replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '');
  const chapters = f.tl ? f.tl.scenes.map((s) => `<li><button type="button" data-t="${s.start}"><b>${mmss(s.start)}</b><span>${esc(s.id.replace(/_/g, ' '))}</span></button></li>`).join('') : '';
  const i = orderedEps.indexOf(f);
  const prev = f.kind === 'episode' && i > 0 ? orderedEps[i - 1] : null;
  const next = f.kind === 'episode' && i < orderedEps.length - 1 ? orderedEps[i + 1] : null;
  const links = [
    `<a href="${f.id}.mp4" download>Download MP4</a>`, `<a href="captions.srt">SRT</a>`, `<a href="captions.vtt">WebVTT</a>`, ex(`episodes/${f.id}/hero.png`) ? `<a href="hero.png">Hero image</a>` : '',
    f.fixture ? `<a href="${REPO}/tree/main/fixtures/${f.fixture}">Fixture and tests</a>` : '',
    f.hasContent ? `<a href="${REPO}/blob/main/episodes/${f.id}/content/article-technical.md">Article for engineers</a><a href="${REPO}/blob/main/episodes/${f.id}/content/article-business.md">Article for buyers</a><a href="${REPO}/blob/main/episodes/${f.id}/content/article-layman.md">Article in plain language</a><a href="${REPO}/blob/main/episodes/${f.id}/content/distribution.md">Distribution kit</a>` : '',
    pkg ? `<a href="../../launch/${pkg.dir}/index.html">Read the launch article</a>` : '',
  ].filter(Boolean).join('');
  const meta = `${f.ev.video.width}×${f.ev.video.height} · ${f.ev.video.fps.replace('/1', '')} fps · ${f.ev.video.codec}/${f.ev.audio?.codec ?? 'no audio'}`;
  const body = `<div class="wrap">
<p class="crumb"><a href="../../index.html">Web Reality Checks</a> / ${f.kind === 'episode' ? `<a href="../../index.html#episodes">Episodes</a>` : `<a href="../../index.html#launch">Launch</a>`} / ${esc(label(f))}</p>
<div class="film"><div>
<video class="player" controls preload="metadata" poster="thumbnail.png" playsinline><source src="${f.id}.mp4" type="video/mp4"><track kind="captions" srclang="en" label="English" src="captions.vtt" default>Your browser cannot play this video. <a href="${f.id}.mp4">Download the MP4</a>.</video>
</div><aside aria-label="Chapters"><div class="kicker" style="color:${color}">${esc(label(f))}${arc ? ` · ${esc(arc.name)}` : ''}</div>
<h1 style="font-size:clamp(26px,3.4vw,38px)">${esc(f.title)}</h1>
<div><span class="badge ok">${esc(hm(f.ev.duration_s))}</span><span class="badge">${esc(meta)}</span><span class="badge">Narrated, captions included</span></div>
<h2 style="font-size:18px;margin:18px 0 0">Chapters</h2><ul class="chap">${chapters}</ul>
<p class="note">Chapter times are scene starts from the build timeline and can be about a second off the spoken words.</p></aside></div>
<div class="links" style="margin:0 0 8px">${links}</div>
<h2 style="margin-top:44px">${f.kind === 'episode' ? 'What was run, and what it does not prove' : 'About this film'}</h2>
<div class="prose compact" style="margin:0;max-width:860px">${readme}</div>
${f.kind === 'episode' ? `<nav class="pn" aria-label="Episode navigation"><span>${prev ? `<a href="../${prev.id}/index.html">← ${esc(label(prev))}: ${esc(prev.short)}</a>` : ''}</span><span>${next ? `<a href="../${next.id}/index.html">${esc(label(next))}: ${esc(next.short)} →</a>` : ''}</span></nav>` : ''}
</div>`;
  wr(`episodes/${f.id}/index.html`, shell({title: `${f.short}: ${label(f)} | Web Reality Checks`.slice(0, 70), desc: `${f.title}. ${hm(f.ev.duration_s)} narrated film backed by a runnable local fixture. Synthetic data only.`.slice(0, 155), pathRel: `episodes/${f.id}/index.html`, depth: 2, body, ogImage: `episodes/${f.id}/hero.png`}));
}

/* ---------- launch article pages ---------- */
for (const p of packages) {
  let md = rd(`launch/${p.dir}/article.md`);
  md = md.replace(/\[YouTube playlist link\]/g, '[Watch the films on this site](../../index.html#episodes)');
  if (/\{\{[A-Z]+\}\}/.test(md)) warnings.push(`unreplaced placeholder in launch/${p.dir}/article.md`);
  const html = tidy(fixLinks(pandoc(md), `launch/${p.dir}`));
  const cm = byId.get(p.cm), qz = byId.get(p.qz);
  const body = `<div class="wrap"><article class="prose">
<p class="crumb"><a href="../../index.html">Web Reality Checks</a> / <a href="../../index.html#launch">Launch</a> / For ${esc(p.audience.charAt(0).toLowerCase() + p.audience.slice(1))}</p>
${html}
<hr><h2>Watch and test yourself</h2>
<div class="links" style="font-size:17px">${cm ? `<a href="../../episodes/${cm.id}/index.html">Watch the ${esc(hm(cm.ev.duration_s))} launch film</a>` : ''}${qz ? `<a href="../../episodes/${qz.id}/index.html">Take the ${esc(hm(qz.ev.duration_s))} quiz</a>` : ''}<a href="${REPO}/blob/main/launch/${p.dir}/social.md">Social copy</a><a href="${REPO}/blob/main/launch/${p.dir}/seo.md">SEO notes</a></div>
</article></div>`;
  wr(`launch/${p.dir}/index.html`, shell({title: `${p.title}`.slice(0, 70), desc: p.subtitle.slice(0, 155) || p.angle, pathRel: `launch/${p.dir}/index.html`, depth: 2, body, ogImage: p.hero ?? undefined}));
}

/* ---------- landing ---------- */
const nEp = episodes.length;
const runtime = episodes.reduce((a, f) => a + f.ev.duration_s, 0);
const stat = [
  [String(nEp), 'narrated episodes', '#3dd6f5'],
  [hm(runtime), 'total runtime', '#f5b63d'],
  T ? [String(T.tests), T.testFailures ? `fixture tests passing, ${T.testFailures} failing` : 'fixture tests passing, 0 failing', T.testFailures ? '#f5533d' : '#5fe08a'] : null,
  [String(episodes.filter((f) => f.fixture).length), 'runnable fixtures', '#a78bfa'],
].filter(Boolean);
const card = (f) => {
  const arc = arcOf(f.n);
  return `<a class="ep" data-arc="${esc(arc?.name ?? '')}" style="--c:${arc?.color ?? '#3dd6f5'}" href="episodes/${f.id}/index.html"><img src="episodes/${f.id}/thumbnail.png" alt="" loading="lazy" decoding="async" width="1280" height="720"><span class="b"><span class="n">EPISODE ${String(f.n).padStart(2, '0')} · ${esc(arc?.name ?? '')}</span><h3>${esc(f.short)}</h3><span class="m">${esc(hm(f.ev.duration_s))}${f.fixture ? ' · fixture + tests' : ' · conceptual'}</span></span></a>`;
};
const firstFixture = episodes.find((f) => f.fixture && ex(`fixtures/${f.fixture}/test.mjs`) && !ex(`fixtures/${f.fixture}/package.json`));
const bash = `git clone ${REPO}.git\ncd web-reality-checks/fixtures/${firstFixture?.fixture ?? 'ep15-idempotency'}\nnode --test\nnode demo.mjs`;
const ps = `git clone ${REPO}.git\ncd web-reality-checks\\fixtures\\${firstFixture?.fixture ?? 'ep15-idempotency'}\nnode --test\nnode demo.mjs`;
const desc = `${nEp} narrated films about web bugs that survive demos, each with a runnable local fixture and tests. Break it on purpose, prove the fix.`;
const landing = `<div class="wrap">
<section class="hero" aria-labelledby="h1">
<div class="herogrid"><div><div class="kicker">Open-source technical film library</div>
<h1 id="h1">Break it on purpose.<br>Prove the fix.</h1>
<p class="lede">${nEp} short films about the web bugs that survive demos: a double charge, a stale page, someone else's name on your screen, a date one day off. Each film is backed by a fixture you can run on a laptop and tests that fail when the flaw comes back.</p>
<div class="cta"><a class="btn pri" href="#episodes">Watch the series</a><a class="btn" href="#launch">Start with your audience</a><a class="btn" href="#run">Run a fixture</a></div></div>
<div class="loopbox"><img src="assets/loop.svg" width="520" height="190" alt="Four linked steps: Flaw, Control, Repair, Retest."><p>Reproduce it. Prove the test can fail. Apply the smallest repair. Run the same test again.</p></div></div>
<ul class="stats">${stat.map((s) => `<li style="--c:${s[2]}"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></li>`).join('')}</ul>
</section>

<section class="blk" id="method" aria-labelledby="m-h"><h2 id="m-h">The method: flaw, control, repair, retest</h2>
<p class="sub">A test that passes proves nothing unless the same test can fail. So every film first reproduces the failure, then proves the detector can see it, then applies the smallest repair and repeats the identical check.</p>
<img class="banner" src="assets/method.svg" width="1280" height="280" loading="lazy" alt="Method in four steps. One, Flaw: reproduce the failure on a local synthetic fixture. Two, Control: a known-positive test proves the detector can fail. Three, Repair: the smallest fix, with its limits stated. Four, Retest: same test, same schedule, real results on screen.">
<div class="grid g3" style="margin-top:18px">
<div class="card"><h3>Why the control matters</h3><p style="margin:0;color:var(--dim)">The control asserts the flaw is observable. If a bug test cannot fail, a green run is silence, not evidence. This is also the quickest review step for AI-generated tests.</p></div>
<div class="card"><h3>Why loopback and synthetic</h3><p style="margin:0;color:var(--dim)">Everything runs on 127.0.0.1 with made-up data, so a run is repeatable, safe to share and never touches a real service. The cost is stated: a fixture proves a mechanism, not your production.</p></div>
<div class="card"><h3>Why numbers come from files</h3><p style="margin:0;color:var(--dim)">On-screen results are copied from each fixture's <code>evidence.json</code>. Scenes that could not be executed are labeled conceptual on screen.</p></div>
</div></section>

<section class="blk" id="arcs" aria-labelledby="a-h"><h2 id="a-h">Five arcs, ${nEp} questions</h2>
<p class="sub">The episodes group into five families of failure. Pick the arc closest to the incident you are chasing.</p>
<div class="grid g5">${arcs.map((a) => `<div class="card arc" style="--c:${a.color}"><h3>${esc(a.name)}</h3><ol>${a.episodes.map((n) => { const f = episodes.find((e) => e.n === n); return f ? `<li><a href="episodes/${f.id}/index.html"><b>${String(n).padStart(2, '0')}</b>${esc(f.short)}</a></li>` : `<li><b>${String(n).padStart(2, '0')}</b>coming</li>`; }).join('')}</ol></div>`).join('')}</div></section>

${packages.length ? `<section class="blk" id="launch" aria-labelledby="l-h"><h2 id="l-h">Start with your audience</h2>
<p class="sub">Three launch packages. Each has a long article, a short launch film and a five-question quiz, written for a different reader.</p>
<div class="grid g3">${packages.map((p) => { const cm = byId.get(p.cm), qz = byId.get(p.qz); return `<article class="card pk" style="--c:${p.color}"><div class="who">${esc(p.audience)}</div>${p.hero ? `<a href="launch/${p.dir}/index.html"><img src="${p.hero}" width="1600" height="900" loading="lazy" decoding="async" alt="Hero graphic for the article: ${esc(p.title)}"></a>` : ''}<h3>${esc(p.title)}</h3><p style="margin:0;color:var(--dim)">${esc(p.subtitle)}</p><div class="links"><a href="launch/${p.dir}/index.html">Read the article (${Math.round(p.words / 220)} min)</a>${cm ? `<a href="episodes/${cm.id}/index.html">Launch film, ${esc(hm(cm.ev.duration_s))}</a>` : ''}${qz ? `<a href="episodes/${qz.id}/index.html">Quiz, ${esc(hm(qz.ev.duration_s))}</a>` : ''}</div></article>`; }).join('')}</div></section>` : ''}

<section class="blk" id="episodes" aria-labelledby="e-h"><h2 id="e-h">All episodes</h2>
<p class="sub">Each page has the player, captions, chapters, the executed evidence and the limits of what it proves.</p>
<div class="chips" role="group" aria-label="Filter by arc"><button class="chip" type="button" data-arc="all" aria-pressed="true">All</button>${arcs.map((a) => `<button class="chip" type="button" data-arc="${esc(a.name)}" aria-pressed="false">${esc(a.name)}</button>`).join('')}</div>
<p id="count" class="note" role="status" aria-live="polite">${nEp} of ${nEp} episodes shown</p>
<div class="grid g3">${orderedEps.map(card).join('')}</div></section>

<section class="blk" id="honest" aria-labelledby="n-h"><h2 id="n-h">What this is, and what it is not</h2>
<div class="two" style="margin-top:14px"><div class="card"><h3>Exists today</h3><ul class="yes"><li>${nEp} narrated films with captions, thumbnails and hero images</li><li>A runnable fixture and node:test suite behind each one that executes code</li><li>Three article versions per episode: engineers, buyers, plain language</li><li>Three launch packages, three launch films and three quizzes</li></ul></div>
<div class="card"><h3>Does not claim</h3><ul class="no"><li>It is not an audit, a certification or a finding about any real product</li><li>A passing fixture does not prove your system is safe</li><li>Some scenes are conceptual illustrations and say so on screen</li><li>There is no roadmap, and nothing here is promised</li></ul></div></div></section>

<section class="blk" id="run" aria-labelledby="r-h"><h2 id="r-h">Run a fixture yourself</h2>
<p class="sub">Node 22 or newer is the only requirement for this fixture. No install step, no network.</p>
<div class="grid g2"><div><h3>macOS and Linux</h3><pre><code>${esc(bash)}</code></pre></div><div><h3>Windows PowerShell</h3><pre><code>${esc(ps)}</code></pre></div></div>
<p class="note">Rendering a film needs more: ffmpeg, Remotion and the steps in the <a href="${REPO}#reproduce-one-episode">README</a>.</p></section>
</div>`;
const jsonld = {'@context': 'https://schema.org', '@graph': [
  {'@type': 'WebSite', name: 'Web Reality Checks', url: SITE, description: desc, publisher: {'@type': 'Organization', name: 'Kinetic Gain LLC', url: 'https://kineticgain.com'}},
  {'@type': 'SoftwareSourceCode', name: 'Web Reality Checks', codeRepository: REPO, license: 'https://opensource.org/license/mit', programmingLanguage: 'JavaScript'},
]};
wr('index.html', shell({title: 'Web Reality Checks: break it on purpose, prove the fix', desc: desc.slice(0, 155), pathRel: '', depth: 0, body: landing, jsonld}));
wr('.nojekyll', '');

/* ---------- report ---------- */
const out = {pages: 1 + films.length + packages.length, films: films.length, episodes: nEp, packages: packages.length, warnings: warnings.length};
console.log(JSON.stringify(out));
if (warnings.length) console.log([...new Set(warnings)].join('\n'));
