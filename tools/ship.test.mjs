// Tests for tools/narrate.mjs (against a local mock of ElevenLabs) and tools/ship.mjs argument handling.
// No network and no real credentials: the key below is a fake test string.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {narrationText, narrationHash} from './narrate.mjs';
import {parseShipArgs} from './ship.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'narrate.mjs');
let srv, base, tmp, mp3, calls, mode = 'ok';

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'narr-'));
  mp3 = path.join(tmp, 'tone.mp3');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-b:a', '128k', mp3]);
  assert.equal(r.status, 0, 'ffmpeg is needed for these tests');
  calls = [];
  srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      calls.push({m: req.method, p: req.url, key: req.headers['xi-api-key'], body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null});
      if (req.url.startsWith('/v1/models')) { res.writeHead(200, {'Content-Type': 'application/json'}); return res.end(JSON.stringify([{model_id: 'model_a'}, {model_id: 'model_b'}])); }
      if (mode === 'bad-model') { res.writeHead(400, {'Content-Type': 'application/json'}); return res.end(JSON.stringify({detail: {status: 'invalid_model'}})); }
      res.writeHead(200, {'Content-Type': 'audio/mpeg'}); res.end(fs.readFileSync(mp3));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(() => { srv.close(); fs.rmSync(tmp, {recursive: true, force: true}); });

function makeSeries() {
  const dir = fs.mkdtempSync(path.join(tmp, 's-'));
  fs.mkdirSync(path.join(dir, 'episodes', 'xx01'), {recursive: true});
  fs.writeFileSync(path.join(dir, 'series.json'), JSON.stringify({name: 'X', idPrefix: 'xx', narration: {voiceId: 'VOICE1', model: 'model_a'}}));
  fs.writeFileSync(path.join(dir, 'episodes', 'xx01', 'script.json'), JSON.stringify({scenes: [{id: 'a', narration: ' One. '}, {id: 'b', narration: 'Two.'}]}));
  return dir;
}
const run = (args, env = {}) => new Promise((resolve) => {
  const c = spawn('node', [CLI, ...args], {env: {...process.env, ELEVENLABS_API_BASE: base, ELEVENLABS_API_KEY: 'fake-test-key-123', ...env}});
  let stdout = '', stderr = '';
  c.stdout.on('data', (d) => (stdout += d)); c.stderr.on('data', (d) => (stderr += d));
  c.on('close', (status) => resolve({status, stdout, stderr}));
});

test('narration text joins scene narrations with blank lines; hash changes with text, voice and model', () => {
  const t = narrationText({scenes: [{narration: ' One. '}, {narration: 'Two.'}]});
  assert.equal(t, 'One.\n\nTwo.');
  const h = narrationHash(t, 'v', 'm');
  assert.notEqual(h, narrationHash(t + '!', 'v', 'm'));
  assert.notEqual(h, narrationHash(t, 'v2', 'm'));
  assert.notEqual(h, narrationHash(t, 'v', 'm2'));
});

test('narrates once, sends the key only as a header, never prints it, and does not spend credits again', async () => {
  const dir = makeSeries();
  calls.length = 0;
  const a = await run(['--series', dir, 'xx01']);
  assert.equal(a.status, 0, a.stderr);
  assert.ok(!(a.stdout + a.stderr).includes('fake-test-key-123'));
  const tts = calls.find((c) => c.p.startsWith('/v1/text-to-speech/VOICE1'));
  assert.equal(tts.key, 'fake-test-key-123');
  assert.deepEqual(tts.body, {text: 'One.\n\nTwo.', model_id: 'model_a'});
  const rec = JSON.parse(fs.readFileSync(path.join(dir, 'episodes', 'xx01', 'narration.json'), 'utf8'));
  assert.ok(rec.duration_s > 2.5 && rec.duration_s < 3.5);
  const n = calls.length;
  const b = await run(['--series', dir, 'xx01']);
  assert.equal(b.status, 0);
  assert.match(b.stdout, /no credits spent/);
  assert.equal(calls.length, n, 'a rerun with unchanged text makes no API call');
  // changing the text re-narrates; --force too
  const sp = path.join(dir, 'episodes', 'xx01', 'script.json');
  fs.writeFileSync(sp, JSON.stringify({scenes: [{id: 'a', narration: 'One changed.'}]}));
  await run(['--series', dir, 'xx01']);
  assert.ok(calls.length > n);
});

test('--dry-run sends nothing; a missing key is reported by variable name only', async () => {
  const dir = makeSeries();
  calls.length = 0;
  const d = await run(['--series', dir, 'xx01', '--dry-run']);
  assert.equal(d.status, 0); assert.equal(calls.length, 0);
  const k = await run(['--series', dir, 'xx01'], {ELEVENLABS_API_KEY: ''});
  assert.notEqual(k.status, 0);
  assert.match(k.stderr, /ELEVENLABS_API_KEY/);
});

test('a rejected model reports the model ids the key can use, and saves nothing', async () => {
  const dir = makeSeries();
  mode = 'bad-model';
  try {
    const r = await run(['--series', dir, 'xx01']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /HTTP 400/);
    assert.match(r.stderr, /model_a, model_b/);
    assert.ok(!fs.existsSync(path.join(dir, 'episodes', 'xx01', 'narration.mp3')));
  } finally { mode = 'ok'; }
});

test('an endpoint override to a stranger is refused (key exfiltration guard)', async () => {
  const r = await run(['--series', makeSeries(), 'xx01'], {ELEVENLABS_API_BASE: 'https://evil.example.com'});
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /must point to loopback or api.elevenlabs.io/);
});

test('ship arguments: --publish needs --confirm-public; series and id are required; unknown options fail', () => {
  assert.throws(() => parseShipArgs(['--series', 'x', 'ff01', '--publish']), /needs --confirm-public/);
  assert.throws(() => parseShipArgs(['ff01']), /usage/);
  assert.throws(() => parseShipArgs(['--series', 'x', 'ff01', '--bogus']), /unknown option/);
  const o = parseShipArgs(['--series', 'x', 'ff01']);
  assert.equal(o.upload, false); assert.equal(o.publish, false);
});
