#!/usr/bin/env node
// One command from a finished episode to a private YouTube upload.
//
//   node tools/ship.mjs --series ../ffmpeg-reality-checks ff01              # tests, narrate, render, collect
//   node tools/ship.mjs --series ../ffmpeg-reality-checks ff01 --upload     # ... then upload PRIVATE and add to the playlist
//   node tools/ship.mjs --series ../ffmpeg-reality-checks ff01 --publish --confirm-public   # make it public (after you review it)
//
// A series repo keeps its own content (series.json, episodes/<id>/script.json, fixture, tests, video/Scenes.tsx,
// video/index.tsx, content/distribution.md). This engine supplies the renderer, the narration and the uploader.
// Nothing becomes public without --publish AND --confirm-public. Secrets are only ever read from the environment.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {engineRoot} from './lib.mjs';
import {narrate} from './narrate.mjs';
import {makeChapters, applyChapters} from './chapters.mjs';

export function parseShipArgs(argv) {
  const o = {series: null, id: null, upload: false, publish: false, confirmPublic: false, skipTests: false, forceNarration: false, dryRun: false, concurrency: '2', stills: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--series') o.series = argv[++i];
    else if (a === '--upload') o.upload = true;
    else if (a === '--publish') o.publish = true;
    else if (a === '--confirm-public') o.confirmPublic = true;
    else if (a === '--skip-tests') o.skipTests = true;
    else if (a === '--force-narration') o.forceNarration = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--stills') o.stills = true;
    else if (a === '--concurrency') o.concurrency = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else if (!o.id) o.id = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  if (!o.series || !o.id) throw new Error('usage: node tools/ship.mjs --series <series repo> <id> [--upload] [--publish --confirm-public] [--stills] [--skip-tests] [--dry-run]');
  if (o.publish && !o.confirmPublic) throw new Error('BLOCKED: --publish makes the video public and needs --confirm-public');
  return o;
}

const node = process.execPath;
function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {stdio: 'inherit', ...opts, shell: false});
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${args.slice(0, 3).join(' ')} failed (exit ${r.status ?? r.signal})`);
}
const steps = [];
async function step(name, fn) {
  const t0 = Date.now();
  process.stdout.write(`\n[${steps.length + 1}] ${name}\n`);
  const out = await fn();
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  steps.push({name, seconds: +s});
  console.log(`    done in ${s}s`);
  return out;
}

export async function ship(o) {
  const seriesDir = path.resolve(o.series);
  const cfgPath = path.join(seriesDir, 'series.json');
  if (!fs.existsSync(cfgPath)) throw new Error(`${cfgPath} not found: a series repo needs a series.json`);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const id = o.id;
  if (!new RegExp(`^${cfg.idPrefix}\\d\\d$`).test(id)) throw new Error(`id ${id} does not match this series (prefix "${cfg.idPrefix}", for example ${cfg.idPrefix}01)`);
  const epDir = path.join(seriesDir, 'episodes', id);
  for (const f of ['script.json', 'video/Scenes.tsx', 'video/index.tsx', 'content/distribution.md']) {
    if (!fs.existsSync(path.join(epDir, f))) throw new Error(`missing ${path.join('episodes', id, f)} in the series repo`);
  }
  const E = (...p) => path.join(engineRoot, ...p);
  console.log(`${cfg.name} / ${id}  (${o.publish ? 'PUBLISH' : o.upload ? 'upload private' : 'build only'}${o.dryRun ? ', dry run' : ''})`);

  if (!o.skipTests) {
    await step('series tests', () => {
      const dir = path.join(epDir, 'test');
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.test\.m?js$/.test(f)).map((f) => path.join('episodes', id, 'test', f)) : [];
      if (!files.length) throw new Error(`no tests found in episodes/${id}/test: every episode ships with tests`);
      if (!o.dryRun) sh(node, ['--test', ...files], {cwd: seriesDir});
    });
  }

  if (!o.stills && !o.publish) {
    await step('narration', () => narrate({seriesDir, id, force: o.forceNarration, dryRun: o.dryRun}));
  }

  if (!o.publish) {
    await step('sync into the render engine', () => {
      const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf8'));
      script.series = cfg.name;
      fs.mkdirSync(E('episodes', id), {recursive: true});
      fs.writeFileSync(E('episodes', id, 'script.json'), JSON.stringify(script, null, 2));
      fs.mkdirSync(E('video', 'src', 'episodes', id), {recursive: true});
      for (const f of ['Scenes.tsx', 'index.tsx']) fs.copyFileSync(path.join(epDir, 'video', f), E('video', 'src', 'episodes', id, f));
      const mp3 = path.join(epDir, 'narration.mp3');
      if (fs.existsSync(mp3)) { fs.mkdirSync(E('video', 'public', id), {recursive: true}); fs.copyFileSync(mp3, E('video', 'public', id, 'narration.mp3')); }
      else console.log('    no narration.mp3 yet: timings are estimated and the render is silent (fine for --stills)');
    });

    await step('timeline, captions, chapters', () => {
      sh(node, [E('tools', 'build-timeline.mjs'), id], {cwd: engineRoot});
      const tl = JSON.parse(fs.readFileSync(E('video', 'src', 'episodes', id, 'timeline.json'), 'utf8'));
      const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf8'));
      const lines = makeChapters(tl, script);
      if (!o.dryRun) applyChapters(path.join(epDir, 'content', 'distribution.md'), lines);
      console.log(`    chapters: ${lines.join(' | ')}${tl.audio ? '' : '  (estimated timing: no narration yet)'}`);
    });

    if (o.stills) {
      await step('QA stills (one per scene)', () => {
        sh(node, [E('tools', 'gen-root.mjs'), id], {cwd: engineRoot});
        try { sh(node, [E('tools', 'qa-stills.mjs'), id], {cwd: engineRoot}); } finally { sh(node, [E('tools', 'gen-root.mjs')], {cwd: engineRoot}); }
        fs.cpSync(E('episodes', id, 'qa'), path.join(epDir, 'qa'), {recursive: true});
        console.log(`    stills copied to ${path.join(epDir, 'qa')}`);
      });
      return {id, stills: true, steps};
    }

    if (!o.dryRun) {
      await step('render (video, hero, thumbnail, frames)', () => {
        sh(node, [E('tools', 'gen-root.mjs'), id], {cwd: engineRoot});
        try { sh(node, [E('tools', 'render.mjs'), id, '--concurrency', o.concurrency], {cwd: engineRoot}); } finally { sh(node, [E('tools', 'gen-root.mjs')], {cwd: engineRoot}); }
      });
      await step('collect outputs into the series repo', () => {
        for (const f of [`${id}.mp4`, 'thumbnail.png', 'hero.png', 'captions.srt', 'render-evidence.json']) fs.copyFileSync(E('episodes', id, f), path.join(epDir, f));
        fs.cpSync(E('episodes', id, 'frames'), path.join(epDir, 'frames'), {recursive: true});
        const ev = JSON.parse(fs.readFileSync(path.join(epDir, 'render-evidence.json'), 'utf8'));
        console.log(`    ${id}.mp4  ${(ev.bytes / 1e6).toFixed(1)} MB  ${ev.duration_s}s (expected ${ev.expected_duration_s}s)  ${ev.video?.width}x${ev.video?.height}`);
        if (Math.abs(ev.duration_s - ev.expected_duration_s) > 0.5) throw new Error('rendered duration differs from the timeline by more than 0.5s');
      });
    }
  }

  if (o.upload || o.publish) {
    const args = [E('tools', 'youtube-upload.mjs'), '--root', seriesDir, '--ids', id, '--playlist'];
    // a dry run never sends anything: the uploader prints its plan and stops
    if (o.upload && !o.dryRun) args.push('--upload');
    if (o.publish && !o.dryRun) args.push('--publish', '--confirm-public');
    await step(o.publish ? 'make public' : o.dryRun ? 'upload plan (dry run)' : 'upload (private) and add to the playlist', () => sh(node, args, {cwd: engineRoot, env: process.env}));
  }
  return {id, steps};
}

const norm = (p) => fs.realpathSync(path.resolve(p));
if (process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url))) {
  ship(parseShipArgs(process.argv.slice(2))).then((r) => console.log(`\nshipped ${r.id}: ${r.steps.map((s) => `${s.name} ${s.seconds}s`).join(' | ')}`)).catch((e) => { console.error(`\nSTOPPED: ${e.message}`); process.exit(1); });
}
