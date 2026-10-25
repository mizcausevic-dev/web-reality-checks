import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeItems, digest} from './data.mjs';
import * as before from './handler-before.mjs';
import * as after from './handler-after.mjs';
import {measureHandler, measureAssets} from './measure.mjs';
import {app, listen} from './serve.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const html = {before: fs.readFileSync(path.join(here, 'before/index.html'), 'utf8'), after: fs.readFileSync(path.join(here, 'after/index.html'), 'utf8')};
const items = makeItems();

test('both handlers produce identical output on the seeded catalogue (same digest, same values)', () => {
  const a = before.relatedCounts(items);
  const b = after.relatedCounts(items);
  assert.equal(a.length, b.length);
  assert.equal(digest(a), digest(b));
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) assert.fail(`mismatch at ${i}: ${a[i]} vs ${b[i]}`);
});

test('handlers also agree on small edge-case inputs', () => {
  for (const n of [0, 1, 2, 37]) {
    const small = makeItems(n, 99);
    assert.deepEqual([...before.relatedCounts(small)], [...after.relatedCounts(small)]);
  }
});

test('the after hero image is smaller in bytes than the before hero image', async () => {
  const a = await measureAssets();
  assert.ok(a.before.bytes > 1_000_000, 'the oversized PNG must be large for the flaw to be observable');
  assert.ok(a.after.bytes < a.before.bytes);
  assert.equal(a.before.served.bodyBytes, a.before.bytes);
  assert.equal(a.after.served.bodyBytes, a.after.bytes);
});

test('KNOWN-POSITIVE CONTROL + repair: before handler median is slower than after (Node CPU time, not INP)', () => {
  const b = measureHandler(before, items, 5);
  const a = measureHandler(after, items, 5);
  assert.ok(b.medianMs > 100, `the flaw must be observable: before median ${b.medianMs} ms`);
  assert.ok(a.medianMs < b.medianMs, `after ${a.medianMs} ms should be faster than before ${b.medianMs} ms`);
  assert.equal(a.digest, b.digest);
});

test('hero <img> is present and NOT lazy-loaded in either page', () => {
  for (const k of ['before', 'after']) {
    const img = html[k].match(/<img[^>]*>/g) ?? [];
    assert.equal(img.length, 1, `${k}: exactly one hero img`);
    assert.doesNotMatch(img[0], /loading\s*=\s*["']?lazy/i, `${k}: hero must not be lazy-loaded`);
    assert.match(img[0], /\bwidth="\d+"\s+height="\d+"/, `${k}: intrinsic dimensions declared`);
  }
  assert.match(html.before, /hero-large\.png/);
  assert.match(html.after, /hero-sized\.webp/);
  assert.match(html.before, /handler-before\.mjs/);
  assert.match(html.after, /handler-after\.mjs/);
});

test('pages are visually equivalent: identical markup apart from asset, handler and label', () => {
  const norm = (s) => s.replace(/BEFORE|AFTER/g, 'X').replace(/hero-(large\.png" width="4000" height="2250"|sized\.webp" width="1600" height="900")/g, 'HERO').replace(/handler-(before|after)/g, 'HANDLER').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(norm(html.before), norm(html.after));
});

test('loopback server serves both pages and shared modules, binds 127.0.0.1 only', async () => {
  const port = await listen();
  for (const p of ['/before/', '/after/', '/data.mjs', '/handler-before.mjs', '/handler-after.mjs', '/assets/hero-sized.webp']) {
    assert.equal((await fetch(`http://127.0.0.1:${port}${p}`)).status, 200, p);
  }
  assert.equal((await fetch(`http://127.0.0.1:${port}/serve.mjs`)).status, 404, 'non-allow-listed files are not served');
  assert.equal(app.address().address, '127.0.0.1');
  app.close();
});
