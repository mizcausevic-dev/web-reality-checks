SEO title (≤60 chars): Why a Good-Looking Website Can Still Feel Slow, Explained
Meta description (≤155 chars): A website can look finished and still make you wait twice: once for the big picture, once after you click. A plain-language look at why those differ.
Slug: feels-slow
Primary keyword: why does this website feel slow   Secondary keywords (3–5): slow website explained, website loading vs clicking, why do buttons freeze, big images slow websites, web performance for beginners
Medium tags (5): Technology, Explainer, Internet, Web Design, Software

# Why This Beautiful Website Feels Slow

![Two timelines side by side: a loading track blocked by a 12 MB hero image request, and an interaction track blocked by a synchronous O(n²) click handler on the main thread](../hero.png)

Picture a restaurant on a busy night. The food takes ages to arrive from the kitchen. Later you raise your hand for the bill, and the waiter is so deep in another task that he does not look up. You tell a friend the service was slow. Your friend asks which part. They were two different problems: a slow kitchen and a waiter who could not be interrupted.

Websites have the same two problems, and people use one word for both. This episode builds a page that is slow in both ways, fixes each separately, and shows that neither fix helps the other.

## What the episode shows

We built two versions of a small, polished page on a laptop, with made-up data and a made-up picture. Nothing here is a real company or product (local synthetic fixture). The two versions look identical; a test checks that their code differs only in the picture, the button code and a label.

The first version has a kitchen problem. Its banner picture is a file of 12,173,721 bytes, about 12 megabytes, at 4000 pixels wide, for a space only 1600 pixels wide. The browser cannot draw it until every byte has arrived and been unpacked into dots on the screen, and most of those dots are then squeezed away to fit. All that waiting, for detail you never see.

The second problem is the waiter. Behind the page's button is code that goes through a list of 20,000 items and checks each against all 20,000 others: about 400 million comparisons, and the page must finish every one before it may change anything on screen. While that runs, the button cannot even show it was pressed. In the episode's test environment that work took a median of about four and a quarter seconds across seven runs (local synthetic fixture; this is how long the code ran in a test tool, not a timing taken in a web browser).

## The two fixes

For the kitchen: same picture, resized to the width of its space and saved in a modern compressed format. The file drops from 12,173,721 bytes to 17,004 bytes (local synthetic fixture). Smaller order, faster out of the kitchen. The episode also refuses a popular shortcut: it does not tell the browser to put off loading the banner until later. The banner is the first thing you are waiting for, so delaying it makes the wait longer.

For the waiter: count smarter. Instead of comparing every item against every other, the fixed code counts how many items belong to each group once and looks the totals up. Same answer, checked to the last digit by a test; in the same test environment the median was about one and a half thousandths of a second (local synthetic fixture; again a timing of the code in a test tool, not in a browser). The wait was removed, not covered with a spinning animation.

## What was not measured

Everything above was measured by looking at file sizes and timing the button's code in a test tool. Nobody timed the page in an actual web browser, because no browser was available where the episode was built. So there are no numbers here for how long a real person would wait. The instructions for measuring that properly are in the project: same browser, same screen size, same simulated slow connection, several tries, report the middle value. A file size is not a wait, and the time code takes in a test tool is not the time a person spends staring at a frozen button.

## What this means for you

- When a site feels slow, notice which kind. Waiting for the big picture is the kitchen. Pressing a button and seeing nothing is the waiter. Telling someone which one you hit helps them fix the right thing.
- Pressing a frozen button again usually does not help. The page is busy finishing the first press, and the second is queued behind it. Give it a moment before concluding the site is broken.
- If you pay someone to build a site, "looks great" and "is fast" are separate questions, and "fast to load" and "fast to respond" are separate again. Ask for both to be measured.

## FAQ

**Why does a website show its layout quickly but the big picture appears late?**
The layout is text and shapes the browser can draw almost immediately. The picture is a separate file that must be fully downloaded and decoded first. If that file is far bigger than the space it fills, as in this episode, you wait for detail that is thrown away.

**Why does nothing happen when I click a button on some sites?**
The page runs the code behind the button before it may redraw the screen. If that code is expensive, the page is frozen until it finishes. In the episode the button did about 400 million comparisons before anything could change; the fix did the same job with far less work.

**Would a loading spinner make the slow button feel better?**
On the flawed page it could not even appear, because the part of the browser that runs the button's code is the part that draws spinners. The episode's rule is to make the work cheaper and prove the answer is unchanged, not to decorate the wait.

## Watch the episode

[YouTube link]

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A slow kitchen and a distracted waiter are different problems. Loading quickly and responding quickly are different tests.

Miz Causevic, Kinetic Gain LLC
