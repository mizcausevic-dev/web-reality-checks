#!/usr/bin/env node
// Generates the GitHub Pages preview gallery at the repo root (index.html).
// Pages source: branch main, folder "/" so episode media is served from episodes/epNN/.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = 'https://github.com/mizcausevic-dev/web-reality-checks';
const eps = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d) && fs.existsSync(path.join(root, 'episodes', d, 'script.json')) && fs.existsSync(path.join(root, 'episodes', d, 'render-evidence.json'))).sort();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const cards = eps.map((ep) => {
  const d = path.join(root, 'episodes', ep);
  const script = JSON.parse(fs.readFileSync(path.join(d, 'script.json'), 'utf8'));
  const ev = fs.existsSync(path.join(d, 'render-evidence.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'render-evidence.json'), 'utf8')) : null;
  const tlp = path.join(root, 'video', 'src', 'episodes', ep, 'timeline.json');
  const tl = fs.existsSync(tlp) ? JSON.parse(fs.readFileSync(tlp, 'utf8')) : null;
  const hasMp4 = fs.existsSync(path.join(d, `${ep}.mp4`));
  const hasThumb = fs.existsSync(path.join(d, 'thumbnail.png'));
  const hasHero = fs.existsSync(path.join(d, 'hero.png'));
  const fixture = fs.readdirSync(path.join(root, 'fixtures')).find((f) => f.startsWith(ep + '-'));
  const content = fs.existsSync(path.join(d, 'content'));
  const chapters = tl ? tl.scenes.map((s) => `<li><span>${mmss(s.start)}</span> ${esc(s.id.replace(/_/g, ' '))}</li>`).join('') : '';
  const badge = ev ? `<span class="badge ok">Rendered · ${ev.video.width}×${ev.video.height} ${ev.video.fps.replace('/1', '')} fps · ${ev.video.codec}/${ev.audio?.codec ?? 'no audio'} · ${ev.duration_s}s</span>` : `<span class="badge warn">Not rendered</span>`;
  const narr = tl && tl.audio ? `<span class="badge ok">Narrated (ElevenLabs)</span>` : `<span class="badge warn">Caption-led, no narration</span>`;
  return `
  <section class="ep" id="${ep}">
    <div class="media">
      ${hasMp4 ? `<video controls preload="none" ${hasThumb ? `poster="episodes/${ep}/thumbnail.png"` : ''} src="episodes/${ep}/${ep}.mp4"></video>` : hasThumb ? `<img src="episodes/${ep}/thumbnail.png" alt="">` : '<div class="placeholder">no media yet</div>'}
    </div>
    <div class="meta">
      <div class="kicker">Episode ${String(script.n).padStart(2, '0')}</div>
      <h2>${esc(script.fullTitle ?? script.title)}</h2>
      <div class="badges">${badge} ${narr}</div>
      <ul class="chapters">${chapters}</ul>
      <div class="links">
        ${hasMp4 ? `<a href="episodes/${ep}/${ep}.mp4" download>MP4</a>` : ''}
        <a href="episodes/${ep}/captions.srt">SRT</a>
        ${hasHero ? `<a href="episodes/${ep}/hero.png">Hero image</a>` : ''}
        <a href="${REPO}/blob/main/episodes/${ep}/README.md">README</a>
        ${fixture ? `<a href="${REPO}/tree/main/fixtures/${fixture}">Fixture + tests</a>` : ''}
        ${content ? `<a href="${REPO}/blob/main/episodes/${ep}/content/article-technical.md">Article (technical)</a> <a href="${REPO}/blob/main/episodes/${ep}/content/distribution.md">Distribution kit</a>` : ''}
      </div>
    </div>
  </section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Reality Checks · preview</title>
<meta name="description" content="Technical explainer videos with runnable local fixtures and regression tests. Preview gallery.">
<style>
:root{--bg:#0b0c10;--panel:#171a21;--line:#2a2e38;--text:#f3ede3;--dim:#9a978f;--cyan:#3dd6f5;--amber:#f5b63d;--green:#5fe08a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 Inter,system-ui,sans-serif}
header{padding:48px 24px 16px;max-width:1200px;margin:0 auto}h1{font-size:40px;margin:0 0 8px;letter-spacing:-1px}header p{color:var(--dim);margin:0;max-width:760px}
main{max-width:1200px;margin:0 auto;padding:16px 24px 80px;display:grid;gap:28px}
.ep{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}
@media(max-width:860px){.ep{grid-template-columns:1fr}}
video,img{width:100%;border-radius:10px;background:#000;display:block}.placeholder{aspect-ratio:16/9;display:grid;place-items:center;color:var(--dim);border:1px dashed var(--line);border-radius:10px}
.kicker{color:var(--cyan);letter-spacing:3px;text-transform:uppercase;font-size:12px;font-weight:700}h2{font-size:24px;margin:6px 0 10px;line-height:1.2}
.badge{display:inline-block;font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid;margin:0 6px 6px 0}.ok{color:var(--green);border-color:var(--green)}.warn{color:var(--amber);border-color:var(--amber)}
.chapters{list-style:none;padding:0;margin:10px 0;columns:2;font-size:13px;color:var(--dim)}.chapters span{color:var(--text);font-family:ui-monospace,monospace;margin-right:8px}
.links a{color:var(--cyan);margin-right:14px;font-size:14px;text-decoration:none}.links a:hover{text-decoration:underline}
footer{color:var(--dim);font-size:13px;max-width:1200px;margin:0 auto;padding:0 24px 48px}
</style></head><body>
<header><h1>Web Reality Checks</h1><p>Technical explainer episodes. Each one is backed by a runnable local fixture with regression tests; on-screen results come from those tests. Everything shown is synthetic and labeled as such. Preview build, not a public launch page.</p></header>
<main>${cards}</main>
<footer>Kinetic Gain LLC · <a style="color:var(--cyan)" href="${REPO}">source repository</a> · generated ${new Date().toISOString().slice(0, 10)}</footer>
</body></html>`;
fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(path.join(root, '.nojekyll'), '');
console.log('index.html written for', eps.join(', '));
