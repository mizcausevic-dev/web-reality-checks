# Commercial: "Break It on Purpose" (cm01)

**Package:** A, engineers and AI-assisted builders. **Film id:** `cm01` (script: `episodes/cm01/script.json`, scenes: `video/src/episodes/cm01/Scenes.tsx`).

## Concept

A green test run is not evidence unless the same test could have gone red. The trailer shows that in 60 to 70 seconds using real footage: a real `node --test` output from episode 1 with its known-positive control line singled out, the "one tap, two orders" frame from episode 15, the Flaw, Control, Repair, Retest loop, and the real before and after numbers from the fixtures. It ends on the repository URL and the line "the repository, linked below."

Audience: engineers and people reviewing AI-assisted code. Tone: dry, specific, no hype. No testimonials, no view counts, no claims beyond what the repository shows.

**Runtime target:** 55 to 75 s. The timings below come from the built timeline (66.3 s, from the real narration).

## Storyboard

| Scene id | Est. seconds | Visual | On-screen text |
|---|---|---|---|
| `hook` | 0.0 - 7.3 | Real still from episode 1 (retest scene), cropped to the executed `node --test` output. An amber outline appears around the control line. Tag: FOOTAGE FROM EPISODE 01. | "A green test run" / "Could it have gone red?" / "The amber line is a known-positive control: it passes only because the flaw is real." |
| `problem` | 7.3 - 18.3 | Real still from episode 15 (one tap, two orders). Three boxes appear in sequence under it. Tag: FOOTAGE FROM EPISODE 15. | "1 · request commits order 1" / "2 · response is lost" / "3 · retry counted as new" / "A fix test that never failed proves nothing." |
| `method` | 18.3 - 30.0 | Four panels revealed one by one, Flaw (red), Control (amber), Repair (cyan), Retest (green), each with a chip from the episode 15 fixture. Tag: CONCEPTUAL ILLUSTRATION. | "Flaw / Reproduce it on a local fixture" / "Control / Prove the test can fail" / "Repair / The smallest change" / "Retest / Same schedule, real numbers" |
| `proof` | 30.0 - 38.6 | Real still from episode 15 (retest scene), plus two readouts and a test summary built from `fixtures/ep15-idempotency/evidence.json` and the executed run. Tag: FOOTAGE FROM EPISODE 15. | "Control · flawed endpoint: 2 → 2" / "After the repair: 2 → 1" / "# tests 13  # pass 13  # fail 0" / "Observed from the local fixture: fixtures/ep15-idempotency/evidence.json" |
| `access` | 38.6 - 44.9 | Two status readouts (200 red, 404 green) beside a cropped real still from episode 1 showing the three retest cards. Tag: FOOTAGE FROM EPISODE 01. | "Alice asks for Bob's project" / "Before the repair: 200" / "After the repair: 404" / "7 of 7 tests pass" |
| `range` | 44.9 - 53.2 | Three real episode thumbnails (15, 1, 17), one per arc, each with its executed pass line. Tag: FOOTAGE FROM EPISODES 01, 15, 17. | "Duplicates & ordering" / "Trust & access" / "Delivery & freshness" / "Each one states what it does not prove." / "node --test fixtures/epNN-slug/test.mjs" |
| `cta` | 53.2 - 64.2 | Title card, one command, the repository URL. Tag: PROMOTIONAL FILM. | "Break it on purpose. Then fix it." / "node --test fixtures/ep15-idempotency/test.mjs" / "github.com/mizcausevic-dev/web-reality-checks" / "The repository, linked below." |

## Voiceover (full copy, 157 words)

A test goes green. Is the bug fixed? Only if that same test could have gone red.

One tap on Pay, two orders. The first request committed, the response was lost, and the retry counted as new. A fix test that never failed proves nothing.

So every episode runs four moves. Flaw: reproduce it on a local fixture. Control: prove the test can fail. Repair: the smallest change. Retest: the same schedule, with real numbers.

Episode fifteen. The control reports two attempts, two orders. After the repair: two attempts, one order, and thirteen of thirteen tests pass.

Episode one. Alice asks for Bob's project. Two hundred before the repair. Four oh four after.

Duplicates, access, stale data. Local fixtures you run with Node's built-in test runner. Each one says what it does not prove.

Break it on purpose. Then fix it. The repository, linked below, is open. Clone it and fork a fixture for your own stack.

## Caption lines (also in script.json, each 90 characters or fewer)

1. A test goes green. Is the bug fixed? / Only if that same test could have gone red.
2. One tap on Pay, two orders. / The response was lost, and the retry counted as new. / A fix test that never failed proves nothing.
3. Flaw: reproduce it on a local fixture. / Control: prove the test can fail. / Repair: the smallest change. Retest: the same schedule.
4. Episode 15: the control reports 2 attempts, 2 orders. / After the repair: 2 attempts, 1 order. 13 of 13 tests pass.
5. Episode 1: Alice asks for Bob's project. / 200 before the repair. 404 after.
6. Duplicates, access, stale data. / Local fixtures, Node's built-in test runner. / Each one says what it does not prove.
7. Break it on purpose. Then fix it. / The repository, linked below. Clone it, fork a fixture.

## Call to action

Repository URL on screen (github.com/mizcausevic-dev/web-reality-checks) and spoken as "the repository, linked below". Secondary: read the article for the full walkthrough.

## YouTube package

**Title (49 chars):** Break It on Purpose: Prove Your Bug Test Can Fail

**Description:**

A green test run means something only if the same test could have failed. This 60 second trailer shows the Flaw, Control, Repair, Retest method behind Web Reality Checks, with real frames from episodes 1 and 15 and numbers from their fixtures.

What you see: a lost response and a retry that creates two orders, then one order after an idempotency key with a UNIQUE constraint and a single transaction, with 13 of 13 tests passing. Then a project that returns 200 to the wrong user, and 404 after the repair. The known-positive control is the test that proves the flaw is visible before you trust the fix.

What it does not claim: the repairs cover the demonstrated paths only. Nothing here is an audit or a certification.

Full written walkthrough: [article link]
Playlist: [YouTube playlist link]
Repository: github.com/mizcausevic-dev/web-reality-checks

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

**Tags (15):** known-positive control, regression testing, node test runner, node --test, idempotency key, duplicate orders, authorization bug, stale dashboard, web bugs, software testing, AI generated code review, test driven debugging, backend testing, web development, Web Reality Checks

**Thumbnail concept:** 1280x720. Left: "Break it on purpose." in warm white, 100 px, two lines. Right: a cropped real still from episode 1 showing the test output with the amber control line outlined, scaled to fill a rounded panel. Small cyan kicker "Web Reality Checks · Official trailer". No faces, no logos of other products.

## Real versus conceptual

| Element | Status |
|---|---|
| Stills of episodes 1 and 15 (retest, one tap two orders) | Real product frames, copied from `episodes/ep01/frames/` and `episodes/ep15/frames/` |
| Thumbnails of episodes 1, 15, 17 | Real product thumbnails |
| 2 → 2, 2 → 1, 13 of 13 tests | Real: `fixtures/ep15-idempotency/evidence.json` and the executed `node --test` run |
| 200 and 404, 7 of 7 tests | Real: `fixtures/ep01-authz/evidence.json` and the executed `node --test` run |
| Four-panel Flaw, Control, Repair, Retest loop | Conceptual illustration of the method; the chips repeat episode 15 values |
| Title and call-to-action cards | Promotional |

Fixture results come from local synthetic fixtures. The lost response in episode 15 is a controlled server-side socket destroy, not a real network partition.

<!-- timings:start -->
## Final timings (built from the narration)

Film `cm01`, 66.3 s. Scene starts: hook 00:00, problem 00:07, method 00:18, proof 00:31, access 00:40, range 00:47, cta 00:55. Scene boundaries come from detected silences (a heuristic that can be about a second off).
<!-- timings:end -->
