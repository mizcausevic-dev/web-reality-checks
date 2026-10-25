# EP20 scene-by-scene technical accuracy checklist

Every ACCURACY bullet (A01–A11), the SCOPE caveat (S01) and the EXAMPLE claims (E01–E04) from the brief, with the scene in `episodes/ep20/script.json` that satisfies it and how. Ids match `visibility-matrix.json#accuracy`; `test.mjs` asserts every id appears here.

The persistent corner tag on every scene reads `CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED`.

## Scene 1 — `navigate` (navigation and observer placement)
- [A11] Narration says "This is a conceptual illustration, not a capture." The corner tag is on from the first frame. No packet list, no hex dump, no timestamps are drawn anywhere in the episode.
- [S01] The scope strip on screen lists TLS 1.3 · TCP · plain DNS · no VPN/proxy · no ECH · no resumption/0-RTT and the on-screen note says these are the illustrated assumptions, not every browser connection.
- [E01] The URL is split on screen into resolution name `example.test`, request target `/account?tab=billing` and fragment `#history`; the name is labelled as the part used for resolution and connection setup.

## Scene 2 — `dns` (unencrypted DNS question)
- [A04] Narration: "Whether the observer sees it depends on the transport and on where it sits." The observer card is marked `visible` only with the caveat "plain DNS · observer between browser and resolver".
- [E01] The DNS question token carries `example.test`, the resolution name from scene 1.

## Scene 3 — `address` (destination IP, port, timing, volume)
- [A05] Narration: "An address alone does not necessarily identify one website." On-screen note: "shared hosting / CDN: one address, many sites".
- [A06] Timing and volume are drawn as opaque record blocks of differing width with a time axis; label reads "sizes and timing: observable · not the content". No content is drawn inside the blocks.
- [A11] The address `192.0.2.10` is labelled as an RFC 5737 documentation address (illustrative label, nothing resolved).

## Scene 4 — `sni` (ClientHello with SNI, no ECH)
- [A03] Narration: "Without Encrypted Client Hello it names the server." The ClientHello is the only TLS message drawn in plaintext, and the observer card lists `server_name = example.test` as `visible` with the scope badge "no ECH".
- [A07] (anticipation) On-screen footnote: "With ECH the inner ClientHello is encrypted; address, port and timing stay visible." Fully stated in scene 9.

## Scene 5 — `serverhello` (transition into encrypted handshake)
- [A02] (set-up) The ServerHello is the last plaintext handshake message drawn; everything to its right is drawn as hatched ciphertext blocks with no readable text.
- [A11] The key-derivation step is drawn as a schematic (two keys meeting), with no key material, hex, or cipher-suite names presented as captured values.

## Scene 6 — `certificate` (TLS 1.3 server certificate stays encrypted)
- [A02] Narration: "the server certificate travels inside that encrypted handshake. The observer sees ciphertext and a length, not the certificate." The certificate is shown in the browser and endpoint columns only; the observer column shows a hatched block labelled "encrypted handshake · length only". The on-screen note states "TLS 1.2 sent it in plaintext; TLS 1.3 does not."
- [A01] The observer's view of the certificate record shows no readable fields.

## Scene 7 — `request` (HTTP request inside encrypted application data)
- [A01] The observer column shows only hatched application-data records with a byte-length label and no text; the request line, headers, cookie and body are drawn in the browser column only. The observer card lists method/path/query, headers, cookies, body as `encrypted`.
- [A06] Narration: "Only record sizes and timing leak, and those alone do not reveal the exact content." Record lengths are drawn as bar widths without numbers presented as measurements.
- [E02] The request line drawn in the browser column is `GET /account?tab=billing HTTP/1.1`: path and query are in the request.
- [E03] The request line contains no `#history`; a strike-through note beside the browser column reads "fragment not in request target".

## Scene 8 — `ends` (browser and TLS endpoint hold plaintext)
- [A10] Narration: "the terminating server decrypts it and may log it." On-screen: "HTTPS does not prevent phishing, a compromised endpoint, or server logging."
- [A09] Narration: "If a CDN terminates TLS, the CDN is that endpoint." On-screen: "CDN terminating TLS = endpoint for this connection; any onward connection is separate."
- [E03] Narration: "the fragment, hash history, never left the browser." The fragment is drawn only inside the browser column, marked `not-sent` in the observer and endpoint columns.
- [E04] On-screen note: "Page JavaScript could read location.hash and send it in a separate request — outside this illustration."

## Scene 9 — `end` (takeaway)
- [A08] Narration: "Encrypted DNS hides the question, not the address."
- [A07] Narration: "ECH hides the name in the hello, not everything." On-screen: "ECH protects the inner ClientHello; IP, port, timing stay visible."
- [A10] Narration: "HTTPS does not stop phishing or a compromised endpoint."
- [A04] On-screen summary row: "DNS question: visible only with plain DNS and an on-path observer."
- [A05] On-screen summary row: "Destination IP: visible; not necessarily one site."
- [A11] Closing footnote: "Hand-authored visibility matrix. No packets were captured."

## Coverage index
| Id | Scenes |
|---|---|
| A01 | certificate, request |
| A02 | serverhello, certificate |
| A03 | sni |
| A04 | dns, end |
| A05 | address, end |
| A06 | address, request |
| A07 | sni, end |
| A08 | end |
| A09 | ends |
| A10 | ends, end |
| A11 | navigate, address, serverhello, end |
| S01 | navigate |
| E01 | navigate, dns |
| E02 | request |
| E03 | request, ends |
| E04 | ends |
