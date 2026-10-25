// EP07 regression tests. Real `vite build` runs; loopback servers on ephemeral ports.
// What is NOT here: an isolated remote browser. The "remote client" failure is modelled with a
// Node fetch to a loopback port with nothing listening (ECONNREFUSED), which is the same
// network condition a remote browser's own loopback would present, but it is not a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {build, HERE} from './build.mjs';
import {startApi} from './api.mjs';
import {serveDist} from './static-host.mjs';
import {inspectDist} from './inspect-bundle.mjs';

const DIST = path.join(HERE, '.test-dist');
const bundleJs = (dist) => inspectDist(dist).files.map((f) => fs.readFileSync(path.join(dist, f.file), 'utf8')).join('\n');

// A loopback port with nothing listening on it (bound then released).
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

const deadPort = await freePort();
const DEAD_URL = `http://127.0.0.1:${deadPort}`; // "the developer's localhost API" as seen from a machine without one

test('vite build statically replaces import.meta.env.VITE_API_BASE_URL with the build-time value', () => {
  build({outDir: DIST, env: {VITE_API_BASE_URL: DEAD_URL}});
  const insp = inspectDist(DIST);
  assert.ok(insp.files.length >= 1, 'a JS asset was emitted');
  assert.ok(insp.embeddedUrls.includes(DEAD_URL), `bundle contains ${DEAD_URL}`);
  assert.equal(insp.files.some((f) => f.containsLiteralImportMetaEnv), false, 'no literal import.meta.env left in the bundle');
});

test('source still references the literal import.meta.env.VITE_API_BASE_URL (the thing that gets replaced)', () => {
  assert.match(fs.readFileSync(path.join(HERE, 'src', 'main.js'), 'utf8'), /import\.meta\.env\.VITE_API_BASE_URL/);
});

test('without an env override, .env.development supplies the localhost value', () => {
  const out = path.join(HERE, '.test-dist-devfile');
  const saved = process.env.VITE_API_BASE_URL; delete process.env.VITE_API_BASE_URL;
  try {
    const r = build({outDir: out});
    assert.ok(inspectDist(r.outDir).embeddedUrls.includes('http://127.0.0.1:8787'), '.env.development value is what got stamped');
  } finally { if (saved !== undefined) process.env.VITE_API_BASE_URL = saved; }
  fs.rmSync(out, {recursive: true, force: true});
});

test('KNOWN-POSITIVE CONTROL: the embedded localhost URL is unreachable where no API listens (ECONNREFUSED, not CORS)', async () => {
  const url = inspectDist(DIST).embeddedUrls.find((u) => u === DEAD_URL);
  await assert.rejects(fetch(`${url}/health`), (err) => {
    assert.equal(err.name, 'TypeError');
    assert.equal(err.message, 'fetch failed');
    assert.equal(err.cause?.code, 'ECONNREFUSED', 'the actual failure is a refused TCP connection');
    return true;
  });
});

test('setting VITE_API_BASE_URL on the static host process does NOT change the served bundle', async () => {
  const before = inspectDist(DIST);
  const api = await startApi();
  const host = await serveDist({distDir: DIST, injectEnv: api.base}); // runtime env change on the host
  try {
    const hostEnv = await (await fetch(`${host.origin}/__host-env`)).json();
    assert.equal(hostEnv.VITE_API_BASE_URL, api.base, 'the host process really does see the new value');
    const html = await (await fetch(`${host.origin}/`)).text();
    const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    assert.ok(asset, 'index.html references a built asset');
    const js = await (await fetch(host.origin + asset)).text();
    assert.ok(js.includes(DEAD_URL), 'served JS still contains the ORIGINAL build-time URL');
    assert.equal(js.includes(api.base), false, 'served JS does not contain the host env value');
    assert.equal(inspectDist(DIST).distHash, before.distHash, 'dist/ bytes are unchanged');
  } finally { await host.close(); await api.close(); delete process.env.VITE_API_BASE_URL; }
});

test('rebuild with a reachable API URL: bundle contains the new value and GET /health succeeds (200)', async () => {
  const api = await startApi();
  try {
    build({outDir: DIST, env: {VITE_API_BASE_URL: api.base}});
    const insp = inspectDist(DIST);
    assert.ok(insp.embeddedUrls.includes(api.base));
    assert.equal(insp.embeddedUrls.includes(DEAD_URL), false, 'old value is gone after the rebuild');
    const r = await fetch(`${insp.embeddedUrls.find((u) => u === api.base)}/health`);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ok, true);
  } finally { await api.close(); }
});

test('LOCAL SUCCESS: API up, bundle URL reachable, static-host origin allowlisted → 200 with CORS header', async () => {
  const api = await startApi();
  try {
    build({outDir: DIST, env: {VITE_API_BASE_URL: api.base}});
    const host = await serveDist({distDir: DIST});
    api.allowOrigin(host.origin); // deliberate CORS allowlist of the static origin
    try {
      const js = bundleJs(DIST);
      const url = inspectDist(DIST).embeddedUrls.find((u) => u === api.base);
      assert.ok(js.includes(url));
      const r = await fetch(`${url}/health`, {headers: {origin: host.origin}});
      assert.equal(r.status, 200);
      assert.equal(r.headers.get('access-control-allow-origin'), host.origin, 'CORS is configured, so it is not the failure');
    } finally { await host.close(); }
  } finally { await api.close(); }
});

test('CORS allowlist is deliberate: a non-allowlisted origin gets no Access-Control-Allow-Origin', async () => {
  const api = await startApi({allowOrigins: ['http://127.0.0.1:1']});
  try {
    const ok = await fetch(`${api.base}/health`, {headers: {origin: 'http://127.0.0.1:1'}});
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://127.0.0.1:1');
    const no = await fetch(`${api.base}/health`, {headers: {origin: 'http://evil.example.test'}});
    assert.equal(no.status, 200, 'the server still answers; the BROWSER would block reading it');
    assert.equal(no.headers.get('access-control-allow-origin'), null);
  } finally { await api.close(); }
});

test('static host refuses path traversal and 404s unknown files', async () => {
  const host = await serveDist({distDir: DIST});
  try {
    assert.equal((await fetch(`${host.origin}/nope.js`)).status, 404);
    assert.equal((await fetch(`${host.origin}/..%2F..%2Fpackage.json`)).status, 403);
  } finally { await host.close(); }
});

test.after(() => fs.rmSync(DIST, {recursive: true, force: true}));
