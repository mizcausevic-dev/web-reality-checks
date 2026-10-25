# Image alt text, captions and destinations: package A (engineers)

Medium: upload the PNG. Web (kineticgain.com, repository docs): use the SVG, which carries its own `<title>` and `<desc>`. All images use the shared palette (background `#0b0c10`, panel `#171a21`, cyan normal flow, amber uncertainty, red failure, green pass, violet accent) and contain no third-party branding.

## hero (`hero.svg`, `hero.png`, 1600x900)

- **Alt text:** Title card reading "Break it on purpose." with the subtitle "Prove your bug test can fail before you trust it passing." On the right, a dark terminal panel shows node --test output for the episode 15 fixture: a passing authentication test, a highlighted amber line "KNOWN-POSITIVE CONTROL: lost response + retry on the vulnerable endpoint creates TWO orders", two more passing lines, and "tests 13 pass 13 fail 0". Below the title, four pills: Flaw, Control, Repair, Retest.
- **Caption:** Break it on purpose. The amber line is the known-positive control: "the flaw must be observable or the fix test proves nothing." (Test names shortened for layout; the summary is the executed result for the episode 15 fixture.)
- **Destination:** Medium article hero (PNG); social link card and YouTube/LinkedIn post image.

## diagram-loop (`diagram-loop.svg`, `diagram-loop.png`, 1600x900)

- **Alt text:** Four panels left to right. Flaw (red): one tap on Pay, the response is lost after the commit, the client retries, POST /vuln/orders, result "2 attempts to 2 orders". Control (amber): a known-positive control test asserting that the vulnerable endpoint creates two orders; "passes only if the flaw is real". Repair (cyan): Idempotency-Key per attempt, scoped to the session user, UNIQUE (user_id, operation, key), order and key row in one transaction, with the limit that the transaction does not cover an external payment provider. Retest (green): same scenario, "2 attempts to 1 order", same key with quantity 1 to 3 returns 422, "# pass 13 # fail 0".
- **Caption:** The Flaw, Control, Repair, Retest loop with episode 15 filled in. Source: fixtures/ep15-idempotency/evidence.json and test.mjs.
- **Destination:** Medium (PNG) inside the "Flaw, Control, Repair, Retest" section; web (SVG).

## diagram-request-flow (`diagram-request-flow.svg`, `diagram-request-flow.png`, 1600x960)

- **Alt text:** Sequence diagram with three lanes: client, service (server.mjs) and SQLite (db.mjs). Attempt 1: the client sends POST /orders with an idempotency key, the service runs one transaction inserting the order and the key, SQLite commits under UNIQUE (user, op, key) and acknowledges, then the service drops the response (fault header X-Fault: lose-response) and the client sees UND_ERR_SOCKET without knowing whether the commit happened. Attempt 2 with the same key: the service finds the key and a matching fingerprint, SQLite returns the stored result, and the client receives 201 with Idempotent-Replayed: true. Side notes: check-then-insert would race, and the result is 2 attempts, 1 order; same key with quantity 1 to 3 gives 422; 5 concurrent requests with one key give 1 order.
- **Caption:** Request flow from the episode 15 fixture. The guarantee lives in a UNIQUE constraint, not an if statement. The socket destroy is a controlled fault, not a real network partition.
- **Destination:** Medium (PNG) in the Episode 15 section; web (SVG).

## diagram-three-arcs (`diagram-three-arcs.svg`, `diagram-three-arcs.png`, 1600x900)

- **Alt text:** Three cards, one per arc. Episode 15, Duplicates and ordering: control "2 attempts to 2 orders" (red), repair idempotency key with a UNIQUE constraint in one transaction, retest "2 attempts to 1 order" (green), "# pass 13 # fail 0". Episode 1, Trust and access: control "GET p_2002 to 200" (red), repair lookup by project id and session owner, retest "GET p_2002 to 404" (green), "# pass 7 # fail 0". Episode 17, Delivery and freshness: control "19 polls to Live" (red), repair age from sourceObservedAt with connection status shown separately, retest "age 570 s, stale from 330 s" (green), "# pass 12 # fail 0". Footnote: episode 17 runs on a simulated pipeline with one compressed clock.
- **Caption:** One method, three arcs. The control is different each time; the question it answers is the same. Numbers come from each fixture's evidence.json and executed node --test output.
- **Destination:** Medium (PNG), near the end of the Episode 17 section or in the "What exists today" section; web (SVG).

## Inline real frames used in `article.md` (copied from rendered episodes, not redrawn)

| File | Alt text | Caption |
|---|---|---|
| `../../../episodes/ep15/frames/scene_dup.png` | Real frame from episode 15: the vulnerable endpoint inserts again; two attempts, two committed orders. | Episode 15, the flaw. Simulated local fixture. |
| `../../../episodes/ep01/frames/scene_retest.png` | Real frame from episode 1: the node --test output with the control line, Alice's project returns 200, Bob's project returns 404, and spoofed identity claims change nothing. | Episode 1, the retest. 7 of 7 tests pass. |
| `../../../episodes/ep17/frames/scene_fail.png` | Real frame from episode 17: a panel says Live, updated 0 seconds ago, beside a response showing the measurement was observed 600 seconds earlier. | Episode 17, the flaw. Simulated pipeline with a compressed clock. |

Paths are relative to this folder. When publishing to Medium, upload these three PNGs from `episodes/epNN/frames/`.
