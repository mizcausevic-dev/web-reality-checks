// Episode 15 fixture: transactional local store for mock orders + idempotency records.
// Uses node:sqlite (DatabaseSync, Node 22). In-memory, synthetic data only.
//
// Tables
//   orders       (id, user_id, sku, qty, amount_cents, currency, via, created_at)
//   idempotency  (user_id, operation, key, fingerprint, status, body, order_id, created_at)
//                UNIQUE (user_id, operation, key)   <-- the atomic uniqueness guarantee
//
// Retention policy (deliberate, for this fixture): idempotency records live for the lifetime
// of the in-memory database. A production service would expire them; see README for the
// consequence (a sufficiently late retry would be treated as a new request).
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';

export const createDb = () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE orders (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT NOT NULL,
      sku          TEXT NOT NULL,
      qty          INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency     TEXT NOT NULL,
      via          TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );
    CREATE TABLE idempotency (
      user_id     TEXT NOT NULL,
      operation   TEXT NOT NULL,
      key         TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      status      INTEGER NOT NULL,
      body        TEXT NOT NULL,
      order_id    INTEGER NOT NULL REFERENCES orders(id),
      created_at  TEXT NOT NULL,
      UNIQUE (user_id, operation, key)
    );
  `);

  const insOrder = sql.prepare(`INSERT INTO orders (user_id, sku, qty, amount_cents, currency, via, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insIdem = sql.prepare(`INSERT INTO idempotency (user_id, operation, key, fingerprint, status, body, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const getIdem = sql.prepare(`SELECT fingerprint, status, body, order_id FROM idempotency WHERE user_id = ? AND operation = ? AND key = ?`);
  const countOrders = sql.prepare(`SELECT COUNT(*) AS n FROM orders WHERE user_id = ?`);
  const listOrders = sql.prepare(`SELECT id, sku, qty, amount_cents, currency, via, created_at FROM orders WHERE user_id = ? ORDER BY id`);
  const now = () => new Date().toISOString();

  /** Vulnerable path: one insert per call, nothing else. */
  const createOrder = (userId, fields, via = 'vulnerable') => {
    const r = insOrder.run(userId, fields.sku, fields.qty, fields.amountCents, fields.currency, via, now());
    return Number(r.lastInsertRowid);
  };

  /**
   * Corrected path. ONE transaction inserts the order and the idempotency record; the UNIQUE
   * constraint on (user_id, operation, key) is what makes "first writer wins" atomic. There is no
   * separate SELECT-then-INSERT decision: a concurrent writer that loses the race hits the
   * constraint, the transaction is rolled back, and the stored record is returned instead.
   *
   * Returns {kind: 'created'|'replayed'|'mismatch', status, body, orderId}.
   */
  const createOrderIdempotent = (userId, operation, key, fields, fingerprint, via = 'corrected', {skipPrecheck = false} = {}) => {
    // The pre-read is an optimisation only. Correctness comes from the UNIQUE constraint below;
    // tests pass skipPrecheck to prove the constraint path alone is sufficient.
    const existing = skipPrecheck ? null : getIdem.get(userId, operation, key);
    if (existing) return resolveExisting(existing, fingerprint);
    sql.exec('BEGIN IMMEDIATE');
    try {
      const orderId = Number(insOrder.run(userId, fields.sku, fields.qty, fields.amountCents, fields.currency, via, now()).lastInsertRowid);
      const body = JSON.stringify({endpoint: 'corrected', orderId, authenticatedAs: userId, sku: fields.sku, qty: fields.qty, amountCents: fields.amountCents, currency: fields.currency});
      insIdem.run(userId, operation, key, fingerprint, 201, body, orderId, now());
      sql.exec('COMMIT');
      return {kind: 'created', status: 201, body, orderId};
    } catch (e) {
      sql.exec('ROLLBACK'); // the order insert is undone with the failed key insert
      if (/UNIQUE constraint failed/.test(e.message)) {
        // lost a race: return what the winner committed (or a mismatch if payload differs)
        return resolveExisting(getIdem.get(userId, operation, key), fingerprint);
      }
      throw e;
    }
  };
  const resolveExisting = (row, fingerprint) =>
    row.fingerprint === fingerprint
      ? {kind: 'replayed', status: row.status, body: row.body, orderId: row.order_id}
      : {kind: 'mismatch', status: 422, body: JSON.stringify({error: 'idempotency key reused with a different request'}), orderId: row.order_id};

  return {
    sql,
    createOrder,
    createOrderIdempotent,
    countOrders: (userId) => Number(countOrders.get(userId).n),
    listOrders: (userId) => listOrders.all(userId),
    hasIdempotencyRecord: (userId, operation, key) => !!getIdem.get(userId, operation, key),
    clear: () => sql.exec('DELETE FROM idempotency; DELETE FROM orders; DELETE FROM sqlite_sequence;'),
    close: () => sql.close(),
  };
};

/**
 * Request fingerprint: canonical JSON (sorted keys) of the VALIDATED, normalised fields only.
 * Raw body bytes are not fingerprinted, so key order / whitespace differences do not matter,
 * while a materially different request (other sku, qty, amount) does.
 */
export const fingerprintOf = (fields) => {
  const canon = JSON.stringify(Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]])));
  return crypto.createHash('sha256').update(canon).digest('hex');
};
