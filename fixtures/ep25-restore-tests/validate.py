"""Restore a backup artifact into a fresh isolated path and validate it. Stdlib only.

usage: python3 validate.py ARTIFACT [--keep]
Always prints one JSON object (never a traceback). Exit 0 = valid, 1 = invalid.
The source database is never opened: the artifact is copied to a new temp directory and only the copy is opened.
"""
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import time

import shop

CHECKS = ["restore_open", "integrity_check", "foreign_key_check", "schema_version", "tables",
          "record_counts", "known_values", "order_totals_query"]


def _rec(name, status, expected=None, actual=None, detail=None):
    return {"name": name, "status": status, "expected": expected, "actual": actual, "detail": detail}


def validate(artifact, keep=False):
    tmp = tempfile.mkdtemp(prefix="restore-test-")
    restored = os.path.join(tmp, "restored.db")
    checks = []
    result = {"artifact": os.path.abspath(artifact), "restoredPath": restored, "ok": False, "checks": checks}
    conn = None
    try:
        # RESTORE: copy the standalone backup file to a brand-new path, then open only the copy.
        t0 = time.perf_counter()
        try:
            shutil.copyfile(artifact, restored)
            conn = shop.connect(restored)
            conn.execute("SELECT count(*) FROM sqlite_master").fetchone()  # forces the header to be read
            ms = (time.perf_counter() - t0) * 1000
            result["restore"] = {"msMeasuredOnThisMachine": round(ms, 3), "note": "copy + open of a tiny file; this machine only"}
            checks.append(_rec("restore_open", "pass", "opens as SQLite", "opened"))
        except (OSError, sqlite3.Error) as e:
            checks.append(_rec("restore_open", "fail", "opens as SQLite", None, f"{type(e).__name__}: {e}"))
            for n in CHECKS[1:]:
                checks.append(_rec(n, "skipped", detail="artifact could not be opened"))
            return result

        def run(name, expected, fn):
            try:
                actual, ok = fn()
                checks.append(_rec(name, "pass" if ok else "fail", expected, actual))
            except sqlite3.Error as e:
                checks.append(_rec(name, "fail", expected, None, f"{type(e).__name__}: {e}"))

        def integrity():
            r = [x[0] for x in conn.execute("PRAGMA integrity_check")]
            return r, r == ["ok"]
        run("integrity_check", ["ok"], integrity)

        def fkcheck():
            r = [list(x) for x in conn.execute("PRAGMA foreign_key_check")]
            return r, len(r) == 0
        run("foreign_key_check", "no rows", fkcheck)
        run("schema_version", shop.EXPECTED["user_version"], lambda: ((v := conn.execute("PRAGMA user_version").fetchone()[0]), v == shop.EXPECTED["user_version"]))
        run("tables", shop.EXPECTED["tables"], lambda: ((t := sorted(x[0] for x in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))), t == shop.EXPECTED["tables"]))

        def counts():
            c = {t: conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in shop.TABLES}
            return c, c == shop.EXPECTED["counts"]
        run("record_counts", shop.EXPECTED["counts"], counts)

        def known():
            got, ok = [], True
            for table, kcol, key, col, exp in shop.EXPECTED["known"]:
                row = conn.execute(f"SELECT {col} FROM {table} WHERE {kcol} = ?", (key,)).fetchone()
                val = row[0] if row else None
                got.append({"where": f"{table}.{kcol}={key}", "column": col, "expected": exp, "actual": val})
                ok = ok and val == exp
            s = conn.execute("SELECT COALESCE(SUM(amount_cents),0) FROM orders").fetchone()[0]
            got.append({"where": "SUM(orders.amount_cents)", "column": "-", "expected": shop.EXPECTED["orders_sum_cents"], "actual": s})
            ok = ok and s == shop.EXPECTED["orders_sum_cents"]
            return got, ok
        run("known_values", "selected values match the seed", known)

        def totals():
            rows = shop.order_totals(conn)
            exp = [tuple(r) for r in shop.EXPECTED["totals"]]
            bad = [{"expected": list(e), "actual": list(a)} for e, a in zip(exp, rows) if e != a]
            return {"rows": len(rows), "mismatches": bad, "totals": [list(r) for r in rows]}, rows == exp
        run("order_totals_query", "app query reproduces every customer total", totals)
    except Exception as e:  # last-resort guard: still return a structured result
        checks.append(_rec("validator_error", "fail", None, None, f"{type(e).__name__}: {e}"))
    finally:
        if conn is not None:
            conn.close()
        result["ok"] = bool(checks) and all(c["status"] == "pass" for c in checks)
        result["failedChecks"] = [c["name"] for c in checks if c["status"] == "fail"]
        if keep:
            result["kept"] = True
        else:
            shutil.rmtree(tmp, ignore_errors=True)
    return result


if __name__ == "__main__":
    res = validate(sys.argv[1], keep="--keep" in sys.argv)
    print(json.dumps(res))
    sys.exit(0 if res["ok"] else 1)
