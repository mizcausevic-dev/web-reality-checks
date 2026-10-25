# Commercial: "Why Do Websites Do Weird Things?" (cm03)

**Concept.** A 70-second trailer for a general audience. It opens on the most relatable glitch (one tap on Pay, two orders), widens to four more strange moments, explains the method in one sentence (Flaw, Control, Repair, Retest), proves it with real frames and real test numbers from Episode 15, shows the everyday objects used to explain each moment, states the limits, and ends on the repository.

**Runtime target.** 55 to 75 seconds. Estimated 70 s from the narration word count (about 171 words) before real audio exists. The orchestrator rebuilds the timeline from the narration take.

**Script file.** `episodes/cm03/script.json` (n 103, tag "Launch film", kicker "Official trailer"). **Scenes:** `video/src/episodes/cm03/Scenes.tsx`.

## Storyboard

| Scene id | Est. seconds | Visual | On-screen text | Persistent label |
|---|---|---|---|---|
| hook | 0 to 6 | Real frame from Episode 15 (vulnerable run: order 1 and order 2 committed, 2 attempts, 2 orders) under a headline | "You tapped Pay once." then "Two orders." | FOOTAGE FROM EPISODE 15 |
| problem | 6 to 18 | Four cards appear one by one: real Episode 12 frame (tab still on Build 1), then conceptual cards for episodes 24, 22 and 21 using values from their evidence.json | "An old page after an update", "Someone else's name", "A date one day off", "A deleted record still shows", "Nobody edited anything. Something kept a copy." | PROMOTIONAL FILM |
| method | 18 to 31 | Four boxes appear in sequence with Episode 15 filled in | "Flaw. Control. Repair. Retest." plus one line per step | CONCEPTUAL ILLUSTRATION |
| proof | 31 to 43 | Two real Episode 15 frames side by side (without and with a ticket number), then the test badge | "2 attempts → 2 orders", "2 attempts → 1 order", "node --test # pass 13 # fail 0" | FOOTAGE FROM EPISODE 15 |
| range | 43 to 52 | Real thumbnails for episodes 15 and 12, an evidence card for Episode 21, and three everyday-object cards | "A dropped phone call", "A manager at the door", "A library card in the drawer" | PROMOTIONAL FILM |
| limits | 52 to 63 | Four statement boxes | "Made-up people and made-up data", "Runs only on a local machine, no real payment", "Not an audit of any real product or company", "Each fix covers only the problem it shows" | CONCEPTUAL ILLUSTRATION |
| cta | 63 to 70 | Repository URL in a glowing box | "Watch it. Break it. Run the tests." / github.com/mizcausevic-dev/web-reality-checks / "The repository, linked below" | none |

## Voiceover (full copy)
You tapped Pay once. The app made two orders. Nothing you did was wrong.

Websites do strange things. A page that stays old after an update. Someone else's name on your screen. A date one day off. A deleted record that still shows up.

Web Reality Checks explains why. Each film rebuilds one glitch as a small pretend app on a laptop, breaks it on purpose, proves the test can fail, applies the smallest fix, and tests again.

Take the double charge. Without a ticket number on each attempt, two attempts made two orders. With a ticket number, two attempts made one order. Thirteen tests pass in that fixture.

Every strange moment gets everyday objects: a dropped phone call, a manager waiting at the door, a library card left in the drawer.

Everything uses made-up data on a local machine. It is not an audit of any real product, and each fix covers only the problem it shows.

Watch the films and run the tests yourself. The repository is linked below.

## Caption lines (bottom bar, in order)
1. You tapped Pay once. The app made two orders.
2. Nothing you did was wrong.
3. An old page after an update. Someone else's name.
4. A date one day off. A deleted record that still shows.
5. Flaw. Control. Repair. Retest.
6. Each glitch rebuilt as a small pretend app on a laptop.
7. Without a ticket number: two attempts, two orders.
8. With a ticket number: two attempts, one order.
9. Everyday objects explain each strange moment.
10. Made-up data, local machine.
11. Not an audit of any real product.
12. Watch the films. Run the tests yourself.
13. The repository, linked below.

## CTA
Repository URL on screen (github.com/mizcausevic-dev/web-reality-checks), spoken as "the repository, linked below". In the YouTube description the same link is the first line after the hook.

## YouTube
**Title (≤60 chars):** Why Do Websites Do Weird Things? Five Glitches Explained

**Description:**
```
You tapped Pay once and got two orders. A one-minute look at why websites do weird things, with real frames and real test results.

Repository (code, tests, fixtures): https://github.com/mizcausevic-dev/web-reality-checks
Article: [Medium link]
Playlist: [YouTube playlist link]

What you see: an old page after an update, someone else's name, a date one day off, a deleted record that still shows, and a double order. Each one is rebuilt as a small pretend app, tested, repaired and tested again. The test numbers shown come from Episode 15's local fixture.

This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC
```

**Tags:** why do websites do weird things, charged twice online, website showing old version, website shows someone else's name, date off by one day, deleted but still showing, web explainer, how websites work, double order bug, Web Reality Checks, software testing explained, tech explained simply, idempotency explained, time zone bug, cache explained

**Thumbnail concept.** Dark panel (#0b0c10), large headline "Why do websites do weird things?" in warm white, with the Episode 15 vulnerable frame (order 1 and order 2) dimmed behind it and a red "2" accent. Small cyan kicker "Web Reality Checks · Official trailer". Based on the hero in `images/hero.svg`; no faces, no stock imagery.

## Real product versus conceptual
**Real product (from rendered episodes 12, 15 and 17 and their files):**
- `c-ep15-dup.png` and `c-ep15-retest.png`: frames from `episodes/ep15/frames/`, cropped on screen to hide the baked-in tags and captions.
- `c-ep12-fail.png`: frame from `episodes/ep12/frames/`. The Episode 12 lifecycle was a model, not a browser capture, and its own label says so.
- `c-ep15-thumb.png`, `c-ep12-thumb.png`: episode thumbnails.
- Numbers: "2 attempts, 2 orders", "2 attempts, 1 order" (`fixtures/ep15-idempotency/evidence.json`, `summary`), and "# pass 13 # fail 0" (`node --test fixtures/ep15-idempotency/test.mjs`, re-run for this package).
- `c-ep17-fail.png` and `c-ep17-thumb.png` were copied to `video/public/launch/` but are not used in the current cut.

**Conceptual (labelled on screen):**
- The method boxes, the limits list, and the everyday-object cards.
- The cards for episodes 21, 22 and 24 (their episodes were not rendered when this package was built). The values on them (`c_1003`, `404`, January 14 in New York, "Welcome back, Alice" shown to Bob) are copied from those fixtures' `evidence.json`; the layout is an illustration, not product output.
