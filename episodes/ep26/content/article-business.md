SEO title (≤60 chars): One Page, 101 Queries: What to Ask Your Dev Team
Meta description (≤155 chars): A page that looks fine can ask the database 101 questions. Why demos miss it, how it is counted, and five questions to ask your team or vendor.
Slug: n-plus-one-business
Primary keyword: N+1 query problem   Secondary keywords (3–5): database performance risk, software vendor questions, slow page diagnosis, backend efficiency, technical due diligence
Medium tags (5): Startup, Product Management, Software Development, Databases, Leadership

# One Page. 101 Database Queries. Here's Why.

![A single HTTP request fans out into one list SELECT and 100 author SELECTs, a tree of 101 statements counted by instrumentation](../hero.png)

## The symptom as a business event

The product has a directory page. It lists articles with the name of each author. It looks right, the data is correct, the demo goes well, and the page ships. Months later the team starts saying things like "that page is the heavy one" and "we should look at the database." Nobody can point to a bug, because there is no bug in the output. The page does exactly what it was asked to do.

This episode of Web Reality Checks reproduces the underlying pattern on a local fixture with synthetic data. One visit to the page is one request from the browser. Behind that one request, the flawed version asks the database 101 questions: one to get the list of 100 articles, then one more for each article to get its author (local synthetic fixture). The corrected version asks one. Both return exactly the same page.

## Why a demo cannot show this

A demo shows the screen. The screen is identical in both versions. The 100 articles appear in the same order with the same authors, and the two responses are byte-for-byte equal (13,544 bytes in the fixture). Nothing about the output reveals how much work was done to produce it.

The extra work lives between the application and the database, where a demo does not look. It also depends on the data. With a short list the extra questions are too few to notice. The pattern only becomes visible when the list grows, and by then the page has been shipping for a while. So the demo is not misleading anyone. It is answering "does the page show the right thing?" while the real question is "how much work does the page cause?"

## The mechanism in plain terms

Picture an office with a records room down the hall. You hand a clerk a list of 100 files and ask for each file's owner. One way to do it: the clerk walks to the records room, brings back the list, then walks back for each owner, 100 more trips, one per line. The other way: the clerk goes once, with the whole list, and returns with everything. Same answer on your desk either way. The number of trips is what differs.

Software works the same way in the one respect that matters here: every question to the database is a separate request, and the flawed code sends one per row. The analogy has a limit, and the episode is careful about it. It describes the count of trips, not how long they take. The fixture counted statements. It did not time anything, so it does not claim the corrected page is faster. In a local, in-memory database there is no distance to walk at all.

There is a second detail that makes the pattern wasteful. The 100 articles in the fixture share only 12 authors. The flawed code does not remember who it already asked about, so it fetches the same people repeatedly. One author, Ana Petrov, was looked up 14 times, and 88 of the 100 author lookups repeated someone already fetched (local synthetic fixture).

The count itself is not a guess. The fixture wraps the database connection with a counter that records each statement as it runs. Setup, sign-in and transaction bookkeeping are excluded and logged as excluded, so the number 101 means 101 data-reading statements for this one operation, not "everything the database did."

## What to ask your team or vendor

1. For our heaviest list pages, do we know how many database statements one page view runs? Ask for the number, and ask how it was obtained.
2. Is that number measured by a counter around the database, or inferred from reading the code? A counter cannot be argued with. A guess can be wrong in either direction.
3. Does a test fail if someone adds a loop that queries once per row? If not, the number can drift upward with every release and no one will see it.
4. When a page is "fixed," did anyone confirm it still returns the same items in the same order? A faster-looking rewrite that quietly drops or reorders rows is a different bug. The fixture checks for byte-equal output.
5. Was the improvement measured as time, on the database we actually run in production? Fewer statements often helps, but it is not guaranteed, and this episode makes no speed claim.

If the answers are "we think so," the honest state of your system is "unknown."

## What it costs if ignored

No figures here, only the shape of the cost, and the fixture supports none beyond the counts above.

The direct cost is that work grows with your content. Each new row adds a statement, so a page that was acceptable at launch carries more load as the catalog, the customer list or the history grows. The page's behavior changes without anyone changing its code.

The indirect cost is diagnosis. Because the output is correct, teams reach for the usual levers first: bigger servers, more caching, a new framework. Those may or may not help. Without a statement count, the team is tuning around a cause it has not looked at.

The quiet cost is repetition. The pattern is easy to write and easy to copy. A team that finds it on one page often finds it again on the next list page. The fixture shows one form of it, a lookup per row in a loop, and does not claim to cover every form.

## FAQ

**Is a page with 101 queries slow?**
Not necessarily, and this episode does not say so. The fixture counted statements and measured no timing. What 101 statements cost depends on the database, the network distance and the load. The count is a reason to look, not a verdict.

**How do we find this pattern in our own product?**
Count the database statements for one request to a list page, using a counter around the connection. If the count rises with the number of rows shown, you have found it. Ask your engineers for the number per page, not an opinion.

**Does our software vendor's framework prevent this?**
This episode did not test any framework or ORM. The fixture used hand-written SQL to show the shape. Ask your vendor how many statements their list pages run and how they know.

## Watch the episode

[YouTube link]

Related episodes: [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md) and [One Click. Three Purchase Events. Here’s What Went Wrong.](../../ep02/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A correct page does not prove cheap work. Before you accept "it works," ask how many times the page talks to the database, and ask to see the counter that says so.

Miz Causevic, Kinetic Gain LLC
