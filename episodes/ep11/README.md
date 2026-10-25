# EP 11 — I Clicked 'Reject All.' What Did the Website Actually Do?

**Central idea.** A consent banner's appearance does not prove the application follows the choice; only the requests show the implementation, and an explicit consent state machine must gate every emission path.

## What this fixture is
- `fixtures/ep11-consent-gate/` — a Node 22 simulated page (no browser) with Accept optional / Reject optional / Settings / Withdraw as function calls, a JSON-file preference store that simulates reload in the same browser context, a simulated optional analytics module and a loopback collector labelled `SIMULATED ANALYTICS · LOCAL COLLECTOR`.
- `page-flawed.mjs`: the banner stores the choice correctly; `analytics.init()` runs on `load()` and `init`/`track`/`flush` never read the preference.
- `page-corrected.mjs`: state machine `no_choice → rejected | accepted`, `accepted → withdrawn`; one policy (`optionalAllowed = state === 'accepted'`); the gate is checked on init, track and flush; withdrawal removes optional listeners and clears the unsent queue; a stored rejection keeps the gate shut after reload.
- Deliberate policies: no optional requests before a choice or after rejection; optional analytics begins only after acceptance; withdrawal stops **new** emissions only; the stored preference may remain; already-sent requests are never shown as recoverable.
- The flaw was constructed by hand for this fixture. No real website is depicted or accused.

## Evidence
- Executed: `node --test fixtures/ep11-consent-gate/test.mjs` → `# tests 10  # pass 10  # fail 0` (two known-positive controls assert the flawed page emits after rejection, before any choice, and after a reload with stored rejection).
- Executed: `node fixtures/ep11-consent-gate/demo.mjs` → `evidence.json`: flawed run **4** optional requests (1 `no_choice`, 3 `rejected`); corrected no-choice **0**, rejected **0**, reload-with-stored-rejection **0**, accepted **3**, after withdraw **3** (unchanged), 1 unsent event dropped, 0 listeners left. `collector-log-flawed.json` (4 events) and `collector-log-corrected.json` (3 events, all `accepted`) are the real collector contents and are what the `logs` scene displays.
- Observed: `cd video && npx tsc --noEmit` passes for `src/episodes/ep11/*`.
- Predicted: scene durations in `video/src/episodes/ep11/timeline.json` were produced with `--no-audio` (word-count estimate, 101.4 s). They will be rebuilt from the real narration by the orchestrator.
- Blocked: narration audio, MP4 render, frame inspection and `render-evidence.json` are produced by the orchestrator, not here. No MP4 is claimed.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep11      # needs video/public/ep11/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep11 --concurrency 2
```

## Limitations
- Simulated vs measured: the page, banner, store, analytics module and "reload" are in-process simulations; the request counts are measured from the real loopback collector during `demo.mjs`. Nothing was captured from a browser or a real site.
- Tracking can occur without cookies: the module identifies the visitor with an in-memory id; no cookie exists in the fixture.
- First-party does not automatically mean necessary or exempt: the collector is same-origin to the simulated page and its requests are still optional.
- Stopping future requests does not delete previously collected data; the 3 requests sent while accepted remain in the collector after withdrawal.
- Already-sent requests are not cancellable; the fix only prevents new ones.
- Not a legal compliance certification. The fixture shows a technical mechanism, not conformity with any regulation.
- No real analytics or advertising service was contacted.
- Not tested: multiple consent categories, necessary-request classification, re-consent after rejection, consent expiry, cross-device state, third-party scripts or tag managers, network loss or retries, late-flush/withdraw races, server-side deletion.

## Consent-gate checklist
1. Model consent as explicit states with named transitions, not a boolean read once at boot.
2. One policy function decides whether optional work is allowed; every emission path (init, queue, send) calls it at the time it runs.
3. Do not initialise optional modules before the state allows it; loading a script is already a request.
4. On withdrawal, remove listeners and drop unsent events; do not promise to recall what was sent.
5. Persist the choice and honour a stored rejection on reload before anything optional runs.
6. Prove it with a collector: count requests per state, and keep a known-positive control that fails on the flawed build.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep11/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep11 → episodes/ep11/ep11.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 106.17 s, 8884931 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
