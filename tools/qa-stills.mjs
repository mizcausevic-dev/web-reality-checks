#!/usr/bin/env node
// Renders one still per scene (at scene midpoint) into episodes/epNN/qa/ for pre-render review.
// Usage: node tools/qa-stills.mjs ep02 [sceneId ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {engineRoot, npx, freePort} from './lib.mjs';
const ep = process.argv[2];
const only = process.argv.slice(3);
const root = engineRoot;
const video = path.join(root, 'video');
const tl = JSON.parse(fs.readFileSync(path.join(video, 'src', 'episodes', ep, 'timeline.json'), 'utf8'));
const out = path.join(root, 'episodes', ep, 'qa');
fs.mkdirSync(out, {recursive: true});
const scenes = tl.scenes.filter((s) => !only.length || only.includes(s.id));
const frames = scenes.map((s) => ({id: s.id, f: Math.round(((s.start + s.end) / 2) * 30)}));
for (const {id, f} of frames) {
  const r = npx(['remotion', 'still', 'src/index.ts', ep.toUpperCase(), path.join(out, `${id}.png`), '--frame', String(f), '--port', String(await freePort()), '--log', 'error'], {cwd: video, stdio: 'inherit'});
  if (r.status !== 0) console.error('still failed', id);
}
console.log(frames.map((x) => `${x.id}@${x.f}`).join(' '));
