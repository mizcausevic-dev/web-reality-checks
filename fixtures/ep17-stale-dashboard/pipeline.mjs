// Episode 17 fixture: a four-stage synthetic telemetry pipeline on one shared clock.
//
//   source ──(collector samples every 600 s)──> collector store ──(API serves latest)──> dashboard polls every 30 s
//
// Every stage stamps its own time from the SAME clock:
//   sourceObservedAt  when the source produced the value
//   collectedAt       when the collector sampled the source
//   servedAt          when the API answered this particular request
// plus the value itself. No stage ever rewrites another stage's timestamp.
//
// No sockets, no Date.now(), no randomness except the seeded source series. Everything is
// in-process so the clock can be advanced deterministically. Synthetic data only.
import {createClock} from './clock.mjs';
import {evaluate, naiveStatus} from './state-rules.mjs';

export const COLLECT_INTERVAL_SECONDS = 600; // the collector samples the source every ten simulated minutes
export const POLL_INTERVAL_SECONDS = 30; // the dashboard polls the API every thirty simulated seconds

/** Deterministic source. The value is a function of simulated time only, so two runs agree.
 *  Models a slowly drifting sensor (synthetic "inlet temperature", °C, one decimal). */
export const createSource = (clock) => ({
  observe() {
    const minutes = Math.floor(clock.now() / 60000);
    const value = Math.round((21 + 1.5 * Math.sin(minutes / 7) + 0.4 * Math.cos(minutes / 3)) * 10) / 10;
    return {value, sourceObservedAt: clock.iso()};
  },
});

/** Collector: samples the source on its own schedule and keeps only the latest sample.
 *  `failing = true` makes every sampling attempt fail; the stored sample is NOT cleared. */
export const createCollector = (clock, source) => {
  const c = {
    failing: false,
    latest: null, // {value, sourceObservedAt, collectedAt}
    attempts: [],
    sample() {
      const at = clock.iso();
      if (c.failing) {
        c.attempts.push({at, ok: false, error: 'collector unreachable'});
        return null;
      }
      const obs = source.observe();
      c.latest = {...obs, collectedAt: at};
      c.attempts.push({at, ok: true});
      return c.latest;
    },
  };
  return c;
};

/** API: returns the latest collected reading, stamped with servedAt. Pure read; it never samples.
 *  `failing = true` returns a 503 instead. */
export const createApi = (clock, collector) => {
  const api = {
    failing: false,
    requests: 0,
    getLatest() {
      api.requests += 1;
      const servedAt = clock.iso();
      if (api.failing) return {ok: false, status: 503, error: '503 Service Unavailable', servedAt};
      if (!collector.latest) return {ok: true, status: 204, body: null, servedAt};
      return {ok: true, status: 200, body: {...collector.latest, servedAt}};
    },
  };
  return api;
};

/** Dashboard: polls the API, keeps the last reading it saw, and derives its display state with
 *  the pure rules. A failed poll keeps the last known reading and records the failure. */
export const createDashboard = (clock, api) => {
  const d = {
    reading: null,
    lastPoll: null, // {at, ok, status, error}
    polls: 0,
    poll() {
      d.polls += 1;
      const r = api.getLatest();
      d.lastPoll = {at: clock.now(), ok: r.ok, status: r.status, error: r.error ?? null};
      if (r.ok && r.body) d.reading = r.body; // never fabricate a reading; only replace with a real one
      return r;
    },
    state() {
      return {
        ...evaluate({reading: d.reading, nowMs: clock.now(), lastPoll: d.lastPoll}),
        naive: naiveStatus({nowMs: clock.now(), lastPoll: d.lastPoll}),
      };
    },
  };
  return d;
};

/** Wire the whole pipeline on one clock and drive it with an explicit scheduler.
 *  `advance(seconds)` moves the clock in 1 s ticks, firing the collector every COLLECT_INTERVAL_SECONDS
 *  and the dashboard poll every `pollInterval` seconds (relative to pipeline start). Returns every
 *  poll outcome in order so a demo can print a poll-by-poll table. */
export const createPipeline = ({pollInterval = POLL_INTERVAL_SECONDS, collectInterval = COLLECT_INTERVAL_SECONDS, collectAtStart = true} = {}) => {
  const clock = createClock();
  const source = createSource(clock);
  const collector = createCollector(clock, source);
  const api = createApi(clock, collector);
  const dashboard = createDashboard(clock, api);
  const startMs = clock.now();
  const elapsed = () => Math.round((clock.now() - startMs) / 1000);
  const trace = [];

  const record = (kind, extra = {}) => {
    const st = dashboard.state();
    const row = {
      t: elapsed(),
      simTime: clock.iso(),
      event: kind,
      value: dashboard.reading?.value ?? null,
      sourceObservedAt: dashboard.reading?.sourceObservedAt ?? null,
      collectedAt: dashboard.reading?.collectedAt ?? null,
      servedAt: dashboard.reading?.servedAt ?? null,
      pollStatus: dashboard.lastPoll?.status ?? null,
      measurementAgeSeconds: st.measurementAgeSeconds,
      freshness: st.freshness,
      connection: st.connection,
      warning: st.warning,
      naiveLabel: st.naive.label,
      naiveUpdatedSecondsAgo: st.naive.updatedSecondsAgo,
      ...extra,
    };
    trace.push(row);
    return row;
  };

  if (collectAtStart) collector.sample();

  const advance = (seconds) => {
    const out = [];
    for (let i = 0; i < seconds; i++) {
      clock.advanceSeconds(1);
      const e = elapsed();
      if (e % collectInterval === 0) {
        const s = collector.sample();
        out.push(record(s ? 'collect' : 'collect-failed'));
      }
      if (e % pollInterval === 0) {
        dashboard.poll();
        out.push(record('poll'));
      }
    }
    return out;
  };

  return {clock, source, collector, api, dashboard, advance, trace, elapsed, record};
};
