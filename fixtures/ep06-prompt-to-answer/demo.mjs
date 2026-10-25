// Runs the exact scenario shown in the video and writes evidence.json + trace.json (sanitized).
//   run 1: happy path  — question -> simulated tool call -> validate -> scope -> count -> answer
//   run 2: scope probe — model (simulated) tries to smuggle accountId=org_globex; refused
//   run 3: retry       — one simulated transient tool error, one bounded retry, correct count
//   run 4: failure     — two simulated transient errors; honest failure, no count
// Timings are measured with process.hrtime inside this process and labelled measured-in-fixture.
// They measure a local mock, not a real model API, and are reported only as what they are.
import fs from 'node:fs';
import {runAssistant, makeTrace} from './app.mjs';
import {makeMockModel} from './mock-model.mjs';
import {makeCountTickets, loadTickets} from './tools.mjs';

const QUESTION = 'How many open support tickets are high priority?';
const alice = {userId: 'u_alice', orgId: 'org_acme'}; // synthetic; identity comes from a session, never from the model
const tickets = loadTickets();
const trace = makeTrace();
const runs = {};

const run = async (label, opts) => {
  const r = await runAssistant({question: QUESTION, session: alice, trace, measure: true, ...opts});
  const last = r.trace.at(-1);
  runs[label] = {requestId: r.requestId, ok: r.ok, count: r.count ?? null, reason: r.reason ?? null, answer: r.answer, steps: r.trace.length, totalMsMeasuredInFixture: last.atMs, modelCalls: opts.model.calls, toolCalls: opts.countTickets.calls};
  return r;
};

await run('happy', {model: makeMockModel(), countTickets: makeCountTickets({tickets})});
await run('scope_probe', {model: makeMockModel({variant: 'smuggle_scope'}), countTickets: makeCountTickets({tickets})});
await run('retry', {model: makeMockModel(), countTickets: makeCountTickets({tickets, failTimes: 1})});
await run('failure', {model: makeMockModel(), countTickets: makeCountTickets({tickets, failTimes: 2})});

const byOrg = {};
for (const t of tickets) { byOrg[t.orgId] ??= {total: 0, openHigh: 0}; byOrg[t.orgId].total++; if (t.status === 'open' && t.priority === 'high') byOrg[t.orgId].openHigh++; }
const dataset = {file: 'tickets.json', seed: JSON.parse(fs.readFileSync(new URL('./tickets.json', import.meta.url), 'utf8')).seed, tickets: tickets.length, openHighAllOrgs: tickets.filter((t) => t.status === 'open' && t.priority === 'high').length, byOrg};

const evidence = {
  generatedAt: new Date().toISOString(),
  modelIsSimulated: true,
  note: 'Deterministic mock model; no real model API was called. One application design, not every AI request. Timings labelled measured-in-fixture are process.hrtime deltas inside this local process (mock model + in-memory filter), not network or real-model latencies.',
  question: QUESTION,
  session: {userId: 'u_alice (synthetic)', orgId: alice.orgId},
  dataset,
  runs,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
// Sanitized trace: every step from every run, keyed by opaque request ids; no tokens, no user ids.
fs.writeFileSync(new URL('./trace.json', import.meta.url), JSON.stringify({sanitized: true, modelIsSimulated: true, steps: trace.steps}, null, 2));
console.table(Object.entries(runs).map(([k, v]) => ({run: k, ok: v.ok, count: v.count, reason: v.reason, steps: v.steps, toolCalls: v.toolCalls, ms: v.totalMsMeasuredInFixture})));
console.log(`org_acme open+high = ${dataset.byOrg.org_acme.openHigh} (all orgs: ${dataset.openHighAllOrgs})`);
