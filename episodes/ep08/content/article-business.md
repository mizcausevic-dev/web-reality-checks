SEO title (≤60 chars): Your Site Looks Great and Feels Slow. Ask These 5 Questions
Meta description (≤155 chars): "Slow" hides two separate problems: a late hero image and a frozen click. Why a demo cannot show either, how to tell them apart, what to ask your team.
Slug: feels-slow
Primary keyword: website performance for business   Secondary keywords (3–5): why is my website slow, page speed vs responsiveness, web performance questions for vendors, Core Web Vitals explained, website launch review
Medium tags (5): Product Management, Startup, Web Performance, Leadership, UX

# Why This Beautiful Website Feels Slow

![Two timelines side by side: a loading track blocked by a 12 MB hero image request, and an interaction track blocked by a synchronous O(n²) click handler on the main thread](../hero.png)

## The symptom as a business event

The redesign launches. Within a week two kinds of complaint arrive, both using the same word. One customer says the top of the homepage took ages to show up. Another pressed the main button, nothing happened, pressed again, left. Support files both as "site is slow." Engineering fixes one and closes the ticket. The other complaint keeps coming.

This episode reproduces that event on a local fixture with two synthetic pages. The flawed page carries a hero image of 12,173,721 bytes where 17,004 bytes shows the same picture, and a button whose code compares each of 20,000 catalogue items against every other before anything can change on screen (local synthetic fixture). The repaired page looks identical and fixes both. They are two different defects, and a team that measures only one declares victory early.

## Why a demo cannot show this

A demo runs on the presenter's laptop, on a fast office connection, often with the page cached from rehearsal. Under those conditions a 12 MB image arrives in a blink. The fixture README says the same about its own loopback server: without a throttled network, even 12 MB arrives in milliseconds. The loading problem only shows itself on the connection your customers have, not the one in the boardroom.

The click problem hides differently. The presenter clicks once, waits, keeps talking. A few seconds of delay on a scripted walkthrough reads as a pause. A customer who clicks and sees no response clicks again, or leaves. The demo cannot show that, because the demo is not a user.

A screenshot shows neither. Both fixture pages are visually identical by design; a test confirms it. Polish is a third thing, separate from how fast the page loads and how fast it answers.

## The mechanism in plain terms

Think of a restaurant. Loading speed is how long until your food reaches the table. Responsiveness is how long until the waiter acknowledges your raised hand. A kitchen can be fast while the floor staff are swamped, and vice versa. Two bottlenecks, two fixes, and a diner who says "slow service" could mean either.

On the loading side, the browser cannot draw the biggest thing on the page until every byte of its image has arrived and been decoded into pixels. The flawed page asks for a picture 4000 pixels wide, stored without compression loss, for a space 1600 pixels wide. Most of those bytes are discarded at display time, but they still have to travel and be unpacked. The repair is the same picture at the size of its slot, in a modern compressed format: 17,004 bytes instead of 12,173,721 (local synthetic fixture). The fixture refuses one tempting shortcut: it does not tell the browser to load the hero "lazily," because that delays exactly the element the visitor is waiting for.

On the interaction side, a web page does its work on one thread, one task at a time. When you click, the page runs the code behind the button, and only when that finishes can it redraw the screen. If the code is expensive, the page is frozen for as long as it runs, and no spinner can appear in the meantime, because the thing that would draw it is busy. The flawed button does roughly 400 million comparisons. In the fixture's Node test environment that took a median of about 4.25 seconds across seven runs; the repaired version, which counts each group once and looks the counts up, took a median of 1.4 milliseconds with the identical answer (local synthetic fixture; Node handler CPU time, not a browser measurement). The cost was removed, not hidden behind an animation.

One caution the fixture insists on: those handler numbers describe how much work the code does in a Node harness, not what a user waits in a browser. Nothing in a browser was measured here; the procedure is documented in the repo and was not run because no browser was available.

## What to ask your team or vendor

1. Which element is the largest thing on screen for each key page, how many bytes is its file, and is it sized to the space it fills? Ask for the byte count, not an adjective.
2. Is that hero image lazy-loaded? If yes, why, given that it is the element visitors wait for?
3. For the main actions, what does the click handler do, and how does its cost grow with our real data? "Fine in testing" usually means tested with a small dataset.
4. Were loading and responsiveness measured as two separate things, under one fixed set of conditions: same browser version, screen size, network and CPU throttle, cold and warm reported separately, at least five runs, medians with raw numbers kept?
5. Is there a test that fails on the slow version? In the fixture that is a known-positive control. Without one, a passing test proves only that the test passes.

If the answer to question 4 is a single score from a single run on someone's laptop, you have a measurement of that laptop.

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is abandonment at the two moments that matter most: before the page has shown its first big impression, and at the first click. A visitor who leaves at either never reaches the content you paid to design.

The indirect cost is misattribution. "Slow" gets fixed once, the loading number improves, and the team moves on while the frozen button keeps turning customers away. The fix was real; it was a fix for the other complaint.

The quiet cost is in the engineering conversation. Without separating the two timelines, every performance discussion is one argument about one score. Measuring both turns it into two short lists.

## FAQ

**Our page speed score is good. Why do customers still say the site is slow?**
Page speed tools often focus on the loading timeline. A page can load its largest image quickly and still freeze when a button is pressed, because the code behind the button runs expensive work before the screen can update. Ask for an interaction measurement, not just a loading one.

**Is a big, high-quality hero image worth the slower load?**
Usually the trade-off is false. The fixture shows the same picture at 12,173,721 bytes and at 17,004 bytes, visually equivalent at the size displayed (local synthetic fixture). Resizing to the slot and using a modern compressed format keeps the look and removes almost all the weight.

**Can we just add a loading spinner to the slow button?**
A spinner changes how the wait looks, not how long it is, and the fixture's brief rules it out as a repair. The flawed button cannot even draw a spinner while its code runs, because the same thread does both. Make the work cheaper and verify the result is unchanged.

## Watch the episode

[YouTube link]

Related episodes: [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md) and [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Loading quickly and responding quickly are different tests. Before you sign off on "fast," ask which one was measured, how, and whether the other one was measured at all.

Miz Causevic, Kinetic Gain LLC
