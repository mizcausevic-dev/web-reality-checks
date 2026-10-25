# EP26 fixture — N+1 queries on an article list

A loopback-only Node 22 article directory (`node:http` on 127.0.0.1, `node:sqlite` in memory, zero npm
dependencies). Synthetic people and titles only. Two endpoints return the same JSON; one does 101 SELECTs,
the other does 1.

## Files
- `seed.mjs` — deterministic seed (integer PRNG, no clock, no `Math.random`). `node seed.mjs` rewrites `seed-data.json`.
- `seed-data.json` — the committed seed: 12 authors, exactly 100 articles, every `author_id` non-null and valid.
  Authors are weighted so several articles share an author. A test fails if this file is stale.
- `db.mjs` — schema (`PRAGMA foreign_keys = ON`, `articles.author_id INTEGER NOT NULL REFERENCES authors(id)`),
  raw setup connection, and the **query-counting wrapper** (`instrument`).
- `server.mjs` — endpoints and handlers (`listArticlesFlawed`, `listArticlesJoined`).
- `test.mjs`, `demo.mjs` -> `evidence.json`.

## Endpoints
- `GET /login/:user` — test-harness session (`alice`, `bob`); the session row lives in SQLite.
- `GET /vuln/articles` — FLAWED. `SELECT id, title, published_on, author_id FROM articles ORDER BY id`, then
  `SELECT id, name, handle FROM authors WHERE id = ?` once per article inside the loop. No identity cache, no batching.
- `GET /articles` — CORRECTED. One explicit `JOIN authors` with `ORDER BY a.id`; same fields, same row-to-object mapping.
- Body for both: `{count, articles:[{id, title, published_on, author:{id, name, handle}}]}`.
- Header `x-db-selects` is the SELECT count read from the instrumentation for that request (never a constant).

## What the counter counts (explicit policy)
Counted: a statement executed through the wrapper's `prepare().all()/.get()` **while the `article-list` scope is active** and whose SQL starts with `SELECT`. Counting happens at execution, not at `prepare`.

Excluded from the demonstrated count (but visible in the log with a reason where the wrapper sees them):
- **Setup** — schema and seed run on the raw connection before the wrapper exists, so they are never logged.
- **Authentication** — the session lookup (`SELECT user_id FROM sessions …`) runs through the wrapper outside the scope: logged as `outside-scope`.
- **Transaction control** — `BEGIN`/`COMMIT` run via `wrapper.exec()` inside the scope: logged as `transaction-control`, not counted.
- **Instrumentation** — the wrapper issues no SQL of its own.
- Any non-SELECT statement inside the scope is reported as `otherScoped` (must be 0), so "101 SELECTs" is never read as "101 statements". The scope holds 103 logged statements for the flawed request: 101 SELECTs + BEGIN + COMMIT.

Handlers receive only the wrapper, never the raw connection, so they cannot bypass the counter by accident.

## Run
```
node --test fixtures/ep26-n-plus-one/test.mjs
node fixtures/ep26-n-plus-one/demo.mjs      # writes evidence.json
```
Node 22 prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Executed
```
$ node --test fixtures/ep26-n-plus-one/test.mjs
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Tests cover: exactly 100 articles and no NULL author; `foreign_keys=1` and empty `foreign_key_check`; orphan and NULL author inserts rejected; shared authors; stale-seed check; setup excluded; scope rules (nesting forbidden, outside-scope statements logged but not counted); non-SELECT and BEGIN/COMMIT not counted; 401 without a session; flawed = exactly 101 SELECTs (1 list + 100 lookups in article order); corrected = exactly 1 JOIN SELECT; byte-equal JSON, `ORDER BY id`, identical key order; repeated author lookups visible; **known-positive control**: an endpoint doctored with one hidden extra query is reported as 102 (and 2 for the corrected endpoint), and the real `101` assertion demonstrably fails on it.

`node demo.mjs` (re-running produces a byte-identical `evidence.json`; it contains no timestamps or timings):

| item | value |
|---|---|
| flawed SELECTs (scope `article-list`) | **101** (1 list + 100 author lookups) |
| corrected SELECTs | **1** |
| bodies | byte-equal (13544 bytes, same SHA-256) |
| authors / lookups that repeated an earlier author | 12 / 88 |
| most-fetched author | Ana Petrov (`apetrov`), 14 lookups |
| hidden-extra-query control | flawed 102, corrected 2 |

## Limitations / NOT tested
- **No latency, throughput or timing claim.** Nothing is timed. Fewer queries do not universally mean better performance; in-memory SQLite says nothing about a networked database.
- No index, pagination or caching change is part of the fix (no index beyond the primary keys / UNIQUE handle exists).
- No ORM is used. The brief's "avoid identity caching and batching" is met by hand-written SQL in a loop; ORM-specific behaviour (lazy loading, `includes`/`select_related`) is not tested.
- This is one N+1 shape (a per-row lookup in a loop). Other forms (nested N+1, N+1 across services, lazy collection loads) are not covered.
- The counter sees only statements issued through its wrapper. A handler that obtained the raw connection could bypass it; these handlers cannot, but the test suite cannot prove that for arbitrary code.
- The INNER JOIN equals the loop only because `author_id` is NOT NULL and the foreign key is enforced; with nullable or dangling references the two forms could differ.
- Session harness (`GET /login/:user`) is not production authentication.
