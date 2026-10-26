#!/usr/bin/env node
// Re-render only the thumbnail (1280x720) of already-shipped episodes, e.g. after a kit or script.json thumb change.
// Usage: node tools/rethumb.mjs --series <series repo> ff27 ff30 ...
// Writes episodes/<id>/thumbnail.png in the series repo. Nothing is uploaded; use youtube-upload.mjs --upload --rethumb for that.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {engineRoot, npx, freePort} from './lib.mjs';

const args = process.argv.slice(2);
const si = args.indexOf('--series');
if (si < 0 || !args[si + 1]) { console.error('usage: node tools/rethumb.mjs --series <series repo> <id> [<id>...]'); process.exit(1); }
const seriesDir = path.resolve(args[si + 1]);
const ids = args.filter((a, i) => i !== si && i !== si + 1);
if (!ids.length) { console.error('give at least one episode id'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(path.join(seriesDir, 'series.json'), 'utf8'));
const E = (...p) => path.join(engineRoot, ...p);
const node = process.execPath;
const sh = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, {stdio: 'inherit', ...o, shell: false}); if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${a.slice(0, 2).join(' ')} failed`); };

for (const id of ids) {
  if (!new RegExp(`^${cfg.idPrefix}\\d\\d$`).test(id)) throw new Error(`id ${id} does not match prefix ${cfg.idPrefix}`);
  const epDir = path.join(seriesDir, 'episodes', id);
  const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf8'));
  script.series = cfg.name;
  fs.mkdirSync(E('episodes', id), {recursive: true});
  fs.writeFileSync(E('episodes', id, 'script.json'), JSON.stringify(script, null, 2));
  fs.mkdirSync(E('video', 'src', 'episodes', id), {recursive: true});
  for (const f of ['Scenes.tsx', 'index.tsx']) fs.copyFileSync(path.join(epDir, 'video', f), E('video', 'src', 'episodes', id, f));
  const mp3 = path.join(epDir, 'narration.mp3');
  if (fs.existsSync(mp3)) { fs.mkdirSync(E('video', 'public', id), {recursive: true}); fs.copyFileSync(mp3, E('video', 'public', id, 'narration.mp3')); }
  sh(node, [E('tools', 'build-timeline.mjs'), id], {cwd: engineRoot});
  sh(node, [E('tools', 'gen-root.mjs'), id], {cwd: engineRoot});
  try {
    const out = path.join(epDir, 'thumbnail.png');
    const st = npx(['remotion', 'still', 'src/index.ts', `THUMB-${id.toUpperCase()}`, out, '--port', String(await freePort()), '--log', 'error'], {cwd: E('video'), stdio: 'inherit'});
    if (st.status !== 0) throw new Error(`still failed for ${id}`);
    console.log(`${id} thumbnail written: ${out}`);
  } finally { sh(node, [E('tools', 'gen-root.mjs')], {cwd: engineRoot}); }
}
