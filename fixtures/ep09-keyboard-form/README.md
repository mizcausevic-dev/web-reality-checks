# EP09 fixture — keyboard-operable registration form

Two versions of the same small registration form (name, email, password, submit), a zero-dependency static audit, a keyboard-journey demo, regression tests and a manual checklist.

- `flawed/index.html` — looks finished, is not keyboard-operable: submit is a clickable `<div onclick>` outside any `<form>`; `* { outline: none }` removes focus indication everywhere; placeholders are the only labels; error `<div>`s are shown by class and never associated with their inputs.
- `corrected/index.html` — native `<form>` + `<button type="submit">`; `<label for>` on every input; `:focus-visible` outline (3 px, offset); DOM order is the visual order (no positive `tabindex`, no CSS reordering); after validation fails the script sets `aria-invalid="true"` and appends the error id to `aria-describedby` (keeping the existing password hint), leaves every typed value in place, and moves focus once to the first invalid field. No ARIA roles are added to native controls.
- `audit.mjs` — static audit built on a tiny HTML parser written in the file (no npm). Counts labelled inputs, placeholder-only inputs, positive `tabindex`, `outline:none` declarations, `:focus-visible` rules, whether the submit control is a native button (or a custom control with focusability + role + key handler), whether `aria-describedby` targets exist, and whether error containers are associable. Writes `audit-results.json`.
- `demo.mjs` — runs the keyboard journey the video shows against both versions and writes `evidence.json` (see "How the demo works").
- `test.mjs` — `node:test` regression tests, including known-positive controls that assert each defect **is present** in the flawed version.
- `keyboard-test-checklist.md` — manual Tab / Shift+Tab / Enter / Space checklist for a real browser.

## Run
```
cd fixtures/ep09-keyboard-form
node audit.mjs          # → audit-results.json
node demo.mjs           # → evidence.json
node --test test.mjs
```
No server, no network, no dependencies. Synthetic data only (`Dana Okafor`, `dana.okafor@example.test`).

## Executed
```
$ node --test test.mjs
# tests 15
# pass 15
# fail 0

$ node audit.mjs
== flawed ==     checks passed 3 / failed 8
== corrected ==  checks passed 11 / failed 0
```
Audit counts — flawed: inputs 3, labelled 0, placeholder-only 3, `outline:none` declarations 2, focusable elements 3 (submit not among them), positive tabindex 0, errors associable false.
Audit counts — corrected: inputs 3, labelled 3, placeholder-only 0, `outline:none` 0, focusable elements 4 (`name → email → password → button[type=submit]`), positive tabindex 0, dangling `aria-describedby` 0.

Demo (evidence.json) — flawed: 3 tab stops, submit not reachable, Enter in a field does nothing, Tab after the last field leaves the form, Enter/Space then do nothing → no keyboard path to submission. Corrected: 4 tab stops; Enter in the password field submits; validation rejects `email` and `password`; `#email` gets `aria-invalid="true"` + `aria-describedby="email-error"`, `#password` gets `aria-describedby="password-hint password-error"`; focus moves to `#email`; all three values preserved; after correcting the data, Tab → button → Space → accepted. Seven keystrokes for the fill-and-submit journey (Tab Tab Tab Enter Tab Tab Space), excluding typing.

## How the demo works (read before quoting it)
No browser is available in this environment. `demo.mjs` is a **keyboard-journey model over the static DOM**: sequential focus order comes from the markup (same model as `audit.mjs`), Enter/Space behaviour comes from HTML semantics (implicit submission exists only inside a native `<form>` with a submit control; a `<div onclick>` with no `tabindex`/role/key handler is neither focusable nor activatable), and the validation rules are mirrored from the page scripts (identical regex, length and messages). The `aria-*` and focus outcomes recorded for the corrected version describe what its script sets and are cross-checked against the script text. They were not observed in a rendered page.

## Deliberate policies
- `novalidate` on the corrected form so the fixture's own messages are the ones shown and tested; the browser's native bubbles would otherwise pre-empt them.
- Focus moves **once**, to the first invalid field, only after a submit attempt. Nothing moves focus on `input`.
- Errors clear on `input` as soon as the field becomes valid, so stale messages do not persist.
- The password hint stays in `aria-describedby`; the error id is appended, not substituted.
- `role="status"` on the success line is the only ARIA added, on a generic `<div>` that has no native role.

## Limitations / what is NOT tested
- **No screen reader was available.** The associations (`label for`, `aria-describedby`, `aria-invalid`, `role=status`) are implemented; what any screen reader announces was not verified. Only report announcements after testing with a named browser + screen-reader pair.
- **No browser.** Focus visibility, tab order and Enter/Space behaviour are modelled from markup and semantics, not captured from a rendered page. Use `keyboard-test-checklist.md` in a real browser to confirm.
- The static audit is heuristic text analysis (regex over CSS and script). It can miss focus styles applied via `box-shadow`, styles from external stylesheets (none here), or dynamically inserted markup.
- Keyboard operability is one slice of accessibility. Passing every check here says nothing about contrast, motion, timing, cognitive load or WCAG conformance as a whole.
- The flawed version is a teaching fixture. It is not derived from any real product.
