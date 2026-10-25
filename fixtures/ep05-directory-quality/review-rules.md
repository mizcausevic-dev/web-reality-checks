# Review rules — ep05 directory quality fixture

SYNTHETIC DATASET · SEEDED. These rules govern how the checker's flags become human decisions.
They are the policy the video shows; they are not a claim about any real directory.

## 1. Three timestamps, three meanings

| Field | Meaning | Who sets it |
|---|---|---|
| `lastCheckedAt` | An automated probe ran against this row (website, URL syntax, …). Says nothing about correctness. | The checker, every run |
| `lastChangedAt` | Someone or something edited the row's content. | Any editor |
| `lastVerifiedAt` | A human (or an evidenced process) confirmed the row matches the real business. | A reviewer, only after a `verify_*` decision |

A re-check **never** advances `lastVerifiedAt`. Only a decision does.

## 2. Flags are not verdicts

| Flag code | Produced by | What it is evidence of | What it is **not** evidence of |
|---|---|---|---|
| `missing_required` | completeness | A required field is blank/null | — (deterministic; fix without review) |
| `malformed_url` | url_validity | The string is not an `http(s)` URL | that the business has no website |
| `duplicate_candidate` | duplicates | Two rows share a phone, or a normalised name + ZIP, or a normalised street + ZIP + name stem | that they are the same entity (franchises, shared office lines, parent/child exist) |
| `site_unreachable` | website | One probe timed out / was refused / did not resolve | **closure.** Hosting lapses, DNS changes, rate limits and slow servers all produce this on open businesses |
| `site_gone` | website | The host answered 410 or 404 | closure; the site may have moved domains |
| `stale_verification` | verification | `lastVerifiedAt` is older than 365 days | that anything is wrong. Age is a reason to re-verify, nothing more |
| `edited_since_verified` | verification | `lastChangedAt` is after `lastVerifiedAt` | that the edit was wrong, or that the business moved |

## 3. Routing

- **Deterministic flags** (`missing_required`, `malformed_url`) are data-repair tasks. They do not enter the review queue by themselves.
- **Judgement flags** (`site_gone`, `duplicate_candidate`, `site_unreachable`, `edited_since_verified`, `stale_verification`) enter the review queue. One queue entry per listing; all of its judgement flags travel on that one card.
- Queue priority is the listing's highest-priority flag, in the order listed above (gone → duplicate → unreachable → edited → stale).

## 4. Decision vocabulary

| Decision | Use when | Side effects |
|---|---|---|
| `verify_unchanged` | Reviewer confirmed the row against an independent source | `lastVerifiedAt = now` |
| `verify_and_correct` | Reviewer confirmed and fixed a field | `lastChangedAt = now`, `lastVerifiedAt = now` |
| `merge_into:<id>` | Two rows are the same entity | copy becomes a redirect; canonical gains `lastChangedAt = now` |
| `mark_closed` | **Two independent signals** of closure (e.g. site gone **and** phone disconnected, or an authoritative closure notice) | row hidden, not deleted; `lastChangedAt = now` |
| `keep_listing_schedule_recheck` | Only one weak signal (a single timeout, an old date) | `lastCheckedAt = now`; re-probe after the stated interval |
| `dismiss_flag` | Flag was a false lead (e.g. shared office phone) | flag suppressed for this pair/field |

A single failed website check is never sufficient for `mark_closed`.

## 5. Every decision records

`listingId`, `decision`, `reason` (free text), `evidence` (the flags and their payload as seen by the reviewer), `reviewedAt` (ISO 8601), `reviewer` (an identity, here the synthetic `reviewer-synthetic-01`), and `fieldsUpdated`.

## 6. Reporting

- Report **unique flagged listings** and **total issue instances** as two numbers. Never add per-code counts and call the sum "wrong listings".
- Report per-class **detected vs missed** only against a ground truth the checker never saw, and only after the checker has run.
- Everything the checker cannot see (a move with no edit trail, a closed business whose site still answers 200, a typo domain that is syntactically valid) is reported as *missed*, not silently omitted.
