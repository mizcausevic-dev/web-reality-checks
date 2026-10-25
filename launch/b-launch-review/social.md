# Social copy: Package B (The launch review your demo never shows)

Placeholders: `[Medium link]`, `[YouTube playlist link]`. Repository: https://github.com/mizcausevic-dev/web-reality-checks

## (a) X announcement (≤280 chars)

Your demo passed. A launch review asks what it can't show: whose data is this, did it run twice, how old is "Live"? Ten questions for founders, PMs and buyers, each tied to a runnable test. Not an audit. [Medium link]

## (b) LinkedIn post (≤1,300 chars, ≤3 hashtags)

A demo shows one person doing everything right. It can't show what happens when a customer asks for someone else's record, a payment confirmation gets lost, or a dashboard says "Live" over ten-minute-old data.

I wrote a ten-question launch review checklist for founders, product managers and buyers, built on Web Reality Checks, my open series of short films where each failure is reproduced on a synthetic local fixture with regression tests.

Examples from the fixtures:
- A signed-in user asked for another user's project. The flawed version answered 200 with the data. The repaired one answered 404.
- Click Pay once, lose the response, retry: two orders. With an idempotency key: one.
- 19 polls, every one labeled Live, while the reading climbed to 570 seconds old.

The article also gives a simple evidence ladder (seen in a demo, described, test exists, test can fail, retested after repair) and a hold / go-with-named-risk / go decision rule.

To be clear about scope: this is not an audit or a certification, and the fixtures are synthetic. It is a way to ask for evidence instead of reassurance.

Article: [Medium link]
Repository: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SoftwareDevelopment #Startups

## (c) X thread (7 posts, each ≤280 chars)

1/ A product demo proves the happy path. It can't show what happens when a customer asks for someone else's data, a retry runs twice, or "Live" is ten minutes old. Here are ten launch review questions, each backed by a runnable test.

2/ How the series tests a claim: Flaw, Control, Repair, Retest. Reproduce the failure on a synthetic fixture. Prove the test can fail. Apply the smallest repair. Run the same test again with real numbers.

3/ Question 1: can one customer read another's data? In the fixture, a signed-in Alice asked for Bob's project. Flawed endpoint: 200 with Bob's notes. Repaired: 404. One missing ownership condition in one lookup.

4/ Question 3: if a request is retried, what runs twice? Pay once, lose the response, retry. Flawed: 2 attempts, 2 orders. With an idempotency key: 2 attempts, 1 order. A changed quantity on the same key was refused (422).

5/ Question 8: how old is the data behind "Live"? Fixture result: 19 polls, all succeeded, every label said Live, and the reading climbed to 570 seconds old. The label tracked the page refresh, not the measurement.

6/ The decision rule: a demo-only answer is still unanswered. Hold if identity, money or customer data sits on "seen in a demo". Go with a named risk if a test exists. Go for the tested scope if the test can fail and was retested.

7/ Not an audit, not a certification, synthetic data only, and each repair covers the demonstrated path only. The ten questions, diagrams and fixtures: [Medium link] and github.com/mizcausevic-dev/web-reality-checks

## (d) Reddit / Hacker News

**Title (neutral):** A ten-question launch review checklist with runnable fixtures (retries, ownership checks, stale data)

**First comment:** I'm the author. This is my open project, Web Reality Checks: short films where each web failure is reproduced on a synthetic local fixture with regression tests, and the article turns them into ten questions a non-engineer can ask a team or vendor. The fixtures are deliberately constructed and nothing in it is a finding about a real product; it is not an audit or certification. Repo: https://github.com/mizcausevic-dev/web-reality-checks. Corrections to any fixture or claim welcome.

## (e) Five short-form hook lines

1. Your demo passed. Here's what it never tested.
2. Click Pay once. Two orders. Why?
3. The label said Live. The data was ten minutes old.
4. A hidden button is not a locked door.
5. Ask for the test that can fail.

## (f) Captions

- **Hero image:** Your demo shows the happy path. A launch review asks about trust, duplicates, data copies, freshness and speed. Ten questions, five arcs.
- **Diagram: review map:** Ten launch questions in five arcs, each tied to the episodes whose fixtures and tests back it.
- **Diagram: evidence ladder:** Five rungs from "seen in a demo" to "retested after repair", and what each rung lets you decide: hold, go with a named risk, or go for the tested scope.
- **Diagram: Episode 15 loop:** Flaw, Control, Repair, Retest with a real episode filled in: two attempts, two orders, then two attempts, one order (synthetic fixture).
- **Commercial:** "The launch review your demo never shows." Sixty-odd seconds, real frames from the episodes, real numbers from the fixtures. Not an audit.
- **Quiz:** Five questions from the launch review, each answerable from a test result in the repository. Six seconds to think. No engineering degree needed.
