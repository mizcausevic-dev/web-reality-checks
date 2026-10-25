# Content spec (release kit per episode)

Write into `episodes/epNN/content/`. Source of truth for facts: `episodes/epNN/script.json`, `episodes/epNN/README.md`, `fixtures/epNN-*/README.md` and `fixtures/epNN-*/evidence.json`. Never invent numbers, timings, percentages or outcomes; the only numbers allowed are the ones in evidence.json or the README, and each must be labelled as coming from the local synthetic fixture.

Voice: senior editor + product + developer-writer. Direct, concrete, candid. No em dashes (use commas, colons or full stops). No stock AI phrases ("in today's fast-paced world", "delve", "game-changer", "it's important to note"). No "genuinely", "honestly", "straightforward". Explain the mechanism (the *why* layer) every time, not just the conclusion. Author line: "Miz Causevic, Kinetic Gain LLC". US spelling.

Disclosure block (verbatim, placed before the conclusion of every article and in every YouTube description):
> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

## Files

1. `article-technical.md` (1,400–1,900 words). Audience: engineers and tech leads. Front matter block at top:
   ```
   SEO title (≤60 chars):
   Meta description (≤155 chars):
   Slug:
   Primary keyword:   Secondary keywords (3–5):
   Medium tags (5):
   ```
   Then: H1 = title; hero image line `![alt text](../hero.png)`; opening that states the failure in two sentences; "What actually happens" (mechanism); "The fixture" (what was built, with 1–3 short code excerpts copied from the real fixture files, ≤ 12 lines each); "The test that proves it" (quote the real test names and the `# pass N` line); "The repair"; "Retest" (real results); "What this does not prove" (limits from the brief); "Launch checklist" (5–8 items); FAQ (3 questions, each answer ≤ 60 words, phrased for search intent); "Watch the episode" (link placeholder `[YouTube link]` and the chapter list from timeline.json scene starts in mm:ss); disclosure block; author line.
2. `article-business.md` (900–1,300 words). Audience: founders, product managers, buyers of software. Same front matter. No code. Structure: the symptom as a business event; why a demo cannot show this; the mechanism in plain terms (one analogy allowed, must be accurate); what to ask your team or vendor (5 questions); what it costs if ignored (qualitative only, no invented figures); FAQ (3); watch link; disclosure; author.
3. `article-layman.md` (700–1,000 words). Audience: general readers. Same front matter. One everyday analogy carried through the piece (must not mislead on mechanism); "what this means for you" (3 bullets); FAQ (3); watch link; disclosure; author.
4. `distribution.md`:
   - YouTube: 6 title options (≤ 60 chars) ranked with a one-line reason each; description (first 150 chars must stand alone as a hook; then what is demonstrated; chapters from timeline.json as `mm:ss Label`; repo link; disclosure block); 20 tags; pinned comment (≤ 300 chars, states the fixture is synthetic and links the repo).
   - LinkedIn: 2 posts (≤ 1,300 chars each): one for engineers, one for non-technical leaders. Hook line first. No hashtags walls; ≤ 3 hashtags.
   - X/Twitter: one thread of 6–8 posts (≤ 280 chars each), post 1 is the hook, last post links.
   - Reddit/HN: one neutral title (no clickbait) and a 3–sentence first comment that discloses the synthetic fixture.
   - Short-form hook lines: 5 (≤ 12 words) for Shorts/Reels captions.
   - Alt text for hero.png and thumbnail.png.

Cross-link rule: each article's "Related episodes" line names two other episodes by fullTitle from `briefs/ALL-EPISODES.md` and links `../../epNN/content/article-technical.md`.
