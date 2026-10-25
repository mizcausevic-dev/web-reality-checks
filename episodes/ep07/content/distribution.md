# EP07 distribution kit: It Works Locally. Why Is Production Broken?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep07-vite-env-localhost/` (evidence.json, test.mjs, README.md). The remote-browser failure was not reproduced in an isolated browser; it appears in the video as a labeled conceptual simulation.

## YouTube

### Title options (≤ 60 chars), ranked

1. `It Works Locally. Why Is Production Broken?` (43) : the series title; the exact sentence every developer has said, and the question the episode answers.
2. `Your Vite Env Var Is a String Literal in the Bundle` (51) : states the mechanism in the title so search intent around `import.meta.env` lands here.
3. `Changing the Server Env Did Nothing. Here Is Why.` (49) : the failed repair is the surprising part for people who have tried it.
4. `The Deployed App Is Calling 127.0.0.1. Yours Might Be.` (54) : concrete scene from the fixture; the loopback address is the hook for engineers.
5. `A Static Host Serves Files. It Does Not Rebuild Them.` (53) : the closing thesis as a title; good for shares.
6. `Failed to Fetch Is Not Always CORS` (34) : short, names the misdiagnosis the episode corrects.

### Description

The deployed page calls 127.0.0.1 for its API. On your laptop that works. On every other machine it is connection refused.

In this episode we build a minimal real Vite frontend whose only source of the API address is `import.meta.env.VITE_API_BASE_URL`. Locally, the API runs on the developer's loopback, the build stamps that address into the bundle, and GET /health returns 200 OK. Open the built JavaScript and the loopback URL is in it as a string literal; the `import.meta.env` expression is gone, because Vite replaces it at build time.

A remote browser running the same bundle asks its own loopback for the API, where nothing is listening. That scene is a labeled conceptual simulation: no isolated browser was available, so the fixture models it with a Node fetch to the embedded port after the API is stopped. The result is TypeError with ECONNREFUSED, not a CORS error.

Then the instinctive repair: set VITE_API_BASE_URL on the static host. The host process sees the new value. The served bundle is byte-identical, hash before equals hash after. A static host serves files; it does not rebuild them. The real fix is a rebuild with a reachable API URL, which produces a new asset containing the new literal, and GET /health returns 200 OK. The regression suite runs 9 tests, 9 pass, including a known-positive control.

Two things to keep: VITE_ values are public client configuration shipped to every visitor, never put a secret in one; and a server environment change cannot rewrite an existing bundle.

Chapters
00:00 Locally: GET /health, 200 OK
00:07 Remote browser: Failed to fetch (conceptual simulation)
00:18 Follow the request to the remote machine's own loopback
00:29 The literal URL inside the built bundle
00:42 Set the variable on the static host
00:51 The served bundle is byte-identical
01:00 The fix: rebuild with a reachable API URL
01:11 Retest: 200 OK
01:19 VITE_ values are public; a host env change cannot rewrite a bundle

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep07/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

vite, vite environment variables, import.meta.env, VITE_API_BASE_URL, works locally not in production, localhost, 127.0.0.1, connection refused, failed to fetch, CORS, static hosting, build time vs runtime, frontend deployment, environment variables, javascript bundle, devops, web development, node.js, regression test, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic data. The remote-browser scene is a labeled conceptual simulation; the refused connection was measured with Node fetch, not an isolated browser. Fixture, 9 tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The deployed bundle was calling http://127.0.0.1:41073/health. On the developer's laptop that returned 200. Everywhere else, connection refused.

Episode 7 of Web Reality Checks. One string literal, placed by the build tool.

The source reads import.meta.env.VITE_API_BASE_URL. Vite's vite:define plugin replaces that expression with JSON.stringify(value) at build time. The fixture's inspection script opens dist/assets/index-*.js and finds the loopback URL inside it, and finds no import.meta.env at all.

The instinctive repair: set VITE_API_BASE_URL on the static host. We did. GET /__host-env confirmed the host process saw the new value. The served asset still contained the original URL and the dist/ hash was identical before and after. A static host serves bytes. It does not rebuild.

The real repair: rebuild with a reachable URL. New hashed asset, new literal, old URL gone, GET /health 200.

Three things I would push on any team:

1. Treat every VITE_ value as public. It ships to every visitor in plain text.
2. Add a post-build grep of dist/ for localhost and 127.0.0.1. Fail the pipeline on a hit.
3. Report the real error. A refused connection has no response and therefore no CORS header to be missing. Do not label it CORS.

Scope: 9 tests, 9 pass, vite 8.3.5 pinned, loopback only. The remote-browser failure was NOT reproduced in an isolated browser; the fixture models it with a Node fetch (TypeError, ECONNREFUSED) and the video labels that scene a conceptual simulation. Synthetic fixture, not a finding about any product.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#Vite #FrontendDevelopment #DevOps

### Post 2: non-technical leaders

The product worked in the demo and failed for every customer on launch day. Then the team changed the setting that should have fixed it, and nothing changed.

Episode 7 of Web Reality Checks reproduces both events on a local fixture.

When a website is built, the build tool fills in blanks, including "where is the API?" The value present at that moment is printed into the finished files. On the developer's laptop it was the laptop's own address, and on that one machine it worked. On everyone else's machine the same address points at their own computer, where there is nothing to answer.

Think of a brochure printed with the internal phone extension. Changing the number on the warehouse wall does not reprint the brochures. The fixture measured exactly that: the hosting server was given the right address, confirmed it saw it, and kept serving the identical old file. Only a rebuild produced a working one.

Five questions before launch:
1. Does the frontend learn the API address at build time or at load time? "Not sure" is the worrying answer.
2. If build time, where is the production value set, and does the deployed build run with it?
3. Is there an automated check that fails the build if the files contain localhost?
4. Has anyone opened the deployed product from a machine that is not a developer's?
5. Is there any secret in the frontend's build-time configuration? If so, it is already public.

Synthetic fixture, no real product. The remote-browser scene is a labeled simulation. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Leadership #SoftwareDelivery

## X/Twitter thread

1/ The deployed app worked on the developer's laptop and failed for everyone else. The bundle was calling 127.0.0.1 for its API. On every other machine, 127.0.0.1 is that machine. Connection refused. Episode 7 of Web Reality Checks. Thread.

2/ Source: const base = import.meta.env.VITE_API_BASE_URL. Vite does not read that at runtime. The vite:define plugin replaces the expression with a string literal at build time. Open dist/assets/index-*.js: the URL is in it, import.meta.env is not.

3/ The instinctive fix: set VITE_API_BASE_URL on the static host. We did (local fixture). GET /__host-env showed the host process had the new value. The served JS still had the original URL. dist/ hash before == hash after. A static host serves bytes. It does not rebuild.

4/ The real fix: rebuild with a reachable API URL. New asset index-BLHWur4n.js, new literal inside, old URL absent, GET /health 200 with the CORS header for the new static origin. Same source, different build-time value.

5/ This is not CORS. A refused connection fails before any response exists, so there is no header to be missing. Node reports TypeError: fetch failed, cause ECONNREFUSED. The browser would say Failed to fetch, net::ERR_CONNECTION_REFUSED. Fix the address, not the headers.

6/ Candor: the remote-browser failure was NOT reproduced in an isolated browser. No separate machine or verified-isolated container was available. The fixture models it with a Node fetch after the API stopped; the video labels that scene REMOTE CLIENT · CONCEPTUAL SIMULATION.

7/ 9 tests, 9 pass (local synthetic fixture, vite 8.3.5 pinned, loopback only). Includes a known-positive control asserting ECONNREFUSED on the embedded localhost URL, so the suite can be shown to see the bug. VITE_ values are public. Never put a secret in one.

8/ A server environment change cannot rewrite an existing bundle. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Vite fixture showing that import.meta.env values are build-time literals: host env change leaves the bundle byte-identical, rebuild fixes it, with tests

**First comment:** This is a deliberately constructed local fixture with synthetic data, built against pinned vite 8.3.5 on loopback only, so it is not a finding about any real product or hosting provider. The remote-browser failure was not reproduced in an isolated browser; the fixture models the network condition with a Node fetch to the embedded loopback port after the API is stopped (TypeError, ECONNREFUSED), and the video labels that scene a conceptual simulation. The 9 tests cover the define replacement, the host-env-does-not-rewrite case with a dist hash comparison, the rebuild and retest, and a deliberate CORS allowlist so CORS cannot be the unrelated failure; limits are in the README.

## Short-form hook lines (≤ 12 words)

1. Your deployed app is calling 127.0.0.1. That is the user's machine.
2. Changed the server env var. The bundle did not notice.
3. Vite replaced your env var with a string. At build time.
4. A static host serves files. It does not rebuild them.
5. Failed to fetch is not always CORS. Check the real error.

## Alt text

**hero.png:** Diagram of a remote browser running a built Vite bundle; the bundle contains the literal URL http://127.0.0.1:41073 and the fetch to /health fails with TypeError: Failed to fetch because 127.0.0.1 is the remote machine's own loopback with nothing listening; a persistent tag reads REMOTE CLIENT · CONCEPTUAL SIMULATION.

**thumbnail.png:** Episode thumbnail for "It Works Locally. Why Is Production Broken?" showing a green 200 OK on a developer laptop beside a red Failed to fetch on a remote browser, both pointing at the same 127.0.0.1 address embedded in one JavaScript file.
