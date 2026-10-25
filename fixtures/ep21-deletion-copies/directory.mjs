// Episode 21 fixture: a synthetic contact directory with ONE primary table and several derived copies.
//
//   contacts       primary record (SQLite table; AUTOINCREMENT so deleted ids are never reused)
//   search_index   separate table of denormalised fields. Deliberately NO foreign key to contacts:
//                  it stands in for a separate search system that the primary DB cannot cascade into.
//   cache          deliberately implemented in-process application response cache (Map), keyed by
//                  normalised query. Invalidation policy: clear the WHOLE directory cache.
//   outbox         cleanup intent, written in the same transaction as the primary delete.
//   worker         in-process cleanup worker, driven by explicit runOnce() calls (no timers, no sleeps,
//                  no backoff), so every test and demo run is deterministic.
//
// Everything is synthetic. Uses node:sqlite (DatabaseSync, Node 22), in-memory.
import {DatabaseSync} from 'node:sqlite';

export const SEED = [
  {id: 1001, name: 'Ilse Varga', email: 'ilse.varga@example.test', phone: '555-0101', org: 'Northpier Labs'},
  {id: 1002, name: 'Tomas Brandt', email: 'tomas.brandt@example.test', phone: '555-0102', org: 'Northpier Labs'},
  {id: 1003, name: 'Dana Whitlock', email: 'dana.whitlock@example.test', phone: '555-0103', org: 'Harbourline Studio'},
  {id: 1004, name: 'Ravi Menon', email: 'ravi.menon@example.test', phone: '555-0104', org: 'Harbourline Studio'},
  {id: 1005, name: 'Sofia Calder', email: 'sofia.calder@example.test', phone: '555-0105', org: 'Quayside Co-op'},
];

export const STEPS = ['search_index', 'cache']; // cleanup order: index first, then cache

export const publicId = (n) => `c_${n}`;
export const parseId = (s) => {
  const m = /^c_(\d{1,9})$/.exec(String(s));
  return m ? Number(m[1]) : null;
};
const normalise = (q) => String(q ?? '').trim().toLowerCase();

export const createDirectory = ({maxAttempts = 3, seed = true} = {}) => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`
    CREATE TABLE contacts (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      org   TEXT NOT NULL
    );
    CREATE TABLE search_index (
      contact_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, org TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE TABLE outbox (
      event_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      contact_id INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
      attempts   INTEGER NOT NULL DEFAULT 0,
      steps_done TEXT NOT NULL DEFAULT '[]',
      last_error TEXT
    );
  `);

  const insContact = sql.prepare(`INSERT INTO contacts (id, name, email, phone, org) VALUES (?, ?, ?, ?, ?)`);
  const insContactAuto = sql.prepare(`INSERT INTO contacts (name, email, phone, org) VALUES (?, ?, ?, ?)`);
  const insIndex = sql.prepare(`INSERT OR REPLACE INTO search_index (contact_id, name, email, phone, org, text) VALUES (?, ?, ?, ?, ?, ?)`);
  const getContact = sql.prepare(`SELECT id, name, email, phone, org FROM contacts WHERE id = ?`);
  const delContact = sql.prepare(`DELETE FROM contacts WHERE id = ?`);
  const delIndex = sql.prepare(`DELETE FROM search_index WHERE contact_id = ?`);
  const searchIndex = sql.prepare(`SELECT contact_id, name, email, org FROM search_index WHERE text LIKE ? ORDER BY contact_id`);
  const hasIndex = sql.prepare(`SELECT 1 AS x FROM search_index WHERE contact_id = ?`);
  const insEvent = sql.prepare(`INSERT INTO outbox (type, contact_id) VALUES ('contact.deleted', ?)`);
  const getEvent = sql.prepare(`SELECT * FROM outbox WHERE event_id = ?`);
  const pendingEvents = sql.prepare(`SELECT * FROM outbox WHERE status = 'pending' ORDER BY event_id`);
  const eventsFor = sql.prepare(`SELECT * FROM outbox WHERE contact_id = ? ORDER BY event_id`);
  const allEvents = sql.prepare(`SELECT * FROM outbox ORDER BY event_id`);
  const markProgress = sql.prepare(`UPDATE outbox SET steps_done = ?, attempts = ?, last_error = ? WHERE event_id = ? AND status = 'pending'`);
  const markProcessed = sql.prepare(`UPDATE outbox SET status = 'processed', steps_done = ?, attempts = ?, last_error = NULL WHERE event_id = ? AND status = 'pending'`);
  const markFailed = sql.prepare(`UPDATE outbox SET status = 'failed', steps_done = ?, attempts = ?, last_error = ? WHERE event_id = ? AND status = 'pending'`);
  const reopen = sql.prepare(`UPDATE outbox SET status = 'pending', attempts = 0 WHERE event_id = ? AND status = 'failed'`);

  const tx = (fn) => {
    sql.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      sql.exec('COMMIT');
      return r;
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  };

  /* ---- deliberate, countdown-style fault injection: faults[name] = number of failures still to inject ---- */
  const faults = {search_index: 0, cache: 0, outbox_insert: 0};
  const injectFault = (name, times = 1) => {
    if (!(name in faults)) throw new Error(`unknown fault ${name}`);
    faults[name] = times;
  };
  const maybeFail = (name) => {
    if (faults[name] > 0) {
      faults[name] -= 1;
      throw new Error(`injected failure: ${name}`);
    }
  };

  /* ---- application response cache (deliberately implemented, in-process) ---- */
  const cache = new Map(); // normalised query -> {body, hits, storedAt}
  let cacheClock = 0;
  const cacheStats = {hits: 0, misses: 0, clears: 0};

  const indexText = (c) => `${c.name} ${c.email} ${c.phone} ${c.org}`.toLowerCase();
  const rowOut = (r) => ({id: publicId(r.contact_id), name: r.name, email: r.email, org: r.org});

  /** Create a contact and its index row in one transaction. (A real search system is usually updated
   *  asynchronously; synchronous indexing here keeps the fixture small.) Ids come from AUTOINCREMENT. */
  const createContact = (c) =>
    tx(() => {
      const r = c.id != null ? insContact.run(c.id, c.name, c.email, c.phone, c.org) : insContactAuto.run(c.name, c.email, c.phone, c.org);
      const id = c.id != null ? c.id : Number(r.lastInsertRowid);
      insIndex.run(id, c.name, c.email, c.phone, c.org, indexText(c));
      return publicId(id);
    });

  if (seed) for (const c of SEED) createContact(c);

  const getPrimary = (pid) => {
    const n = parseId(pid);
    if (n == null) return null;
    const r = getContact.get(n);
    return r ? {id: publicId(r.id), name: r.name, email: r.email, phone: r.phone, org: r.org} : null;
  };

  /** Directory search: response cache first, then the denormalised search index. Never touches `contacts`. */
  const search = (q) => {
    const key = normalise(q);
    const hit = cache.get(key);
    if (hit) {
      hit.hits += 1;
      cacheStats.hits += 1;
      return {query: key, results: JSON.parse(hit.body), cache: 'hit'};
    }
    cacheStats.misses += 1;
    const results = key === '' ? [] : searchIndex.all(`%${key}%`).map(rowOut);
    cache.set(key, {body: JSON.stringify(results), hits: 0, storedAt: ++cacheClock});
    return {query: key, results, cache: 'miss'};
  };

  /* ---- FLAWED delete: the primary row only ---- */
  const deleteContactFlawed = (pid) => {
    const n = parseId(pid);
    if (n == null) return {deleted: false};
    return {deleted: Number(delContact.run(n).changes) === 1};
  };

  /* ---- CORRECTED delete: primary delete + outbox event in ONE transaction ---- */
  const deleteContact = (pid) => {
    const n = parseId(pid);
    if (n == null) return null;
    return tx(() => {
      if (Number(delContact.run(n).changes) !== 1) return null; // absent or already deleted: no second event
      maybeFail('outbox_insert'); // failure here rolls the primary delete back as well
      const ev = insEvent.run(n);
      return {contactId: publicId(n), eventId: Number(ev.lastInsertRowid), cleanup: 'pending'};
    });
  };

  /* ---- cleanup steps: each one is idempotent (deleting what is already gone is a no-op) ---- */
  const stepImpl = {
    search_index: (n) => {
      maybeFail('search_index');
      delIndex.run(n);
    },
    cache: () => {
      maybeFail('cache');
      cache.clear(); // whole-directory invalidation: no dependency tracking is pretended
      cacheStats.clears += 1;
    },
  };

  const alerts = []; // in-process stand-in for paging/alerting; nothing leaves this process
  const view = (e) => (e ? {eventId: e.event_id, type: e.type, contactId: publicId(e.contact_id), status: e.status, attempts: e.attempts, stepsDone: JSON.parse(e.steps_done), lastError: e.last_error} : null);

  /** One attempt at one event: run the steps not yet done. Marks processed ONLY if every step succeeded. */
  const attempt = (e) => {
    const done = JSON.parse(e.steps_done);
    const attempts = e.attempts + 1;
    for (const s of STEPS) {
      if (done.includes(s)) continue;
      try {
        stepImpl[s](e.contact_id);
        done.push(s);
      } catch (err) {
        if (attempts >= maxAttempts) {
          markFailed.run(JSON.stringify(done), attempts, err.message, e.event_id);
          alerts.push({kind: 'cleanup_failed', eventId: e.event_id, contactId: publicId(e.contact_id), attempts, step: s, error: err.message});
        } else {
          markProgress.run(JSON.stringify(done), attempts, err.message, e.event_id);
        }
        return view(getEvent.get(e.event_id));
      }
    }
    markProcessed.run(JSON.stringify(done), attempts, e.event_id);
    return view(getEvent.get(e.event_id));
  };

  const worker = {
    /** One pass over all pending events, one attempt each. Failed events are NOT picked up again. */
    runOnce: () => pendingEvents.all().map(attempt),
    /** Re-run every cleanup step for an already-processed event (at-least-once redelivery). Status is untouched. */
    replay: (eventId) => {
      const e = getEvent.get(eventId);
      if (!e || e.status !== 'processed') throw new Error('replay is only defined for processed events');
      for (const s of STEPS) stepImpl[s](e.contact_id);
      return view(getEvent.get(eventId));
    },
    /** Operator action after investigating a failed event: reopen it with a fresh attempt budget. */
    retryFailed: (eventId) => {
      if (Number(reopen.run(eventId).changes) !== 1) throw new Error('event is not in failed state');
      return view(getEvent.get(eventId));
    },
  };

  /** Where does this contact still live? */
  const snapshot = (pid) => {
    const n = parseId(pid);
    const inCache = [];
    for (const [q, v] of cache) if (JSON.parse(v.body).some((r) => r.id === pid)) inCache.push(q);
    return {
      contactId: pid,
      primary: !!getContact.get(n),
      searchIndex: !!hasIndex.get(n),
      cacheQueriesContaining: inCache,
      cacheEntries: [...cache.keys()],
      outbox: eventsFor.all(n).map(view),
    };
  };

  return {
    sql, createContact, getPrimary, search, deleteContactFlawed, deleteContact, worker, snapshot, injectFault, faults,
    alerts, cache, cacheStats, maxAttempts,
    outbox: () => allEvents.all().map(view),
    searchIndexRows: () => sql.prepare(`SELECT contact_id FROM search_index ORDER BY contact_id`).all().map((r) => publicId(r.contact_id)),
    primaryIds: () => sql.prepare(`SELECT id FROM contacts ORDER BY id`).all().map((r) => publicId(r.id)),
  };
};
