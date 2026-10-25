// EP26 fixture: in-memory SQLite (node:sqlite) + a small query-counting wrapper.
//
// WHAT THE COUNTER COUNTS (explicit policy)
//   A statement is COUNTED only if all of these hold:
//     1. it was executed through the wrapper's prepare().all() / .get() / .run()  (execution, not preparation)
//     2. a scope is active (scoped('article-list', fn) is on the stack)
//     3. its SQL starts with SELECT
//   Always EXCLUDED from the demonstrated SELECT count, but still recorded in the log with a reason:
//     - setup: schema + seed run on the RAW connection before the wrapper exists, so they are never logged at all
//     - authentication: the session lookup runs through the wrapper but OUTSIDE the scope  -> "outside-scope"
//     - transaction control: BEGIN / COMMIT go through wrapper.exec() inside the scope      -> "transaction-control"
//     - instrumentation: the wrapper itself issues no SQL (it only wraps calls), so it adds nothing to count
//   Any scoped statement that is NOT a SELECT (e.g. an INSERT) is reported separately as `otherScoped`,
//   so "101 SELECTs" is never silently read as "101 statements".
import {DatabaseSync} from 'node:sqlite';
import {buildSeed} from './seed.mjs';

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE authors (
    id     INTEGER PRIMARY KEY,
    name   TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE
  );
  CREATE TABLE articles (
    id           INTEGER PRIMARY KEY,
    title        TEXT NOT NULL,
    published_on TEXT NOT NULL,
    author_id    INTEGER NOT NULL REFERENCES authors(id)
  );
  CREATE TABLE sessions (
    sid     TEXT PRIMARY KEY,
    user_id TEXT NOT NULL
  );
`;
// Note: no extra indexes are created. No performance claim in this fixture depends on indexing.

/** Raw connection with schema + seed. Setup: not instrumented, never counted. */
export const createRawDb = (seed = buildSeed()) => {
  const raw = new DatabaseSync(':memory:');
  raw.exec(SCHEMA);
  const insAuthor = raw.prepare('INSERT INTO authors (id, name, handle) VALUES (?, ?, ?)');
  const insArticle = raw.prepare('INSERT INTO articles (id, title, published_on, author_id) VALUES (?, ?, ?, ?)');
  raw.exec('BEGIN');
  for (const a of seed.authors) insAuthor.run(a.id, a.name, a.handle);
  for (const a of seed.articles) insArticle.run(a.id, a.title, a.published_on, a.author_id);
  raw.exec('COMMIT');
  return raw;
};

const kindOf = (sql) => (sql.trim().split(/\s+/)[0] || '').toUpperCase();
const squash = (sql) => sql.replace(/\s+/g, ' ').trim();

/**
 * Wrap a raw connection. Handlers receive ONLY this wrapper, never the raw connection,
 * so every statement they run is seen by the counter.
 */
export const instrument = (raw) => {
  const log = []; // every statement that passed through the wrapper
  let scope = null;
  let seq = 0;

  const record = (api, sql, params, rowCount) => {
    const kind = kindOf(sql);
    let counted = false;
    let excluded = null;
    if (!scope) excluded = 'outside-scope';
    else if (api === 'exec') excluded = 'transaction-control';
    else counted = kind === 'SELECT';
    const entry = {seq: ++seq, scope: scope ? scope.label : null, api, kind, sql: squash(sql), params, rowCount, counted, excluded};
    log.push(entry);
    if (scope) scope.entries.push(entry);
  };

  const prepare = (sql) => {
    const st = raw.prepare(sql);
    return {
      all: (...p) => { const r = st.all(...p); record('all', sql, p, r.length); return r; },
      get: (...p) => { const r = st.get(...p); record('get', sql, p, r === undefined ? 0 : 1); return r; },
      run: (...p) => { const r = st.run(...p); record('run', sql, p, Number(r.changes)); return r; },
    };
  };
  const exec = (sql) => { raw.exec(sql); record('exec', sql, [], 0); };

  /** Runs fn inside a counting scope and returns {result, report}. Scopes cannot nest. */
  const scoped = (label, fn) => {
    if (scope) throw new Error(`scope "${scope.label}" is already active; scopes do not nest`);
    scope = {label, entries: []};
    const s = scope;
    try {
      const result = fn();
      scope = null;
      return {result, report: summarise(s)};
    } finally {
      scope = null;
    }
  };

  const summarise = (s) => {
    const counted = s.entries.filter((e) => e.counted);
    return {
      label: s.label,
      selectCount: counted.length,
      otherScoped: s.entries.filter((e) => !e.counted && e.excluded === null).length,
      excludedInScope: s.entries.filter((e) => e.excluded === 'transaction-control').map((e) => e.sql),
      statements: s.entries,
    };
  };

  return {
    prepare, exec, scoped,
    log: () => log,
    outsideScope: () => log.filter((e) => e.scope === null),
  };
};

export const createDb = () => {
  const raw = createRawDb();
  const db = instrument(raw);
  return {raw, db};
};
