# QZ 02: Launch Review Quiz (package B)

**What it is.** A five-question multiple-choice video quiz for founders, product managers and buyers. Scenes: `hook`, then `q1`/`a1` to `q5`/`a5`, then `close` (12 scenes). Narration is 393 words, one paragraph per scene. Each question scene carries `"think": 6`. Questions, answers and the exact fixture facts: `launch/b-launch-review/quiz.md`.

## How it is built
```
# 1. generate ONE narration take of all scene paragraphs in order -> video/public/qz02/raw.mp3
node tools/build-quiz.mjs qz02       # cuts at silences, inserts 6 s think time, writes narration.mp3, timeline.json, captions.srt
node tools/gen-root.mjs
node tools/render.mjs qz02 --concurrency 2
```
In `Scenes.tsx` the question and the three options are on screen from the start of each ask scene. The countdown ring is drawn only when `t >= dur - 6`. On the reveal scene the correct option turns green, the others dim, and a chip shows the episode and the evidence value.

## Evidence
- Every value shown comes from a fixture `evidence.json`: ep01 (200 vs 404), ep15 (`orderCount` 2 vs 1), ep05 (3,875 instances, 3,303 unique listings, 6,697 clean), ep17 (poll at t=570: age 570 s, label Live), ep16 (17 requests vs 1).
- Executed: `node tools/build-timeline.mjs qz02 --no-audio` (placeholder timeline; it does not include the six-second think pauses, so the countdown starts earlier than it will in the real build); `cd video && npx tsc --noEmit` for `src/episodes/qz02/`.
- Observed: stills of the hook, an ask scene (with countdown) and an answer scene were rendered and inspected during authoring. No audio or video was rendered.
- Blocked: narration take, `build-quiz.mjs`, MP4 render: the orchestrator does these.

## Limitations
- The fixtures are synthetic and local; the quiz does not describe any real product and is not an audit or certification.
- Question 4 uses a simulated clock; question 5 uses virtual time. Both are labelled in `quiz.md`.
