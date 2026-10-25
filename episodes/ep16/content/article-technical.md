SEO title (≤60 chars): Rate-Limited by Your Own Typing: Debounce, Guard, Retry
Meta description (≤155 chars): A search box fired a request per keystroke, hit 429, and retried at once. 17 requests, 12 rejections, stale results. The fixture, the tests, the repair.
Slug: rate-limit-429-search
Primary keyword: 429 too many requests   Secondary keywords (3–5): Retry-After header, debounce search input, AbortController fetch, fixed-window rate limiter, stale response guard
Medium tags (5): Web Development, JavaScript, API Design, Node.js, Software Engineering

# Your App Isn't Broken. It's Being Rate-Limited.

![A search box with "postgres" typed in; the request log shows eight keystroke requests followed by a cluster of 429 Too Many Requests responses with Retry-After headers the client ignored](../hero.png)

Type a word into the search box. Eight keystrokes, eight requests. Halfway through, the API answers 429 Too Many Requests, the client retries at once, and the list under the box settles on results for the letter "p" while the input reads "postgres". Nothing crashed; the app is being rate-limited by its own typing.

Episode sixteen of Web Reality Checks: one request budget, one client that spends it as fast as the keyboard can, one that coordinates. Every count below comes from a local synthetic fixture.

## What actually happens

A rate limiter is a budget with a clock attached. This fixture's limiter is a fixed window: five allowed requests per identity per ten-second window, aligned to multiples of ten seconds on the limiter's clock. The sixth request in a window is rejected with 429 and a `Retry-After` header stating the whole seconds until the window edge, rounded up, never zero. Two details are this fixture's design, not a law of HTTP: rejected requests do not consume allowance, and `Retry-After` is delta-seconds rather than an HTTP-date.

Put a search-as-you-type box in front of that. The flawed client sends one request per keystroke, so "postgres" is eight requests in under a second. Five are allowed, the sixth rejected. Then the flaw compounds: on 429 the client retries immediately, the window has not moved, and the retry is rejected again. The server said how long to wait. The client never read the header.

A second failure hides under the first. The fixture server answers shorter prefixes more slowly on purpose (`latencyFor("p")` is 1200 ms, `latencyFor("postgres")` is 150 ms), as real search backends often do, because a one-letter prefix matches more rows. Responses arrive out of order, and the flawed client applies whichever arrives last. The late answer for "p" overwrites "postgres".

The mechanism: a burst of requests is one intention, "find postgres", expressed eight times. A client that treats each keystroke as a transaction spends its budget on states nobody wanted, then more arguing with the limiter.

## The fixture

`fixtures/ep16-rate-limit/` is a loopback-only Node 22 search API with zero npm dependencies. `GET /login/:name` establishes a synthetic test identity behind an opaque cookie: a harness, not production authentication. The limiter is keyed by that server-established identity only; `X-Identity` headers and `?identity=` parameters are ignored. `GET /search?q=` returns 200, or 429 with `Retry-After` and `RateLimit-Remaining: 0`.

The limiter takes an injectable clock so boundary tests are deterministic. Its core:

```js
if (b.count < limit) {
  b.count += 1; // only allowed requests are counted
  return {allowed: true, limit, remaining: limit - b.count, windowStart, resetAt, retryAfterSeconds: 0};
}
// rejected: count unchanged. Round UP so a client that waits exactly Retry-After lands in the next window.
const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
return {allowed: false, limit, remaining: 0, windowStart, resetAt, retryAfterSeconds};
```

Both clients run the identical scripted typing: `TYPING_SCRIPT` types "postgres" one character per 80 ms. The flawed client's retry is the line that matters:

```js
if (r.status === 429) {
  state.rejected += 1;
  entry.retryAfter = r.headers.get('retry-after');
  // THE FLAW: retry at once. The server told us how long to wait; we did not read it.
  if (attempt < maxImmediateRetries) send(q, attempt + 1);
  else entry.gaveUp = true;
  return;
}
```

The retry loop is bounded at three per keystroke only so tests terminate. Real flawed clients may have no bound.

## The test that proves it

`node --test fixtures/ep16-rate-limit/test.mjs` reports `# tests 17  # pass 17  # fail 0` (local synthetic fixture). Five tests cover the limiter alone on a manual clock:

- `limiter: first five requests in a window are allowed, the sixth is rejected`
- `limiter: Retry-After is whole seconds until the window edge, rounded UP, never zero`
- `limiter: allowance resets exactly at the window edge`
- `limiter: rejected requests do not consume allowance (fixture policy)`
- `limiter: identities are independent`

Two tests are known-positive controls:

- `KNOWN-POSITIVE CONTROL: flawed client bursts on every keystroke, is rate-limited, retries at once and gets more 429s`
- `KNOWN-POSITIVE CONTROL: flawed client shows results for an old prefix (stale render)`

The first asserts 17 client requests (8 keystrokes plus 3 bounded retries for each of 3 rejected keystrokes), 12 rejections, exactly 5 server 200s, and that every retry was itself rejected while carrying `Retry-After` of at least 1. The second asserts the input reads `postgres` while `shownFor` does not. If a test cannot see the flaw, a pass on the fix proves nothing.

`demo.mjs` writes `evidence.json`. Run A, flawed client (local synthetic fixture): 17 requests, 9 retries, 12 × 429, 5 × 200, 5 stale renders, results shown for `p`.

## The repair

Four repairs, in order of how much each buys.

**Debounce.** A request leaves only after 250 ms of no typing. Eight keystrokes at 80 ms spacing collapse into one request. This alone removes every 429 in the scripted run.

**Sequence guard.** Every request carries a sequence number; a response is applied only if still the latest. The guard runs after headers and again after the body, because the input can change while the body streams.

**Abort.** When the input changes, the obsolete in-flight request is cancelled with `AbortController`. The fixture server logs the abort and stops its synthetic work as a courtesy. Do not rely on that: a browser abort means the client stopped waiting, not that a real server stopped processing or did not count the request. The sequence guard is the correctness.

**Respect Retry-After, bounded.** On 429 the client reads the header, rounds up to whole seconds, and schedules at most one retry of the still-current query. A missing header, which real 429s do not rule out, falls back to the client's own delay. A query change cancels the retry.

```js
onInput(text) {
  state.input = text;
  seq += 1;                                        // any response still in flight is now stale, even before the next request leaves
  cancelRetry();                                   // a retry for an old query must never fire
  abortCurrent('query changed');                   // in-flight result can no longer be shown
  if (debounceTimer) clock.clearTimeout(debounceTimer);
  debounceTimer = clock.setTimeout(() => { debounceTimer = null; if (text) send(text, 0); }, debounceMs);
},
```

`seq` increments on input, not on send: a response for the previous query is stale the moment the user types.

## Retest

From `evidence.json` (local synthetic fixture; `ms` values are virtual fixture time, 10 virtual ms per real ms):

- Run B, same scripted typing: 1 request, 0 × 429, 0 stale renders, results for `postgres`.
- Run B2, typing paused 600 ms after "post": 2 requests, 1 aborted by the client, 1 abort in the server log, 0 stale renders, results for `postgres`. With abort disabled, the server answers "post" and the guard drops it (`corrected client without abort support: the late "post" response is dropped by the sequence guard`).
- Run C, window pre-exhausted: first request 429 with `Retry-After: 3` at 7 725 ms, retry at 10 889 ms inside the next window, 200. Exactly one retry.
- Also tested: a second 429 is not retried; a pending retry is cancelled on a query change; `Retry-After: 2.2` becomes a 3 000 ms wait; a missing header uses the fallback delay.

Same typing, same server, same budget. Flawed: 17 requests, 12 rejected, wrong results. Corrected: 1, 0, right.

## What this does not prove

- Fixed-window accounting is this fixture's design. Sliding windows, token buckets and shared limits are out of scope.
- `Retry-After` is not guaranteed on real 429 responses, and may be delta-seconds or an HTTP-date. This fixture emits seconds; the HTTP-date path is parsed but not exercised end-to-end.
- A browser abort does not prove the server stopped processing or did not count the request.
- Debouncing lowers the client's request rate. It does not replace server-side rate limiting.
- This retry policy is for an idempotent read. Do not reuse it for state-changing requests without an idempotency mechanism (episode 15).
- The shared test identity is a harness, not production authentication.
- `fetch` and `AbortController` here are Node's; browser behavior is predicted, not run.

## Launch checklist

1. Every search-as-you-type input is debounced, with a named interval someone can defend.
2. Every query-driven view checks a response is still for the current query before rendering. Abort is an optimization on top.
3. On 429 the client reads `Retry-After`, parses both formats, rounds up, and has a fallback for a missing header.
4. Retries are bounded, and a test proves a second rejection does not produce a third attempt.
5. A scheduled retry is cancelled when its query is no longer wanted.
6. The retry policy is scoped to reads. Writes use an idempotency mechanism or do not auto-retry.
7. A known-positive control exists: a flawed client the suite catches bursting and rendering stale results.
8. Limiter boundaries (Nth allowed, N+1th rejected, reset at the edge, `Retry-After` never zero) are tested on a controlled clock.

## FAQ

**What does 429 Too Many Requests mean and how should a client handle it?**
The caller exceeded a request budget. Stop, read `Retry-After` if present, wait at least that long, and retry a bounded number of times. Retrying immediately spends more budget on the same rejection; here it turned 8 keystrokes into 17 requests.

**Does debouncing a search input fix rate limiting?**
It fixes the client's side by collapsing a burst of keystrokes into one request after a pause. It does not replace the server's limiter or handle out-of-order responses. Pair it with a sequence guard so an old response cannot overwrite a newer one.

**Should I trust the Retry-After header?**
Use it when present, round up to whole seconds, and never retry before it elapses. Do not assume it exists: real 429s need not send it, and it may be delta-seconds or an HTTP-date. Keep a fallback delay and a retry bound.

## Watch the episode

[YouTube link]

- 00:00 Eight keystrokes, eight requests, then 429
- 00:11 The fixed window: 5 per 10 s, per identity
- 00:26 Immediate retries, rejected again
- 00:37 Debounce the same typing
- 00:48 Stale results and the sequence guard
- 01:01 Abort the obsolete request
- 01:12 Respect Retry-After, at most one retry
- 01:25 Compare the request logs
- 01:37 Coordinate the work

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Coordinate the work. Don't just repeat it faster. A keystroke is not a transaction, and "wait" is information, not an error to retry past.

Miz Causevic, Kinetic Gain LLC
