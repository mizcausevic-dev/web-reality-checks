# EP22 fixture — date-only values vs instants

Pure-function module (`dates.mjs`) plus a tiny HTML rendering function. Plain Node 22 ESM, `node:test`, zero npm dependencies, no server (so nothing to bind). Synthetic task: "File the quarterly report".

- Date-only deadline: `"2026-01-15"` (a calendar date: no time, no zone).
- Scheduled event: `"2026-01-15T15:00:00Z"` (an instant, explicit UTC).
- Display zones (named IANA): `UTC`, `America/New_York`, `Asia/Tokyo`. The module never reads the machine's default zone; every `Intl.DateTimeFormat` call passes an explicit `timeZone`.

## Files
- `dates.mjs` — `parseCalendarDate` (semantic validation incl. leap years), `flawedDeadline` (`new Date(str)` then `Intl.DateTimeFormat`), `correctedDeadline` (validated string, no `Date`), `parseUtcInstant`, `assertNamedZone`, `fmtInstant`, `scheduledEvent`, `renderTaskHtml(task, zones, 'flawed'|'corrected')`.
- `probe.mjs` — prints every result as JSON; used by tests/demo in child processes with different `TZ` env values.
- `test.mjs` — 15 regression tests with explicit expected outputs.
- `demo.mjs` — the video scenario; writes `evidence.json`.

## Run
```
node --test fixtures/ep22-date-only-timezones/test.mjs
node fixtures/ep22-date-only-timezones/demo.mjs
```

## Temporal
Checked with `node -e "console.log(process.version, typeof Temporal)"` → `v22.23.4 undefined`. **Temporal is not available natively in this Node build and is not used.** The corrected path needs no plain-date library: it validates and prints the string.

## Deliberate policies
- Corrected date-only path: validate `YYYY-MM-DD` as a real calendar date (month 1–12, day within that month, leap years), then render the parts. No `Date`, no zone argument used.
- Instants: only the explicit-UTC form `YYYY-MM-DDTHH:mm:ssZ` is accepted (no offset-less strings, which would depend on the machine zone). Impossible dates/times are rejected.
- Zones: `UTC` or `Area/Location` names only. Fixed offsets (`+09:00`, `UTC+9`, `GMT-5`, `EST`) are refused: an offset is not a time zone (New York is UTC-05:00 in January, UTC-04:00 in July; a test asserts this).
- The main demo is January only, so daylight-saving ambiguity (repeated or skipped local hours) never occurs in it.

## What the tests assert
- Known-positive control: the flawed path for New York gives `2026-01-14` (19:00), computed independently with raw `Intl.DateTimeFormat`, not just via the module.
- Explicit expected outputs: flawed `15 / 14 / 15`; corrected `15 / 15 / 15`; event `15:00 / 10:00 / 00:00 (next day, Tokyo)`.
- Validation rejects `2026-02-30`, `2025-02-29`, `2100-02-29`, `2026-13-01`, wrong shapes, non-strings.
- Control: in this engine `new Date("2026-02-30")` does *not* reject (it rolls to `2026-03-02`); engine behaviour, not a guarantee.
- "Add twelve hours" is not a fix: noon UTC shows the right date in New York and Tokyo but `2026-01-16` in `Pacific/Kiritimati` (UTC+14).
- Cross-zone regression: the module's output is byte-identical when the process runs under five machine `TZ` values (`UTC`, `America/New_York`, `Asia/Tokyo`, `Pacific/Kiritimati`, `America/Los_Angeles`). Control: `new Date("2026-01-15")` is the same everywhere but `new Date("2026-01-15T00:00:00")` and `new Date("01/15/2026")` change with the machine zone, so not all date-string formats parse alike.

## Executed
`node --test test.mjs` (Node v22.23.4), also run with `TZ` unset, `TZ=UTC`, `TZ=America/New_York`, `TZ=Asia/Tokyo` with the same result:
```
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
`node demo.mjs` → `evidence.json`: flawed dates `2026-01-15 / 2026-01-14 / 2026-01-15` (times `00:00 / 19:00 / 09:00`), corrected `2026-01-15` ×3, event `2026-01-15 15:00 / 2026-01-15 10:00 / 2026-01-16 00:00`, `explicitZoneOutputIdentical: true`, `temporalAvailable: false`.

## Limitations / not tested
- Only the Node 22 ICU/V8 here. No browser, Safari/Firefox parsers, or other engines; the `2026-02-30` rollover and the legacy-format results are observations from this engine only.
- Daylight-saving transitions (ambiguous/skipped local times), recurring local schedules, and zone-rule changes in future tz database versions are not tested.
- Calendar systems other than proleptic Gregorian, years above 9999, and BCE dates are out of scope.
- Display formatting of the time uses 24-hour `HH:mm` only; localisation of date labels is not covered.
