# Social copy: A. Engineers and AI-assisted builders

Article: `article.md` ("Break It on Purpose: Known-Positive Controls for Web Bugs"). Links in posts are placeholders until publishing: `[article link]`, `[YouTube playlist link]`. Repository: github.com/mizcausevic-dev/web-reality-checks

## (a) X announcement (single post)

A passing test only means something if it could have failed. A known-positive control proves yours can: run the scenario on the flawed code, require the bug, then repair and retest. Three runnable Node fixtures. [article link]

## (b) LinkedIn post

A passing test only means something if the same test could have failed.

That is the idea behind a known-positive control: keep the flawed variant of the code, write a test that requires the bug to show up, and only then trust the test that passes on the repaired code.

I wrote up how I use it in Web Reality Checks, an open repository of short narrated films, each backed by a local fixture with regression tests. Three examples from three different areas:

1. One tap on Pay creates two orders. The response is lost after the commit, the client retries, and the server counts the retry as new. The repair is an idempotency key with a UNIQUE constraint and one transaction. Two attempts, two orders before; two attempts, one order after.
2. A working interface leaks. Alice requests Bob's project and gets a 200 before the repair, a 404 after.
3. A dashboard says Live while the measurement is ten simulated minutes old.

Every fixture runs with node --test. The article also covers forking a fixture for your stack and reviewing AI-generated patches with the same checklist.

Fixtures are synthetic and local. Nothing here is a finding about a real product.

[article link]

#SoftwareTesting #NodeJS #WebDevelopment

## (c) X thread (7 posts)

1. A passing test only means something if the same test could have failed. Here is a method for proving that, with three runnable fixtures. Thread. [article link]

2. The idea: a known-positive control. Keep the flawed code next to the fix. Write a test that runs your scenario on the flaw and requires the bug to appear. Only then does the passing test on the fix carry weight.

3. Why it matters: fix tests assert good outcomes, and those pass for many wrong reasons. The scenario never reached the code path, the seed data hid the bug, the harness swallowed an error.

4. Episode 15: the response is lost after the commit, the client retries, the server counts the retry as new. Control: two attempts, two orders on the flawed endpoint. After an idempotency key plus UNIQUE constraint: two attempts, one order. 13 of 13 tests pass.

5. Episode 1: Alice asks for Bob's project. The vulnerable endpoint returns 200, the repaired one 404, and spoofed user-id claims change nothing. Same method, different control. The repair covers that one read path only.

6. Try it: delete the UNIQUE line from the ep15 schema in a scratch copy. In my run 12 of 13 tests still passed. The one that failed was the test written to skip the pre-read and expose the missing constraint.

7. Run any fixture with node --test. Fork one for your stack, and ask your AI assistant for the flawed variant and a control before you accept its fix. Local synthetic fixtures, no real products. github.com/mizcausevic-dev/web-reality-checks

## (d) Reddit / Hacker News

**Title:** Break it on purpose: using known-positive controls to test that bug-fix tests can fail

**First comment (author disclosure):**

I'm the author. This is a write-up of the method behind Web Reality Checks, an open repository of local fixtures with regression tests (Node, no framework), each with a flawed variant, a test that requires the bug to show up, a repair and a retest. It walks through three fixtures (lost-response duplicate orders, an ownership check, a stale "Live" label); all data is synthetic and the flawed endpoints are never meant to be deployed. Critique of the method, or of where the fixtures oversimplify, is welcome: the README of each fixture lists what it does not test.

## (e) Short-form hook lines (each 12 words or fewer)

1. Your fix test passes. Could it ever have failed?
2. One tap on Pay. Two orders. Here is the test.
3. Delete one constraint. Twelve of thirteen tests still pass.
4. Ask your AI assistant for the bug, not just the fix.
5. A green test proves nothing until you have seen it red.

## (f) Captions

**Hero image (`images/hero.png`):** Break it on purpose: node --test output from episode 15, with the known-positive control line highlighted. "The flaw must be observable or the fix test proves nothing."

**Diagram 1 (`images/diagram-loop.png`):** The Flaw, Control, Repair, Retest loop with episode 15 filled in: two attempts make two orders, then one order after the repair, and 13 of 13 tests pass.

**Diagram 2 (`images/diagram-request-flow.png`):** Request flow from the episode 15 fixture: commit, a deliberately lost response, and a retry answered from the stored record. The guarantee lives in a UNIQUE constraint, not an if statement.

**Diagram 3 (`images/diagram-three-arcs.png`):** One method, three arcs: each episode has a different control and the same question. Numbers come from the fixtures' evidence.json files.

**Commercial (cm01):** A 60 second trailer: real frames from episodes 1 and 15, the four-move method, and the real before and after numbers. The repository is linked below.

**Quiz (qz01):** Five questions answerable from the fixtures: query counts, idempotency keys, 409 versus 503, a spoofed identity, and stale data. Pause for the countdown, then check the evidence file.
