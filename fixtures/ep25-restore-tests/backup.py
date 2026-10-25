"""Create a backup with SQLite's Online Backup API (sqlite3.Connection.backup). Stdlib only.

usage: python3 backup.py SOURCE_DB DEST_FILE
Prints one JSON object. Never modifies SOURCE_DB's content; refuses to overwrite DEST_FILE.
"""
import json
import os
import sqlite3
import sys
import time


def make_backup(src_path, dest_path):
    if os.path.realpath(src_path) == os.path.realpath(dest_path):
        raise ValueError("destination must differ from source")
    if os.path.exists(dest_path):
        raise FileExistsError(f"refusing to overwrite {dest_path}")
    src = sqlite3.connect(src_path)
    dst = sqlite3.connect(dest_path)
    pages = []
    try:
        t0 = time.perf_counter()
        src.backup(dst, pages=-1, progress=lambda status, remaining, total: pages.append((remaining, total)))
        ms = (time.perf_counter() - t0) * 1000
        dst.commit()
        page_count = dst.execute("PRAGMA page_count").fetchone()[0]
    finally:
        dst.close()
        src.close()
    return {"ok": True, "api": "sqlite3.Connection.backup", "dest": dest_path, "bytes": os.path.getsize(dest_path),
            "pageCount": page_count, "backupMsMeasuredOnThisMachine": round(ms, 3)}


if __name__ == "__main__":
    try:
        print(json.dumps(make_backup(sys.argv[1], sys.argv[2])))
    except Exception as e:  # report, do not crash with a traceback
        print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"}))
        sys.exit(1)
