# EP 10 — I Changed One DNS Record and Broke My Website

**Central idea.** An incorrect authoritative A record sends *new* lookups to the wrong IPv4 address, while different resolver caches temporarily hold different answers for different lengths of time; fixing the source does not erase what is already cached.

## What this fixture is
- `fixtures/ep10-dns-caches/` — a zero-dependency Node 22 state machine with a **virtual clock** (`sim.at(t)`): one authoritative A record for `example.test`, two recursive resolver caches (A, B) with TTL expiry, two clients each bound to one resolver, and a simplified connect stage that succeeds only when the resolved address equals the intended origin `192.0.2.10`. The wrong address is `192.0.2.20`. Both are RFC 5737 documentation addresses held as strings; nothing opens a socket.
- `runSequence()` performs the brief's deterministic sequence as actions on the clock (query t=0, bad edit t=10, resolver B miss t=15, both clients t=20, restore t=30, queries at t=30/60/75). Expiry is computed as `t >= expiresAt`; an expired entry stays until the next query replaces it. No scripted countdowns.
- Deliberate policy: the connect stage is a comparison against the intended IP. It stands in for TCP connect only; TLS and HTTP are out of scope for the model and are handled by the checklist instead.
- Persistent sim tag on every simulated scene: `SIMULATED DNS MODEL · NO REAL NETWORK`.

## Evidence
- Executed: `node --test fixtures/ep10-dns-caches/test.mjs` → `# tests 13  # pass 13  # fail 0` (state assertions at t=0, 10, 15, 20, 30, 60, 75; a known-positive control asserting the wrong address is actually served and cached at t=15; TTL-lowering-not-retroactive; expiry-does-not-push; independent recovery times; clock monotonicity; evidence shape).
- Executed: `node fixtures/ep10-dns-caches/demo.mjs` → `fixtures/ep10-dns-caches/evidence.json`: 10 queries, **0 resolution failures**, 4 failed connections (all to 192.0.2.20), resolver A recovered at t=60, resolver B at t=75. Per-query rows `{t, client, resolver, cacheHit, answer, ttlRemaining, connect}`; snapshots at each assertion time; authoritative change log; cache-write log.
- Observed (in the Remotion scenes): all values are constants copied from `evidence.json` (`EVENTS`, `WRITES`, `AUTH`, `SUMMARY` at the top of `Scenes.tsx`); the board state at any virtual time is derived from those constants, not hand-placed.
- Predicted: scene durations in `video/src/episodes/ep10/timeline.json` were generated with `--no-audio` (word-count estimate). The orchestrator regenerates them from real narration.
- Blocked: no narration generated, no MP4 rendered, no frames inspected (orchestrator steps). `render-evidence.json` is not present.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep10      # needs video/public/ep10/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep10 --concurrency 2
```

## Limitations
- Simulated model, not a measurement of any resolver software. Not modelled: serve-stale, prefetch / pre-expiry refresh, browser DNS cache, operating-system stub cache, negative caching, resolver TTL clamping, multiple authoritative servers or primary→secondary propagation delay, CNAME chains, round-robin.
- A record only. Real investigations must also check **AAAA**; an IPv6-capable client may never consult the A record that was fixed.
- "Resolution succeeded, destination wrong": every query in the run returned `NOERROR` with an address. The wrong answer is not a resolution failure and the video never calls it one.
- Lowering the authoritative TTL after an answer was cached does not shorten that entry (`expiresAt = cachedAt + ttlAtFetch`). Only later lookups inherit the new TTL. Tested.
- TTL expiry permits a new lookup; it pushes nothing to resolvers or clients. Tested (an expired entry sits untouched until queried).
- Record TTL is distinct from website-content cache lifetimes (`Cache-Control`, CDN TTLs). The fixture says nothing about content caching.
- Recovery at t=60 and t=75 is a property of *this* sequence (each cache's fetch time + its stored TTL + when it was next asked). It is not a general "propagation time"; real incidents do not recover within one fixed global interval.
- Connectivity, TLS and HTTP are not simulated; `fixtures/ep10-dns-caches/diagnostic-checklist.md` separates DNS resolution, connectivity, TLS and HTTP for real investigations.

## Diagnostic checklist (summary)
Full version: `fixtures/ep10-dns-caches/diagnostic-checklist.md`.
1. **DNS resolution** — query the authority directly, then each resolver users rely on; compare answers *and* remaining TTLs; check AAAA as well as A; record the TTL in force when the bad answer was cached; do not quote a single propagation time.
2. **Connectivity** — TCP connect to the *resolved* address; test the intended address explicitly with `--resolve`; firewall rules; test from the client's network.
3. **TLS** — handshake with SNI against the intended address; certificate covers the name; a mismatch after a DNS change usually means the name now points at an unprovisioned host.
4. **HTTP** — status and origin headers via `--resolve`; Host-header routing; separate HTTP cache state from DNS cache state before concluding "the fix did not propagate".
