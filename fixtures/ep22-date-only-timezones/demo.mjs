// Runs the exact scenario the video shows and writes evidence.json (actual computed outputs).
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TASK, ZONES, flawedDeadline, correctedDeadline, scheduledEvent, fmtInstant, parseCalendarDate} from './dates.mjs';

const PROBE = fileURLToPath(new URL('./probe.mjs', import.meta.url));
const MACHINE_ZONES = ['UTC', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles'];
const runProbe = (tz) => { const raw = execFileSync(process.execPath, [PROBE], {env: {...process.env, TZ: tz}, encoding: 'utf8'}).trim(); return {raw, json: JSON.parse(raw)}; };

const strip = ({localParse, ...rest}) => JSON.stringify(rest);
const runs = MACHINE_ZONES.map((tz) => ({tz, ...runProbe(tz)}));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const noon = new Date('2026-01-15T12:00:00Z').getTime();
const instant = new Date(TASK.deadline);
const evidence = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  temporalAvailable: typeof globalThis.Temporal !== 'undefined',
  task: TASK,
  zones: ZONES,
  validation: {deadlineParsed: parseCalendarDate(TASK.deadline), rejects: ['2026-02-30', '2025-02-29', '2026-13-01'].map((s) => { try { parseCalendarDate(s); return {input: s, rejected: false}; } catch (e) { return {input: s, rejected: true, reason: e.message}; } })},
  jsReading: {code: `new Date("${TASK.deadline}")`, toISOString: instant.toISOString(), meaning: 'date-only ISO form is read as UTC midnight'},
  flawed: ZONES.map((z) => flawedDeadline(TASK.deadline, z)),
  corrected: ZONES.map((z) => correctedDeadline(TASK.deadline, z)),
  event: ZONES.map((z) => scheduledEvent(TASK.eventAt, z)),
  previousDateZones: ZONES.filter((z) => flawedDeadline(TASK.deadline, z).date !== TASK.deadline),
  zoneRules: {
    note: 'New York is not a fixed offset: same zone name, different offset in January and July',
    january: fmtInstant(Date.UTC(2026, 0, 15, 15), 'America/New_York').offset,
    july: fmtInstant(Date.UTC(2026, 6, 15, 15), 'America/New_York').offset,
  },
  twelveHourHack: {
    note: 'adding twelve hours (noon UTC) is not a fix',
    newYork: fmtInstant(noon, 'America/New_York').date,
    tokyo: fmtInstant(noon, 'Asia/Tokyo').date,
    kiritimati: fmtInstant(noon, 'Pacific/Kiritimati').date,
  },
  machineZoneRuns: {
    note: 'dates.mjs output re-computed in child processes with different TZ environment variables',
    runs: runs.map((r) => ({tz: r.tz, explicitZoneOutputSha12: sha(strip(r.json)), dateOnlyIso: r.json.localParse.dateOnly, dateTimeNoOffsetIso: r.json.localParse.dateTimeNoOffset})),
    explicitZoneOutputIdentical: new Set(runs.map((r) => strip(r.json))).size === 1,
  },
  html: {flawed: runs[0].json.htmlFlawed, corrected: runs[0].json.htmlCorrected},
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(ZONES.map((z, i) => ({zone: z, flawedDate: evidence.flawed[i].date, flawedTime: evidence.flawed[i].time, correctedDate: evidence.corrected[i].date, eventLocal: `${evidence.event[i].date} ${evidence.event[i].time}`, offset: evidence.event[i].offset})));
console.log('explicit-zone output identical across machine TZ:', evidence.machineZoneRuns.explicitZoneOutputIdentical, '| Temporal available:', evidence.temporalAvailable);
