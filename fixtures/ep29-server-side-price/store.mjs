// Episode 29 fixture: SQLite store for a MOCK checkout. node:sqlite (DatabaseSync, Node 22).
// Integer cents only, one currency (USD), synthetic data, no payment provider.
//
// Tables
//   products     (id, name, unit_price_cents, currency, available)   <- the pricing authority
//   orders       (id, via, currency, total_cents, created_at)
//   order_lines  (id, order_id, product_id, quantity, unit_price_cents, line_total_cents)
//                unit_price_cents is the PRICE SNAPSHOT taken inside the order transaction.
//
// Not modelled (deliberate exclusions): taxes, discounts, shipping, inventory reservation, payment.
import {DatabaseSync} from 'node:sqlite';

export const CURRENCY = 'USD';
export const MAX_QUANTITY = 100; // documented policy: 1..100 inclusive
export const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** Integer-only money formatting (BigInt division: no floating point anywhere). */
export const formatUsd = (cents) => {
  const c = BigInt(cents);
  return `$${c / 100n}.${String(c % 100n).padStart(2, '0')}`;
};

export const SEED = [
  {id: 'p_mug', name: 'Synthetic mug', unitPriceCents: 1000, available: 1}, // the "$10" on the page
  {id: 'p_tote', name: 'Synthetic tote bag', unitPriceCents: 2500, available: 1},
  {id: 'p_retired', name: 'Retired poster', unitPriceCents: 700, available: 0},
];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
    currency         TEXT NOT NULL CHECK (currency = 'USD'),
    available        INTEGER NOT NULL CHECK (available IN (0, 1))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    via         TEXT NOT NULL,
    currency    TEXT NOT NULL,
    total_cents INTEGER NOT NULL CHECK (total_cents > 0),
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_lines (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL REFERENCES orders(id),
    product_id       TEXT NOT NULL REFERENCES products(id),
    quantity         INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND ${MAX_QUANTITY}),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
    line_total_cents INTEGER NOT NULL CHECK (line_total_cents > 0)
  );
`;

/** Open a connection. `timeout` is SQLite's busy timeout in ms (0 = fail immediately with SQLITE_BUSY). */
export const openConnection = (path, {timeout = 0} = {}) => new DatabaseSync(path, {timeout});

/** Create schema and seed the catalog on a fresh database file. */
export const initDatabase = (path) => {
  const db = openConnection(path);
  db.exec(SCHEMA);
  const ins = db.prepare(`INSERT OR IGNORE INTO products (id, name, unit_price_cents, currency, available) VALUES (?, ?, ?, ?, ?)`);
  for (const p of SEED) ins.run(p.id, p.name, p.unitPriceCents, CURRENCY, p.available);
  db.close();
};

const isPosSafeInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;

/** Validate request fields. Strings, floats, NaN, zero, negatives, and out-of-range values are rejected. */
export const validateOrderRequest = (b, {requirePrice}) => {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return {error: 'body must be a JSON object'};
  if (typeof b.productId !== 'string' || !/^[a-z0-9_]{1,40}$/.test(b.productId)) return {error: 'invalid productId', field: 'productId'};
  if (!isPosSafeInt(b.quantity) || b.quantity > MAX_QUANTITY) return {error: `quantity must be an integer number from 1 to ${MAX_QUANTITY}`, field: 'quantity'};
  const out = {productId: b.productId, quantity: b.quantity};
  const priceField = requirePrice; // 'unitPriceCents' (flawed) or 'expectedUnitPriceCents' (corrected)
  if (!isPosSafeInt(b[priceField])) return {error: `${priceField} must be a positive safe integer number of cents`, field: priceField};
  out.price = b[priceField];
  if (requirePrice === 'expectedUnitPriceCents' && b.confirmPriceCents !== undefined) {
    if (!isPosSafeInt(b.confirmPriceCents)) return {error: 'confirmPriceCents must be a positive safe integer number of cents', field: 'confirmPriceCents'};
    out.confirmPriceCents = b.confirmPriceCents;
  }
  return {fields: out};
};

/** Exact (BigInt) check that a * b stays inside the JS safe-integer range. Returns the product or null. */
export const safeProduct = (a, b) => {
  const p = BigInt(a) * BigInt(b);
  return p <= MAX_SAFE ? Number(p) : null;
};

export const createStore = (path) => {
  // The application connection waits briefly for a write lock instead of failing at once.
  const db = openConnection(path, {timeout: 2000});
  const getProduct = db.prepare(`SELECT id, name, unit_price_cents, currency, available FROM products WHERE id = ?`);
  const insOrder = db.prepare(`INSERT INTO orders (via, currency, total_cents, created_at) VALUES (?, ?, ?, ?)`);
  const insLine = db.prepare(`INSERT INTO order_lines (order_id, product_id, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?)`);
  const now = () => new Date().toISOString();
  const present = (p) => p && {productId: p.id, name: p.name, unitPriceCents: p.unit_price_cents, display: formatUsd(p.unit_price_cents), currency: p.currency, available: p.available === 1};

  const rollback = () => { try { db.exec('ROLLBACK'); } catch { /* no transaction open */ } };
  const orderBody = (orderId, via, productId, quantity, unit, lineTotal) => ({
    orderId, via, productId, quantity, currency: CURRENCY, unitPriceCents: unit, lineTotalCents: lineTotal, totalCents: lineTotal,
  });

  /** FLAWED: the client-submitted unit price is used as the pricing authority. */
  const createOrderFlawed = (f) => {
    const p = getProduct.get(f.productId); // existence/availability still checked: only the price is trusted
    if (!p) return {status: 404, body: {error: 'unknown_product'}};
    if (!p.available) return {status: 409, body: {error: 'product_unavailable'}};
    const total = safeProduct(f.price, f.quantity);
    if (total === null) return {status: 422, body: {error: 'total_out_of_range'}};
    db.exec('BEGIN IMMEDIATE');
    try {
      const orderId = Number(insOrder.run('flawed', CURRENCY, total, now()).lastInsertRowid);
      insLine.run(orderId, f.productId, f.quantity, f.price, total); // <-- client price stored as the snapshot
      db.exec('COMMIT');
      return {status: 201, body: orderBody(orderId, 'flawed', f.productId, f.quantity, f.price, total)};
    } catch (e) { rollback(); throw e; }
  };

  /**
   * CORRECTED. ONE short transaction (BEGIN IMMEDIATE: SQLite takes the write lock up front, so no other
   * connection can change a catalog row until COMMIT/ROLLBACK). Inside it we read the authoritative price,
   * compare the client's expected/confirmed price to it, and insert order + order line with the snapshot.
   * hooks.afterCatalogRead(product) fires inside the transaction after the catalog read (test barrier point).
   */
  const createOrderCorrected = (f, hooks = {}) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const p = getProduct.get(f.productId);
      if (hooks.afterCatalogRead) hooks.afterCatalogRead(p);
      if (!p) { rollback(); return {status: 404, body: {error: 'unknown_product'}}; }
      if (!p.available) { rollback(); return {status: 409, body: {error: 'product_unavailable', productId: p.id}}; }
      const unit = p.unit_price_cents;
      const total = safeProduct(unit, f.quantity);
      if (total === null) { rollback(); return {status: 422, body: {error: 'total_out_of_range', productId: p.id, maxQuantity: MAX_QUANTITY}}; }
      // expected/confirmed price is a COMPARISON value only. If the client confirms, the confirmation replaces
      // the expectation and must itself equal the price in force right now.
      const accepted = f.confirmPriceCents ?? f.price;
      if (accepted !== unit) {
        rollback();
        return {status: 409, body: {
          error: 'price_changed',
          message: 'The price you were shown is not the current price. No order was created.',
          quote: {productId: p.id, quantity: f.quantity, currency: CURRENCY, expectedUnitPriceCents: f.price, currentUnitPriceCents: unit, currentDisplay: formatUsd(unit), totalCents: total, totalDisplay: formatUsd(total)},
          requiresConfirmation: true,
          confirmWith: {confirmPriceCents: unit},
        }};
      }
      const orderId = Number(insOrder.run('corrected', CURRENCY, total, now()).lastInsertRowid);
      insLine.run(orderId, p.id, f.quantity, unit, total); // snapshot = price read inside this transaction
      db.exec('COMMIT');
      return {status: 201, body: orderBody(orderId, 'corrected', p.id, f.quantity, unit, total)};
    } catch (e) {
      rollback();
      if (/database is locked|SQLITE_BUSY/i.test(String(e.message))) return {status: 503, body: {error: 'busy_try_again'}};
      throw e;
    }
  };

  /**
   * KNOWN-POSITIVE CONTROL for the race (NOT exposed over HTTP): catalog read and order insert are separate
   * statements with no transaction around them. hooks.afterCatalogRead fires in the gap.
   */
  const createOrderNoTransaction = (f, hooks = {}) => {
    const p = getProduct.get(f.productId);
    if (hooks.afterCatalogRead) hooks.afterCatalogRead(p);
    const unit = p.unit_price_cents;
    const total = safeProduct(unit, f.quantity);
    const orderId = Number(insOrder.run('no_transaction_control', CURRENCY, total, now()).lastInsertRowid);
    insLine.run(orderId, p.id, f.quantity, unit, total);
    return {status: 201, body: orderBody(orderId, 'no_transaction_control', p.id, f.quantity, unit, total)};
  };

  return {
    db,
    quote: (id) => present(getProduct.get(id)),
    catalog: () => db.prepare(`SELECT id, name, unit_price_cents, currency, available FROM products WHERE available = 1 ORDER BY id`).all().map(present),
    currentPriceCents: (id) => getProduct.get(id)?.unit_price_cents,
    createOrderFlawed, createOrderCorrected, createOrderNoTransaction,
    countOrders: () => db.prepare(`SELECT COUNT(*) AS n FROM orders`).get().n,
    countLines: () => db.prepare(`SELECT COUNT(*) AS n FROM order_lines`).get().n,
    listOrders: () => db.prepare(`SELECT o.id AS orderId, o.via, o.total_cents AS totalCents, l.product_id AS productId, l.quantity, l.unit_price_cents AS unitPriceCents, l.line_total_cents AS lineTotalCents FROM orders o JOIN order_lines l ON l.order_id = o.id ORDER BY o.id`).all().map((r) => ({...r})),
    clearOrders: () => { db.exec('DELETE FROM order_lines; DELETE FROM orders;'); },
    close: () => db.close(),
  };
};
