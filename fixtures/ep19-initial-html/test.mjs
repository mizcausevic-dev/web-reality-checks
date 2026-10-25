import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build, article} from './build.mjs';
import {app, listen} from './server.mjs';
import {measure, fetchRaw, captureDom, CHROME} from './inspect.mjs';

build();
const port = await listen();
const base = `http://127.0.0.1:${port}`;
const get = (p) => fetch(base + p, {redirect: 'manual'});

const raw = {csr: await fetchRaw(base, '/csr/article/'), ssg: await fetchRaw(base, '/ssg/article/')};
const m = {csr: measure(raw.csr.html), ssg: measure(raw.ssg.html)};

test('both article routes return 200 text/html', () => {
  for (const v of ['csr', 'ssg']) {
    assert.equal(raw[v].status, 200, v);
    assert.match(raw[v].contentType, /^text\/html/);
  }
});

test('missing routes return an explicit 404 on both variants (no SPA fallback)', async () => {
  for (const p of ['/csr/missing/', '/ssg/missing/', '/csr/article/nope/', '/ssg/article/nope/', '/does-not-exist', '/csr/', '/ssg/']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    const body = await r.text();
    assert.ok(!body.includes('id="app"'), `${p} must not serve a page shell`);
  }
});

test('directory URL without trailing slash redirects to one canonical URL', async () => {
  const r = await get('/csr/article');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/csr/article/');
});

test('path traversal is refused', async () => {
  assert.equal((await get('/../build.mjs')).status, 404);
  assert.equal((await get('/csr/%2e%2e/%2e%2e/build.mjs')).status, 404);
});

test('KNOWN-POSITIVE CONTROL: raw CSR HTML lacks the article text, headings and links', () => {
  assert.equal(m.csr.articleParagraphsPresent, 0, 'the shell must not contain the article or the comparison proves nothing');
  assert.equal(m.csr.articleHeadingsPresent, 0);
  assert.equal(m.csr.h1Count, 0);
  assert.equal(m.csr.linkCount, 0);
  assert.equal(m.csr.containsLoadingShell, true);
  assert.equal(m.csr.scriptTags, 1);
});

test('raw SSG HTML contains the whole article in the initial response', () => {
  assert.equal(m.ssg.articleParagraphsPresent, m.ssg.articleParagraphsExpected);
  assert.equal(m.ssg.articleHeadingsPresent, article.sections.length);
  assert.equal(m.ssg.h1Count, 1);
  assert.equal(m.ssg.h2Count, article.sections.length + 1); // + "Related"
  assert.equal(m.ssg.scriptTags, 0);
  assert.equal(m.ssg.containsLoadingShell, false);
});

test('both raw responses carry identical title, description and robots metadata', () => {
  assert.equal(m.csr.title, article.title);
  assert.equal(m.ssg.title, article.title);
  assert.equal(m.csr.description, m.ssg.description);
  assert.equal(m.csr.description, article.description);
  assert.equal(m.csr.robots, 'noindex');
  assert.equal(m.ssg.robots, 'noindex');
});

test('SSG link hrefs equal article.json hrefs; CSR data file carries the same hrefs', async () => {
  const expected = article.links.map((l) => l.href);
  assert.deepEqual(m.ssg.linkHrefs, expected);
  const data = await (await get('/article.json')).json();
  assert.deepEqual(data.links.map((l) => l.href), expected);
});

test('CSR shell references a real script and the script fetches /article.json', async () => {
  const js = await get('/csr/app.js');
  assert.equal(js.status, 200);
  const src = await js.text();
  assert.ok(src.includes("fetch('/article.json')"));
  assert.equal((await get('/article.json')).status, 200);
});

const haveChrome = fs.existsSync(CHROME);

test('rendered DOM with JavaScript: CSR and SSG contain the same article, headings and hrefs', {skip: !haveChrome && 'bundled Chrome not found'}, async () => {
  const c = await captureDom(`${base}/csr/article/`, {js: true});
  const s = await captureDom(`${base}/ssg/article/`, {js: true});
  assert.ok(c.ok, c.reason);
  assert.ok(s.ok, s.reason);
  const mc = measure(c.html), ms = measure(s.html);
  assert.equal(mc.renderedByClientJs, true, 'CSR page must have been populated by client JS');
  assert.ok(c.requests.includes('/article.json'), 'CSR page must have fetched the data');
  assert.equal(mc.articleParagraphsPresent, mc.articleParagraphsExpected);
  assert.equal(mc.articleParagraphsPresent, ms.articleParagraphsPresent);
  assert.equal(mc.h1Count, ms.h1Count);
  assert.equal(mc.h2Count, ms.h2Count);
  assert.deepEqual(mc.linkHrefs, ms.linkHrefs);
  assert.equal(mc.title, ms.title);
});

test('rendered DOM with JavaScript disabled: CSR shows the shell only, SSG still shows the article', {skip: !haveChrome && 'bundled Chrome not found'}, async () => {
  const c = await captureDom(`${base}/csr/article/`, {js: false});
  const s = await captureDom(`${base}/ssg/article/`, {js: false});
  assert.ok(c.ok, c.reason);
  assert.ok(s.ok, s.reason);
  const mc = measure(c.html), ms = measure(s.html);
  assert.equal(mc.articleParagraphsPresent, 0);
  assert.equal(mc.containsLoadingShell, true);
  assert.equal(mc.renderedByClientJs, false);
  assert.equal(ms.articleParagraphsPresent, ms.articleParagraphsExpected);
});

test.after(() => app.close());
