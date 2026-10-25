SEO title (≤60 chars): Hidden Is Not Locked: Why a Missing Button Is Not Safety
Meta description (≤155 chars): A website hid a button from regular users, yet a regular user's request still did the job. A plain-English look at hidden versus locked.
Slug: hidden-is-not-locked
Primary keyword: hidden button not secure   Secondary keywords (3–5): website permissions explained, hidden vs locked, admin access explained, how websites check permissions
Medium tags (5): Web Security, Technology Explained, Privacy, Software, Cybersecurity

# A Missing Button Is Not a Locked Door

![A member's read-only page with no publish button, next to a record showing the member's request created an announcement](../hero.png)

Picture a venue with a staff room. On the customer side, the door to that room is painted to match the wall. There is no handle, no sign, nothing to tempt you. It looks sealed.

Now picture that the door was never locked. Anyone who knows where it is and pushes the right spot can walk in. The paint changed what you could see. It did not change who could enter.

That is the whole story of episode 28 of Web Reality Checks, played out on a small app built for the video.

## What happened

The app lets administrators publish announcements. Regular members cannot. To enforce that, the app hides the "Publish" button from members. A member's page shows a plain read-only view, and the button is simply not there.

Then the test sent a publish request on the member's behalf, the same message the missing button would have sent. The app accepted it. It answered 201 Created, and the number of announcements went from 1 to 2 (from the local test setup used in the video, with made-up data).

Paint on the wall, door unlocked.

## Why nobody noticed

Nobody notices a hidden door when they use the venue as intended. A regular member sees no button, so a regular member never presses it. Everything looks right from the customer side, which is the only side a demo shows.

The problem only appears when someone sends the request without using the button. That takes effort, which is why it can sit there unseen.

## What the guard did check

The app does have a guard at the entrance, and it did its job. It checked two things.

- Are you a signed-in guest? Yes, the member really was signed in.
- Did this request come from our own front desk, not from a stranger's trick? Yes, it carried a proper stamp from the app.

What the guard never asked was the third question: is this guest allowed in the staff room? Two checks passed, so the door opened.

## The fix

The repair added a lock, not more paint. Before anything is created, the app now looks at its own staff list and asks whether this person is allowed to publish. The list lives on the app's side, where visitors cannot edit it. A note from a visitor saying "I'm an administrator" is never read.

The same member, with the same sign-in and the same valid stamp, now got a firm "no" (a 403 error with the label `PERMISSION_DENIED`), and the count stayed at 2. Nothing was created. When the real administrator tried, it worked: 201 Created, and the count went to 3 (local test setup, made-up data).

A good lock keeps out the wrong person and lets in the right one. The test checked both.

## What this means for you

- A missing button or greyed-out menu tells you what you are shown. It does not tell you what you are blocked from doing.
- When someone says an app is secure because "regular users can't see that feature," ask who checks the permission behind the scenes.
- A sign-in alone does not mean everything is allowed. Being signed in means the app knows who you are, and a second check decides what you may do.

## What this does not cover

This was one action in one small test app, with made-up people. It shows the idea of "hidden versus locked," and it says nothing about any real product or company. It also looks only at who may perform an action, not at which individual records belong to whom. A real app has many such doors, and each one needs its own lock and its own test.

## FAQ

**Can a website hide something and still allow it?**
Yes. A page can leave out a button while the server behind it still accepts the matching request. Hiding changes what you see. Only a check on the server decides what is refused.

**What is a permission check?**
It is the server looking up whether your account is allowed to do a specific action, using a list it keeps itself. It does not rely on anything your browser claims about you.

**Does being signed in mean I can do anything?**
No. Signing in tells the app who you are. A separate check decides what that person may do. A well-built app does both, every time.

## Watch the episode

[YouTube link]

- 00:00 Hidden button, working request
- 00:09 Controlled test: valid session, valid token
- 00:17 The leak: 201 Created, count 1 to 2
- 00:27 Three questions: who, from where, may they
- 00:42 The repair: server-side permission gate
- 00:56 Retest: 403 PERMISSION_DENIED, count stays 2
- 01:08 Administrator: 201, count becomes 3
- 01:15 What this does not fix

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [Watch What Happens When You Click 'Sign In'](../../ep03/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The browser can hide the action. Only the server can deny it.

Miz Causevic, Kinetic Gain LLC
