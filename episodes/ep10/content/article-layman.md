SEO title (≤60 chars): Why a Website Works for Your Friend but Not for You
Meta description (≤155 chars): A website can be fixed and still broken for you. A plain-language look at DNS caches, the internet's address books, and why they do not all update at once.
Slug: dns-caches
Primary keyword: website works for others but not me   Secondary keywords (3–5): what is DNS, DNS cache explained, why is a website down for me, how websites find servers, internet address book
Medium tags (5): Technology, Internet, Explainer, Web, How It Works

# I Changed One DNS Record and Broke My Website

![Two clients query example.test in the same minute: client A connects to 192.0.2.10, client B is handed 192.0.2.20 by its resolver and its connection fails, while the authoritative record has already been restored](../hero.png)

Imagine a town where every neighborhood has its own printed address book, each with a date stamped on the cover saying when it should be replaced. A shop moves across town and tells the central registry, which updates its master copy at once. But the address book on your neighbor's shelf still shows the old street, and keeps showing it until its stamp date passes and somebody in that house goes to look the shop up again.

That is how the internet finds websites, and it is the whole of this episode.

## What the episode shows

When you type a website's name, your device does not know where that website lives. It asks a helper, usually run by your internet provider, called a resolver. The resolver either remembers the address from a recent lookup or goes to the official source, the registry in our story, and asks. Once it has the answer, it keeps it for a set number of seconds, the "time to live," so it does not have to ask again for every visitor. That stored copy is a cache.

We built a small simulation on a laptop: a pretend website, two resolvers, two visitors, one on each resolver. Nothing in it touches the real internet, and nothing in it is about a real company (local synthetic fixture).

Here is what happened, in simulated seconds. At the start, resolver A looked up the website and stored the correct address, good for 60 seconds. At 10 seconds, the owner made a mistake and changed the official record to the wrong address. At 15 seconds, resolver B looked the site up for the first time, got the wrong address from the source, and stored that, also for 60 seconds. At 20 seconds, visitor A loaded the site and visitor B could not connect (local synthetic fixture).

Same website, same minute, two different results. Neither resolver did anything wrong. Each repeated what it had been told at the moment it asked.

## The part that surprises people

At 30 seconds the owner noticed and corrected the record. Problem solved, you would think. But visitor B kept failing until 75 seconds, because resolver B had stored the wrong address at 15 seconds with a 60-second stamp, and 15 plus 60 is 75 (local synthetic fixture). The correction went to the registry. Resolver B's address book still had the old page, and nobody comes round to tear out pages.

Three things follow from that, and each one is a common misunderstanding.

The lookup did not fail. Every visitor in the simulation got an address. Visitor B got the wrong one and the connection failed there. The address book was not blank; it had the wrong street in it.

You cannot shorten the stamp on a copy already printed. The owner could lower the time-to-live on the official record, but that only affects copies made from then on. Resolver B's copy kept its expiry at 75 seconds whatever the owner did afterwards.

When a copy expires, nothing happens by itself. Nobody calls the resolver to say "update now." The stale entry sits there until a visitor asks for the site again, and only then does the resolver fetch a fresh page from the source. In the simulation, resolver A refreshed at 60 seconds and resolver B at 75, because each had asked at a different time (local synthetic fixture).

Real life is messier. Your browser and your computer keep their own small address books on top of your provider's, and there is a second kind of address record for newer connections (called AAAA) that has to be checked too. The simulation leaves those out on purpose, so the one mechanism is clear.

## What this means for you

- If a website works for a friend but not for you, or on your phone's data but not on home Wi-Fi, this is a likely reason. You are asking a different address book. Try again later; there is no single "fixed in X minutes," because each book expires on its own schedule.
- When a company says "we fixed it" and you still cannot get in, both of you can be telling the truth. The fix is at the source. Your provider's copy may not have expired yet, and nothing forces it to update early.
- Clearing your own device's stored addresses helps only if your copy is the stale one. It does nothing for the copy held by your internet provider, which updates when its own timer runs out and someone asks.

## FAQ

**Why does a website work on my phone but not my computer?**
The two devices are probably asking different resolvers, or one of them has its own stored address that is older. Each stored copy has its own expiry. In the simulation, two visitors on different resolvers got different answers for the same site in the same minute (local synthetic fixture).

**If the company fixed the problem, why am I still seeing it?**
The fix changes the official record. Copies already stored elsewhere keep the old answer until their time runs out and someone asks again. In the simulation, the record was corrected at 30 seconds and one visitor kept failing until 75 (local synthetic fixture).

**Is there a fixed time for DNS changes to take effect?**
No. Each stored copy expires at the time it was made plus how long it was told to keep the answer, and then only refreshes when next asked. Two resolvers in the simulation recovered 15 seconds apart from the same correction (local synthetic fixture). Any single number you are given is an estimate.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [It Works Locally. Why Is Production Broken?](../../ep07/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Correcting the master copy does not rewrite the books already on the shelves. Fixing the source does not erase every cached answer.

Miz Causevic, Kinetic Gain LLC
