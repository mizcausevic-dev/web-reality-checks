// Runs the exact scenario the video shows and writes evidence.json with ACTUAL outputs.
//
// Steps (mirroring the brief's scenes):
//  1 local success      API on loopback, bundle built with that URL, static host origin allowlisted → 200
//  2 remote-client      the same bundle's URL fetched where no API listens → the actual error (CONCEPTUAL in the
//                       video: this is a Node fetch to an empty loopback port, not an isolated browser)
//  4 inspect bundle     grep dist/assets/*.js for the embedded URL
//  5-6 host env change  start the static host with --inject-env; dist bytes unchanged, served JS unchanged
//  7-8 rebuild + retest bundle contains reachable URL; GET /health → 200
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {build, HERE} from './build.mjs';
import {startApi} from './api.mjs';
import {serveDist} from './static-host.mjs';
import {inspectDist} from './inspect-bundle.mjs';

const DIST = path.join(HERE, 'dist');
const viteVersion = JSON.parse(fs.readFileSync(path.join(HERE, 'node_modules', 'vite', 'package.json'), 'utf8')).version;
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const servedAsset = async (origin) => {
  const html = await (await fetch(`${origin}/`)).text();
  const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
  return {asset, js: await (await fetch(origin + asset)).text()};
};
const log = [];
const step = (id, data) => { log.push({id, ...data}); console.log(`[${id}]`, JSON.stringify(data)); };

// ---- 1. Developer machine: API up, bundle points at it, browser-equivalent fetch succeeds
const devApi = await startApi();
const devPort = devApi.port;
build({outDir: DIST, env: {VITE_API_BASE_URL: devApi.base}});
let insp = inspectDist(DIST);
const devHost = await serveDist({distDir: DIST});
devApi.allowOrigin(devHost.origin);
{
  const url = insp.embeddedUrls.find((u) => u === devApi.base);
  const r = await fetch(`${url}/health`, {headers: {origin: devHost.origin}});
  step('local_success', {apiBase: devApi.base, staticOrigin: devHost.origin, bundleUrl: url, request: `GET ${url}/health`, status: r.status, body: await r.json(), corsAllowOrigin: r.headers.get('access-control-allow-origin'), note: 'developer machine: the embedded localhost URL is reachable because the API runs on the same loopback'});
}
await devHost.close();
await devApi.close(); // the developer's API is now gone from "127.0.0.1:<devPort>" — exactly what a remote machine's loopback looks like

// ---- 2/3. Remote client (MODEL): same bundle, same literal URL, nothing listening on this loopback port
{
  const url = insp.embeddedUrls.find((u) => u === `http://127.0.0.1:${devPort}`);
  let err;
  try { await fetch(`${url}/health`); } catch (e) { err = e; }
  step('remote_client_failure_model', {
    bundleUrl: url, request: `GET ${url}/health`,
    errorName: err?.name ?? null, errorMessage: err?.message ?? null, causeCode: err?.cause?.code ?? null,
    browserEquivalent: 'TypeError: Failed to fetch (console: net::ERR_CONNECTION_REFUSED). Not a CORS error.',
    conceptual: true,
    note: 'NOT an isolated browser. Node fetch from this machine to the embedded loopback port after the dev API stopped. The remote-browser scene in the video is a labelled conceptual simulation.',
  });
}

// ---- 4. Inspect the built bundle
step('bundle_inspection', {files: insp.files.map((f) => ({file: f.file, bytes: f.bytes, sha256: f.sha256.slice(0, 16) + '…'})), embeddedUrls: insp.embeddedUrls, containsLiteralImportMetaEnv: insp.files.some((f) => f.containsLiteralImportMetaEnv), vite: viteVersion, source: 'src/main.js: const base = import.meta.env.VITE_API_BASE_URL;'});
fs.writeFileSync(path.join(HERE, 'built-value-inspection.json'), JSON.stringify({phase: 'before-rebuild', ...insp}, null, 2));

// ---- 5/6. Change env on the static host WITHOUT rebuilding
const reachableApi = await startApi();
{
  const before = insp.distHash;
  const host = await serveDist({distDir: DIST, injectEnv: reachableApi.base});
  const hostEnv = await (await fetch(`${host.origin}/__host-env`)).json();
  const {asset, js} = await servedAsset(host.origin);
  const after = inspectDist(DIST);
  step('host_env_change_no_rebuild', {
    hostProcessEnv: hostEnv.VITE_API_BASE_URL, servedAsset: asset,
    servedJsContainsOriginalUrl: js.includes(`http://127.0.0.1:${devPort}`), servedJsContainsHostEnvValue: js.includes(reachableApi.base),
    distHashBefore: before.slice(0, 16) + '…', distHashAfter: after.distHash.slice(0, 16) + '…', distUnchanged: before === after.distHash,
    note: 'the static host now has VITE_API_BASE_URL in its own process.env; the files it serves are byte-identical',
  });
  await host.close();
  delete process.env.VITE_API_BASE_URL;
}

// ---- 7/8. Rebuild with a URL the test client can reach, serve, retest
build({outDir: DIST, env: {VITE_API_BASE_URL: reachableApi.base}});
insp = inspectDist(DIST);
fs.writeFileSync(path.join(HERE, 'built-value-inspection.json'), JSON.stringify({phase: 'after-rebuild', before: JSON.parse(fs.readFileSync(path.join(HERE, 'built-value-inspection.json'), 'utf8')), ...insp}, null, 2));
{
  const host = await serveDist({distDir: DIST});
  reachableApi.allowOrigin(host.origin);
  const {asset, js} = await servedAsset(host.origin);
  const url = insp.embeddedUrls.find((u) => u === reachableApi.base);
  const r = await fetch(`${url}/health`, {headers: {origin: host.origin}});
  step('rebuild_and_retest', {newApiBase: reachableApi.base, staticOrigin: host.origin, servedAsset: asset, servedJsContainsNewUrl: js.includes(reachableApi.base), servedJsContainsOldUrl: js.includes(`http://127.0.0.1:${devPort}`), request: `GET ${url}/health`, status: r.status, body: await r.json(), corsAllowOrigin: r.headers.get('access-control-allow-origin')});
  await host.close();
}
await reachableApi.close();

fs.writeFileSync(path.join(HERE, 'evidence.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), vite: viteVersion, node: process.version,
  topology: 'all servers on 127.0.0.1, ephemeral ports; no isolated browser was available',
  notReproduced: 'The remote-browser failure was NOT reproduced in an isolated browser context. Step remote_client_failure_model is a Node fetch to the embedded loopback port with nothing listening.',
  log,
}, null, 2));
console.log('\nwrote evidence.json and built-value-inspection.json');
