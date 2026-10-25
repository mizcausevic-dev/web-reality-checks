// Episode 23 fixture: document store on node:sqlite (Node 22, DatabaseSync).
//
// Tables
//   docs        (id, title, body, version INTEGER, updated_by)
//   doc_members (doc_id, user_id)        <-- authorization data, deliberately SEPARATE from version logic
//
// Two write paths:
//   updateUnconditional  FLAWED     UPDATE ... WHERE id = ?                  (last writer wins)
//   updateIfVersion      CORRECTED  UPDATE ... WHERE id = ? AND version = ?  (ONE statement, changes() decides)
//
// There is no SELECT before the corrected UPDATE. The database evaluates "does the version still match?"
// and "replace content + increment version" as one atomic statement, so two writers holding the same
// expected version cannot both match.
import {DatabaseSync} from 'node:sqlite';

export const SEED = {
  doc_1: {title: 'Launch plan', body: 'Draft: audience, schedule.', version: 1, members: ['u_alice', 'u_bob']},
  doc_2: {title: 'Budget notes', body: 'Private to Bob.', version: 4, members: ['u_bob']},
};

/** SQLITE_BUSY (5) and SQLITE_LOCKED (6), including extended codes, are "try later", not conflicts. */
export const isBusyError = (e) => [5, 6].includes((e?.errcode ?? 0) & 0xff);

export const createDb = ({file = ':memory:', busyTimeoutMs = 0, seed = true} = {}) => {
  const sql = new DatabaseSync(file);
  sql.exec(`PRAGMA busy_timeout = ${Number(busyTimeoutMs) | 0}`);
  if (seed) {
    sql.exec(`
      CREATE TABLE IF NOT EXISTS docs (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL,
        version    INTEGER NOT NULL CHECK (version >= 1),
        updated_by TEXT
      );
      CREATE TABLE IF NOT EXISTS doc_members (
        doc_id  TEXT NOT NULL REFERENCES docs(id),
        user_id TEXT NOT NULL,
        PRIMARY KEY (doc_id, user_id)
      );
    `);
    const insDoc = sql.prepare('INSERT OR IGNORE INTO docs (id, title, body, version, updated_by) VALUES (?, ?, ?, ?, NULL)');
    const insMem = sql.prepare('INSERT OR IGNORE INTO doc_members (doc_id, user_id) VALUES (?, ?)');
    for (const [id, d] of Object.entries(SEED)) {
      insDoc.run(id, d.title, d.body, d.version);
      for (const u of d.members) insMem.run(id, u);
    }
  }

  const getDocQ = sql.prepare('SELECT id, title, body, version, updated_by AS updatedBy FROM docs WHERE id = ?');
  const memberQ = sql.prepare('SELECT 1 AS ok FROM doc_members WHERE doc_id = ? AND user_id = ?');
  const flawedQ = sql.prepare('UPDATE docs SET title = ?, body = ?, version = version + 1, updated_by = ? WHERE id = ?');
  // THE corrected statement: match document id AND current version; replace content; increment version.
  const condQ = sql.prepare('UPDATE docs SET title = ?, body = ?, version = version + 1, updated_by = ? WHERE id = ? AND version = ?');

  return {
    sql,
    /** Authorization lookup. Independent of version logic. */
    isMember: (docId, userId) => !!memberQ.get(docId, userId),
    getDoc: (id) => getDocQ.get(id) ?? null,
    /** FLAWED: replaces whatever is there. Always "succeeds" for an existing id. */
    updateUnconditional: (id, {title, body}, userId) => {
      const r = flawedQ.run(title, body, userId, id);
      return {changes: Number(r.changes)};
    },
    /**
     * CORRECTED: exactly one conditional UPDATE. `changes` (1 or 0) is the only decision input.
     * On success the new version is expectedVersion + 1: the statement set version = version + 1
     * for a row whose version was expectedVersion, atomically.
     */
    updateIfVersion: (id, expectedVersion, {title, body}, userId) => {
      const r = condQ.run(title, body, userId, id, expectedVersion);
      const changes = Number(r.changes);
      return {changes, version: changes === 1 ? expectedVersion + 1 : null};
    },
    reset: () => {
      sql.exec('DELETE FROM doc_members; DELETE FROM docs;');
      const insDoc = sql.prepare('INSERT INTO docs (id, title, body, version, updated_by) VALUES (?, ?, ?, ?, NULL)');
      const insMem = sql.prepare('INSERT INTO doc_members (doc_id, user_id) VALUES (?, ?)');
      for (const [id, d] of Object.entries(SEED)) {
        insDoc.run(id, d.title, d.body, d.version);
        for (const u of d.members) insMem.run(id, u);
      }
    },
    close: () => sql.close(),
  };
};
