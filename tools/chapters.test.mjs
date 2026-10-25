import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeChapters, applyChapters} from './chapters.mjs';

const script = {scenes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({id, chapter: `Chapter ${id}`}))};
const tl = (starts, duration) => ({duration, scenes: starts.map((s, i) => ({id: 'abcde'[i], start: s}))});

test('chapters start at 00:00 and use scene starts', () => {
  assert.deepEqual(makeChapters(tl([0, 12, 25, 40, 55], 70), script), ['00:00 Chapter a', '00:12 Chapter b', '00:25 Chapter c', '00:40 Chapter d', '00:55 Chapter e']);
});
test('a scene shorter than 10 s folds into the chapter before it', () => {
  assert.deepEqual(makeChapters(tl([0, 12, 18, 40, 55], 70), script), ['00:00 Chapter a', '00:12 Chapter b', '00:40 Chapter d', '00:55 Chapter e']);
});
test('a short final chapter folds back', () => {
  assert.deepEqual(makeChapters(tl([0, 12, 25, 40, 55], 62), script), ['00:00 Chapter a', '00:12 Chapter b', '00:25 Chapter c', '00:40 Chapter d']);
});
test('fewer than three chapters is an error, and so is a missing chapter title', () => {
  assert.throws(() => makeChapters(tl([0, 12, 18, 20, 22], 30), script), /needs three or more/);
  assert.throws(() => makeChapters(tl([0, 12, 25], 40), {scenes: [{id: 'a', chapter: 'x'}, {id: 'b'}, {id: 'c', chapter: 'z'}]}), /no "chapter" title/);
});
test('applyChapters rewrites only the marked block and is idempotent', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chap-')), 'd.md');
  fs.writeFileSync(f, 'before\n<!-- chapters:start -->\n00:00 old\n<!-- chapters:end -->\nafter\n');
  applyChapters(f, ['00:00 A', '00:10 B']);
  applyChapters(f, ['00:00 A', '00:10 B']);
  assert.equal(fs.readFileSync(f, 'utf8'), 'before\n<!-- chapters:start -->\n00:00 A\n00:10 B\n<!-- chapters:end -->\nafter\n');
  fs.writeFileSync(f, 'no block');
  assert.throws(() => applyChapters(f, ['x']), /no <!-- chapters:start -->/);
});
