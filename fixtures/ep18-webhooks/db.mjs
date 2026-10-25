// Episode 18 fixture: the receiver's local store.
//
// Backend: node:sqlite (DatabaseSync, Node 22) when available. If `node:sqlite` cannot be loaded,
// an in-process store with the SAME explicit transaction + UNIQUE semantics is used, and
// `db.kind` reports which one is active (`'sqlite'` or `'memory'`). README documents both.
//
// Tables
//   webhook_events  (provider, event_id, subscription_id, version, outcome, received_at)
//                   UNIQUE (provider, event_id)      <-- dedup is a database constraint, not a lookup
//   subscriptions   (subscription_id PRIMARY KEY, version, status, plan, snapshot_json, updated_at)
//
// applyEvent() does, in ONE transaction:
//   1. INSERT the event record  -> UNIQUE violation means "already handled": roll back, report duplicate
//   2. compare incoming version with stored version
//   3. if newer: write the full snapshot as the new state (outcome 'applied'); else outcome 'stale'
//   4. COMMIT (or, when the caller injects a commit failure, ROLLBACK and throw)
// Nothing outside the database is touched. No emails, no billing calls, no queues.
import crypto from 'node:crypto';

let DatabaseSync = null;
try {
  ({DatabaseSync} = await import('node:sqlite'));
} catch {
  DatabaseSync = null;
}

const nowIso = () => new Date().toISOString();

/* ---------------- SQLite backend ---------------- */
const sqliteBackend = () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`
    CREATE TABLE webhook_events (
      provider        TEXT NOT NULL,
      event_id        TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      version         INTEGER NOT NULL,
      outcome         TEXT NOT NULL,
      received_at     TEXT NOT NULL,
      UNIQUE (provider, event_id)
    );
    CREATE TABLE subscriptions (
      subscription_id TEXT PRIMARY KEY,
      version         INTEGER NOT NULL,
      status          TEXT NOT NULL,
      plan            TEXT NOT NULL,
      snapshot_json   TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );
  `);
  const insEvent = sql.prepare(`INSERT INTO webhook_events (provider, event_id, subscription_id, version, outcome, received_at) VALUES (?, ?, ?, ?, ?, ?)`);
  const setOutcome = sql.prepare(`UPDATE webhook_events SET outcome = ? WHERE provider = ? AND event_id = ?`);
  const getSub = sql.prepare(`SELECT subscription_id, version, status, plan, snapshot_json, updated_at FROM subscriptions WHERE subscription_id = ?`);
  const upsertSub = sql.prepare(`INSERT INTO subscriptions (subscription_id, version, status, plan, snapshot_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(subscription_id) DO UPDATE SET version = excluded.version, status = excluded.status, plan = excluded.plan, snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`);
  const listEvents = sql.prepare(`SELECT provider, event_id, subscription_id, version, outcome, received_at FROM webhook_events ORDER BY rowid`);
  const countEvents = sql.prepare(`SELECT COUNT(*) AS n FROM webhook_events`);
  const rowToState = (r) => (r ? {subscription_id: r.subscription_id, version: Number(r.version), status: r.status, plan: r.plan, snapshot: JSON.parse(r.snapshot_json), updated_at: r.updated_at} : null);
  return {
    kind: 'sqlite',
    begin: () => sql.exec('BEGIN IMMEDIATE'),
    commit: () => sql.exec('COMMIT'),
    rollback: () => sql.exec('ROLLBACK'),
    insertEvent: (e) => { insEvent.run(e.provider, e.event_id, e.subscription_id, e.version, e.outcome, e.received_at); },
    setOutcome: (provider, eventId, outcome) => { setOutcome.run(outcome, provider, eventId); },
    getState: (id) => rowToState(getSub.get(id)),
    setState: (s) => { upsertSub.run(s.subscription_id, s.version, s.status, s.plan, JSON.stringify(s.snapshot), s.updated_at); },
    listEvents: () => listEvents.all().map((r) => ({...r, version: Number(r.version)})),
    countEvents: () => Number(countEvents.get().n),
    isUniqueViolation: (e) => /UNIQUE constraint failed/.test(e.message),
    close: () => sql.close(),
  };
};

/* ---------------- In-process fallback backend ---------------- */
// Explicit transaction: a transaction works on a staged copy; COMMIT swaps it in, ROLLBACK discards it.
// UNIQUE (provider, event_id) is enforced by insertEvent throwing the same error text SQLite uses.
const memoryBackend = () => {
  let committed = {events: [], eventKeys: new Set(), subs: new Map()};
  let staged = null;
  const view = () => staged ?? committed;
  const clone = (s) => ({events: s.events.map((e) => ({...e})), eventKeys: new Set(s.eventKeys), subs: new Map([...s.subs].map(([k, v]) => [k, {...v}]))});
  return {
    kind: 'memory',
    begin: () => { if (staged) throw new Error('cannot start a transaction within a transaction'); staged = clone(committed); },
    commit: () => { if (!staged) throw new Error('no transaction is active'); committed = staged; staged = null; },
    rollback: () => { if (!staged) throw new Error('no transaction is active'); staged = null; },
    insertEvent: (e) => {
      const key = `${e.provider}\u0000${e.event_id}`;
      if (view().eventKeys.has(key)) throw new Error('UNIQUE constraint failed: webhook_events.provider, webhook_events.event_id');
      view().eventKeys.add(key);
      view().events.push({...e});
    },
    setOutcome: (provider, eventId, outcome) => { const r = view().events.find((x) => x.provider === provider && x.event_id === eventId); if (r) r.outcome = outcome; },
    getState: (id) => { const s = view().subs.get(id); return s ? {...s, snapshot: {...s.snapshot}} : null; },
    setState: (s) => { view().subs.set(s.subscription_id, {...s, snapshot: {...s.snapshot}}); },
    listEvents: () => committed.events.map((e) => ({...e})),
    countEvents: () => committed.events.length,
    isUniqueViolation: (e) => /UNIQUE constraint failed/.test(e.message),
    close: () => {},
  };
};

export const sqliteAvailable = () => DatabaseSync !== null;

export const createDb = ({force} = {}) => {
  const be = force === 'memory' || (!force && !DatabaseSync) ? memoryBackend() : sqliteBackend();

  /**
   * Corrected path. `ev` is the VALIDATED event. `failCommit` simulates a commit that cannot complete
   * (e.g. the database going away) so the caller can prove the state is unchanged and no 2xx is sent.
   * Returns {outcome: 'applied' | 'stale' | 'duplicate', storedVersion, state}.
   */
  const applyEvent = (provider, ev, {failCommit = false} = {}) => {
    be.begin();
    try {
      // 1. Record the event. The UNIQUE constraint is the dedup decision; there is no SELECT-then-INSERT race.
      be.insertEvent({provider, event_id: ev.event_id, subscription_id: ev.subscription_id, version: ev.version, outcome: 'pending', received_at: nowIso()});
      // 2. Compare versions.
      const cur = be.getState(ev.subscription_id);
      const storedVersion = cur ? cur.version : 0;
      let outcome;
      if (ev.version > storedVersion) {
        // 3. Newer: the event carries a FULL snapshot, so setting state from it is safe here.
        be.setState({subscription_id: ev.subscription_id, version: ev.version, status: ev.snapshot.status, plan: ev.snapshot.plan, snapshot: ev.snapshot, updated_at: nowIso()});
        outcome = 'applied';
      } else {
        outcome = 'stale'; // older or equal version arriving late: recorded, not applied
      }
      be.setOutcome(provider, ev.event_id, outcome);
      if (failCommit) throw new Error('SIMULATED: commit failed (storage unavailable)');
      // 4. Commit. Only after this returns may the HTTP layer answer 2xx.
      be.commit();
      return {outcome, storedVersion, state: be.getState(ev.subscription_id)};
    } catch (e) {
      be.rollback(); // event record AND any state change are undone together
      if (be.isUniqueViolation(e)) {
        return {outcome: 'duplicate', storedVersion: be.getState(ev.subscription_id)?.version ?? 0, state: be.getState(ev.subscription_id)};
      }
      throw e;
    }
  };

  /** Naive path (known-positive control): overwrite state with whatever arrived. No dedup, no version check. */
  const applyNaive = (ev) => {
    be.begin();
    be.setState({subscription_id: ev.subscription_id, version: ev.version, status: ev.snapshot.status, plan: ev.snapshot.plan, snapshot: ev.snapshot, updated_at: nowIso()});
    be.commit();
    return be.getState(ev.subscription_id);
  };

  return {
    kind: be.kind,
    applyEvent,
    applyNaive,
    getState: (id) => be.getState(id),
    listEvents: () => be.listEvents(),
    countEvents: () => be.countEvents(),
    /** Stable digest of all subscription state, used to prove "replay changed nothing". */
    stateDigest: (ids) => crypto.createHash('sha256').update(JSON.stringify(ids.map((id) => { const s = be.getState(id); return s && {id, version: s.version, status: s.status, plan: s.plan}; }))).digest('hex').slice(0, 16),
    close: () => be.close(),
  };
};
