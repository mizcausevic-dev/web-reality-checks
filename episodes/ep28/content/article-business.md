SEO title (≤60 chars): A Hidden Admin Button Does Not Stop Admin Actions
Meta description (≤155 chars): If your product only hides admin buttons, any member may still be able to run admin actions. Five questions to ask your team or vendor before launch.
Slug: hidden-admin-button-business-risk
Primary keyword: admin permissions check   Secondary keywords (3–5): role-based access control, hidden button security, software vendor security questions, access control audit
Medium tags (5): Product Management, Startups, Web Security, Software Quality, Risk Management

# Your Team Hid the Admin Button. Did Anyone Block the Action?

![A member's read-only screen with no publish button, beside a record showing a member's request created an announcement anyway](../hero.png)

A member of your product opens the announcements page. There is no publish button. The screen looks locked down, the design review signed off, and the demo went well. Then a request from that same member publishes an announcement anyway, and the count of announcements goes up by one.

This is episode 28 of Web Reality Checks. The short version: a hidden button is a design decision, not a security decision. The action was only ever protected if the server refuses it.

## The symptom as a business event

Nobody sees this failure happen. There is no error, no crash and no angry customer on day one. What you get later is a record that should not exist: an announcement, a price change, a refund, an export, published or performed by someone who was never meant to have that power. By the time you notice, the question is no longer "is the screen right?" but "what else could this person do, and for how long?"

In the episode's controlled test, the member had a valid sign-in and a valid security token. The server accepted the publish request and returned 201 Created, and the database count went from 1 to 2 (local synthetic fixture). The screen never showed a button. It did not need to.

## Why a demo cannot show this

A demo follows the buttons on screen. The member has no publish button, so in a demo nobody publishes as a member, and the demo is clean. The flaw sits on a path no one clicks, and only appears when someone sends the request directly.

That is also why "the QA pass was fine" and "the vendor demo was fine" are weak assurances here. Both exercise the interface. The risk lives in the layer behind it, which the interface never shows.

## The mechanism in plain terms

Three separate checks stand between a request and a change.

- Who is this? The system confirms there is a live sign-in. If not, it answers 401.
- Did this come from our own page? A security token confirms the request is not forged by another site. If not, it answers 403 with its own error code.
- May this person do this? The system checks the person's role against a permission list it keeps itself. If not, it answers 403 with a different code.

The flawed version in the fixture performed the first two and skipped the third. Both passed for a legitimate, signed-in member, so the action ran.

An accurate way to picture it: a cashier's screen where someone removed the "Refund" button, while the register still accepts the refund command from anyone logged in. Removing the button changed what the cashier can see. It did not change what the register will do.

In the repaired version, one check was added before anything is written. It looks up the person's current permission in the server's own store. A role claim sent by the browser is never read. In the episode's retest, the same member, same sign-in and same valid token got 403 `PERMISSION_DENIED`, and the count stayed at 2, so nothing was created. The administrator's request still worked: 201, and the count became 3 (local synthetic fixture). The gate stops the member without stopping the administrator.

## What to ask your team or vendor

1. For each action that changes data or reveals sensitive data, where is the permission checked: in the screen, or on the server before anything is written?
2. Can you show a test where a user without the permission sends the request directly, with a valid sign-in and valid security token, and is refused?
3. After a refused request, does the test confirm the database did not change, and not just that an error was returned?
4. Is there a deliberately broken version that your test catches, so we know the test can see the problem?
5. If we remove someone's permission today, does it take effect on their current session, or only after they sign in again?

A clear answer names the file, the test and the result. A vague answer, or "the button is hidden," means the status is unknown, not safe.

## What it costs if ignored

The costs are qualitative, and they compound.

- Records and actions that should not exist, with no automatic way to tell which ones were legitimate.
- Time spent working out what a person could have done, rather than what they did.
- Trust damage with customers whose data or workflows sat behind a control that only looked closed.
- Slower reviews and sales cycles when a buyer's security team asks question 2 above and nobody can answer.
- A fix that arrives under pressure, applied route by route, instead of as a tested pattern.

None of this needs an attacker. A curious member, a stale bookmark or a script written for another purpose can send the request.

## What this episode does not show

The fixture checks one kind of rule: may this role perform this action at all? It does not decide which individual records a person may touch, which needs a separate ownership check (episode 1). It covers one route, uses a test client rather than a real browser, and does not claim any application is fully secure. Every other privileged route needs its own check and its own test.

## FAQ

**If a button is hidden, is the action protected?**
No. A hidden button only changes what a person sees. The action is protected when the server refuses the request from anyone without the permission, whatever the screen shows.

**What should I ask a vendor about admin features?**
Ask where the permission check runs, and ask to see a test where a non-admin sends the admin request directly and is refused, with the database unchanged afterward.

**Is a security token the same as a permission check?**
No. A token shows the request came from your own page. A permission check decides whether the signed-in person may perform the action. A member can pass the first and still need to fail the second.

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
