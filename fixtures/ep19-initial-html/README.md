# EP19 fixture — initial HTML vs eventual DOM

One synthetic article (`article.json`, a fictional harbour tide clock) generated in two forms by `build.mjs`:

| variant | route | initial HTML contains |
|---|---|---|
| **CSR** client-rendered | `/csr/article/` | an application shell (`<main id="app">Loading article…</main>`) + `<script src="/csr/app.js">`. The script fetches `/article.json` and inserts the article. |
| **SSG** statically generated | `/ssg/article/` | the whole article: `<h1>`, three `<h2>` sections, six paragraphs, a "Related" nav with three `<a href>` links. No script. |

Kept **equivalent** by construction: `<title>`, `<meta name="description">`, `<meta name="robots">`, heading structure, ordinary `<a href>` links, article text, 200 for the valid route, 404 for missing routes. Both variants are built from the *same* `renderArticle()` function — at build time for SSG, serialised into `app.js` for CSR — so the eventual DOMs are built from identical markup rules. Only *when* the article enters the document differs.

Static generation was chosen over a server-rendering framework on purpose: a non-interactive article needs no hydration, so none is shipped.

## Files
- `article.json` — the synthetic article (title, description, robots, sections, links).
- `build.mjs` — writes `dist/csr/article/index.html`, `dist/csr/app.js`, `dist/ssg/article/index.html`, `dist/article.json`.
- `server.mjs` — loopback static server (127.0.0.1, ephemeral port). Exact paths only. Directory → `index.html`. No trailing slash → `301` to the slash form. Everything else → explicit `404` (HTML body, `X-Robots-Tag: noindex`). **No SPA fallback.** GET/HEAD only. Traversal refused.
- `inspect.mjs` — `inspectRaw()` fetches the raw HTML of both routes and measures what the initial response contains; `captureDom()` drives the Remotion-bundled headless Chrome over the DevTools protocol (Node's built-in `WebSocket`, zero dependencies) and returns `document.documentElement.outerHTML` after load, with JavaScript enabled or disabled via `Emulation.setScriptExecutionDisabled` in a fresh temporary profile. Writes `captures/raw-*.html`, `captures/dom-*.html`, `inspection-results.json`.
- `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep19-initial-html/test.mjs
node fixtures/ep19-initial-html/demo.mjs       # writes evidence.json + captures/
node fixtures/ep19-initial-html/inspect.mjs    # writes inspection-results.json + captures/
node fixtures/ep19-initial-html/server.mjs     # leaves a server running for manual inspection
```
The DOM tests look for Chrome at `video/node_modules/.remotion/chrome-headless-shell/.../chrome-headless-shell` (override with `EP19_CHROME=/path/to/chrome`). If it is absent they are **skipped**, not failed, and `demo.mjs` records the DOM captures as blocked.

## Executed
`node --test fixtures/ep19-initial-html/test.mjs`
```
# tests 11
# pass 11
# fail 0
# skipped 0
```
`node fixtures/ep19-initial-html/demo.mjs` → `evidence.json`:

| capture | status | bytes | article paragraphs | h2 | links |
|---|---|---|---|---|---|
| raw CSR (HTTP GET) | 200 | 727 | 0/6 | 0 | 0 |
| raw SSG (HTTP GET) | 200 | 2520 | 6/6 | 4 | 3 |
| DOM CSR, JS on | 200 | 2567 | 6/6 | 4 | 3 |
| DOM SSG, JS on | 200 | 2503 | 6/6 | 4 | 3 |
| DOM CSR, JS off | 200 | 710 | 0/6 | 0 | 0 |
| DOM SSG, JS off | 200 | 2503 | 6/6 | 4 | 3 |

Missing routes: `/csr/missing/` → 404, `/ssg/missing/` → 404, neither serves the shell. Both raw responses carry the identical title, description and `robots=noindex`. Raw CSR contains zero of the one hundred and ninety-eight article words; raw SSG contains all of them. The CSR DOM capture with JS on shows the `/article.json` request and `data-rendered-by="client-js"`.

Rendered-DOM capture method: `chrome-headless-shell --headless=new --no-sandbox --no-zygote --disable-gpu --disable-dev-shm-usage --no-proxy-server --user-data-dir=<tmp> --remote-debugging-port=0 about:blank`, then CDP `Target.createTarget` → `Page.navigate` → wait `Page.loadEventFired` + 1.5 s → `Runtime.evaluate(document.documentElement.outerHTML)`. (`--dump-dom` alone hung in this container, so the DevTools protocol is used instead.) Chrome version reported: `HeadlessChrome/157.0.8080.0`.

## Robots and indexing (deliberate)
Both variants carry `<meta name="robots" content="noindex">` and the 404 page carries `X-Robots-Tag: noindex`. The value is data (`article.json → robots`) so it is the same in both templates and can be flipped in one place. Reason: this is a local teaching fixture about *what HTML contains*, not a page meant to be found; if it were ever deployed by accident it should not enter an index. Nothing in this fixture tests how any crawler treats that directive.

## Deliberate policies
- **No SPA fallback.** A development server that answers every unknown path with `index.html` turns a missing page into a 200 shell; this fixture refuses that so a wrong URL is a visible 404 on both variants.
- **One canonical URL per page** (trailing slash), enforced by 301.
- **Same renderer for both variants**, so differences are attributable to timing, not templates.
- **No hydration.** The static page is non-interactive; shipping a client bundle to re-attach nothing would be waste.

## What this does and does not show
- Shows: the initial HTTP response and the eventual DOM are different artefacts; for the CSR page the article exists only in the second.
- A plain HTTP fetch is **not** a complete search-engine rendering test.
- A browser with JavaScript disabled is **not** a Googlebot simulator. **Google can execute JavaScript.**
- Static generation does **not** guarantee indexing or rankings, and server-rendered pages can still enter a rendering stage.
- Nothing here measures crawl, render, index or rank; no delays, timelines or Search Console results are claimed or simulated.
- The captures establish how **this** headless Chrome handled **these** pages; not how every crawler handles any page.
- Measurement is string/regex counting of known synthetic content, not a DOM parser.

## Not tested
Any real crawler; any network other than loopback; HTTPS; caching headers' effect on crawlers; `X-Robots-Tag` vs meta precedence; large articles; error handling when `/article.json` is slow (the client renderer only handles a non-OK status).
