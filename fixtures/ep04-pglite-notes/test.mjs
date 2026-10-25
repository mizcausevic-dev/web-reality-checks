// Node regression tests for the EP04 notes fixture.
// Runs PGlite against a FILESYSTEM data directory in a temp folder (NodeFS) — the Node
// analogue of the browser's idb:// directory — plus memory:// as a known-positive control.
// idb:// itself needs a browser and is NOT exercised here (see browser-test-checklist.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {NotesDb} from './notes-db.mjs';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ep04-pglite-'));
const dirA = path.join(tmpRoot, 'profile-a');
const dirB = path.join(tmpRoot, 'profile-b');
const open = (dataDir) => new NotesDb(dataDir, {PGlite}).ready;

test.after(() => fs.rmSync(tmpRoot, {recursive: true, force: true}));

test('create, search, edit, delete over a filesystem data dir', async () => {
  const db = await open(dirA);
  assert.equal(db.kind, 'filesystem');
  assert.equal(db.persistent, true);
  assert.equal(await db.count(), 0, 'fresh data dir starts empty');

  const n = await db.create('Groceries', 'milk, eggs, coffee');
  assert.equal(typeof n.id, 'number');
  assert.equal(n.title, 'Groceries');

  const hits = await db.search('coffee');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, n.id);
  assert.equal((await db.search('COFFEE')).length, 1, 'search is case-insensitive');
  assert.equal((await db.search('zebra')).length, 0);

  const edited = await db.edit(n.id, {body: 'milk, eggs, coffee, bread'});
  assert.equal(edited.body, 'milk, eggs, coffee, bread');
  assert.equal(edited.title, 'Groceries', 'title untouched when not supplied');
  assert.equal((await db.search('bread')).length, 1);
  assert.equal(await db.edit(99999, {title: 'x'}), null, 'editing an absent id returns null');

  const extra = await db.create('Scratch', 'to be deleted');
  assert.equal(await db.count(), 2);
  assert.equal(await db.remove(extra.id), true);
  assert.equal(await db.remove(extra.id), false, 'second delete finds nothing');
  assert.equal(await db.count(), 1);
  await db.close();
});

test('persistence: close, reopen the SAME data dir, the note is still there', async () => {
  const db = await open(dirA);
  const rows = await db.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Groceries');
  assert.equal(rows[0].body, 'milk, eggs, coffee, bread', 'the edit survived the restart too');
  await db.close();
});

test('isolation: a DIFFERENT data dir does not see the note', async () => {
  const other = await open(dirB);
  assert.equal(await other.count(), 0);
  assert.equal((await other.search('Groceries')).length, 0);
  await other.close();
  // and the original is unaffected
  const db = await open(dirA);
  assert.equal(await db.count(), 1);
  await db.close();
});

test('KNOWN-POSITIVE CONTROL: memory:// loses the note after close', async () => {
  const mem = await open('memory://');
  assert.equal(mem.kind, 'memory');
  assert.equal(mem.persistent, false);
  await mem.create('Ephemeral', 'this will vanish');
  assert.equal(await mem.count(), 1);
  await mem.close();

  const again = await open('memory://');
  assert.equal(await again.count(), 0, 'in-memory data must not survive close; if it did, the persistence claim would be meaningless');
  await again.close();
});

test('relaxedDurability is refused by the fixture (deliberately not enabled)', () => {
  assert.throws(() => new NotesDb('memory://', {PGlite, options: {relaxedDurability: true}}), /relaxedDurability/);
});

test('constructor requires a data dir string and the PGlite class', () => {
  assert.throws(() => new NotesDb(undefined, {PGlite}), /data dir/);
  assert.throws(() => new NotesDb('memory://'), /PGlite/);
});
