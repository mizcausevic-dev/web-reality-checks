// Episode 17 fixture: pure state rules for the dashboard.
//
//   evaluate({reading, nowMs, lastPoll}) -> {measurementAgeSeconds, connection, freshness, warning, reason}
//
// Pure: no clock access, no I/O. The caller passes `nowMs` from the shared clock.
//
// The two separate questions this file answers:
//   1. How old is the MEASUREMENT?   -> from reading.sourceObservedAt only (never collectedAt, servedAt, or poll time)
//   2. Is the CONNECTION healthy?    -> from the outcome and time of the most recent poll
// A successful poll never makes the measurement younger. A failed poll never makes it disappear.

/** PRODUCT POLICY for this fixture only. A measurement older than this is labelled "stale".
 *  Five minutes is a choice made for this synthetic dashboard. Other products (daily reports,
 *  slow-moving sensors) can legitimately treat ten-minute-old data as perfectly fine. */
export const STALE_THRESHOLD_SECONDS = 300;

/** The connection is "connected" only if the last poll succeeded and did so within this window
 *  (three poll intervals at the fixture's 30 s poll period). */
export const CONNECTION_WINDOW_SECONDS = 90;

/** Parse an ISO-8601 timestamp into ms. Returns null for anything missing or unparseable. */
export const parseTs = (v) => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

export const evaluate = ({reading, nowMs, lastPoll}) => {
  // ---- connection: recent API communication only ----
  let connection = 'unknown';
  if (lastPoll) {
    if (!lastPoll.ok) connection = 'disconnected';
    else if (nowMs - lastPoll.at <= CONNECTION_WINDOW_SECONDS * 1000) connection = 'connected';
    else connection = 'unknown'; // last success too long ago to vouch for the connection
  }

  // ---- freshness: measurement age from sourceObservedAt only ----
  let measurementAgeSeconds = null;
  let freshness = 'unknown';
  let reason = null;
  if (!reading) {
    reason = 'no-reading';
  } else {
    const obs = parseTs(reading.sourceObservedAt);
    if (obs === null) {
      reason = 'invalid-timestamp';
    } else {
      const ageMs = nowMs - obs;
      if (ageMs < 0) {
        // The source claims to have observed this in the future. With a single shared clock that is
        // impossible, so it is flagged rather than displayed as a negative age.
        reason = 'impossible-future';
      } else {
        measurementAgeSeconds = Math.floor(ageMs / 1000);
        freshness = measurementAgeSeconds > STALE_THRESHOLD_SECONDS ? 'stale' : 'fresh';
      }
    }
  }

  // ---- warning text: explicit, never hidden behind a green dot ----
  const parts = [];
  if (connection === 'disconnected') parts.push(`Last poll failed${lastPoll?.error ? ` (${lastPoll.error})` : ''}; showing last known value.`);
  if (connection === 'unknown' && lastPoll) parts.push('No recent API contact.');
  if (reason === 'no-reading') parts.push('No measurement has been received yet.');
  if (reason === 'invalid-timestamp') parts.push('Measurement timestamp missing or invalid; age unknown.');
  if (reason === 'impossible-future') parts.push('Measurement timestamp is in the future; age cannot be computed.');
  if (freshness === 'stale') parts.push(`Measurement is ${measurementAgeSeconds} s old (policy threshold ${STALE_THRESHOLD_SECONDS} s).`);
  const warning = parts.length ? parts.join(' ') : null;

  return {measurementAgeSeconds, connection, freshness, warning, reason};
};

/** FLAWED VARIANT (the one the video opens on). Kept only as a known-positive control:
 *  it labels the panel "Live" whenever the last HTTP poll succeeded and reports "updated N s ago"
 *  from the poll time, so every successful poll resets the visible age to zero. */
export const naiveStatus = ({nowMs, lastPoll}) => {
  if (!lastPoll) return {label: 'Connecting…', updatedSecondsAgo: null};
  if (!lastPoll.ok) return {label: 'Offline', updatedSecondsAgo: null};
  return {label: 'Live', updatedSecondsAgo: Math.floor((nowMs - lastPoll.at) / 1000)};
};
