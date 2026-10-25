// EP22 — date-only values vs instants. Pure functions, zero dependencies.
// Nothing here reads the machine's default time zone: every Intl call passes an explicit IANA `timeZone`.
// Temporal is NOT used (it is not available in the Node 22 build this fixture targets; see README).

export const TASK = Object.freeze({
  title: 'File the quarterly report',
  deadline: '2026-01-15', // calendar date: no time, no zone
  eventAt: '2026-01-15T15:00:00Z', // instant: explicitly UTC
});
export const ZONES = Object.freeze(['UTC', 'America/New_York', 'Asia/Tokyo']);

/* ---------- calendar-date validation (semantic, not just shape) ---------- */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Returns {year, month, day, iso} for a real calendar date written YYYY-MM-DD, or throws RangeError. */
export function parseCalendarDate(s) {
  if (typeof s !== 'string') throw new RangeError('calendar date must be a string');
  const m = DATE_RE.exec(s);
  if (!m) throw new RangeError(`not a YYYY-MM-DD calendar date: ${JSON.stringify(s)}`);
  const year = +m[1], month = +m[2], day = +m[3];
  if (year < 1) throw new RangeError(`year out of range: ${s}`);
  if (month < 1 || month > 12) throw new RangeError(`month out of range: ${s}`);
  if (day < 1 || day > daysIn(year, month)) throw new RangeError(`day out of range for that month: ${s}`);
  return {year, month, day, iso: s};
}
export const isValidCalendarDate = (s) => { try { parseCalendarDate(s); return true; } catch { return false; } };

/* ---------- FLAWED date-only path ---------- */
/** new Date('YYYY-MM-DD') is specified as UTC midnight; formatting that instant in a zone can change the calendar date. */
export function flawedDeadline(dateOnly, zone) {
  const instant = new Date(dateOnly); // <- the unnecessary conversion
  const f = fmtInstant(instant.getTime(), zone);
  return {zone, input: dateOnly, instantIso: instant.toISOString(), date: f.date, time: f.time};
}

/* ---------- CORRECTED date-only path ---------- */
/** Validates, then renders year/month/day directly. No Date object, no zone: the zone argument is deliberately unused. */
export function correctedDeadline(dateOnly, _zone) {
  const d = parseCalendarDate(dateOnly);
  return {zone: _zone, input: dateOnly, date: d.iso, label: `${d.day} ${MONTHS[d.month - 1]} ${d.year}`};
}

/* ---------- scheduled instant ---------- */
const INSTANT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
/** Accepts only an explicit-UTC 'YYYY-MM-DDTHH:mm:ssZ' string. Returns epoch milliseconds or throws RangeError. */
export function parseUtcInstant(s) {
  if (typeof s !== 'string') throw new RangeError('instant must be a string');
  const m = INSTANT_RE.exec(s);
  if (!m) throw new RangeError(`not an explicit-UTC timestamp (YYYY-MM-DDTHH:mm:ssZ): ${JSON.stringify(s)}`);
  parseCalendarDate(`${m[1]}-${m[2]}-${m[3]}`);
  const [h, mi, se] = [+m[4], +m[5], +m[6]];
  if (h > 23 || mi > 59 || se > 59) throw new RangeError(`time out of range: ${s}`);
  return Date.parse(s);
}

/** Named IANA zones only ('UTC' or 'Area/Location'). Fixed offsets such as '+09:00' are refused: an offset is not a time zone. */
export function assertNamedZone(zone) {
  if (typeof zone !== 'string' || !(zone === 'UTC' || /^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(zone))) {
    throw new RangeError(`not a named IANA time zone: ${JSON.stringify(zone)}`);
  }
  try { new Intl.DateTimeFormat('en-US', {timeZone: zone}); } catch { throw new RangeError(`unknown IANA time zone: ${zone}`); }
  return zone;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
function parts(ms, zone) {
  const f = new Intl.DateTimeFormat('en-US', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return {year: +o.year, month: +o.month, day: +o.day, hour: +o.hour, minute: +o.minute, second: +o.second};
}
/** Wall-clock fields of an instant in a named zone, plus the zone's UTC offset at that instant. */
export function fmtInstant(ms, zone) {
  assertNamedZone(zone);
  const p = parts(ms, zone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offMin = Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
  const sign = offMin < 0 ? '-' : '+';
  const a = Math.abs(offMin);
  return {zone, date: `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}`, offsetMinutes: offMin, offset: `UTC${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`};
}
export function scheduledEvent(instantIso, zone) {
  return {instantIso, ...fmtInstant(parseUtcInstant(instantIso), zone)};
}

/* ---------- tiny rendering function (two task views) ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
/** mode 'flawed' | 'corrected'. Returns a small HTML table: one row per display zone. */
export function renderTaskHtml(task, zones, mode) {
  const rows = zones.map((z) => {
    const dl = mode === 'flawed' ? flawedDeadline(task.deadline, z).date : correctedDeadline(task.deadline, z).date;
    const ev = scheduledEvent(task.eventAt, z);
    return `<tr data-zone="${esc(z)}"><td>${esc(z)}</td><td class="deadline">${esc(dl)}</td><td class="event">${esc(ev.date)} ${esc(ev.time)} (${esc(ev.offset)})</td></tr>`;
  });
  return `<table data-mode="${esc(mode)}" data-task="${esc(task.title)}"><thead><tr><th>Zone</th><th>Deadline (date only)</th><th>Meeting (instant)</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
