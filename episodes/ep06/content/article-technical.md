SEO title (≤60 chars): The Model Requests the Tool. Your App Controls Execution.
Meta description (≤155 chars): One question traced through a tool-using assistant: validate the tool call, scope data from the session, retry once, fail without inventing a count.
Slug: prompt-to-answer
Primary keyword: LLM tool calling architecture   Secondary keywords (3–5): function calling validation, tool call schema validation, tenant scope enforcement AI, bounded retry idempotent tool, honest failure AI assistant
Medium tags (5): AI Engineering, Software Architecture, Node.js, LLM Applications, Web Security

# What Happens Between Your Prompt and the Answer?

![Five lanes, user interface, application, model API, tool executor and data store, with the ticket store failing twice; the application returns an honest message with no count and the model lane is tagged SIMULATED MODEL RESPONSE](../hero.png)

You ask a support assistant "How many open support tickets are high priority?" and it answers "5." Between that question and that number sit an application, a schema check, a scope decision, a read-only function and a retry policy, and the model is only one part and never the one holding the data.

Episode six of Web Reality Checks traces one request through five lanes on a local fixture, with a deterministic mock standing in for the model. Every model step is tagged SIMULATED MODEL RESPONSE and the trace records `simulated: true` on each. The application's work is where the answer's correctness is decided, so that is what the episode shows.

## What actually happens

Five lanes: user interface, application, model API, tool executor, data store. The application, not the model, assembles the request: a system message, the user's question, and exactly one tool definition, `countTickets(status, priority)`. Nothing else is offered.

The model's first reply is not an answer. It is a structured request to call the tool with `{status: "open", priority: "high"}`: a tool name and an argument object, which is all a tool-using model API exposes. The fixture depicts nothing about how the model arrived at it; the application cannot see that either.

The application then validates the call against the schema (tool offered? values in the enums? extra keys?), resolves the data scope from the server-side session while ignoring anything scope-like in the model's arguments, executes a narrow read-only count with one bounded retry on a transient error, and hands the structured result back to the model, which produces the final sentence with the count embedded.

The mechanism: the model requests, the application executes. The model never opens the data store, never writes SQL, never decides whose data is in play. If the tool fails twice, the application writes the failure message itself and gives the model no second turn, so no path exists by which a number could be invented. One application design, not every AI request, but the shape is the point.

## The fixture

`fixtures/ep06-prompt-to-answer/` is a dependency-free Node 22 application. `tickets.json` holds 120 synthetic tickets across three organizations from seed `20260625`; a test asserts the file equals `generateTickets(SEED)`. `tool-schema.json` is the single tool offered:

```json
{
  "name": "countTickets",
  "readOnly": true,
  "parameters": {
    "type": "object",
    "properties": {
      "status": {"type": "string", "enum": ["open", "pending", "closed"]},
      "priority": {"type": "string", "enum": ["low", "normal", "high"]}
    },
    "required": ["status", "priority"],
    "additionalProperties": false
  }
}
```

`additionalProperties: false` does real work. The mock's `smuggle_scope` variant emits `accountId: "org_globex"` alongside the two legal arguments, and that line refuses it before anything runs. Scope arrives from the session only:

```js
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
```

The tool takes scope as a separate first argument the model never produces and refuses to run without it:

```js
const fn = (scope, args) => {
  fn.calls++;
  if (remainingFailures > 0) { remainingFailures--; throw new TransientToolError('simulated transient error: ticket store unavailable'); }
  if (!scope || typeof scope.orgId !== 'string') throw new Error('scope.orgId missing: application bug, refuse to run unscoped');
  // Only the two whitelisted filters exist. There is no query string, no SQL, no field selection.
  const count = tickets.filter((t) => t.orgId === scope.orgId && t.status === args.status && t.priority === args.priority).length;
  return {count, filters: {status: args.status, priority: args.priority}, scope: {orgId: scope.orgId}};
};
```

When the `unknown_tool` variant asks for `runSql`, the validator answers `tool "runSql" is not offered` and the executor is never reached. Trace steps are keyed by an opaque request id, `req_` plus 12 hex characters. The mock copies the count verbatim from the tool result into its final sentence.

## The test that proves it

`node --test fixtures/ep06-prompt-to-answer/test.mjs` runs thirteen tests and reports `# tests 13  # pass 13  # fail 0` (local synthetic fixture). The names describe the contract:

- `tickets.json is the seeded dataset (regenerating with the same seed reproduces it)`
- `happy path: tool call -> validate -> scope -> execute -> result -> final answer with the real count`
- `validator: rejects unknown tool, bad enum, missing required, extra keys; accepts the good call`
- `model asks for a tool that was never offered (runSql): refused, no SQL path exists`
- `model supplies invalid arguments: refused before execution`
- `KNOWN-POSITIVE CONTROL: without scope enforcement a model-supplied accountId would change the count`
- `scope: a model-supplied accountId is rejected by the schema and, even if it got through, is stripped and ignored`
- `scope: the same question from a user in another org yields that org's count, never the global total`
- `no session: refused before any model call`
- `retry: one transient failure -> one bounded retry -> correct count`
- `failure: two transient failures -> honest failure message, no count, no fabricated number, model not asked to answer`
- `non-transient tool error is not retried`
- `trace contains no secrets or session identifiers`

Read the known-positive control first. It builds a naive scope resolver that trusts `args.accountId` and asserts the smuggled call returns org_globex's count, not org_acme's: 6 and 5 in `evidence.json` (local synthetic fixture). If they were equal, the scope tests would prove nothing. A guard you cannot watch fail is a guard you cannot trust.

The failure test asserts `countTickets.calls` is 2, `model.calls` is 1, and the answer matches no digit at all.

## The repair

This episode has no vulnerable variant to patch. The repair is the design, layered so no single layer has to be perfect.

Scope has three layers: the schema forbids extra keys, `stripScopeClaims` removes any `accountId`, `orgId`, `tenantId` or `userId` that would survive a more permissive schema, and the tool throws if called without an application-supplied `scope.orgId`. The scope test exercises each layer.

Execution has one bounded retry, `MAX_ATTEMPTS = 2`, and the code comment says why: the count is read-only and idempotent, so running it twice changes nothing. A non-transient error is not retried; a test locks that in. The fixture implements no state-changing tool, and the README states that retry safety for create, update or charge tools is a different problem needing idempotency keys or no automatic retry.

Failure is written by the application: after the second transient error, `app.mjs` emits a fixed message, records `fabricatedCount: false`, and returns without calling the model again.

## Retest

From `evidence.json`, written by `node demo.mjs` (local synthetic fixture), session `orgId: "org_acme"`:

- `happy`: ok, count 5, 12 trace steps, 2 model calls, 1 tool call. Answer: "There are 5 open high-priority support tickets in your organisation."
- `scope_probe` (model emits `accountId: "org_globex"`): ok false, `invalid_tool_call`, 5 steps, 1 model call, 0 tool calls.
- `retry` (one simulated transient error): ok, count 5, 15 steps, 2 model calls, 2 tool calls, one `retry.scheduled` step.
- `failure` (two simulated transient errors): ok false, `tool_unavailable`, count null, 12 steps, 1 model call, 2 tool calls. Answer: "I could not retrieve the ticket count right now: the ticket store did not respond. No count is available."

Open high-priority tickets by organization (local synthetic fixture): org_acme 5, org_globex 6, org_initech 2; 13 in all. The video shows 5 against 13.

`evidence.json` also carries `totalMsMeasuredInFixture` values: `process.hrtime` deltas around a mock and an in-memory filter, saying nothing about real model latency. The video does not show them.

## What this does not prove

- The model is a deterministic mock. Real models can return malformed, multiple or no tool calls, and can ignore tool results. Only the mock's variants (`unknown_tool`, `bad_args`, `smuggle_scope`) are exercised.
- No real model or network timings exist or are shown.
- No state-changing tools are implemented, so idempotency-key handling is described, not demonstrated.
- No streaming, concurrency, cancellation or rate limiting. The session is a plain object from the harness; episode three covers real sessions.
- One application design. Assistants with multiple tools, parallel calls or agent loops differ; this is not a claim about every AI request.

## Launch checklist

1. Every model tool call is validated against the offered tool list and a schema with `additionalProperties: false` before anything executes.
2. Data scope is resolved from the server-side session, never from model-supplied arguments, and the tool refuses to run without it.
3. Each tool is as narrow as the question it serves: no SQL, query language or field selection reachable from the model.
4. A known-positive control shows what trusting a model-supplied scope would return, on a dataset where the difference is observable.
5. Retries are bounded and allowed only for read-only, idempotent tools; state-changing tools get idempotency keys or no retry.
6. After a tool failure the application writes the failure message and does not give the model another turn.
7. Trace steps are linked by opaque request ids and a test asserts the trace holds no tokens or user ids.
8. Any simulated component is labeled as simulated wherever it appears.

## FAQ

**Does the AI model query the database directly in a tool-using assistant?**
Not in this design. The model returns a structured tool request with a name and arguments. The application validates it, attaches the data scope from the session, and runs a narrow read-only function. The model receives a structured result and never touches the data store.

**How do you stop an LLM from accessing another tenant's data via tool arguments?**
Keep scope out of the model-facing arguments entirely. Resolve it from the authenticated session, forbid extra keys in the schema, strip scope-like keys anyway, and make the tool refuse to run without an application-supplied scope. Test each layer and keep a control that shows the leak.

**What should an AI assistant do when a tool call fails?**
Retry once only if the tool is read-only and idempotent. If it still fails, the application should return a failure message with no number in it and not ask the model to answer, so no count can be fabricated. State-changing tools need idempotency keys before any retry.

## Watch the episode

[YouTube link]

- 00:00 The question and the answer: 5
- 00:11 The application assembles one tool
- 00:22 Simulated model response: a tool request
- 00:34 Validate against the schema
- 00:45 Scope from the session, never the model
- 00:59 The tool runs: narrow, read-only, no SQL
- 01:09 Structured result, one request id
- 01:18 Final answer: 5 of 13
- 01:27 Tool failure: one retry, honest message
- 01:38 The model requests. The application executes.

Related episodes: [Watch What Happens When You Click 'Sign In'](../../ep03/content/article-technical.md) and [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The model requests the tool. The application controls execution. Make the second sentence a test, not a hope.

Miz Causevic, Kinetic Gain LLC
