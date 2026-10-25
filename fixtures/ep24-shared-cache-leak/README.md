# ep24-shared-cache-leak — a custom response cache keyed by path only

Plain Node 22 ESM, `node:http` on `127.0.0.1` (ephemeral port), **zero npm dependencies**. Synthetic users **Alice** (`u_alice`, `alice@example.test`) and **Bob** (`u_bob`, `bob@example.test`) only.

**This is a deliberately flawed application cache written for this fixture. It is not a CDN, proxy or browser cache, and not a real incident.** Nothing here shows that CDNs or browsers cache authenticated responses by default.

## Files

| file | role |
|---|---|
| `server.mjs` | the dashboard app, session table, `ResponseCache`, and three `mode`s of `GET /dashboard` |
| `client.mjs` | `Client`: an independent cookie jar plus request history. Two `Client`s stand in for "isolated browser contexts" |
| `test.mjs` | 18 regression tests (`node --test test.mjs`) |
| `demo.mjs` | runs the video scenario and writes `evidence.json` |

## Modes of `GET /dashboard`

- `flawed` — authenticate (401 if no session), then look up the shared cache with `key = url.pathname` (`/dashboard`). Hit: return the stored payload. Miss: render for the current user and store it. No `Cache-Control` is sent.
- `flawed-with-header` — identical custom code, but it also sends `Cache-Control: private, no-store`. The cache code never reads that header, so it still leaks. This is the "Cache-Control does not repair custom code that ignores it" control.
- `corrected` — never reads or writes the shared cache; authenticates (401) and authorises (`dashboard:read`, else 403) on every request; renders for the current user; sends `Cache-Control: private, no-store` (also on 401/403). `app.repair({purge: true})` switches a running app to this mode and explicitly purges the `/dashboard` entry, recording it in `cache.purgeLog`.

Responses carry `x-app-cache: HIT | MISS | BYPASS` and a monotonically increasing `renderSeq`, so a test can tell whether a payload was rendered for this request or replayed.

## Deliberate policies

- Identity comes only from the server-side session table (opaque cookie -> user id). Session ids use a seeded PRNG: reproducible, **not secure**, fixture-only.
- The corrected route bypasses the shared cache entirely rather than trying to key it by user. Identity-aware shared caching would need its own authorisation, partitioning, invalidation and data-classification decisions; none of that is built or tested here.
- The fixture does not use `Vary`, and nothing here suggests `Vary: Cookie` is a universal fix.

## How to run

```
node --test test.mjs
node demo.mjs          # writes evidence.json
```

## Executed

`node --test test.mjs` (Node v22.23.4):

```
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

What the 18 tests cover: four known-positive controls (Bob receives Alice's page; path-only key with a single slot; order independence; flawed server **with** `Cache-Control: private, no-store` still leaks); unauthenticated requests (401 on flawed with a populated cache, 401 on corrected, logout); purge assertions (entry present before, absent after, `purge()` true then false, purge log, bypass-without-purge leaves the entry resident); corrected route makes zero cache reads/writes; cross-user isolation (interleaved, order-independent, second jar, revoked permission -> 403); response-header assertions; already-delivered responses are not retracted; loopback bind.

`node demo.mjs` -> `evidence.json`, key values:

- Flawed: Alice `200 MISS` (viewer `u_alice`, renderSeq 1); Bob `200 HIT` (viewer `u_alice`, greeting "Welcome back, Alice", email `alice@example.test`, same renderSeq 1) while `/whoami` for Bob returns `u_bob`. Cache keys `["/dashboard"]`, populated by `u_alice`; stats reads 2, hits 1, writes 1.
- Flawed + correct header: Bob `200 HIT`, `cache-control: private, no-store`, viewer `u_alice`.
- Unauthenticated: `401` on the flawed server with a populated cache, `401` (with `private, no-store`) after repair.
- Repair: entry present before (size 1), `purge()` true, entry absent after (size 0), `purgeLog` `/dashboard` populated by `u_alice`; cache stats unchanged across the retest (reads 2, writes 1).
- Retest (Alice, Bob, Alice, Bob): all `200 BYPASS`, each viewer only their own id, `cache-control: private, no-store`, four distinct renderSeq (2-5).

## Limitations / not tested

- No real browser. "Isolated contexts" = separate cookie jars in separate `Client` objects talking to one server; browser cache, service workers, back/forward cache and storage partitioning are not exercised.
- No CDN, reverse proxy or HTTP caching semantics (RFC 9111) are implemented or measured. `Cache-Control` is only checked as a response header the fixture emits.
- The test that "already-delivered responses are not retracted" documents the limit: the fixture has no recall mechanism and the earlier transcript is unchanged. It does not model what a real browser or intermediary would have stored.
- `no-store` is asserted as a header on this fixture's responses only; this does not claim it removes every historical copy, log or browser artifact.
- No TTL, eviction, concurrency/stampede behaviour, or multi-process cache. Single process, unbounded map.
- Only `GET /dashboard` is repaired. Other personalised routes would each need the same review.
