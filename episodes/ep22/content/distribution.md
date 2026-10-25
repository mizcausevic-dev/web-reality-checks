# EP22 distribution kit: Your Deadline Moved Back a Day. Nobody Edited It.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep22-date-only-timezones/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Your Deadline Moved Back a Day. Nobody Edited It.` : the series title; a concrete symptom that anyone who has seen a wrong date will recognize.
2. `Same Deadline, Two Screens: Jan 15 and Jan 14` : the opening scene as a title; the two dates make the curiosity gap specific.
3. `new Date("2026-01-15") Shows Jan 14 in New York` : names the exact call and result, for engineers searching the symptom.
4. `A Date Is Not a Moment: The Off-by-One-Day Bug` : states the mechanism and the closing line of the episode as a thesis.
5. `Why Your App Shows the Wrong Date in Other Zones` : plain search-intent phrasing for non-developers.
6. `Never Convert a Calendar Date Into a Timestamp` : a direct rule; good for shares, weaker as a hook.

### Description

Same task, same deadline, two screens: January 15 and January 14. Nobody edited it. Here is the one conversion that moves a date.

In this episode we build a tiny task screen on a laptop with a date-only deadline, "2026-01-15", and a meeting at "2026-01-15T15:00:00Z". The flawed code calls new Date on the deadline. JavaScript reads that form as midnight UTC, so a date quietly becomes a moment. Formatted with Intl.DateTimeFormat, the fixture shows 2026-01-15 for UTC, 2026-01-14 for New York and 2026-01-15 for Tokyo.

Then we separate two kinds of value. A deadline is a calendar date. A meeting is an instant. Instants get converted between zones; dates do not. The repair validates the date, so 2026-02-30 is rejected, and renders year, month and day directly. All three zones show 2026-01-15. The meeting still changes correctly: 10:00 in New York and 00:00 on January 16 in Tokyo. Adding twelve hours is not a fix, and the test shows why. The regression suite runs 15 tests, 15 pass.

What this does not cover: daylight saving transitions and recurring local schedules were kept out of the demo, and everything ran on Node 22 only.

Chapters
00:00 Same deadline, two screens
00:07 The stored value is a plain date string
00:17 new Date reads it as UTC midnight
00:27 New York shows the 14th, Tokyo the 15th
00:41 A deadline is a date, a meeting is an instant
00:51 The repair: validate, then render
01:03 Retest: the meeting converts correctly
01:15 What this does not cover

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep22/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

javascript date bug, date off by one day, time zones, new Date, Intl.DateTimeFormat, UTC, calendar date vs timestamp, date-only string, iso 8601, iana time zones, node.js, regression test, known-positive control, timezone bug, software testing, web development, deadline bug, date and time handling, debugging, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic data. The bug was constructed to show the mechanism; it is not a finding about any real product. Node 22 only, January only. Fixture, 15 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

A deadline stored as "2026-01-15" showed January 14 in New York. Nobody edited the record.

Episode 22 of Web Reality Checks. The bug is one unnecessary conversion.

new Date("2026-01-15") is read as midnight UTC. Format that instant with Intl.DateTimeFormat in America/New_York and you get 2026-01-14 at 19:00. Tokyo gets 2026-01-15 at 09:00. UTC gets the 15th. So only viewers behind UTC see it, and the developer in the right zone never reproduces it.

The repair: a calendar date is not an instant. Validate it as a real date (2026-02-30 is rejected), then render year, month and day. No Date object. Instants, like the 15:00Z meeting, still convert per named zone: 10:00 in New York, 00:00 on the 16th in Tokyo.

Things I would push on any team:

1. "Add twelve hours" is not a fix. Noon UTC looks right in New York and Tokyo and fails in Pacific/Kiritimati.
2. Use named IANA zones. New York is UTC-05:00 in January and UTC-04:00 in July.
3. Keep a known-positive control computed with raw Intl, outside your module. 15 tests, 15 pass.

Scope: Node 22 only, January only. Daylight saving is explained, not tested. Synthetic fixture, not a finding about any product.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#JavaScript #TimeZones #SoftwareEngineering

### Post 2: non-technical leaders

Two people open the same task. One sees a deadline of January 15. The other sees January 14. Nobody edited it.

Episode 22 of Web Reality Checks reproduces this on a made-up task, "File the quarterly report."

The software saved the deadline correctly, as a plain date. Then the display code treated it as a moment in time, midnight on the world's reference clock, and showed that moment on each viewer's local clock. In New York that moment is the evening of the 14th. In Tokyo it is still the 15th. A demo run from the right city shows nothing wrong.

A birthday sits on one square of the calendar whether you are in Boston or Tokyo. A flight departure is an instant that each city's board shows differently. The app handled the birthday like a flight.

Five questions for your team:
1. Which date fields are calendar dates and which are moments?
2. Why is a conversion applied to a deadline at all?
3. Do tests view dates from zones the team does not live in?
4. Are zones stored by name or as fixed offsets?
5. How do recurring schedules survive clock changes? (Not tested in this episode.)

Vague answers mean "unknown," not "safe."

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Software #Leadership

## X/Twitter thread

1/ A task deadline is stored as "2026-01-15". One screen shows Jan 15. Another shows Jan 14. Nobody edited it. Episode 22 of Web Reality Checks: one unnecessary conversion. Thread.

2/ The stored value is a calendar date: year, month, day. No hour, no zone. Then the code calls new Date("2026-01-15"). JavaScript reads the date-only form as midnight UTC. A date just became a moment.

3/ Now format that moment per zone with Intl.DateTimeFormat. New York is UTC-05:00 in January, so midnight UTC is 19:00 on the 14th. Tokyo is 09:00 on the 15th. UTC is the 15th. Only some viewers see the bug.

4/ Two kinds of value. A deadline is a calendar date. A meeting is an instant. 2026-01-15T15:00:00Z is 10:00 in New York and 00:00 on the 16th in Tokyo, and that is correct. Convert instants. Do not convert dates.

5/ The repair: validate it as a real date (2026-02-30 is rejected), then render year, month and day. No Date object. Result: 2026-01-15 in UTC, New York and Tokyo.

6/ "Just add twelve hours" fails. Noon UTC shows the 15th in New York and Tokyo, then the 16th in Pacific/Kiritimati. Also: store named zones, not offsets. New York is UTC-05:00 in January, UTC-04:00 in July.

7/ 15 tests, 15 pass (local synthetic fixture), including a control computed with raw Intl outside the module. Limits: Node 22 only, January only, daylight saving explained but not tested. Not a finding about any real product.

8/ A date is not always a moment. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / HN

**Title:** A small Node fixture showing how new Date("YYYY-MM-DD") plus a per-zone formatter shifts a date-only deadline by a day, with a validate-and-render repair

**First comment:** This is a deliberately constructed local fixture with synthetic data; the flawed path was written to demonstrate the mechanism, so it is not a finding about any real product. The repair validates the string as a calendar date and prints its parts without ever creating a Date, while true instants still convert through named IANA zones. Everything ran on Node v22.23.4 only, in January, so browsers, other engines and daylight-saving transitions are not covered, and the README lists the limits.

## Short-form hook lines (≤ 12 words)

1. Same deadline, two screens. January 15 and January 14.
2. Nobody edited it. The date still moved back a day.
3. new Date turned a date into a moment. That was the bug.
4. Convert instants. Do not convert dates.
5. A date is not always a moment.

## Alt text

**hero.png:** Two views of the task "File the quarterly report": one shows the deadline as 2026-01-15, the other shows 2026-01-14, with the caption "Nobody edited it."

**thumbnail.png:** Episode thumbnail for "Your Deadline Moved Back a Day. Nobody Edited It." showing two calendar tiles for the same task, one reading Jan 15 and one reading Jan 14, with a New York and Tokyo label under them.
