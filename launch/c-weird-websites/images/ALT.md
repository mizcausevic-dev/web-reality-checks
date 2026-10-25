# Image alt text, captions and destinations

All SVGs use `viewBox` 1600 wide. The main PNGs are exported at 1x (`node tools/svg2png.mjs in.svg out.png 1`): hero 1600×900, diagrams 1600 wide. A 2x copy of each (`*@2x.png`, made with scale 2) is included for high-density displays. Medium: upload the PNG. Web, README and repository pages: use the SVG. Visual system: background `#0b0c10`, panels `#171a21`, cyan normal flow, amber uncertainty, red failure, green pass, violet accent.

## hero.svg / hero.png (1600×900 canvas)
- **Alt text:** Dark poster titled "Why do websites do weird things?" with five rounded cards, each pairing an everyday glitch with an everyday object: two orders from one tap (Episode 15), an old page waiting behind a new build (Episode 12), a welcome letter addressed to Alice reaching Bob (Episode 24), a calendar square 15 January next to a clock reading 7 pm Jan 14 (Episode 22), and an empty shelf with a card still in the drawer (Episode 21).
- **Caption:** Five everyday website glitches, each paired with an everyday object, from episodes 12, 15, 21, 22 and 24 of Web Reality Checks.
- **Destination:** Medium article header (PNG) and social preview; SVG for the repository and web.

## diagram-chain.svg / diagram-chain.png (1600×900)
- **Alt text:** Diagram of a chain of five boxes from left to right: your screen, browser helper, server, saved copies, filing cabinet. Solid arrows carry the question to the right and dashed arrows carry the answer back. Five dotted lines connect cards for episodes 22, 12, 15, 24 and 21 to the box where each glitch lives, with an everyday object for each: birthday versus flight, manager at the door, dropped pizza call, one welcome letter, card in the drawer.
- **Caption:** A website is a chain of helpers, and each keeps its own copy. This map shows where each of the five glitches lives.
- **Destination:** Medium (PNG), after the first section; SVG for web.
- **Type:** Conceptual map; not product output.

## diagram-retry.svg / diagram-retry.png (1600×930)
- **Alt text:** Two five-step rows. Without a ticket number: attempt, server saves order 1, reply lost, app retries, server saves order 2, ending in "2 attempts → 2 orders". With a ticket number: the same steps, but the server finds the ticket and returns order 1, ending in "2 attempts → 1 order". A footer notes that five simultaneous requests with one ticket gave one order, that changing the quantity from 1 to 3 under the same ticket was refused with 422, and that two tickets gave two orders.
- **Caption:** Same retry, different memory: without a ticket number two attempts made two orders, with one they made one (local synthetic fixture).
- **Destination:** Medium (PNG) in section 1; SVG for web.
- **Source:** `fixtures/ep15-idempotency/evidence.json`; 13 of 13 fixture tests pass.

## diagram-date.svg / diagram-date.png (1600×940)
- **Alt text:** Table of three rows and three columns (UTC, New York, Tokyo). Flawed row: deadline 2026-01-15 treated as midnight UTC shows Jan 15 at 00:00 in UTC, Jan 14 at 19:00 in New York, Jan 15 at 09:00 in Tokyo. Repaired row: kept as a date, it shows Jan 15 in all three. Meeting row: a 15:00 UTC meeting shows Jan 15 15:00, Jan 15 10:00 and Jan 16 00:00.
- **Caption:** The same deadline read as a moment shows January 14 in New York; kept as a date it shows January 15 everywhere (local synthetic fixture).
- **Destination:** Medium (PNG) in section 4; SVG for web.
- **Source:** `fixtures/ep22-date-only-timezones/evidence.json`; 15 of 15 fixture tests pass.
