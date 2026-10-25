"""Synthetic shop application used by the EP25 restore-test fixture (stdlib only).

Schema, seed data, the application's real order-total query, and the *expected*
values that a restored copy must reproduce. Expected values are derived from the
seed specification in pure Python (no SQL), so they are independent of any database.
"""
import datetime
import sqlite3

SCHEMA_VERSION = 3  # stored in PRAGMA user_version
TABLES = ["customers", "orders"]

SCHEMA = """
CREATE TABLE customers (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  email  TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL
);
CREATE TABLE orders (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  status       TEXT NOT NULL CHECK (status IN ('paid','shipped','cancelled')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  placed_on    TEXT NOT NULL
);
CREATE INDEX orders_customer ON orders(customer_id);
"""

# The application's real "customer order totals" query (cancelled orders are not counted).
ORDER_TOTALS_SQL = """
SELECT c.id, c.name, COUNT(o.id) AS orders, COALESCE(SUM(o.amount_cents), 0) AS total_cents
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled'
GROUP BY c.id
ORDER BY c.id
"""

CUSTOMER_NAMES = ["Ada Example", "Bram Sample", "Cleo Test", "Dev Fixture", "Esme Mock", "Farid Demo",
                  "Gwen Synthetic", "Hugo Placeholder", "Ines Dummy", "Jonas Stub", "Kira Trial", "Lev Sandbox"]
REGIONS = ["north", "south", "east", "west"]


def seed_customers():
    return [(i + 1, n, f"customer{i + 1:02d}@example.test", REGIONS[i % 4]) for i, n in enumerate(CUSTOMER_NAMES)]


def seed_orders():
    base = datetime.date(2026, 1, 1)
    rows = []
    for i in range(1, 41):
        status = "cancelled" if i % 9 == 0 else ("shipped" if i % 2 == 0 else "paid")
        rows.append((i, (i * 5) % 12 + 1, status, 1500 + (i * 7919) % 9000, (base + datetime.timedelta(days=i)).isoformat()))
    return rows


def expected_totals():
    """[(customer_id, name, order_count, total_cents)] computed without SQL."""
    out = []
    for cid, name, _e, _r in seed_customers():
        mine = [o for o in seed_orders() if o[1] == cid and o[2] != "cancelled"]
        out.append((cid, name, len(mine), sum(o[3] for o in mine)))
    return out


EXPECTED = {
    "user_version": SCHEMA_VERSION,
    "tables": sorted(TABLES),
    "counts": {"customers": len(seed_customers()), "orders": len(seed_orders())},
    "orders_sum_cents": sum(o[3] for o in seed_orders()),
    # selected known values: (table, key column, key, column, expected)
    "known": [
        ("customers", "id", 1, "email", "customer01@example.test"),
        ("customers", "id", 12, "name", "Lev Sandbox"),
        ("orders", "id", 1, "amount_cents", seed_orders()[0][3]),
        ("orders", "id", 17, "customer_id", seed_orders()[16][1]),
        ("orders", "id", 40, "status", seed_orders()[39][2]),
    ],
    "totals": expected_totals(),
}


def connect(path, uri=False):
    """Application connection: foreign-key enforcement is a per-connection setting, so turn it on here."""
    conn = sqlite3.connect(path, uri=uri)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_and_seed(path, wal=True):
    conn = connect(path)
    if wal:
        conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(SCHEMA)
    conn.executemany("INSERT INTO customers VALUES (?,?,?,?)", seed_customers())
    conn.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", seed_orders())
    conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    conn.commit()
    return conn


def order_totals(conn):
    return [tuple(r) for r in conn.execute(ORDER_TOTALS_SQL)]
