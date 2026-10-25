// Episode 06 fixture: the APPLICATION between the prompt and the answer.
//
// This is ONE application design for a tool-using assistant, not a description of every AI request.
// Observable steps only; the model is a deterministic mock (see mock-model.mjs).
//
//   runAssistant({question, session, model, countTickets, trace})
//     1. assemble messages + tool definitions
//     2. model turn 1  -> expects a structured tool call
//     3. validate tool name + args against tool-schema.json (tiny validator below)
//     4. enforce data scope from the SESSION (model-supplied account ids are stripped/ignored)
//     5. execute the narrowly scoped read-only tool, with ONE bounded retry on a transient error
//     6. return the structured result to the model (turn 2)
//     7. final answer carries the real computed count — or an honest failure, never a fabricated count
//
// Every step is written to a trace keyed by an opaque request id; the trace holds no secrets.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {TransientToolError} from './tools.mjs';

export const toolSchema = JSON.parse(fs.readFileSync(new URL('./tool-schema.json', import.meta.url), 'utf8'));

/* ---------- tiny JSON-schema validator (subset: object/properties/required/enum/type/additionalProperties) ---------- */
export const validate = (schema, value, path = '$') => {
  const errors = [];
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  if (schema.type && typeOf(value) !== schema.type) { errors.push(`${path}: expected ${schema.type}, got ${typeOf(value)}`); return errors; }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: "${value}" not in [${schema.enum.join(', ')}]`);
  if (schema.type === 'object') {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}.${k}: required`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) errors.push(...validate(schema.properties[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${k}: not permitted`);
    }
  }
  return errors;
};

export const validateToolCall = (call, tools) => {
  const def = tools.find((t) => t.name === call.name);
  if (!def) return [`tool "${call.name}" is not offered`];
  return validate(def.parameters, call.args ?? {});
};

/* ---------- scope ---------- */
// Scope comes ONLY from the authenticated session. Anything scope-like in the model's args is ignored.
export const resolveScope = (session) => {
  if (!session?.userId || !session?.orgId) throw new Error('no authenticated session');
  return {orgId: session.orgId};
};
const SCOPE_KEYS = ['accountId', 'orgId', 'tenantId', 'userId'];
export const stripScopeClaims = (args) => {
  const clean = {}; const ignored = [];
  for (const [k, v] of Object.entries(args)) (SCOPE_KEYS.includes(k) ? ignored.push({[k]: v}) : (clean[k] = v));
  return {clean, ignored};
};

/* ---------- trace ---------- */
export const newRequestId = () => 'req_' + crypto.randomBytes(6).toString('hex'); // opaque, no identity inside
export const makeTrace = () => { const steps = []; return {steps, add: (requestId, lane, event, data = {}) => steps.push({requestId, seq: steps.length + 1, lane, event, ...data})}; };

/* ---------- the application ---------- */
const MAX_ATTEMPTS = 2; // one bounded retry; safe here ONLY because countTickets is read-only and idempotent
export const runAssistant = async ({question, session, model, countTickets, trace = makeTrace(), requestId = newRequestId(), measure = false}) => {
  const t0 = measure ? process.hrtime.bigint() : null;
  const ms = () => (measure ? Number(process.hrtime.bigint() - t0) / 1e6 : undefined);
  const T = (lane, event, data) => trace.add(requestId, lane, event, measure ? {...data, atMs: +ms().toFixed(3)} : data);

  T('ui', 'question.submitted', {text: question});
  const scope = resolveScope(session);
  T('app', 'scope.resolved', {source: 'server-side session', orgId: scope.orgId});

  const tools = [{name: toolSchema.name, description: toolSchema.description, parameters: toolSchema.parameters}];
  const messages = [
    {role: 'system', content: 'You answer questions about the user\'s support tickets using the offered tools. Never guess counts.'},
    {role: 'user', content: question},
  ];
  T('app', 'messages.assembled', {messages: messages.length, tools: tools.map((t) => t.name)});

  const r1 = await model({messages, tools});
  T('model', 'response.received', {simulated: true, type: r1.type, ...(r1.type === 'tool_call' ? {name: r1.name, args: r1.args} : {})});
  if (r1.type !== 'tool_call') return finish({trace, requestId, ok: true, answer: r1.text, toolUsed: false});

  // 3. validate
  const errors = validateToolCall(r1, tools);
  T('app', 'toolcall.validated', {name: r1.name, ok: errors.length === 0, errors});
  if (errors.length) return finish({trace, requestId, ok: false, answer: 'I could not complete that request: the tool request was invalid.', reason: 'invalid_tool_call', errors});

  // 4. scope (belt and braces: schema already forbids extra keys; this also handles tools whose schema allows them)
  const {clean, ignored} = stripScopeClaims(r1.args);
  T('app', 'scope.enforced', {orgId: scope.orgId, ignoredModelClaims: ignored});

  // 5. execute with one bounded retry
  let result = null; let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      T('tool', 'execute', {name: r1.name, attempt, scope, args: clean, readOnly: true});
      result = countTickets(scope, clean);
      T('data', 'query', {store: 'tickets.json', filter: {orgId: scope.orgId, ...clean}, count: result.count});
      T('tool', 'result', {attempt, result});
      break;
    } catch (e) {
      lastErr = e;
      T('tool', 'error', {attempt, transient: !!e.transient, message: e.message});
      if (!e.transient || attempt === MAX_ATTEMPTS) break;
      T('app', 'retry.scheduled', {attempt: attempt + 1, reason: 'transient error on a read-only, idempotent tool'});
    }
  }
  if (!result) {
    const answer = 'I could not retrieve the ticket count right now: the ticket store did not respond. No count is available.';
    T('app', 'answer.failure', {answer, fabricatedCount: false});
    return finish({trace, requestId, ok: false, answer, reason: lastErr?.transient ? 'tool_unavailable' : 'tool_error', count: null});
  }

  // 6. hand the structured result back to the model
  messages.push({role: 'assistant', toolCall: {callId: r1.callId, name: r1.name, args: clean}});
  messages.push({role: 'tool', callId: r1.callId, content: result});
  T('app', 'toolresult.returned_to_model', {callId: r1.callId, count: result.count});
  const r2 = await model({messages, tools});
  T('model', 'response.received', {simulated: true, type: r2.type});
  T('ui', 'answer.displayed', {answer: r2.text, countShown: result.count});
  return finish({trace, requestId, ok: true, answer: r2.text, count: result.count, toolUsed: true});
};

const finish = ({trace, requestId, ...rest}) => ({requestId, ...rest, trace: trace.steps.filter((s) => s.requestId === requestId)});
