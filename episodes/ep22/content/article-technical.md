SEO title (≤60 chars): Your Deadline Moved Back a Day: Dates vs Instants in JS
Meta description (≤155 chars): new Date("2026-01-15") is UTC midnight, so New York shows the 14th. The fixture, the 15 passing tests, and the repair: validate the date, never convert it.
Slug: date-only-timezones
Primary keyword: JavaScript date off by one day   Secondary keywords (3–5): new Date date-only string UTC, Intl.DateTimeFormat time zone, calendar date vs timestamp, date shows previous day timezone, named IANA time zones
Medium tags (5): JavaScript, Time Zones, Node.js, Software Engineering, Debugging

# Your Deadline Moved Back a Day. Nobody Edited It.

![Two views of the task "File the quarterly report": one shows the deadline as 2026-01-15, the other shows 2026-01-14, with the caption "Nobody edited it."](../hero.png)

A task has the deadline `"2026-01-15"`. One screen shows January 15, another shows January 14, and the stored value never changed. The code turned a calendar date into a moment on the timeline and then displayed that moment in the viewer's time zone.

This is episode 22 of Web Reality Checks. The bug is one unnecessary conversion, shown on a local fixture with synthetic data, then repaired and retested. 

## What actually happens

The stored value `"2026-01-15"` is a calendar date: year, month and day, with no hour and no zone. It names a square on a wall calendar, not a point in time.

Then the code calls `new Date("2026-01-15")`. A `Date` object is a moment, so JavaScript has to pick an hour and a zone to supply what the string left out. For the date-only ISO form it picks midnight UTC. In the fixture, that gives `2026-01-15T00:00:00.000Z` (local synthetic fixture, `evidence.json`). A date has quietly become an instant.

The second step finishes the damage. The code formats that instant with `Intl.DateTimeFormat` for each viewer's zone. Formatting an instant in a zone means adding the zone's UTC offset to it. In January, New York is UTC-05:00, so midnight UTC on the 15th is 19:00 on the 14th. Tokyo is UTC+09:00, so the same instant is 09:00 on the 15th. UTC itself shows 00:00 on the 15th. The fixture output is `2026-01-15`, `2026-01-14`, `2026-01-15` for UTC, New York and Tokyo.

That is why the bug hides. Any zone west of UTC lands on the previous day, and any zone at or east of UTC lands on the right one. A developer in Tokyo or a CI runner set to UTC sees the correct date every time. The user in New York sees the wrong one.

The meeting in the same task is a different kind of value. `"2026-01-15T15:00:00Z"` is an instant, and converting it per zone is correct: 15:00 in UTC, 10:00 in New York, and 00:00 in Tokyo, already on `2026-01-16`. The same formatting step is right for the meeting and wrong for the deadline. The defect is a modeling mistake, not a library bug: a date was typed as an instant.

Two more behaviors from this engine make the mistake easier to commit. Not every date string parses alike: `new Date("2026-01-15T00:00:00")`, with no offset, follows the machine's zone, and the legacy slash form depends on the machine too. And `new Date("2026-02-30")` does not fail here. It rolls over to `2026-03-02`. Both are observations from Node 22 only, not guarantees.

## The fixture

`fixtures/ep22-date-only-timezones/` is a pure-function module (`dates.mjs`) and a small HTML table renderer, on plain Node 22 with `node:test` and zero dependencies. There is no server. The synthetic task is "File the quarterly report" with a date-only deadline of `"2026-01-15"` and a meeting at `"2026-01-15T15:00:00Z"`, shown in `UTC`, `America/New_York` and `Asia/Tokyo`. The module never reads the machine's default zone: every `Intl.DateTimeFormat` call passes an explicit `timeZone`.

The flawed path is the conversion, followed by the zone formatting:

```js
export function flawedDeadline(dateOnly, zone) {
  const instant = new Date(dateOnly); // <- the unnecessary conversion
  const f = fmtInstant(instant.getTime(), zone);
  return {zone, input: dateOnly, instantIso: instant.toISOString(), date: f.date, time: f.time};
}
```

The corrected path validates the string and prints its parts. There is no `Date` object, and the zone argument is deliberately unused:

```js
export function correctedDeadline(dateOnly, _zone) {
  const d = parseCalendarDate(dateOnly);
  return {zone: _zone, input: dateOnly, date: d.iso, label: `${d.day} ${MONTHS[d.month - 1]} ${d.year}`};
}
```

Validation checks meaning, not shape. A regular expression alone would accept `2026-02-30`:

```js
const year = +m[1], month = +m[2], day = +m[3];
if (year < 1) throw new RangeError(`year out of range: ${s}`);
if (month < 1 || month > 12) throw new RangeError(`month out of range: ${s}`);
if (day < 1 || day > daysIn(year, month)) throw new RangeError(`day out of range for that month: ${s}`);
```

Three policies shape the rest. Instants are accepted only as explicit UTC (`YYYY-MM-DDTHH:mm:ssZ`), because an offset-less string depends on the machine zone. Zones must be named IANA zones, and fixed offsets such as `+09:00`, `UTC+9`, `GMT-5` and `EST` are refused. The main demo is January only, so daylight saving never enters it.

Temporal is not used: `typeof Temporal` is `undefined` on the installed Node v22.23.4, and the corrected path only validates a string and prints it.

## The test that proves it

`node --test fixtures/ep22-date-only-timezones/test.mjs` runs 15 tests and reports `# tests 15`, `# pass 15`, `# fail 0` (local synthetic fixture). The README records the same result with `TZ` unset and set to `UTC`, `America/New_York` and `Asia/Tokyo`.

The first test is the one to copy:

```js
test('known-positive control: flawed path, computed by raw Intl.DateTimeFormat, shows the PREVIOUS date in New York', () => {
  const instant = new Date('2026-01-15'); // UTC midnight per the ECMAScript date-only form
  assert.equal(instant.toISOString(), '2026-01-15T00:00:00.000Z');
  const ny = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(instant);
  assert.equal(ny, '2026-01-14'); // the bug, observed independently of the module
  assert.equal(flawedDeadline('2026-01-15', 'America/New_York').date, '2026-01-14');
});
```

It computes the wrong date with raw `Intl.DateTimeFormat`, outside the module, before asserting the module agrees. If the bug cannot be observed independently, a green test on the repaired code proves little. Other tests in the file:

- `flawed path: explicit expected output for each display zone`
- `corrected path: every zone shows the same date, 2026-01-15`
- `scheduled instant: same instant, explicit expected wall-clock per zone`
- `an instant legitimately changes calendar date by zone (Tokyo is already on the 16th); a deadline must not`
- `calendar-date validation rejects impossible dates, not just wrong shapes`
- `"add twelve hours" is not a fix: noon UTC still lands on the wrong date for zones at UTC+13/+14`
- `cross-zone regression: explicit-zone output is byte-identical under five different machine TZ settings`

## The repair

Decide which kind of value you have, then stop converting the date. Validate the string as a real calendar date, so `2026-02-30`, `2025-02-29`, `2100-02-29` and `2026-13-01` are rejected, then render year, month and day directly. Instants keep their conversion, because for an instant the conversion is the correct behavior.

The tempting patch is to add twelve hours, so the date sits at noon UTC instead of midnight. The test shows why that fails. Noon UTC shows `2026-01-15` in New York and in Tokyo, and the patch looks fixed. In `Pacific/Kiritimati`, at UTC+14, it shows `2026-01-16`. You have moved the bug to a different set of viewers. Rendering the date without converting it is the only version that holds in every zone.

Use named zones for the instants too. An offset is not a zone: New York is UTC-05:00 in January and UTC-04:00 in July, and a test asserts both. A hard-coded `-05:00` is correct for months and then silently wrong.

## Retest

From `evidence.json` (local synthetic fixture), after the repair:

- Deadline, corrected path: `2026-01-15` in UTC, New York and Tokyo.
- Meeting, same instant `2026-01-15T15:00:00Z`: `2026-01-15 15:00` in UTC, `2026-01-15 10:00` in New York (UTC-05:00), and `2026-01-16 00:00` in Tokyo (UTC+09:00).
- The module's explicit-zone output has the same hash (`6ffa8c11435e`) when the process runs under five machine `TZ` values: `UTC`, `America/New_York`, `Asia/Tokyo`, `Pacific/Kiritimati` and `America/Los_Angeles`. The test named above enforces it.

The deadline never moves. The meeting does, and it should.

## What this does not prove

- Everything ran on Node v22.23.4 and its V8 and ICU only. No browser or other engine was tested, so the `2026-02-30` rollover and the legacy-format results are observations from this engine, not guarantees.
- Daylight-saving transitions, with repeated or skipped local hours, are explained but not demonstrated or tested. The main demo uses January to stay clear of them.
- Recurring local-time schedules need zone rules, and future changes to the zone database are not tested.
- The scene visuals are an illustrative layout driven by fixture output, not a screenshot of a real task app, and the flaw was constructed for this fixture. It is not a finding about any real product.

## Launch checklist

1. For every date field, write down whether it is a calendar date or an instant. The type decides the handling.
2. Never pass a date-only string to `new Date` just to display it.
3. Validate calendar dates by meaning (month range, days in month, leap years), not by pattern alone.
4. Store and send instants with an explicit UTC `Z` or an offset, never as offset-less date-times.
5. Store zones as named IANA zones, not fixed offsets.
6. Add a test that renders a date-only value under at least one zone west of UTC and one far east, with a known-positive control computed independently of your code.
7. Run the suite under several machine `TZ` values, not just the CI default.
8. Test recurring schedules and daylight-saving boundaries separately. This fixture does not.

## FAQ

**Why does my JavaScript date show the previous day?**
A date-only string like `"2026-01-15"` is read as midnight UTC. In a zone behind UTC, such as New York in January, that moment falls on the evening of the 14th. The fix is to avoid converting a calendar date to a `Date` at all.

**Is adding 12 hours to a date a good fix?**
No. Noon UTC looks right in New York and Tokyo in this fixture, but shows `2026-01-16` in `Pacific/Kiritimati`. It moves the failure to different viewers. Validate the date and display its parts directly instead.

**Should I store time zones as offsets like -05:00?**
No. An offset describes one moment. New York is UTC-05:00 in January and UTC-04:00 in July. Store a named IANA zone such as `America/New_York` and let the zone rules supply the offset for each instant.

## Watch the episode

[YouTube link]

- 00:00 Same deadline, two screens
- 00:07 The stored value is a plain date string
- 00:17 new Date reads it as UTC midnight
- 00:27 New York shows the 14th, Tokyo the 15th
- 00:41 A deadline is a date, a meeting is an instant
- 00:51 The repair: validate, then render
- 01:03 Retest: the meeting converts correctly
- 01:15 What this does not cover

Related episodes: [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md) and [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A date is not always a moment. Decide which one you are holding before you format it, and keep a test that can see the difference.

Miz Causevic, Kinetic Gain LLC
