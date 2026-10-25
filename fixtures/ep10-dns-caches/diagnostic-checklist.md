# Diagnostic checklist — "I changed a DNS record and the site broke"

Work the layers in order. Each layer has its own question, its own tool, and its own failure mode. A failure at one layer does not tell you anything about the layers below it until you have confirmed the layer above.

Use documentation addresses in notes and tickets; never paste production secrets into a bug report.

## 1. DNS resolution — *did the name resolve, and to what?*

A wrong answer is **not** a resolution failure. `NOERROR` with the wrong address is a successful lookup that points at the wrong place. Record which case you are in:

| Observation | Meaning |
|---|---|
| `NXDOMAIN` / `SERVFAIL` / timeout | resolution failed |
| `NOERROR`, wrong address | resolution succeeded, destination wrong (this episode) |
| `NOERROR`, correct address | DNS is not the problem for *this* resolver |

- [ ] Query the **authoritative** server directly (`dig @<ns> example.test A +norecurse`). This is the source of truth; it is what new lookups will receive.
- [ ] Query **each recursive resolver** your users actually use (ISP, corporate, public). Compare answers *and* remaining TTLs. Different caches hold different answers for different lengths of time.
- [ ] Check **AAAA** as well as A. A client with IPv6 may never use the A record you fixed; a stale or wrong AAAA record produces the same symptom.
- [ ] Note the TTL that was in force **when the wrong answer was cached**. Lowering the TTL afterwards does not shorten entries already cached with the old TTL.
- [ ] Remember that expiry only *permits* a new lookup. Nothing pushes the corrected record to resolvers or clients; the next query after expiry fetches it.
- [ ] Do not quote a single global "propagation time". Each cache recovers on its own schedule: its cache time plus the TTL it stored, plus whenever it next gets asked. Serve-stale, prefetch, browser and OS caches (not in this model) can stretch or shorten that.
- [ ] Record TTL is **not** the same as website-content caching (`Cache-Control`, CDN TTLs). A fresh DNS answer can still show old content, and vice versa.

## 2. Connectivity — *can this client reach that address at that port?*

Only meaningful once you know which address the client resolved.

- [ ] TCP connect to the **resolved** address on 80/443 (`nc -vz <ip> 443`, `curl -v --resolve example.test:443:<ip>`).
- [ ] If the resolved address is wrong, connectivity results describe the wrong host. Fix the record first, or test the intended address explicitly with `--resolve`.
- [ ] Check firewall / security-group rules on the intended host for the client's source range.
- [ ] Test from the client's network, not only from your workstation — different resolver, different route.

## 3. TLS — *does the certificate presented match the name?*

- [ ] Handshake against the intended address with SNI set (`openssl s_client -connect <ip>:443 -servername example.test`).
- [ ] Certificate covers `example.test` (and `www.` if used); chain complete; not expired.
- [ ] A certificate mismatch after a DNS change usually means the name now points at a host that was never provisioned for it. That is a DNS/destination problem showing up as a TLS error.

## 4. HTTP — *does the application answer correctly?*

- [ ] Status code and `Server` / `Via` headers from the intended origin (`curl -sI --resolve …`).
- [ ] Host-header routing: a shared host returns a default or wrong site when the `Host` does not match a configured vhost.
- [ ] Separate HTTP cache state (`Cache-Control`, `Age`, CDN cache keys) from DNS cache state before concluding "the fix did not propagate".
- [ ] Redirect loops between `www` and apex often appear after partial DNS changes (one record updated, the other not).

## Closing the incident

- [ ] Authoritative A **and** AAAA records verified correct.
- [ ] Every resolver you checked in step 1 now returns the correct answer, or you have recorded its `expiresAt` and the time you will re-check.
- [ ] Write down what was actually observed at each layer; do not back-fill a tidy story.
