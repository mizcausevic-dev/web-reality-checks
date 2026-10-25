// notes-db.mjs — a tiny notes store on top of PGlite (Postgres compiled to WASM).
//
// Shared by the Node tests (filesystem or memory:// data dir) and the browser app
// (idb:// data dir). The constructor takes the data directory string verbatim and
// passes it to PGlite, so the caller decides where the database lives:
//
//   new NotesDb('/tmp/some/dir')        Node: files on disk (NodeFS)        — persistent
//   new NotesDb('memory://')            Node or browser: in-memory FS        — NOT persistent
//   new NotesDb('idb://video-notes')    browser only: IndexedDB-backed FS    — persistent per origin + profile
//
// API verified against the installed @electric-sql/pglite 0.5.11
// (node_modules/@electric-sql/pglite/README.md and dist/pglite-*.d.ts):
//   new PGlite(dataDir?, options?)  — "Prefix with idb:// to use indexeddb filesystem in the
//                                     browser. Use memory:// to use in-memory filesystem."
//   db.waitReady: Promise<void>      — resolves once Postgres has started
//   db.query(sql, params?)           — parameterised query, returns {rows, ...}
//   db.exec(sql)                     — multi-statement execution
//   db.close(): Promise<void>        — shuts Postgres down; for persistent FS types the data
//                                     dir is flushed (PGlite syncs after each query already)
//   options.relaxedDurability        — exists but is deliberately NOT set here (default false).
//
// The `PGlite` constructor is injected so the browser bundle can pass the class from its
// local vendor copy and Node can pass the npm package; this file imports nothing itself.

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

export class NotesDb {
  /**
   * @param {string} dataDir  passed straight to PGlite (see header)
   * @param {{PGlite: any, options?: object}} deps  PGlite class (+ optional PGlite options)
   */
  constructor(dataDir, {PGlite, options = {}} = {}) {
    if (typeof dataDir !== 'string' || !dataDir) throw new Error('NotesDb requires a data dir string');
    if (!PGlite) throw new Error('NotesDb requires the PGlite class via deps.PGlite');
    if (options.relaxedDurability) throw new Error('relaxedDurability is deliberately not enabled in this fixture');
    this.dataDir = dataDir;
    this.kind = dataDir.startsWith('idb://') ? 'indexeddb' : dataDir.startsWith('memory://') ? 'memory' : 'filesystem';
    this.persistent = this.kind !== 'memory';
    this.pg = new PGlite(dataDir, options);
    this.ready = this.pg.waitReady.then(() => this.pg.exec(SCHEMA)).then(() => this);
  }

  /** Create a note; returns the stored row. */
  async create(title, body = '') {
    await this.ready;
    const r = await this.pg.query('INSERT INTO notes (title, body) VALUES ($1, $2) RETURNING *', [title, body]);
    return r.rows[0];
  }

  /** Case-insensitive substring search over title and body (ILIKE). */
  async search(term) {
    await this.ready;
    const r = await this.pg.query(
      'SELECT * FROM notes WHERE title ILIKE $1 OR body ILIKE $1 ORDER BY updated_at DESC, id DESC',
      [`%${term}%`]
    );
    return r.rows;
  }

  async list() {
    await this.ready;
    return (await this.pg.query('SELECT * FROM notes ORDER BY updated_at DESC, id DESC')).rows;
  }

  async get(id) {
    await this.ready;
    return (await this.pg.query('SELECT * FROM notes WHERE id = $1', [id])).rows[0] ?? null;
  }

  /** Edit title and/or body; returns the updated row or null when the id is absent. */
  async edit(id, {title, body} = {}) {
    await this.ready;
    const r = await this.pg.query(
      `UPDATE notes SET title = COALESCE($2, title), body = COALESCE($3, body), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, title ?? null, body ?? null]
    );
    return r.rows[0] ?? null;
  }

  /** Delete by id; returns true when a row was removed. */
  async remove(id) {
    await this.ready;
    const r = await this.pg.query('DELETE FROM notes WHERE id = $1', [id]);
    return (r.affectedRows ?? 0) > 0;
  }

  async count() {
    await this.ready;
    return (await this.pg.query('SELECT count(*)::int AS n FROM notes')).rows[0].n;
  }

  /** Close Postgres. After this the instance is unusable; open a new NotesDb on the same dataDir to continue. */
  async close() {
    await this.ready.catch(() => {});
    await this.pg.close();
  }
}
