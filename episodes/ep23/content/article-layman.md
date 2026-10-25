SEO title (≤60 chars): Why Your Saved Changes Vanished When Someone Else Saved
Meta description (≤155 chars): You hit save, the app said OK, and your edit was gone. A plain-language look at how two people saving the same document can erase work, and the fix.
Slug: why-saved-changes-disappear
Primary keyword: why did my changes disappear   Secondary keywords (3–5): saved changes lost, two people editing same document, overwritten edits, version conflict explained, shared document lost work
Medium tags (5): Technology, Explainer, Productivity, Software, User Experience

# Two Tabs. One Document. Where Did My Changes Go?

![Two people open the same document at version 1; the second save restores the old title and the app still says OK](../hero.png)

Picture a recipe card pinned in a shared kitchen. Two cousins each copy it into a notebook. One writes a new oven temperature. The other adds an ingredient and keeps the old temperature, because they never touched that line. Each then pins their own version over the card. Whoever pins last wins, and the new temperature is gone. Nobody lied or made a mistake. The card never asked what it was replacing.

Many apps behave this way when two people save the same document. This episode reproduces it on a small test program with made-up users and data, then shows the fix.

## What the episode shows

Two separate "tabs" open the same document, "Launch plan", at version 1. They are not real browser tabs but two independent pieces of test software, each with its own sign-in and copy (local synthetic fixture).

The first changes the title and saves. The server answers 200, which means OK. The second changes only the body and saves, but saving sends the whole document, old title included. The server answers 200 again. The title is back to "Launch plan" and the first change is gone. No error appeared anywhere.

Why? The server asked one question: does a document with this ID exist? Yes, so it wrote whatever it was handed, without asking which version the second person had been looking at.

## The fix: put an edition number on the card

Give the card an edition number and write it on every copy. The rule: you may replace the card only if your copy's edition matches the one on the wall. Replacing it raises the edition by one.

The fixed version works that way. The first save says "I started from version 1" and is accepted, and the document moves to version 2. The second save also says "I started from version 1." That no longer matches, so the server refuses it with code 409, which means conflict, and reports that the current version is 2 (local synthetic fixture).

The check and the replacement must be one step. If the server looked at the edition, turned away, and then replaced the card, someone could slip in between. The test server does both in a single database statement, and the tests send two saves at the same moment. Exactly one gets through.

## What the second person sees

Throwing away their typing would be another loss, so the second person's unsaved text is kept and both versions are shown. A person chooses: take the other version, keep theirs, or write a combined one. The software never retries by overwriting and never combines the two on its own. In the test, a combined version (first person's title, second person's body) was accepted and became version 3.

## What the fix does not do

- A busy database is not a conflict. When the test locked the database on purpose, the server answered 503, a "try again later" code. The text was kept and the document stayed at version 1.
- This is not live co-editing with two cursors in one document. It notices that two saves collided and stops the second.
- It was tested on one machine with software standing in for browsers. It says nothing about any real product.

## What this means for you

- "Saved" means the request went through, not that your version survived. If several people share a document, recheck it after saving important changes.
- A conflict message means the app is working as intended. Read both versions before choosing.
- If you buy or build shared-editing software, ask what happens when two people save the same record at once. You want a visible conflict, not "the last one wins."

## FAQ

**Why did my changes disappear even though the app said they were saved?**
The request did arrive and was written. The app never checked whether someone else had saved in the meantime, so an older copy replaced newer work.

**Is a conflict message a bug?**
No. The app stopped the second save instead of erasing the first. The message is the safety working.

**Can two people edit the same document without ever colliding?**
Some tools merge edits live, a different technique. This fix detects collisions and asks a person to settle them.

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

The card never asked what it was replacing. A good app asks first.

Miz Causevic, Kinetic Gain LLC
