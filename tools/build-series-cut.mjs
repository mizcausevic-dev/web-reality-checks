#!/usr/bin/env node
// Rebuilds the full-series cut (all episodes, in order, with one chapter per episode) from the episode MP4s
// that are committed in this repository. No re-encoding: the episodes share codec, size, frame rate and audio
// format, so ffmpeg joins them with stream copy in about a minute. Output is NOT committed (about 270 MB).
// Requires Node 22+ and ffmpeg + ffprobe on PATH. Works on macOS, Linux and Windows.
// Usage: node tools/build-series-cut.mjs [--out series-cut]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const oi = process.argv.indexOf('--out');
const outDir = path.resolve(oi > -1 ? process.argv[oi + 1] : 'series-cut');
const must = (cmd) => { const r = spawnSync(cmd, ['-version'], {encoding: 'utf8'}); if (r.error || r.status !== 0) { console.error(`BLOCKED: ${cmd} not found on PATH`); process.exit(2); } };
must('ffmpeg'); must('ffprobe');

const ids = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d)).sort();
const fwd = (p) => p.replace(/\\/g, '/').replace(/'/g, "'\\''");
let t = 0, meta = ';FFMETADATA1\ntitle=Web Reality Checks: the full series\nartist=Miz Causevic, Kinetic Gain LLC\n', list = '', txt = '';
const missing = [];
for (const id of ids) {
  const mp4 = path.join(root, 'episodes', id, `${id}.mp4`);
  if (!fs.existsSync(mp4)) { missing.push(mp4); continue; }
  const ev = JSON.parse(fs.readFileSync(path.join(root, 'episodes', id, 'render-evidence.json'), 'utf8'));
  const sc = JSON.parse(fs.readFileSync(path.join(root, 'episodes', id, 'script.json'), 'utf8'));
  const title = String(sc.fullTitle ?? sc.title).replace(/\s+/g, ' ');
  const d = ev.duration_s;
  meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(t * 1000)}\nEND=${Math.round((t + d) * 1000)}\ntitle=${id.slice(2)} · ${title}\n`;
  txt += `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')} ${id.slice(2)} ${title}\n`;
  list += `file '${fwd(mp4)}'\n`;
  t += d;
}
if (missing.length) { console.error(`BLOCKED: ${missing.length} episode MP4 missing, e.g. ${missing[0]}. Pull the full repository first.`); process.exit(2); }

fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'chapters.ffmeta'), meta);
fs.writeFileSync(path.join(outDir, 'list.txt'), list);
fs.writeFileSync(path.join(outDir, 'chapters.txt'), txt);
const out = path.join(outDir, 'web-reality-checks-full-series.mp4');
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(outDir, 'list.txt'), '-i', path.join(outDir, 'chapters.ffmeta'), '-map', '0:v', '-map', '0:a', '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', out], {stdio: 'inherit'});
if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {encoding: 'utf8'});
console.log(JSON.stringify({episodes: ids.length, expected_s: +t.toFixed(2), actual_s: +parseFloat(p.stdout).toFixed(2), bytes: fs.statSync(out).size, file: out, chapters: path.join(outDir, 'chapters.txt')}));
