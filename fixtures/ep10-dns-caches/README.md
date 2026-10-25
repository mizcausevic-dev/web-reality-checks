# ep10-dns-caches — deterministic DNS cache simulator

**SIMULATED DNS MODEL · NO REAL NETWORK.** Plain Node 22 ESM, zero dependencies, no sockets. Nothing contacts a real resolver or authoritative server. Domain `example.test`; addresses `192.0.2.10` (intended) and `192.0.2.20` (wrong) are RFC 5737 documentation addresses held as strings inside the simulator.

## What it is

`simulator.mjs` is a small state machine driven by a **virtual clock** (`sim.at(t)`):

- one authoritative A record (value + TTL), edited with `setRecord()`;
- two recursive resolvers, `A` and `B`, each caching that one name as `{answer, ttl, cachedAt, expiresAt}`;
- two clients, `clientA → resolver A`, `clientB → resolver B`;
- a simplified connect stage that succeeds only if the resolved address equals the intended origin `192.0.2.10`.

A cache entry is fresh while `t < expiresAt`. An expired entry is **not** removed on its own and nothing is pushed to anyone: it sits there until the next `query()` for that resolver, which then fetches whatever the authoritative record is *at that moment*. Lowering the authoritative TTL changes only the TTL stored by later lookups.

`runSequence()` executes the brief's deterministic sequence as actions on the clock (not scripted countdowns): query at t=0, bad edit at t=10, resolver B miss at t=15, both clients at t=20, restore at t=30, both clients at t=30, t=60 and t=75.

## How to run

```
node --test test.mjs
node demo.mjs          # writes evidence.json
```

## Executed

```
# tests 13
# suites 0
# pass 13
# fail 0
```

`node demo.mjs` output (10 queries, also in `evidence.json`):

| t | client | resolver | cache | answer | TTL left | connect |
|---|---|---|---|---|---|---|
| 0 | clientA | A | MISS | 192.0.2.10 | 60 | ok |
| 15 | clientB | B | MISS | **192.0.2.20** | 60 | **failed** |
| 20 | clientA | A | HIT | 192.0.2.10 | 40 | ok |
| 20 | clientB | B | HIT | 192.0.2.20 | 55 | failed |
| 30 | clientA | A | HIT | 192.0.2.10 | 30 | ok |
| 30 | clientB | B | HIT | 192.0.2.20 | 45 | failed |
| 60 | clientA | A | MISS | 192.0.2.10 | 60 | ok |
| 60 | clientB | B | HIT | 192.0.2.20 | 15 | failed |
| 75 | clientB | B | MISS | 192.0.2.10 | 60 | ok |
| 75 | clientA | A | HIT | 192.0.2.10 | 45 | ok |

Authoritative changes: t=0 → 192.0.2.10; t=10 → 192.0.2.20; t=30 → 192.0.2.10 (TTL 60 throughout). Summary: 10 queries, 4 failed connections, **0 resolution failures**, resolver A recovered at t=60, resolver B at t=75.

## Tests (`test.mjs`)

State assertions at t=0, 10, 15, 20, 30, 60, 75, plus:

- **known-positive control** — at t=15 the wrong address is actually served and cached (the flaw is observable);
- every answer in the run is a successful (`NOERROR`) resolution; only `connect` fails, and only when the answer was the wrong address;
- expiry permits a lookup, does not push one (an expired entry stays until queried);
- lowering the authoritative TTL is not retroactive for an entry already cached;
- the two resolvers recover at different times (no single global recovery interval);
- the clock cannot run backwards; evidence rows have the required fields.

## Deliberate simplifications (state these wherever results are shown)

- No serve-stale, no prefetch / pre-expiry refresh, no negative caching.
- No browser DNS cache and no operating-system stub cache — in reality each adds another layer with its own lifetime.
- A record only. Real investigations must also check **AAAA**; an IPv6 client may never touch the A record.
- Single authoritative server; no propagation delay between primaries and secondaries.
- The connect stage is a string comparison against the intended IP. TLS and HTTP are not modelled; see `diagnostic-checklist.md` for how they are separated in a real investigation.
- Record TTL is distinct from website-content cache lifetimes (`Cache-Control`, CDN TTLs); this fixture says nothing about those.
- The recovery times t=60 and t=75 are properties of *this* sequence (cache time + stored TTL + next query), not a general "propagation time".

## What is NOT tested

Real resolver software, real TTL clamping policies (minimum/maximum TTL overrides), DNSSEC, EDNS, UDP/TCP transport, multiple records per name, round-robin, CNAME chains, or anything observable on a network.
