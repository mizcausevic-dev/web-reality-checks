# EP19 distribution kit: The Browser Shows Your Page. What Does the Server Send?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep19-initial-html/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `The Browser Shows Your Page. What Does the Server Send?` (55) : the series title; names the gap between screen and response in one line.
2. `Same Page, Two Responses: Initial HTML vs the DOM` (49) : states the mechanism; matches how engineers search for this topic.
3. `0 of 198 Words Were in the HTML. The Page Looked Fine.` (54) : the fixture's own number as the hook; the contrast is the story.
4. `Initial HTML and the DOM Are Different Artifacts` (48) : the closing line as a thesis; good for shares and bookmarks.
5. `Your Page Says "Loading". What Did the Server Actually Send?` (60) : for people who have seen the symptom and want the cause.
6. `Turning Off JavaScript Is Not a Googlebot Test` (46) : leads with the accuracy point; invites the audience that gets this wrong.

### Description

Two pages look identical in a browser. One server response holds the whole article. The other holds a loading line and one script tag.

In this episode we build one synthetic article (a fictional harbor tide clock) two ways on a laptop. The statically generated version puts the article in the HTML at build time and ships no script. The client-rendered version ships an application shell plus a small script that fetches the article as JSON and inserts it. Both share the same title, description, robots tag, heading structure and links, and both are built from the same rendering function.

Then we inspect both artifacts. Raw HTTP fetch: the generated response carries 1 h1, 4 h2, 6 paragraphs, 3 links and all 198 article words; the client-rendered response carries 0 of 198 words and one script tag. Headless Chrome with JavaScript on: both DOMs end with the same 6 paragraphs and 3 links, and the client page shows its data-rendered-by marker and the /article.json request. JavaScript off in a clean profile: the generated page still shows the article; the client-rendered page stays at "Loading article…". Missing routes return explicit 404s on both variants, no SPA fallback. 11 tests, 11 pass, including a known-positive control that asserts the raw client-rendered HTML lacks the article.

What this does not show: a browser with scripts off is not a Googlebot simulator, and Google can execute JavaScript. A plain HTTP fetch is not a search-engine rendering test. Static HTML guarantees neither indexing nor rankings, and nothing here measures crawl, index or rank. Both fixture pages carry a deliberate robots noindex because they are teaching material.

Chapters
00:00 Two pages that look identical
00:09 Raw HTML, before any script runs
00:29 The script populates the client-rendered page
00:48 JavaScript off: shell versus article
01:06 Content already present in the generated response
01:20 Crawl, render, index, rank (conceptual illustration)
01:37 Initial HTML and the eventual DOM are different artifacts

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep19/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

initial html, rendered dom, client-side rendering, static site generation, server response, javascript rendering, headless chrome, devtools protocol, seo, technical seo, googlebot, crawl render index rank, web development, frontend, node.js, no spa fallback, 404 handling, robots noindex, web performance, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with one synthetic article, noindex on purpose. A browser with scripts off is not a Googlebot simulator; Google can run JS. Nothing here measures indexing or ranking. Fixture, tests, source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Same article, two routes. In a browser you cannot tell them apart. Fetch the raw HTML: one has 198 of 198 article words, the other has 0.

Episode 19 of Web Reality Checks: the initial HTML the server sent and the eventual DOM the browser built are different artifacts.

One synthetic article, generated two ways from the same renderArticle() function. SSG puts it in the HTML at build time, zero script tags. CSR ships a shell plus one script that fetches /article.json and inserts the article. Same title, description, robots, headings and hrefs on both.

Captures (local synthetic fixture):
- Raw CSR: 0/6 paragraphs, 0 links, 1 script.
- Raw SSG: 6/6 paragraphs, 4 h2, 3 links, 0 scripts.
- Headless Chrome, JS on: both DOMs end at 6/6 and 3 links.
- JS off: SSG still 6/6; CSR stays at "Loading article…".

Worth stealing: no SPA fallback (missing routes are explicit 404s), and a robots decision sourced from one place and carried by both pages.

Not proven: JS-off is not a Googlebot simulator, Google can execute JavaScript, a plain fetch is not a rendering test, and static HTML guarantees neither indexing nor rankings.

11 tests, 11 pass, with a known-positive control.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #TechnicalSEO #JavaScript

### Post 2: non-technical leaders

Your site looks fine in a browser. A vendor's tool says a page is "empty." Both are right.

Episode 19 of Web Reality Checks publishes one made-up article two ways. In the first, the server sends the whole article. In the second, it sends a placeholder and a small program that fetches the article and fills the page in. On screen, identical. In the raw response, 198 words versus none (local synthetic fixture).

A dish that arrives plated versus one assembled at your table: same meal, but a photo taken as plates leave the kitchen shows a dish in one case and an empty plate in the other.

Five questions for your team:
1. Have we saved the raw response and the finished page as two files and compared them?
2. Which content is in the response before any script runs, and was that a decision?
3. Where a page has nothing interactive, why send a script at all?
4. Does a missing page return a real 404, or a success code with an empty shell?
5. Is our robots setting written down, applied to every version, and tested?

Not claimed: that one approach loses rankings. Google can run JavaScript; nothing here measures indexing or ranking.

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #SEO #Leadership

## X/Twitter thread

1/ Two URLs. Same article, same headings, same links, same title. In a browser you cannot tell them apart. Fetch the raw HTML: one carries 198 of 198 article words, the other carries 0. Episode 19 of Web Reality Checks. Thread.

2/ Page A is statically generated: the article is written into the HTML at build time. Zero script tags. Page B is client-rendered: the HTML is a shell with "Loading article…" and one script tag. The script fetches /article.json and inserts the article.

3/ Raw HTTP fetch (local synthetic fixture): A is 2520 bytes, 1 h1, 4 h2, 6/6 paragraphs, 3 links. B is 727 bytes, 0 h1, 0 h2, 0/6 paragraphs, 0 links, 1 script. Same title, description and robots tag on both.

4/ Headless Chrome over the DevTools protocol, JS on: both DOMs end with 6/6 paragraphs and 3 links. B shows data-rendered-by="client-js" and a request for /article.json. The article exists, but only in the browser's result.

5/ JS off in a clean profile: A still shows the full article. B stays at "Loading article…". Careful: a browser with scripts off is NOT a Googlebot simulator. Google can execute JavaScript. This shows what each response contains on its own, nothing more.

6/ Separate four things a search engine does: crawl fetches, render may run scripts, index stores, rank shows. This test touches crawl and a slice of render. Static HTML guarantees neither indexing nor rankings. No timelines, no Search Console results, none claimed.

7/ Two fixture policies worth copying: missing routes are explicit 404s on both variants (no SPA fallback, so a typo cannot look like a 200 shell), and the robots decision lives in one data file and is carried by both pages. 11 tests, 11 pass, with a known-positive control.

8/ Initial HTML and the eventual DOM are different artifacts. Inspect both, and know which one you are looking at. Fixture, saved captures, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A small Node fixture that serves one article as both client-rendered and statically generated HTML, with saved raw responses, headless-Chrome DOM captures (JS on and off) and route/status tests

**First comment:** This is a deliberately constructed local fixture with one synthetic article, both variants built from the same render function and both carrying a deliberate robots noindex, so it is not a finding about any real site or framework. The captures show that the raw CSR response has 0 of 198 article words while the raw SSG response has all of them, that both DOMs match with JavaScript on, and that the CSR page stays at its loading shell with JavaScript disabled; the README is explicit that a JS-off browser is not a Googlebot simulator, that Google can execute JavaScript, and that nothing here measures crawling, indexing or ranking. The suite is 11 tests including a known-positive control, and the limits (loopback only, regex measurement, one headless Chrome with a fixed settle) are listed.

## Short-form hook lines (≤ 12 words)

1. Same page in the browser. 198 words versus zero in the HTML.
2. The server sent "Loading". The script sent the article.
3. Turning off JavaScript is not a Googlebot test.
4. Initial HTML and the DOM are different artifacts.
5. Static HTML guarantees no indexing and no rankings. It shows content.

## Alt text

**hero.png:** Side-by-side raw HTML of two routes for the same synthetic article. The statically generated response on one side holds the h1, four h2 headings, six paragraphs and three links; the client-rendered response on the other holds a "Loading article…" line and a single script tag, with a counter reading 0 of 198 article words.

**thumbnail.png:** Episode thumbnail for "The Browser Shows Your Page. What Does the Server Send?" showing two identical-looking article pages above two very different raw HTML responses, one full of text and one nearly empty except for a loading line and a script tag.
