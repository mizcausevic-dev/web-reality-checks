SEO title (≤60 chars): It Worked in the Demo. Why Did Production Break on Launch?
Meta description (≤155 chars): The app passed every demo and failed for every real user. Why the API address was frozen in at build time, why a server setting cannot fix it, what to ask.
Slug: vite-env-localhost
Primary keyword: works locally but not in production   Secondary keywords (3–5): frontend deployment failure, build-time configuration, static hosting environment variables, vendor deployment questions, launch readiness
Medium tags (5): Startup, Product Management, DevOps, Software Development, Leadership

# It Works Locally. Why Is Production Broken?

![A deployed browser runs the built bundle, fetches http://127.0.0.1:41073/health, and gets TypeError: Failed to fetch because 127.0.0.1 is its own loopback and nothing listens there; the scene is labeled REMOTE CLIENT · CONCEPTUAL SIMULATION](../hero.png)

## The symptom as a business event

Launch day. The team demoed the product the evening before and every screen loaded. The deployment finished, the status page went green, and the first customer opened the link. The page rendered, but every piece of data it needed came back as an error. The developer opened the same link on their own laptop and it worked. "It works for me" was true, and so was "it is broken for everyone else."

Then the second event, the one that burns the afternoon. Somebody found a setting on the hosting server that looked like the right one, changed it, redeployed, and the product was still broken. The setting had changed. The product had not noticed.

This episode reproduces both events on a local fixture with synthetic data. On the developer's machine the page asks the API for a health check and gets 200 OK (local synthetic fixture). The same built files, opened anywhere else, would ask for an address that only means something on the developer's machine. That remote failure was not reproduced in an isolated browser, so the episode labels it a conceptual simulation; what was executed is the network condition behind it, a refused connection, which the fixture's own test asserts by name.

## Why a demo cannot show this

A demo runs on the demonstrator's machine. That is the one machine in the world where the broken configuration is correct. The frontend was built with an address meaning "the API on this computer," and on this computer there is an API. Every click succeeds. The demo answers "does this work here?" The launch question is "does this work there?"

Nothing on a screen distinguishes the two. The only difference is a short string inside one of the files the build produced, and that string is correct for exactly one computer. You can only see the problem by loading the deployed product from a machine that is not the developer's, or by opening the built file and reading the address it contains. Neither step is part of a demo.

## The mechanism in plain terms

Think of a company printing a brochure. The draft says "call our office at [PHONE]." At the print shop the placeholder is replaced with the actual number, and ten thousand copies come off the press with it. If the number used at print time was the internal extension that only works from inside the building, every brochure now tells customers to dial an extension that does nothing from their phone.

Now the instinctive fix: change the number on the wall at the warehouse that ships the brochures. The warehouse now has the right number. The brochures still say the old one, because the warehouse ships boxes; it does not reprint. The only fix is a new print run, then shipping the new boxes.

That is what the episode measures. The build tool, Vite, replaces the placeholder in the source with the literal address at build time. The fixture's inspection step opens the built file and finds the developer's loopback address inside it, with the placeholder gone (local synthetic fixture). The hosting server was then given the correct address in its own settings; it confirmed it saw the new value, and the file it served stayed byte-for-byte identical, verified by a fingerprint of the folder before and after (local synthetic fixture). A rebuild with the right address produced a new file containing the new address and no trace of the old one, and the health check returned 200 OK (local synthetic fixture). The test suite runs 9 tests, 9 pass, including one that deliberately demonstrates the refused connection so the suite can be shown to detect the problem.

Two further points. First, this is not a "CORS problem," a phrase teams reach for when a browser request fails across domains. A refused connection happens before any response exists, so there is no permission header missing; the actual error names a refused connection. Treating it as CORS sends people to fix the wrong thing. Second, anything placed in one of these build-time values ships to every visitor in readable form. They are public configuration. A secret put there is a secret published.

## What to ask your team or vendor

1. Where does the frontend learn the address of the API: at build time, baked into the files, or at load time, read from configuration the server provides? Either is valid. "We are not sure" is the answer to worry about.
2. If build time, where is the production value set, and does the build that gets deployed run with that value present? Ask to see the pipeline step, not a description.
3. Is there an automated check after each build that fails if the produced files contain `localhost`, `127.0.0.1` or any non-production address? In the episode that check is a short script.
4. Has anyone loaded the deployed product from a machine that is not a developer's laptop before announcing launch? A phone on cellular data counts.
5. Are any secrets, keys or passwords in the frontend's build-time configuration? If yes, they are already public and need rotating, not hiding.

## What it costs if ignored

No invented figures, only the shape of the cost.

The first cost is the launch itself. The failure is total rather than partial, because every visitor receives the same file with the same wrong address, and the people who tried it on day one do not offer a second first impression.

The second cost is the misdiagnosis loop. The instinctive repair looks like it should work and does nothing, so a team can spend hours proving to itself that the hosting, the API and the network are all fine before anyone opens the built file. If the failure is mislabeled as CORS, the loop runs longer, because now the API team is changing permissions that were never the problem.

The third cost is the quiet one. If a secret was placed in a build-time value because "it is only configuration," it has been downloadable by every visitor since the first deploy. That is a disclosure, and the clock started at launch, not at discovery.

## FAQ

**Why does the app work on the developer's computer but not for customers?**
The address of the API was frozen into the frontend's files when they were built, and it was the developer's own machine address. On that machine the API exists. On every other machine the same address points at a computer with nothing listening, so the connection is refused.

**Can the hosting provider fix it by changing a setting?**
No. In the episode the host was given the right value, confirmed it saw it, and kept serving the identical old file. A static host delivers files; it does not rebuild them. The fix is a rebuild with the correct address, or a redesign that reads configuration at load time.

**Is this a security issue or just a bug?**
The broken address is a bug. The related risk is that build-time frontend values are public and ship to every visitor. If anyone put a secret in one, that is a security issue regardless of whether the app works.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [I Changed One DNS Record and Broke My Website](../../ep10/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A server setting cannot rewrite a file that has already been built. Before launch, ask where the address lives and ask who opened the product from a machine that is not the developer's.

Miz Causevic, Kinetic Gain LLC
