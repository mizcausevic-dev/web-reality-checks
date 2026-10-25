SEO title (≤60 chars): Your Page Looks Fine. Is the Content in the Server Response?
Meta description (≤155 chars): Two pages look identical, but one server response holds the article and the other a loading line. Why a demo cannot show this, and what to ask your team.
Slug: initial-html
Primary keyword: client-side rendering risk   Secondary keywords (3–5): server response content, static site generation, website content visibility, SEO due diligence questions, JavaScript dependent content
Medium tags (5): Product Management, Startup, SEO, Web Development, Leadership

# The Browser Shows Your Page. What Does the Server Send?

![Side-by-side raw HTML of two routes for the same article: the statically generated response holds the h1, four h2 headings, six paragraphs and three links; the client-rendered response holds a "Loading article…" line and one script tag](../hero.png)

## The symptom as a business event

The new site is live. It loads, the articles read well, the links work. Then a partner or an SEO consultant runs a tool against a URL and reports that the page is "empty." Someone on your team opens the same URL and sees a full article. Both are telling the truth. They are looking at two different things.

That is the event this episode reproduces on a local fixture with one synthetic article about a fictional harbor tide clock, published two ways. In one version the server sends the whole article in its response. In the other the server sends a near-empty page with a loading line and a small program, and the program fetches the article and fills the page in. In a browser the two are indistinguishable. Fetched directly, one response contains all 198 words of the article and the other contains zero (local synthetic fixture).

Neither version is broken. The question is which one you are running, whether that was a decision, and whether anyone has looked at the raw response.

## Why a demo cannot show this

A demo happens in a browser with everything switched on. The browser receives the response, runs the script, fetches the data, draws the article. By the time anyone looks, the pipeline has finished.

The difference this episode is about lives at the start of the pipeline, in the bytes the server sent before any script ran. No screen shows that. You have to save the response before the browser touches it and read it as text. Nobody does this in a product review by accident.

The reverse also holds: a shell in the raw response does not mean search engines cannot read the page. Google can execute JavaScript. The raw response is one artifact; what any crawler does with it is a separate question this episode does not measure.

## The mechanism in plain terms

Think of a restaurant that serves the same dish two ways. In the first, the plate arrives complete from the kitchen. In the second, the plate arrives with a card that says "assembling," and a server finishes the dish at your table a moment later. A diner who sits through the meal gets the same food either way. Someone who only photographs plates as they leave the kitchen records a finished dish in the first case and an empty plate with a card in the second.

The analogy holds on the point that matters: the content is the same in the end, the difference is when it arrives, and a tool that only looks at the moment of delivery records very different things. It breaks if pushed to say the second diner eats worse. They do not. The episode claims only that the two responses are different artifacts and that you should know which one a tool is reporting on.

In the fixture, the "complete plate" version was generated once, at build time, with the article written into the HTML file. It ships no script, because an article with no interactive parts has nothing for a script to do. The "assembling" version ships a placeholder and a script that fetches the article and inserts it. With scripts on, both pages end up holding the same six paragraphs and three links. With scripts off, one still shows the article and the other stays at "Loading" (local synthetic fixture). That second comparison tells you about the response, not about search engines; a browser with scripts off is not a Googlebot simulator.

Two fixture choices are worth copying. Missing pages return a real 404 rather than a success page with a shell, so a wrong address looks wrong. And the instruction telling search engines not to index the test pages is written in one place and carried by both versions, because a teaching fixture must not end up in an index by mistake.

## What to ask your team or vendor

1. For our main page types, have we saved the raw server response and the browser's finished page as two separate files, and compared them? Ask to see both, not a screenshot.
2. Which content is in the response before any script runs: text, headings, links with real addresses, title and description? Was that a decision, or a side effect of the framework?
3. Where a page has no interactive features, why are we sending a script at all? Could it be generated once and served complete?
4. When a page does not exist, does the server say so with a 404, or return a success code with an empty shell? Development servers often do the second by default.
5. Is our robots and indexing configuration written down, applied identically to every version of a page, and tested?

If the answer is "we have not looked," that is the finding. Not a problem yet, but an unknown.

## What it costs if ignored

No invented figures here, only the shape of the cost.

The first cost is misdiagnosis. A team that does not distinguish the two artifacts will argue with tools, vendors and each other about whether a page "has content," and each side will be right about the artifact it looked at. Rendering decisions made in that confusion are expensive to reverse.

The second cost is dependence. Content that exists only after a script runs depends on that script loading, executing and fetching its data, for every reader and every tool. The fixture's client renderer handles one failure case (a bad status from the data request) and nothing else.

The third cost is weight without purpose. Shipping a client program to assemble a page with no interactive behavior is work the reader's device does for no benefit. The fixture's static version sends zero scripts.

Not on the cost list: lost rankings or lost indexing. The episode measures neither, and static HTML guarantees neither. Anyone who promises a specific search result from a rendering change is claiming something this fixture cannot support.

## FAQ

**If our site is client-rendered, will search engines miss our content?**
This episode does not answer that, on purpose. Google can execute JavaScript, and nothing in the fixture measures indexing or ranking. It shows that the raw response and the rendered page are different, and that you should know which one a tool is reporting on.

**Is a static site always the better choice?**
No. The fixture uses static generation because its article has no interactive features, so there is nothing for a script to do. Pages with real client behavior need a different comparison. Choose deliberately and inspect the response you ship.

**How can a non-technical person check this?**
Ask for two saved files for one URL: the raw server response and the browser's finished page. Check whether the headline, body text and links appear in the first. The fixture saves both and labels them, which is the practice to request.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The screen shows the end of a pipeline. Before deciding what your site "contains," ask to see the start of it, and ask which of the two anyone was looking at.

Miz Causevic, Kinetic Gain LLC
