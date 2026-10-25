// Episode 30 fixture: shared SQLite file, report tables, report computation, error classification.
// Node 22 `node:sqlite` (DatabaseSync). Synthetic data only. Every report lives inside the database;
// nothing is emailed, written to another file, or sent over a network.
//
// Journal mode: WAL (documented choice). Readers never block the writer and the writer never blocks
// readers, so a test connection can look at committed state while a worker holds the write lock.
// Writers still serialise: only one connection can hold the WAL write lock at a time.
//
// Busy handling: every connection is opened with the supported `timeout` option, which installs
// SQLite's busy handler (equivalent to PRAGMA busy_timeout). The wait is BOUNDED. When it runs out,
// SQLite raises SQLITE_BUSY (errcode 5), which this fixture classifies as a RETRYABLE database failure.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

export const REPORT_TYPE = 'daily_sales';
// Logical run = (report_type, scheduled_utc). Scheduled instants are UTC strings, always with a 'Z'.
export const SCHEDULED_UTC = '2026-03-02T02:00:00Z';
export const DEFAULT_BUSY_TIMEOUT_MS = 5000;

export const SQLITE_BUSY = 5;
export const SQLITE_LOCKED = 6;

export const SOURCE_ROWS = [
  // inside the window [2026-03-01T02:00:00Z, 2026-03-02T02:00:00Z)
  ['north', 1200, '2026-03-01T02:00:00Z'],
  ['north', 850, '2026-03-01T09:15:00Z'],
  ['south', 4300, '2026-03-01T11:40:00Z'],
  ['south', 275, '2026-03-01T18:05:00Z'],
  ['east', 990, '2026-03-01T21:30:00Z'],
  ['east', 1510, '2026-03-02T01:59:59Z'],
  ['west', 3200, '2026-03-01T04:20:00Z'],
  // outside the window: one second too early, and exactly at the scheduled instant (exclusive end)
  ['north', 7777, '2026-03-01T01:59:59Z'],
  ['south', 8888, '2026-03-02T02:00:00Z'],
];

/** Window of source rows a run covers: the 24 hours before the scheduled instant (end exclusive). */
export const windowFor = (scheduledUtc) => {
  const end = new Date(scheduledUtc);
  if (Number.isNaN(end.getTime()) || !scheduledUtc.endsWith('Z')) throw new Error(`scheduled instant must be a UTC string ending in Z: ${scheduledUtc}`);
  const from = new Date(end.getTime() - 24 * 3600 * 1000);
  const iso = (d) => d.toISOString().replace('.000Z', 'Z');
  return {from: iso(from), to: iso(end)};
};

export const refFor = (reportType, scheduledUtc) => `RPT-${reportType}-${scheduledUtc}`;

/** The report the source rows must produce, computed independently in plain JS (test oracle). */
export const expectedReport = (scheduledUtc = SCHEDULED_UTC) => {
  const w = windowFor(scheduledUtc);
  const rows = SOURCE_ROWS.filter(([, , at]) => at >= w.from && at < w.to);
  const by = {};
  for (const [region, cents] of rows) by[region] = (by[region] ?? 0) + cents;
  const byRegion = Object.fromEntries(Object.keys(by).sort().map((k) => [k, by[k]]));
  return {window: w, row_count: rows.length, total_cents: rows.reduce((a, r) => a + r[1], 0), by_region: byRegion};
};

const SOURCE_DDL = `
  CREATE TABLE sales_source (
    id           INTEGER PRIMARY KEY,
    region       TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    sold_at_utc  TEXT NOT NULL
  );`;

// FLAWED: nothing in the schema says "one report per logical run". `ref` is not unique either.
const REPORTS_FLAWED = `
  CREATE TABLE reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type   TEXT NOT NULL,
    scheduled_utc TEXT NOT NULL,
    ref           TEXT NOT NULL,
    worker        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    row_count     INTEGER,
    total_cents   INTEGER,
    body          TEXT
  );`;

// CORRECTED: the logical-run key is a UNIQUE constraint. `ref` is a SECOND, unrelated UNIQUE constraint
// (a human-facing report reference), kept so a violation of a *different* constraint can be tested.
const REPORTS_CORRECTED = `
  CREATE TABLE reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type   TEXT NOT NULL,
    scheduled_utc TEXT NOT NULL,
    ref           TEXT NOT NULL UNIQUE,
    worker        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    row_count     INTEGER,
    total_cents   INTEGER,
    body          TEXT,
    UNIQUE (report_type, scheduled_utc)
  );`;

export const open = (file, timeoutMs = DEFAULT_BUSY_TIMEOUT_MS) => new DatabaseSync(file, {timeout: timeoutMs});

/** Create a fresh database file (removing leftovers), switch to WAL, create schema, seed source rows. */
export const initDb = (file, variant) => {
  for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(file + suffix, {force: true});
  const db = open(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(SOURCE_DDL);
  db.exec(variant === 'corrected' ? REPORTS_CORRECTED : REPORTS_FLAWED);
  const ins = db.prepare('INSERT INTO sales_source (region, amount_cents, sold_at_utc) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  for (const r of SOURCE_ROWS) ins.run(...r);
  db.exec('COMMIT');
  db.close();
};

/** Small, short, database-local computation. No I/O other than reading this database. */
export const computeReport = (db, scheduledUtc) => {
  const w = windowFor(scheduledUtc);
  const tot = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS total FROM sales_source WHERE sold_at_utc >= ? AND sold_at_utc < ?').get(w.from, w.to);
  const regions = db.prepare('SELECT region, SUM(amount_cents) AS total FROM sales_source WHERE sold_at_utc >= ? AND sold_at_utc < ? GROUP BY region ORDER BY region').all(w.from, w.to);
  return {window: w, row_count: Number(tot.n), total_cents: Number(tot.total), by_region: Object.fromEntries(regions.map((r) => [r.region, Number(r.total)]))};
};

export const reportsForRun = (db, reportType = REPORT_TYPE, scheduledUtc = SCHEDULED_UTC) =>
  db.prepare('SELECT id, report_type, scheduled_utc, ref, worker, status, row_count, total_cents, body FROM reports WHERE report_type = ? AND scheduled_utc = ? ORDER BY id').all(reportType, scheduledUtc).map((r) => ({...r}));

export const allReports = (db) =>
  db.prepare('SELECT id, report_type, scheduled_utc, ref, worker, status, row_count, total_cents, body FROM reports ORDER BY id').all().map((r) => ({...r}));

/** A committed row is complete only if it has status 'complete' and every result column filled in. */
export const isComplete = (r) => r.status === 'complete' && r.row_count !== null && r.total_cents !== null && r.body !== null;

/**
 * Map a node:sqlite error to what the scheduler/operator should do about it.
 *   retryable-busy       SQLITE_BUSY / SQLITE_LOCKED after the bounded busy timeout. Nothing is known about
 *                        whether another worker finished. Retry later. NOT "already completed".
 *   constraint-violation any other constraint failure (e.g. UNIQUE on reports.ref). A different problem
 *                        from "this logical run already exists". Not retryable by itself, not "completed".
 *   failed               anything else.
 */
export const classify = (err) => {
  const primary = typeof err?.errcode === 'number' ? err.errcode & 0xff : null;
  if (primary === SQLITE_BUSY || primary === SQLITE_LOCKED) return 'retryable-busy';
  if (primary === 19) return 'constraint-violation';
  return 'failed';
};
