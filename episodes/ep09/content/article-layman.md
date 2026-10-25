SEO title (≤60 chars): Why Some Web Forms Can't Be Filled In Without a Mouse
Meta description (≤155 chars): A signup form can look perfect and still be impossible to submit with the keyboard. A plain-language look at why, and what to do when one fights you.
Slug: keyboard-form
Primary keyword: fill out form without mouse   Secondary keywords (3–5): tab key not working on website, website button does nothing, keyboard navigation explained, accessible forms for everyone, why forms are frustrating
Medium tags (5): Technology, Accessibility, Explainer, Web, Design

# This Form Looks Finished. Try Using It Without a Mouse.

![Keyboard-only test of a polished registration form: focus has moved through three unmarked fields and left the form, while the blue Create account control, a div with a click handler, was never reached](../hero.png)

Picture a hotel elevator with a beautiful brass panel. Every floor number is there, the arrows glow, the finish is spotless. You step in and press 4. Nothing. You press it again. Nothing. The panel is a photograph of a panel, glued over the wall. The real buttons are somewhere else, and nobody told you.

That is what this episode is about, except the elevator is a signup form on a website and the photograph is a blue button that only works if you click it with a mouse.

## What the episode shows

We built a small registration form on a laptop: full name, email, password, and a blue "Create account" button. It is a practice form with made-up details, not a real product, and nothing typed into it goes anywhere (local synthetic fixture). It looks finished. A screenshot would say so.

Then we take the mouse away. On most websites, the Tab key moves you from one thing to the next, and Enter or the space bar presses whatever you have landed on. Press Tab once on the practice form and you are in the name field, except nothing on the screen shows it. Tab again, email, still no sign. Tab again, password, same. Tab a fourth time and you have left the form altogether. The blue button was skipped. Press Enter, press Space, nothing happens (local synthetic fixture). The form cannot be submitted without a mouse. Not "hard to submit." Cannot.

## Why a button can be a picture of a button

Web pages are made of building blocks, and the browser knows what some of them are for. A real button block is treated specially: Tab stops on it, Enter and Space press it, and if it sits inside a real form block, pressing Enter in any field submits. The person who built the flawed form did not use a button block. They used a plain box, painted it blue, wrote "Create account" on it, and told it to react to mouse clicks. To the eye it is a button. To the browser it is wallpaper. That is the brass panel glued to the wall.

Three smaller things make it worse. A line in the page's styling erased the thin glowing border that normally shows which box you are in, so you move through the form blind. The grey hint text inside each field was the only label, and that text disappears the moment you type, like a sign that falls off the door when you open it. And the red error message, when it appeared, was not connected to its field in any way the browser could follow.

## The fix

Use the real buttons. The corrected form wraps everything in a real form block and uses a real button block for "Create account." Immediately, Tab stops on it, Enter and Space press it, and Enter inside any field submits. A visible blue ring follows you from field to field. Each field gets a proper label that stays above it. And when you submit something wrong, say a half-typed email, the message appears beside the field, the field is marked as needing attention, everything you typed stays put, and the cursor jumps once to the first problem.

In the episode, the whole journey on the fixed form, including making a mistake and correcting it, takes seven key presses: Tab, Tab, Tab, Enter, Tab, Tab, Space (local synthetic fixture). The same journey on the flawed form never ends, because there is no key that finishes it.

## What this means for you

- If a website form ever "does nothing" when you press Enter, or the Tab key seems to skip the button, the form is probably built this way. It is not you. Try clicking the button with the mouse if you can, and if you cannot, the company has a bug worth telling them about.
- Lots of people use the keyboard for all or most of what they do: people with hand or arm conditions, people who use screen magnifiers or special switches, and people who are simply faster that way. A form that only works by mouse quietly shuts all of them out, and they usually just leave.
- If you ever have a say in how a website gets built, ask one question before launch: has someone filled in every form with the mouse unplugged, and written down what happened at each step? A screenshot cannot answer it. Only trying can.

## FAQ

**Why does pressing Tab skip the button on some websites?**
Because the button is not a real button in the page's structure, only a box styled to look like one. The browser only stops on things it recognizes as controls. A fake button is invisible to the Tab key no matter how convincing it looks.

**Why does nothing show which field I am in on some forms?**
Browsers normally draw a thin ring around whatever is selected. Some designers remove it because they think it looks untidy, and do not replace it. The result is a form you have to navigate blind. The fix is a clearly visible ring, which the corrected form in this episode has.

**Does fixing the keyboard make a website fully accessible?**
No. This episode is a keyboard test, not a full accessibility review. Things like color contrast, text size, and what a screen reader says out loud were not tested here, and no screen reader was used. Each of those needs its own check.

## Watch the episode

[YouTube link]

Related episodes: [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md) and [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A photograph of an elevator panel takes nobody to the fourth floor. A screenshot cannot show whether a form is operable. Press Tab and find out.

Miz Causevic, Kinetic Gain LLC
