SEO title (≤60 chars): Why a Big Business Directory Can Still Be Full of Mistakes
Meta description (≤155 chars): A directory brags about 10,000 listings. How many are wrong? A plain-language look at why counting rows is not the same as checking them.
Slug: directory-quality
Primary keyword: business directory accuracy   Secondary keywords (3–5): wrong business listings, closed business still listed, duplicate listings, outdated phone numbers, how directories check listings
Medium tags (5): Technology, Explainer, Data, Small Business, Internet

# Your Directory Has 10,000 Listings. How Many Are Wrong?

![Listing L00070 Copper Framing Co. with its website check showing a timeout, beside the ground-truth panel the checker never saw, which says the business is open](../hero.png)

Imagine a phone book. It is thick and heavy, and the cover proudly says 10,000 entries. Open it and you find the same bakery listed three times under slightly different names, a plumber whose number was disconnected years ago, and a shop that moved across town long before the book was printed. The cover was telling the truth. There really are 10,000 entries. It never promised they were right.

That is the whole of this episode. Counting how many listings a directory has is easy. Knowing how many are correct is a different job, and most directories only do the first one.

## What the episode shows

We built a fake phone book on a laptop: exactly 10,000 made-up businesses with invented names, invented addresses and phone numbers that all start with 555. Then we deliberately planted problems and wrote down, in a separate sealed file, exactly what we planted. Nothing here is real, and nothing here is about any real directory (local synthetic fixture).

Then we ran five automated checks, the kind a directory might run: is anything missing from the entry, do two entries look like the same business, is the website address spelled correctly, does the website respond, and how long since a person last confirmed the entry. The checker was not allowed to peek at the sealed file.

The checker raised 3,875 flags. Those flags fell on only 3,303 different listings (local synthetic fixture). Why the gap? Because one entry can have several things wrong at once, the way one phone book entry can have an old number and a misspelled street. Count flags and you get one number. Count entries with flags and you get a smaller one. Add up the flag columns and call the total "wrong listings" and you have invented problems that do not exist.

## The phone call nobody answered

Here is the part that matters most. Imagine you phone every business in the book to see who picks up. Some lines ring out. Have those businesses closed? Not necessarily. Someone might be at lunch, the line might be down for the afternoon, or the number might have changed.

The website check in our fake directory is the same thing. It knocked on 1,136 websites that did not answer properly. In our sealed file, 1,038 of those belonged to businesses that are open (local synthetic fixture). The example in the video is a framing shop whose website took too long to respond. The sealed file says the shop is fine. The only thing wrong with its entry is that nobody has double-checked it since January 2023.

So the rule in the episode is simple: a failed check is a reason to look closer, not a verdict. Flagged entries go into a review pile, not the bin. Each carries a note of every reason it was flagged. A person looks, decides, and writes down what they saw, when, and who they are. To mark a business closed, you need two separate pieces of evidence, not one unanswered knock.

## Three dates, not one

Picture three small dates on each entry. One says when a machine last tried the website. One says when someone last edited the entry. One says when a human last confirmed the business is really there, at that address, answering that number.

Those are three different things, and the episode keeps them apart on purpose. When the reviewer looked at the framing shop and decided "keep it, check again in a week," the "last tried" date moved to today. The "last confirmed" date did not, because nobody had confirmed anything. A directory with one date for everything cannot tell an entry someone checked from one a machine merely poked.

## What the checker missed

Because we knew what we planted, we could see what the checker did not find. Of 400 businesses that had quietly moved, 190 left no trace in their entry. Of 350 that had closed, 126 still had a website answering normally, so the website check saw nothing wrong (local synthetic fixture). The episode reports those misses rather than hiding them. A tool that only tells you what it found is overstating how much it knows.

## What this means for you

- When a directory or app boasts about how many listings it has, that number tells you how big the book is, not how accurate. Ask how entries are checked and how often a real person confirms them.
- If you find a wrong listing, a duplicate, or a business that has closed, report it. A good directory treats that as evidence worth more than any automated check, and records who confirmed what and when.
- If you run a small business, check how you appear in the directories people use to find you. A website that was down for a day should never get you quietly removed, but in a badly run directory it can.

## FAQ

**Why would a directory list a business that closed years ago?**
Because nobody confirmed it. Automated checks only see surface signals like whether a website responds, and a closed business can keep a working website for years. In the fixture, 126 of 350 planted closures were invisible to the website check (local synthetic fixture). Only a human confirmation catches those.

**If a business's website is down, is it closed?**
Not necessarily. Websites go down for hosting problems, expired domains, slow servers and plain bad luck. In the fixture, 1,038 failed website checks landed on businesses that are open (local synthetic fixture). The right response is to look closer, not to delete the listing.

**Why does the same business show up more than once?**
Entries get added at different times by different people, with "Co." on one and "LLC" on another, or a phone number formatted differently. An automated check can spot likely pairs, but the fixture treats them as candidates for a person to confirm, because two different businesses can share an office phone line.

## Watch the episode

[YouTube link]

Related episodes: [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md) and [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The thick phone book never lied about how many entries it had. It just never checked them. A failed website check is a lead, not proof.

Miz Causevic, Kinetic Gain LLC
