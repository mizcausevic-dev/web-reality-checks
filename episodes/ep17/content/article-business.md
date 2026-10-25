SEO title (≤60 chars): Your Dashboard Says Live. Is the Number Actually Current?
Meta description (≤155 chars): A dashboard can say Live and show a ten-minute-old number at the same time. Why the demo cannot reveal it, and five questions to ask your team or vendor.
Slug: stale-dashboard
Primary keyword: dashboard data freshness   Secondary keywords (3–5): real-time dashboard claims, stale data risk, data latency for decision makers, vendor dashboard questions, operational reporting accuracy
Medium tags (5): Product Management, Data, Leadership, Startup, Analytics

# Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.

![A dashboard panel labeled Live, updated 0 s ago, next to a timeline showing the measurement behind it was observed ten simulated minutes earlier](../hero.png)

## The symptom as a business event

An operations lead is watching a panel during an incident. It says Live, updated 0 seconds ago, and the number looks fine. A decision is made on that number. Later, someone pulls the raw records and finds the value had been observed ten minutes before the decision and had not changed on screen the whole time. Nobody lied. The connection was fine. The number was old.

This episode reproduces that event on a local synthetic pipeline with a compressed simulated clock. A source produces a reading. A collector samples it every ten simulated minutes. An API serves whatever the collector last stored. A browser asks the API every thirty simulated seconds. In the healthy run, the browser made 19 successful requests between two collections, every one labeled Live by the naive display, while the reading aged from 30 to 570 seconds (local synthetic fixture). The same reading, 19 times, each time described as fresh.

## Why a demo cannot show this

A demo shows a panel updating. Numbers appear, the status says Live, sometimes a value changes while everyone watches. None of it answers the question that matters: when was the number on screen actually measured?

The demo cannot answer it because the display is reporting the wrong thing with complete accuracy. "Updated 0 seconds ago" is a true statement about the most recent request to the server, not about the measurement. A viewer cannot tell the two apart, because the panel only shows one. You would have to know the upstream collection schedule, compare it to the label, and notice the number has not moved. In a demo, nobody does.

The failure gets worse exactly when the dashboard is most needed. When the fixture's collector stops working, the API keeps serving the last stored reading with a success code, because that is the latest reading it has. The panel stays green. The age reaches 1200 simulated seconds while the display says Live (local synthetic fixture). The moment you need the dashboard to warn you is the moment it is most confidently reassuring you.

## The mechanism in plain terms

Think of a newspaper delivered every morning. Today's copy landed on the step at 6 a.m. That is the delivery time, and it is fresh. The stories inside were written yesterday afternoon. Delivery time tells you the courier is working, nothing about when the information was gathered.

A Live label is the delivery time. Each time the browser gets an answer from the server, the courier has arrived and the label resets to zero. The measurement inside that answer was gathered on its own schedule, by a different part of the system, and carries its own timestamp. In the fixture that timestamp is `sourceObservedAt` and it travels unchanged through every stage. The repair is to display the measurement's age from that timestamp, and to show connection status separately. Connected and stale can both be true, and a correct panel says both.

The analogy holds because the courier and the newsroom are separate systems with separate schedules, just as the browser's request loop and the upstream collector are. Asking the courier to come twice as often gets you the same paper twice as often. In the fixture, polling every 5 seconds instead of every 30 produced 119 requests instead of 19 and an identical age (local synthetic fixture).

How old is too old is a product decision. This dashboard chose five minutes as its stale threshold. A daily report or a slow-moving sensor could accept hours. The problem is not that ten-minute-old data exists. The problem is a label that hides the age.

## What to ask your team or vendor

1. When the panel says Live or "updated N seconds ago," is that counted from when the measurement was taken, or from when the browser last heard from the server? Ask to see where the number comes from.
2. Does every value carry its own observation timestamp from the source, separate from when it was collected and served? Without it, measurement age cannot be computed.
3. What is the stale threshold for this display, who decided it, and where is it written down? A threshold nobody can name does not exist.
4. If the upstream collector stops but the API keeps answering, what does the panel show? The right answer is connection healthy, data flagged stale, explicit warning.
5. If the API stops answering, does the panel keep the last known value with a visible warning, show a fabricated current value, or go blank? Ask what it does with a timestamp from the future or one that is missing.

If the answers are vague, the honest state of your dashboard is "unknown," not "real-time."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is decisions made on numbers that were already old when read. An operations team scales, pauses, pages or reassures based on a panel; if the panel presents a stale reading as current, every one of those actions is taken against a picture of the past.

The hidden cost is losing the signal you installed the dashboard to get. A stale-but-green panel is worse than a blank one, because a blank panel sends someone to check while a green one tells them not to. In the fixture's collector failure, the display stays Live for 1200 simulated seconds with nothing new behind it (local synthetic fixture).

The trust cost comes later, when a postmortem reveals the dashboard everyone watched showed the same number throughout. People stop trusting the panel, then the next one, even after the fix.

## FAQ

**Is "real-time dashboard" a meaningful claim?**
Only if the vendor or team can state how old the displayed measurement can be at its oldest, and show where that age is computed from. Real-time delivery and real-time measurement are different claims. Ask which one is being made.

**Should every dashboard treat ten-minute-old data as a problem?**
No. The stale threshold is a product decision for each display. This fixture chose five minutes; a daily report could choose hours. The failure is hiding the age, not the age itself. Decide the threshold, write it down, and show the age.

**Would a faster refresh or a live connection solve this?**
Not by itself. Both deliver the same stored reading sooner. Neither changes how often the upstream system samples the source. In the fixture, six times more polling produced the same measurement age (local synthetic fixture).

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [100% Uploaded. Why Isn't My File Ready?](../../ep14/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Freshly fetched does not mean freshly observed. Before you trust a Live label, ask what clock it reads from, and ask to see the panel say connected and stale at once.

Miz Causevic, Kinetic Gain LLC
