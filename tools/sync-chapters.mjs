#!/usr/bin/env node
// Rewrites chapter timestamps in episodes/epNN/content/*.md from the final timeline.json.
// Chapter lines look like "00:12 Label" or "- 00:12 Label"; labels are kept, times are replaced in order.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const eps = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d));
for (const ep of eps) {
  const tlp = path.join(root, 'video', 'src', 'episodes', ep, 'timeline.json');
  const cdir = path.join(root, 'episodes', ep, 'content');
  if (!fs.existsSync(tlp) || !fs.existsSync(cdir)) continue;
  const tl = JSON.parse(fs.readFileSync(tlp, 'utf8'));
  if (!tl.audio) { console.log(ep, 'skipped: no audio-aligned timeline'); continue; }
  const starts = tl.scenes.map((s) => mmss(s.start));
  for (const f of fs.readdirSync(cdir).filter((x) => x.endsWith('.md'))) {
    const p = path.join(cdir, f);
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    let i = 0, changed = 0, inBlock = false;
    const out = lines.map((line) => {
      const m = line.match(/^(\s*(?:[-*]\s+)?)(\d\d:\d\d)(\s+\S.*)$/);
      if (m) {
        if (!inBlock) { i = 0; inBlock = true; }
        if (i < starts.length) { const nl = `${m[1]}${starts[i]}${m[3]}`; if (nl !== line) changed++; i++; return nl; }
        return line;
      }
      if (inBlock && line.trim() === '') inBlock = false;
      return line;
    });
    if (changed) fs.writeFileSync(p, out.join('\n'));
    console.log(ep, f, changed ? `updated ${changed} chapter times` : 'ok');
  }
}
