# EP21 fixture — deleting a record does not delete its copies

A loopback-only Node 22 synthetic contact directory. Fictional contacts (`example.test` addresses, `555-01xx` numbers). No network leaves 127.0.0.1. No npm dependencies.

## Files
- `directory.mjs` — `node:sqlite` (`DatabaseSync`, in-memory) plus the in-process cache and worker:
  - `contacts` — primary table. `INTEGER PRIMARY KEY AUTOINCREMENT`, so a deleted id is never reused (public id `c_1003`).
  - `search_index` — separate table of denormalised fields, deliberately **no foreign key** to `contacts` (stands in for a separate search system the primary database cannot cascade into).
  - response cache — a deliberately implemented in-process `Map` keyed by normalised query; `X-Cache: hit|miss` on `/search`.
  - `outbox` — cleanup events (`pending` / `processed` / `failed`, `attempts`, `steps_done`, `last_error`).
  - worker — `runOnce()` (one attempt per pending event), `replay(id)` (re-run all steps of a processed event), `retryFailed(id)` (operator reopen).
- `server.mjs` — HTTP API on `127.0.0.1`, ephemeral port. `GET /contacts/:id`, `GET /search?q=`, `POST /contacts`, `DELETE /vuln/contacts/:id` (**flawed**: primary row only), `DELETE /contacts/:id` (**corrected**: 202 + outbox event). `/admin/*` is a test harness (worker trigger, fault injection, snapshot, alerts) with no authentication, acceptable only because it is loopback and synthetic.
- `client.mjs` — `BrowserSim`, **SIMULATED CLIENT STATE** (see below).
- `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep21-deletion-copies/test.mjs
node fixtures/ep21-deletion-copies/demo.mjs      # writes evidence.json
```
Node prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Deliberate policies
- **Corrected delete** = primary `DELETE` and `INSERT INTO outbox` inside one `BEGIN IMMEDIATE … COMMIT`. If the outbox insert fails, the primary delete rolls back too (tested). A second `DELETE` of the same id returns 404 and creates no second event.
- **Cleanup order**: search-index row, then cache. Each step is idempotent (deleting what is already gone is a no-op). Retries run only the steps not yet recorded in `steps_done`; replay re-runs all of them.
- **Cache invalidation clears the entire directory cache.** No dependency tracking is pretended; unrelated cached queries are dropped too.
- **Processed means every step succeeded.** A failing step leaves the event `pending` with `attempts` incremented and `last_error` set.
- **Retries exhausted** (default 3 attempts): status becomes `failed`, an alert record is appended, the event is never marked processed, and the worker does not pick it up again. An operator can reopen it with `retryFailed`.
- **No timers, sleeps or backoff**: the worker only acts when called, so every run is deterministic.
- **Non-reused ids**: AUTOINCREMENT; a control test shows a table without it reuses the highest deleted id.

## The browser is simulated
No real browser is available in this environment and none is driven. `BrowserSim` is a plain object that stores the search results it previously fetched and shows them until it fetches again. It models exactly one fact: a server-side delete cannot recall data a client already holds. It does not model HTTP caching, service workers, tabs, or a DOM. Video scenes that show it carry the tag `SIMULATED CLIENT STATE`.

## Executed
```
# tests 20
# suites 0
# pass 20
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Includes known-positive controls: flawed delete leaves the index and cached response returning the contact; a no-AUTOINCREMENT table reuses an id.

`node demo.mjs` summary (full values in `evidence.json`):

| step | result |
|---|---|
| flawed: after `DELETE /vuln/contacts/c_1003` | `GET /contacts/c_1003` 404; index row present; cached `harbourline` (hit) → `c_1003, c_1004`; outbox events 0 |
| corrected: after `DELETE /contacts/c_1003` | 202, event #1 pending; primary gone; index and cache still hold it until the worker runs |
| attempt 1 (cache fault injected once) | pending, attempts 1, stepsDone `[search_index]`; cached search still returns `c_1003` (hit); uncached `ravi` is clean |
| attempt 2 | processed, attempts 2, stepsDone `[search_index, cache]`; index and cache clean |
| simulated browser | still shows `c_1003` until refresh; after refresh `harbourline` → `[c_1004]`, `dana` → `[]`; a refresh during the failure returned the stale cache hit |
| replay ×2 + new contact | state unchanged; new contact is `c_1006`; it stays indexed |
| retries exhausted (3 attempts) | status `failed`, 1 alert, cache still stale, worker pass returns nothing |

## Limitations / NOT tested
- Not a privacy-erasure implementation. Backups, logs, exports, analytics copies and third-party copies are outside the fixture.
- The outbox records cleanup **intent**; it does not make the primary database, index and cache update atomically. Between commit and cleanup, derived copies still return the contact (tested).
- A stale browser display can remain after backend cleanup; deletion cannot retrieve information already downloaded. The browser is a client-state simulation, not a real browser.
- The search index is a SQLite table in the same process, not a real search engine; the cache is an in-process `Map`, not a CDN, shared cache or HTTP cache.
- Not tested: concurrent workers, a worker crash mid-step in a real process, a search that re-populates the cache with pre-delete data after invalidation (a race that needs versioned cache writes), retry backoff or scheduling, durable alert delivery, authentication on `/admin/*`.
- The "lost acknowledgement" test simulates redelivery by resetting the outbox row in SQL; it does not kill a process.
