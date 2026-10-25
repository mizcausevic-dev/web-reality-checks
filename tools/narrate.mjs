#!/usr/bin/env node
// Narrates an episode with the ElevenLabs REST API and saves narration.mp3 next to the episode's script.
//
//   node tools/narrate.mjs --series ../ffmpeg-reality-checks ff01 [--force] [--dry-run]
//
// Reads the key from the ELEVENLABS_API_KEY environment variable and never prints it. Voice and model come from
// series.json ("narration": {"voiceId", "model"}). A narration.json next to the mp3 records a hash of the text,
// voice and model, so an unchanged script is never re-narrated (re-narrating spends credits).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const LOOPBACK = new Set(['127.0.0.1', 'localhost']);
// The endpoint may be overridden for tests, but only to loopback or the real host, so the key cannot be sent elsewhere.
function apiBase() {
  const v = process.env.ELEVENLABS_API_BASE;
  if (!v) return 'https://api.elevenlabs.io';
  const u = new URL(v);
  if (!(LOOPBACK.has(u.hostname) || u.hostname === 'api.elevenlabs.io')) throw new Error('ELEVENLABS_API_BASE must point to loopback or api.elevenlabs.io');
  return v.replace(/\/$/, '');
}

export const narrationText = (script) => script.scenes.map((s) => s.narration.trim()).join('\n\n');
export const narrationHash = (text, voiceId, model) => crypto.createHash('sha256').update(JSON.stringify({text, voiceId, model})).digest('hex');

export async function narrate({seriesDir, id, force = false, dryRun = false, log = console.log}) {
  const cfg = JSON.parse(fs.readFileSync(path.join(seriesDir, 'series.json'), 'utf8'));
  const {voiceId, model} = cfg.narration ?? {};
  if (!voiceId || !model) throw new Error('series.json needs "narration": {"voiceId", "model"}');
  const dir = path.join(seriesDir, 'episodes', id);
  const script = JSON.parse(fs.readFileSync(path.join(dir, 'script.json'), 'utf8'));
  const text = narrationText(script);
  const hash = narrationHash(text, voiceId, model);
  const mp3 = path.join(dir, 'narration.mp3');
  const meta = path.join(dir, 'narration.json');
  const prev = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null;
  if (!force && prev?.hash === hash && fs.existsSync(mp3)) {
    log(`narration up to date (${prev.duration_s}s, ${prev.characters} characters); no credits spent`);
    return {mp3, reused: true, ...prev};
  }
  if (dryRun) { log(`would narrate ${text.length} characters with voice ${voiceId}, model ${model}`); return {mp3, dryRun: true}; }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Blocked: set the ELEVENLABS_API_KEY environment variable');

  const base = apiBase();
  const r = await fetch(`${base}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg'},
    body: JSON.stringify({text, model_id: model}),
  });
  if (!r.ok) {
    let detail = '';
    try { detail = JSON.stringify((await r.json()).detail ?? ''); } catch { /* not JSON */ }
    let hint = '';
    if (r.status === 400 || r.status === 404 || r.status === 422) {
      try {
        const m = await fetch(`${base}/v1/models`, {headers: {'xi-api-key': key}});
        if (m.ok) hint = ` Models this key can use: ${(await m.json()).map((x) => x.model_id).join(', ')}.`;
      } catch { /* hint is optional */ }
    }
    throw new Error(`ElevenLabs returned HTTP ${r.status} ${detail.slice(0, 300)}.${hint}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) throw new Error(`narration is only ${buf.length} bytes; refusing to save it`);
  fs.writeFileSync(mp3, buf);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());
  const record = {hash, voiceId, model, characters: text.length, bytes: buf.length, duration_s: +dur.toFixed(2), createdAt: new Date().toISOString()};
  fs.writeFileSync(meta, JSON.stringify(record, null, 2));
  log(`narrated ${record.characters} characters -> ${record.duration_s}s, ${record.bytes} bytes`);
  return {mp3, reused: false, ...record};
}

const norm = (p) => fs.realpathSync(path.resolve(p));
if (process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url))) {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null; };
  const id = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--series');
  if (!get('--series') || !id) { console.error('usage: node tools/narrate.mjs --series <dir> <id> [--force] [--dry-run]'); process.exit(1); }
  narrate({seriesDir: path.resolve(get('--series')), id, force: a.includes('--force'), dryRun: a.includes('--dry-run')}).catch((e) => { console.error(e.message); process.exit(1); });
}
