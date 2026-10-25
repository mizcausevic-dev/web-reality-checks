// EP25 regression tests. Node drives; Python (stdlib sqlite3, Online Backup API) does the SQLite work.
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const py = (script, ...args) => {
  const r = spawnSync('python3', [script, ...args], {cwd: here, encoding: 'utf8'});
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* leave null: tests assert on it */ }
  return {status: r.status, json, stderr: r.stderr};
};
const validate = (file) => py('validate.py', file);
const byName = (res) => Object.fromEntries(res.json.checks.map((c) => [c.name, c]));
const sha = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null);

let out;
let M; // manifest from make_artifacts.py
before(() => {
  out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ep25-')), 'artifacts');
  const r = py('make_artifacts.py', out);
  assert.equal(r.status, 0, r.stderr);
  M = r.json;
});
after(() => fs.rmSync(path.dirname(out), {recursive: true, force: true}));

test('foreign-key enforcement is ON for application connections (and OFF on a plain connection)', () => {
  assert.equal(M.fkEnforcement.applicationConnectionPragma, 1);
  assert.equal(M.fkEnforcement.orphanInsertRejected, true);
  assert.match(M.fkEnforcement.error, /FOREIGN KEY constraint failed/);
  assert.equal(M.fkEnforcement.plainConnectionPragma, 0, 'SQLite default is per-connection and off');
});

test('source is a WAL-mode database; the backup uses the Online Backup API and is one standalone file', () => {
  assert.equal(M.journalMode, 'wal');
  assert.equal(M.backup.ok, true);
  assert.equal(M.backup.api, 'sqlite3.Connection.backup');
  assert.ok(M.backup.bytes > 0);
  assert.deepEqual(M.sidecarsNextToBackup, [], 'backup has no -wal/-shm sidecars to lose');
});

test('good backup restores into a fresh path and every check passes', () => {
  const r = validate(M.files.good);
  assert.equal(r.status, 0);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.failedChecks, []);
  const c = byName(r);
  assert.deepEqual(c.integrity_check.actual, ['ok']);
  assert.deepEqual(c.foreign_key_check.actual, []);
  assert.equal(c.schema_version.actual, 3);
  assert.deepEqual(c.tables.actual, ['customers', 'orders']);
  assert.deepEqual(c.record_counts.actual, {customers: 12, orders: 40});
  assert.ok(c.known_values.actual.every((k) => k.expected === k.actual));
  assert.equal(c.order_totals_query.actual.rows, 12);
  assert.deepEqual(c.order_totals_query.actual.mismatches, []);
});

test('hard-coded known values (independent of the validator)', () => {
  const c = byName(validate(M.files.good));
  const sum = c.known_values.actual.find((k) => k.where === 'SUM(orders.amount_cents)');
  assert.equal(sum.actual, 244580);
  const o1 = c.known_values.actual.find((k) => k.where === 'orders.id=1');
  assert.equal(o1.actual, 9419);
});

test('restore is isolated: new path, source and backup files untouched', () => {
  const src = path.join(out, 'source.db');
  const files = [src, src + '-wal', src + '-shm', M.files.good];
  const before_ = files.map(sha);
  const r = py('validate.py', M.files.good, '--keep');
  assert.equal(r.json.ok, true);
  const restored = r.json.restoredPath;
  try {
    assert.notEqual(path.resolve(restored), path.resolve(src));
    assert.notEqual(path.resolve(restored), path.resolve(M.files.good));
    assert.ok(!restored.startsWith(out), 'restored copy lives outside the artifact directory');
    assert.ok(fs.existsSync(restored));
  } finally {
    fs.rmSync(path.dirname(restored), {recursive: true, force: true});
  }
  assert.deepEqual(files.map(sha), before_, 'validation must not change the source or the backup');
});

test('restored copy contains the backup\'s data, not later source writes', () => {
  assert.equal(M.sourceAfterLaterWrite.orders, 41, 'source moved on after the backup');
  const c = byName(validate(M.files.good));
  assert.equal(c.record_counts.actual.orders, 40, 'backup still has the snapshot');
});

test('backup.py refuses to overwrite an existing file or to write onto the source', () => {
  const before_ = sha(M.files.good);
  const a = py('backup.py', path.join(out, 'source.db'), M.files.good);
  assert.equal(a.status, 1);
  assert.equal(a.json.ok, false);
  assert.match(a.json.error, /FileExistsError/);
  const b = py('backup.py', path.join(out, 'source.db'), path.join(out, 'source.db'));
  assert.equal(b.json.ok, false);
  assert.match(b.json.error, /destination must differ/);
  assert.equal(sha(M.files.good), before_);
});

test('restore duration is reported only as a measurement from this machine', () => {
  const r = validate(M.files.good);
  assert.equal(typeof r.json.restore.msMeasuredOnThisMachine, 'number');
  assert.ok(r.json.restore.msMeasuredOnThisMachine >= 0);
  assert.match(r.json.restore.note, /this machine only/);
});

test('INVALID: a file that is not a SQLite database fails gracefully (structured result, no crash)', () => {
  const r = validate(M.files.not_a_database);
  assert.equal(r.status, 1);
  assert.ok(r.json, 'stdout is still one JSON object');
  assert.equal(r.json.ok, false);
  const c = byName(r);
  assert.equal(c.restore_open.status, 'fail');
  assert.match(c.restore_open.detail, /DatabaseError/);
  for (const n of ['integrity_check', 'foreign_key_check', 'schema_version', 'tables', 'record_counts', 'known_values', 'order_totals_query']) {
    assert.equal(c[n].status, 'skipped');
  }
  assert.doesNotMatch(r.stderr, /Traceback/);
});

test('INVALID: a missing path also fails gracefully', () => {
  const r = validate(path.join(out, 'does-not-exist.bak'));
  assert.equal(r.status, 1);
  assert.equal(r.json.ok, false);
  assert.equal(byName(r).restore_open.status, 'fail');
});

test('INVALID: valid SQLite file missing the orders table passes integrity_check but fails validation', () => {
  const r = validate(M.files.missing_table);
  assert.equal(r.json.ok, false);
  const c = byName(r);
  assert.equal(c.integrity_check.status, 'pass');
  assert.equal(c.tables.status, 'fail');
  assert.equal(c.record_counts.status, 'fail');
  assert.equal(c.order_totals_query.status, 'fail');
  assert.match(c.order_totals_query.detail, /no such table/);
});

test('INVALID: wrong schema version is caught by the schema-version check alone', () => {
  const r = validate(M.files.old_schema);
  assert.deepEqual(r.json.failedChecks, ['schema_version']);
  assert.equal(byName(r).schema_version.actual, 2);
});

test('KNOWN-POSITIVE CONTROL: integrity_check does not replace foreign_key_check (orphan order, same counts)', () => {
  const r = validate(M.files.orphan_same_counts);
  const c = byName(r);
  assert.equal(r.json.ok, false);
  assert.deepEqual(c.integrity_check.actual, ['ok'], 'structure is fine');
  assert.equal(c.integrity_check.status, 'pass');
  assert.equal(c.record_counts.status, 'pass', 'counts are identical to the good backup');
  assert.equal(c.foreign_key_check.status, 'fail');
  assert.equal(c.foreign_key_check.actual.length, 1);
  assert.equal(c.foreign_key_check.actual[0][0], 'orders');
});

test('KNOWN-POSITIVE CONTROL: record counts alone do not establish recovery (one wrong value, same counts)', () => {
  const r = validate(M.files.wrong_value_same_counts);
  const c = byName(r);
  assert.equal(r.json.ok, false);
  assert.equal(c.integrity_check.status, 'pass');
  assert.equal(c.foreign_key_check.status, 'pass');
  assert.equal(c.record_counts.status, 'pass');
  assert.equal(c.known_values.status, 'fail');
  assert.equal(c.order_totals_query.status, 'fail');
  const bad = c.order_totals_query.actual.mismatches;
  assert.equal(bad.length, 1);
  assert.equal(bad[0].expected[3] + 100, bad[0].actual[3]);
});

test('KNOWN-POSITIVE CONTROL: copying only the main file of a live WAL database is not a backup', () => {
  assert.ok(M.liveWal.wal.bytes > 0, 'precondition: committed data was still in the -wal file');
  assert.ok(M.liveWal.main.bytes < M.liveWal.wal.bytes);
  const naive = validate(M.files.naive_main_file_copy);
  assert.equal(naive.json.ok, false);
  assert.ok(naive.json.failedChecks.includes('record_counts'));
  const api = validate(M.files.live_via_backup_api);
  assert.equal(api.json.ok, true, 'Online Backup API on the same live database is complete');
});

test('every validation result is one JSON object with the full check list', () => {
  for (const f of Object.values(M.files)) {
    const r = validate(f);
    assert.ok(r.json, f);
    assert.equal(r.json.checks.length, 8);
    assert.equal(r.status, r.json.ok ? 0 : 1);
  }
});
