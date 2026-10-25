# EP04 distribution kit: I Put a Database Inside a Website

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep04-pglite-notes/` (evidence.json, test.mjs, README.md). Browser-side steps (IndexedDB persistence, service worker, offline reload, clean profile, clear site data) were not executed in the build environment; they are a manual checklist and are labelled that way in the video.

## YouTube

### Title options (≤ 60 chars), ranked

1. `I Put a Database Inside a Website` (33) : the series title; short, concrete, and the surprise is the premise.
2. `Postgres Runs in Your Browser. Where Does the Data Go?` (53) : names the engine for search and asks the episode's real question.
3. `"Saved" Is Not "Backed Up": A Database in the Page` (50) : states the thesis; the quote marks carry the distinction.
4. `A Real Database, No Server. One Profile, One Device.` (51) : the end card as a title; good for shares among engineers.
5. `Your Notes Survived the Reload. Clear Site Data. Gone.` (54) : the two scenes that bracket the episode, in order.
6. `Local Persistence Is Not Cloud Sync` (34) : the closing line; plain enough for general viewers.

### Description

A full Postgres engine runs inside this web page and keeps your note across a reload. Saved? Only in this browser, on this device, until it says otherwise.

In this episode we build a notes app on PGlite, Postgres compiled to WebAssembly, about 16 MB of files loaded like any other asset (local synthetic fixture, vendored file sizes). Create a note called Groceries, search for coffee, one match, no server involved. Then the part that matters: the engine's working memory and its data directory are two different places. A memory-only directory loses the note on close (count 0). A persistent directory keeps it (count 1). A second directory sees 0. Delete the directory and reopen: 0. Six Node tests, six pass, including a known-positive control that proves the in-memory variant really does lose data.

The browser scenes are labelled on screen as not executed here. In a browser, the data directory is idb://video-notes, IndexedDB for this origin and this profile. A service worker precaches the shell and all 19 engine assets under a versioned cache name so the app can open offline. Reload, offline edit, a clean profile showing no notes, and Clear site data removing everything are a written manual checklist for a real browser. If a step fails there, it is reported as a failure, not filmed as a success.

Deliberately left off: relaxedDurability. Deliberately absent: any sync, backup or export. Persistence here means one origin, one browser profile, one device.

Chapters
00:00 Create a note, search it with SQL
00:08 The engine: Postgres compiled to WebAssembly
00:20 Working memory vs the data directory
00:32 Browser reload (not executed here)
00:47 Service worker precache (not executed here)
01:02 Offline reload and edit (not executed here)
01:11 Clean profile: no notes (Node analogue executed)
01:20 Clear site data: note gone (Node analogue executed)
01:30 One origin, one profile, one device

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep04/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

pglite, postgres in the browser, webassembly, wasm database, indexeddb, browser storage, local-first, offline first, service worker, precache, cache storage, web development, javascript, node.js, sqlite alternative, electric sql, data persistence, clear site data, offline web app, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with one synthetic note. Node tests executed (6 pass); the browser steps (IndexedDB, offline, clean profile, clear site data) were not run here and are a manual checklist. Source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

A real Postgres engine answered a SQL query inside a web page. No server. Then the only question that matters: where did the row go?

Episode 4 of Web Reality Checks: a notes app on PGlite 0.5.11, Postgres compiled to WebAssembly. The constructor takes one string and that string is the whole persistence story. memory:// is in-memory. A Node path is real files. idb://video-notes in a browser is IndexedDB, keyed to origin and profile.

Executed under Node (synthetic fixture): close and reopen the same data dir, count 1. Different dir, 0. memory:// after close, 0. Delete the dir, 0. Six tests, six pass. The one I would not ship without: the known-positive control. If memory:// kept the row, the persistence test would pass for the wrong reason.

Three decisions in the fixture:
1. relaxedDurability is refused by the code, not just left off.
2. Every write is awaited before the UI logs "create → id 1."
3. The service worker precaches all 19 same-origin assets.

Not executed: anything in a browser. IndexedDB persistence, offline reload, clean profile, clear site data are a written checklist, labelled on screen as not run here.

Not cloud sync, not a backup: one origin, one profile, one device.

github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #PostgreSQL #WebAssembly

### Post 2: non-technical leaders

"Your notes are saved." Saved where? In this episode the honest answer is: in this browser, on this device, until the browser decides otherwise.

Episode 4 of Web Reality Checks puts a full database engine inside a web page. A note survives a reload. That is real, and it is the smallest possible version of "saved."

Think of a notebook in a hotel room safe. The safe is real and it locks. It is also in one room, the hotel owns it, and nobody copies the pages. Open the same app on your phone: a different room, an empty safe. In the fixture, a second storage location saw zero notes.

A demo shows one person, one browser, one machine, for a few minutes.

Five questions for your team or vendor:
1. Where exactly does the data live, and what is it keyed to?
2. What happens when the user clears browser data?
3. Is there a test proving the in-memory version loses data?
4. Does "saved" light up before or after the write completes?
5. Was offline behavior tested in a real, named browser, with results recorded?

Here the browser steps were not executed, and the video says so on screen instead of filming a success. Hold your product to the same rule.

Synthetic fixture, no real product. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #LocalFirst #Leadership

## X/Twitter thread

1/ A full Postgres engine running inside a web page. SQL query, one match, no server anywhere. Then the question nobody asks in the demo: where did the row actually go? Episode 4 of Web Reality Checks. Thread.

2/ The engine is PGlite 0.5.11: Postgres compiled to WebAssembly, about 16 MB of files loaded like any asset. It needs a data directory like any Postgres. You pick where with one string: memory://, a filesystem path, or idb://name for IndexedDB in the browser.

3/ Working memory and the data directory are two different places. Under Node (synthetic fixture): memory:// loses the note on close, count 0. A filesystem dir keeps it, count 1. Same engine, same code. The string decides everything.

4/ Six tests, six pass. The one that matters is the known-positive control: memory:// must lose the note, or the persistence test proves nothing. Also tested: a different dir sees 0, a deleted dir sees 0, relaxedDurability is refused by the code.

5/ In a browser, idb://video-notes is IndexedDB for this origin and this profile. Not shared across devices, profiles or even ports. Nothing synchronizes it. And the browser owns it: clear site data, quota pressure or privacy settings can remove it.

6/ Offline is a separate job. A service worker precaches the shell plus all 19 engine files from the same origin under a versioned cache name. cache.addAll is all-or-nothing, so a half-cached shell never activates. Finish caching before going offline.

7/ What was NOT executed: every browser step. Reload, offline edit, clean profile, clear site data are a written checklist, labelled on screen as not run here. If a step fails in your browser, report it. Do not film a success.

8/ Local persistence is not cloud sync and not a backup. One origin, one profile, one device, until the browser decides otherwise. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A notes app on PGlite 0.5.11 with an idb:// data directory and a precaching service worker, with Node tests for persistence vs memory:// and an unexecuted browser checklist

**First comment:** This is a deliberately constructed local fixture with one synthetic note, so it is not a finding about PGlite, ElectricSQL or any real product. The Node tests (filesystem data dir keeps the note across close and reopen, a different dir sees zero, memory:// loses it, relaxedDurability refused) were executed and are in evidence.json; the browser-side steps (IndexedDB persistence, offline reload and edit, clean profile, clear site data) were not executed in the build environment and exist only as a manual checklist, which the video labels on screen. Limits in the README: persistence is per origin and per profile, the browser may remove it, no sync or export exists, and no browser-compatibility claim is made beyond a current Chromium-based browser or Firefox.

## Short-form hook lines (≤ 12 words)

1. A real Postgres engine answered. No server involved.
2. The note survived the reload. Then we cleared site data.
3. Memory loses it on close. The data directory keeps it.
4. Your notes are saved. In this browser. On this device.
5. Local persistence is not cloud sync, and not a backup.

## Alt text

**hero.png:** Diagram of a browser boundary containing three boxes, the notes app, the PGlite Postgres engine compiled to WebAssembly, and IndexedDB storage labelled idb://video-notes, with no arrow leaving the boundary toward any server and the caption "One origin, one profile, one device."

**thumbnail.png:** Episode thumbnail for "I Put a Database Inside a Website" showing a Postgres engine icon inside a browser window with a single note titled Groceries, and a second, empty browser window beside it labelled "different profile: 0 notes."
