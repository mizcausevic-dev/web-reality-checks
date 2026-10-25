# EP 07 — It Works Locally. Why Is Production Broken?

**Central idea.** A frontend API address embedded at build time (`import.meta.env.VITE_API_BASE_URL`) can point a deployed client at its own localhost; changing an environment variable on the static host cannot rewrite the bundle, only a rebuild can.

## What this fixture is
- `fixtures/ep07-vite-env-localhost/` — a minimal real Vite (`8.3.5`, pinned, lockfile committed) frontend whose `src/main.js` reads the literal `import.meta.env.VITE_API_BASE_URL` and fetches `${base}/health`, printing the status or the actual error name and message.
- `api.mjs` — loopback API, `GET /health → 200 {"ok":true}`. CORS is configured **deliberately** via an allowlist of the static-host origin so that CORS is not the failure.
- `static-host.mjs` — serves `dist/` on loopback. `--inject-env URL` sets `VITE_API_BASE_URL` in the *host process* at runtime (visible at `/__host-env`) to show it cannot change the already-built files.
- `inspect-bundle.mjs` — greps `dist/assets/*.js` for the embedded URL, confirms no literal `import.meta.env` remains, hashes the files → `built-value-inspection.json`.
- `topology.md` — the four boundaries (developer machine, static host, API host, remote browser) and how each is realised on one loopback.
- Deliberate policies: rebuild is the one repair shown; runtime configuration is named as an optional alternative and **not implemented**. Errors are reported by their real name (`TypeError`, `ECONNREFUSED`), never blanket-labelled "CORS".

## Evidence
- Executed: `node --test fixtures/ep07-vite-env-localhost/test.mjs` → `# tests 9  # pass 9  # fail 0` (includes a known-positive control: the embedded localhost URL, fetched where no API listens, fails with `TypeError: fetch failed`, cause `ECONNREFUSED`).
- Executed: `node fixtures/ep07-vite-env-localhost/demo.mjs` → `evidence.json`: local success `GET http://127.0.0.1:41073/health → 200` with `Access-Control-Allow-Origin: http://127.0.0.1:39285`; bundle `assets/index-PKkaHDlY.js` (1061 bytes) contains `http://127.0.0.1:41073` and no `import.meta.env`; host started with `--inject-env http://127.0.0.1:42741` → host env shows the new value, served JS still contains the original URL, `dist/` hash identical before/after; rebuild with `VITE_API_BASE_URL=http://127.0.0.1:42741` → new asset `index-BLHWur4n.js` contains the new URL, old URL absent, `GET /health → 200`.
- Verified (read from the installed package): `node_modules/vite/dist/node/index.d.ts` lines 3606–3609 (`envPrefix`, default `'VITE_'`, "exposed to your client source code via import.meta.env"); `node_modules/vite/dist/node/chunks/node.js` `loadEnv()` (~line 6103: `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`; prefix filter; `process.env` wins) and the `vite:define` plugin (~lines 17080–17140: `import.meta.env.<KEY>` → `JSON.stringify(value)` define replacement at bundle time).
- **Blocked / not reproduced:** the remote-browser failure was **NOT** reproduced in an isolated browser. No separate machine, verified-isolated container, or headless browser was available. Scenes `remote_fail` and `follow_loopback` carry the persistent tag `REMOTE CLIENT · CONCEPTUAL SIMULATION`. The executed stand-in is a Node `fetch` to the bundle's loopback port after the developer's API was stopped (`TypeError: fetch failed`, `ECONNREFUSED`). The browser strings shown (`TypeError: Failed to fetch`, `net::ERR_CONNECTION_REFUSED`) are stated from browser behaviour, not captured.
- Observed-from-fixture notes appear on screen in every executed scene (`local_ok`, `bundle`, `host_env`, `still_old`, `fix`, `retest`).
- Predicted: none. No timings or percentages are claimed.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep07    # from narration audio in video/public/ep07/narration.mp3, or --no-audio
node tools/gen-root.mjs
node tools/render.mjs ep07 --concurrency 2
```
`video/src/episodes/ep07/timeline.json` currently holds a `--no-audio` placeholder (estimated 104.56 s); the orchestrator regenerates it from real narration. No MP4 is claimed to exist; `render-evidence.json` is filled by the orchestrator.

## Limitations
- Simulated vs measured: build-time replacement, bundle contents, host-env-does-not-rewrite, rebuild and retest are **measured** on one loopback. The remote client is **conceptual** (see above). CORS success is measured with a Node fetch carrying an `Origin` header, not a browser's preflight.
- `index.html` was never loaded in a browser; the bundle is verified by inspection and by fetching the URL it contains.
- Only `--mode development` builds are exercised (so `.env.development` is the file under test; `.env.production.example` is a template). Production mode differs in which `.env.*` files load and in minification, not in the replacement mechanism.
- The fix is scoped to the demonstrated problem: rebuild with the right value where the build runs. Runtime configuration (a `/config.json` fetched at start-up, or server-injected `window.__CONFIG__`) is a valid alternative design and is deliberately not half-implemented here.
- `VITE_`-prefixed values are public client configuration shipped to every visitor; the episode says never to put a secret in one. It does not audit the fixture for other leaks.
- No HTTPS, no real hostnames, no deploy pipeline, no containers.


## Render evidence (orchestrator)
- Executed: narration generated with ElevenLabs (voice Benedict - Premium British (RP) Male, eleven_v4), saved to video/public/ep07/narration.mp3; timeline rebuilt from the real audio (scene boundaries snapped to detected silences; line-level caption timing proportional to word count).
- Executed: node tools/render.mjs ep07 → episodes/ep07/ep07.mp4 (h264 1920x1080 30/1 fps yuv420p, aac audio, 96.4 s, 8792016 bytes). Thumbnail 1280x720 and hero 1600x900 rendered as Remotion stills.
- Verified: independent ffprobe pass in VERIFICATION.md; fixture tests re-run in the same pass.
- Observed: inspection frames in frames/ reviewed by the orchestrator for clipping and overlap.
