# EP20 distribution kit: HTTPS Encrypts Your Request. What Can the Network Still See?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep20-https-visibility/` (evidence.json, test.mjs, README.md). The episode is a conceptual illustration: no packets were captured and no TLS traffic was recorded. Scope throughout: TLS 1.3 over TCP, plain DNS, no VPN or proxy, no ECH, no resumption or 0-RTT, trusted browser and endpoint, passive on-path observer. Not every modern browser connection.

## YouTube

### Title options (≤ 60 chars), ranked

1. `HTTPS Encrypts Your Request. What Can the Network Still See?` (60) : the series title; asks the exact question the episode answers.
2. `What HTTPS Still Shows: DNS, IP, SNI and Timing` (47) : names the four visible things, so search intent on each term lands here.
3. `The Padlock Seals the Letter, Not the Envelope` (45) : the general-reader analogy as a thesis; good for shares.
4. `5 Things an Observer Reads on an HTTPS Connection` (49) : the fixture's observer tally (5 visible of 11) as a concrete count.
5. `Your Request Is Encrypted. Your Hostname Is Not.` (47) : the SNI and DNS point for engineers, stated as the surprise.
6. `Encrypted Content, Visible Metadata: HTTPS Explained` (52) : the closing line of the episode plus a search term.

### Description

The padlock is on. Your request is encrypted. The network still sees the site name, the address, the port and when you sent it.

This episode is a conceptual illustration, not a capture. No DNS, TCP, TLS or HTTP traffic was generated or recorded; every scene carries the tag "CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED." Scope: HTTPS over TLS 1.3 on TCP, plain unencrypted DNS, no VPN or proxy, no Encrypted Client Hello, no session resumption or 0-RTT, trusted browser and server, passive observer on the path. These are illustration assumptions, not every modern browser connection.

We follow one navigation to https://example.test/account?tab=billing#history through three views: the browser, a passive network observer, and the TLS-terminating endpoint. The DNS question for example.test crosses in the clear. The destination IP, port 443, timing and volume are visible, though an IP does not necessarily identify one website. The TLS ClientHello is plaintext and, without ECH, its SNI names example.test. After ServerHello the handshake is encrypted, so the TLS 1.3 certificate is a record length to the observer, not a certificate. The request line GET /account?tab=billing, headers, cookies and body are encrypted application data; only sizes and timing leak, and those alone do not reveal the exact content. Both ends hold plaintext: the browser built it, the server decrypts it and may log it, and a CDN that terminates TLS is that endpoint. The fragment #history never left the browser.

From the fixture (local synthetic fixture): a hand-authored 11-row visibility matrix; observer tally 5 visible, 5 encrypted, 1 not-sent. The one executed thing is a WHATWG URL split proving the fragment is absent from the request target, with a known-positive control. 18 tests, 18 pass.

What this does not prove: nothing was observed on a network; sizes and timings on screen are shapes, not measurements; HTTP/3, TLS 1.2, resumption and 0-RTT are out of scope; HTTPS does not prevent phishing, compromised endpoints or server logging.

Chapters
00:00 Navigation and the passive observer
00:16 Plain DNS: the question is visible
00:30 Destination IP, port 443, timing and volume
00:42 ClientHello: SNI names the server
00:49 ServerHello: the handshake goes encrypted
00:56 TLS 1.3 certificate inside the encrypted handshake
01:06 The request: encrypted application data
01:18 Both ends hold plaintext; the fragment never left
01:32 Encrypted content, visible metadata

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep20/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

https, tls 1.3, what https hides, sni, server name indication, encrypted client hello, ech, encrypted dns, dns over https, network metadata, passive observer, tls handshake, clienthello, url fragment, request target, web security, privacy, networking, cdn tls termination, web reality checks

### Pinned comment (≤ 300 chars)

This episode is a labeled conceptual illustration. No packets were captured and no TLS traffic recorded; the visibility matrix is hand-authored from the RFCs and tested for consistency (18 tests, 18 pass). The only executed code is a URL split. Source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The padlock is on. Under TLS 1.3 with plain DNS and no ECH, a passive on-path observer still reads: the DNS question, destination IP, port 443, timing and volume, and the SNI hostname in the ClientHello.

Episode 20 of Web Reality Checks. No capture, no real TLS session; every scene is tagged CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED.

The fixture is a hand-authored 11-row visibility matrix (browser / observer / TLS endpoint), every cell visible, encrypted or not-sent, with its scope assumption. Observer tally: 5 visible, 5 encrypted (TLS 1.3 certificate, method/path/query, headers, cookies, body), 1 not-sent (the fragment).

The one thing that runs: a WHATWG URL split of the example URL. fragmentInRequestTarget: false, with a known-positive control so the pass is not vacuous. 18 tests, 18 pass.

Three cells people get wrong:
1. Encrypted DNS hides the question, not the IP; without ECH the SNI carries the name anyway.
2. ECH encrypts the inner ClientHello. IP, port, timing stay visible.
3. A CDN terminating TLS is the endpoint. It may log the request.

Scope: TLS 1.3 over TCP, plain DNS, no VPN, no ECH, no resumption. Not every connection. Nothing observed on a network.

Matrix, tests: github.com/mizcausevic-dev/web-reality-checks

#HTTPS #TLS #WebSecurity

### Post 2: non-technical leaders

Your security questionnaire says "all traffic is encrypted with HTTPS." A reviewer asks: can the network tell that our staff use your product, and when? Yes.

Episode 20 of Web Reality Checks is about that gap.

A sealed envelope: nobody on the route can read the letter, but everyone can read the address, postmark and weight. HTTPS seals the letter (page, login, form data). The envelope stays readable because the network needs it: which site, when, how much.

Conceptual illustration, not a recording; no traffic captured. One visit under narrow assumptions (TLS 1.3, ordinary DNS, no VPN, no ECH). From the fixture: of 11 pieces of that visit, the observer reads 5, sees 5 as sealed boxes, never receives 1.

Five questions for your team:
1. Which observer are we defending against, and where does it sit?
2. Is connecting to us a sensitive fact on its own?
3. Who terminates TLS for us, and what do they log?
4. Do we ever put sensitive values in URLs?
5. What exactly does our questionnaire say HTTPS protects?

Vague answers mean "unscoped," not "covered." The padlock does not stop phishing or protect data once it reaches the server.

Synthetic fixture, no real product: github.com/mizcausevic-dev/web-reality-checks

#Cybersecurity #ProductManagement #Privacy

## X/Twitter thread

1/ The padlock is on. Your request is encrypted. The network still sees: the DNS question, the destination IP, port 443, when you sent it, how much, and (without ECH) the hostname in the TLS ClientHello. Episode 20 of Web Reality Checks. Thread.

2/ First: this is a drawing, not a capture. No DNS, TCP, TLS or HTTP traffic was generated or recorded; every scene is tagged CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED. Scope: TLS 1.3 over TCP, plain DNS, no VPN, no ECH, no resumption, passive observer. Not every connection.

3/ One navigation: https://example.test/account?tab=billing#history. The hostname is used for resolution and connection setup. The path and query go in the request. The fragment is not in the request target at all. Three parts, three fates.

4/ Plain DNS: the question for example.test is cleartext, if the observer sits between you and the resolver. Then the ClientHello, sent before any keys exist, names example.test again in the SNI. Encrypted DNS fixes one. ECH fixes the other. Neither hides the IP.

5/ After ServerHello the handshake is encrypted. In TLS 1.3 the server certificate travels inside it: the observer sees a record length, not a certificate. GET /account?tab=billing, headers, cookies, body: encrypted. Sizes and timing leak; alone they do not reveal content.

6/ Both ends hold plaintext. The browser built it. The TLS endpoint decrypts it and may log it. If a CDN terminates TLS, the CDN is that endpoint; the hop to origin is a separate connection. HTTPS does not stop phishing, a compromised server, or logging.

7/ The fixture (local synthetic): a hand-authored 11-row matrix, observer tally 5 visible / 5 encrypted / 1 not-sent. The one executed thing is a WHATWG URL split with a known-positive control proving the fragment is absent from the request target. 18 tests, 18 pass.

8/ Encrypted content can still travel with visible metadata. Matrix, scope notes, accuracy checklist, tests and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A hand-authored, test-checked visibility matrix of what a passive observer sees on one TLS 1.3 HTTPS navigation (DNS, IP, SNI, timing vs. encrypted content)

**First comment:** This is a conceptual illustration, not a capture: nothing in the fixture opens a socket, resolves a name or records packets, and every scene in the video is labeled as such, because the environment has no isolated network and the brief forbids fabricating captures. The matrix is built from RFC 8446, 6066, 9110, 1035 and the WHATWG URL Standard under a stated scope (TLS 1.3 over TCP, plain DNS, no VPN, no ECH, no resumption, passive on-path observer), with the scope assumption recorded on every cell and variants for ECH, encrypted DNS and CDN termination. The only executed code is a WHATWG URL split showing the fragment is absent from the request target, with a known-positive control; the 18 tests check internal consistency and the brief's accuracy invariants, not the network.

## Short-form hook lines (≤ 12 words)

1. The padlock seals the letter. Not the envelope.
2. Encrypted request. Visible hostname. Both are true at once.
3. Your ISP cannot read the page. It can read the site name.
4. Encrypted DNS hides the question, not the address.
5. The fragment after # never leaves your browser.

## Alt text

**hero.png:** Diagram with three columns, browser, passive network observer and TLS-terminating endpoint, for one HTTPS request to example.test; the browser and endpoint columns show the readable request line GET /account?tab=billing, while the observer column shows only hatched ciphertext blocks labeled with record lengths, and a corner tag reads "CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED."

**thumbnail.png:** Episode thumbnail for "HTTPS Encrypts Your Request. What Can the Network Still See?" showing a closed padlock beside a sealed envelope whose address label, postmark and weight remain readable, with the words DNS, IP, SNI and timing in the clear and the request content blacked out.
