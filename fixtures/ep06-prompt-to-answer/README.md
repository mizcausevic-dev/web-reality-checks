# EP06 fixture — prompt → tool call → validated, scoped execution → answer

A local, dependency-free (Node 22, `node:test`) model of **one application design** for a tool-using assistant answering:

> "How many open support tickets are high priority?"

**No real model API is called.** `mock-model.mjs` is a deterministic stand-in that returns the observable *shape* of a tool-using model's output (a structured tool call, then a final text message). Everything it produces is a **SIMULATED MODEL RESPONSE**. It has no hidden reasoning and the fixture depicts none.

## Files
| file | role |
|---|---|
| `app.mjs` | the application: assembles messages + tool definitions, validates the tool call against `tool-schema.json` (tiny built-in validator), resolves data scope from the **session**, executes the tool with one bounded retry, returns the structured result to the model, produces the answer or an honest failure. Writes a trace keyed by opaque request ids. |
| `mock-model.mjs` | deterministic mock model; variants `unknown_tool`, `bad_args`, `smuggle_scope` exercise misbehaving output |
| `tools.mjs` | `generateTickets(seed)`, `makeCountTickets(...)` — a narrowly scoped read-only count. Two whitelisted filters. No SQL, no query language, no field selection. Scope is a **separate first argument** the model never produces. |
| `tickets.json` | seeded synthetic dataset (120 tickets, 3 orgs, seed `20260625`). Regenerable; a test asserts the file equals `generateTickets(SEED)`. |
| `tool-schema.json` | the single tool definition offered to the model (`additionalProperties: false`, enums only) |
| `test.mjs` | regression tests (13), incl. a known-positive control showing what a model-supplied `accountId` *would* do if trusted |
| `demo.mjs` | runs the four scenarios the video shows; writes `evidence.json` and `trace.json` |
| `evidence.json` | actual outputs (counts, reasons, step counts, measured-in-fixture ms) |
| `trace.json` | sanitized trace of all four runs: lane, event, opaque `requestId`; no tokens, no user ids |

## Run
```
cd fixtures/ep06-prompt-to-answer
node --test test.mjs
node demo.mjs
```

## Executed
```
# tests 13
# suites 0
# pass 13
# fail 0
```
`node demo.mjs`:
```
run           ok     count  reason               steps  toolCalls
happy         true   5      null                 12     1
scope_probe   false  null   'invalid_tool_call'  5      0
retry         true   5      null                 15     2
failure       false  null   'tool_unavailable'   12     2
org_acme open+high = 5 (all orgs: 13)
```

## Deliberate policies
- **Scope outside the model.** `resolveScope(session)` is the only source of `orgId`. The schema forbids extra keys, `stripScopeClaims` removes any `accountId/orgId/tenantId/userId` the model emits anyway, and the tool throws if called without an application-supplied scope. Three layers; the test exercises each.
- **Validate before execute.** Unknown tool name, wrong enum, missing required, extra keys → the call is refused and nothing runs (`toolCalls: 0`).
- **Read-only, narrow tool.** `countTickets` filters an in-memory array by two enum fields. There is no SQL path to expose.
- **One bounded retry, read-only only.** `MAX_ATTEMPTS = 2`. Retrying is safe here because the count is idempotent. **Retry safety differs for state-changing tools** (create/update/charge): a blind retry can duplicate the effect; those need idempotency keys or no automatic retry. This fixture does not implement any state-changing tool.
- **Honest failure.** After the retry fails the application answers with a message that contains **no digits** and does **not** call the model again, so no number can be invented. `fabricatedCount: false` is recorded in the trace.
- **Opaque request ids** (`req_` + 12 hex) link trace steps. The trace contains no session tokens or user ids (tested).

## Timings
`evidence.json` → `totalMsMeasuredInFixture` are `process.hrtime` deltas inside this process, **measured-in-fixture**: a mock model and an in-memory filter. They say nothing about real model latency and the video does not present them as such.

## Limitations / not tested
- Not a real model; real models may return malformed, multiple, or no tool calls, and may ignore tool results. Only the listed variants are exercised.
- No concurrency, streaming, cancellation, rate limits, or auth-token handling.
- No state-changing tools, therefore no idempotency-key design is demonstrated.
- The session is a plain object supplied by the harness; real session establishment is EP03's subject.
- One application design. Many assistants differ (multiple tools, parallel calls, agent loops); this fixture is not a claim about every AI request.
