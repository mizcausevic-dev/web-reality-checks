// What this environment CAN measure for Episode 08:
//   (a) asset byte sizes of the two hero images (file bytes, also confirmed via the loopback server)
//   (b) CPU time of the two interaction handlers, in Node, with performance.now()
//
// (b) is labelled everywhere as: "fixture-measured handler CPU time in Node, NOT browser INP".
// Node and a browser share the V8 engine but not the event loop, rendering pipeline or
// input-delay accounting, so these numbers describe the handler's work, not a user's wait.
// No LCP and no Event Timing / INP numbers are produced here; see test-conditions.md.
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {makeItems, digest, N, COLLECTIONS, SEED} from './data.mjs';
import * as before from './handler-before.mjs';
import * as after from './handler-after.mjs';
import {app, listen} from './serve.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
export const HANDLER_LABEL = 'fixture-measured handler CPU time in Node, NOT browser INP';

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;

export const measureHandler = (mod, items, runs = 7, warmup = 1) => {
  for (let i = 0; i < warmup; i++) mod.relatedCounts(items); // let the JIT settle; warm-up excluded
  const raw = [];
  let out;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    out = mod.relatedCounts(items);
    raw.push(r2(performance.now() - t0));
  }
  return {label: mod.label, runs, warmupRunsExcluded: warmup, rawMs: raw, medianMs: r2(median(raw)), minMs: Math.min(...raw), maxMs: Math.max(...raw), digest: digest(out), first: out[0], last: out[out.length - 1]};
};

export const measureAssets = async () => {
  const files = ['hero-large.png', 'hero-sized.webp'];
  const onDisk = Object.fromEntries(files.map((f) => [f, fs.statSync(path.join(here, 'assets', f)).size]));
  const port = await listen();
  const served = {};
  for (const f of files) {
    const r = await fetch(`http://127.0.0.1:${port}/assets/${f}`);
    served[f] = {status: r.status, contentLength: Number(r.headers.get('content-length')), contentType: r.headers.get('content-type'), bodyBytes: (await r.arrayBuffer()).byteLength};
  }
  app.close();
  const dims = JSON.parse(fs.readFileSync(path.join(here, 'assets', 'asset-sizes.json'), 'utf8'));
  return {
    before: {file: 'hero-large.png', bytes: onDisk['hero-large.png'], width: dims['hero-large.png'].width, height: dims['hero-large.png'].height, encoding: dims['hero-large.png'].encoding, served: served['hero-large.png']},
    after: {file: 'hero-sized.webp', bytes: onDisk['hero-sized.webp'], width: dims['hero-sized.webp'].width, height: dims['hero-sized.webp'].height, encoding: dims['hero-sized.webp'].encoding, served: served['hero-sized.webp']},
    ratio: r2(onDisk['hero-large.png'] / onDisk['hero-sized.webp']),
    label: 'file bytes served by the loopback fixture; not a transfer-time or LCP measurement',
  };
};

export const measureAll = async ({runs = 7} = {}) => {
  const items = makeItems();
  return {
    environment: {node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model ?? 'unknown', cpus: os.cpus().length},
    data: {items: N, collections: COLLECTIONS, seed: SEED},
    assets: await measureAssets(),
    handlers: {label: HANDLER_LABEL, before: measureHandler(before, items, runs), after: measureHandler(after, items, runs)},
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await measureAll();
  console.log(JSON.stringify(m, null, 2));
}
