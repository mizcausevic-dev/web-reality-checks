SEO title (≤60 chars): Your Website Ships an API Key. Is It a Leak? Ask This First
Meta description (≤155 chars): A key in your website's code is not a leak because of its name, and not safe because of it either. What to ask your team, and why removal is not enough.
Slug: api-key-capability
Primary keyword: API key leak   Secondary keywords (3–5): secret exposed in website code, vendor security questions, backend proxy security, credential rotation, software security review
Medium tags (5): Startup, Product Management, Cybersecurity, Software Development, Leadership

# That API Key Is in Your JavaScript. Is That Always a Leak?

![A shipped JavaScript bundle opened in an inspector shows two credential-shaped strings, one labelled public and one labelled secret, with the caption asking which one is a leak](../hero.png)

## The symptom as a business event

A security researcher, a curious customer, or an automated scanner opens the code your website sends to every visitor and finds two strings that look like credentials. An email arrives: "You are leaking API keys." Your team looks and splits into two camps. One says the first value is clearly labelled public, so it is fine. The other says the second value has "secret" in its name, so it is a crisis. Both are reading labels. Neither has checked what the values can do.

This is the event episode 13 of Web Reality Checks reproduces on a local fixture with a fictional vendor and two synthetic values. One value, an identifier, was presented to the vendor's privileged operation and refused with a 403. The other, a bearer credential, was presented the same way and accepted with a 200. The operation ran (local synthetic fixture). The first value named a project. The second value was the authority to act on it, and every visitor who downloaded the site held a copy.

## Why a demo cannot show this

A demo shows the website working. It loads, it displays the right project, the privileged action completes when the right person clicks the button. Every one of those things is also true of the leaking version. The bundle that embeds the secret works perfectly, because the secret is exactly what makes the privileged call succeed. Nothing is broken from the user's point of view. The problem is who else can make that call, and a demo never asks that.

The second reason is subtler. Even a team that knows to look will often classify what it finds by the name on the constant. Names are written by the developer who hoped the value was harmless. The vendor that issued the value does not consult the name. It consults the bytes. The only way to know what a value authorizes is to present it to the privileged operation in a controlled test and see what the vendor does. That is a deliberate experiment, not a screen anyone demos.

## The mechanism in plain terms

Think of a building with a street address and a master key. The address is public by nature: it is printed on the mail, it is on the map, anyone can walk up to the front door and read it. Knowing the address lets you find the building. It does not let you in. The master key is different. Whoever holds it opens every door, and the lock does not ask who is holding it or how they got it.

Now imagine printing both on the flyer you hand to everyone who walks past. The address on the flyer changes nothing. The master key on the flyer means every passer-by can enter, and collecting the flyers back does not help, because people have already made copies.

The fixture works the same way. The identifier is the address: the vendor's public endpoint answers for anyone who knows it, and the privileged endpoint refuses it. The secret is the master key: the vendor performs privileged operations for whoever presents it, including an operation the application never intended to offer. The repair keeps the key inside the building. The website asks a backend service for the one privileged action it needs, the backend checks who is asking and whether they are allowed, confirms the request is one of the actions it offers at all, and only then uses the key itself. The browser never sees the key, and the backend's response is rebuilt so the key cannot slip back out in a header or error message.

One warning the episode is careful to make. Moving the key to a backend is not enough if the backend simply does whatever the website asks. That is the master key behind a reception desk that hands it to anyone who requests it. The fixture proves the point with a test: the vendor would perform a destructive operation for the key holder, and the backend refuses that request before making any call, because it is not on its short list of permitted actions.

## What to ask your team or vendor

1. For every credential-shaped value in the code sent to browsers, has someone presented it to the privileged operations and recorded what the issuer did? Ask for the result, not the label.
2. Where does the secret live now? "In backend configuration" is the right answer. "In the frontend, but it is a public key" needs the test from question one, and if it is a third-party vendor's browser key, ask what that vendor says it can do and what restrictions you have applied.
3. When the backend uses the secret, does it decide which operations it will perform, or does it forward whatever the browser requests? A list of permitted operations, checked before the call, is the difference between a service and a relay.
4. What was scanned? JavaScript, HTML, configuration payloads and source maps are all delivered to browsers. Ask whether the scanner was first proven to catch a planted secret; a tool that has never found anything may simply be unable to.
5. If a real secret was ever shipped, has it been rotated at the issuer? Removing it from the code does not recall the copies already downloaded, cached, or indexed.

If the answers are "we think so" or "it says public," the state of your product is unknown, not safe.

## What it costs if ignored

No figures here, only the shape of the cost.

The direct cost is whatever the secret authorizes. In the fixture that is a webhook rotation and a project deletion at a fictional vendor. In a real product it is whatever your vendor key can do: send messages, charge accounts, read records, delete data. The bill, the abuse report, or the data loss arrives under your name, because it was your credential.

The second cost is the response. A leaked secret has to be rotated, and rotation touches every system that uses it. Teams that have not planned for rotation discover the dependencies during the incident. Meanwhile the old key keeps working in every cached copy of the site until the issuer revokes it.

The third cost is the false alarm in the other direction. A team that treats every identifier as a secret because it looks like one spends incident-response time on a value that authorizes nothing. The capability test is cheap. Not running it is expensive whichever way the guess goes.

The quiet cost is trust with the people who found it. A researcher who reports a leak and receives "that one is public" without evidence has learned how your team reasons about security. Buyers with a security questionnaire ask some version of the five questions above.

## FAQ

**Is a key labelled "public" safe to put in a website?**
Not because of the label. A value is safe in a browser when the issuer refuses it for every privileged operation, and that has to be tested. In the fixture the public identifier was refused with 403; that fact, not its name, is what made it safe to ship.

**We moved the key to a backend. Are we done?**
Only if the backend decides what it will do. If it forwards any operation the website asks for, the key is one hop further away and exactly as exposed. The backend must confirm who is asking, whether they are allowed, and whether the operation is one it offers at all.

**We deleted the leaked key from our code. Is the leak closed?**
No. Every browser, cache, crawler and download that received the old code still holds a working key. Revoke or rotate it at the issuer. The fixture demonstrates removal and states plainly that rotation is a separate, required step it does not implement.

## Watch the episode

[YouTube link]

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A public identifier names something. A secret grants capability. Before the next launch, ask which of your shipped values the issuer would act on, and ask who ran the test that found out.

Miz Causevic, Kinetic Gain LLC
