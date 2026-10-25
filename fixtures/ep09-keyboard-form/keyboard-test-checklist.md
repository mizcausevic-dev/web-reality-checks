# Manual keyboard test checklist — registration form (EP09)

Open `flawed/index.html` and `corrected/index.html` in a desktop browser. Put the mouse out of reach. Run every step in both versions and record the result. Expected results below are for the **corrected** version; the "flawed" column notes what the flawed version does instead (as modelled in `evidence.json`; confirm in a real browser).

This checklist tests **keyboard operability only**. Passing it does not establish accessibility conformance (WCAG or otherwise), and it says nothing about screen-reader output unless you also test with a named browser + screen reader pair and record what you heard.

| # | Keys | Expected (corrected) | Flawed version |
|---|------|----------------------|----------------|
| 1 | Load page, press **Tab** once | Focus lands on **Full name**. A clearly visible focus ring (3 px, offset) appears around the field. Its visible label "Full name" sits above it. | Focus lands in the first field but **no visible indication** (`outline:none`). The only text is the placeholder, which disappears when you type. |
| 2 | **Tab** | Focus moves to **Email address**, ring visible. | Moves, no ring. |
| 3 | **Tab** | Focus moves to **Password**, ring visible. The hint "At least 8 characters." is visible below it. | Moves, no ring. Hint lives only in the placeholder. |
| 4 | **Tab** | Focus moves to the **Create account** button, ring visible. | Focus **leaves the form** (goes to the browser UI / body). The blue "button" is a `<div>` and is never reached. |
| 5 | **Shift+Tab** ×3 | Focus walks back: Password → Email → Full name, ring visible each time. Order is exactly the reverse of forward order. | Walks back without a ring. |
| 6 | **Shift+Tab** from Full name | Focus leaves the form to the previous focusable item in the page/browser. No focus trap. | Same. |
| 7 | Tab to Full name, type `Dana Okafor`; Tab, type `dana.okafor@example`; Tab, type `short1` | Values appear. Password shows as dots. | Same. |
| 8 | With focus in Password, press **Enter** | The form submits. Validation fails. Error text appears under Email ("That email address does not look right.") and Password ("Password must be at least 8 characters."). Both fields get a red 2 px border (`aria-invalid="true"`). **Focus moves to Email** (first invalid field). **All three typed values are still there.** | **Nothing happens.** There is no `<form>`, so Enter has no implicit submission. |
| 9 | (Flawed only) **Tab**, then **Enter**, then **Space** | n/a | Focus left the form; Enter and Space do nothing. The form **cannot be submitted** without a pointer. |
| 10 | Correct Email to `dana.okafor@example.test` (focus is already there) | As soon as the value is valid, its error text and red border clear. Value preserved. | n/a |
| 11 | **Tab**, replace Password with `correct-horse-9` | Password error clears as soon as it reaches 8 characters. | n/a |
| 12 | **Tab** | Focus on **Create account** button, ring visible. | n/a |
| 13 | **Space** (also test **Enter** separately) | Form submits. Status line reads "Account created for dana.okafor@example.test. (Local fixture, nothing was sent.)" | n/a |
| 14 | Submit with every field empty (Tab to button, Enter) | Three errors appear; focus moves to **Full name** (first invalid). Nothing else moves. | n/a |
| 15 | Zoom to 200% and repeat steps 1–4 | Focus ring still visible at every stop; labels stay next to their fields. | No ring at any zoom. |
| 16 | Inspect the DOM (dev tools) after step 8 | `#email` has `aria-invalid="true"` and `aria-describedby="email-error"`. `#password` has `aria-describedby="password-hint password-error"` (hint kept, error appended). `#name` has neither. No element has a positive `tabindex`. | Error `<div>`s are shown via a class only; inputs carry no `aria-*` attributes. |

## Pass criteria
- Every interactive control is reachable with Tab and Shift+Tab, in the order it appears visually.
- Focus is visible at every stop.
- Enter in a field and Enter/Space on the button both submit.
- After a failed submission: errors are visible next to their fields, values are preserved, focus moves once, predictably, to the first invalid field.
- The accessibility-tree associations in row 16 are present.

## Not covered by this checklist
- Screen-reader announcements (requires e.g. "Firefox + NVDA" or "Safari + VoiceOver", named in the report).
- Colour contrast, touch targets, reduced-motion, cognitive load, timeouts, and the rest of WCAG.
- Behaviour with browser autofill or password managers.
