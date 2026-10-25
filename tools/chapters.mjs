// Builds YouTube chapter lines from a timeline and script, and writes them into distribution.md between markers.
// YouTube needs the first chapter at 00:00, at least three chapters, and each at least 10 seconds long, so scenes
// shorter than that are merged into the chapter before them.
import fs from 'node:fs';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function makeChapters(timeline, script, minLen = 10) {
  const title = (id) => script.scenes.find((s) => s.id === id)?.chapter;
  const out = [];
  for (const sc of timeline.scenes) {
    const name = title(sc.id);
    if (!name) throw new Error(`scene "${sc.id}" has no "chapter" title in script.json`);
    const start = out.length === 0 ? 0 : Math.round(sc.start);
    const prev = out[out.length - 1];
    if (prev && start - prev.start < minLen) continue; // too short: folds into the previous chapter
    out.push({start, name});
  }
  // a short final chapter folds back too
  while (out.length > 1 && timeline.duration - out[out.length - 1].start < minLen) out.pop();
  if (out.length < 3) throw new Error(`only ${out.length} chapters of at least ${minLen}s: YouTube needs three or more`);
  return out.map((c) => `${mmss(c.start)} ${c.name}`);
}

export function applyChapters(mdPath, lines) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const re = /(<!-- chapters:start -->\n)[\s\S]*?(\n<!-- chapters:end -->)/;
  if (!re.test(md)) throw new Error(`${mdPath} has no <!-- chapters:start --> ... <!-- chapters:end --> block`);
  fs.writeFileSync(mdPath, md.replace(re, `$1${lines.join('\n')}$2`));
}
