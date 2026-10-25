"""Build the source database, a good backup and a set of deliberately bad artifacts. Stdlib only.

usage: python3 make_artifacts.py OUTDIR      (OUTDIR must be new/empty)
Prints a JSON manifest. Bad artifacts are labelled; each is built by explicit construction,
not by random truncation, so the failure is deterministic.
"""
import json
import os
import sqlite3
import sys

import shop
from backup import make_backup


def file_info(p):
    return {"path": p, "bytes": os.path.getsize(p) if os.path.exists(p) else None}


def clone(src, dst):
    """Copy a *closed, standalone* database through the Online Backup API (never a raw file copy)."""
    make_backup(src, dst)


def main(out):
    os.makedirs(out, exist_ok=False)
    p = lambda n: os.path.join(out, n)
    m = {"files": {}}

    # --- foreign-key enforcement on application connections -------------------------------------------------
    app = shop.create_and_seed(p("source.db"), wal=True)
    m["journalMode"] = app.execute("PRAGMA journal_mode").fetchone()[0]
    m["fkEnforcement"] = {"applicationConnectionPragma": app.execute("PRAGMA foreign_keys").fetchone()[0]}
    try:
        app.execute("INSERT INTO orders VALUES (9001, 999, 'paid', 100, '2026-06-01')")
        m["fkEnforcement"]["orphanInsertRejected"] = False
    except sqlite3.IntegrityError as e:
        m["fkEnforcement"]["orphanInsertRejected"] = True
        m["fkEnforcement"]["error"] = str(e)
    raw = sqlite3.connect(p("source.db"))  # a plain connection: SQLite's default is enforcement OFF
    m["fkEnforcement"]["plainConnectionPragma"] = raw.execute("PRAGMA foreign_keys").fetchone()[0]
    raw.close()
    app.close()  # source is now quiescent: no open connections, no writers

    # --- the good backup, via the Online Backup API -------------------------------------------------------------
    m["backup"] = make_backup(p("source.db"), p("good.bak"))
    m["sidecarsNextToBackup"] = [f for f in os.listdir(out) if f.startswith("good.bak-")]
    m["files"]["good"] = p("good.bak")

    # --- later source write: the backup must NOT contain it ---------------------------------------------------
    app = shop.connect(p("source.db"))
    app.execute("INSERT INTO orders VALUES (5001, 1, 'paid', 12345, '2026-06-01')")
    app.commit()
    m["sourceAfterLaterWrite"] = {"orders": app.execute("SELECT count(*) FROM orders").fetchone()[0]}
    app.close()

    # --- invalid artifact 1: not a SQLite database at all -------------------------------------------------------
    with open(p("not_a_database.bak"), "wb") as f:
        f.write(b"THIS IS NOT A SQLITE DATABASE. It is a text file named like a backup.\n" * 4)
    m["files"]["not_a_database"] = p("not_a_database.bak")

    # --- invalid artifact 2: valid SQLite, required table missing ----------------------------------------------
    c = sqlite3.connect(p("missing_table.bak"))
    c.executescript("CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, region TEXT NOT NULL);")
    c.executemany("INSERT INTO customers VALUES (?,?,?,?)", shop.seed_customers())
    c.execute(f"PRAGMA user_version = {shop.SCHEMA_VERSION}")
    c.commit(); c.close()
    m["files"]["missing_table"] = p("missing_table.bak")

    # --- invalid artifact 3: wrong schema version ---------------------------------------------------------------
    clone(p("good.bak"), p("old_schema.bak"))
    c = sqlite3.connect(p("old_schema.bak")); c.execute("PRAGMA user_version = 2"); c.commit(); c.close()
    m["files"]["old_schema"] = p("old_schema.bak")

    # --- invalid artifact 4: orphan order, SAME record counts, foreign keys OFF while writing --------------------
    clone(p("good.bak"), p("orphan_same_counts.bak"))
    c = sqlite3.connect(p("orphan_same_counts.bak"))  # plain connection: foreign_keys is OFF
    c.execute("UPDATE orders SET customer_id = 999 WHERE id = 23")
    c.commit(); c.close()
    m["files"]["orphan_same_counts"] = p("orphan_same_counts.bak")

    # --- invalid artifact 5: SAME counts, no orphans, one wrong value ------------------------------------------
    clone(p("good.bak"), p("wrong_value_same_counts.bak"))
    c = sqlite3.connect(p("wrong_value_same_counts.bak"))
    c.execute("UPDATE orders SET amount_cents = amount_cents + 100 WHERE id = 23")
    c.commit(); c.close()
    m["files"]["wrong_value_same_counts"] = p("wrong_value_same_counts.bak")

    # --- control: live WAL database, copying only the main file ---------------------------------------------------
    live = p("live.db")
    w = shop.connect(live)
    w.execute("PRAGMA journal_mode = WAL")
    w.execute("PRAGMA wal_autocheckpoint = 0")  # keep committed work in the -wal file while the writer is open
    w.executescript(shop.SCHEMA)
    w.executemany("INSERT INTO customers VALUES (?,?,?,?)", shop.seed_customers())
    w.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", shop.seed_orders())
    w.execute(f"PRAGMA user_version = {shop.SCHEMA_VERSION}")
    w.commit()
    m["liveWal"] = {"main": file_info(live), "wal": file_info(live + "-wal")}
    with open(live, "rb") as a, open(p("naive_main_file_copy.bak"), "wb") as b:
        b.write(a.read())  # the mistake: copy only the main file while the writer still holds data in -wal
    m["files"]["naive_main_file_copy"] = p("naive_main_file_copy.bak")
    m["liveWal"]["backupApiWhileWriterOpen"] = make_backup(live, p("live_via_backup_api.bak"))
    m["files"]["live_via_backup_api"] = p("live_via_backup_api.bak")
    w.close()

    print(json.dumps(m))


if __name__ == "__main__":
    main(sys.argv[1])
