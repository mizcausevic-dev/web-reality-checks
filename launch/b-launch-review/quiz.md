# Quiz: "Launch Review Quiz: Five Questions Your Demo Can't Answer" (qz02)

Film id `qz02` · tag "Quiz" · audience: founders, product managers, buyers · runtime estimate about 2.5 to 3 minutes (about 393 narration words plus six silent seconds per question; the real length comes from the narration take). Built with `node tools/build-quiz.mjs qz02` from one narration take (`raw.mp3`), one paragraph per scene.

## Opening hook (scene `hook`)
"Five questions from the launch review your demo never shows. Each answer comes from a real test result in the Web Reality Checks repository. Question, three options, six seconds to think, then the answer."

## Timing cues (every question)
1. **Ask:** narrate the question and the three options; the options are fully on screen from the first second.
2. **Think:** six seconds of silence inserted by the tool; a countdown ring appears only during those six seconds.
3. **Reveal:** narrate the answer and the explanation; the correct option turns green, the others dim, and a chip shows the episode and the evidence value.

## Questions

### Question 1 · Trust & access · easy
**Ask:** Alice is signed in and asks for Bob's private project. In the flawed version of the app, what does the server answer?
- A: An error, access refused
- B: Bob's project, status 200
- C: Not found (404)

**Correct: B.**
**Explanation:** The server checked that Alice was signed in, never that the project was hers. After the repair, the same request returns 404.
**Source:** Episode 01. Fixture fact: `fixtures/ep01-authz/evidence.json`, log entry "alice reads bob (vulnerable endpoint)": status 200, `project.ownerId` `u_bob`; the same request on the corrected endpoint: status 404.

### Question 2 · Duplicates & ordering · easy
**Ask:** A customer clicks Pay once. The confirmation is lost and the app retries. In the flawed version, how many orders exist?
- A: One
- B: Two
- C: Three

**Correct: B.**
**Explanation:** Nothing linked the retry to the first request. With a unique key per purchase, the repaired version ends with one order.
**Source:** Episode 15. Fixture fact: `fixtures/ep15-idempotency/evidence.json`, `scenarios.vulnerable_lost_response.orderCount` = 2; `scenarios.corrected_lost_response.orderCount` = 1.

### Question 3 · Data lifecycle · hard
**Ask:** A directory has 10,000 listings. Its checker records 3,875 problems. How many different listings were flagged?
- A: 3,875
- B: 3,303
- C: 6,697

**Correct: B.**
**Explanation:** Some listings carry several flags (485 have two, 42 have three, 1 has four), so problems and affected listings are different counts. Option C is the number of clean listings.
**Source:** Episode 05. Fixture fact: `fixtures/ep05-directory-quality/evidence.json`: `total` 10000, `totalIssueInstances` 3875, `uniqueFlaggedListings` 3303, `cleanListings` 6697, `flagsPerListing` {1: 2775, 2: 485, 3: 42, 4: 1}. Synthetic dataset.

### Question 4 · Delivery & freshness · medium
**Ask:** A dashboard says Live, updated 0 s ago. Its sensor samples every 600 s. Just before the next sample, how old is the reading?
- A: 0 seconds
- B: 30 seconds
- C: 570 seconds

**Correct: C.**
**Explanation:** The label described the page refresh, not the measurement. At 570 s the reading was past the fixture's 300 s stale threshold.
**Source:** Episode 17. Fixture fact: `fixtures/ep17-stale-dashboard/evidence.json`, `scenarios.healthy.rows` entry `t: 570`: `measurementAgeSeconds` 570, `naiveLabel` "Live", `naiveUpdatedSecondsAgo` 0, `freshness` "stale"; policy `COLLECT_INTERVAL_SECONDS` 600, `STALE_THRESHOLD_SECONDS` 300. The clock is simulated.

### Question 5 · Experience & speed · medium
**Ask:** In the flawed version, eight keystrokes sent 17 requests and 12 were rejected. After the repair, how many requests for the same typing?
- A: Eight
- B: Four
- C: One

**Correct: C.**
**Explanation:** The repaired client waits for typing to pause, drops stale answers and respects the retry delay.
**Source:** Episode 16. Fixture fact: `fixtures/ep16-rate-limit/evidence.json`: `flawed.summary.clientRequests` 17, `client429` 12; `corrected.summary.clientRequests` 1, `client429` 0. Times in that fixture are virtual.

## Difficulty mix
Two easy (1, 2), two medium (4, 5), one hard (3). Questions 1 and 2 test whether the viewer can read a failure; question 3 needs the idea that a count of problems is not a count of affected items; questions 4 and 5 turn on the difference between what a label or a screen shows and what happened underneath. Each question maps to a different arc.

## Closing CTA (scene `close`)
"That is the launch review in miniature: ask for the test, not the demo. The ten questions and every fixture are in the repository, linked below. Synthetic fixtures, not an audit or certification." On screen: github.com/mizcausevic-dev/web-reality-checks.

## YouTube
**Title (≤60):** Launch Review Quiz: 5 Questions Your Demo Can't Answer

**Description:**
Five multiple-choice questions from the launch review your demo never shows. Each answer comes from a real test result in the Web Reality Checks repository: a user reading another user's data, a retry that creates two orders, a count that hides how many items are affected, a "Live" label over old data, and a search box that sends too many requests. Written for founders, product managers and buyers. Not an audit or a certification.

The ten-question launch review checklist: [Medium link]
Playlist: [YouTube playlist link]
Repository: https://github.com/mizcausevic-dev/web-reality-checks

0:00 Intro
Q1 to Q5 chapter times are filled from `video/src/episodes/qz02/timeline.json` after the narration is built.

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

**Tags (15):** launch review quiz, software quiz, product manager quiz, founder, vendor due diligence, access control, idempotency, data quality, stale data, rate limiting, regression tests, web reality checks, startup, software testing, tech quiz

**Thumbnail concept:** Near-black background; a large cyan "5" inside a ring; headline "Can you pass the launch review?" in warm white, 88 px; five small colored dots below (red, amber, cyan, green, violet) for the five arcs. Overline "Web Reality Checks · Quiz". No product UI, no faces.

## Label
Scenes carry the label SIMULATED LOCAL FIXTURE (question and answer scenes) or PROMOTIONAL FILM (hook, close). All values are copied from the fixtures named above; none is estimated.
