SEO title (≤60 chars): Your AI Assistant Said "5." Who Decided That Was the Answer?
Meta description (≤155 chars): When an AI assistant answers from your data, the model is one part. Who checks the request, sets the data scope and handles failure? Five vendor questions.
Slug: prompt-to-answer
Primary keyword: AI assistant data security   Secondary keywords (3–5): AI vendor due diligence, LLM tool use risk, AI tenant isolation, AI assistant hallucinated numbers, buying AI software questions
Medium tags (5): Artificial Intelligence, Product Management, Startup, Leadership, Software Development

# What Happens Between Your Prompt and the Answer?

![Five lanes, user interface, application, model API, tool executor and data store, with the ticket store failing twice; the application returns an honest message with no count and the model lane is tagged SIMULATED MODEL RESPONSE](../hero.png)

## The symptom as a business event

A customer success lead asks your new AI assistant, "How many open support tickets are high priority?" It answers "5." She acts on it. In a second scenario, the same assistant answers "12" during a ticket-system outage, and nobody can find where twelve came from. In a third, a user at one customer gets a number that includes another customer's tickets.

None of these look like errors on screen. Each is a confident sentence with a number in it. The difference between the good case and the bad ones is not the model. It is the application around the model: whether it checks what the model asked for, decides whose data is in scope, and handles a failing data source.

This episode reproduces the good case on a local fixture and shows the guards that prevent the bad ones. The model is a deterministic stand-in, labeled "simulated model response" in every scene; the episode is about the application's job.

## Why a demo cannot show this

A demo shows a question going in and an answer coming out: the happy path, once, on the presenter's account, while the data source is healthy.

It cannot show whether the application checked the model's request, because that check is invisible when the request is well formed. It cannot show whether the data scope came from the session or from the model, because on the presenter's own account the two agree. And it cannot show what happens when the ticket system fails, because nobody breaks it during a demo.

The buyer's questions are "what stops it doing something it was not offered?", "what stops it counting another customer's data?" and "what does it say when it cannot get the data?" Those need deliberate tests; the fixture has one for each.

## The mechanism in plain terms

Think of a reception desk. A visitor asks the receptionist a question. She does not walk into the records room. She fills in a slip from a fixed form with two boxes, "status" and "priority," and hands it to a clerk. The clerk checks the slip: is this a form we accept, are the boxes filled with allowed values, is anything written in the margin? Then the clerk, not the receptionist, decides which filing cabinet to open, based on the visitor's badge. The clerk counts, writes the number on the slip, and hands it back. The receptionist reads it out.

The receptionist is the model, the clerk is the application, the filing cabinet is the ticket data. The model's only output is the slip, a structured tool call, `countTickets(status: open, priority: high)`. The application validates it against a schema; an unoffered form or an extra field is refused before anything runs. The application attaches the data scope, the organization, from the signed-in session. If the model writes an account id on the slip, the schema rejects it and a second layer strips it anyway. The counting function takes scope as a separate input the model never produces, filters by two allowed fields, and cannot run a database query.

The analogy holds where it matters: the receptionist never enters the records room. The model never touches the data store; the application decides which cabinet is open.

Failure follows the same logic. If the cabinet is jammed, the clerk tries once more, safe only because counting changes nothing. Still jammed, the clerk writes "no count available" rather than handing the slip back for a guess. In the fixture, after a second simulated failure the application returns a message with no number and does not call the model again (local synthetic fixture).

The fixture's numbers make scope concrete. The synthetic dataset holds 13 open high-priority tickets across three organizations. The signed-in user's organization has 5, and the assistant answers 5. A control test shows that trusting the model-supplied account id would have returned another organization's 6 (local synthetic fixture).

## What to ask your team or vendor

1. What checks the model's tool request before it runs? Ask to see the schema and the test that refuses an unknown tool or an extra field.
2. Where does the data scope come from? If the answer involves anything the model outputs, that is the finding. Scope should come from the signed-in session, with the tool refusing to run without it.
3. Can the model reach the database, run a query, or choose which fields to read? The fixture's answer is no on all three. Ask yours, tool by tool.
4. When a data source fails, does the model get another turn? If it does, a number can be invented. The fixture writes its own failure message and stops.
5. Which tools change data, and how are their retries handled? A retry on "count tickets" is harmless. A retry on "create order" or "charge card" can duplicate the effect. The fixture implements only a read-only tool and says so; a vendor with write tools should describe idempotency handling.

Vague answers mean the state of the product is "unknown," not "safe."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The first cost is wrong decisions made with confidence. A number produced during an outage, or from the wrong tenant's data, looks no different from a right one. People act on it, and the cost appears downstream with no visible link to the assistant.

The second cost is a tenant boundary failure, often a disclosure event with notification duties. The mechanism here, a model-supplied account id accepted as scope, is quiet: no failed login, no error, a normal-looking answer with someone else's count in it.

The third cost is trust. Once a team learns the assistant sometimes invents, every answer needs checking by hand, and it saves nobody time. An assistant that says "no count is available" when it cannot count keeps the trust that makes its other answers useful.

## FAQ

**Does the AI model read our database directly?**
In the design this episode shows, no. The model requests a named tool with structured arguments. The application checks the request, attaches the user's data scope from the session, and runs a narrow read-only function. The model receives the result and never touches the data store. Ask whether your vendor's design works this way.

**Can an AI assistant answer from another customer's data?**
It can if the application lets the model's output decide the data scope. The fixture shows the guard: scope comes from the signed-in session, the schema rejects a model-supplied account id, and a control test shows the wrong count that trusting it would produce (local synthetic fixture).

**Why did the assistant say "no count available" instead of giving a number?**
Because the data source failed twice and the application stopped there, without asking the model to answer. A number produced at that point would be invented. The honest message is designed behavior, not a bug, and a test asserts it contains no digits.

## Watch the episode

[YouTube link]

Related episodes: [Watch What Happens When You Click 'Sign In'](../../ep03/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The model requests the tool. The application controls execution. One application design, not every AI request; the question for any vendor is whether theirs holds the same line.

Miz Causevic, Kinetic Gain LLC
