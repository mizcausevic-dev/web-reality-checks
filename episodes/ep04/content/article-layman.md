SEO title (≤60 chars): Where Does a Website Save Your Notes? Inside Your Browser
Meta description (≤155 chars): Some websites save your work inside your browser, with no account and no cloud. A plain-language look at what that means, its limits, and what to do.
Slug: pglite-notes
Primary keyword: where does a website save my data   Secondary keywords (3–5): browser storage explained, offline website data, clearing browser data loses notes, no account app data, local storage vs cloud
Medium tags (5): Technology, Explainer, Privacy, Software, Productivity

# I Put a Database Inside a Website

![A browser boundary containing the notes app, the PGlite engine and IndexedDB storage, with no line leaving the box toward any server](../hero.png)

Imagine a notebook kept in a locked drawer in one particular room. You can write in it, flip back to earlier pages, and it is there tomorrow. It is a real notebook. But it lives in that drawer, in that room, and the room is not yours. The building's staff can clear the drawer, and no one is copying the pages anywhere.

That is this episode. We built a small notes website that keeps a full database engine, the kind that runs behind large websites, inside the web page itself. No server, no account, no cloud. It works. The interesting part is what "saved" turns out to mean.

## What the episode shows

The app is a notes list: create, search, edit, delete. The search is answered by a real Postgres database engine running inside the page. We created one note, "Groceries," with the body "milk, eggs, coffee," searched for "coffee," and got one match (local synthetic fixture). No server was involved. The engine is about 16 megabytes of files that the page loads like any other download.

Then the question the episode is really about: where did that note go?

The engine has two places it can be. One is its working memory, which exists only while the page is open. The other is a storage drawer the browser provides, where the engine writes after each change. With memory only, we closed and reopened: 0 notes. With the drawer: 1 note (local synthetic fixture). Same engine, same code. The only difference was where it was told to write.

## The drawer is in one room

Here is the limit most people miss. The browser's storage drawer belongs to one website address, in one browser profile, on one device. Open the same website on your phone and you are in a different room with an empty drawer. Nothing carried the notebook over; this app has no cloud and no sync. A second storage location saw 0 notes (local synthetic fixture). Not a bug; the design.

And the drawer is not yours. It belongs to the browser. Clear your browsing data, or let the browser decide it needs the space, or let a privacy setting wipe site storage, and the drawer is emptied. In the episode, deleting the storage folder and reopening gave 0 notes, with nothing to recover (local synthetic fixture).

One honesty note. Those results came from running the engine on a computer with real folders standing in for the browser's drawer. The steps that need a real browser, reloading, going offline, a fresh profile, clearing site data, were not run where this episode was built. The video marks those scenes as illustrative, and a written checklist exists for someone to run them in a named browser and record the outcome. If a step fails, the rule is to say so, not to film a success.

## "Works offline" is a different trick

A website that opens with no internet is doing something separate from saving your notes. To open offline, the browser must have stashed a copy of the whole app ahead of time, including that 16-megabyte engine, in another drawer called a cache. If the stash was incomplete when the connection dropped, the page does not open at all. "Works offline" and "keeps my notes" are two different promises, and in the episode both sit on the manual checklist, not verified.

## What this means for you

- When a website says "no account needed, your data stays on your device," that is true and also narrow. It means this browser, on this device. Open the same site somewhere else and see nothing: your notes are not lost, they are in the other drawer, and nothing will move them for you.
- Clearing browsing data can delete work you did not know was stored there. Before clearing site data for a site you have written in, look for an export or download option. If there is none, assume the data will not survive.
- If something you care about lives only in a browser, make your own copy. Local storage is a convenience, not a backup. The episode's closing line is the rule: one website address, one browser profile, one device, until the browser decides otherwise.

## FAQ

**Can a website save my data without an account?**
Yes. Browsers give each website a private storage area on your device, and an app can keep a full database there. In this episode a note survived closing and reopening the app with no server involved (local synthetic fixture). The catch is that the storage belongs to that browser on that device.

**Why are my notes missing on my other device?**
Because browser storage is per device and per browser profile, and the app in this episode has no sync of any kind. A different location saw zero notes (local synthetic fixture). Unless an app explicitly offers cloud sync, assume nothing travels between devices.

**Does clearing my browser data delete saved notes?**
It can, when the notes exist only in browser storage. In this episode, removing the storage and reopening the app gave zero notes with nothing to recover (local synthetic fixture). Export anything you care about before clearing site data.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The notebook is real and the drawer locks. It is still one drawer, in one room, in a building you do not own. Local persistence is not cloud sync, and not a backup.

Miz Causevic, Kinetic Gain LLC
