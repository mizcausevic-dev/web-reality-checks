SEO title (≤60 chars): The Form Looks Finished. Tab Through It and It Falls Apart
Meta description (≤155 chars): A div submit button, outline none, placeholder labels, loose errors: a form that passes screenshots and fails the keyboard. Fixture, tests, repair, retest.
Slug: keyboard-form
Primary keyword: keyboard accessible form   Secondary keywords (3–5): focus-visible, div as button, placeholder only labels, aria-describedby error message, keyboard testing checklist
Medium tags (5): Accessibility, Web Development, HTML, Frontend, Software Engineering

# This Form Looks Finished. Try Using It Without a Mouse.

![Keyboard-only test of a polished registration form: focus has moved through three unmarked fields and left the form, while the blue Create account control, a div with a click handler, was never reached](../hero.png)

The registration form has three tidy fields and a blue button. A screenshot would sign it off. Take the mouse away and the same form cannot be submitted at all: focus moves with nothing to show it, and the button is never reached.

This is episode nine of Web Reality Checks. The fixture is a small registration form, built twice: a flawed version that looks finished and a corrected one that works from the keyboard. It is a keyboard test, not an accessibility audit, and it says nothing about what a screen reader announces, because none was available. Those limits are repeated at the end.

## What actually happens

Four separate decisions make the flawed form look right and behave wrong. Each has a mechanism.

**A `<div>` with a click handler is not a button.** The browser's sequential focus order is built from focusable elements: `input`, `button`, `select`, `textarea`, links with `href`, and anything with a non-negative `tabindex`. A plain `<div onclick>` is none of those, so Tab skips it. Even if it were focused, Enter and Space do nothing, because key activation is behavior the `button` element provides and a `div` does not. The click handler fires only for a pointer.

**No `<form>` means no implicit submission.** Pressing Enter in a text field submits the form it belongs to, and that mechanism exists only inside a `<form>` with a submit control. Three inputs sitting in a `<div class="card">` have no form to submit. Enter does nothing, and there is no error to say why.

**`outline: none` removes the only default focus indicator.** Browsers draw focus with the `outline` property. A universal `* { outline: none }` rule, plus a second one on `.input:focus` with the border color left unchanged, means focus is moving but nothing on screen records where it is.

**Placeholders disappear and error text floats.** A placeholder is replaced by the value as soon as you type, so the field's only name vanishes the moment you use it. Error messages toggled by a CSS class are visible to the eye but attached to nothing in the DOM: no `aria-describedby` points at them and no `aria-invalid` marks the field.

None of this is visible in a still image. Each defect is a property of behavior under input, and a screenshot has no input.

## The fixture

`fixtures/ep09-keyboard-form/` contains two versions of the form, a zero-dependency static audit, a keyboard-journey demo, a `node:test` suite and a manual checklist. Synthetic data only: `Dana Okafor`, `dana.okafor@example.test`. The flawed version is a hand-built teaching fixture, not derived from any product.

The flawed form's submit control and its CSS, from `flawed/index.html`:

```html
<style>
  * { outline: none; }                 /* FLAW: focus indication removed everywhere */
  .input:focus { outline: none; border-color: #d5d8de; } /* FLAW: focus looks identical to unfocused */
</style>
...
<input class="input" id="name" type="text" placeholder="Full name">
<div class="error" id="name-error">Please enter your name.</div>
...
<!-- FLAW: clickable <div> as the submit control. Not focusable, no role, no key handling. -->
<div class="btn" id="submit" onclick="submitForm()">Create account</div>
```

The corrected form, from `corrected/index.html`, replaces the structure rather than patching it:

```html
<form id="signup" novalidate aria-labelledby="form-title">
  <label for="name">Full name</label>
  <input class="input" id="name" name="name" type="text" autocomplete="name">
  <div class="error" id="name-error"></div>
  ...
  <label for="password">Password</label>
  <input class="input" id="password" name="password" type="password"
         autocomplete="new-password" aria-describedby="password-hint">
  <div class="hint" id="password-hint">At least 8 characters.</div>
  <div class="error" id="password-error"></div>
  <button class="btn" type="submit">Create account</button>
  <div class="status" id="status" role="status"></div>
</form>
```

The focus style is one rule: `.input:focus-visible, .btn:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }`. The offset keeps the ring visible regardless of the border color under it, including the red invalid border.

`audit.mjs` parses both files with a tiny HTML parser written in the file and runs eleven checks, from labeled inputs and `outline:none` declarations to a keyboard-operable submit control and associable errors. Its header says what it is: "a static, heuristic audit of markup and CSS text. It is not a browser, not an accessibility-conformance tool, and it does not verify screen-reader output."

## The test that proves it

`node --test fixtures/ep09-keyboard-form/test.mjs` runs 15 tests and reports `# tests 15  # pass 15  # fail 0` (local synthetic fixture). Four of them are known-positive controls that assert each defect is present in the flawed version:

- `KNOWN-POSITIVE CONTROL: flawed form has zero labelled inputs, three placeholder-only inputs`
- `KNOWN-POSITIVE CONTROL: flawed CSS removes focus indication (outline:none) and declares no :focus-visible style`
- `KNOWN-POSITIVE CONTROL: flawed submit control is a <div onclick> with no form, not focusable, not keyboard operable`
- `KNOWN-POSITIVE CONTROL: flawed error text is never associated (no aria-describedby / aria-invalid in script)`

The assertion message in the first one states the reason: "the flaw must be observable or the fix test proves nothing." On the corrected side, `corrected: native <form> and <button type=submit>, inside the form, reachable by Tab, Enter in a field submits` pins the tab order to exactly `input#name → input#email → input#password → button[type=submit]`, and `corrected: no unnecessary ARIA roles on native controls` fails if anyone adds `role="button"` to a `<button>`.

From `audit-results.json` (local synthetic fixture): flawed passes 3 of 11 checks. Counts: 3 inputs, 0 labeled, 3 placeholder-only, 2 `outline:none` declarations, 3 focusable elements with the submit not among them. Corrected passes 11 of 11: 3 of 3 labeled, 0 `outline:none`, 4 focusable elements, 0 dangling `aria-describedby`, 0 positive `tabindex`.

`demo.mjs` walks the keyboard journey the video shows and writes `evidence.json`. Flawed version: 3 tab stops, `div#submit` with `reachableByTab: false`, Enter in the password field "nothing happened", the next Tab moves focus to `body`, and Enter and Space from there both "nothing happened". The valid-submission outcome is `"no keyboard path to submission"`.

## The repair

Two changes, in the order the video makes them.

**Repair one: native elements.** Wrap the fields in a `<form>` and make the submit control a `<button type="submit">`. The button joins the tab order because `button` is natively focusable; Enter and Space activate it because that is what the element does; Enter in any field submits because implicit submission now has a form to act on. The `:focus-visible` rule draws a 3 px ring with a 2 px offset. No `tabindex` is used anywhere, and DOM order is the visual order, so the browser's default sequence is already right.

**Repair two: persistent labels and associated errors.** Each input gets a `<label for>` pointing at its `id`. The password hint is always linked through `aria-describedby="password-hint"`. On a failed submit, the script sets `aria-invalid="true"` on each invalid field and appends the error id to `aria-describedby` rather than replacing it, so the password field ends up with `"password-hint password-error"`. Values are never cleared. Focus moves once, to the first invalid field, and only on a submit attempt. Errors clear on `input` as soon as the field becomes valid.

Two README policies are worth repeating because each is a choice someone could undo. `novalidate` is set so the fixture's own messages are shown and tested, instead of the browser's native bubbles pre-empting them. `role="status"` on the success line is the only ARIA added, on a generic `<div>` with no native role. No roles are added to `input`, `button` or `form`.

## Retest

From `evidence.json`, corrected version (local synthetic fixture):

- 4 tab stops: `input#name`, `input#email`, `input#password`, `button[type=submit]`.
- Enter in the password field with `dana.okafor@example` and `short1` entered: outcome `rejected`, source "Enter in field → implicit form submission".
- `#email` gets `aria-invalid="true"` and `aria-describedby="email-error"`. `#password` gets `aria-invalid="true"` and `aria-describedby="password-hint password-error"`. `#name` gets neither.
- `focusMovedTo: "email"`, the first invalid field. `valuesPreserved: true`; all three typed values are still there.
- After correcting the email and password: Tab, Tab to the button, Space, outcome `accepted`.
- Keystrokes for the fill-and-submit journey, excluding typing: Tab Tab Tab Enter Tab Tab Space. Seven.

The same journey on the flawed version has no ending. There is no keystroke that submits it.

## What this does not prove

- **Keyboard behavior was modeled, not captured.** No browser was available. Tab order comes from the markup, Enter and Space from HTML semantics, validation rules mirrored from the page scripts. Nothing was observed on a rendered page. `keyboard-test-checklist.md` exists so you can confirm it in a real browser.
- **No screen reader was used.** The `label for`, `aria-describedby`, `aria-invalid` and `role="status"` associations are implemented. What any browser and screen reader pair announces was not verified and is not claimed. Report announcements only after testing with a named pair, such as Firefox + NVDA.
- **Keyboard testing is not an accessibility audit.** Contrast, motion, timing, cognitive load, touch targets and the rest of WCAG were not assessed.
- **The static audit is regex over CSS and script text.** It can miss `box-shadow` focus styles, external stylesheets, or markup inserted at runtime.
- **One form.** Modals, custom selects, date pickers and multi-step flows each need their own keyboard test.

## Launch checklist

Drawn from the fixture's checklist pass criteria and README policies:

1. Every interactive control is reachable with Tab and Shift+Tab, in the order it appears visually, with no positive `tabindex` anywhere.
2. Focus is visible at every stop, including at 200% zoom and on fields in an invalid state.
3. Submit controls are native `<button>` or `<input type="submit">` inside a `<form>`; Enter in a field and Enter or Space on the button all submit.
4. Every input has a persistent, visible `<label for>`; placeholders carry format hints only.
5. After a failed submit, errors appear beside their fields, `aria-invalid` is set, `aria-describedby` points at the message (appended to any existing hint), and values are preserved.
6. Focus moves once, predictably, to the first invalid field, and only on a submit attempt.
7. No `outline: none` without a replacement `:focus-visible` style that is visible on every background.
8. A known-positive control exists: a deliberately broken variant your tests fail on.

## FAQ

**Why can't a div with onclick be used as a submit button?**
A `div` is not in the browser's focus order and has no key activation, so Tab skips it and Enter and Space do nothing. Making it work needs `tabindex="0"`, `role="button"` and a key handler, and it still cannot trigger implicit submission. A native `<button type="submit">` does all of this by default.

**Is it safe to use outline: none on form inputs?**
Only if a replacement focus indicator is visible on every background. `outline` is the browser's default focus marker; removing it without a `:focus-visible` rule leaves keyboard users unable to see where they are. The fixture uses a 3 px outline with a 2 px offset so it survives border color changes.

**How do I associate an error message with a form field?**
Give the message an `id`, set `aria-describedby` on the input to that id (appended to any existing hint id), and set `aria-invalid="true"` when validation fails. Keep the value in place and move focus once to the first invalid field. What a screen reader announces still needs testing with a named browser and screen reader.

## Watch the episode

[YouTube link]

- 00:00 A form that looks finished
- 00:08 Take the mouse away
- 00:14 Focus moves, nothing shows it; the button is a div
- 00:30 Repair one: native form, native button, focus-visible
- 00:44 Repair two: persistent labels with label for
- 00:55 Invalid data: aria-describedby and aria-invalid
- 01:07 Retest: seven keystrokes, no mouse
- 01:18 Keyboard test, not an audit

Related episodes: [Why This Beautiful Website Feels Slow](../../ep08/content/article-technical.md) and [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A screenshot cannot show whether a form is operable. Put the mouse out of reach, press Tab, and write down where focus went.

Miz Causevic, Kinetic Gain LLC
