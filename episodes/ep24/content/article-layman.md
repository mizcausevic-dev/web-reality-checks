SEO title (≤60 chars): Why a Website Showed Me Someone Else's Name
Meta description (≤155 chars): You log in and the page greets a stranger by name. A plain-language look at how a shared shortcut called a cache can hand one person's page to another.
Slug: shared-cache-leak
Primary keyword: website showed someone else's name   Secondary keywords (3–5): what is a cache, why did I see another user's account, website privacy explained, cache explained simply
Medium tags (5): Technology, Privacy, Security, Explainer, Software

# Why Did This Dashboard Show Someone Else's Name?

![Bob is signed in as Bob, loads /dashboard, and the response reads "Welcome back, Alice" with Alice's email, served from a cache HIT](../hero.png)

Imagine a coat check where the ticket only says which cloakroom the coat is in, not whose coat it is. You hand in your red coat and get a ticket reading "Cloakroom." Ten minutes later a stranger arrives with a ticket reading "Cloakroom," and the attendant hands over yours.

Nobody stole anything. The attendant followed the procedure, and the procedure was the problem. This episode shows the same thing on a website.

## What the episode shows

We built a small app on a laptop with two made-up users, Alice and Bob. Nothing here is real data or about a real company (local synthetic fixture).

Alice signs in and opens her dashboard. It says "Welcome back, Alice." Normal so far.

Then Bob signs in with his own account and opens the same page. It says "Welcome back, Alice." Bob also receives Alice's email address, and the page carries the same render number as Alice's, which tells us it was not made for him. It was a leftover copy of hers.

Bob's login was fine. The app knew he was Bob. Checking who he was happened first, worked, and still did not help.

## The shortcut behind it

Building every page from scratch for every visitor is slow, so many sites keep a copy of recent pages and hand it out again. That stored copy is a cache, the coat room in our story.

For a cache to work, it needs a label for each stored copy. In our app, the label was the page address: `/dashboard`. Alice's visit built her page and stored it under that label. Bob's visit asked for the same address, found a copy waiting, and got it. Nobody built a page for Bob.

The label should have said whose page it was, or the app should have refused to store a page personal to one person. It did neither.

To be clear about scope: this cache was written into the app itself and flawed on purpose. We are not saying the delivery networks big sites use behave this way.

## Why a setting did not save it

A natural idea: add a note to the page that says "private, do not store." Web pages can carry exactly that kind of note, and we tried it. Bob still got Alice's page.

Writing "private coat" on the ticket does nothing if the attendant never reads it. The note was correct. The thing handling the page never looked at it.

## The fix

We took personal pages out of the shared coat room. For every visit, the app checks who you are, checks you may see the dashboard, builds a fresh page for you, and sends the "do not keep" note. It also threw away the old leftover copy with Alice's name on it.

Then we tested: Alice, Bob, Alice, Bob, each with a separate sign-in. All four got a page built just for them, with its own render number (local synthetic fixture).

## What the fix does not do

Two limits. The fix only changes what happens from now on: Bob already received Alice's page, and nothing the app does afterward can take that back. And we repaired one page; any other personal page using the same shortcut needs the same check. Our test used separate sign-ins, not real browsers.

## What this means for you

- **A correct login is not proof you are seeing your own page.** The front-door check and the page you are handed come from different parts of the system.
- **If a site ever shows you someone else's details, report it and screenshot it.** Do not assume a refresh that fixed it means it was a one-off. The company needs to know, and the person whose data you saw may need to be told.
- **If you run or buy software, ask what is saved and reused between users.** When two different people ask for the same page, how does the system know they should get different answers?

## FAQ

**What is a cache?**
A saved copy a system reuses to avoid repeating work. Most are harmless. The trouble starts when a copy that belongs to one person is handed to another because its label was too general.

**Does this mean big websites show me other people's pages?**
No. This episode used a deliberately flawed cache built for demonstration, with made-up users. It does not say any real site works this way or that the delivery networks big sites use behave like this.

**Why couldn't the company just undo it afterward?**
Fixing the cache changes future pages only. A page already sent has already arrived on someone's screen. In our test, the leaked page was still sitting in Bob's copy of the history after the repair.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [I Deleted the Record. Why Is It Still Showing Up?](../../ep21/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A cache label decides which people are treated as the same person. Make sure the label knows who is asking.

Miz Causevic, Kinetic Gain LLC
