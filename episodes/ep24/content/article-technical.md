SEO title (≤60 chars): Shared Cache Leak: Why Bob Saw Alice's Dashboard
Meta description (≤155 chars): A custom response cache keyed by path only served Alice's dashboard to Bob. The fixture, the control tests, the bypass-and-purge repair and its limits.
Slug: shared-cache-leak
Primary keyword: shared cache leak   Secondary keywords (3–5): cache key design, personalized content caching, Cache-Control private no-store, application cache vs CDN, cache poisoning between users
Medium tags (5): Web Security, Caching, Node.js, Software Engineering, Backend Development

# Why Did This Dashboard Show Someone Else's Name?

![Bob is signed in as Bob, loads /dashboard, and the response reads "Welcome back, Alice" with Alice's email, served from a cache HIT](../hero.png)

Bob signed in with his own account, opened the dashboard, and the page said "Welcome back, Alice." His session was correct. The page came out of a shared cache slot that was keyed by the request path and nothing else, so it was never rendered for him at all.

This is episode 24 of Web Reality Checks. It is a deliberately flawed in-process application cache in a local fixture with synthetic users. It is not a CDN incident, and nothing here shows that CDNs or browsers cache authenticated responses by default.

## What actually happens

A response cache answers one question: has this request been seen before? It reduces each request to a key and uses the key to find a stored response. Two requests with the same key are treated as the same request, and the second gets the first one's bytes. The key is a definition of equivalence.

If the response depends on who is asking, then the identity has to be part of that definition, or the cache must not store the response. In this fixture it is neither. The route authenticates first, which is correct: Bob is Bob. Then it builds the key from `url.pathname`, which is `/dashboard` for everyone. Alice's request misses, renders her page and stores it. Bob's request arrives with a valid session, produces the same key, hits the slot and receives Alice's stored payload. Nothing is rendered for Bob. Identity is verified, then ignored at the moment the payload is chosen.

The tempting fix is `Cache-Control: private, no-store`. That header is an instruction to caches that implement it, and a hand-written `Map` implements nothing unless you wrote code to read it. The fixture includes that case as a control.

## The fixture

`fixtures/ep24-shared-cache-leak/` is a loopback-only (`127.0.0.1`) Node 22 `node:http` server with zero npm dependencies. It has two synthetic users, Alice (`u_alice`, `alice@example.test`) and Bob (`u_bob`, `bob@example.test`), a server-side session table keyed by an opaque cookie, and a `ResponseCache` class that is the deliberately flawed piece. `GET /dashboard` runs in one of three modes: `flawed`, `flawed-with-header` and `corrected`. Each response carries `x-app-cache: HIT | MISS | BYPASS` and a monotonically increasing `renderSeq`, so a test can tell whether a payload was rendered for this request or replayed.

"Isolated browser contexts" are two independent cookie-jar client instances. They are not real browsers.

The flaw is one line:

```js
/** THE FLAW: the key is the request path. The user whose data fills the response is not in it. */
export const cacheKey = (url) => url.pathname;
```

And the flawed route, after authentication succeeds:

```js
const user = authenticate(req);
if (!user) return send(res, 401, hdr, {error: 'unauthenticated'});
const key = cacheKey(url);
const hit = cache.get(key); // note: the Cache-Control header is never consulted
if (hit) return send(res, hit.status, hit.headers, hit.body, 'HIT');
const body = JSON.stringify(render(user));
cache.set(key, {status: 200, headers: hdr, body, populatedBy: user.id});
return send(res, 200, hdr, body, 'MISS');
```

The `hit` branch returns before `render(user)` is called, so the authenticated user never influences the payload.

## The test that proves it

`node --test fixtures/ep24-shared-cache-leak/test.mjs` runs 18 tests and reports `# tests 18`, `# pass 18`, `# fail 0` (local synthetic fixture). Four of them are known-positive controls, which means they assert that the flaw is observable:

- `CONTROL: flawed cache gives Bob the page Alice populated (authentication was correct)`
- `CONTROL: the cache key is the path only; no identity is part of it`
- `CONTROL: order does not matter; whoever arrives first fills the slot for everyone`
- `CONTROL: Cache-Control does not repair custom code that ignores it (flawed server WITH the header still leaks)`

The first one asserts that `/whoami` resolves Bob's session to `u_bob`, that Alice's request is a `MISS`, that Bob's is a `HIT` with `viewer.id` equal to `u_alice`, and that both responses carry the same `renderSeq`. That last assertion is the sharpest evidence: "same rendered payload, not rendered for Bob." The third control shows whoever arrives first fills the slot for everyone.

From `evidence.json` (local synthetic fixture): Alice gets `200 MISS` with viewer `u_alice` and `renderSeq` 1. Bob gets `200 HIT` with viewer `u_alice`, greeting "Welcome back, Alice", email `alice@example.test`, and `renderSeq` 1, while `/whoami` for Bob returns `u_bob`. The cache holds one key, `/dashboard`, populated by `u_alice`. The cache counters read 2 reads, 1 hit, 1 write.

The fourth control is the one worth dwelling on. The flawed server runs again, this time sending `Cache-Control: private, no-store` on every response. Bob still gets a `HIT` with viewer `u_alice`, and the test asserts `app.cache.size` is 1: "the entry was stored despite no-store." A correct header on a response does not change what code upstream of the response did with it.

## The repair

The repair is a policy decision first and a code change second. The fixture removes the personalized page from the shared cache path entirely instead of trying to make the key identity-aware. The corrected route does four things on every request:

```js
const hdr = {'cache-control': 'private, no-store'};
const user = authenticate(req);
if (!user) return send(res, 401, hdr, {error: 'unauthenticated'}, 'BYPASS');
if (!authorize(user)) return send(res, 403, hdr, {error: 'forbidden'}, 'BYPASS');
return send(res, 200, hdr, render(user), 'BYPASS'); // never touches the shared cache
```

It authenticates (401), authorizes with `dashboard:read` (403), renders for the current user, and sends `private, no-store`, including on the 401 and 403 responses. The header is now backed by the code behind it, because nothing in the route can store the payload.

Bypassing the cache stops new leaks. It does not remove the old entry. `app.repair({purge: true})` switches a running app to the corrected mode and explicitly purges `/dashboard`. A test named `bypass alone leaves the old entry in memory; only the explicit purge removes it` asserts that after `repair({purge: false})` the slot is "unreachable by the route now, but still resident" and still contains `alice@example.test`. Unreachable entries holding personal data are still a liability.

The purge is asserted from both sides: before the repair the entry is present and the size is 1; after it the entry is gone and the size is 0; `purge()` returns `true`, then `false` on a second call; and `purgeLog` records the key `/dashboard` and the user who populated it, `u_alice`.

## Retest

The retest sends Alice, Bob, Alice, Bob through two independent cookie jars. From `evidence.json` (local synthetic fixture):

- All four responses are `200 BYPASS`, each with `cache-control: private, no-store`.
- Each viewer receives only their own id and greeting.
- The four `renderSeq` values are distinct (2 through 5), so every response was rendered for its request.
- The shared cache counters do not move across the retest: reads 2, hits 1, writes 1, purges 1, before and after.
- An unauthenticated request returns 401 with `private, no-store`, and 401 on the flawed server with a populated cache too.

Other tests cover interleaved requests, order independence and a revoked `dashboard:read` permission (403 on the next request).

## What this does not prove

- The retest uses cookie jars, not browsers. Browser cache, service workers, back/forward cache and storage partitioning are not exercised.
- No CDN, reverse proxy or RFC 9111 caching semantics are implemented or measured. `Cache-Control` is only checked as a header the fixture emits.
- Already-delivered responses are not retracted. The test `already-delivered responses are not retracted by the repair` shows Bob's client still holds the leaked body after the repair. A new header or a purge changes later responses only.
- `no-store` is asserted on this fixture's responses. It is not a claim that it removes every historical copy, log or browser artifact.
- `Vary: Cookie` is not a universal answer, and this fixture does not use `Vary`. Making a shared cache identity-aware would need its own authorization, partitioning, invalidation and data-classification decisions. None of that is built or tested here.
- Only `GET /dashboard` is repaired. There is no TTL, eviction, concurrency or multi-process behavior. Other personalized routes need the same review.

## Launch checklist

1. List every route whose response depends on who is asking, then list every cache that route can reach: in-process maps, framework caches, CDN, reverse proxy, browser.
2. For each shared cache, write down the key and check that every input that changes the response is in it, or that the route bypasses the cache.
3. Run authentication and authorization on every request, before and independent of any cache lookup.
4. Treat `Cache-Control` as an instruction to a specific implementation. Confirm each layer you rely on actually reads it.
5. Add a known-positive control: a deliberately flawed variant where user B gets user A's page, so the isolation test can fail.
6. Test with two independent sessions, interleaved, in both orders.
7. When you fix a leaking cache, purge the old entries explicitly and assert they are gone.

## FAQ

**Does a correct Cache-Control header stop an application cache from leaking?**
Not by itself. The header only works on code that reads it. In this fixture the custom cache never consults it, so the flawed server with `private, no-store` still gave Bob Alice's page. Fix the key or bypass the cache.

**Is Vary: Cookie the fix for personalized pages in a shared cache?**
Not universally. It adds the cookie to the key for caches that honor it, but this fixture does not use it, and an identity-aware shared cache still needs authorization, invalidation and data-classification decisions.

**How do I test a cache for cross-user leaks?**
Use two independent sessions, request the same URL in both orders, and assert each response carries only its own user's data. Add a rendered-sequence number to show whether a response was freshly rendered. Keep a flawed variant that the test must catch.

## Watch the episode

[YouTube link]

- 00:00 Alice and Bob load the same dashboard
- 00:11 Bob receives Alice's name, email and render number
- 00:27 The cache key is the path only
- 00:39 Authentication was right, the payload was wrong
- 00:54 The repair: bypass, private no-store, purge
- 01:06 Retest with two independent cookie jars
- 01:19 Each user receives only their own page
- 01:33 A cache key defines which requests are equivalent

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [I Deleted the Record. Why Is It Still Showing Up?](../../ep21/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A cache key defines which requests you treat as equivalent. If identity changes the answer, identity belongs in the definition, or the page does not belong in the cache.

Miz Causevic, Kinetic Gain LLC
