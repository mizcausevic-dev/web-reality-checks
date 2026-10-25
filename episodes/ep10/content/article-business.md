SEO title (≤60 chars): The DNS Fix Is Live. Why Can't Some Customers Reach You?
Meta description (≤155 chars): A corrected DNS record does not reach customers whose resolvers cached the wrong one. What the outage looks like, why no demo shows it, and what to ask.
Slug: dns-caches
Primary keyword: DNS change broke website   Secondary keywords (3–5): DNS propagation time, website outage after DNS change, TTL explained for managers, domain migration risk, vendor DNS questions
Medium tags (5): Startup, Product Management, Web Hosting, Leadership, DevOps

# I Changed One DNS Record and Broke My Website

![Two clients query example.test in the same minute: client A connects to 192.0.2.10, client B is handed 192.0.2.20 by its resolver and its connection fails, while the authoritative record has already been restored](../hero.png)

## The symptom as a business event

Someone on the team edits one DNS record. A migration, a new host, a typo in an address. Minutes later support tickets start: "your site is down." The engineer checks from her own laptop. The site loads. She checks the record. It is correct, because she already reverted it. Some customers can reach you and some cannot, and everybody is looking at the same domain name.

"Is it fixed or not?" has no clean answer, because the question assumes there is one place to look. There is not. The record at the source is fixed. Copies of the old, wrong record are still sitting in caches your company does not run, and each one lets go at its own time.

That is the event this episode reproduces on a local simulator with a virtual clock. One authoritative record for a documentation domain, two resolver caches, two clients. The record is changed to the wrong address at t=10 seconds and corrected at t=30. Client B keeps failing until t=75, 45 seconds of simulated time after the fix, while client A never fails at all (local synthetic fixture).

## Why a demo cannot show this

A demo happens on one machine, through one resolver, at one moment. It can show that the record is right and the site loads. It cannot show the state of the caches between your customers and your servers, because those caches belong to internet providers, corporate networks and public DNS services, and each remembers your record for however long it was told to when it last asked.

So "it works for me" is accurate and useless at the same time. It describes the one path the demonstrator used. In the fixture, resolver A asked before the bad edit and remembered the correct address. Resolver B asked after the bad edit and remembered the wrong one. Same domain, same minute, two truthful caches holding two different answers (local synthetic fixture).

## The mechanism in plain terms

Think of a printed phone directory with an expiry date on the cover. Your company moves. You call the publisher and correct the listing. Every directory already printed and sitting on a desk still has the old number, and nobody is going to come round and swap them. Each office replaces its directory only when its own copy expires and someone needs to look you up again. Calling the publisher a second time to shorten the expiry date does not change the date printed on the copies already out there.

That is a DNS resolver cache. The time-to-live, or TTL, is the expiry date printed on the copy. When a resolver fetches your record, it keeps the answer for that many seconds and serves it from memory without asking again. Editing the record at the source changes what the next fresh lookup receives. It does not touch any copy already held. Lowering the TTL now only affects copies fetched from now on. And when a copy does expire, nothing is sent out; the resolver simply asks again the next time one of its users needs the name.

Three details matter for anyone running the incident.

The lookup did not fail. Every resolver returned an address. The failing customers were sent to the wrong address and the connection failed there. If your team reports "DNS is failing," the diagnosis is already off by one layer.

The recovery is not one event. In the fixture, one resolver recovered at t=60 and the other at t=75 (local synthetic fixture). Each cache recovers at its own fetch time plus the TTL it stored plus whenever it is next asked. A single "propagation time" quoted to customers is a guess dressed as a fact.

The model is simplified. Real browsers and operating systems keep their own caches on top, and real investigations must check the IPv6 record (AAAA) as well as the IPv4 one (A). A customer on IPv6 may never touch the record you fixed.

## What to ask your team or vendor

1. Before any DNS change, what TTL is currently on the record, and was it lowered far enough in advance that the old value has aged out of caches before the change?
2. During an incident, which resolvers have you actually queried, and what did each return, including the remaining TTL? "It works for me" is one resolver.
3. Did the lookup fail, or did it return the wrong address? These need different responses, and the second one cannot be hurried from the source.
4. Have both the A record and the AAAA record been verified? A correct A record with a stale or wrong AAAA record produces the same outage for IPv6 customers.
5. When the team says the fix has propagated, what is that claim based on: a list of checked resolvers with their expiry times, or a number someone remembers from a hosting FAQ?

If the answers are vague, the state of your incident is "unknown," not "resolved."

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is the outage itself, spread unevenly across customers in a way that is hard to explain. Some reach you, some do not, and the ones who cannot are told by your status page that everything is fine, because the engineer checking it is on a resolver that recovered first.

The second cost is false confidence. A team that believes the fix is complete closes the ticket and reopens it later with a frustrated customer attached. A team that believes "DNS failed" chases the wrong layer. Either mistake extends the incident, paid for in support time and engineering attention.

The third cost is a bad lesson. If the incident ends with "we lowered the TTL and it fixed itself," the team has learned something false, because lowering the TTL during the incident changed nothing for the caches already holding the wrong answer. The next migration repeats the sequence.

The quiet cost is the migration you postpone because the last one went badly. Changing DNS is routine infrastructure work. A team that fears it pays for that fear in every project that touches a domain.

## FAQ

**We fixed the DNS record. Why are some customers still getting an error?**
Their resolvers cached the wrong record before you fixed it and will keep serving it until the TTL they stored runs out. In the fixture, the record was corrected at t=30 and the affected client kept failing until t=75 (local synthetic fixture). The fix reaches the source, not the caches already holding the old answer.

**How long does DNS propagation take?**
There is no single number. Each resolver recovers at the time it cached the record plus the TTL it stored plus whenever a user next asks. In the fixture, two resolvers recovered 15 seconds apart from the same change (local synthetic fixture). Ask your team for the list of checked resolvers and expiry times instead.

**Can we speed up recovery by lowering the TTL now?**
Not for caches that already hold the wrong answer; their expiry was fixed when they stored it. A lower TTL only applies to lookups made after the change. Lowering the TTL is a preparation step for a planned change, done in advance, not an incident response.

## Watch the episode

[YouTube link]

Related episodes: [It Works Locally. Why Is Production Broken?](../../ep07/content/article-technical.md) and [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Fixing the source does not erase every cached answer. When the next record change goes wrong, ask for the list of caches, not the propagation time.

Miz Causevic, Kinetic Gain LLC
