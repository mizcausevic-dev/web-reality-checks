# EP 09 — This Form Looks Finished. Try Using It Without a Mouse.

**Central idea.** A polished screenshot cannot establish keyboard usability; a `<div>` submit button, removed outlines, placeholder-only labels and unassociated errors all look fine until the mouse is taken away.

## What this fixture is
- `fixtures/ep09-keyboard-form/flawed/index.html` — registration form (name, email, password, submit) that is not keyboard-operable: `<div onclick>` submit outside any `<form>`, `* { outline: none }`, placeholders as the only labels, error text shown by class and never associated.
- `fixtures/ep09-keyboard-form/corrected/index.html` — native `<form>` + `<button type="submit">`, `<label for>` on every input, `:focus-visible` outline, DOM order = visual order, `aria-invalid="true"` + `aria-describedby` (error id appended to the existing hint) set after validation fails, values preserved, focus moved once to the first invalid field.
- `audit.mjs` — zero-dependency static audit (tiny HTML parser written in the file + `node:` builtins). Writes `audit-results.json`. The flawed version is the known positive.
- `demo.mjs` — keyboard-journey model over the static DOM; writes `evidence.json`.
- `test.mjs` — 15 `node:test` tests including known-positive controls.
- `keyboard-test-checklist.md` — manual Tab / Shift+Tab / Enter / Space checklist for a real browser.
- Deliberate policies: `novalidate` so the fixture's own messages are tested; focus moves once, only on a submit attempt; errors clear on `input` once valid; no ARIA roles on native controls; `role="status"` on the generic success line is the only ARIA added.
- No positive `tabindex` anywhere. Synthetic data only (`Dana Okafor`, `dana.okafor@example.test`).

## Evidence
- Executed: `node --test fixtures/ep09-keyboard-form/test.mjs` → `# tests 15  # pass 15  # fail 0`.
- Executed: `node fixtures/ep09-keyboard-form/audit.mjs` → `audit-results.json`: flawed **3 / 11 checks pass** (fails: labelled inputs 0/3, placeholder-only 3, outline:none ×2, no :focus-visible, no `<form>`, submit not keyboard-operable, Enter does not submit, errors not associable); corrected **11 / 11 pass** (tab order `name → email → password → button[type=submit]`, 0 dangling `aria-describedby`, 0 positive tabindex).
- Executed: `node fixtures/ep09-keyboard-form/demo.mjs` → `evidence.json`: flawed — 3 tab stops, submit unreachable, Enter in a field → nothing, Tab leaves the form, Enter/Space → nothing. Corrected — 4 tab stops; Enter in password field submits; `email` and `password` rejected with `aria-invalid="true"`, `aria-describedby="email-error"` / `"password-hint password-error"`; focus → `#email`; values preserved; after correction Tab → button → Space → accepted; 7 keystrokes (Tab Tab Tab Enter Tab Tab Space) excluding typing.
- Executed: `cd video && npx tsc --noEmit` → clean.
- Executed: `node tools/build-timeline.mjs ep09 --no-audio` → provisional `timeline.json` (94.76 s estimated, 8 scenes, 16 captions). Rebuild from real narration when audio exists.
- Blocked: no browser in this environment, so focus visibility, tab order and Enter/Space behaviour are modelled from markup and HTML semantics, not captured from a rendered page. `demo.mjs` and the video label this.
- Blocked: no screen reader available. The `label for`, `aria-describedby`, `aria-invalid` and `role=status` associations are implemented; what any browser + screen-reader pair announces was **not verified** and is not claimed.
- Blocked (by spec): no narration audio generated, no MP4 rendered here; the orchestrator fills `render-evidence.json`.

## Video notes
- All scenes except `end` carry the persistent tag `ILLUSTRATIVE RECREATION · KEYBOARD TEST`. The form is re-created with plain `Box` chrome at `127.0.0.1 · <variant>/index.html`; it is not a real product.
- Visual mechanic: keystroke overlay (Tab / Enter / Space chips, latest lit, with a result under each), a restrained cyan spotlight marking the true focus position, cyan label→control connectors tagged `for="…"`, red error→control connectors tagged `describedby`.
- The accessibility-tree panel in `fix_labels` is labelled **SIMPLIFIED** and derived from the markup.
- Every number shown (3 vs 4 tab stops, 0/3 vs 3/3 labelled, 2 vs 0 outline:none, 7 keystrokes, 3/11 vs 11/11 checks, 15 tests) comes from `evidence.json` / `audit-results.json` / the executed test run.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep09    # from narration audio in video/public/ep09/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep09 --concurrency 2
```

## Limitations
- **Keyboard testing is not accessibility compliance.** Contrast, motion, timing, cognitive load, touch targets and the rest of WCAG were not assessed. The narration and end card say so.
- **Screen-reader behaviour is unverified.** Associations are implemented, announcements were not tested. Only report announcements after testing with a named browser + screen reader (e.g. "Firefox + NVDA").
- **No rendered browser.** The static audit is regex-level analysis of inline CSS/script and can miss `box-shadow` focus styles, external stylesheets or dynamically inserted markup. Confirm with `keyboard-test-checklist.md` in a real browser.
- The repair covers this one form. Modals, custom selects, date pickers and multi-step flows each need their own keyboard test.
- The flawed version is a hand-built teaching fixture, not derived from any real product.
