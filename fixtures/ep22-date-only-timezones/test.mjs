import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TASK, ZONES, parseCalendarDate, isValidCalendarDate, flawedDeadline, correctedDeadline, parseUtcInstant, assertNamedZone, fmtInstant, scheduledEvent, renderTaskHtml} from './dates.mjs';

const PROBE = fileURLToPath(new URL('./probe.mjs', import.meta.url));
const MACHINE_ZONES = ['UTC', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles'];
const probe = (tz) => JSON.parse(execFileSync(process.execPath, [PROBE], {env: {...process.env, TZ: tz}, encoding: 'utf8'}));

test('known-positive control: flawed path, computed by raw Intl.DateTimeFormat, shows the PREVIOUS date in New York', () => {
  const instant = new Date('2026-01-15'); // UTC midnight per the ECMAScript date-only form
  assert.equal(instant.toISOString(), '2026-01-15T00:00:00.000Z');
  const ny = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(instant);
  assert.equal(ny, '2026-01-14'); // the bug, observed independently of the module
  assert.equal(flawedDeadline('2026-01-15', 'America/New_York').date, '2026-01-14');
  assert.equal(flawedDeadline('2026-01-15', 'America/New_York').time, '19:00');
});

test('flawed path: explicit expected output for each display zone', () => {
  assert.deepEqual(ZONES.map((z) => flawedDeadline(TASK.deadline, z).date), ['2026-01-15', '2026-01-14', '2026-01-15']);
  assert.deepEqual(ZONES.map((z) => flawedDeadline(TASK.deadline, z).time), ['00:00', '19:00', '09:00']);
});

test('corrected path: every zone shows the same date, 2026-01-15', () => {
  assert.deepEqual(ZONES.map((z) => correctedDeadline(TASK.deadline, z).date), ['2026-01-15', '2026-01-15', '2026-01-15']);
  assert.equal(correctedDeadline(TASK.deadline, 'America/New_York').label, '15 Jan 2026');
});

test('scheduled instant: same instant, explicit expected wall-clock per zone', () => {
  const got = ZONES.map((z) => { const e = scheduledEvent(TASK.eventAt, z); return `${z} ${e.date} ${e.time} ${e.offset}`; });
  assert.deepEqual(got, [
    'UTC 2026-01-15 15:00 UTC+00:00',
    'America/New_York 2026-01-15 10:00 UTC-05:00',
    'Asia/Tokyo 2026-01-16 00:00 UTC+09:00',
  ]);
  // all three are the same instant
  assert.equal(parseUtcInstant(TASK.eventAt), Date.UTC(2026, 0, 15, 15, 0, 0));
});

test('an instant legitimately changes calendar date by zone (Tokyo is already on the 16th); a deadline must not', () => {
  assert.equal(scheduledEvent(TASK.eventAt, 'Asia/Tokyo').date, '2026-01-16');
  assert.equal(correctedDeadline(TASK.deadline, 'Asia/Tokyo').date, '2026-01-15');
});

test('calendar-date validation rejects impossible dates, not just wrong shapes', () => {
  for (const ok of ['2026-01-15', '2026-12-31', '2024-02-29', '2000-02-29', '2026-02-28']) assert.equal(isValidCalendarDate(ok), true, ok);
  for (const bad of ['2026-02-30', '2026-02-31', '2026-04-31', '2025-02-29', '2100-02-29', '2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32', '0000-01-01']) assert.equal(isValidCalendarDate(bad), false, bad);
  for (const bad of ['2026-1-5', '01/15/2026', ' 2026-01-15', '2026-01-15 ', '2026-01-15T00:00:00Z', 'January 15, 2026', '', null, undefined, 20260115]) assert.equal(isValidCalendarDate(bad), false, String(bad));
  assert.throws(() => correctedDeadline('2026-02-30', 'UTC'), RangeError);
  assert.throws(() => parseCalendarDate('2026-02-30'), /day out of range/);
});

test('control: the flawed path does NOT reject 2026-02-30 in this engine (it silently rolls over); that is engine behaviour, not a guarantee', () => {
  const d = new Date('2026-02-30');
  if (Number.isNaN(d.getTime())) { assert.ok(true, 'this engine rejects it'); return; }
  assert.equal(d.toISOString(), '2026-03-02T00:00:00.000Z'); // observed on Node 22 / V8
  assert.equal(isValidCalendarDate('2026-02-30'), false); // corrected path still rejects
});

test('instant validation: explicit UTC only, impossible values rejected', () => {
  assert.equal(parseUtcInstant('2026-01-15T15:00:00Z'), 1768489200000);
  for (const bad of ['2026-01-15T15:00:00', '2026-01-15T15:00:00+09:00', '2026-01-15', '2026-02-30T10:00:00Z', '2026-01-15T24:00:00Z', '2026-01-15T15:60:00Z', 'nonsense']) assert.throws(() => parseUtcInstant(bad), RangeError, bad);
});

test('zones: named IANA only; fixed offsets and unknown names are refused', () => {
  for (const ok of ['UTC', 'America/New_York', 'Asia/Tokyo']) assert.equal(assertNamedZone(ok), ok);
  for (const bad of ['+09:00', 'UTC+9', 'GMT-5', 'EST', 'Mars/Base', '', null]) assert.throws(() => assertNamedZone(bad), RangeError, String(bad));
  assert.throws(() => scheduledEvent(TASK.eventAt, '+09:00'), RangeError);
});

test('a fixed offset is not a time zone: New York is UTC-05:00 in January but UTC-04:00 in July', () => {
  assert.equal(fmtInstant(Date.UTC(2026, 0, 15, 15), 'America/New_York').offset, 'UTC-05:00');
  assert.equal(fmtInstant(Date.UTC(2026, 6, 15, 15), 'America/New_York').offset, 'UTC-04:00');
});

test('"add twelve hours" is not a fix: noon UTC still lands on the wrong date for zones at UTC+13/+14', () => {
  const noon = new Date('2026-01-15T12:00:00Z').getTime();
  assert.equal(fmtInstant(noon, 'America/New_York').date, '2026-01-15'); // looks fixed here...
  assert.equal(fmtInstant(noon, 'Asia/Tokyo').date, '2026-01-15');
  assert.equal(fmtInstant(noon, 'Pacific/Kiritimati').date, '2026-01-16'); // ...but not here (UTC+14)
  assert.equal(correctedDeadline('2026-01-15', 'Pacific/Kiritimati').date, '2026-01-15');
});

test('flawed path also fails west of New York and east of Tokyo (UTC midnight is the 14th in Los Angeles)', () => {
  assert.equal(flawedDeadline('2026-01-15', 'America/Los_Angeles').date, '2026-01-14');
  assert.equal(flawedDeadline('2026-01-15', 'America/Los_Angeles').time, '16:00');
});

test('renderTaskHtml: flawed view disagrees across zones, corrected view agrees', () => {
  const cell = (html, zone) => new RegExp(`data-zone="${zone}"><td>[^<]*</td><td class="deadline">([^<]*)</td>`).exec(html)[1];
  const f = renderTaskHtml(TASK, ZONES, 'flawed');
  const c = renderTaskHtml(TASK, ZONES, 'corrected');
  assert.deepEqual(ZONES.map((z) => cell(f, z)), ['2026-01-15', '2026-01-14', '2026-01-15']);
  assert.deepEqual(ZONES.map((z) => cell(c, z)), ['2026-01-15', '2026-01-15', '2026-01-15']);
  assert.match(c, /data-zone="Asia\/Tokyo"><td>Asia\/Tokyo<\/td><td class="deadline">2026-01-15<\/td><td class="event">2026-01-16 00:00 \(UTC\+09:00\)<\/td>/);
});

test('cross-zone regression: explicit-zone output is byte-identical under five different machine TZ settings', () => {
  const strip = ({localParse, ...rest}) => rest;
  const base = strip(probe(MACHINE_ZONES[0]));
  for (const tz of MACHINE_ZONES.slice(1)) assert.deepEqual(strip(probe(tz)), base, `machine TZ=${tz}`);
  assert.equal(base.flawed[1].date, '2026-01-14');
  assert.deepEqual(base.corrected.map((r) => r.date), ['2026-01-15', '2026-01-15', '2026-01-15']);
});

test('control: not every date string parses the same way: date-only is UTC, date-time without offset follows the machine zone', () => {
  const utc = probe('UTC').localParse, ny = probe('America/New_York').localParse, tk = probe('Asia/Tokyo').localParse;
  assert.equal(utc.dateOnly, '2026-01-15T00:00:00.000Z');
  assert.equal(ny.dateOnly, '2026-01-15T00:00:00.000Z');
  assert.equal(tk.dateOnly, '2026-01-15T00:00:00.000Z'); // date-only form: same everywhere
  assert.equal(utc.dateTimeNoOffset, '2026-01-15T00:00:00.000Z');
  assert.equal(ny.dateTimeNoOffset, '2026-01-15T05:00:00.000Z'); // local midnight in New York
  assert.equal(tk.dateTimeNoOffset, '2026-01-14T15:00:00.000Z'); // local midnight in Tokyo
  assert.notEqual(ny.slashForm, tk.slashForm); // legacy slash form is implementation-defined and machine-zone-dependent here
});
