SEO title (≤60 chars): Why Search Shows the Wrong Results When You Type Fast
Meta description (≤155 chars): You type a word, the app stalls or shows results for a different word. Nothing is broken. A plain look at request budgets and the "wait" the app ignored.
Slug: rate-limit-429-search
Primary keyword: why does search show wrong results   Secondary keywords (3–5): too many requests error, app keeps retrying, rate limit explained simply, search box lag, what is a 429 error
Medium tags (5): Technology, Explainer, Software, Internet, Productivity

# Your App Isn't Broken. It's Being Rate-Limited.

![A search box with "postgres" typed in; the request log shows eight keystroke requests followed by a cluster of 429 Too Many Requests responses with Retry-After headers the client ignored](../hero.png)

Picture a deli counter with a rule: each customer may ask the clerk five questions every ten minutes. You walk up and, instead of asking for what you want, you shout every letter as it comes to mind. "P." "Po." "Pos." "Post." By "postgres" you have used your five questions on fragments, the clerk says "come back in three minutes," and you immediately ask again, and again. The clerk is not broken. You have spent your turn.

That is the whole episode. An app's search box can behave like that customer; the server is the clerk.

## What the episode shows

We built a small, deliberately flawed search app on a laptop, with made-up data and a made-up rule: five requests every ten seconds per signed-in user. Nothing here is real (local synthetic fixture).

Then we typed "postgres", one letter at a time, fast. The flawed app sent a request for every letter. Eight letters, eight requests. Five were answered. The sixth was refused with a message meaning "too many requests," plus a note saying how many seconds to wait. The app ignored the note, asked again at once, and was refused again. Eight letters became 17 requests and 12 refusals (local synthetic fixture).

A second problem had nothing to do with the rule. Short searches take the clerk longer, because "p" matches far more than "postgres". So the answer to "p" came back last, and the flawed app showed whatever arrived last. The box said "postgres". The list showed results for "p" (local synthetic fixture).

## The fix, in plain words

Back at the deli, a considerate customer waits until they know the whole word, asks once, and if told to come back in three minutes, waits and asks once more. If they change their mind meanwhile, they drop the old question.

The corrected app does that. It waits a quarter of a second after the last keystroke before sending, so a whole word becomes one request. It numbers every request and only shows an answer if it is still the newest, so a slow old answer cannot overwrite a fast current one. It cancels requests it no longer needs. And when refused, it reads the wait time, rounds it up, waits, and retries once, unless you have typed something new, in which case it drops the retry.

Same word, same speed, same clerk. The corrected app made 1 request, was refused 0 times, and showed results for "postgres" (local synthetic fixture).

## Why it does not look like a problem

Nothing crashes. No error appears. The server is working perfectly; refusing the sixth request is its job. From outside it looks like the app is slow, or the vendor is having a bad day. The cause is a few lines in the app about when to ask and what to do when told to wait.

One limit: not every server sends the "wait this long" note, so the corrected app has a fallback. And waiting politely does not remove the clerk's rule; the app simply stops running into it.

## What this means for you

- If a search box shows results for a shorter version of what you typed, or lags only when you type quickly, that is this pattern. Pause, type the full word, and it will usually settle.
- A "too many requests" message does not mean something is down. It is a server saying "wait." A well-built app waits quietly and tries once more. A badly built one keeps asking and gets refused faster.
- If you build things, or pay people who do: ask whether the search box waits for a pause before sending, whether it ignores out-of-date answers, and what it does when told to wait. In the episode, 17 tests cover all three, including one proving the flawed version misbehaves (local synthetic fixture).

## FAQ

**What does "429 Too Many Requests" mean?**
A server saying you have used up your allowance for now. Nothing is broken. Often it comes with a note saying how long to wait, though not always. The right response is to wait, then try once more.

**Why does search sometimes show results for the wrong word?**
Shorter searches often take longer because they match more items. If an app sends a request for every letter, a slow answer to the first letter can arrive after the answer to the full word and overwrite it. Well-built apps discard answers to questions they are no longer asking.

**Is this the app's fault or the server's?**
In this episode, the app's. The server applied its rule and said how long to wait. The app asked too often, ignored the wait, and showed answers in the wrong order. The fix was entirely on the app's side (local synthetic fixture).

## Watch the episode

[YouTube link]

Related episodes: [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The clerk was never the problem. Coordinate the work. Don't just repeat it faster.

Miz Causevic, Kinetic Gain LLC
