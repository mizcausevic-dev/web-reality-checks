# Quiz: "Why Do Websites Do Weird Things?" (qz03)

Five multiple-choice questions for a general audience. Every answer is a value in a fixture's `evidence.json` or a passing test in the repository. All data is synthetic, and the fixtures run on a local machine.

**Script file:** `episodes/qz03/script.json` (n 113, tag "Quiz"). **Scenes:** `video/src/episodes/qz03/Scenes.tsx`. About 351 narrated words.

## Opening hook (spoken)
"Five weird website moments, five questions. Every answer comes from a test in the open repository, using made-up people and made-up data. Let's see how you do."

## Timing cues (per question)
1. **Ask:** the question and the three options are on screen from the first frame while the narrator reads them (about 12 to 15 s).
2. **Think:** 6 s of silence with a countdown ring in the last 6 s of the scene (the build tool inserts the silence).
3. **Reveal:** the narrator gives the answer and the explanation (about 8 to 10 s); the correct option turns green, the others dim, and a chip shows the episode and the evidence value.

## Questions

### Q1. The double charge (easy)
Someone taps Pay once. The shop saves the order, but the reply is lost, so the app retries with the same ticket number. How many orders exist afterwards?
- A. One
- B. Two
- C. Three

**Correct: A.** The server recognized the same ticket number and returned the saved order instead of making a new one. Without a ticket number the same test produced two orders.
**Source:** Episode 15. `fixtures/ep15-idempotency/evidence.json`: `scenarios.corrected_lost_response.orderCount` = 1 (and `scenarios.vulnerable_lost_response.orderCount` = 2). Test: "corrected endpoint: lost response + retry with the same key creates ONE order (two attempts)".

### Q2. The old page (medium)
A new version of the site is published, but your open tab still shows Build 1. In our model, what happens to Build 2?
- A. It replaces Build 1 at once
- B. It installs and waits
- C. It is deleted

**Correct: B.** The old version keeps control of the open page until the new one is allowed to take over. This is a model of the browser lifecycle, not a browser recording.
**Source:** Episode 12. `fixtures/ep12-sw-update/evidence.json`: `modelSteps` entry "5-6 registration.update(): Build 2 installed, WAITING behind Build 1" has `waiting.label` = "build2", `active.label` = "build1", `pageShows` = "Build 1". Test: "Build 2 installs and WAITS behind active Build 1; page stays controlled by Build 1; notice shown".

### Q3. The wrong name (easy to medium)
Alice loads her dashboard. Then Bob loads his. In the flawed test, what does Bob see?
- A. Welcome back, Bob
- B. An error page
- C. Welcome back, Alice

**Correct: C.** The app saved Alice's page under the label `/dashboard`, which has no person in it, and handed the same page to Bob even though both had signed in correctly.
**Source:** Episode 24. `fixtures/ep24-shared-cache-leak/evidence.json`: `flawed.bobGreeting` = "Welcome back, Alice", `flawed.bobAppCache` = "HIT", `cacheKey.value` = "/dashboard". Test: "CONTROL: flawed cache gives Bob the page Alice populated (authentication was correct)".

### Q4. The date one day off (hard)
The deadline is the calendar date January 15. The flawed page shows it on a New York clock. Which date appears?
- A. January 15
- B. January 16
- C. January 14

**Correct: C.** The date was read as midnight UTC (London time in winter), which is 7 pm the evening before in New York. Tokyo, ahead of UTC, still showed January 15, which is why option A is tempting.
**Source:** Episode 22. `fixtures/ep22-date-only-timezones/evidence.json`: `flawed[1]` (zone America/New_York) has `date` = "2026-01-14", `time` = "19:00". Test: "known-positive control: flawed path, computed by raw Intl.DateTimeFormat, shows the PREVIOUS date in New York".

### Q5. Deleted but still visible (medium)
Contact c_1003 is deleted and a direct lookup says not found. In the flawed version, what does a search for "dana" return?
- A. The contact is still listed
- B. Nothing
- C. An error

**Correct: A.** The flawed delete removed only the main record. The search list kept its own copy, so the search still returned c_1003.
**Source:** Episode 21. `fixtures/ep21-deletion-copies/evidence.json`: `scenarios.flawed.afterDelete.primaryGet` = 404 and `scenarios.flawed.search_dana_uncached.ids` = ["c_1003"]. Test: "flawed delete leaves the index and cached response returning the contact" (known-positive control).

## Answer key
A, B, C, C, A. Difficulty: easy, medium, easy-medium, hard, medium.

## Closing CTA (spoken)
"That is five weird moments, each tested on a laptop. Run the tests yourself. The repository is linked below."
On screen: github.com/mizcausevic-dev/web-reality-checks, a frame from Episode 15, "The repository, linked below".

## YouTube
**Title (≤60 chars):** Weird Websites Quiz: 5 Questions, 5 Real Test Results

**Description:**
```
Can you guess what a website does when a reply is lost, a page updates, or a date crosses a time zone? Five questions, each answered by a real test.

Repository (code, tests, fixtures): https://github.com/mizcausevic-dev/web-reality-checks
Article: [Medium link]

Questions cover a double order (Episode 15), an old page after an update (Episode 12), someone else's name (Episode 24), a date one day off (Episode 22) and a deleted record that still shows (Episode 21). Every answer is a value from a local fixture's evidence file. The Episode 12 answer comes from a model of the browser lifecycle, not a browser recording.

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC
```

**Tags:** website quiz, why do websites do weird things, tech quiz for beginners, web explainer, charged twice online, website shows old version, time zone bug, deleted but still showing, cache explained, Web Reality Checks, software testing explained, general knowledge tech

**Thumbnail concept.** Dark background, large "5 questions" numeral in cyan beside the headline "Weird websites quiz", and three A/B/C option chips with the C chip glowing green. Small kicker "Web Reality Checks · Quiz". Uses the visual system only (no photography).

<!-- timings:start -->
## Final timings (built from the narration)

Film `qz03`, 172.4 s. Scene starts: hook 00:00, q1 00:10, a1 00:32, q2 00:42, a2 01:05, q3 01:16, a3 01:36, q4 01:44, a4 02:05, q5 02:14, a5 02:35, close 02:43. Each question scene includes six silent seconds of think time inserted by `tools/build-quiz.mjs`. Scene boundaries come from transcript word timestamps.
<!-- timings:end -->
