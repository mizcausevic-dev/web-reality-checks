# Image alt text, captions and destinations: Package B

SVG sources are 1600 px wide; PNGs are exported at 2x (`node tools/svg2png.mjs in.svg out.png 2`). Medium: use the PNG. Web, GitHub Pages and README: use the SVG (text stays selectable and scales cleanly).

## hero.svg / hero.png (1600×900)
- **Alt:** Dark card titled "The launch review your demo never shows." On the right, a green panel lists what a demo shows (sign-in works, every page loads, checkout completes) above an amber panel listing what a launch review asks across five arcs: whose data is this, did it run twice, where are the copies, how old is this, fast at what.
- **Caption:** A demo shows the happy path. A launch review asks what it can't: trust, duplicates, data copies, freshness and speed.
- **Destination:** Medium header image (PNG); Open Graph image; web article header (SVG).

## diagram-review-map.svg / .png (1600×1010)
- **Alt:** Five rows, one per arc of Web Reality Checks (Trust and access, Duplicates and ordering, Data lifecycle, Delivery and freshness, Experience and speed). Each row holds two numbered launch questions, ten in all, with the supporting episode numbers under each, for example question 3 "If a request is retried, what runs twice?" with episodes 15, 02 and 30.
- **Caption:** Ten launch questions, five arcs, each tied to the episodes whose fixtures and tests support it.
- **Destination:** Medium (PNG) in the section "A ten-question launch review checklist"; web (SVG).

## diagram-evidence-ladder.svg / .png (1600×970)
- **Alt:** A five-step staircase from "Seen in a demo" to "Retested after repair", with the middle steps "Described in a document", "A test exists" and "The test can fail", rising from red to green. Below, three decision cards: Hold for rungs 1 to 2 on identity, money or customer data; Go with a named risk at rung 3; Go for the tested scope at rungs 4 to 5. A footer says a passing retest does not show the product is secure.
- **Caption:** The evidence ladder: place each answer on a rung, then decide to hold, go with a named risk, or go for the tested scope.
- **Destination:** Medium (PNG) in the section "A decision framework"; web (SVG).

## diagram-ep15-loop.svg / .png (1600×900)
- **Alt:** Four panels labeled Flaw, Control, Repair and Retest, filled in with Episode 15. Flaw: lost response then retry gives two attempts and two orders. Control: a known-positive test asserts the vulnerable endpoint makes two orders. Repair: an Idempotency-Key header, a UNIQUE constraint and one transaction, with limits noted. Retest: the same sequence gives two attempts and one order; a changed quantity on the same key returns 422; five concurrent requests make one order.
- **Caption:** Flaw, Control, Repair, Retest with a real episode filled in (synthetic local fixture; values from evidence.json).
- **Destination:** Medium (PNG) in the section "How Web Reality Checks tests a claim"; web (SVG).

## Real frames used elsewhere (not in the article)
The commercial uses frames from episodes 01, 15, 16 and 17 (`video/public/launch/b-*.png`), copied from `episodes/epNN/thumbnail.png` and `episodes/epNN/frames/`. They are real product frames and keep their on-screen labels.
