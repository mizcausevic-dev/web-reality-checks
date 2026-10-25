// Episode 16 fixture: fixed-window rate limiter with an injectable clock.
//
// Policy (this fixture's design, not every API's):
//   - limit 5 requests per 10 000 ms, per identity
//   - windows are aligned to multiples of windowMs on the injected clock
//   - a rejected request does NOT consume allowance
//   - Retry-After = integer seconds until the window resets, rounded UP, never 0
//
// The clock is injected so the boundary tests are deterministic (see test.mjs).

export const createLimiter = ({limit = 5, windowMs = 10_000, clock = realClock()} = {}) => {
  const buckets = new Map(); // identity -> {windowStart, count}
  const check = (identity) => {
    const now = clock.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = windowStart + windowMs;
    let b = buckets.get(identity);
    if (!b || b.windowStart !== windowStart) {
      b = {windowStart, count: 0}; // new window: allowance restored at the window edge
      buckets.set(identity, b);
    }
    if (b.count < limit) {
      b.count += 1; // only allowed requests are counted
      return {allowed: true, limit, remaining: limit - b.count, windowStart, resetAt, retryAfterSeconds: 0};
    }
    // rejected: count unchanged. Round UP so a client that waits exactly Retry-After lands in the next window.
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return {allowed: false, limit, remaining: 0, windowStart, resetAt, retryAfterSeconds};
  };
  return {check, limit, windowMs};
};

/* ---------- clocks ---------- */

/** Wall clock. */
export const realClock = () => ({
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
});

/** Manually advanced clock for pure limiter tests. No timers: nothing happens unless the test says so. */
export const manualClock = (start = 0) => {
  let t = start;
  return {now: () => t, advance: (ms) => { t += ms; }, set: (ms) => { t = ms; }};
};

/**
 * Scaled clock: virtual milliseconds run `factor` times faster than real ones.
 * Used by the live server + client scenarios so a 10 s window costs 10 s / factor of real time,
 * while the fixture, its logs and its Retry-After values all speak in the declared virtual units.
 */
export const scaledClock = (factor = 5) => {
  const t0 = performance.now();
  return {
    factor,
    now: () => Math.round((performance.now() - t0) * factor),
    setTimeout: (fn, ms) => setTimeout(fn, Math.max(0, ms) / factor),
    clearTimeout: (id) => clearTimeout(id),
  };
};

/* ---------- shared typing harness (used by test.mjs and demo.mjs for BOTH clients) ---------- */

/**
 * The scripted typing sequence. Identical for every client under test.
 * Each step: {ch, after} = type character `ch` `after` clock-ms after the previous step.
 * "postgres" one character at a time, 80 ms apart.
 */
export const TYPING_SCRIPT = Object.freeze('postgres'.split('').map((ch, i) => ({ch, after: i === 0 ? 0 : 80})));

/**
 * Variant used only by the stale/abort tests: same characters, but a 600 ms pause after "post".
 * The pause lets the debounced request for "post" leave the client; the next keystroke then
 * makes it obsolete while it is still in flight (latencyFor("post") = 750 ms).
 */
export const TYPING_SCRIPT_PAUSED = Object.freeze('postgres'.split('').map((ch, i) => ({ch, after: i === 0 ? 0 : i === 4 ? 600 : 80})));

/** Drive `client.onInput(prefix)` through the script on `clock`, then wait for the client to settle. */
export const runTyping = async (client, clock, script = TYPING_SCRIPT) => {
  let text = '';
  const keystrokes = [];
  for (const step of script) {
    if (step.after) await new Promise((r) => clock.setTimeout(r, step.after));
    text += step.ch;
    keystrokes.push({at: clock.now(), text});
    client.onInput(text);
  }
  await client.settle();
  return keystrokes;
};
