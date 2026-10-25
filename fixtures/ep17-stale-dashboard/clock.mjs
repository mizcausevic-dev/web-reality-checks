// Episode 17 fixture: one controllable clock shared by every stage of the pipeline.
//
// Everything in this fixture (source, collector, API, dashboard, state rules) reads time
// from the same clock object. Nothing calls Date.now(). This is a deliberate simplification:
// in a real deployment each system has its own clock and clock skew between them is a
// separate problem that this fixture does NOT model. See README "Limitations".
//
// Time is held as milliseconds since the Unix epoch so the ISO strings look like real
// timestamps, but the epoch is synthetic (2026-01-01T00:00:00Z) and every advance is
// explicit. "Compressed clock" in the video means we jump this clock, not wait.

export const SIM_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00.000Z

export const createClock = (startMs = SIM_EPOCH_MS) => {
  let now = startMs;
  return {
    /** Current simulated time in ms since epoch. */
    now: () => now,
    /** Current simulated time as an ISO-8601 string. */
    iso: () => new Date(now).toISOString(),
    /** Seconds elapsed since the clock was created. */
    elapsedSeconds: () => Math.round((now - startMs) / 1000),
    /** Move the clock forward by N seconds. Negative values are rejected: the clock is monotonic. */
    advanceSeconds(s) {
      if (!(s >= 0)) throw new RangeError(`clock.advanceSeconds: ${s} is not >= 0 (the shared clock is monotonic)`);
      now += s * 1000;
      return now;
    },
    /** Jump to an absolute simulated time (ms). Only forward. */
    setMs(ms) {
      if (ms < now) throw new RangeError('clock.setMs: cannot move the shared clock backwards');
      now = ms;
      return now;
    },
  };
};
