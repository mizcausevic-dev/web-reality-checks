SEO title (≤60 chars): Initial HTML vs Rendered DOM: What Your Server Really Sends
Meta description (≤155 chars): Two pages look identical in a browser. One server response carries the whole article, the other a loading shell. The fixture, the captures, the 11 tests.
Slug: initial-html
Primary keyword: initial HTML vs rendered DOM   Secondary keywords (3–5): client-side rendering SEO, static site generation, server response HTML, headless Chrome DOM capture, JavaScript rendering
Medium tags (5): Web Development, JavaScript, SEO, Frontend, Software Engineering

# The Browser Shows Your Page. What Does the Server Send?

![Side-by-side raw HTML of two routes for the same article: the statically generated response holds the h1, four h2 headings, six paragraphs and three links; the client-rendered response holds a "Loading article…" line and one script tag](../hero.png)

Open two URLs in a browser and you see the same article, headings, links and title. Fetch the same two URLs with plain HTTP and one response contains all 198 article words while the other contains none of them, because the article arrives later, through a script.

This is episode 19 of Web Reality Checks. Nothing in it is broken, and that is the point. The episode is about two artifacts people routinely confuse: the initial HTML the server sent, and the eventual DOM the browser built from it. They can be identical or almost unrelated, and a screen cannot tell you which.

## What actually happens

A page in a browser is the result of a pipeline. The server sends a response body. The browser parses it into a DOM. If the body references scripts, the browser fetches and executes them, and those scripts may fetch more data and rewrite the DOM. The screen shows the end of that pipeline. The HTTP response is the start.

A client-rendered page puts almost nothing at the start: a container, a placeholder line, a `<script>` tag. The script runs, requests the article as JSON, and inserts it. Until it runs, the DOM is the shell and nothing more.

A statically generated page puts everything at the start. At build time the generator ran the rendering logic and wrote the result into the HTML file. The response body already contains the headings, paragraphs and `href` attributes, so no script is shipped.

This matters because not every consumer of your URL is a browser running scripts to completion. Some tools read the raw response. Some execute JavaScript, sometimes under constraints you do not control. Know which artifact a tool is looking at before drawing a conclusion from it.

One accuracy note up front: Google can execute JavaScript. A browser with scripts disabled is not a Googlebot simulator, and a plain HTTP fetch is not a search-engine rendering test. The captures here show what each response contains on its own. They say nothing about indexing or ranking.

## The fixture

`fixtures/ep19-initial-html/` builds one synthetic article (`article.json`, a fictional harbor tide clock) into two variants from the same `renderArticle()` function. `build.mjs` writes both:

```js
export const csrHtml = () => head('csr') + `<main id="app"><p class="shell">Loading article…</p></main>
<script src="/csr/app.js"></script>
` + foot;

export const ssgHtml = () => head('ssg') + `<main id="app">
${renderArticle(article)}</main>
` + foot;
```

The `head()` is identical for both: same `<title>`, `<meta name="description">` and `<meta name="robots">`. The CSR variant ships `renderArticle` to the browser by serializing the function's source into `app.js`, so both DOMs are built from the same markup rules. The client side of that file:

```js
(async () => {
  const root = document.getElementById('app');
  try {
    const r = await fetch('/article.json');
    if (!r.ok) throw new Error('article.json ' + r.status);
    const a = await r.json();
    root.innerHTML = renderArticle(a);
    document.documentElement.setAttribute('data-rendered-by', 'client-js');
  } catch (e) {
    root.innerHTML = '<p class="shell">Could not load the article (' + String(e && e.message) + ').</p>';
  }
})();
```

The `data-rendered-by="client-js"` marker proves the DOM was populated by the script.

`server.mjs` is a loopback static server with deliberate policies. Exact paths only. A directory URL without a trailing slash gets a 301 to the slash form, so there is one canonical URL per page. Every missing route is an explicit 404 with an `X-Robots-Tag: noindex` header, and there is no SPA fallback: a development server that answers every unknown path with `index.html` turns a missing page into a 200 shell, and the fixture refuses that so a wrong URL is a visible 404 on both variants.

The robots decision is documented and intentional. Both variants carry `<meta name="robots" content="noindex">`, with the value read from `article.json` so it lives in one place rather than two templates. This is a teaching fixture, not a page meant to be found; if deployed by accident it should not enter an index. Nothing in the fixture tests how any crawler treats that directive.

`inspect.mjs` does two things. `inspectRaw()` fetches both routes with `fetch()` and measures the body: article paragraphs, h1 and h2 counts, `href` list, title, description, robots, script tags, loading shell. `captureDom()` drives the Remotion-bundled `chrome-headless-shell` over the DevTools protocol: `Target.createTarget`, `Page.navigate`, wait for `Page.loadEventFired`, settle 1.5 s, then `Runtime.evaluate(document.documentElement.outerHTML)`. JavaScript-off runs send `Emulation.setScriptExecutionDisabled` first, in a fresh temporary profile. Measurement is string and regex counting of known synthetic content, not a DOM parser.

## The test that proves it

`node --test fixtures/ep19-initial-html/test.mjs` reports `# tests 11  # pass 11  # fail 0  # skipped 0` (local synthetic fixture). The names:

- `both article routes return 200 text/html`
- `missing routes return an explicit 404 on both variants (no SPA fallback)`
- `directory URL without trailing slash redirects to one canonical URL`
- `path traversal is refused`
- `KNOWN-POSITIVE CONTROL: raw CSR HTML lacks the article text, headings and links`
- `raw SSG HTML contains the whole article in the initial response`
- `both raw responses carry identical title, description and robots metadata`
- `SSG link hrefs equal article.json hrefs; CSR data file carries the same hrefs`
- `CSR shell references a real script and the script fetches /article.json`
- `rendered DOM with JavaScript: CSR and SSG contain the same article, headings and hrefs`
- `rendered DOM with JavaScript disabled: CSR shows the shell only, SSG still shows the article`

The control is the fifth test. It asserts that the raw CSR response has zero article paragraphs, zero article headings, zero h1, zero links, exactly one script tag and the loading shell. Its assertion message says why: "the shell must not contain the article or the comparison proves nothing." The two DOM tests skip, not fail, if the bundled Chrome is absent. In this run Chrome was present (HeadlessChrome/157.0.8080.0) and all eleven ran.

## The repair

There is no bug in this fixture, so "repair" means the practice the episode recommends, in two parts.

First, if a page has no client interactivity, put its content in the initial HTML. The SSG variant ships zero script tags and no hydration bundle, because a static article has nothing to re-attach. Hydration is for pages that need client behavior.

Second, inspect both artifacts and label which one you are reading. `inspect.mjs` saves `captures/raw-*.html` (what the server sent) and `captures/dom-*.html` (what this headless Chrome built) side by side. When a tool reports what a page "contains," ask which of the two it looked at.

## Retest

From `evidence.json` (local synthetic fixture):

- Raw CSR, `GET /csr/article/`: 200, 727 bytes, 0 of 6 paragraphs, 0 of 198 words, 0 h1, 0 h2, 0 links, 1 script tag, loading shell present.
- Raw SSG, `GET /ssg/article/`: 200, 2520 bytes, 6 of 6 paragraphs, 198 of 198 words, 1 h1, 4 h2 (three sections plus "Related"), 3 links, 0 script tags.
- DOM CSR, JavaScript on: 6 of 6 paragraphs, 4 h2, 3 links, `data-rendered-by="client-js"` present, requests for `/csr/article/`, `/csr/app.js` and `/article.json`.
- DOM SSG, JavaScript on: 6 of 6, 4 h2, 3 links, one request.
- DOM CSR, JavaScript off: 0 of 6 paragraphs, 0 links, shell only.
- DOM SSG, JavaScript off: 6 of 6, 4 h2, 3 links.
- Missing routes `/csr/missing/` and `/ssg/missing/`: 404 on both, no shell served.
- Both raw responses: identical title and description, `robots=noindex`. SSG hrefs equal the `article.json` hrefs (`/guides/tide-tables/`, `/guides/clock-maintenance/`, `/about/`); the CSR data file carries the same three.

With JavaScript on, the two DOMs end in the same place. The difference lives entirely in the first row versus the second.

## What this does not prove

- A plain HTTP fetch is not a complete search-engine rendering test.
- A browser with JavaScript disabled is not a Googlebot simulator. Google can execute JavaScript.
- Static generation does not guarantee indexing or rankings. Server-rendered pages can still enter a rendering stage. Nothing here measures crawling, indexing or ranking; no rendering delays, indexing timelines or Search Console results are claimed or simulated.
- The DOM captures establish how this headless Chrome handled these pages after a fixed 1.5 s settle, not how every crawler handles any page.
- Hydration was not implemented because the static page has no client interactivity. A page with interactivity would need a different comparison.
- Measurement is string and regex counting of known synthetic content. Loopback only, no HTTPS, no real network, no caching behavior tested.

## Launch checklist

1. For each page type, save the raw HTTP response and the rendered DOM as separate, labeled files. Never report one as the other.
2. Decide which content must be in the initial HTML (text, headings, `href` links, title, description) and write a plain-HTTP test that asserts it.
3. Keep a known-positive control: a variant you know lacks the content, so the test can be seen to fail.
4. If a page has no client interactivity, consider generating it statically and shipping no script.
5. Serve explicit 404s for missing routes. Disable any dev-server SPA fallback before inspecting, or every typo looks like a 200 shell.
6. Enforce one canonical URL per page (the fixture uses a 301 to the trailing-slash form).
7. Write the robots decision down, source it from one place, and test that both variants carry the same value.
8. When a crawler or SEO tool reports a problem, ask which artifact it read before changing the rendering strategy.

## FAQ

**What is the difference between initial HTML and the rendered DOM?**
Initial HTML is the response body the server sends for a URL. The rendered DOM is the document a browser holds after parsing that body and running any scripts it references. They are the same only when no script changes the page. In this fixture the CSR response holds a shell and the DOM holds the article.

**Does a browser with JavaScript disabled show what Googlebot sees?**
No. Google can execute JavaScript. Disabling scripts shows what the response contains on its own, which is useful, but it is not a Googlebot simulator and says nothing about indexing or ranking.

**Does static HTML guarantee my page gets indexed?**
No. Static generation puts content in the initial response, so a plain fetch sees it. Indexing and ranking are separate decisions, and server-rendered pages can still enter a rendering stage. Nothing in this episode measures crawl, index or rank.

## Watch the episode

[YouTube link]

- 00:00 Two pages that look identical
- 00:09 Raw HTML, before any script runs
- 00:29 The script populates the client-rendered page
- 00:48 JavaScript off: shell versus article
- 01:06 Content already present in the generated response
- 01:20 Crawl, render, index, rank (conceptual illustration)
- 01:37 Initial HTML and the eventual DOM are different artifacts

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Initial HTML and the eventual DOM are different artifacts. Inspect both, and know which one you are looking at.

Miz Causevic, Kinetic Gain LLC
