# ep20-https-visibility — who sees which part of one HTTPS navigation

**CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED.** Plain Node 22 ESM, zero dependencies, **no sockets**. Nothing here resolves a name, opens a TCP connection, performs a TLS handshake, sends an HTTP request, or records packets. The one thing that executes is WHATWG URL parsing of `https://example.test/account?tab=billing#history`.

## What it is

| File | Role |
|---|---|
| `visibility-matrix.json` | Hand-authored matrix: 11 rows (DNS question, destination IP, port, timing/volume, SNI in ClientHello, server certificate (TLS 1.3), HTTP method/path/query, headers, cookies, body, URL fragment) × 3 columns (browser, passive observer, TLS endpoint). Each cell is `visible`, `encrypted` or `not-sent`, with a one-line reason and the scope assumption it depends on. Also: three variants (ECH, encrypted DNS, CDN termination) and the brief's ACCURACY / SCOPE / EXAMPLE bullets as ids `A01–A11`, `S01`, `E01–E04`. |
| `scope-notes.md` | The assumptions every cell depends on (TLS 1.3 over TCP, plain DNS, no VPN/proxy, no ECH, no resumption/0-RTT, trusted browser and endpoint, passive on-path observer) and what changes under ECH / encrypted DNS / CDN termination. |
| `accuracy-checklist.md` | Scene by scene, which scene satisfies each accuracy id and how. |
| `url-parts.mjs` | Tiny module using only the WHATWG `URL` API: splits a URL into resolution name, request target (path + query) and fragment, and reports whether the fragment is in the request target (it is not). |
| `test.mjs` | `node:test` suite: URL splitting (with a known-positive control), matrix schema, the A01/A02 invariants (observer never sees content or the TLS 1.3 certificate), variant consistency, checklist coverage of every accuracy id, script sim tags and word count, scope-notes content. |
| `demo.mjs` | Writes `evidence.json`: the parsed URL parts, the request line, tallies per column, and which rows the observer sees / cannot read / never receives. |

The destination address on screen, `192.0.2.10`, is an RFC 5737 documentation address used as a label.

## How to run

```
node --test test.mjs
node demo.mjs          # writes evidence.json
```

## Executed

```
# tests 18
# suites 0
# pass 18
# fail 0
```

`node demo.mjs`:

```
URL           https://example.test/account?tab=billing#history
resolve       example.test  (port 443)
request line  GET /account?tab=billing HTTP/1.1
fragment      #history  in request target? false
who        visible  encrypted  not-sent
browser    11       0          0
observer   5        5          1
endpoint   9        0          2
observer sees:      DNS question, Destination IP, Port, Timing / volume, SNI in ClientHello
observer encrypted: Server certificate (TLS 1.3), HTTP method / path / query, Headers, Cookies, Body
observer not sent:  URL fragment
```

## Deliberate policies

- The matrix is **hand-authored** from protocol specifications (RFC 8446, RFC 6066, RFC 9110, RFC 1035, WHATWG URL), not derived from a capture. The tests check internal consistency and the brief's invariants, not the network.
- Every cell records the scope assumption it depends on, so a reader can see which cells flip under ECH, encrypted DNS, a VPN, or a CDN.
- The known-positive control in `test.mjs` places `history` in the query string and asserts it *is* then in the request target, so the "fragment absent" test cannot pass vacuously.

## Limitations and what is NOT tested

- No DNS, TCP, TLS or HTTP behaviour is executed or observed. The environment has no isolated network, no trusted HTTPS, and the brief forbids fabricating captures, so the episode is a labelled conceptual illustration throughout.
- Not covered: HTTP/3 over QUIC, TLS 1.2, session resumption, 0-RTT, OCSP stapling, client certificates, traffic-analysis attacks beyond the statement that sizes and timing do not by themselves reveal exact content.
- Record lengths and timings drawn in the video are shapes, not measurements.
- HTTPS is not claimed to prevent phishing, compromised endpoints, or server-side logging.
