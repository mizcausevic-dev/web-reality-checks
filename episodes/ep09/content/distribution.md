# EP09 distribution kit: This Form Looks Finished. Try Using It Without a Mouse.

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep09-keyboard-form/` (evidence.json, audit-results.json, test.mjs, README.md). Keyboard behavior was modeled from markup and HTML semantics, not captured in a browser. No screen reader was used. This is a keyboard test, not an accessibility audit.

## YouTube

### Title options (≤ 60 chars), ranked

1. `This Form Looks Finished. Try Using It Without a Mouse.` (55) : the series title; states the test and the dare in one line.
2. `The Submit Button Is a Div. Tab Skips It. Enter Does Nothing` (60) : names the central defect for engineers who recognize it on sight.
3. `A Screenshot Cannot Show Whether a Form Is Operable` (51) : the closing thesis; good for shares and for the business audience.
4. `Seven Keystrokes to Sign Up. The Broken Form Never Gets There` (59) : the retest result as the hook; concrete and from the fixture.
5. `Focus Is Moving. Nothing Shows It. outline: none Did This.` (56) : leads with the most common of the four defects.
6. `Keyboard Test a Web Form in 90 Seconds` (38) : plain search intent; what to do, how long it takes.

### Description

Three tidy fields and a blue button. A screenshot would sign it off. Take the mouse away and this form cannot be submitted at all.

In this episode we build a small registration form twice on a laptop, with synthetic data only. The flawed version looks finished: a div with a click handler styled as the submit button, a stylesheet rule that removes every focus outline, placeholders as the only labels, and error messages shown by a class change and connected to nothing. Press Tab and focus moves through three fields with no visible sign, then leaves the form. The blue button is never reached. Enter and Space do nothing. The fixture's journey model records it as "no keyboard path to submission."

Then we repair it in two passes. First, native elements: a real form and a real submit button, so Tab reaches it, Enter and Space activate it, Enter in any field submits, and a focus-visible ring shows where you are. Second, persistent labels connected with label for, and errors linked with aria-describedby and aria-invalid after validation fails, with values preserved and focus moved once to the first invalid field. Retest: the same journey, including a rejected submission and its correction, completes in seven keystrokes: Tab Tab Tab Enter Tab Tab Space. The static audit goes from 3 of 11 checks to 11 of 11. The regression suite runs 15 tests, 15 pass, including four known-positive controls that prove each defect exists in the flawed version.

What this does not prove: keyboard behavior was modeled from markup, not captured in a browser; no screen reader was available, so the associations are implemented but announcements were not verified; and keyboard testing is not an accessibility audit. Contrast, motion, timing and the rest of WCAG were not assessed.

Chapters
00:00 A form that looks finished
00:08 Take the mouse away
00:14 Focus moves, nothing shows it; the button is a div
00:30 Repair one: native form, native button, focus-visible
00:44 Repair two: persistent labels with label for
00:55 Invalid data: aria-describedby and aria-invalid
01:07 Retest: seven keystrokes, no mouse
01:18 Keyboard test, not an audit

Fixture, tests, manual checklist and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep09/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

web accessibility, keyboard accessibility, keyboard navigation, focus visible, outline none, div as button, native button, html forms, form validation, aria-describedby, aria-invalid, label for, placeholder labels, accessible forms, frontend development, html semantics, keyboard testing, web development, a11y, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic data; the flawed form was written by hand. Keyboard behavior was modeled from markup, no screen reader was used, and this is not an accessibility audit. Fixture and 15 tests: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The submit button was a div with onclick. Tab skipped it. Enter and Space did nothing. The form looked finished.

Episode 9 of Web Reality Checks: a keyboard test of a registration form, built twice on a local fixture with synthetic data.

Four defects no screenshot can show:
1. <div onclick> as the submit control, outside any <form>. Not focusable, no key activation, no implicit submission.
2. * { outline: none }. Focus moves; nothing marks it.
3. Placeholders as the only labels. Gone on the first keystroke.
4. Errors toggled by class. No aria-describedby, no aria-invalid.

The repair is structural: native <form> and <button type="submit">, a :focus-visible ring, <label for> on every input, and on a failed submit aria-invalid="true", error id appended to aria-describedby, values untouched, focus moved once to the first invalid field. No positive tabindex. No ARIA on native controls.

Audit 3/11 to 11/11. 15 tests, 15 pass, four of them known-positive controls. Corrected journey with a rejected submission: Tab Tab Tab Enter Tab Tab Space. Seven keystrokes. The flawed journey has no ending.

Limits: modeled from markup, no browser, no screen reader. Keyboard test, not an audit.

github.com/mizcausevic-dev/web-reality-checks

#Accessibility #WebDevelopment #Frontend

### Post 2: non-technical leaders

Your signup form passed design review and QA. Can it be submitted without a mouse? Nobody on the team has tried.

Episode 9 of Web Reality Checks runs a polished registration form with the mouse out of reach. The flawed version cannot be submitted by any sequence of keys. Tab moves through the fields with no visible marker, then leaves the form. The button is skipped.

The button was a picture of a button: a blue box with a click handler, not a real button the browser can operate. An elevator panel painted onto the wall.

The fixed version uses real building blocks, shows a ring wherever you are, keeps labels on screen, and ties each error to its field. Same journey, mistake included: seven key presses.

Five questions for your team or vendor:
1. Has anyone completed every form with the mouse unplugged, and written down the result?
2. Are the buttons real buttons, inside real forms?
3. When I press Tab, can I see where I am?
4. Does every field have a label that stays after I type?
5. After a bad submit, is each error tied to its field, is my data kept, where does focus go?

"The scanner passed" answers none of these.

Keyboard test, not an accessibility audit, on a synthetic fixture. github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Accessibility #Leadership

## X/Twitter thread

1/ A registration form. Three tidy fields, a blue button. A screenshot would sign it off. Take the mouse away and it cannot be submitted at all. Episode 9 of Web Reality Checks is a keyboard test on a local fixture. Thread.

2/ Press Tab. Focus lands in the name field, but nothing shows it: * { outline: none } removed every focus indicator. Tab, Tab, same. Tab again and focus has left the form. The blue button was never a stop.

3/ Because it is not a button. It is a <div class="btn" onclick>. Not focusable, so Tab skips it. No key activation, so Enter and Space do nothing. Outside any <form>, so Enter in a field has nothing to submit. The fixture records: "no keyboard path to submission."

4/ Two more defects stacked on top. Placeholders are the only labels, and they vanish on the first keystroke. Error messages are toggled by a CSS class and connected to nothing: no aria-describedby, no aria-invalid.

5/ Repair one: native <form> + <button type="submit">. Tab reaches it, Enter and Space press it, Enter in any field submits. A :focus-visible ring, 3 px with 2 px offset, shows where you are. No tabindex anywhere.

6/ Repair two: <label for> on every input. On a failed submit: aria-invalid="true", the error id appended to aria-describedby (hint kept), values preserved, focus moved once to the first invalid field. No ARIA roles on native controls.

7/ Retest, same journey with a rejected submission and its correction: Tab Tab Tab Enter Tab Tab Space. Seven keystrokes. Audit 3/11 to 11/11. 15 tests, 15 pass (local synthetic fixture). Limits: modeled from markup, no browser, no screen reader. Keyboard test, not an audit.

8/ A screenshot cannot show whether a form is operable. Fixture, tests, manual Tab/Shift+Tab/Enter/Space checklist, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A two-version registration form fixture showing why a div-as-submit, outline:none, placeholder-only labels and unassociated errors fail a keyboard test, with a static audit and 15 node:test tests

**First comment:** This is a deliberately constructed local fixture with synthetic data; the flawed form was written by hand to demonstrate the four defects, so it is not a finding about any real product. Keyboard behavior (tab order, Enter/Space, focus after a failed submit) was modeled from the markup and HTML semantics because no browser was available, and no screen reader was used, so the label/aria-describedby/aria-invalid associations are implemented but their announcements were not verified. The README is explicit that this is a keyboard test, not an accessibility audit, and ships a manual Tab/Shift+Tab/Enter/Space checklist for confirming the results in a real browser.

## Short-form hook lines (≤ 12 words)

1. The submit button is a div. Tab skips it.
2. Focus is moving. Nothing on screen shows where.
3. Take the mouse away. Now try to sign up.
4. Seven keystrokes on the fixed form. Zero on the broken one.
5. A screenshot cannot show whether a form is operable.

## Alt text

**hero.png:** Keyboard-only test of a polished registration form with name, email and password fields. A keystroke overlay shows Tab pressed four times; a cyan focus spotlight has passed through three unmarked fields and left the form, and the blue Create account control, labeled as a div with a click handler, was never reached. Enter and Space show "nothing happened."

**thumbnail.png:** Episode thumbnail for "This Form Looks Finished. Try Using It Without a Mouse." showing a clean registration form beside a crossed-out mouse and a Tab key, with the blue submit button marked as a div that the keyboard cannot reach.
