#!/usr/bin/env node
// Builds video/src/episodes/<ep>/timeline.json and episodes/<ep>/captions.srt
// from episodes/<ep>/script.json plus (optionally) the narration audio.
//
// Scene boundaries: proportional to narration word counts, snapped to detected
// silences in the real audio when a silence lies within SNAP seconds of the
// estimate. This is an alignment heuristic, not forced alignment; it is
// disclosed in each README.
//
// Usage: node tools/build-timeline.mjs ep01 [--no-audio]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {engineRoot} from './lib.mjs';

const ep = process.argv[2];
if (!ep) throw new Error('usage: build-timeline.mjs epNN [--no-audio]');
const noAudio = process.argv.includes('--no-audio');
const root = engineRoot;
const scriptPath = path.join(root, 'episodes', ep, 'script.json');
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const audioRel = `${ep}/narration.mp3`;
const audioAbs = path.join(root, 'video', 'public', audioRel);
const hasAudio = !noAudio && fs.existsSync(audioAbs);

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const LEAD = 0.6; // seconds of visual lead before narration begins
const TAIL = 2.0; // hold after narration ends

let speechDur;
let silences = [];
if (hasAudio) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioAbs]).toString().trim();
  speechDur = parseFloat(probe);
  const out = spawnSync('ffmpeg', ['-i', audioAbs, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...out.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  silences = starts.map((s, i) => ({s, e: ends[i] ?? s + 0.3})).map((x) => ({...x, mid: (x.s + x.e) / 2}));
} else {
  const total = script.scenes.reduce((a, s) => a + words(s.narration), 0);
  speechDur = total / 2.55; // conservative spoken rate estimate; disclosed
}

const totalWords = script.scenes.reduce((a, s) => a + words(s.narration), 0);
// estimated boundaries (end of each scene except last) within speech window
const est = [];
let acc = 0;
for (let i = 0; i < script.scenes.length - 1; i++) {
  acc += words(script.scenes[i].narration);
  est.push(LEAD + (acc / totalWords) * speechDur);
}
const SNAP = 1.4;
const used = new Set();
const bounds = est.map((e) => {
  let best = null;
  silences.forEach((sl, idx) => {
    if (used.has(idx)) return;
    if (sl.mid <= LEAD || sl.mid >= LEAD + speechDur) return;
    const d = Math.abs(sl.mid - e);
    if (d < SNAP && (!best || d < best.d)) best = {d, idx, t: sl.mid};
  });
  if (best) {
    used.add(best.idx);
    return {t: best.t, snapped: true};
  }
  return {t: e, snapped: false};
});
// enforce monotonic + min scene length
for (let i = 1; i < bounds.length; i++) if (bounds[i].t < bounds[i - 1].t + 2) bounds[i].t = bounds[i - 1].t + 2;

const duration = +(LEAD + speechDur + TAIL).toFixed(2);
const scenes = script.scenes.map((s, i) => ({
  id: s.id,
  start: i === 0 ? 0 : +bounds[i - 1].t.toFixed(2),
  end: i === script.scenes.length - 1 ? duration : +bounds[i].t.toFixed(2),
  ...(s.sim !== undefined ? {sim: s.sim} : {}),
}));

// captions: split each scene's narration window among caption lines by word count
const captions = [];
scenes.forEach((sc, i) => {
  const s = script.scenes[i];
  const lines = s.captions && s.captions.length ? s.captions : s.narration.match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()) ?? [s.narration];
  const w = lines.map(words);
  const tw = w.reduce((a, b) => a + b, 0);
  const winStart = i === 0 ? LEAD : sc.start;
  const winEnd = i === scenes.length - 1 ? LEAD + speechDur : sc.end;
  let t = winStart;
  lines.forEach((text, j) => {
    const d = ((winEnd - winStart) * w[j]) / tw;
    captions.push({start: +t.toFixed(2), end: +(t + d).toFixed(2), text});
    t += d;
  });
});

const heroDefault = scenes.find((s) => /leak|fail|freeze|dup|stale|wrong|break/.test(s.id)) ?? scenes[1] ?? scenes[0];
const timeline = {n: script.n, ...(script.series ? {series: script.series} : {}), ...(script.palette ? {palette: script.palette} : {}), title: script.title, ...(script.tag ? {tag: script.tag} : {}), ...(script.kicker ? {kicker: script.kicker} : {}), fullTitle: script.fullTitle ?? script.title, slug: script.slug, hero: script.hero ?? {scene: heroDefault.id, t: Math.min(6, Math.max(2, (heroDefault.end - heroDefault.start) - 1))}, audio: hasAudio ? audioRel : null, duration, scenes, captions};
const tlDir = path.join(root, 'video', 'src', 'episodes', ep);
fs.mkdirSync(tlDir, {recursive: true});
fs.writeFileSync(path.join(tlDir, 'timeline.json'), JSON.stringify(timeline, null, 2));

const ts = (x) => {
  const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = Math.floor(x % 60), ms = Math.round((x - Math.floor(x)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};
const srt = captions.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n');
fs.writeFileSync(path.join(root, 'episodes', ep, 'captions.srt'), srt);

console.log(JSON.stringify({ep, hasAudio, speechDur: +speechDur.toFixed(2), duration, silencesDetected: silences.length, boundaries: bounds.map((b) => ({t: +b.t.toFixed(2), snapped: b.snapped})), captions: captions.length}, null, 1));
