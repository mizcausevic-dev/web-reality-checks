SEO title (≤60 chars): Two Web Pages Look the Same. One Arrived Empty.
Meta description (≤155 chars): Two pages look identical in your browser, yet one arrived from the server as a full article and the other as a blank with a note. A plain-language guide.
Slug: initial-html
Primary keyword: how web pages load   Secondary keywords (3–5): what the server sends, JavaScript explained simply, why a page says loading, website explainer, how browsers build pages
Medium tags (5): Technology, Explainer, Internet, Web, Software

# The Browser Shows Your Page. What Does the Server Send?

![Side-by-side raw HTML of two routes for the same article: the statically generated response holds the h1, four h2 headings, six paragraphs and three links; the client-rendered response holds a "Loading article…" line and one script tag](../hero.png)

Imagine ordering the same bookshelf from two shops. The first delivers it built: you open the door and there it is, shelves and all. The second delivers a flat box and a small robot that assembles it in your hallway while you watch. Ten minutes later you have two identical bookshelves. If a neighbor photographed each delivery at the moment it crossed your doorstep, though, one photo shows a bookshelf and the other shows a box.

That is this episode. Two web pages that look the same once they finish loading, and two very different deliveries.

## What the episode shows

We built one short, made-up article about a fictional harbor clock and published it on a laptop in two ways. Nothing here is a real website or company (local synthetic fixture).

The first version is the pre-built bookshelf. When your browser asks for the page, the server sends back the whole article: the headline, four section headings, six paragraphs and three links, all in the first delivery. No assembly. No robot.

The second version is the flat box. The server sends back almost nothing: a line that says "Loading article…" and a small program. The program is the robot. It runs in your browser, asks the server for the article's text as a separate package, and builds the page in front of you.

Open both in a normal browser and you cannot tell them apart. The robot is quick, and by the time you look, the bookshelf is built.

## Catching the delivery at the door

The episode then does what the neighbor did: it records the moment of delivery, before any assembly. The raw response for the pre-built version holds the full article, all 198 words. The raw response for the flat-box version holds zero of those words, just the loading line and the instruction to run the program (local synthetic fixture).

Next, the episode lets the robot work. With program-running switched on, the flat-box page fills in and ends up holding the same six paragraphs and three links as the pre-built one.

Finally, the episode switches off the browser's ability to run programs and loads both pages again. The pre-built version still shows the whole article. The flat-box version stays at "Loading article…", because the robot was never allowed to start (local synthetic fixture).

One caution the episode states clearly: switching off programs in a browser does not show you what Google sees. Google can run those programs. The switched-off browser only shows you what arrived in the box. It says nothing about whether a search engine will read, list or rank the page. The episode does not measure any of that.

## Why it matters which delivery you got

Not everyone who visits a page is a person sitting through the full assembly. Some tools read the delivery at the door and stop. Some run the robot. Some run it under conditions nobody controls. When two tools disagree about whether a page "has anything on it," they are photographing different moments: one the box, one the built shelf.

Keep a picture of both. Know which one you are looking at before you decide the page is fine or empty.

A quieter point: the pre-built version sends no program at all. The article has nothing to click or update, so there is nothing for a robot to do. Sending one anyway would be shipping an assembly robot with a bookshelf that is already built.

## What this means for you

- When a page sits at "Loading" and never finishes, you are often looking at a flat box whose robot could not run or could not fetch its parts. The content was never in the first delivery.
- If two people argue about whether a page "has content," ask which they looked at: the raw response from the server, or the page after the browser finished building it. Both can be right.
- If you build or pay for a website, ask whether the important text and links are in the first delivery, and whether that was a choice. Then ask for both pictures, the box and the built shelf, side by side.

## FAQ

**Why does a page sometimes show "Loading" and then nothing?**
The server sent a placeholder and a small program meant to fetch the real content. If the program cannot run or cannot get its data, the placeholder is all that remains. That is what the episode's client-built page shows when the browser's scripts are switched off.

**If I turn off JavaScript, do I see what Google sees?**
No. Google can run JavaScript. Turning it off shows you what the server sent on its own, which is useful for understanding a page, but it is not a Google simulator and does not predict whether a page is indexed or ranked.

**Is the pre-built kind of page always better?**
Not always. The episode's article has nothing interactive, so building it once and sending it complete makes sense. Pages that need to react to you work differently. Know which kind you have, and look at both the delivery and the result.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The built bookshelf and the box at the door are two different things. So are the page on your screen and the response from the server. Look at both, and know which one you are holding.

Miz Causevic, Kinetic Gain LLC
