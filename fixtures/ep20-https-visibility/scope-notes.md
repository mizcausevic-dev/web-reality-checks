# EP20 scope notes — what the illustration assumes

**CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED.** Nothing in this folder opens a socket, resolves a name, or records packets. The visibility matrix is hand-authored from protocol behaviour: TLS 1.3 (RFC 8446), SNI (RFC 6066), HTTP semantics and request-target (RFC 9110), DNS (RFC 1035), and the WHATWG URL Standard. The only code that runs is a URL-splitting module and the tests around it.

## The one connection being illustrated

The browser navigates to `https://example.test/account?tab=billing#history`.

| Part | Value | Used for |
|---|---|---|
| Resolution name | `example.test` | the DNS question, the TCP destination (after resolution), the SNI `server_name` |
| Port | `443` | the TCP destination port (https: default) |
| Request target | `/account?tab=billing` | the HTTP request line inside encrypted application data |
| Fragment | `#history` | nothing on the wire: it stays in the browser's URL. Page JavaScript could read `location.hash` and send it in a *separate* request, which is outside this illustration |

The destination address shown on screen, `192.0.2.10`, is an RFC 5737 documentation address used as a label. Nothing was resolved.

## Assumptions (every cell in the matrix depends on these)

1. **HTTPS over TLS 1.3.** In TLS 1.3 everything after `ServerHello` is encrypted with handshake traffic keys, including the server `Certificate`. (TLS 1.2 sent the certificate in plaintext; the matrix would differ.)
2. **TCP, not HTTP/3.** HTTP/3 runs over QUIC, which encrypts more of the transport header and changes what "record length" means. Not illustrated.
3. **Conventional DNS over an unencrypted transport** (UDP or TCP port 53) to a recursive resolver. The observer can read the question only if it sits between the browser and that resolver.
4. **No VPN, no proxy.** A VPN would wrap everything in another tunnel and the observer inside the access network would see only the VPN endpoint. A TLS-terminating proxy would be an endpoint of its own.
5. **No Encrypted Client Hello.** Without ECH the `server_name` extension in the `ClientHello` is plaintext.
6. **No session resumption, no 0-RTT.** A full handshake, so there is a `Certificate` message at all and no early application data before the handshake completes.
7. **Trusted browser and trusted TLS-terminating server.** Both parties legitimately hold plaintext at their ends. Compromise of either, phishing, or server-side logging are outside what HTTPS protects against, and are not illustrated as prevented.
8. **Passive observer on the path** between the browser and both the DNS resolver and the TLS endpoint: an access network, a shared Wi-Fi segment, an upstream link. Passive means it reads bytes and does not inject, strip, or terminate anything.

These are illustration assumptions. **They are not a description of every modern browser connection.** Real connections commonly use HTTP/3, encrypted DNS, session resumption, and increasingly ECH.

## What changes under other conditions

### Encrypted Client Hello (ECH)
- The real `server_name` moves into the encrypted *inner* ClientHello. The *outer* ClientHello carries a public name for the ECH-fronting provider.
- The observer column for **SNI** becomes `encrypted`.
- Still visible to the observer: destination IP, port, timing and volume, and the DNS question if DNS is still plain.
- ECH protects the inner ClientHello; it does not hide all metadata.

### Encrypted DNS (DoH or DoT)
- The DNS question travels inside TLS to the resolver. The observer sees a connection to a resolver address, not the queried name.
- The observer column for **DNS question** becomes `encrypted`.
- Still visible: the destination IP of the later HTTPS connection, the port, timing and volume, and (without ECH) the SNI, which carries the same name the DNS just hid.
- Encrypted DNS does not hide destination IP addresses.

### CDN terminates TLS
- The CDN edge is the TLS endpoint for *this* connection. It sees the method, path, query, headers, cookies and body in plaintext, and may log them.
- The destination IP the observer sees is the CDN's shared address, which can front many unrelated sites: an IP does not necessarily identify one unique website.
- Any onward connection from the CDN to the origin server is a **separate** connection with its own TLS (or not), its own addresses and its own visibility. Nothing in this illustration says anything about that hop.

## Observer position matters

| Observer sits… | Sees the DNS question (plain DNS)? | Sees the SNI (no ECH)? | Sees destination IP? |
|---|---|---|---|
| Between browser and resolver, and between browser and server (illustrated) | yes | yes | yes |
| Only between resolver and authoritative servers | sees the resolver's upstream queries, not which client asked | no | no |
| Only between browser and server (resolver reached another way) | no | yes | yes |
| Beyond a VPN exit | no (question is inside the tunnel) | no | sees only the VPN endpoint |

## Not illustrated and not claimed

- No real packet capture, no `tcpdump`, no decrypted session keys. Record sizes and timings on screen are drawn as shapes, not measured values.
- No claim about QUIC/HTTP/3, TLS 1.2, 0-RTT, resumption tickets, OCSP stapling, certificate transparency, or client certificates.
- No claim that HTTPS prevents phishing, a compromised browser or server, or logging by the server.
- No claim that traffic analysis cannot ever infer content from sizes and timing; the claim is only that sizes and timing do not by themselves reveal the exact application content.
