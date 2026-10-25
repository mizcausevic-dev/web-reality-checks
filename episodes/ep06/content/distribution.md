# EP06 distribution kit: What Happens Between Your Prompt and the Answer?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep06-prompt-to-answer/` (evidence.json, test.mjs, README.md). The model in the fixture is a deterministic mock; every model output is a simulated model response.

## YouTube

### Title options (≤ 60 chars), ranked

1. `What Happens Between Your Prompt and the Answer?` (48) : the series title; names the gap the episode fills and reads as a question people search for.
2. `The Model Requests the Tool. Your App Runs It.` (46) : the closing thesis as a title; states the mechanism for engineers.
3. `Your AI Said "5." Here Is Every Step That Made It.` (50) : concrete number from the fixture; promises the trace the episode delivers.
4. `Who Decides Whose Data the AI Can Count?` (40) : leads with the scope question, the highest-stakes guard in the episode.
5. `When the Data Fails, the AI Should Not Guess` (44) : the failure scene as a hook; the honest-failure message is the most shareable moment.
6. `AI Tool Calling, Traced Lane by Lane` (36) : plain and searchable for the engineering audience; weaker as a hook.

### Description

You ask an AI assistant a question and get "5." The model is only one part of how that number was made. Here are the others.

In this episode we trace one question, "How many open support tickets are high priority?", through five lanes on a local fixture: user interface, application, model API, tool executor, data store. The model is a deterministic mock and is labeled "simulated model response" in every scene where it appears; no real model API was called.

The application, not the model, assembles the request and offers exactly one tool, countTickets(status, priority). The simulated model replies with a structured tool request, not an answer. The application validates it against a schema (an unknown tool or an extra key is refused before anything runs), resolves the data scope from the server-side session rather than from the model, and runs a narrow read-only count with no SQL path. The result returns to the model, which embeds it: 5. The synthetic dataset holds 13 open high-priority tickets across three organizations; this user sees only their own 5.

Then we replay with a failing ticket store. One bounded retry, safe only because counting is read-only; state-changing tools need different care. When the retry also fails, the application writes the failure message itself, with no number in it, and does not ask the model again. The regression suite runs 13 tests, 13 pass, including a known-positive control showing that trusting a model-supplied account id would return another organization's 6 instead of this user's 5.

One application design, not every AI request. No private model reasoning is depicted, only observable requests and responses.

Chapters
00:00 The question and the answer: 5
00:11 The application assembles messages and one tool
00:22 Simulated model response: a tool request, not an answer
00:34 Validate against the schema
00:45 Scope comes from the session, never the model
00:59 The tool runs: narrow, read-only, no SQL
01:09 Structured result returns, linked by one request id
01:18 Final answer: 5 of 13
01:27 Tool failure: one retry, then an honest message
01:38 The model requests the tool. The application controls execution.

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep06/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

ai tool calling, function calling, llm application architecture, ai assistant, tool use, schema validation, tenant isolation, data scope, ai security, prompt to answer, bounded retry, idempotent tool, honest failure, hallucinated numbers, node.js, simulated model, ai engineering, software architecture, web development, web reality checks

### Pinned comment (≤ 300 chars)

The model in this episode is a deterministic mock, labeled "simulated model response" in every scene; no real model API was called. The ticket data is synthetic. One application design, not a claim about every AI request. Fixture, 13 tests, trace: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The model said "5." The model never saw a ticket.

Episode 6 of Web Reality Checks traces one question through a tool-using assistant, lane by lane: UI, application, model API, tool executor, data store. The model is a deterministic mock, labeled simulated in every scene.

One tool offered: countTickets(status, priority), additionalProperties: false, enums only. Unknown tool, bad enum, missing or extra key: refused, zero tool calls. Scope comes from the server-side session in three layers: schema rejects a model-supplied accountId, a strip step drops it anyway, the tool throws without an application-supplied orgId.

Two things I would push on any team:

1. Keep a known-positive control. One of the 13 tests trusts args.accountId on purpose and asserts it returns org_globex's 6, not org_acme's 5. If the test cannot see the leak, the scope tests prove nothing.

2. After a tool failure, no second turn for the model. One retry (read-only, idempotent, so safe), then the application writes its own failure message, asserted to contain no digits.

13 tests, 13 pass (local synthetic fixture). One application design, not every AI request.

Video, fixture, trace: github.com/mizcausevic-dev/web-reality-checks

#AIEngineering #SoftwareArchitecture #LLM

### Post 2: non-technical leaders

Your AI assistant answered "5." Who decided that was the answer? Not the model.

Episode 6 of Web Reality Checks shows what sits between a question and an answer in an AI assistant that works from your data. The model is a simulated stand-in; the subject is the software around it.

A receptionist takes your question and fills in a slip from a fixed form. A clerk checks the slip, opens the cabinet matching your badge, counts, and hands the number back. The receptionist never enters the records room.

In the fixture, 13 matching tickets exist across three organizations; this user gets their own 5. A control test shows that trusting the model's account id would have returned another organization's 6 (synthetic data). When the data source fails twice, the application says "no count is available" and does not ask the model to answer.

Five questions for your team or vendor:
1. What checks the model's request before it runs?
2. Where does the data scope come from?
3. Can the model reach the database or run a query?
4. After a failure, does the model get another turn?
5. Which tools change data, and how are those retried?

Vague answers mean "unknown," not "safe."

Video, write-ups: github.com/mizcausevic-dev/web-reality-checks

#ArtificialIntelligence #ProductManagement #Leadership

## X/Twitter thread

1/ You ask an AI assistant "How many open support tickets are high priority?" It says "5." The model never saw a ticket. Episode 6 of Web Reality Checks traces every step between the question and the number, on a local fixture with a simulated model. Thread.

2/ Five lanes: user interface, application, model API, tool executor, data store. The application assembles the request and offers exactly one tool: countTickets(status, priority). Nothing else. The model's reply is a structured tool request, not an answer.

3/ The application validates the request against a schema. Unknown tool? Refused. Wrong enum? Refused. Extra key? Refused. In each case zero tools run. The mock's runSql variant never reaches anything, because no SQL path exists to reach.

4/ Scope, meaning whose tickets, comes from the server-side session. Never from the model. The schema rejects a model-supplied accountId, a strip step drops it anyway, and the tool throws if called without an application-supplied orgId. Three layers, each tested.

5/ The known-positive control: a naive resolver that trusts args.accountId returns org_globex's 6 instead of org_acme's 5. If that test could not see the difference, the scope tests would prove nothing. 13 matching tickets across 3 orgs; this user sees 5. (Synthetic fixture.)

6/ Replay with a failing ticket store. One bounded retry, safe only because counting is read-only and idempotent. Still failing? The application writes "no count is available" itself and does not call the model again. A test asserts the message has no digits.

7/ Limits: the model is a deterministic mock, labeled simulated in every scene. No real model or network timings shown. No state-changing tools, so idempotency keys are described, not demonstrated. One application design, not every AI request.

8/ The model requests the tool. The application controls execution. Fixture, 13 tests, sanitized trace, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A dependency-free Node fixture tracing one LLM tool call through validation, session-derived scope, a bounded retry and an honest failure, with a deterministic mock model

**First comment:** The model here is a deterministic mock, labeled "simulated model response" throughout; no real model API was called, and the fixture depicts no hidden reasoning, only the observable tool request and final message. The ticket dataset is seeded synthetic data (120 tickets, 3 orgs), and the 13 tests include a known-positive control showing that trusting a model-supplied accountId as scope would return another org's 6 instead of the session user's 5. This is one application design rather than a claim about every AI request, and the README lists what is not covered: real model behavior, timings, state-changing tools and idempotency keys, streaming and concurrency.

## Short-form hook lines (≤ 12 words)

1. The AI said "5." It never saw a ticket.
2. The model requests the tool. The application runs it.
3. Whose data? The session decides. Never the model.
4. Data source down? Say so. Do not guess a number.
5. 13 tickets exist. This user sees 5. That is the point.

## Alt text

**hero.png:** Five horizontal lanes labeled user interface, application, model API, tool executor and data store; the data store lane shows the ticket store failing twice, the application lane shows one bounded retry and then an honest failure message with no count, and the model API lane carries the tag "SIMULATED MODEL RESPONSE."

**thumbnail.png:** Episode thumbnail for "What Happens Between Your Prompt and the Answer?" showing a question entering on the left, the number 5 on the right, and a chain of five labeled steps between them with the model as only one link; the model step is marked simulated.
