# Quiz: "Five Questions Your Test Suite Should Answer" (qz01)

**Package:** A, engineers and AI-assisted builders. **Film id:** `qz01` (script: `episodes/qz01/script.json`, scenes: `video/src/episodes/qz01/Scenes.tsx`). Built with `tools/build-quiz.mjs` from a single narration take (`raw.mp3`).

Every answer below is verifiable in the repository from an `evidence.json` file, a test file or a fixture README. Fixtures for episodes 1, 15, 17, 23 and 26 were re-run for this quiz and pass.

## Opening hook (about 10 s)

Narration: "Five questions from the Web Reality Checks fixtures. Every answer comes from a test or an evidence file. Think for six seconds, then check yourself."

On screen: "Five questions your test suite should answer." with the five topics listed one by one, and a "Think time: 6 seconds each" badge.

## Timing cues (every question)

1. **Ask** (about 14 to 16 s): narrator reads the question and the three options. All options are visible from the first frame.
2. **Think** (6 s, inserted silence): amber countdown ring over the last 6 s of the ask scene.
3. **Reveal** (about 11 to 13 s): the correct option turns green, the others dim to 35 percent, the explanation and the evidence chip appear.

## Questions

### Question 1 (easy) · Episode 26 · counting queries

**Question:** The flawed article list serves 100 articles and looks up each author separately. How many SELECT statements does the counter report?

- A. 100
- B. 101
- C. 200

**Correct: B.**

**Explanation:** One list query plus one author lookup per article. The repaired JOIN reports 1, and a doctored endpoint with one hidden extra query reports 102, so the counter can fail.

**Source:** Episode 26, `fixtures/ep26-n-plus-one/evidence.json`: `flawed.selectCount` = 101 (`listQueries` 1, `authorLookups` 100), `corrected.selectCount` = 1, `knownPositiveControl.flawedWithHiddenQuery` = 102. Test: `KNOWN-POSITIVE CONTROL: a hidden extra query makes the counter report 102` in `test.mjs` (`# pass 15`, `# fail 0`).

### Question 2 (medium) · Episode 15 · idempotency keys

**Question:** A retry reuses the same idempotency key, but the quantity changed from 1 to 3. What does the corrected endpoint return?

- A. 200, replaying the old order
- B. 409
- C. 422

**Correct: C.**

**Explanation:** Same key, different request: the order count stays at 1. The key identifies an attempt, and a changed payload is treated as a mistake, not a replay. A 409 is a reasonable choice elsewhere, but this fixture documents 422.

**Source:** Episode 15, `fixtures/ep15-idempotency/evidence.json`: `scenarios.corrected_mismatched_payload.status` = 422, `change` = "qty 1 -> 3", `orderCount` = 1. Test: `same key, materially different request -> 422 and no new order` (`# pass 13`, `# fail 0`).

### Question 3 (hard) · Episode 23 · 409 versus 503

**Question:** A save hits a locked database. What does the fixture return?

- A. 409, a version conflict
- B. 503, retryable, not a conflict
- C. 200 with a warning

**Correct: B.**

**Explanation:** 409 is only for a failed version check, where zero rows matched `id AND version`. A lock is a different failure: 503 with `database_busy`, retryable, and the client keeps the unsaved text.

**Source:** Episode 23, `fixtures/ep23-optimistic-concurrency/evidence.json`: `scenarios.database_lock.status` = 503, `error` = "database_busy", `retryable` = true, `isVersionConflict` = false, `unsavedTitlePreserved` = "unsaved title". The status table is in the fixture `README.md` (`# pass 16`, `# fail 0`).

### Question 4 (medium) · Episode 1 · known-positive control

**Question:** Alice, signed in, asks the repaired endpoint for Bob's project, with a user parameter and a header claiming to be Bob. What status?

- A. 200
- B. 403
- C. 404

**Correct: C.**

**Explanation:** The server never reads those claims, and absent and inaccessible look the same by policy. The control test shows the old endpoint returned 200, so the 404 means something.

**Source:** Episode 1, `fixtures/ep01-authz/evidence.json`, log entry "alice reads bob with spoofed client identity (corrected)": status 404. Control: entry "alice reads bob (vulnerable endpoint)": status 200. Tests: `client-side identity claims do not bypass server enforcement`, `KNOWN-POSITIVE CONTROL: vulnerable endpoint returns Bob's project to Alice` (`# pass 7`, `# fail 0`).

### Question 5 (hard) · Episode 17 · stale data

**Question:** The dashboard polls every 5 seconds instead of every 30. At 570 seconds on the simulated clock, how old is the measurement?

- A. 5 seconds
- B. 30 seconds
- C. 570 seconds

**Correct: C.**

**Explanation:** Polling faster makes 119 polls instead of 19, but the collector still sampled once. Fetching faster does not observe faster.

**Source:** Episode 17, `fixtures/ep17-stale-dashboard/evidence.json`: `pollingFaster.fast` = `{pollInterval: 5, polls: 119, collectorSamples: 1, distinctCollectedAt: 1, ageAt570: 570}`; `pollingFaster.slow` = `{pollInterval: 30, polls: 19, ageAt570: 570}`. The clock is simulated and compressed (`# pass 12`, `# fail 0`).

## Closing CTA (about 12 s)

Narration: "Score yourself. Every fixture runs with Node's built-in test runner, and every answer sits in an evidence file. The repository is linked below. Break something on purpose."

On screen: "Score yourself.", the command `node --test fixtures/ep26-n-plus-one/test.mjs`, the repository URL, and the author line.

## YouTube package

**Title (53 chars):** 5 Questions Your Test Suite Should Answer (Node Quiz)

**Description:**

Five multiple-choice questions for engineers, each answerable from a runnable fixture in the Web Reality Checks repository: N+1 query counts, idempotency keys, 409 versus 503, a spoofed identity against a repaired endpoint, and a dashboard that says Live. Pause for the 6 second countdown, then check the answer and the evidence file behind it.

Chapters (from the built timeline):
00:00 Intro
00:09 Question 1: query count
00:44 Question 2: idempotency key
01:20 Question 3: 409 or 503
01:54 Question 4: spoofed identity
02:28 Question 5: stale data
03:02 Score yourself

Repository: github.com/mizcausevic-dev/web-reality-checks
Article: [article link]
Playlist: [YouTube playlist link]

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

**Tags (14):** web development quiz, node test runner, idempotency key, N+1 query, 409 vs 503, http status codes, authorization bug, stale data, known-positive control, software testing, backend engineering, regression testing, developer quiz, Web Reality Checks

**Thumbnail concept:** 1280x720. Three large option tiles A, B, C in cyan outlines on the right, with "101" glowing green on tile B. Left: "5 questions" in warm white, 120 px, and the kicker "Web Reality Checks · Quiz". No faces, no other products' logos.

## What is real in this video

All five answers come from the repository's fixtures. The cards, options, countdown and evidence chips are designed graphics, not recordings. Episode 17 results come from a simulated pipeline with one compressed clock. The video uses no frames from episodes 23 and 26, whose films may not be rendered yet; their facts come from the fixtures only.

<!-- timings:start -->
## Final timings (built from the narration)

Film `qz01`, 195.4 s. Scene starts: hook 00:00, q1 00:09, a1 00:31, q2 00:44, a2 01:08, q3 01:20, a3 01:42, q4 01:54, a4 02:17, q5 02:28, a5 02:51, close 03:02. Each question scene includes six silent seconds of think time inserted by `tools/build-quiz.mjs`. Scene boundaries come from transcript word timestamps.
<!-- timings:end -->
