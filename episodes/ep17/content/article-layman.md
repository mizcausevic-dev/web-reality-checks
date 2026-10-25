SEO title (≤60 chars): Why "Live" on a Dashboard Can Mean Ten Minutes Old
Meta description (≤155 chars): A screen can say Live and show you a number measured ten minutes ago, both at once. A plain-language look at the two clocks hiding behind one word.
Slug: stale-dashboard
Primary keyword: what does live mean on a dashboard   Secondary keywords (3–5): is my dashboard data current, stale data explained, real-time data explained simply, why numbers do not update, data freshness for beginners
Medium tags (5): Technology, Explainer, Data, Software, Everyday Tech

# Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.

![A dashboard panel labeled Live, updated 0 s ago, next to a timeline showing the measurement behind it was observed ten simulated minutes earlier](../hero.png)

You check the weather on your phone. The screen says "Updated just now" and 21 degrees. What it does not tell you is that "just now" is when your phone last asked the weather service, and 21 degrees is a reading the thermometer took a while ago. Your phone was quick. The thermometer was not. The screen only mentions the quick part.

That is the whole episode. A dashboard can be very good at talking to its server and still show you an old number, and the word Live is doing the hiding.

## What the episode shows

We built a small, simplified system on a laptop with a pretend clock we wind forward by hand. Nothing in it is real data or about a real product (local synthetic fixture). It has four parts, like a relay. A thermometer takes a reading. A collector checks the thermometer every ten minutes and writes down what it saw. A server hands out whatever the collector last wrote down. A screen asks the server every thirty seconds.

Every thirty seconds the screen asks, the server answers OK, and the label resets to Live, updated 0 seconds ago. Between two visits from the collector, that happens 19 times (local synthetic fixture). Nineteen fresh answers, every one carrying the same reading, because the collector has not been back yet.

The screen is telling the truth about one thing, "I just heard from the server," and letting you believe another, "this number was just measured." The reading aged from 30 seconds to nine and a half minutes while the label never left zero.

## The two clocks behind one word

Back to the weather app. One clock measures how long since your phone last asked. The other measures how long since the thermometer took the reading. "Updated just now" reads the first. What you care about is the second.

The fix is to stop pretending there is one clock. The screen shows two things: how old the measurement is, counted from when the thermometer took it, a number that keeps climbing no matter how many times the server answers; and whether the connection is working. The connection can be healthy and the measurement old at the same time, and a correct screen says both.

How old is too old? That is a choice, not a law. This dashboard decided five minutes, so from five and a half minutes on it marks the reading stale while still saying the connection is fine (local synthetic fixture). A daily summary could accept hours. The problem was never that the number was ten minutes old. The problem was that nothing told you.

## When things break

The episode then breaks the relay in two places. First, the collector stops visiting the thermometer. The server keeps handing out the last thing it wrote down. The old screen keeps saying Live while the reading reaches twenty minutes old (local synthetic fixture). The fixed screen keeps the connection green, shows the age as twenty minutes, and warns.

Second, the server stops answering. The fixed screen keeps the last number it had, with a note: the last request failed, this is the last known value. It does not invent a new number. When the server returns, the age picks up where it left off (local synthetic fixture).

Asking more often does not help. Every five seconds instead of every thirty got six times the answers and the same old reading (local synthetic fixture). Your phone asking more often does not make the thermometer read more often.

## What this means for you

- When a screen says Live, Updated or Just now, ask which clock it is reading. Often it is how recently it talked to a server, not how recently the thing was measured. A number that never changes under a label stuck at zero is the tell.
- A green dot or a Live badge is about the connection, not a promise that the number is current. Good software shows the two separately.
- If you build or buy software that shows numbers, ask where the age on screen comes from. If it is the last time the browser asked, the age is hiding something.

## FAQ

**If the dashboard says Live, is the number current?**
Not necessarily. Live usually means the screen recently got an answer from its server. The number inside was measured earlier by a different part of the system, on its own schedule. In the episode, 19 Live labels in a row carried the same reading (local synthetic fixture).

**Why does the number not change even though the page keeps updating?**
Because updating the page and taking a new measurement are different events. The page can ask as often as it likes; the server only has what was last collected. Until the collector takes a new reading, every answer carries the old one.

**Is ten-minute-old data always a problem?**
No. It depends on what the number is for. This fixture's dashboard chose five minutes; a daily report might accept hours. What matters is that the screen tells you how old the measurement is, so you can decide.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [100% Uploaded. Why Isn't My File Ready?](../../ep14/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

"Updated just now" was always about your phone, not the thermometer. Freshly fetched does not mean freshly observed.

Miz Causevic, Kinetic Gain LLC
