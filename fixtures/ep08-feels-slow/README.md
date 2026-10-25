# EP08 fixture — "Why This Beautiful Website Feels Slow"

Two visually equivalent pages. The **before** page has two controlled bottlenecks that belong to two *different* timelines; the **after** page corrects both without changing what the user sees.

| | before/ | after/ |
|---|---|---|
| Hero image (above the fold, LCP candidate) | `assets/hero-large.png`, 4000×2250 lossless PNG, **12,173,721 bytes** | `assets/hero-sized.webp`, 1600×900 WebP q80, **17,004 bytes** |
| Hero lazy-loaded? | No (deliberately) | No (deliberately) |
| Click handler ("Show related counts") | `handler-before.mjs` — O(n²) nested scan, synchronous | `handler-after.mjs` — O(n) histogram, synchronous |
| Handler output | identical (digest `ec44c9fd` on the seeded catalogue) | identical |

## Files

- `make-assets.mjs` — generates both images deterministically (gradient sky, sun, hills, seeded noise) with Python PIL + numpy via `child_process`; writes `assets/asset-sizes.json`. No third-party assets.
- `data.mjs` — seeded 20,000-item synthetic catalogue (Mulberry32, seed 8) and a digest helper. Shared by the pages and the Node tests.
- `handler-before.mjs` / `handler-after.mjs` — the two interaction implementations, importable from Node and from the pages.
- `before/index.html`, `after/index.html` — the pages. Same markup except asset, handler and label (asserted by a test).
- `serve.mjs` — loopback static server, `127.0.0.1` only, ephemeral port by default (`node serve.mjs 4508` for a fixed port). Sends `Cache-Control: no-store`.
- `measure.mjs` — asset byte sizes (on disk and as served) and handler CPU time in Node, ≥5 runs, median + raw.
- `test.mjs` — regression tests (below). `demo.mjs` → `evidence.json`.
- `test-conditions.md` — what was measured here, under which conditions, and the exact browser-lab procedure that was **not** run.

## Run

```
node fixtures/ep08-feels-slow/make-assets.mjs   # ~20 s; needs python3 + Pillow + numpy
node --test fixtures/ep08-feels-slow/test.mjs
node fixtures/ep08-feels-slow/demo.mjs          # writes evidence.json
node fixtures/ep08-feels-slow/serve.mjs 4508    # then open /before/ and /after/ in a browser
```

## Executed

`node --test fixtures/ep08-feels-slow/test.mjs`:

```
# tests 7
# pass 7
# fail 0
```

Tests: identical handler output on the seeded catalogue and on small edge cases; after image smaller in bytes than before (and before > 1 MB so the flaw is observable); **known-positive control** — before handler median > 100 ms in Node and after median faster, same digest; hero `<img>` present once, with intrinsic dimensions, and **not** `loading="lazy"` in either page; markup equivalence; loopback server serves pages and modules and refuses non-allow-listed files.

`node fixtures/ep08-feels-slow/demo.mjs` (recorded run, Node v22.23.4, 2× Intel Xeon 2.80 GHz, shared container):

| variant | hero bytes | handler median (7 runs) | raw ms |
|---|---|---|---|
| before | 12,173,721 | **4253.02 ms** | 4299.32, 4921.91, 4253.02, 3555.42, 3288.51, 3891.63, 4488.83 |
| after | 17,004 | **1.40 ms** | 9.24, 1.35, 1.31, 29.84, 1.35, 1.4, 21.4 |

Handler figures are **fixture-measured handler CPU time in Node, NOT browser INP**. Re-running will produce different absolute values; `evidence.json` holds the run the video quotes.

## Deliberate policies

- The hero is the expected largest contentful element and sits above the fold, so it is **not** lazy-loaded in either variant; `fetchpriority="high"` and intrinsic `width`/`height` are set in both.
- The after handler is still synchronous. The repair is a cheaper algorithm with identical output, not a spinner, a `setTimeout`, or an animation that hides the wait.
- `no-store` on every response so that a browser cold-load test is really cold.

## Limitations / what is NOT tested

- **No browser ran here.** No LCP, no Event Timing, no INP, no network- or CPU-throttled result exists. `test-conditions.md` gives the exact procedure (same browser, viewport, CPU throttle, network preset, cold vs warm defined separately, ≥5 trials, median, initial trace first) for a local run.
- Node handler timing is an upper-bound proxy for the click's main-thread *work*; it is not a user-perceived latency.
- Byte size is a file property, not a load time. On loopback without throttling even 12 MB arrives in milliseconds; the loading comparison only becomes meaningful under the throttled lab conditions described.
- One asset and one handler were corrected. Fonts, CSS, scripts and other interactions were not examined.
- The container is not CPU-pinned; raw handler runs vary by ±20 %. The median is reported and the raw list is kept.
