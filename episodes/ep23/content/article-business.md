SEO title (≤60 chars): Two People Saved the Same Page. One Edit Vanished.
Meta description (≤155 chars): Your app says "saved" and still loses a teammate's work. Why demos hide it, how the failure works, five questions to ask your team or vendor.
Slug: lost-updates-shared-documents
Primary keyword: lost update in shared documents   Secondary keywords (3–5): overwritten changes, concurrent editing conflicts, software vendor questions, data loss without errors, save conflict handling
Medium tags (5): Product Management, Startup, Software Development, Leadership, User Experience

# Two Tabs. One Document. Where Did My Changes Go?

![Two people load the same document at version 1; the second save, built from an out-of-date copy, brings back the old title with a 200 OK](../hero.png)

## The symptom as a business event

A customer writes to support: "I updated the launch plan and now it shows the old title. The app told me it saved." Your team checks the logs. Every request succeeded. No error, no failed job, no alert. The change is gone, and the system has no record that anything went wrong.

This episode reproduces that event on a local fixture with synthetic data. Two people open the same document at version 1. The first changes the title and saves: the server answers 200 OK. The second changes only the body and saves. The server answers 200 OK again, and the old title is back (local synthetic fixture). The title reads "Launch plan" again and the first person's work is erased. Neither person saw a warning.

## Why a demo cannot show this

A demo has one presenter. One person opens a document, edits it, saves it, and sees the result. Every step works, because nobody else's copy can go out of date.

The failure needs two people holding the same starting version, with the second save arriving after the first. No screen has a button for that. You have to stage it with two independent sessions, which is what the fixture does. The two "tabs" are two separate client programs with their own sign-ins and local copies. No real browser was used, and the video says so.

The logs will not help either. Each save was a valid request, processed correctly. The bug is in the combination, not in either request.

## The mechanism in plain terms

When you open a document, your screen holds a copy. When you press save, most apps send the entire document back, not just the part you changed. So the second person's save carried the old title along with the new body, and the server, which only asked whether the document ID matched, replaced everything. Last writer wins.

An analogy: a team shares one planning binder. Two people photocopy page 1 at the same time. One rewrites the heading and files the page. The other adds a paragraph to their photocopy, with the old heading still on it, and files that page over the top. The clerk accepted both because the clerk only checked the page number.

The repair gives the clerk one more question. Every copy is stamped with the revision it came from, and the clerk accepts a filing only if the stamp matches the revision now in the binder. In the same motion, the clerk replaces the page and bumps the revision. The second person arrives with revision 1 while the binder is at revision 2, so the filing is refused and the person is shown what is in the binder.

The fixture does exactly this (local synthetic fixture). The first save sends the version it loaded, 1, and succeeds, moving the document to version 2. The second save also sends 1, matches nothing, and receives a 409 conflict response with the current version, 2. The server keeps the first person's title. The second person's unsaved text stays on their screen, both versions are shown, and a person decides. A person-chosen merge of the first title and the second body then saved as version 3.

The analogy has one limit: a clerk could glance at the revision, look away, and then file. The repair works only because the check and the replacement are one action. The fixture uses a single database statement, and its tests release two same-version saves together. Exactly one is accepted.

## What to ask your team or vendor

1. **If two people edit the same record and both press save, what happens?** A good answer: the second save is rejected with a visible conflict. "Last one wins" is the failure above.
2. **Does every save say which version it was based on?** Without that, the server cannot tell a current edit from a stale one.
3. **Is the version check and the write one atomic step, or two?** A check followed by a separate write can still let two saves through. Ask for a test with both saves in flight together.
4. **What does the user see on a conflict?** The fixture keeps their unsaved text, shows both versions, and lets them choose. It never retries by overwriting and never merges silently.
5. **Is a busy database reported as a conflict?** It should not be. In the fixture a locked database returns 503, a retryable failure, and the server stays at its previous version. Only a version mismatch is a 409.

If the product markets itself as collaborative, ask whether it merges edits live or only detects conflicts. The fixture detects conflicts. It is not real-time collaboration, and it is not a CRDT.

## What it costs if ignored

Qualitatively: lost work that no one can trace. Support finds no fault because the logs show none. Users learn that "saved" does not mean saved, and start copying text elsewhere before every save, or stop trusting shared documents.

The damage lands on records several people touch, like plans, prices, configuration and approvals. Because nothing is logged, you may not learn how often it happens until a customer tells you.

## FAQ

**Why did my app say "saved" if my changes were lost?**
Because the request itself succeeded. The server accepted a complete copy of the document and wrote it without checking whether that copy was based on the latest version. The message is accurate about the request and silent about what it replaced.

**Does a conflict message mean the software is broken?**
No. It means the check is working. The system stopped the second save instead of erasing the first, which is the intended outcome, provided the user's unsaved text is kept.

**Can the system merge both people's edits automatically?**
Not in this design. The fixture detects the conflict and hands the decision to a person. Automatic merging is a separate, larger capability, and this episode does not claim to provide it.

## Watch the episode

[YouTube link]

00:00 Tab A saves, tab B undoes it
00:10 Rewind: two clients load version 1
00:18 A edits the title, B edits the body
00:27 The flawed update: last writer wins
00:39 The repair: expectedVersion and one atomic UPDATE
00:53 Retest: 200 for A, 409 for B
01:04 Compare: a person resolves the conflict
01:15 Limits: 409 vs 503, one winner, not a CRDT
01:32 Before saving, check what you are replacing

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Webhook Arrived Twice. Then an Older Update Arrived.](../../ep18/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

"Saved" should mean the system checked what it was replacing. Ask your team to show you the test where two people save at once.

Miz Causevic, Kinetic Gain LLC
