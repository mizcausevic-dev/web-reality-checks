#!/usr/bin/env node
// Independent verification pass: probes every MP4 with ffprobe (not the render script's own numbers),
// checks deliverable files exist, and runs every fixture test suite. Writes VERIFICATION.md + verification.json.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const eps = fs.readdirSync(path.join(root, 'episodes')).filter((d) => /^ep\d\d$/.test(d)).sort();
const rows = [];
for (const ep of eps) {
  const d = path.join(root, 'episodes', ep);
  const mp4 = path.join(d, `${ep}.mp4`);
  const r = {ep};
  if (fs.existsSync(mp4)) {
    const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]).toString());
    const v = p.streams.find((s) => s.codec_type === 'video'); const a = p.streams.find((s) => s.codec_type === 'audio');
    r.mp4 = {bytes: fs.statSync(mp4).size, duration_s: +(+p.format.duration).toFixed(2), video: `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt}`, audio: a ? `${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : 'none'};
    r.mp4.ok = v.codec_name === 'h264' && v.width === 1920 && v.height === 1080 && v.r_frame_rate === '30/1' && v.pix_fmt === 'yuv420p' && a?.codec_name === 'aac' && r.mp4.duration_s >= 90 && r.mp4.duration_s <= 122;
  } else r.mp4 = null;
  const tl = path.join(root, 'video', 'src', 'episodes', ep, 'timeline.json');
  r.narration = fs.existsSync(path.join(root, 'video', 'public', ep, 'narration.mp3')) && JSON.parse(fs.readFileSync(tl, 'utf8')).audio != null;
  r.files = Object.fromEntries(['captions.srt', 'thumbnail.png', 'hero.png', 'README.md', 'script.json', 'render-evidence.json', 'content/article-technical.md', 'content/article-business.md', 'content/article-layman.md', 'content/distribution.md'].map((f) => [f, fs.existsSync(path.join(d, f))]));
  if (r.files['thumbnail.png']) { const s = execFileSync('python3', ['-c', `from PIL import Image;im=Image.open('${path.join(d, 'thumbnail.png')}');print(im.size[0],im.size[1])`]).toString().trim(); r.thumb = s; }
  const fx = fs.readdirSync(path.join(root, 'fixtures')).find((f) => f.startsWith(ep + '-'));
  if (fx) {
    const t = spawnSync('node', ['--test', 'test.mjs'], {cwd: path.join(root, 'fixtures', fx), encoding: 'utf8', timeout: 240000});
    const out = (t.stdout || '') + (t.stderr || '');
    const pass = +(out.match(/^# pass (\d+)/m)?.[1] ?? -1), fail = +(out.match(/^# fail (\d+)/m)?.[1] ?? -1);
    r.tests = {fixture: fx, pass, fail, exit: t.status};
  }
  rows.push(r);
  console.log(ep, r.mp4 ? `${r.mp4.duration_s}s ${r.mp4.ok ? 'OK' : 'CHECK'}` : 'NO MP4', r.narration ? 'narrated' : 'silent', r.tests ? `tests ${r.tests.pass}/${r.tests.pass + r.tests.fail}` : 'no tests', r.thumb);
}
fs.writeFileSync(path.join(root, 'verification.json'), JSON.stringify({generatedAt: new Date().toISOString(), rows}, null, 2));
const md = ['# Verification (independent pass)', '', `Generated ${new Date().toISOString()} by tools/verify-all.mjs: ffprobe on every MP4, file existence, and every fixture test suite re-run.`, '', '| Ep | MP4 | Duration s | Video | Audio | Narration | Tests | Thumb | Captions | Hero | Content |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.ep} | ${r.mp4 ? (r.mp4.ok ? 'OK' : 'CHECK') : 'missing'} | ${r.mp4?.duration_s ?? ''} | ${r.mp4?.video ?? ''} | ${r.mp4?.audio ?? ''} | ${r.narration ? 'yes' : 'no'} | ${r.tests ? `${r.tests.pass}/${r.tests.pass + r.tests.fail}` : 'n/a'} | ${r.thumb ?? ''} | ${r.files['captions.srt'] ? 'yes' : 'no'} | ${r.files['hero.png'] ? 'yes' : 'no'} | ${Object.entries(r.files).filter(([k]) => k.startsWith('content/')).every(([, v]) => v) ? '4/4' : 'partial'} |`)];
fs.writeFileSync(path.join(root, 'VERIFICATION.md'), md.join('\n') + '\n');
