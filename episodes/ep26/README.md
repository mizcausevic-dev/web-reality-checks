# EP 26 — Why one page makes 101 database queries

**Central idea.** One HTTP request can trigger one list query plus one related-record query for every item.

## What this fixture is
- `fixtures/ep26-n-plus-one/` — loopback-only Node 22 article directory on `node:sqlite` with exactly 100 seeded articles, 12 authors, `author_id NOT NULL`, `PRAGMA foreign_keys=ON`; many articles share an author.
- Flawed endpoint (`/vuln/articles`): 1 list SELECT + 1 author SELECT per article. Corrected endpoint (`/articles`): one explicit JOIN, same fields, `ORDER BY id`, byte-equal JSON.
- A query-counting wrapper scoped to the article-list operation. Counted: SELECTs executed through the wrapper inside the scope. Excluded and logged as such: authentication (outside scope), `BEGIN`/`COMMIT` (transaction control); setup runs on the raw connection; the wrapper issues no SQL. Counts and the logged SQL come from instrumentation, not constants.

## Evidence
- Executed: `node --test fixtures/ep26-n-plus-one/test.mjs` → `# tests 15`, `# pass 15`, `# fail 0` (includes a known-positive control: a hidden extra query is reported as 102).
- Executed: `node fixtures/ep26-n-plus-one/demo.mjs` → `evidence.json`: flawed 101 SELECTs, corrected 1, bodies byte-equal (13544 bytes), 12 distinct authors across 100 lookups (88 repeats), most-fetched author 14 times, control 102 / 2.
- Observed: the video displays these numbers; the values in `Scenes.tsx` are copied from `evidence.json` and `seed-data.json`.
- Not measured: latency or any timing. The video does not claim a speed-up.
- Blocked / not done by the builder: no audio generated, no video rendered, no MP4 exists yet (orchestrator step). `video/src/episodes/ep26/timeline.json` was generated with `--no-audio` (estimated timing) only so the project type-checks.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep26    # from narration audio in video/public/ep26/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep26 --concurrency 2
```

## Accuracy items and where they appear
- Counts derived from instrumentation, not narration alone: header `x-db-selects` and the scope report in `evidence.json`; narration and on-screen text cite the observed values.
- Not all database activity is called "101 queries": the scope reports `otherScoped = 0`; narration and the retest scene say setup, sign-in and transaction control are excluded.
- No latency inference: the end scene and narration say speed was not measured and fewer queries do not always mean a faster page.
- Same result shape and ordering: byte-equal JSON asserted in tests, shown in the "equal" scene.
- Valid author relationships enforced: FOREIGN KEY ON, NOT NULL, tested with orphan and NULL inserts.
- No untested indexing, pagination or throughput claims.
- "One N+1 pattern, not every form": narration and end card.

## Limitations
- Simulated local fixture, synthetic data, in-memory SQLite, no ORM. Nothing here says how a networked database or a particular ORM behaves.
- The query tree is an illustration of the logged statements (each square = one logged author lookup); layout is not a measurement.
- Fixture limitations are listed in `fixtures/ep26-n-plus-one/README.md`.
