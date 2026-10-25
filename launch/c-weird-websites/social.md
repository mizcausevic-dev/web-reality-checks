# Social kit: Why Do Websites Do Weird Things?

Article: `article.md` (Medium). Claims below match the article. Every number comes from a local synthetic fixture, not a real product.

## (a) X announcement (≤280 chars)
Charged twice. The old page after an update. Someone else's name on your screen. A date one day off. A deleted record that still shows. Five website glitches, each explained with an everyday object. [Medium link] [YouTube playlist link]

## (b) LinkedIn post (≤1,300 chars, 3 hashtags)
You tapped Pay once, saw an error, tapped again, and got two orders. Nothing you did was wrong.

I made a short series of films about moments like this, and wrote a no-code article that explains five of them with everyday objects:

- Double charge: like a pizza order when the phone line drops. The server saved order 1, the reply was lost, and the retry looked new. With a ticket number on every attempt, two attempts gave one order in our fixture.
- Old page after an update: like a new manager waiting at the door while the old one finishes the shift.
- Someone else's name: like one welcome letter filed for every guest.
- A date a day early: a birthday is a calendar square, a flight is a moment. Mixing them showed January 14 in New York.
- Deleted but visible: like a library card left in the drawer after the book is gone.

Each one was rebuilt as a small pretend app with synthetic data, tested, repaired and tested again. This is not an audit of any real product, and each fix covers only the problem shown.

Article: [Medium link]
Repository: github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #Explainer #SoftwareQuality

## (c) X thread (7 posts, each ≤280 chars)
1. Why do websites do weird things? Because a website is a chain of helpers, and each one keeps its own copy of the truth. Five everyday glitches, explained with everyday objects. A thread. (1/7)
2. Charged twice. You tapped Pay once, the server saved the order, the reply got lost, the app retried. Like a pizza call that drops: you order again. In our test fixture, 2 attempts made 2 orders. (2/7)
3. The fix is a ticket number on every attempt. Same ticket, same order, so the retry returns the original confirmation. In the fixture: 2 attempts, 1 order. Greying out the button would not help, because the retry was not a double tap. (3/7)
4. The old page. A new version waits at the door, like a manager who cannot start until the old shift ends. Our model showed Build 2 installed and waiting while the open tab still showed Build 1. That is one cause of stale pages, not all. (4/7)
5. Someone else's name. One saved page was filed under /dashboard with no person in the label. Alice loaded it first, so Bob saw "Welcome back, Alice." Even a Cache-Control private, no-store header did not help, because the custom code never read it. (5/7)
6. A date a day off. A deadline is a calendar square. Read as midnight UTC and shown on New York's clock, 2026-01-15 became January 14. Kept as a date, it was January 15 everywhere. Deleted but visible: delete the record and its copies can remain. (6/7)
7. All five run as local synthetic fixtures with tests, so you can break them yourself. Not an audit of any real product. Read: [Medium link] Watch: [YouTube playlist link] Code: github.com/mizcausevic-dev/web-reality-checks (7/7)

## (d) Reddit / Hacker News
**Neutral title:** Why websites do weird things: five everyday glitches reproduced on a local fixture (double order, stale page, wrong name, date off by a day, deleted-but-visible)

**First comment (discloses authorship):** I'm the author. This is a plain-language article built on a series of short films, where each glitch is reproduced with a small synthetic fixture on loopback, has a known-positive control test, a minimal repair, and a retest. The fixtures use made-up data and are not findings about any real product. Code, tests and article sources are in the repository: github.com/mizcausevic-dev/web-reality-checks. Corrections welcome, especially on the Episode 12 service-worker part, which is a model of the lifecycle and not a captured browser run.

## (e) Five short-form hook lines
1. You tapped Pay once. Why are there two orders?
2. The server saved it. The reply got lost. The app asked again.
3. Bob saw "Welcome back, Alice." Both signed in correctly.
4. A deadline moved back a day. Nobody edited it.
5. You deleted it. Search still finds it.

## (f) Captions
- **Hero image:** Five everyday website glitches, each paired with an everyday object, from episodes 12, 15, 21, 22 and 24 of Web Reality Checks.
- **Diagram: chain of copies:** A website is a chain of helpers, and each keeps its own copy. This map shows where each of the five glitches lives.
- **Diagram: retry flow:** Same retry, different memory: without a ticket number two attempts made two orders, with one they made one (local synthetic fixture).
- **Diagram: date:** The same deadline read as a moment shows January 14 in New York; kept as a date it shows January 15 everywhere (local synthetic fixture).
- **Commercial (about a minute):** Why do websites do weird things? A one-minute look at five glitches, with real frames and real test numbers from the open repository.
- **Quiz:** Five questions about double charges, old pages, wrong names, dates and deleted data. Every answer comes from a test in the repository. Can you beat it?
