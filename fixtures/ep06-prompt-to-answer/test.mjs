import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runAssistant, validate, validateToolCall, stripScopeClaims, toolSchema, makeTrace} from './app.mjs';
import {makeMockModel} from './mock-model.mjs';
import {makeCountTickets, generateTickets, loadTickets, SEED} from './tools.mjs';

const QUESTION = 'How many open support tickets are high priority?';
const alice = {userId: 'u_alice', orgId: 'org_acme'};
const tickets = loadTickets();
const expected = tickets.filter((t) => t.orgId === 'org_acme' && t.status === 'open' && t.priority === 'high').length;
const expectedGlobex = tickets.filter((t) => t.orgId === 'org_globex' && t.status === 'open' && t.priority === 'high').length;
const expectedAll = tickets.filter((t) => t.status === 'open' && t.priority === 'high').length;

test('tickets.json is the seeded dataset (regenerating with the same seed reproduces it)', () => {
  const onDisk = JSON.parse(fs.readFileSync(new URL('./tickets.json', import.meta.url), 'utf8'));
  assert.equal(onDisk.seed, SEED);
  assert.deepEqual(generateTickets(SEED).tickets, onDisk.tickets);
  assert.ok(expected > 0 && expected !== expectedAll, 'scope must make an observable difference for the scope tests to mean anything');
});

test('happy path: tool call -> validate -> scope -> execute -> result -> final answer with the real count', async () => {
  const model = makeMockModel();
  const r = await runAssistant({question: QUESTION, session: alice, model, countTickets: makeCountTickets({tickets})});
  assert.equal(r.ok, true);
  assert.equal(r.count, expected);
  assert.ok(r.answer.includes(String(expected)), 'final answer must embed the computed count');
  assert.equal(model.calls, 2, 'one tool-call turn, one answer turn');
  const events = r.trace.map((s) => `${s.lane}:${s.event}`);
  assert.deepEqual(events, [
    'ui:question.submitted', 'app:scope.resolved', 'app:messages.assembled', 'model:response.received',
    'app:toolcall.validated', 'app:scope.enforced', 'tool:execute', 'data:query', 'tool:result',
    'app:toolresult.returned_to_model', 'model:response.received', 'ui:answer.displayed',
  ]);
  assert.ok(r.trace.every((s) => s.requestId === r.requestId && /^req_[0-9a-f]{12}$/.test(s.requestId)), 'opaque request id links every step');
  assert.ok(r.trace.filter((s) => s.lane === 'model').every((s) => s.simulated === true), 'model steps are tagged simulated');
});

test('validator: rejects unknown tool, bad enum, missing required, extra keys; accepts the good call', () => {
  const tools = [toolSchema];
  assert.deepEqual(validateToolCall({name: 'countTickets', args: {status: 'open', priority: 'high'}}, tools), []);
  assert.match(validateToolCall({name: 'runSql', args: {}}, tools)[0], /not offered/);
  assert.match(validateToolCall({name: 'countTickets', args: {status: 'open', priority: 'urgent'}}, tools)[0], /not in \[low, normal, high\]/);
  assert.match(validateToolCall({name: 'countTickets', args: {status: 'open'}}, tools)[0], /priority: required/);
  assert.match(validateToolCall({name: 'countTickets', args: {status: 'open', priority: 'high', accountId: 'x'}}, tools)[0], /accountId: not permitted/);
  assert.match(validate({type: 'object'}, 'nope')[0], /expected object, got string/);
});

test('model asks for a tool that was never offered (runSql): refused, no SQL path exists', async () => {
  const countTickets = makeCountTickets({tickets});
  const r = await runAssistant({question: QUESTION, session: alice, model: makeMockModel({variant: 'unknown_tool'}), countTickets});
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_tool_call');
  assert.equal(countTickets.calls, 0, 'nothing executed');
  assert.equal(r.count, undefined);
});

test('model supplies invalid arguments: refused before execution', async () => {
  const countTickets = makeCountTickets({tickets});
  const r = await runAssistant({question: QUESTION, session: alice, model: makeMockModel({variant: 'bad_args'}), countTickets});
  assert.equal(r.ok, false);
  assert.equal(countTickets.calls, 0);
});

test('KNOWN-POSITIVE CONTROL: without scope enforcement a model-supplied accountId would change the count', () => {
  // Demonstrates the hazard the application guards against: if the app naively trusted args.accountId as scope,
  // Alice (org_acme) would receive org_globex's count. The real tool API makes this impossible by taking scope separately.
  const naiveScopeFromModel = (args) => ({orgId: args.accountId});
  const count = makeCountTickets({tickets});
  const smuggled = {status: 'open', priority: 'high', accountId: 'org_globex'};
  const leaked = count(naiveScopeFromModel(smuggled), {status: smuggled.status, priority: smuggled.priority}).count;
  assert.equal(leaked, expectedGlobex);
  assert.notEqual(leaked, expected, 'the flaw must be observable or the scope test proves nothing');
});

test('scope: a model-supplied accountId is rejected by the schema and, even if it got through, is stripped and ignored', async () => {
  const countTickets = makeCountTickets({tickets});
  const r = await runAssistant({question: QUESTION, session: alice, model: makeMockModel({variant: 'smuggle_scope'}), countTickets});
  // Layer 1: schema has additionalProperties:false, so the call is refused outright.
  assert.equal(r.ok, false);
  assert.equal(countTickets.calls, 0);
  // Layer 2: stripScopeClaims never lets a scope key reach the tool.
  const {clean, ignored} = stripScopeClaims({status: 'open', priority: 'high', accountId: 'org_globex', tenantId: 't9'});
  assert.deepEqual(clean, {status: 'open', priority: 'high'});
  assert.deepEqual(ignored, [{accountId: 'org_globex'}, {tenantId: 't9'}]);
  // Layer 3: the tool itself refuses to run without an application-supplied scope.
  assert.throws(() => countTickets(undefined, clean), /refuse to run unscoped/);
});

test('scope: the same question from a user in another org yields that org\'s count, never the global total', async () => {
  const bob = {userId: 'u_bob', orgId: 'org_globex'};
  const r = await runAssistant({question: QUESTION, session: bob, model: makeMockModel(), countTickets: makeCountTickets({tickets})});
  assert.equal(r.count, expectedGlobex);
  assert.notEqual(r.count, expectedAll);
});

test('no session: refused before any model call', async () => {
  const model = makeMockModel();
  await assert.rejects(runAssistant({question: QUESTION, session: null, model, countTickets: makeCountTickets({tickets})}), /no authenticated session/);
  assert.equal(model.calls, 0);
});

test('retry: one transient failure -> one bounded retry -> correct count', async () => {
  const countTickets = makeCountTickets({tickets, failTimes: 1});
  const r = await runAssistant({question: QUESTION, session: alice, model: makeMockModel(), countTickets});
  assert.equal(r.ok, true);
  assert.equal(r.count, expected);
  assert.equal(countTickets.calls, 2);
  assert.equal(r.trace.filter((s) => s.event === 'retry.scheduled').length, 1);
});

test('failure: two transient failures -> honest failure message, no count, no fabricated number, model not asked to answer', async () => {
  const countTickets = makeCountTickets({tickets, failTimes: 2});
  const model = makeMockModel();
  const r = await runAssistant({question: QUESTION, session: alice, model, countTickets});
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tool_unavailable');
  assert.equal(r.count, null);
  assert.equal(countTickets.calls, 2, 'exactly one retry, then stop');
  assert.equal(model.calls, 1, 'the model is not given a chance to invent a number');
  assert.doesNotMatch(r.answer, /\d/, 'the failure message contains no digits at all');
  assert.equal(r.trace.at(-1).fabricatedCount, false);
});

test('non-transient tool error is not retried', async () => {
  const boom = () => { throw new Error('bug'); }; boom.calls = 0;
  const wrapped = (s, a) => { wrapped.calls++; return boom(s, a); }; wrapped.calls = 0;
  const r = await runAssistant({question: QUESTION, session: alice, model: makeMockModel(), countTickets: wrapped});
  assert.equal(r.ok, false);
  assert.equal(wrapped.calls, 1);
});

test('trace contains no secrets or session identifiers', async () => {
  const trace = makeTrace();
  await runAssistant({question: QUESTION, session: {...alice, token: 'sk-SECRET-123'}, model: makeMockModel(), countTickets: makeCountTickets({tickets}), trace});
  const s = JSON.stringify(trace.steps);
  assert.doesNotMatch(s, /SECRET|sk-|u_alice/);
});
