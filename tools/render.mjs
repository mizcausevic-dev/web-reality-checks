#!/usr/bin/env node
// Render an episode, probe the result, extract inspection frames and a 1280x720 thumbnail.
// Usage: node tools/render.mjs ep01 [--thumb-frame N] [--concurrency N]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

const ep = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const video = path.join(root, 'video');
const outDir = path.join(root, 'episodes', ep);
const mp4 = path.join(outDir, `${ep}.mp4`);
const tl = JSON.parse(fs.readFileSync(path.join(video, 'src', 'episodes', ep, 'timeline.json'), 'utf8'));
const compId = ep.toUpperCase();
const conc = arg('--concurrency', '2');

const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', compId, mp4, '--codec', 'h264', '--pixel-format', 'yuv420p', '--audio-codec', 'aac', '--concurrency', conc, '--log', 'error'], {cwd: video, stdio: 'inherit'});
if (r.status !== 0) { console.error('RENDER FAILED'); process.exit(r.status ?? 1); }

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const evidence = {
  file: path.relative(root, mp4),
  bytes: fs.statSync(mp4).size,
  duration_s: +parseFloat(probe.format.duration).toFixed(2),
  video: v ? {codec: v.codec_name, width: v.width, height: v.height, fps: v.r_frame_rate, pix_fmt: v.pix_fmt} : null,
  audio: a ? {codec: a.codec_name, sample_rate: a.sample_rate, channels: a.channels} : null,
  expected_duration_s: tl.duration,
};

// inspection frames: opening, 1/4, mid, 3/4, ending (and any scene named fail/fix)
const fdir = path.join(outDir, 'frames');
fs.mkdirSync(fdir, {recursive: true});
const picks = {opening: 1.0, quarter: tl.duration * 0.25, middle: tl.duration * 0.5, three_quarter: tl.duration * 0.75, ending: tl.duration - 1.5};
for (const s of tl.scenes) if (/fail|vuln|break|wrong|bad|stale|dup/.test(s.id)) picks[`scene_${s.id}`] = (s.start + s.end) / 2;
for (const s of tl.scenes) if (/fix|correct|repair|retest|verify/.test(s.id)) picks[`scene_${s.id}`] = (s.start + s.end) / 2;
for (const [name, t] of Object.entries(picks)) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.max(0, t)), '-i', mp4, '-frames:v', '1', path.join(fdir, `${name}.png`)]);
}
for (const [id, out] of [[`HERO-${compId}`, 'hero.png'], [`THUMB-${compId}`, 'thumbnail.png']]) {
  const st = spawnSync('npx', ['remotion', 'still', 'src/index.ts', id, path.join(outDir, out), '--log', 'error'], {cwd: video, stdio: 'inherit'});
  if (st.status !== 0) console.error('STILL FAILED', id);
}
evidence.thumbnail = {file: path.relative(root, path.join(outDir, 'thumbnail.png')), size: '1280x720', source: `THUMB-${compId}`};
evidence.hero = {file: path.relative(root, path.join(outDir, 'hero.png')), size: '1600x900', source: `HERO-${compId}`};
evidence.frames = Object.keys(picks);
fs.writeFileSync(path.join(outDir, 'render-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 1));
