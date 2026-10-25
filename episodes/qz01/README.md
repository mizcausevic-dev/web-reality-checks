# QZ 01: Five Questions Your Test Suite Should Answer (quiz, package A)

**What it is.** A five-question multiple-choice quiz for engineers, answerable from the repository. Written plan: `launch/a-break-it-on-purpose/quiz.md`. Script: `script.json` (394 narrated words; scenes `hook`, `q1`..`q5` with `think: 6`, `a1`..`a5`, `close`).

## Questions and sources
| Q | Episode | Answer | Source value |
|---|---|---|---|
| 1 | 26 | 101 SELECTs | `fixtures/ep26-n-plus-one/evidence.json`: `flawed.selectCount` 101, `corrected.selectCount` 1, `knownPositiveControl.flawedWithHiddenQuery` 102 |
| 2 | 15 | 422 | `fixtures/ep15-idempotency/evidence.json`: `scenarios.corrected_mismatched_payload.status` 422, `orderCount` 1 |
| 3 | 23 | 503, not a conflict | `fixtures/ep23-optimistic-concurrency/evidence.json`: `scenarios.database_lock` status 503, `isVersionConflict` false |
| 4 | 01 | 404 | `fixtures/ep01-authz/evidence.json`: spoofed identity on the corrected endpoint 404; vulnerable endpoint 200 |
| 5 | 17 | 570 s | `fixtures/ep17-stale-dashboard/evidence.json`: `pollingFaster.fast.ageAt570` 570, 119 polls vs 19 |

Executed 2026-10-25: ep01 7/7, ep15 13/13, ep17 12/12, ep23 16/16, ep26 15/15 tests pass.

## Build and render (orchestrator)
One narration take (all scene narrations in order, one paragraph per scene) saved as `video/public/qz01/raw.mp3`:
```
cd video && npm install
node tools/build-quiz.mjs qz01            # cuts at silences, inserts the 6 s think silence, writes timeline.json and captions.srt
node tools/gen-root.mjs
node tools/render.mjs qz01 --concurrency 2
```

## Design
- Ask scenes show the question and options A, B, C in full from the first frame; an amber countdown ring runs only during the last 6 seconds of the scene (`t >= dur - 6`).
- Reveal scenes highlight the correct option in green, dim the others, show the explanation, an "Episode NN" chip and the evidence values.
- Persistent tag: `QUIZ · FACTS FROM LOCAL FIXTURES`; the close scene uses `PROMOTIONAL FILM`.

## Limitations
- `video/src/episodes/qz01/timeline.json` is an estimate: built with `--no-audio` and the six-second think intervals added by hand so the scenes type-check and preview correctly. `build-quiz.mjs` overwrites it. No audio was generated and no MP4 was rendered.
- No real frames from episodes 23 and 26 are used; their facts come from the fixtures only. Cards, options and the countdown are designed graphics, not recordings.
- Episode 17 values come from a simulated pipeline with one compressed clock.
