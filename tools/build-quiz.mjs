#!/usr/bin/env node
// Builds a quiz video's narration, timeline and captions from ONE text-to-speech take.
//
// Input : episodes/<id>/script.json   (scenes with narration, captions, optional think:<seconds>)
//         video/public/<id>/raw.mp3   (single TTS take of all scene narrations, in order)
// Output: video/public/<id>/narration.mp3  (scene audio cut at detected silences, with silent
//                                           "think time" inserted after scenes that declare think)
//         video/src/episodes/<id>/timeline.json, episodes/<id>/captions.srt, episodes/<id>/audio-splice.json
//
// Honesty note: cut points are chosen from silences detected by ffmpeg silencedetect, nearest to a
// word-count estimate. The tool refuses to cut when no silence lies within the search window, so a
// word is never split. Think-time silence is inserted by this tool, not generated speech.
//
// Usage: node tools/build-quiz.mjs qz01
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';

const id = process.argv[2];
if (!id) throw new Error('usage: build-quiz.mjs qzNN');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'episodes', id, 'script.json'), 'utf8'));
const rawPath = path.join(root, 'video', 'public', id, 'raw.mp3');
if (!fs.existsSync(rawPath)) throw new Error(`missing ${rawPath}`);
const LEAD = 0.6, TAIL = 2.0, SNAP = 2.2;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const speechDur = dur(rawPath);
const sd = spawnSync('ffmpeg', ['-i', rawPath, '-af', 'silencedetect=noise=-35dB:d=0.2', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const starts = [...sd.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
const ends = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
const silences = starts.map((s, i) => ({s, e: ends[i] ?? speechDur, mid: ((ends[i] ?? speechDur) + s) / 2, len: (ends[i] ?? speechDur) - s}));

const W = script.scenes.map((s) => words(s.narration));
const totalW = W.reduce((a, b) => a + b, 0);
let acc = 0;
const cuts = [];
const used = new Set();
for (let i = 0; i < script.scenes.length - 1; i++) {
  acc += W[i];
  const est = (acc / totalW) * speechDur;
  let best = null;
  silences.forEach((sl, idx) => {
    if (used.has(idx) || sl.mid <= 0.3 || sl.mid >= speechDur - 0.3) return;
    const d = Math.abs(sl.mid - est);
    // prefer longer pauses (paragraph breaks) when two candidates are similarly close
    const score = d - Math.min(sl.len, 1.0) * 0.8;
    if (d < SNAP && (!best || score < best.score)) best = {score, idx, t: sl.mid, len: sl.len, d};
  });
  if (!best) {
    console.error(`NO SILENCE near scene boundary ${i + 1} (${script.scenes[i].id}) estimate ${est.toFixed(2)}s. Not cutting blindly.`);
    process.exit(2);
  }
  used.add(best.idx);
  cuts.push({after: script.scenes[i].id, t: +best.t.toFixed(3), silence_len: +best.len.toFixed(3), est: +est.toFixed(3)});
}
for (let i = 1; i < cuts.length; i++) if (cuts[i].t <= cuts[i - 1].t) { console.error('non-monotonic cuts'); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-'));
const sr = 44100;
const mk = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args]);
const bounds = [0, ...cuts.map((c) => c.t), speechDur];
const parts = [];
const lines = [];
const addSilence = (secs, name) => { const p = path.join(tmp, name); mk(['-f', 'lavfi', '-i', `anullsrc=r=${sr}:cl=mono`, '-t', String(secs), '-c:a', 'pcm_s16le', p]); lines.push(`file '${p}'`); };
addSilence(LEAD, 'lead.wav');
const timeline = [];
let cursor = 0; // seconds in final audio, counting from 0 (lead included in first scene)
const caps = [];
script.scenes.forEach((s, i) => {
  const seg = path.join(tmp, `seg${i}.wav`);
  mk(['-ss', String(bounds[i]), '-to', String(bounds[i + 1]), '-i', rawPath, '-ar', String(sr), '-ac', '1', '-c:a', 'pcm_s16le', seg]);
  lines.push(`file '${seg}'`);
  const segDur = bounds[i + 1] - bounds[i];
  const think = s.think ?? 0;
  if (think > 0) addSilence(think, `think${i}.wav`);
  const startT = i === 0 ? 0 : cursor;
  const speechStart = i === 0 ? LEAD : cursor;
  const endT = (i === 0 ? LEAD : cursor) + segDur + think + (i === script.scenes.length - 1 ? TAIL : 0);
  timeline.push({id: s.id, start: +startT.toFixed(3), end: +endT.toFixed(3), ...(s.sim !== undefined ? {sim: s.sim} : {}), ...(think ? {think} : {})});
  // captions across the speech part only
  const capLines = s.captions && s.captions.length ? s.captions : [s.narration];
  const cw = capLines.map(words); const tcw = cw.reduce((a, b) => a + b, 0);
  let t = speechStart;
  capLines.forEach((text, j) => { const d = (segDur * cw[j]) / tcw; caps.push({start: +t.toFixed(2), end: +(t + d).toFixed(2), text}); t += d; });
  cursor = endT;
});
addSilence(TAIL, 'tail.wav');
fs.writeFileSync(path.join(tmp, 'list.txt'), lines.join('\n'));
const outAudio = path.join(root, 'video', 'public', id, 'narration.mp3');
mk(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c:a', 'libmp3lame', '-q:a', '2', '-ar', String(sr), '-ac', '1', outAudio]);
const total = dur(outAudio);

const tl = {n: script.n, title: script.title, ...(script.tag ? {tag: script.tag} : {}), ...(script.kicker ? {kicker: script.kicker} : {}), fullTitle: script.fullTitle ?? script.title, slug: script.slug, hero: script.hero ?? {scene: timeline[1]?.id ?? timeline[0].id, t: 3}, audio: `${id}/narration.mp3`, duration: +total.toFixed(2), scenes: timeline, captions: caps};
fs.mkdirSync(path.join(root, 'video', 'src', 'episodes', id), {recursive: true});
fs.writeFileSync(path.join(root, 'video', 'src', 'episodes', id, 'timeline.json'), JSON.stringify(tl, null, 2));
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = Math.floor(x % 60), ms = Math.round((x - Math.floor(x)) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`; };
fs.writeFileSync(path.join(root, 'episodes', id, 'captions.srt'), caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
fs.writeFileSync(path.join(root, 'episodes', id, 'audio-splice.json'), JSON.stringify({raw_duration_s: +speechDur.toFixed(3), final_duration_s: +total.toFixed(3), lead_s: LEAD, tail_s: TAIL, cuts, think_inserted_s: script.scenes.filter((s) => s.think).map((s) => ({scene: s.id, seconds: s.think}))}, null, 2));
fs.rmSync(tmp, {recursive: true, force: true});
console.log(JSON.stringify({id, raw: +speechDur.toFixed(2), final: +total.toFixed(2), scenes: timeline.length, cuts: cuts.length}));
