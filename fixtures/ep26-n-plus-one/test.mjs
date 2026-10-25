import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createFixture} from './server.mjs';
import {createRawDb, instrument} from './db.mjs';
import {buildSeed} from './seed.mjs';

const start = async (opts) => {
  const fx = createFixture(opts);
  const port = await fx.listen();
  const base = `http://127.0.0.1:${port}`;
  const cookie = (await fetch(`${base}/login/alice`)).headers.get('set-cookie').split(';')[0];
  const get = (p, c = cookie) => fetch(base + p, {headers: c ? {cookie: c} : {}});
  return {fx, base, get, close: () => fx.close()};
};
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const main = await start();
test.after(() => main.close());

/* ---------------- seed data ---------------- */
test('seed: exactly 100 articles, every author_id non-null and valid, foreign keys ON', () => {
  const {raw} = main.fx;
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM articles').get().n, 100);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM articles WHERE author_id IS NULL').get().n, 0);
  assert.equal(raw.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.deepEqual(raw.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM articles a LEFT JOIN authors u ON u.id = a.author_id WHERE u.id IS NULL').get().n, 0);
});

test('seed: foreign key and NOT NULL are enforced (an orphan or NULL author is rejected)', () => {
  const raw = createRawDb();
  assert.throws(() => raw.prepare("INSERT INTO articles (id, title, published_on, author_id) VALUES (101, 't', '2026-05-01', 999)").run(), /FOREIGN KEY constraint failed/);
  assert.throws(() => raw.prepare("INSERT INTO articles (id, title, published_on, author_id) VALUES (101, 't', '2026-05-01', NULL)").run(), /NOT NULL constraint failed/);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM articles').get().n, 100);
});

test('seed: authors are shared across articles, so repeated author lookups are visible', () => {
  const rows = main.fx.raw.prepare('SELECT author_id, COUNT(*) AS n FROM articles GROUP BY author_id').all();
  assert.ok(rows.length < 100, 'fewer distinct authors than articles');
  assert.ok(rows.some((r) => r.n > 1));
  assert.equal(rows.length, 12);
});

test('seed: seed-data.json is current (regenerate with `node seed.mjs`)', () => {
  const onDisk = JSON.parse(fs.readFileSync(new URL('./seed-data.json', import.meta.url), 'utf8'));
  assert.deepEqual(onDisk, buildSeed());
});

/* ---------------- instrumentation policy ---------------- */
test('setup is excluded: seeding ran on the raw connection, so the wrapper log starts empty', () => {
  const raw = createRawDb();
  assert.deepEqual(instrument(raw).log(), []);
});

test('only statements inside a scope are counted; scopes cannot nest', () => {
  const db = instrument(createRawDb());
  db.prepare('SELECT COUNT(*) AS n FROM authors').get(); // outside scope
  const {report} = db.scoped('probe', () => {
    db.prepare('SELECT COUNT(*) AS n FROM authors').get();
    db.prepare('SELECT id FROM authors').all();
  });
  assert.equal(report.selectCount, 2);
  assert.equal(db.log().length, 3, 'all three statements are logged');
  assert.equal(db.outsideScope().length, 1);
  assert.equal(db.outsideScope()[0].excluded, 'outside-scope');
  assert.throws(() => db.scoped('a', () => db.scoped('b', () => {})), /do not nest/);
});

test('non-SELECT statements and transaction control are not counted as SELECTs, and are reported', () => {
  const db = instrument(createRawDb());
  const {report} = db.scoped('mixed', () => {
    db.exec('BEGIN');
    db.prepare('SELECT 1 AS one').get();
    db.prepare('INSERT INTO sessions (sid, user_id) VALUES (?, ?)').run('x', 'u');
    db.exec('COMMIT');
  });
  assert.equal(report.selectCount, 1);
  assert.equal(report.otherScoped, 1, 'the INSERT is surfaced, not hidden');
  assert.deepEqual(report.excludedInScope, ['BEGIN', 'COMMIT']);
});

/* ---------------- the endpoints ---------------- */
test('both article endpoints require a session (401 without one)', async () => {
  assert.equal((await main.get('/vuln/articles', '')).status, 401);
  assert.equal((await main.get('/articles', '')).status, 401);
});

test('FLAWED endpoint executes exactly 101 SELECTs: one list query + one author lookup per article', async () => {
  const r = await main.get('/vuln/articles');
  assert.equal(r.status, 200);
  const rep = main.fx.lastReport();
  assert.equal(rep.endpoint, '/vuln/articles');
  assert.equal(rep.selectCount, 101);
  assert.equal(r.headers.get('x-db-selects'), '101', 'header is derived from the instrumentation');
  assert.equal(rep.otherScoped, 0, 'no non-SELECT statement ran inside the scope');
  const selects = rep.statements.filter((s) => s.counted);
  assert.match(selects[0].sql, /FROM articles ORDER BY id$/);
  assert.equal(selects[0].rowCount, 100);
  const lookups = selects.slice(1);
  assert.equal(lookups.length, 100);
  assert.ok(lookups.every((s) => /^SELECT id, name, handle FROM authors WHERE id = \?$/.test(s.sql)));
  // lookups follow article order, one per article, using that article's author_id
  const order = main.fx.raw.prepare('SELECT author_id FROM articles ORDER BY id').all().map((x) => x.author_id);
  assert.deepEqual(lookups.map((s) => s.params[0]), order);
});

test('CORRECTED endpoint executes exactly 1 SELECT, an explicit JOIN', async () => {
  const r = await main.get('/articles');
  assert.equal(r.status, 200);
  const rep = main.fx.lastReport();
  assert.equal(rep.endpoint, '/articles');
  assert.equal(rep.selectCount, 1);
  assert.equal(r.headers.get('x-db-selects'), '1');
  assert.equal(rep.otherScoped, 0);
  const [only] = rep.statements.filter((s) => s.counted);
  assert.match(only.sql, /FROM articles a JOIN authors u ON u\.id = a\.author_id ORDER BY a\.id$/);
  assert.equal(only.rowCount, 100);
});

test('authentication and transaction control are excluded from the demonstrated count', async () => {
  await main.get('/vuln/articles');
  const rep = main.fx.lastReport();
  assert.deepEqual(rep.excludedInScope, ['BEGIN', 'COMMIT']);
  assert.equal(rep.statements.length, 103, '101 SELECTs + BEGIN + COMMIT are logged inside the scope');
  const auth = main.fx.db.outsideScope().filter((e) => /FROM sessions/.test(e.sql));
  assert.ok(auth.length >= 1, 'the session lookup is logged but outside the scope');
  assert.ok(auth.every((e) => e.counted === false && e.excluded === 'outside-scope'));
});

test('result equivalence: same shape, same ORDER BY id, byte-equal JSON from both endpoints', async () => {
  const a = await (await main.get('/vuln/articles')).text();
  const b = await (await main.get('/articles')).text();
  assert.equal(a, b, 'byte-equal bodies');
  assert.equal(sha(a), sha(b));
  const body = JSON.parse(a);
  assert.equal(body.count, 100);
  assert.deepEqual(body.articles.map((x) => x.id), Array.from({length: 100}, (_, i) => i + 1), 'ordered by id');
  assert.deepEqual(Object.keys(body.articles[0]), ['id', 'title', 'published_on', 'author']);
  assert.deepEqual(Object.keys(body.articles[0].author), ['id', 'name', 'handle']);
  // every article carries the author the database says it has
  const truth = new Map(main.fx.raw.prepare('SELECT id, author_id FROM articles').all().map((x) => [x.id, x.author_id]));
  assert.ok(body.articles.every((x) => x.author.id === truth.get(x.id)));
});

test('repeated author lookups are visible in the scoped log (100 lookups, 12 distinct authors)', async () => {
  await main.get('/vuln/articles');
  const lookups = main.fx.lastReport().statements.filter((s) => s.counted).slice(1).map((s) => s.params[0]);
  const freq = new Map();
  for (const id of lookups) freq.set(id, (freq.get(id) ?? 0) + 1);
  assert.equal(lookups.length, 100);
  assert.equal(freq.size, 12);
  assert.ok(Math.max(...freq.values()) > 1, 'the same author is fetched more than once');
  assert.equal(lookups.length - freq.size, 88, 'lookups that repeated an earlier author');
});

/* ---------------- known-positive controls ---------------- */
test('KNOWN-POSITIVE CONTROL: a hidden extra query makes the counter report 102, so the "101" assertion would fail', async () => {
  const hidden = await start({hiddenExtraQuery: true});
  try {
    const r = await hidden.get('/vuln/articles');
    const rep = hidden.fx.lastReport();
    assert.equal(rep.selectCount, 102, 'the counter must notice one extra statement');
    assert.equal(r.headers.get('x-db-selects'), '102');
    assert.throws(() => assert.equal(rep.selectCount, 101), 'the real 101 assertion fails on the doctored endpoint');
    // the corrected endpoint is held to the same standard: 1 + 1 hidden = 2, never silently 1
    await hidden.get('/articles');
    assert.equal(hidden.fx.lastReport().selectCount, 2);
  } finally {
    await hidden.close();
  }
});

test('control: the doctored endpoint still returns identical bytes, so only the counter can reveal the extra query', async () => {
  const hidden = await start({hiddenExtraQuery: true});
  try {
    const a = await (await hidden.get('/vuln/articles')).text();
    const b = await (await main.get('/vuln/articles')).text();
    assert.equal(a, b);
  } finally {
    await hidden.close();
  }
});
