SEO title (≤60 chars): The Padlock Is Not a Privacy Policy: What HTTPS Leaves Open
Meta description (≤155 chars): HTTPS protects what your users send, not the fact that they sent it, where, or when. What a network observer still sees, and five questions for your team.
Slug: https-visibility
Primary keyword: HTTPS privacy limits   Secondary keywords (3–5): what HTTPS protects, network metadata, vendor security questions, CDN TLS termination, encrypted DNS for business
Medium tags (5): Cybersecurity, Product Management, Privacy, Startup, Leadership

# HTTPS Encrypts Your Request. What Can the Network Still See?

![Three columns, browser, passive observer and TLS endpoint, for one HTTPS request; the observer column shows only hatched ciphertext blocks with lengths while the request line GET /account?tab=billing is readable in the browser and endpoint columns](../hero.png)

## The symptom as a business event

A customer in a regulated industry sends your security questionnaire back with one line circled: "All traffic is encrypted with HTTPS." Their reviewer asks a follow-up your team has not rehearsed. Can someone on the network between their staff and your product tell that their staff are using it at all? Which services, when, how heavily? Your engineers answer yes to most of that, and the reviewer notes that the questionnaire overstated the protection.

Nothing was breached or misconfigured. The gap is between what the padlock means and what a sentence implied. This episode closes it with one carefully scoped illustration.

First, the disclosure: this episode is a conceptual illustration, not a recording. No network traffic was captured or generated; the fixture is a hand-authored table built from the public protocol specifications, plus tests that check the table against itself. Every frame carries the label "CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED." The scope is narrow on purpose: HTTPS over TLS 1.3 on a conventional TCP connection, ordinary unencrypted DNS, no VPN or proxy, no Encrypted Client Hello, no session resumption, a trustworthy browser and server, and a passive observer on the network path who reads bytes and changes nothing. That is not every modern browser connection, and the episode says so.

## Why a demo cannot show this

A product demo shows the padlock and moves on; there is nothing more to show. Encryption working correctly looks like nothing, and the browser does not display what the network can see, because the browser is not the network.

The failure here is not a bug a demo could trigger. It is a category error: treating "the content is encrypted" as if it meant "the connection is invisible." The only way to see the difference is to stand where the observer stands and list, layer by layer, what passes in the clear. No screen offers that view, so the fixture constructs it on paper, with every assumption written next to every claim.

## The mechanism in plain terms

Think of a sealed envelope in the post. Nobody along the route can read the letter. But the envelope carries the destination address, a postmark showing when it was sent, and its weight. A carrier learns who you are writing to, when, and roughly how much, without opening it.

HTTPS is the sealed envelope. The letter is the request: path, query, headers, cookies, body. Under this episode's scope, a passive observer cannot read any of that, and in TLS 1.3 cannot even read the server's certificate, which travels inside the encrypted part of the handshake. The envelope is what the network needs to deliver the letter, and it has to be readable or nothing arrives.

The analogy needs one addition. Before the letter is sent, the browser looks up the address, and with ordinary DNS that lookup is a separate, unsealed postcard asking "where is example.test?" Then the first message of the secure handshake, the ClientHello, names the site in the clear again, because no shared secret exists yet to hide it. So the observer learns the name twice, the address and port once, and sees the timing and size of every envelope.

The fixture tallies it (local synthetic fixture, hand-authored matrix): of the 11 pieces of one navigation, the observer can read 5 (DNS question, destination IP, port, timing and volume, SNI hostname), sees 5 only as ciphertext (TLS 1.3 certificate, method and path and query, headers, cookies, body), and never receives 1 (the fragment after `#`, which the browser keeps; the one executed test proves it is absent from the request). The browser holds everything; the server that terminates the encryption holds everything except the DNS question and the fragment. If a CDN terminates the encryption for you, the CDN is that server for this connection, and it may log the full request.

Two partial fixes exist. Encrypted DNS seals the postcard, not the envelope: the address stays visible. Encrypted Client Hello hides the name in the handshake, not the address, port or timing. Neither stops phishing, a compromised server, or your own logs.

## What to ask your team or vendor

1. Which observer are we talking about? An ISP, a shared office network, a CDN? The answer changes what is visible. Ask for the position, not just the protocol.
2. Is connecting to our service a sensitive fact on its own? If so, HTTPS alone does not hide it; plain DNS and plaintext SNI both carry the name.
3. Who terminates TLS for us, and what do they log? A CDN or proxy reads every request in plaintext. Ask for the retention policy in writing.
4. Do we ever put sensitive values in URLs? They are encrypted in transit and then sit in plaintext in server and CDN logs.
5. What exactly does our questionnaire say HTTPS protects? Compare the sentence with the matrix: content yes; name, address and timing no.

Vague answers mean "unscoped," not "covered."

## What it costs if ignored

No figures here, only the shape of the cost.

The first is credibility in procurement. A reviewer who finds one overstated line reads the rest differently. "Encrypted in transit" is true; "the network cannot see what our users do" is not, and the distance between them is where trust is lost.

The second is a design error that is expensive late. Teams that assume the padlock hides everything put identifiers in URLs, accept a CDN's default logging, and skip encrypted DNS and ECH because "it is already encrypted." Each is cheap early and painful to unwind later.

The third is false reassurance to your own users. If your marketing implies privacy from the network, and a user's employer or provider can see that they visit you and when, the gap is yours to explain. Describing HTTPS accurately is cheaper than describing it generously.

## FAQ

**Is HTTPS enough to protect our customers' data?**
It protects the content of requests and responses in transit. It does not hide which site is visited, from which address, when, or how much. It does not protect data once it reaches the server, and it does not stop phishing. "Enough" depends on which of those your customers care about.

**If we use a CDN, who can read our users' requests?**
If the CDN terminates TLS, its edge is the endpoint for that connection and reads the full request in plaintext. It may log it. Any onward connection to your origin is separate, with its own rules. Treat the CDN's logging policy as part of yours.

**Should we turn on encrypted DNS and Encrypted Client Hello?**
Each closes one channel that carries the hostname: encrypted DNS hides the lookup, ECH hides the name in the handshake. Neither hides the destination address, port or timing. They matter if the fact of connecting to you is sensitive for your users.

## Watch the episode

[YouTube link]

Related episodes: [I Changed One DNS Record and Broke My Website](../../ep10/content/article-technical.md) and [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The padlock is a precise promise about the letter and says nothing about the envelope. Write your security claims to match the promise, and ask the five questions before a reviewer asks them for you.

Miz Causevic, Kinetic Gain LLC
