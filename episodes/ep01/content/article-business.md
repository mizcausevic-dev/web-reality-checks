SEO title (≤60 chars): Your App Passed the Demo. Can It Keep Customers' Data Apart?
Meta description (≤155 chars): A polished demo cannot show whether your app keeps one customer's data from another. What the failure looks like, why demos miss it, five questions to ask.
Slug: ai-app-authorization
Primary keyword: app security before launch   Secondary keywords (3–5): data access control, authorization vs authentication, software launch review, vendor security questions, AI-built app risk
Medium tags (5): Startup, Product Management, Cybersecurity, Software Development, Leadership

# Your AI-Built App Works. Is It Safe to Launch?

![Alice is signed in, requests Bob's project 2002, and the vulnerable endpoint answers 200 OK with Bob's private data in the body](../hero.png)

## The symptom as a business event

The app shipped. Customers sign in, create projects, and see their work. Three weeks later a customer writes in: "I changed one number in the address bar and I can see another company's roadmap." There was no breach alert, no failed login, no error in any dashboard. The system did exactly what it was built to do, and what it was built to do was wrong.

That is the event this episode reproduces on a local fixture with two synthetic users, Alice and Bob. Alice signs in, asks for her own project, and gets it. Still signed in as Alice, we ask for Bob's project. The vulnerable version of the app returns it, status 200 OK, Bob's private notes included (local synthetic fixture). The fixed version returns 404 for the same request. The difference between the two versions is one missing condition in one database lookup.

## Why a demo cannot show this

A demo is a tour of the happy path. The presenter signs in as one user and shows that user's data. Everything renders. Everything is fast. Every screen says finished. The failure in this episode only appears when a signed-in user asks for an object that belongs to someone else, and no demo includes that step, because no interface offers a button for it. You have to construct the request on purpose.

So the demo is not lying. It is answering a different question. "Does the app work for a user looking at her own data?" is a question a demo can answer. "Does the server refuse a user looking at someone else's data?" is a question only a deliberate test can answer. If nobody on your team has written that test, nobody knows.

This matters more, not less, when a team builds quickly with AI assistance. Speed makes the interface look finished sooner. It does nothing to the second question. To be clear about scope: the vulnerability in this fixture was written by hand to show the mechanism. This is not a finding about any AI tool or any real product.

## The mechanism in plain terms

Think of a hotel where the front desk checks your ID and hands you a key card. That is authentication: the hotel knows who you are. Now imagine the key card opens every room in the building. The hotel did check your identity. It never checked which room is yours. That second check is authorization, and it has to happen at every door, not once at the front desk.

In the fixture, the server has four layers: the browser, a session that records who signed in, the API that answers requests, and the database holding every project. The vulnerable endpoint checks the session (is a user signed in?) and then fetches the project by its ID number alone. Alice is signed in, so the server assumes she may have whatever ID she asked for. The repair adds the second check inside the lookup itself: fetch the project whose ID matches and whose owner is the signed-in user. If there is no such row, the server says "not found," and it says the same thing whether the project does not exist or belongs to someone else, so a curious user cannot learn which IDs are real.

The analogy holds because the two checks really are separate systems in software, just as the front desk and the door lock are separate systems in a hotel. A perfect front desk does not fix a lock that accepts every card.

## What to ask your team or vendor

1. For every kind of record a user can view, edit, list, delete or export, is there a test where user A requests user B's record and the server refuses? Ask to see the test, not a description of it.
2. Does the server decide who the user is from its own session or token, or does it trust a user ID the browser sends? Anything the browser sends can be changed by the person using it.
3. When the server looks up a record, is the owner check part of the query itself, or is it applied afterward in code? Afterward works until the one place someone forgets it.
4. Is there a deliberately broken version that the tests catch? In this fixture that is called a known-positive control. Without one, a passing test might be passing for the wrong reason.
5. When a user requests a record they may not see, what does the server return, and is that policy written down? The fixture returns 404 in both the "does not exist" and "not yours" cases, on purpose, and a test enforces it.

If the answers are vague, the honest state of your product is "unknown," not "secure."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is disclosure. Depending on jurisdiction and the kind of data exposed, you may owe notifications to affected customers and regulators, and the clock often starts at discovery, not at repair.

The indirect cost is trust in a category where trust is the product. A customer who learns that a stranger could read their roadmap by editing a URL does not weigh the elegance of your interface. They weigh whether to stay. Procurement teams at larger buyers will ask the five questions above in some form, and "we fixed it after a customer found it" is a worse answer than "we tested for it before launch."

The quiet cost is engineering time spent on the same bug in every endpoint. The fixture repairs one read path. Lists, writes, exports and admin paths each need the same check. A team that discovers the pattern in production tends to discover it one endpoint at a time.

## FAQ

**Is an app that passed QA safe from this?**
Not by default. QA usually confirms that features work for a user acting on their own data. The failure here only appears when a signed-in user requests another user's data, which needs a deliberate test per endpoint. Ask whether that test exists.

**Does using an AI coding tool make this more likely?**
This episode makes no claim either way; the fixture's flaw was written by hand. What is true is that faster interface delivery does not change the need for a server-side ownership test on every data path, however the code was produced.

**Can we just hide the other users' data in the interface?**
No. The interface runs in the user's browser, where anything can be edited. In the fixture, sending a fake user ID and an "admin" role from the client changed nothing, because the server never read them. Enforcement has to be on the server.

## Watch the episode

[YouTube link]

Related episodes: [Watch What Happens When You Click 'Sign In'](../../ep03/content/article-technical.md) and [That API Key Is in Your JavaScript. Is That Always a Leak?](../../ep13/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A working interface is not an authorization test. Before launch, ask who wrote the test that requests the wrong user's data, and ask to see it fail on purpose at least once.

Miz Causevic, Kinetic Gain LLC
