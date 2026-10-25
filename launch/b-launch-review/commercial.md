# Commercial: "The Launch Review Your Demo Never Shows" (cm02)

Film id `cm02` · tag "Launch film" · kicker "Official trailer" · target 55 to 75 s (estimate from 175 narration words: about 71 s; the real length comes from the narration audio) · 1920×1080, 30 fps · audience: founders, product managers, buyers.

## Concept
A launch demo ends with a green "Demo complete." The trailer starts there and asks what the demo cannot answer: another customer's data, a retried payment, a "Live" label over old data. It then shows the method (Flaw, Control, Repair, Retest), two moments of real footage with real numbers, maps the series to ten questions across five arcs, states plainly that it is not an audit or a certification, and ends on the repository.

## Storyboard
Durations are estimates from `node tools/build-timeline.mjs cm02 --no-audio`; the orchestrator rebuilds them from the narration.

| Scene id | Seconds (est.) | Visual | On-screen text | Persistent label |
|---|---|---|---|---|
| hook | 0 to 8 | Illustrative demo window; three green checks tick in, then "Demo complete." | Sign-in works / Every page loads / Checkout completes / Demo complete. / Questions the demo cannot answer | CONCEPTUAL ILLUSTRATION |
| problem | 8 to 20 | Three cards appear in turn (red, amber, cyan), each with a one-line illustrative snippet | A customer asks for someone else's data / A payment retried after a lost response / A dashboard says Live, with old data | CONCEPTUAL ILLUSTRATION |
| method | 20 to 30 | Four boxes light up left to right with arrows | Flaw / Control / Repair / Retest, each with a one-line gloss | CONCEPTUAL ILLUSTRATION |
| proof | 30 to 39 | Real Episode 15 frame (cropped); crossfade to a green panel with the retest numbers | 2 attempts, 2 orders; then After the repair: 2 attempts, 1 order | FOOTAGE FROM EPISODE 15 |
| live | 39 to 46 | Real Episode 17 frame | Served 0 s ago. Measured 600 s ago. | FOOTAGE FROM EPISODE 17 |
| range | 46 to 54 | Five arc rows slide in beside the Episode 01 thumbnail and an Episode 16 frame | Five arcs, ten questions; 2 questions per arc | FOOTAGE FROM EPISODES 01 AND 16 |
| limits | 54 to 62 | Large type, then three badges | Not an audit. Not a certification. / Synthetic data / Loopback only / Limits stated per episode | PROMOTIONAL FILM |
| cta | 62 to 71 | Repository URL in a glowing box | Run the tests. Ask the questions. / github.com/mizcausevic-dev/web-reality-checks / The repository, linked below. / Miz Causevic, Kinetic Gain LLC | PROMOTIONAL FILM |

## Voiceover (175 words, one paragraph per scene)

The demo went perfectly. Every screen loaded. So why start a launch review with questions the demo cannot answer?

A demo shows one person doing everything right. It never shows a customer asking for someone else's data, a payment retried after a lost response, or a dashboard labelled live.

Web Reality Checks turns each question into a short film. Reproduce the flaw. Prove the test can fail. Apply the smallest repair. Run the same test again.

Pay once, lose the response, retry: two attempts, two orders. After the repair: two attempts, one order. Real numbers from the fixture.

Another fixture shows a Live label over a ten-minute-old reading. The label described the page, not the measurement.

Five arcs, from trust and access to experience and speed, become ten questions you can put to any team or vendor.

Not an audit, not a certification. The fixtures are synthetic, and every episode states what it does not prove.

Clone the fixtures, run the tests, and take the questions to your next launch meeting. The repository, linked below.

## Caption lines (as in `episodes/cm02/script.json`)
1. The demo went perfectly. Every screen loaded.
2. So why start a launch review with questions the demo cannot answer?
3. A demo shows one person doing everything right.
4. It never shows someone else's data, a retried payment, or a stale "Live".
5. Each question becomes a short film.
6. Flaw, control, repair, retest.
7. Pay once, lose the response, retry: 2 attempts, 2 orders.
8. After the repair: 2 attempts, 1 order.
9. A Live label over a ten-minute-old reading.
10. The label described the page, not the measurement.
11. Five arcs become ten questions for any team or vendor.
12. Not an audit. Not a certification.
13. Synthetic fixtures. Every episode states its limits.
14. Clone the fixtures. Run the tests.
15. The repository, linked below.

## Call to action
Repository URL on screen (github.com/mizcausevic-dev/web-reality-checks) and spoken as "the repository, linked below." Secondary: read the ten-question checklist in the article (link in the description).

## YouTube
**Title (≤60):** The Launch Review Your Demo Never Shows (Trailer)

**Description:**
Your demo passed. A launch review asks what the demo can't show: whose data is this, did it run twice, how old is "Live"? Ten questions for founders, product managers and buyers, each tied to a runnable test.

What the trailer shows: the Flaw, Control, Repair, Retest method; real footage from Episode 15 (two attempts, two orders, then one) and Episode 17 (a Live label over a ten-minute-old reading); five arcs mapped to ten launch questions. This is not an audit or a certification.

Read the checklist: [Medium link]
Playlist: [YouTube playlist link]
Repository: https://github.com/mizcausevic-dev/web-reality-checks

0:00 The demo went perfectly
0:08 What a demo never shows
0:20 The method
0:30 Real footage: Episode 15
0:39 Real footage: Episode 17
0:46 Five arcs, ten questions
0:54 What this is not
1:02 Run the tests

(Chapter times are estimates; the orchestrator replaces them from `video/src/episodes/cm02/timeline.json`.)

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

**Tags (15):** launch review, software launch checklist, product manager, founder, vendor due diligence, software testing, regression tests, idempotency, access control, web reality checks, demo vs production, startup, software quality, test-first, due diligence questions

**Thumbnail concept:** Near-black background. Left: "Demo complete." with a green check inside a plain browser-chrome box. Right: three amber question marks over the three card colors (red, amber, cyan). Headline in warm white, 90 px: "The demo passed. Now what?" Small cyan overline "Web Reality Checks · Official trailer". No real-product UI, no faces, no logos.

## Real product versus conceptual
**Real product (frames and numbers):**
- Scene `proof`: a frame from `episodes/ep15/frames/scene_dup.png` (copied to `video/public/launch/b-ep15-dup.png`), plus the retest numbers from `fixtures/ep15-idempotency/evidence.json` (`corrected_lost_response`: 2 attempts, `orderCount` 1; `vulnerable_lost_response`: `orderCount` 2).
- Scene `live`: a frame from `episodes/ep17/frames/scene_fail.png` (`b-ep17-live.png`), with the simulated clock stated on screen.
- Scene `range`: `episodes/ep01/thumbnail.png` (`b-ep01-thumb.png`) and `episodes/ep16/frames/scene_fail.png` (`b-ep16-fail.png`).

**Conceptual (labelled CONCEPTUAL ILLUSTRATION on screen):** the demo window in `hook`, the three question cards in `problem` (their snippets illustrate the questions and are not output), and the four-step diagram in `method`. `limits` and `cta` are promotional cards.

Nothing in the film claims the fixtures describe a real product. Cropped frames hide their baked-in caption strip; their own on-screen labels (for example SIMULATED LOCAL FIXTURE) remain visible.
