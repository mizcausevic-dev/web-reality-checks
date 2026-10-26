// Regression tests for tools/youtube-upload.mjs against a local mock of the YouTube API.
// No network, no real credentials: the environment values below are fake test strings.
// Run: node --test tools/youtube-upload.test.mjs
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sanitize, tagBudget, fitTags, parseDistribution, validate, buildFilm, footerFor, expandIds, parseArgs, LIMITS} from './youtube-upload.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'tools', 'youtube-upload.mjs');
let srv, base, log, tmp, dropFirstPut, dropped = 0;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ytu-'));
  log = [];
  dropFirstPut = false;
  let received = 0;
  srv = http.createServer((req, res) => {
    const chunks = [];
    const u = new URL(req.url, 'http://x');
    req.on('data', (c) => {
      chunks.push(c);
      if (u.pathname !== '/session/1') return;
      received += c.length;
      if (dropFirstPut && req.headers['content-range'] === undefined && received > 50000) { dropFirstPut = false; dropped++; req.destroy(); res.destroy(); }
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      log.push({m: req.method, p: u.pathname + u.search, h: req.headers, n: body.length, json: /json/.test(req.headers['content-type'] ?? '') ? safeJson(body) : null});
      const j = (code, o, h = {}) => { res.writeHead(code, {'Content-Type': 'application/json', ...h}); res.end(JSON.stringify(o)); };
      if (u.pathname === '/youtube/v3/videos' && req.method === 'PUT') return j(200, {id: 'VID_TEST'});
      if (u.pathname === '/youtube/v3/channels') return j(200, {items: [{id: 'UC_TEST', snippet: {title: 'KG Test', customUrl: '@KGTest'}}]});
      if (u.pathname === '/token') return j(200, {access_token: 'fake-access', refresh_token: 'fake-refresh-from-code'});
      if (u.pathname === '/upload/youtube/v3/videos') return j(200, {}, {Location: `${base}/session/1`});
      if (u.pathname === '/session/1') {
        const cr = req.headers['content-range'] ?? '';
        if (cr.startsWith('bytes */')) return res.writeHead(308, {Range: `bytes=0-${received - 1}`}).end();
        return j(200, {id: 'vid_TEST1'});
      }
      if (u.pathname === '/upload/youtube/v3/thumbnails/set') return j(200, {});
      if (u.pathname === '/youtube/v3/playlists' && req.method === 'GET') return j(200, {items: []});
      if (u.pathname === '/youtube/v3/playlists') return j(200, {id: 'PL_TEST'});
      if (u.pathname === '/youtube/v3/playlistItems') return j(200, {id: 'PLI_TEST'});
      if (u.pathname === '/upload/youtube/v3/captions') return j(200, {id: 'CAP_TEST'});
      j(404, {error: {message: 'not found'}});
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(() => { srv.close(); fs.rmSync(tmp, {recursive: true, force: true}); });
const safeJson = (b) => { try { return JSON.parse(b.toString()); } catch { return null; } };
const env = (extra = {}) => ({...process.env, YOUTUBE_CLIENT_ID: 'test-client-id', YOUTUBE_CLIENT_SECRET: 'test-client-secret', YOUTUBE_REFRESH_TOKEN: 'test-refresh-token',
  YOUTUBE_API_BASE: base, YOUTUBE_TOKEN_URL: `${base}/token`, YOUTUBE_STATE_FILE: path.join(tmp, 'state.json'), YOUTUBE_NO_BROWSER: '1', ...extra});
// Async on purpose: the mock server lives in this process, so a blocking spawnSync would deadlock it.
const run = (args, e = env()) => new Promise((resolve) => {
  const c = spawn('node', [CLI, ...args], {env: e, cwd: tmp});
  let stdout = '', stderr = '';
  c.stdout.on('data', (d) => (stdout += d)); c.stderr.on('data', (d) => (stderr += d));
  c.on('close', (status) => resolve({status, stdout, stderr}));
});

test('sanitize removes < > and blockquote markers', () => {
  assert.equal(sanitize('> quoted <b>line</b>\nplain'), 'quoted bline/b\nplain');
});

test('tag budget counts commas and the quotes YouTube adds around tags with spaces', () => {
  assert.equal(tagBudget(['a', 'b c']), 1 + 3 + 2 + 1);
  const long = Array.from({length: 60}, (_, i) => `tag number ${i}`);
  const {kept, dropped} = fitTags(long);
  assert.ok(tagBudget(kept) <= LIMITS.tagsChars);
  assert.equal(kept.length + dropped.length, 60);
});

test('parseDistribution reads title, description, tags and pinned comment from the real ep15 kit', () => {
  const p = parseDistribution(fs.readFileSync(path.join(ROOT, 'episodes/ep15/content/distribution.md'), 'utf8'));
  assert.equal(p.title, 'You Clicked Pay Once. Why Did the App Create Two Orders?');
  assert.match(p.description, /^One tap on Pay\./);
  assert.match(p.description, /00:00 One tap, two orders/);
  assert.equal(p.tags.length, 20);
  assert.match(p.pinned, /^Everything here runs/);
});

test('every episode kit validates: limits respected, no forbidden characters, files present', () => {
  for (const id of expandIds('all')) {
    const f = buildFilm(id);
    assert.deepEqual(f.violations, [], `${id}: ${f.violations.join('; ')}`);
    assert.ok(!/[<>]/.test(f.description), `${id} description has < or >`);
    assert.ok(tagBudget(f.tags) <= LIMITS.tagsChars, `${id} tag budget`);
  }
});

test('known-positive control: validate() really flags bad copy', () => {
  assert.ok(validate({title: 'x'.repeat(101), description: 'ok', tags: ['a']}).some((s) => /title/.test(s)));
  assert.ok(validate({title: 'ok', description: 'a > b', tags: ['a']}).includes('contains < or >'));
  assert.ok(validate({title: 'ok', description: 'é'.repeat(2600), tags: ['a']}).some((s) => /bytes/.test(s)));
});

test('arguments: public needs --confirm-public; ids expand; defaults are private and dry', () => {
  assert.equal(parseArgs([]).privacy, 'private');
  assert.equal(parseArgs([]).upload, false);
  assert.throws(() => parseArgs(['--upload', '--privacy', 'public']), /confirm-public/);
  assert.equal(parseArgs(['--upload', '--privacy', 'public', '--confirm-public']).privacy, 'public');
  assert.deepEqual(expandIds('ep03..ep05,series'), ['ep03', 'ep04', 'ep05', 'series']);
});

test('dry run sends nothing to the API', async () => {
  log.length = 0;
  const r = await run(['--ids', 'ep15']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY RUN/);
  assert.equal(log.length, 0);
});

test('--upload without --ids is refused', async () => {
  const r = await run(['--upload']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--ids/);
});

test('missing credentials are reported by variable NAME only', async () => {
  const e = env(); delete e.YOUTUBE_REFRESH_TOKEN;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest'], e);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /YOUTUBE_REFRESH_TOKEN/);
  assert.ok(!r.stderr.includes('test-client-secret'));
});

test('upload survives a dropped connection by resuming, sets thumbnail, playlist and captions, and never prints secrets', async () => {
  fs.rmSync(path.join(tmp, 'state.json'), {force: true});
  log.length = 0;
  dropFirstPut = true;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest', '--playlist', '--captions']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /ep15 uploaded \(private\): https:\/\/youtu\.be\/vid_TEST1/);
  const init = log.find((x) => x.p.startsWith('/upload/youtube/v3/videos'));
  assert.equal(init.json.status.privacyStatus, 'private');
  assert.equal(init.json.status.selfDeclaredMadeForKids, false);
  assert.equal(init.json.snippet.categoryId, '28');
  assert.equal(init.h['x-upload-content-type'], 'video/mp4');
  const puts = log.filter((x) => x.p === '/session/1');
  assert.equal(dropped, 1, 'the first PUT was cut mid-transfer');
  assert.ok(puts.length >= 2, 'status query and resumed PUT (the dropped request never completes, so it is not logged)');
  assert.ok(puts.some((x) => (x.h['content-range'] ?? '').startsWith('bytes */')));
  assert.ok(puts.at(-1).h['content-range'], 'final PUT resumes with a Content-Range');
  assert.ok(log.some((x) => x.p.startsWith('/upload/youtube/v3/thumbnails/set?videoId=vid_TEST1')));
  assert.ok(log.some((x) => x.p.startsWith('/youtube/v3/playlists')));
  assert.equal(log.find((x) => x.p.startsWith('/youtube/v3/playlistItems')).json.snippet.resourceId.videoId, 'vid_TEST1');
  assert.ok(log.some((x) => x.p.startsWith('/upload/youtube/v3/captions')));
  for (const secret of ['test-client-secret', 'test-refresh-token', 'fake-access']) { assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret), `leaked ${secret}`); }
  const saved = fs.readFileSync(path.join(tmp, 'state.json'), 'utf8');
  for (const secret of ['test-client-secret', 'test-refresh-token', 'fake-access']) assert.ok(!saved.includes(secret));
});

test('rerun does not upload the same video twice (idempotent)', async () => {
  log.length = 0;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest', '--playlist', '--captions']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /already uploaded/);
  assert.equal(log.filter((x) => x.p.startsWith('/upload/youtube/v3/videos')).length, 0);
  assert.equal(log.filter((x) => x.p.includes('thumbnails')).length, 0);
});

test('quota budget stops before the step that would exceed it, and saves progress', async () => {
  fs.rmSync(path.join(tmp, 'state.json'), {force: true});
  log.length = 0;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest', '--playlist', '--captions', '--max-units', '60']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Quota budget 60 reached/);
  assert.ok(log.some((x) => x.p.includes('thumbnails')));
  assert.ok(!log.some((x) => x.p.startsWith('/upload/youtube/v3/captions')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'state.json'), 'utf8')).films.ep15.videoId, 'vid_TEST1');
});

test('endpoint override to a non-Google, non-loopback host is rejected (token exfiltration guard)', async () => {
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest'], env({YOUTUBE_API_BASE: 'https://evil.example.com'}));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /must point to loopback/);
});

test('--auth: PKCE loopback flow exchanges the code and prints the refresh token once', async () => {
  log.length = 0;
  const child = spawn('node', [CLI, '--auth'], {env: env(), cwd: tmp});
  let out = '', cerr = '';
  child.stderr.on('data', (d) => (cerr += d));
  const redirected = new Promise((resolve) => child.stdout.on('data', async (d) => {
    out += d;
    const m = out.match(/https:\/\/accounts\.google\.com\/\S+/);
    if (m && !out.includes('__sent')) {
      out += '__sent';
      const u = new URL(m[0]);
      assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
      assert.equal(u.searchParams.get('access_type'), 'offline');
      assert.match(u.searchParams.get('scope'), /youtube\.upload/);
      assert.ok(!u.toString().includes('test-client-secret'), 'client secret must not be in the consent URL');
      await fetch(`${u.searchParams.get('redirect_uri')}/?code=fake-code&state=${u.searchParams.get('state')}`);
      resolve();
    }
  }));
  await redirected;
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 0, cerr);
  assert.match(out, /fake-refresh-from-code/);
  const exch = log.find((x) => x.p === '/token');
  assert.ok(exch, 'token exchange happened');
});

test('--auth rejects a state mismatch', async () => {
  const child = spawn('node', [CLI, '--auth'], {env: env(), cwd: tmp});
  let out = '', err = '';
  child.stderr.on('data', (d) => (err += d));
  child.stdout.on('data', async (d) => {
    out += d;
    const m = out.match(/https:\/\/accounts\.google\.com\/\S+/);
    if (m && !out.includes('__sent')) { out += '__sent'; const u = new URL(m[0]); await fetch(`${u.searchParams.get('redirect_uri')}/?code=fake&state=WRONG`); }
  });
  const code = await new Promise((r) => child.on('close', r));
  assert.notEqual(code, 0);
  assert.match(err, /state mismatch/);
});

test('--upload without --expect-channel is refused', async () => {
  const r = await run(['--ids', 'ep15', '--upload']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /expect-channel/);
});

test('wrong channel: upload is blocked before anything is sent', async () => {
  const before = log.length;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@someoneelse']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /expected @someoneelse/);
  assert.equal(log.slice(before).filter((e) => /upload\/youtube/.test(e.p)).length, 0);
});

test('--whoami prints the channel the token uploads to', async () => {
  const r = await run(['--whoami']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /KG Test \(@kgtest\)/);
});

test('--title-suffix appends hashtags within the 100 character limit for every episode', () => {
  for (let i = 1; i <= 30; i++) {
    const f = buildFilm(`ep${String(i).padStart(2, '0')}`, {titleSuffix: '#WebRealityChecks #webdev'});
    assert.ok(f.title.endsWith(' #WebRealityChecks #webdev'), f.id);
    assert.ok([...f.title].length <= 100, `${f.id} title too long`);
    assert.equal(f.violations.length, 0, `${f.id}: ${f.violations}`);
  }
});

test('--retitle sends the FULL snippet (videos.update replaces it) and only once', async () => {
  fs.rmSync(path.join(tmp, 'state.json'), {force: true});
  await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest']);
  const before = log.length;
  const r = await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest', '--retitle', '--title-suffix', '#WebRealityChecks #webdev']);
  assert.equal(r.status, 0, r.stderr);
  const puts = log.slice(before).filter((e) => e.m === 'PUT' && e.p.startsWith('/youtube/v3/videos'));
  assert.equal(puts.length, 1);
  const sn = puts[0].json.snippet;
  assert.ok(sn.title.endsWith('#WebRealityChecks #webdev'));
  assert.ok(sn.description.length > 100 && sn.tags.length > 5 && sn.categoryId === '28', 'snippet must be complete');
  const again = log.length;
  await run(['--ids', 'ep15', '--upload', '--expect-channel', '@kgtest', '--retitle', '--title-suffix', '#WebRealityChecks #webdev']);
  assert.equal(log.slice(again).filter((e) => e.m === 'PUT' && e.p.startsWith('/youtube/v3/videos')).length, 0, 'second run must not update again');
});

test('--publish needs --confirm-public, sets public with the full status object, then the playlist, and only once', async () => {
  fs.rmSync(path.join(tmp, 'state.json'), {force: true});
  const base1 = ['--ids', 'ep15', '--expect-channel', '@kgtest'];
  await run([...base1, '--upload', '--playlist']);
  const refused = await run([...base1, '--publish']);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /confirm-public/);
  const before = log.length;
  const r = await run([...base1, '--publish', '--confirm-public']);
  assert.equal(r.status, 0, r.stderr);
  const seen = log.slice(before);
  const vid = seen.filter((e) => e.m === 'PUT' && e.p.startsWith('/youtube/v3/videos'));
  assert.equal(vid.length, 1);
  assert.deepEqual(vid[0].json.status, {privacyStatus: 'public', selfDeclaredMadeForKids: false});
  const pl = seen.filter((e) => e.m === 'PUT' && e.p.startsWith('/youtube/v3/playlists'));
  assert.equal(pl.length, 1);
  assert.equal(pl[0].json.status.privacyStatus, 'public');
  assert.ok(pl[0].json.snippet.title, 'playlist update must resend its title');
  const again = log.length;
  await run([...base1, '--publish', '--confirm-public']);
  assert.equal(log.slice(again).filter((e) => e.m === 'PUT').length, 0, 'second run must change nothing');
});

test('--publish on a film that was never uploaded is refused', async () => {
  fs.rmSync(path.join(tmp, 'state.json'), {force: true});
  const r = await run(['--ids', 'ep15', '--publish', '--confirm-public', '--expect-channel', '@kgtest']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not uploaded yet/);
});

test('--root with series.json: another series repo uploads with its own playlist, hashtags and channel default', async () => {
  const sr = fs.mkdtempSync(path.join(os.tmpdir(), 'series-'));
  try {
    fs.mkdirSync(path.join(sr, 'episodes', 'ff01', 'content'), {recursive: true});
    fs.copyFileSync(path.join(ROOT, 'episodes', 'ep15', 'content', 'distribution.md'), path.join(sr, 'episodes', 'ff01', 'content', 'distribution.md'));
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'ff01.mp4'), Buffer.alloc(2048, 1));
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'thumbnail.png'), Buffer.alloc(256, 2));
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'captions.srt'), '1\n00:00:00,000 --> 00:00:01,000\nHi\n');
    fs.writeFileSync(path.join(sr, 'series.json'), JSON.stringify({name: 'FFmpeg Reality Checks', hashtags: '#FFmpeg #video', playlistTitle: 'FFmpeg Reality Checks: Test Playlist', playlistDescription: 'A test playlist.', channel: '@KGTest', category: 28}));
    const st = path.join(tmp, 'series-state.json');
    log.length = 0;
    const r = await run(['--root', sr, '--ids', 'ff01', '--upload', '--playlist'], env({YOUTUBE_STATE_FILE: st}));
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const vid = log.find((l) => l.p.startsWith('/upload/youtube/v3/videos') && l.json);
    assert.ok(vid.json.snippet.title.endsWith('#FFmpeg #video'), 'hashtags come from series.json');
    const pl = log.find((l) => l.p.startsWith('/youtube/v3/playlists?') && l.m === 'POST');
    assert.equal(pl.json.snippet.title, 'FFmpeg Reality Checks: Test Playlist');
    assert.equal(pl.json.status.privacyStatus, 'private');
    assert.equal(JSON.parse(fs.readFileSync(st, 'utf8')).films.ff01.videoId, 'vid_TEST1');
    const bad = await run(['--root', sr, '--ids', 'ff01', '--upload', '--expect-channel', '@Someone'], env({YOUTUBE_STATE_FILE: path.join(tmp, 'series-state2.json')}));
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /BLOCKED: token belongs to/);
  } finally { fs.rmSync(sr, {recursive: true, force: true}); }
});

test('ids: two-letter prefixes and ranges expand, a bad id is refused', () => {
  assert.deepEqual(expandIds('ff01..ff03'), ['ff01', 'ff02', 'ff03']);
  assert.deepEqual(expandIds('ep29..ep30,series'), ['ep29', 'ep30', 'series']);
  assert.throws(() => buildFilm('x1'), /unsupported id/);
});

test('--retitle re-sends the snippet when only the description changed, and only once', async () => {
  const sr = fs.mkdtempSync(path.join(os.tmpdir(), 'series-'));
  try {
    const dp = path.join(sr, 'episodes', 'ff01', 'content', 'distribution.md');
    fs.mkdirSync(path.dirname(dp), {recursive: true});
    const md = fs.readFileSync(path.join(ROOT, 'episodes', 'ep15', 'content', 'distribution.md'), 'utf8');
    fs.writeFileSync(dp, md);
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'ff01.mp4'), Buffer.alloc(2048, 1));
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'thumbnail.png'), Buffer.alloc(256, 2));
    fs.writeFileSync(path.join(sr, 'episodes', 'ff01', 'captions.srt'), '1\n00:00:00,000 --> 00:00:01,000\nHi\n');
    const st = path.join(tmp, 'series-state3.json');
    const base = ['--root', sr, '--ids', 'ff01', '--upload', '--retitle', '--expect-channel', '@KGTest'];
    assert.equal((await run(base, env({YOUTUBE_STATE_FILE: st}))).status, 0);
    log.length = 0;
    assert.equal((await run(base, env({YOUTUBE_STATE_FILE: st}))).status, 0);
    assert.equal(log.filter((l) => l.m === 'PUT' && l.p.startsWith('/youtube/v3/videos')).length, 0, 'unchanged copy sends nothing');
    fs.writeFileSync(dp, md.replace('One tap on Pay.', 'One tap on Pay, edited.'));
    log.length = 0;
    const r = await run(base, env({YOUTUBE_STATE_FILE: st}));
    assert.equal(r.status, 0, r.stderr);
    const puts = log.filter((l) => l.m === 'PUT' && l.p.startsWith('/youtube/v3/videos'));
    assert.equal(puts.length, 1);
    assert.match(puts[0].json.snippet.description, /edited/);
    assert.ok(puts[0].json.snippet.title && puts[0].json.snippet.tags.length && puts[0].json.snippet.categoryId, 'full snippet is re-sent');
    log.length = 0;
    await run(base, env({YOUTUBE_STATE_FILE: st}));
    assert.equal(log.filter((l) => l.m === 'PUT' && l.p.startsWith('/youtube/v3/videos')).length, 0);
  } finally { fs.rmSync(sr, {recursive: true, force: true}); }
});

test('footer: site link, playlist and only already-uploaded related films; none without config', () => {
  const cfg = {footer: {site: 'https://kineticgain.com', related: {ep15: ['ep01', 'ep02']}}};
  const state = {playlistId: 'PLX', films: {ep01: {videoId: 'AAAAAAAAAAA'}}};
  const f = footerFor('ep15', cfg, state);
  assert.match(f, /Related Reality Checks\n.*: https:\/\/youtu\.be\/AAAAAAAAAAA/);
  assert.ok(!f.includes('ep02'), 'a film that is not uploaded is skipped');
  assert.match(f, /Full series: https:\/\/www\.youtube\.com\/playlist\?list=PLX/);
  assert.match(f, /Kinetic Gain: https:\/\/kineticgain\.com$/);
  assert.equal(footerFor('ep15', {}, state), '');
  assert.ok(!/[<>]/.test(f));
});
