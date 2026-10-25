// Runs the exact scenarios the video shows and writes evidence.json.
// Every release is explicit (see runSchedule); there are no timers, so the output is identical on every run.
import fs from 'node:fs';
import path from 'node:path';
import {createMockApi} from './mock-api.mjs';
import {FlawedSearchController, SearchController} from './search-controller.mjs';
import {runSchedule} from './driver.mjs';

const T = (query) => ({do: 'type', query});
const R = (request) => ({do: 'release', request});
const F = (request, message = 'network error (simulated)') => ({do: 'fail', request, message});

const SCENARIOS = [
  {id: 'stale_success', title: 'Stale success: "re" answers after "react"', steps: [T('re'), T('react'), R(2), R(1)]},
  {id: 'stale_failure', title: 'Stale failure: the "re" request fails after "react" succeeded', steps: [T('re'), T('react'), R(2), F(1)]},
  {id: 'loading', title: 'Loading: the older request finishes while "react" is still pending', steps: [T('re'), T('react'), R(1), R(2)]},
  {id: 'cleared', title: 'Query cleared while "re" is pending', steps: [T('re'), {do: 'clear'}, R(1)]},
  {id: 'disposed', title: 'Component disposed while "react" is pending', steps: [T('react'), {do: 'dispose'}, R(1)]},
];

const slim = (e) => {
  const {seq, kind, event, query, loading, error, resultsFor, resultsRequestId, generation} = e;
  const out = {seq, kind, event, query, loading, error, resultsFor, resultsRequestId};
  if (generation !== null && generation !== undefined) out.generation = generation;
  return out;
};

async function runVariant(make, steps) {
  const api = createMockApi();
  const c = make(api);
  const log = await runSchedule(c, api, steps);
  return {
    stateWrites: c.stateWrites,
    discards: c.discards ? c.discards.map((d) => ({...d})) : undefined,
    perStep: log.map((l) => ({step: l.step, writes: l.writes, after: {query: l.after.query, loading: l.after.loading, error: l.after.error, resultsFor: l.after.resultsFor, generation: l.after.generation}})),
    timeline: c.timeline.map(slim),
    final: c.snapshot(),
    requests: api.requests.map((r) => ({n: r.n, id: r.id, query: r.query, state: r.state, signalAborted: r.signalAborted})),
  };
}

const scenarios = [];
for (const s of SCENARIOS) {
  const flawed = await runVariant((api) => new FlawedSearchController(api), s.steps);
  const corrected = await runVariant((api) => new SearchController(api), s.steps);
  scenarios.push({id: s.id, title: s.title, releaseSchedule: s.steps, flawed, corrected});
}

// Disposed: count state writes that happened AFTER the dispose step
{
  const d = scenarios.find((s) => s.id === 'disposed');
  const at = d.releaseSchedule.findIndex((x) => x.do === 'dispose');
  for (const v of ['flawed', 'corrected']) {
    d[v].writesAtDispose = d[v].perStep[at].writes;
    d[v].writesAfterDispose = d[v].stateWrites - d[v].writesAtDispose;
  }
}

// Abort variants, same schedule as stale_success
const abortSchedule = [T('re'), T('react'), R(2), R(1)];
const abortRuns = {};
for (const [name, ctl, honor] of [
  ['guardOnly', {abortSuperseded: false}, true],
  ['guardPlusAbort', {abortSuperseded: true}, true],
  ['guardPlusAbortServerIgnoresSignal', {abortSuperseded: true}, false],
]) {
  const api = createMockApi({honorAbort: honor});
  const c = new SearchController(api, ctl);
  await runSchedule(c, api, abortSchedule);
  abortRuns[name] = {options: {...ctl, apiHonorsAbort: honor}, final: c.snapshot(), discards: c.discards.map((d) => ({...d})), requests: api.requests.map((r) => ({n: r.n, id: r.id, query: r.query, state: r.state, signalAborted: r.signalAborted}))};
}
const sameFinal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const abortComparison = {
  schedule: abortSchedule,
  runs: abortRuns,
  finalStateIdentical: sameFinal(abortRuns.guardOnly.final, abortRuns.guardPlusAbort.final) && sameFinal(abortRuns.guardOnly.final, abortRuns.guardPlusAbortServerIgnoresSignal.final),
  note: 'Abort is an optimisation. Correctness comes from the generation guard. A client-side abort does not prove the server stopped executing.',
};

const evidence = {
  generatedBy: 'fixtures/ep27-stale-search-responses/demo.mjs',
  label: 'SIMULATED CONTROLLER: framework-free state machine driven by a mock API. Not recorded browser evidence. No DOM, no timers, no machine timing.',
  scope: 'Local UI concurrency control for one search box. Not a general distributed-ordering solution.',
  mockApi: {
    synthetic: true,
    requestIds: 'req-<n> assigned in creation order for the demo only; the controller never compares ids',
    resultsBy: {re: ['redis', 'redux', 'regex', 'request'], react: ['react', 'react-dom', 'react-router']},
    responseShape: '{requestId, query, items}',
  },
  scenarios,
  abortComparison,
};

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');

const row = (s, v) => `${s.id.padEnd(14)} ${v.padEnd(9)} query=${JSON.stringify(s[v].final.query).padEnd(8)} resultsFor=${String(s[v].final.resultsFor).padEnd(6)} loading=${s[v].final.loading} error=${s[v].final.error}`;
for (const s of scenarios) {
  console.log(row(s, 'flawed'));
  console.log(row(s, 'corrected'));
}
console.log('abort comparison: final state identical =', abortComparison.finalStateIdentical);
