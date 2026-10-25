SEO title (≤60 chars): Signed In Is Not the Same as Allowed: How Apps Leak Data
Meta description (≤155 chars): An app can know who you are and still show you someone else's files. A plain-language look at the one missing check behind a common kind of data leak.
Slug: ai-app-authorization
Primary keyword: how apps leak data   Secondary keywords (3–5): signed in vs allowed, app privacy, who can see my data, website security explained, authorization explained simply
Medium tags (5): Technology, Privacy, Security, Explainer, Software

# Your AI-Built App Works. Is It Safe to Launch?

![Alice is signed in, requests Bob's project 2002, and the vulnerable endpoint answers 200 OK with Bob's private data in the body](../hero.png)

Picture an apartment building with a doorman. He checks your ID, confirms you live there, and lets you into the lobby. Then you walk up to the fourth floor and try a door that is not yours. It opens. The doorman did his job. The locks did not do theirs.

That is the whole of this episode. An app can be very good at knowing who you are and still be careless about what you are allowed to see. Those are two different checks, and a lot of software only does the first one.

## What the episode shows

We built a small, deliberately flawed app on a laptop, with two made-up users, Alice and Bob. Each has one private project. Nothing here is real data, and nothing here is about a real product (local synthetic fixture).

Alice signs in. The app's "doorman," a piece of the server that tracks who is logged in, confirms it is her. She asks for her own project, number 1001, and the server hands it over with the code 200, which means "OK." Correct so far.

Then we do something no normal user would do by accident, but anyone could do on purpose: still signed in as Alice, we ask for project 2002, which belongs to Bob. The flawed version of the app hands that over too. Status 200. Bob's private notes in the response (local synthetic fixture). No alarm, no error, nothing on the screen that looks wrong.

Why? Because the server asked one question, "is someone signed in?", and never asked the second, "does this person own this thing?" The doorman waved Alice through, and every door upstairs was unlocked.

## The fix, in one sentence

Make every door check the key. In software terms: when the server goes to fetch a project, it should look for the project with that number that also belongs to the signed-in person. If there is no such match, say "not found." The fixed version does this. Alice asks for her project 1001: 200, here it is. Alice asks for Bob's project 2002: 404, not found (local synthetic fixture).

One more detail from the episode. The fixed app says "not found" both when a project does not exist and when it exists but belongs to someone else. That is on purpose. If it said "not found" for one and "not yours" for the other, a nosy visitor could tell which apartment numbers are occupied just by trying doors. Saying the same thing in both cases gives nothing away.

## Why the pretty interface does not help

The app in the episode looks finished. Every screen renders, every button works, the demo ends on "Demo complete." None of that touches the locks. The interface is the lobby: it is what you see, and it can be beautiful while the doors upstairs stand open.

It also does not help to hide things in the interface. The screen runs on your device, and anyone can edit what their own device sends. In the episode we tried exactly that: we sent along a fake note saying "I am Bob" and "I am an admin." The fixed server ignored it completely and still said 404, because it decides who you are from its own records, not from what your browser claims (local synthetic fixture).

## What this means for you

- When an app asks you to trust it with private information, the question is not whether it knows who you are at login. It is whether every single thing you can open has its own lock. You usually cannot see this from the outside, which is why it matters that the people who built it tested for it.
- If you ever notice that changing a number in a web address shows you someone else's information, that is this exact flaw. Stop, do not go further, and report it to the company. You have found an unlocked door, not a feature.
- If you build things, or pay people who do: ask whether there is a test where one user tries to open another user's data and gets refused. Not a promise, a test. In the episode that test exists and it passes, and a second test proves the flawed version really does leak, so the passing test means something.

## FAQ

**If I am logged in, is my data safe from other users?**
Not automatically. Logging in proves who you are. It does not by itself stop another logged-in user from requesting your records by their ID. That takes a separate check on the server for every type of record, and the app's maker has to have built and tested it.

**Why does the fixed app say "not found" instead of "you are not allowed"?**
Saying "not allowed" confirms the record exists and belongs to someone. Saying "not found" for both missing and off-limits records means a curious user cannot map out what exists by guessing numbers. It is a deliberate choice, and the episode's tests enforce it.

**Can a good-looking, smoothly working app still have this problem?**
Yes. The interface runs in your browser and cannot enforce anything. The missing check in this episode lives on the server, where you cannot see it, and the app worked perfectly for every normal action right up until someone asked for the wrong record.

## Watch the episode

[YouTube link]

Related episodes: [Watch What Happens When You Click 'Sign In'](../../ep03/content/article-technical.md) and [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The doorman knowing your name was never the point. The locks were. A working interface is not an authorization test.

Miz Causevic, Kinetic Gain LLC
