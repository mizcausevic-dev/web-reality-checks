# Episode build spec (for builders)

Repository root: `/home/claude/wrc`. Read `video/src/kit/*` and the reference episode (`episodes/ep01/`, `fixtures/ep01-authz/`, `video/src/episodes/ep01/`) before writing anything. Match that pattern exactly.

## Deliverables per episode `epNN`

1. `fixtures/epNN-<slug>/` — runnable local fixture **separate from video code**.
   - Plain Node 22 ESM, `node:test`, zero npm dependencies unless the brief explicitly requires a library (then add a `package.json` in that folder with pinned versions and run `npm install`; commit the lockfile).
   - Servers bind `127.0.0.1` only, ephemeral port. Synthetic data only. Seed any randomness.
   - `test.mjs` — the regression tests the brief lists. Where a flaw is demonstrated, include a **known-positive control test** that asserts the flaw is observable in the vulnerable/flawed variant.
   - `demo.mjs` — runs the exact scenario the video shows and writes `evidence.json` (actual outputs: statuses, counts, logs). The video must display numbers/results that come from this file, never invented ones.
   - `README.md` — what it is, how to run (`node --test test.mjs`, `node demo.mjs`), deliberate policies, limitations, what is NOT tested.
   - You MUST run the tests and demo and they must pass before you finish. Paste the actual `node --test` summary lines into the README under "Executed".
2. `episodes/epNN/script.json` — see format below. Narration total 200–260 words. British English spelling is fine. Spell out numbers that could be misread by TTS ("four oh four", "two hundred"). No intro, no channel plug, no engagement ask. First scene shows the outcome/failure immediately.
3. `video/src/episodes/epNN/Scenes.tsx` + `index.tsx` — Remotion scene components.
4. `episodes/epNN/README.md` — build/render commands, limitations, evidence labels (Observed / Executed / Verified / Predicted / Blocked). Do NOT claim an MP4 exists; the orchestrator renders and fills `render-evidence.json`.

Do NOT generate audio, do NOT render video, do NOT run git. The orchestrator does those.

## `script.json` format

```json
{
  "n": 7, "slug": "vite-env-localhost", "title": "Short on-screen title (≤5 words)",
  "fullTitle": "Episode title from the brief",
  "scenes": [
    {"id": "fail", "sim": null, "narration": "…", "captions": ["…", "…"]},
    {"id": "layers", "narration": "…", "captions": ["…"]}
  ]
}
```
- `id`: short snake_case, unique; use words like `fail`, `leak`, `fix`, `retest`, `end` where they apply (the renderer picks inspection frames by these words).
- `sim`: the persistent corner tag. Omit the key to use the default `SIMULATED LOCAL FIXTURE`. Use `null` for scenes with no simulated content (title/end cards). Use a custom string when the brief wants a different persistent label, e.g. `"CONCEPTUAL ILLUSTRATION"`, `"SIMULATED MODEL RESPONSE"`, `"LOCAL EVENT COLLECTOR — NOT GA4"`, `"LAB MEASUREMENT"`.
- `captions`: 1–3 short lines per scene; these become the SRT and the bottom caption bar. Keep them separate from diagram labels (they are rendered in the bottom bar automatically). ≤ 90 characters each.
- Follow the SCENES list in the brief, one scene per brief scene unless two are trivially mergeable.

## Scenes.tsx conventions

- `export const scenes: Record<string, React.FC<SceneProps>>` keyed by the script scene ids. Every id in script.json must have a component.
- Each component receives `{t, T, dur}`: `t` = seconds since scene start, `dur` = scene length in seconds (set from real audio; typically 7–14 s). Animate **only** from `t` using `ep/eio/prog/step/win` from `kit/anim.ts`. No `useState`, no timers, no randomness except `rnd(seed)`.
- Use kit primitives from `kit/Primitives.tsx`: `Big, Txt, Overline, Box, Lane, Badge, Pill, Token, Svg, Arrow, Gate, Code, Stages, Readout, Log`. Add small local components in the file if needed. Colours only from `C` in `kit/theme.ts`: cyan = normal flow, amber = uncertainty/warning, red = failure/denied, green = pass. Near-black background is provided.
- Coordinates: 1920×1080. Keep everything inside x∈[96,1824], y∈[100,920]. The top 100 px holds the episode tag and sim tag; the bottom 160 px (y>920) is reserved for the caption bar — nothing may be placed there. Font sizes: ≥24 px for labels, ≥28 px for anything important.
- Movement must explain causality (a token travelling a path, a gate flipping, a count incrementing). No decorative particles, no code rain, no fake dashboards.
- Anything that looks like a browser/app UI must be visibly illustrative (use the plain `Box` chrome like ep01's `Demo` scene). Never mimic a real product's UI or branding.
- Numbers shown must match `fixtures/.../evidence.json`. Put a one-line `Txt` note like "Observed from the local fixture: …" where a result is shown.
- Keep scene components self-contained; a scene should read fine when it starts (do not depend on a previous scene's end state for layout).
- Code panels: ≤ 6 lines, ≤ 48 chars per line, size 26.
- Type-check: `cd video && npx tsc --noEmit` must pass.

`index.tsx` is identical to ep01's (it must `export {scenes}` as well as `timeline` and `Episode`).

## README template (`episodes/epNN/README.md`)

```
# EP NN — <fullTitle>

**Central idea.** one sentence.

## What this fixture is
- bullets; state deliberate policies (e.g. "404 for absent or inaccessible").

## Evidence
- Executed: `node --test fixtures/epNN-slug/test.mjs` → `# pass N fail 0` (paste real output)
- Executed: `node fixtures/epNN-slug/demo.mjs` → evidence.json (summarise key values)
- Observed / Predicted / Blocked lines as applicable.

## Build and render
cd video && npm install
node tools/build-timeline.mjs epNN    # from narration audio in video/public/epNN/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs epNN --concurrency 2

## Limitations
- what is simulated vs measured; what was not tested; scope of the fix.
```

## Accuracy rules (non-negotiable)
Every ACCURACY / LIMITS bullet in the brief must be reflected in the narration or on-screen text, and listed in the README. Do not invent timings, percentages, or results. If a behaviour cannot be executed in this environment (no real browser, no trusted HTTPS, no isolated network), implement what can run, render the rest as a labelled conceptual illustration (`sim: "CONCEPTUAL ILLUSTRATION"`), and state exactly what was not executed.
