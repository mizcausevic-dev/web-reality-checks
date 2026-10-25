SEO title (≤60 chars): One Click, 101 Questions: How a Website Does Extra Work
Meta description (≤155 chars): A web page can look instant and still ask its database 101 questions to build one list. A plain-language look at the N+1 pattern and the one-trip fix.
Slug: n-plus-one-explained
Primary keyword: why websites are slow   Secondary keywords (3–5): how websites work, what is a database query, N+1 explained simply, website behind the scenes, how apps fetch data
Medium tags (5): Technology, Explainer, Software, Web Development, Databases

# One Page. 101 Database Queries. Here's Why.

![A single HTTP request fans out into one list SELECT and 100 author SELECTs, a tree of 101 statements counted by instrumentation](../hero.png)

Imagine you ask a librarian for a list of 100 books and who wrote each one. A good librarian walks to the shelves once and comes back with everything. A different librarian brings you the list of titles, then walks back to the card catalog once for every single book to look up its author. One hundred trips, one per line. You get the same answer either way. You only notice if you watch the librarian's feet.

That second librarian is the whole episode. A website can do exactly this, and the page in front of you gives no sign of it.

## What the episode shows

We built a small article directory on a laptop. It has 100 made-up articles and 12 made-up authors. Nothing in it is real data or a real product (local synthetic fixture).

You open the page. That is one request: you asked once. But inside the site, the flawed version does the second librarian's routine. It asks the database for the list of 100 articles. Then, for each article, it asks the database a separate question: who wrote this one? One list question plus 100 author questions makes 101.

We did not guess that number. The fixture has a counter wrapped around the database that tallies every question as it is asked. It said 101.

It gets a little sillier. The 100 articles share only 12 authors, so the same person gets looked up over and over. One author was looked up 14 times. In all, 88 of the 100 author lookups were for someone the site had already looked up (local synthetic fixture). The librarian walked to the card catalog for the same name again and again.

## The fix, in one sentence

Ask once, with the whole list. The corrected version sends a single combined question that returns each article together with its author. The counter says 1.

Here is the part that makes this tricky to spot: both versions produce the same page. Same 100 articles, same order, same authors. We compared the two responses and they matched byte for byte. The librarian who made 100 extra trips hands you the same list as the one who made none.

We also tested the counter itself. We secretly added one extra question to the flawed version, and the counter reported 102. It noticed a single hidden question. That matters because a measuring tool you have never seen disagree with you could be broken and you would not know.

## What we did not claim

The counter counts questions. It does not time anything, so the episode does not say the corrected page is faster. Fewer trips often help, but not always, and a database on the same laptop does not have any walking distance to save in the first place. It is also one specific pattern, a question per item in a loop, not every way a site can do extra work.

## What this means for you

- A page that looks fast and correct has not shown you how much work it did. If a site feels heavy as it grows, one possible reason is hidden work that scales with the amount of content, even when nothing looks broken.
- If you build or buy software, ask a simple question: how many database questions does our busiest page ask for one visit? A team that can answer with a measured number is in a better position than one that says "it should be fine."
- Do not assume more queries means slower, or fewer means faster. The only honest answer comes from measuring both the count and the time, on the real system.

## FAQ

**What is a database query?**
It is one question a website asks its database, such as "give me the author with this ID." Sites ask many of these to build a page. The number of questions is one way to see how much work a page causes.

**Why would a website ask the same question many times?**
Code that fetches something for each item in a list often has no memory of what it already fetched. In the episode, the same author was fetched 14 times. Combining the lookup into one question removes the repetition.

**Does this mean the site is slow?**
Not necessarily. The episode counted questions and did not time them. It shows hidden extra work, which is a reason to measure, not proof of slowness.

## Watch the episode

[YouTube link]

Related episodes: [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md) and [One Click. Three Purchase Events. Here’s What Went Wrong.](../../ep02/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

You asked once. The site asked 101 times. The page looked the same either way, which is exactly why it is worth counting.

Miz Causevic, Kinetic Gain LLC
