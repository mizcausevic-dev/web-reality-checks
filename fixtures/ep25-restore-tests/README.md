# EP25 fixture — restore tests for a SQLite backup

A local, synthetic SQLite shop (customers, orders). A backup is made with SQLite's Online Backup API
(Python `sqlite3.Connection.backup()`), restored into a fresh isolated path and validated. Deliberately
invalid artifacts are built and must fail validation with a structured result. No network, no servers.

## Files
- `shop.py` — schema, fixed seed (12 customers, 40 orders), `PRAGMA user_version = 3`, the application's real
  order-total query, and the expected values derived from the seed in pure Python (no SQL).
  Application connections run `PRAGMA foreign_keys = ON`.
- `backup.py` — `python3 backup.py SOURCE DEST`; Online Backup API; refuses to overwrite `DEST` or write onto the source.
- `validate.py` — `python3 validate.py ARTIFACT`; copies the artifact to a new temp directory, opens only the copy,
  runs eight checks, prints one JSON object, never a traceback. Exit 0 = valid, 1 = invalid.
- `make_artifacts.py` — builds the source DB, the good backup and the bad artifacts into a new directory.
- `test.mjs` (`node:test`), `demo.mjs` (writes `evidence.json`). Node drives Python through `child_process`.

## Run
```
node --test fixtures/ep25-restore-tests/test.mjs
node fixtures/ep25-restore-tests/demo.mjs      # writes evidence.json
```
Needs `python3` with the standard-library `sqlite3` module (tested with Python 3.13.17, SQLite 3.53.1) and Node 22. No npm packages.

## Validation checks (in order)
1. `restore_open` — artifact copied to a fresh path and opened as SQLite. On failure the other seven are reported `skipped`.
2. `integrity_check` — `PRAGMA integrity_check` must return exactly `ok`.
3. `foreign_key_check` — `PRAGMA foreign_key_check` must return no rows.
4. `schema_version` — `PRAGMA user_version` must be 3.
5. `tables` — exactly `customers`, `orders`.
6. `record_counts` — 12 customers, 40 orders.
7. `known_values` — five selected cell values plus `SUM(orders.amount_cents)` = 244580.
8. `order_totals_query` — the application's real query must reproduce all twelve customer totals.

## Deliberate policies
- The source is never overwritten and never opened by the validator. Tests hash `source.db` (and any `-wal`/`-shm`) and the backup before and after validation.
- The source is quiescent (all connections closed) when the demonstration backup is made, so the expected contents are unambiguous. A write made to the source afterwards (order 5001) is absent from the restored copy: 41 orders in the source, 40 in the backup.
- The source runs in WAL mode. The backup is taken through the Online Backup API, never by copying the main file.
- Bad artifacts are built by explicit construction, not random truncation, so the failure is deterministic:
  `not_a_database.bak` (text file), `missing_table.bak` (valid SQLite without `orders`), `old_schema.bak` (`user_version` 2),
  `orphan_same_counts.bak` (an order re-pointed at customer 999 with foreign keys OFF; counts unchanged),
  `wrong_value_same_counts.bak` (order 23 amount +100 cents; counts unchanged, no orphan).
- Known-positive controls: the orphan artifact passes `integrity_check` and `record_counts` but fails `foreign_key_check`;
  the wrong-value artifact passes integrity, foreign-key and count checks but fails `known_values` and `order_totals_query`;
  a main-file-only copy of a live WAL database (writer still open, 4096-byte main file, 49472 bytes still in `-wal`) fails validation,
  while the Online Backup API on the same live database passes.
- Timings (`backupMs`, `restore.msMeasuredOnThisMachine`) are measured on this machine on a 20 KB file and recorded in `evidence.json`
  only as such. They are not recovery-time or recovery-point figures and are not used in the video.

## Executed
```
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
```
`node demo.mjs` summary lines (also in `evidence.json`):
```
backup reported: ok=true via sqlite3.Connection.backup (20480 bytes, 5 pages)
good backup: integrity_check=["ok"] foreign_key_check rows=0 user_version=3 counts={"customers":12,"orders":40} totals rows=12 mismatches=0
```

| scenario | valid | failed checks |
|---|---|---|
| good backup (quiescent WAL-mode source) | true | none |
| not a SQLite database | false | restore_open (others skipped) |
| valid SQLite, orders table missing | false | tables, record_counts, known_values, order_totals_query |
| wrong schema version | false | schema_version |
| orphan order, same counts | false | foreign_key_check, order_totals_query |
| one wrong amount, same counts | false | known_values, order_totals_query |
| CONTROL: main file only of live WAL DB | false | schema_version, tables, record_counts, known_values, order_totals_query |
| CONTROL: Online Backup API on live WAL DB | true | none |

## Limitations / not tested
- One tiny synthetic database. No claim about recovery time, recovery point, large databases, or concurrent-write backups beyond the WAL control.
- Real on-disk corruption (bit rot, torn pages, truncation) is not simulated; the invalid artifacts are constructed, and no specific SQLite corruption error is asserted.
- `integrity_check` is not shown detecting low-level corruption; it is shown passing on artifacts that are still wrong.
- External files, object storage, secrets and infrastructure are out of scope. Backup encryption, retention and off-site copies are not covered.
- A passing validation shows the restored copy matches the checks above, not that the application is correct.
