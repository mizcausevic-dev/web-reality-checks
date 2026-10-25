# EP 05 — Your Directory Has 10,000 Listings. How Many Are Wrong?

**Central idea.** Listing quantity and evidence-backed data quality are different measurements; a flag from an automated check is a lead to investigate, never a verdict.

## What this fixture is
- `fixtures/ep05-directory-quality/` — plain Node 22 ESM, zero dependencies. `generate.mjs` uses its own seeded PRNG (mulberry32, seed `20261025`) to build **exactly 10,000 synthetic listings** (`listings.json`, ~3.1 MB, one row per line) and a **separate** `ground-truth.json` with overlapping seeded defects: duplicates, malformed URLs, missing required fields, old verification timestamps, changed addresses, simulated closures.
- `check.mjs` runs five checks on the public rows only: completeness, duplicate candidates, URL syntax, website availability, verification age. Website checks go to an **in-process mock responder keyed by hostname pattern** (`*.ok.test`, `*.slow.test`, `*.down.test`, `*.nx.test`, `*.gone.test`); zero real network calls. The checker has no file or network access and never reads ground truth (asserted by a test that scans its source).
- `lastCheckedAt`, `lastChangedAt`, `lastVerifiedAt` are three separate fields with three meanings; a re-check updates only the first.
- Deliberate policies: unique flagged listings and total issue instances are reported as two numbers and never summed; a failed website check routes to review as a lead, not a closure; `stale_verification` is age, not error; deterministic fixes (missing field, malformed URL) do not enter the review queue on their own. Full policy in `fixtures/ep05-directory-quality/review-rules.md`.
- `evaluate()` compares checker output with ground truth **after** checking, reporting detected vs missed per seeded class.
- All data is synthetic: invented names, 555 phone numbers, reserved `.test` hostnames. Persistent on-screen tag: `SYNTHETIC DATASET · SEEDED`.

## Evidence
- Executed: `node --test fixtures/ep05-directory-quality/test.mjs` → `# tests 17  # pass 17  # fail 0` (includes two known-positive controls: failed website checks occur on businesses that are open in ground truth; some seeded defects are missed and reported as missed).
- Executed: `node fixtures/ep05-directory-quality/demo.mjs` → `inspection-results.json`, `review-queue.json`, `evidence.json`:
  - 10,000 listings · **3,875 issue instances** · **3,303 distinct flagged listings** · 6,697 clean.
  - Per code (instances = listings, since each code fires at most once per listing): site_unreachable 1,136 · stale_verification 921 · duplicate_candidate 636 (318 pairs) · edited_since_verified 525 · missing_required 300 · malformed_url 231 · site_gone 126.
  - Flags per flagged listing: 1 → 2,775 · 2 → 485 · 3 → 42 · 4 → 1.
  - Seeded vs detected vs missed: duplicate 640/636/4 · malformed_url 250/231/19 · missing_required 300/300/0 · stale_verification 900/900/0 · changed_address 400/210/190 · closed 350/224/126.
  - Review queue 2,901 entries (one per listing). Failed website checks on businesses that are open in ground truth: **1,038**. Mock responder calls 8,922; real network calls 0.
  - Example (scene 5–7): `L00070 "Copper Framing Co."`, `copper-framing-co.slow.test` → timeout; ground truth: open (only label `stale_verification`). Decision `keep_listing_schedule_recheck` by `reviewer-synthetic-01` at `2026-10-25T09:14:00Z`; `lastCheckedAt` 2026-10-13 → 2026-10-25, `lastVerifiedAt` unchanged (2023-01-20).
- Observed: every on-screen number in `video/src/episodes/ep05/Scenes.tsx` is a constant in the `EV` object at the top of that file, copied from `inspection-results.json` / `evidence.json`. If the fixture is regenerated with a different seed, refresh `EV`.
- Executed: `cd video && npx tsc --noEmit` → clean.
- Blocked (by spec, orchestrator's job): narration audio, MP4 render, `render-evidence.json`, thumbnail. `video/src/episodes/ep05/timeline.json` currently holds a `--no-audio` estimate only so the project type-checks; rebuild it from real narration before rendering.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep05      # from video/public/ep05/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep05 --concurrency 2
```

## Limitations
- Everything is simulated: the dataset is generated, website responses come from a local mock, the reviewer is synthetic. Detection rates (e.g. 190 of 400 moved businesses missed) are properties of this seeded dataset and this checker, not of any real directory.
- Not tested: real HTTP behaviour (redirects, TLS errors, bot blocks, parked domains), fuzzy duplicate matching, shared phone lines across genuinely different businesses (which would create false duplicate candidates), any persistence or workflow beyond the JSON files.
- Accuracy bullets from the brief, each reflected on screen / in narration: data and results labelled synthetic (corner tag, every "Observed from" line); old verification date is not proof of error (scenes 5, 7); HTTP failure is not proof of closure (scenes 5, 8); last checked / last changed / last verified shown as separate fields (scenes 3, 5, 7); unique flagged listings reported separately from issue instances and explicitly not summed (scene 4); checker does not read ground truth (scene 3, test); detected vs missed per seeded class shown (scene 8).
- Scene timing in `timeline.json` is a word-count heuristic snapped to detected silences once real audio exists; not forced alignment.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep05/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep05 → episodes/ep05/ep05.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 103.67 s, 9442629 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
