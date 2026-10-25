# EP 20 — HTTPS Encrypts Your Request. What Can the Network Still See?

**Central idea.** TLS encrypts the HTTP content of a request, but the connection still travels with metadata a passive observer can read: the DNS question (with plain DNS), destination IP and port, timing and volume, and, without ECH, the SNI hostname.

## What this fixture is
- `fixtures/ep20-https-visibility/` — a **labelled conceptual illustration**, not a capture. Every scene carries the persistent tag `CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED`. No DNS, TCP, TLS or HTTP traffic was generated, observed or recorded; the environment has no isolated network or trusted HTTPS, and the brief forbids fabricating captures.
- `visibility-matrix.json` — hand-authored from protocol specifications (RFC 8446, RFC 6066, RFC 9110, RFC 1035, WHATWG URL): 11 rows × 3 views (browser / passive observer / TLS endpoint), each cell `visible | encrypted | not-sent` with a one-line reason and the scope assumption it depends on; plus ECH / encrypted-DNS / CDN-termination variants and the brief's accuracy bullets as ids.
- `url-parts.mjs` — the only executed behaviour: WHATWG `URL` parsing of `https://example.test/account?tab=billing#history` into resolution name, request target (path + query) and fragment, proving the fragment is absent from the request target.
- `scope-notes.md`, `accuracy-checklist.md` — the assumptions behind every cell and the scene-by-scene mapping of every ACCURACY / SCOPE / EXAMPLE bullet.
- Deliberate policy: the three views show visibility **separately for names, addresses, timing and content**. The observer column never displays readable HTTP content or a readable TLS 1.3 certificate; those are drawn as hatched ciphertext blocks whose widths are shapes, not measurements.
- `192.0.2.10` on screen is an RFC 5737 documentation address used as a label.

## Evidence
- Executed: `node --test fixtures/ep20-https-visibility/test.mjs` → `# tests 18  # pass 18  # fail 0` (URL splitting with a known-positive control; matrix schema; observer-never-sees-content/certificate invariants; variant consistency; checklist covers every accuracy id under a real scene; every script scene tagged; scope-notes content).
- Executed: `node fixtures/ep20-https-visibility/demo.mjs` → `evidence.json`: resolution name `example.test`, port `443`, request line `GET /account?tab=billing HTTP/1.1`, fragment `#history`, `fragmentInRequestTarget: false`. Observer tally over the matrix: 5 visible (DNS question, destination IP, port, timing/volume, SNI), 5 encrypted (TLS 1.3 certificate, method/path/query, headers, cookies, body), 1 not-sent (URL fragment). Browser: 11 visible. Endpoint: 9 visible, 2 not-sent (DNS question, URL fragment).
- Executed: `cd video && npx tsc --noEmit` → no errors in `src/episodes/ep20/`.
- Predicted: DNS, TCP, TLS handshake and HTTP behaviour as drawn follow from the cited specifications under the stated scope; none of it was observed on a network.
- Blocked: no packet capture and no real TLS session; the episode is conceptual.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep20      # needs video/public/ep20/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep20 --concurrency 2
```

## Accuracy bullets (all reflected on screen or in narration; mapping in `fixtures/ep20-https-visibility/accuracy-checklist.md`)
- Observer is never depicted reading encrypted HTTP content (scenes `certificate`, `request`).
- TLS 1.3 server certificate is never depicted as plaintext on the wire (`serverhello`, `certificate`); on-screen note that TLS 1.2 differed.
- Without ECH, SNI can reveal the requested hostname (`sni`).
- DNS visibility depends on transport and observer position (`dns`, `end`).
- Destination IP does not necessarily identify one unique website (`address`, `end`).
- Record lengths and timing are observable but do not reveal exact content by themselves (`address`, `request`).
- ECH protects the inner ClientHello; it does not hide all metadata (`sni` footnote, `end`).
- Encrypted DNS does not hide destination IP addresses (`end`).
- A CDN terminating TLS is an endpoint for that connection; onward connections are separate (`ends`).
- HTTPS does not prevent phishing, compromised endpoints, or server logging (`ends`, `end`).
- No packet captures fabricated; persistent tag on every scene, explicit "no traffic captured" notes (`navigate`, `address`, `serverhello`, `end`).
- Scope (TLS 1.3 over TCP, plain DNS, no VPN/proxy, no ECH, no resumption/0-RTT, trusted browser and endpoint, passive on-path observer) is stated on screen in `navigate` and `end` and is not presented as every modern browser connection.
- Example URL: hostname used for resolution and connection setup; path and query in the request; fragment not in the request target; page JavaScript could separately transmit a fragment but that is outside the illustrated request (`navigate`, `dns`, `request`, `ends`).

## Limitations
- Entirely conceptual. Nothing about the drawn record sizes, timings, certificate fields or key agreement is measured; they are schematic.
- Not covered: HTTP/3 over QUIC, TLS 1.2, session resumption, 0-RTT, OCSP, client certificates, traffic-analysis attacks beyond the statement that sizes and timing alone do not reveal exact content.
- The illustrative browser chrome in `navigate` is a plain `Box`, labelled illustrative; it mimics no product.

## Render evidence
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4) and saved to video/public/ep20/narration.mp3; scene boundaries are placed from detected silences or word timestamps, which is a heuristic and can be about a second off the spoken words.
- Executed: node tools/render.mjs ep20 → episodes/ep20/ep20.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 110.33 s, 10721034 bytes). Thumbnail and hero are rendered as Remotion stills.
- Verified: see VERIFICATION.md for the independent ffprobe pass and fixture test results.
- Observed: inspection stills in frames/ were reviewed for clipping and overlap.
