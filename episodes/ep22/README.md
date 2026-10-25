# EP 22 — Your Deadline Moved Back a Day. Nobody Edited It.

**Central idea.** A calendar date and a timestamp carry different information; an unnecessary date-to-instant conversion can change the displayed calendar date.

## What this fixture is
- `fixtures/ep22-date-only-timezones/` — pure functions plus a tiny HTML renderer (no server). Deadline `"2026-01-15"` (date-only) and meeting `"2026-01-15T15:00:00Z"` (instant), shown in `UTC`, `America/New_York`, `Asia/Tokyo`.
- Flawed path: `new Date("2026-01-15")` (UTC midnight) formatted with `Intl.DateTimeFormat` per zone. Corrected path: validated calendar-date string rendered directly.
- Deliberate policies: real calendar-date validation (not just shape); UTC-`Z` instants only; named IANA zones only (fixed offsets refused); January-only demo so no DST ambiguity.
- Temporal is **not** assumed: `typeof Temporal` is `undefined` on the installed Node v22.23.4, and it is not used.
- Video visual mechanic: calendar tiles = date-only values; points on a shared UTC timeline (with each zone's local-day bands) = instants. Every date, time and offset on screen is imported from `evidence.json`.

## Evidence
- Executed: `node --test fixtures/ep22-date-only-timezones/test.mjs` → `# tests 15`, `# pass 15`, `# fail 0` (also with `TZ` unset, `UTC`, `America/New_York`, `Asia/Tokyo`).
- Executed: `node fixtures/ep22-date-only-timezones/demo.mjs` → `evidence.json`: flawed `2026-01-15 / 2026-01-14 / 2026-01-15`; corrected `2026-01-15` in all three; event `15:00 / 10:00 / 00:00 on 2026-01-16`; explicit-zone output identical under five machine `TZ` values.
- Observed: New York flawed date is `2026-01-14` (19:00), computed by `Intl.DateTimeFormat` in the test itself.
- Observed (this engine only): `new Date("2026-02-30")` rolls over to `2026-03-02` instead of failing.
- Not executed: audio, render, MP4. None exists yet; the orchestrator renders and fills `render-evidence.json`.

## Accuracy items and where they are covered
- Validate calendar dates, not shape: narration (scene `fix`), tests, on-screen rejects.
- Not all date-string formats parse alike: narration (scene `utc`), on-screen note, control test.
- Named IANA zones; fixed offset is not a zone: narration + end card (New York UTC-05:00 / UTC-04:00 from evidence).
- Recurring local schedules need zone rules; DST kept out of the demo: narration + end card.
- No "add twelve hours" fix: narration (`fix`), on-screen Kiritimati result, test.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep22    # from narration audio in video/public/ep22/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep22 --concurrency 2
```
Note: `video/src/episodes/ep22/timeline.json` and `episodes/ep22/captions.srt` currently come from a `--no-audio` run (estimated timing) so type-checking works; rebuild from the real narration.

## Limitations
- Computed in Node 22 / V8 only; browsers and other engines were not tested.
- Daylight-saving transitions and recurring local-time schedules are explained, not demonstrated or tested.
- The scene visuals are an illustrative layout driven by fixture output, not a screenshot of a real task app.
