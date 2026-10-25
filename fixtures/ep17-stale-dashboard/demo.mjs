// Runs the exact scenarios shown in the video on the controlled clock and writes evidence.json.
// Nothing here waits in real time: "ten simulated minutes" is 600 calls to clock.advanceSeconds(1).
import fs from 'node:fs';
import {createClock} from './clock.mjs';
import {createPipeline, COLLECT_INTERVAL_SECONDS, POLL_INTERVAL_SECONDS} from './pipeline.mjs';
import {evaluate, STALE_THRESHOLD_SECONDS, CONNECTION_WINDOW_SECONDS} from './state-rules.mjs';

const pick = (r) => ({
  t: r.t, simTime: r.simTime, event: r.event, pollStatus: r.pollStatus, value: r.value,
  sourceObservedAt: r.sourceObservedAt, collectedAt: r.collectedAt, servedAt: r.servedAt,
  measurementAgeSeconds: r.measurementAgeSeconds, freshness: r.freshness, connection: r.connection,
  naiveLabel: r.naiveLabel, naiveUpdatedSecondsAgo: r.naiveUpdatedSecondsAgo, warning: r.warning,
});

// ---------- Scenario 1: healthy collection ----------
// Collect at t=0 and t=600. Poll every 30 s. Watch age climb to 570 s on a "Live" panel, then drop at t=600.
const healthy = createPipeline();
healthy.advance(630);
const healthyRows = healthy.trace.map(pick);

// ---------- Scenario 2: collector failure ----------
// Same start. At t=570 the collector begins failing. Collections at 600 and 1200 fail. The API keeps serving
// the t=0 reading with a 200. The dashboard stays "connected" and the age keeps climbing to 1200 s.
const collectorFail = createPipeline();
collectorFail.advance(570);
collectorFail.collector.failing = true;
collectorFail.record('collector-marked-failing');
collectorFail.advance(630);
const collectorFailRows = collectorFail.trace.map(pick);

// ---------- Scenario 3: API failure ----------
// Same start. At t=60 the API begins returning 503. Polls at 90 and 120 fail. The last known value (t=0) is
// retained with an explicit warning; nothing is invented. At t=120 the API recovers; poll at 150 succeeds.
const apiFail = createPipeline();
apiFail.advance(60);
apiFail.api.failing = true;
apiFail.record('api-marked-failing');
apiFail.advance(60);
apiFail.api.failing = false;
apiFail.record('api-recovered');
apiFail.advance(30);
const apiFailRows = apiFail.trace.map(pick);

// ---------- Side check A: polling faster ----------
const slow = createPipeline({pollInterval: 30});
const fast = createPipeline({pollInterval: 5});
slow.advance(599);
fast.advance(599);
const pollingFaster = {
  slow: {pollInterval: 30, polls: slow.dashboard.polls, collectorSamples: slow.collector.attempts.length, distinctCollectedAt: new Set(slow.trace.filter((r) => r.event === 'poll').map((r) => r.collectedAt)).size, ageAt570: slow.trace.find((r) => r.event === 'poll' && r.t === 570).measurementAgeSeconds},
  fast: {pollInterval: 5, polls: fast.dashboard.polls, collectorSamples: fast.collector.attempts.length, distinctCollectedAt: new Set(fast.trace.filter((r) => r.event === 'poll').map((r) => r.collectedAt)).size, ageAt570: fast.trace.find((r) => r.event === 'poll' && r.t === 570).measurementAgeSeconds},
};

// ---------- Side check B: bad timestamps through the pure rules ----------
const now = createClock().now();
const okPoll = {at: now, ok: true};
const timestampChecks = {
  future45s: evaluate({reading: {value: 21.4, sourceObservedAt: new Date(now + 45_000).toISOString()}, nowMs: now, lastPoll: okPoll}),
  missing: evaluate({reading: {value: 21.4}, nowMs: now, lastPoll: okPoll}),
  invalid: evaluate({reading: {value: 21.4, sourceObservedAt: 'yesterday-ish'}, nowMs: now, lastPoll: okPoll}),
};

const evidence = {
  generatedAt: new Date().toISOString(),
  note: 'All times are SIMULATED. One shared clock; advanced explicitly in 1 s steps. No real waiting, no sockets, synthetic sensor value.',
  policy: {STALE_THRESHOLD_SECONDS, CONNECTION_WINDOW_SECONDS, COLLECT_INTERVAL_SECONDS, POLL_INTERVAL_SECONDS},
  scenarios: {
    healthy: {description: 'collector samples at t=0 and t=600; dashboard polls every 30 s; all polls 200', rows: healthyRows},
    collectorFailure: {description: 'collector fails from t=570; collections at 600 and 1200 fail; API keeps serving the t=0 reading with 200', rows: collectorFailRows},
    apiFailure: {description: 'API returns 503 from t=60 to t=120; dashboard keeps last known value with explicit warning; recovers at t=150', rows: apiFailRows},
  },
  pollingFaster,
  timestampChecks,
  summary: {
    healthy: {
      pollsBeforeRecollect: healthyRows.filter((r) => r.event === 'poll' && r.t < 600).length,
      allPollsStatus200: healthyRows.filter((r) => r.event === 'poll').every((r) => r.pollStatus === 200),
      naiveLabelAlwaysLive: healthyRows.filter((r) => r.event === 'poll').every((r) => r.naiveLabel === 'Live' && r.naiveUpdatedSecondsAgo === 0),
      maxAgeBeforeRecollect: Math.max(...healthyRows.filter((r) => r.t < 600).map((r) => r.measurementAgeSeconds)),
      firstStaleAtT: healthyRows.find((r) => r.freshness === 'stale')?.t ?? null,
      ageAtT600: healthyRows.find((r) => r.event === 'poll' && r.t === 600).measurementAgeSeconds,
    },
    collectorFailure: {
      failedCollections: collectorFailRows.filter((r) => r.event === 'collect-failed').length,
      lastPoll: pick(collectorFail.trace.at(-1)),
    },
    apiFailure: {
      failedPolls: apiFailRows.filter((r) => r.event === 'poll' && r.pollStatus === 503).length,
      valueRetainedDuringOutage: apiFailRows.filter((r) => r.pollStatus === 503).every((r) => r.value === apiFailRows[0].value),
      lastPoll: pick(apiFail.trace.at(-1)),
    },
  },
};

fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));

const show = (title, rows) => {
  console.log(`\n== ${title} ==`);
  console.table(rows.map((r) => ({t: r.t, event: r.event, http: r.pollStatus ?? '-', value: r.value ?? '-', ageS: r.measurementAgeSeconds ?? '-', freshness: r.freshness, connection: r.connection, naive: r.naiveLabel, warning: r.warning ? r.warning.slice(0, 60) : ''})));
};
show('healthy', healthyRows);
show('collector failure', collectorFailRows.filter((r) => r.t >= 540));
show('API failure', apiFailRows);
console.log('\npolling faster:', JSON.stringify(pollingFaster));
console.log('timestamp checks:', JSON.stringify(Object.fromEntries(Object.entries(timestampChecks).map(([k, v]) => [k, {age: v.measurementAgeSeconds, freshness: v.freshness, reason: v.reason}]))));
console.log('\nevidence.json written');
