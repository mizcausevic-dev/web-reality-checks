# EP 06 — What Happens Between Your Prompt and the Answer?

**Central idea.** In a tool-using assistant the model only *requests* a tool; the application validates the request, decides the data scope, executes a narrow read-only function, and controls retries and failure messages. Observable steps only; no private reasoning depicted.

## What this fixture is
- `fixtures/ep06-prompt-to-answer/` — a dependency-free Node 22 application (`app.mjs`) answering "How many open support tickets are high priority?" against a seeded synthetic dataset (`tickets.json`, 120 tickets, 3 orgs, seed 20260625).
- **The model is a deterministic mock** (`mock-model.mjs`). No real model API was called or authorised. Every model scene carries the persistent tag `SIMULATED MODEL RESPONSE`.
- One tool is offered, `countTickets(status, priority)`, defined in `tool-schema.json` (`additionalProperties: false`, enum values only). The application validates the model's tool call with a tiny built-in JSON-schema validator before anything executes.
- Data scope (`orgId`) is resolved from the server-side session, never from the model: the schema rejects a model-supplied `accountId`, `stripScopeClaims` ignores scope-like keys regardless, and the tool refuses to run without an application-supplied scope.
- The tool is a two-filter in-memory count. There is no SQL or query-language path.
- Retry policy: one bounded retry on a simulated transient error, **only** because the tool is read-only and idempotent. After the retry fails the application returns a failure message with no count and does not ask the model again, so no number can be fabricated.
- Opaque request ids (`req_` + 12 hex) link every trace step; the trace holds no tokens or user ids (tested).
- This is **one application design**, not a description of every AI request.

## Evidence
- Executed: `node --test fixtures/ep06-prompt-to-answer/test.mjs` → `# tests 13  # pass 13  # fail 0` (includes a known-positive control: trusting a model-supplied `accountId` as scope would return org_globex's 6 instead of org_acme's 5).
- Executed: `node fixtures/ep06-prompt-to-answer/demo.mjs` → `evidence.json` + `trace.json`:
  - `happy`: ok, **count 5**, 12 trace steps, 2 model calls, 1 tool call; answer "There are 5 open high-priority support tickets in your organisation."
  - `scope_probe` (model emits `accountId: "org_globex"`): refused, `invalid_tool_call`, 0 tool calls.
  - `retry` (1 simulated transient error): ok, count 5, 2 tool calls, one `retry.scheduled` step.
  - `failure` (2 simulated transient errors): ok false, `tool_unavailable`, count null, 2 tool calls, 1 model call, answer contains no digits.
  - Dataset: open+high by org — org_acme 5, org_globex 6, org_initech 2; 13 across all orgs. The video shows 5 vs 13.
- Measured-in-fixture: `totalMsMeasuredInFixture` values in `evidence.json` are `process.hrtime` deltas around a local mock and an in-memory filter (about 0.07–1.1 ms). They are **not** shown in the video and say nothing about real model latency.
- Verified: `cd video && npx tsc --noEmit` reports no errors in `src/episodes/ep06/*`. All ten scene components server-render at t = 0…9 s with no element below y = 920.
- Not executed: narration audio, render, thumbnail — the orchestrator does these and fills `render-evidence.json`. `video/src/episodes/ep06/timeline.json` was generated with `--no-audio` for type-checking only and should be regenerated from the real narration.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep06    # from narration audio in video/public/ep06/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep06 --concurrency 2
```

## Limitations
- Simulated model throughout. Real models can return malformed, multiple, or no tool calls, or ignore tool results; only the mock's variants (`unknown_tool`, `bad_args`, `smuggle_scope`) are exercised.
- No measured model or network timings exist and none are shown.
- No state-changing tools are implemented, so idempotency-key handling is described, not demonstrated. Retry safety for create/update/charge tools differs and is stated in narration, on screen, and in the fixture README.
- No streaming, concurrency, cancellation, rate limiting, or real session establishment (EP03 covers sessions).
- The assistant window in scene 1 is an illustrative `Box`, not a real product UI.
- Scene boundaries from `build-timeline.mjs` are a word-count/silence heuristic, not forced alignment.
