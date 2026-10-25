// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const py = (script, ...args) => {
  const r = spawnSync('python3', [script, ...args], {cwd: here, encoding: 'utf8'});
  return {status: r.status, json: JSON.parse(r.stdout), stderr: r.stderr};
};
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ep25-demo-'));
const out = path.join(work, 'artifacts');
const pyVersion = spawnSync('python3', ['-c', 'import sys,sqlite3;print(sys.version.split()[0], sqlite3.sqlite_version)'], {encoding: 'utf8'}).stdout.trim();
const M = py('make_artifacts.py', out).json;

const summarise = (label, file) => {
  const r = py('validate.py', file);
  const c = Object.fromEntries(r.json.checks.map((x) => [x.name, x]));
  return {
    label, exitCode: r.status, ok: r.json.ok, failedChecks: r.json.failedChecks,
    statuses: Object.fromEntries(r.json.checks.map((x) => [x.name, x.status])),
    restoreMsMeasuredOnThisMachine: r.json.restore?.msMeasuredOnThisMachine ?? null,
    detail: {
      integrity_check: c.integrity_check?.actual ?? null,
      foreign_key_check: c.foreign_key_check?.actual ?? null,
      schema_version: c.schema_version?.actual ?? null,
      tables: c.tables?.actual ?? null,
      record_counts: c.record_counts?.actual ?? null,
      known_values: c.known_values?.actual ?? null,
      order_totals_mismatches: c.order_totals_query?.actual?.mismatches ?? null,
      order_totals_rows: c.order_totals_query?.actual?.rows ?? null,
      order_totals: c.order_totals_query?.actual?.totals ?? null,
      errors: r.json.checks.filter((x) => x.detail).map((x) => `${x.name}: ${x.detail}`),
    },
  };
};

const scenarios = [
  summarise('good backup (Online Backup API, quiescent WAL-mode source)', M.files.good),
  summarise('not a SQLite database', M.files.not_a_database),
  summarise('valid SQLite, orders table missing', M.files.missing_table),
  summarise('wrong schema version (user_version 2)', M.files.old_schema),
  summarise('orphan order, same record counts (FK was OFF when written)', M.files.orphan_same_counts),
  summarise('one wrong amount, same record counts, no orphans', M.files.wrong_value_same_counts),
  summarise('CONTROL: main file only copied from live WAL database', M.files.naive_main_file_copy),
  summarise('CONTROL: Online Backup API on the same live WAL database', M.files.live_via_backup_api),
];

const evidence = {
  generatedAt: new Date().toISOString(),
  environment: {pythonAndSqlite: pyVersion, note: 'python3 stdlib sqlite3; Node drives via child_process'},
  backupReport: M.backup,
  sourceJournalMode: M.journalMode,
  foreignKeyEnforcement: M.fkEnforcement,
  sidecarsNextToBackup: M.sidecarsNextToBackup,
  sourceAfterLaterWrite: M.sourceAfterLaterWrite,
  liveWalControl: {mainFileBytes: M.liveWal.main.bytes, walFileBytes: M.liveWal.wal.bytes},
  timings: {
    measuredOnThisMachine: true,
    backupMs: M.backup.backupMsMeasuredOnThisMachine,
    restoreMsGoodBackup: scenarios[0].restoreMsMeasuredOnThisMachine,
    caveat: 'Tiny synthetic file on one machine. Not a recovery-time estimate for any real system. Not shown in the video.',
  },
  scenarios,
};
fs.writeFileSync(path.join(here, 'evidence.json'), JSON.stringify(evidence, null, 2));
fs.rmSync(work, {recursive: true, force: true});

console.log(`backup reported: ok=${M.backup.ok} via ${M.backup.api} (${M.backup.bytes} bytes, ${M.backup.pageCount} pages)`);
console.table(scenarios.map((s) => ({scenario: s.label, valid: s.ok, failed: s.failedChecks.join(', ') || '-'})));
const g = scenarios[0].detail;
console.log(`good backup: integrity_check=${JSON.stringify(g.integrity_check)} foreign_key_check rows=${g.foreign_key_check.length} user_version=${g.schema_version} counts=${JSON.stringify(g.record_counts)} totals rows=${g.order_totals_rows} mismatches=${g.order_totals_mismatches.length}`);
