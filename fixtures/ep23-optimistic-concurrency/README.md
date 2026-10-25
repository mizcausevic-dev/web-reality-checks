# EP23 fixture - optimistic concurrency for a shared document

A loopback-only Node 22 document service (`node:http` + `node:sqlite`, zero npm dependencies). Synthetic users
(`alice`, `bob`, `mallory`) and two documents. No browser, no network beyond 127.0.0.1.

**"Two tabs" are two independent client instances in Node** (`client.mjs`): each has its own session cookie and its
own local copy of the document. This is a stand-in for two browser contexts; **no real browser was used**.

## Files
- `db.mjs` - SQLite store. `docs(id, title, body, version, updated_by)` and `doc_members(doc_id, user_id)`.
  - `updateUnconditional` (FLAWED): `UPDATE ... WHERE id = ?`.
  - `updateIfVersion` (CORRECTED): ONE statement, `UPDATE docs SET title=?, body=?, version=version+1, updated_by=? WHERE id=? AND version=?`; `changes()` is the only decision input. There is no read before it.
- `server.mjs` - `GET /login/:user`, `GET /docs/:id`, `PUT /vuln/docs/:id` (flawed), `PUT /docs/:id` (corrected, body carries `expectedVersion`).
- `client.mjs` - the editor client: sends `expectedVersion`, preserves unsaved text on failure, refuses to save again after a conflict until `resolve()` is called, never retries by itself.
- `worker.mjs` - used by the cross-thread concurrency test (own SQLite connection per worker, `Atomics` barrier).
- `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep23-optimistic-concurrency/test.mjs
node fixtures/ep23-optimistic-concurrency/demo.mjs      # writes evidence.json
```
Node prints an `ExperimentalWarning` for `node:sqlite`; this is expected.

## Status codes (deliberate policy)
| status | meaning |
|---|---|
| 200 | saved; body carries the new version |
| 409 | **version conflict only**: zero rows matched `id AND version`. Body has `currentVersion` and the current document for comparison |
| 400 | malformed body, or `expectedVersion` missing / not an integer >= 1 |
| 401 | no session |
| 404 | document absent **or** caller is not a member (authorization is checked first and separately; a non-member never sees a 409 or any document content) |
| 503 | SQLite busy/locked (`SQLITE_BUSY` / `SQLITE_LOCKED`), `Retry-After` set. Retryable, **not** a conflict |
| 500 | any other unexpected database failure. **Not** a conflict |

## Deliberate policies
- **Atomic conditional update.** The version check and the write are the same SQL statement. A separate "SELECT version, compare, UPDATE" is not used anywhere in the corrected path. The read after a failed update exists only to *report* the current document in the 409 body.
- **On conflict the client keeps the unsaved text**, keeps the server's current document, and offers explicit resolution (`take-theirs`, `keep-mine`, `merged`). `resolve()` sends nothing; the next `save()` is a deliberate act against the *current* version. There is no automatic retry and no automatic merge (tests count the PUT requests).
- **Authorization is separate from versioning.** Session -> membership -> then the version-guarded update. Identity comes only from the session; `userId`/`X-User-Id` in the request are ignored (tested).
- **Document id is part of the match** (`WHERE id = ? AND version = ?`); doc_1's version cannot authorise a write to doc_2 (tested).
- **Not CRDT, not operational transformation, not real-time collaboration.** This detects conflicting saves; it does not merge them.

## Executed
`node --test test.mjs` (16 tests, run 5 times in a row, all green):
```
# tests 16
# suites 0
# pass 16
# fail 0
```
Tests include: a known-positive control (flawed endpoint loses A's accepted title); stale-version 409; `expectedVersion` validation; 409 body carries the current version; unsaved text preserved with exactly one PUT sent; explicit resolution; doc-id/authorization separation; **coordinated concurrent saves** - (1) two HTTP requests released by a barrier with both in flight together (`maxInFlightPuts = 2`): one 200, one 409; (2) six worker threads, each with its own SQLite connection to one database file, released by an `Atomics` barrier: exactly one `changes() = 1`, five `0`; **database lock -> 503** (a second connection holds `BEGIN IMMEDIATE`, server uses a 50 ms busy timeout) and **injected failure -> 500**, neither reported as 409.

`node demo.mjs` -> `evidence.json`:

| scenario | result |
|---|---|
| flawed: both load v1, A saves title, B saves whole stale doc | A 200 (v2), B 200 (v3); final title back to "Launch plan" - A's change lost |
| corrected: same steps with `expectedVersion: 1` | A 200 (newVersion 2); B 409 (`currentVersion` 2); server final v2 with A's title; B's unsaved text preserved; 1 PUT sent by B |
| explicit resolution (person merges A's title + B's body) | save with `expectedVersion` 2 -> 200, version 3 |
| concurrent, same expected version, barrier | statuses {200, 409}; 1 accepted; both PUTs in flight together; final v2 |
| database lock | 503 `database_busy`, `retryable: true`, not 409; client text kept; server still v1 |

## Limitations / not tested
- No real browsers, no real network, no real-time sync, no multi-process server. Clients are in-process objects.
- The HTTP-level barrier test runs in one Node process; SQLite writes inside one process are serialised by the event loop. The cross-thread worker test is what exercises true parallel connections.
- A single integer version per whole document: no field-level merge, no history, no deletion, no per-user conflict policy.
- The `x-fault: db-error` header is a test harness fault injector; do not deploy this server.
- Busy/lock behaviour was exercised with SQLite rollback-journal mode only (not WAL, not a networked database); a production database's lock/timeout error codes differ.
- Does not test clock behaviour, ETag/`If-Match` header transport (the same idea can use those headers), or the UX of the conflict screen beyond the client state.
