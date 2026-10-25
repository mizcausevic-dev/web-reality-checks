# ep07-vite-env-localhost — a build-time API address points the deployed client at its own localhost

**SIMULATED LOCAL FIXTURE.** Node 22 ESM, one pinned npm dependency (`vite@8.3.5`, needed because the episode is about Vite's real build behaviour), loopback (`127.0.0.1`) only, ephemeral ports, synthetic data only.

## What it is

- `src/main.js` — the client. `const base = import.meta.env.VITE_API_BASE_URL;` then `fetch(`${base}/health`)`. Prints the status, or the **actual** error name and message.
- `index.html` — plain illustrative page that loads `src/main.js`.
- `.env.development` — `VITE_API_BASE_URL=http://127.0.0.1:8787` (the developer's conventional local API). `.env.production.example` — template for the deployable value; copy to `.env.production`, set a reachable origin, **rebuild**.
- `api.mjs` — `GET /health → 200 {"ok":true,…}`. CORS is **deliberately** configured with an allowlist of static-host origins so a cross-origin fetch from the bundle's page succeeds and CORS is not the failure under study.
- `static-host.mjs` — serves `dist/`. `--inject-env URL` sets `process.env.VITE_API_BASE_URL` on the *host process* at runtime (visible at `GET /__host-env`) to show that this cannot change the already-built bundle.
- `inspect-bundle.mjs` — greps `dist/assets/*.js` for embedded `http(s)://` URLs, checks no literal `import.meta.env` survived, hashes the files; writes `built-value-inspection.json`.
- `build.mjs` — helper that runs a real `vite build` in a child process with a controlled env.
- `test.mjs`, `demo.mjs` → `evidence.json`, `topology.md`.

## How to run

```
npm install --no-audit --no-fund
node --test test.mjs
node demo.mjs          # writes evidence.json and built-value-inspection.json; leaves dist/ built with the last (reachable) URL
```

## Executed

```
# tests 9
# suites 0
# pass 9
# fail 0
```

`node demo.mjs` (values are ephemeral ports; the shape is what matters — see `evidence.json`):

| step | what happened | result |
|---|---|---|
| `local_success` | API on `127.0.0.1:41073`; bundle built with that URL; static origin allowlisted; `GET …/health` with `Origin` | **200** `{"ok":true}` + `Access-Control-Allow-Origin: <static origin>` |
| `remote_client_failure_model` | dev API stopped; the bundle's literal URL fetched from Node | **TypeError: fetch failed**, cause `ECONNREFUSED` (browser: `TypeError: Failed to fetch`, `net::ERR_CONNECTION_REFUSED`) — **not CORS** |
| `bundle_inspection` | `dist/assets/index-PKkaHDlY.js` (1061 bytes) | contains `http://127.0.0.1:41073`; no literal `import.meta.env` |
| `host_env_change_no_rebuild` | static host started with `--inject-env http://127.0.0.1:42741` | host `process.env` shows the new value; served JS **still contains the original URL**; `dist/` hash identical before/after |
| `rebuild_and_retest` | `vite build` with `VITE_API_BASE_URL=http://127.0.0.1:42741`; serve; fetch | new asset `index-BLHWur4n.js` contains the new URL, old URL gone; `GET …/health` → **200** |

## Verified Vite behaviour (read from the installed package, `node_modules/vite@8.3.5`)

- `dist/node/index.d.ts` lines 3606–3609: *"Env variables starts with `envPrefix` will be exposed to your client source code via import.meta.env. @default 'VITE_'"*.
- `dist/node/chunks/node.js`, `loadEnv()` (≈ line 6103): loads `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`, then copies only keys matching the prefix; **`process.env` entries with the prefix are applied last and win over the files**. `resolveEnvPrefix()` throws on an empty prefix ("could lead unexpected exposure of sensitive information").
- `dist/node/chunks/node.js`, plugin `vite:define` (≈ lines 17080–17140): for every `config.env` key it registers `import.meta.env.<KEY>` → `JSON.stringify(value)` as a **define replacement** at bundle time. That is why `src/main.js`'s expression becomes a string literal in `dist/assets/*.js` and why `inspect-bundle.mjs` finds the URL and finds no `import.meta.env`.
- Consequence stated in the episode: anything prefixed `VITE_` is **public client configuration** shipped to every visitor. Never put a secret in one.

## Deliberate policies

- CORS allowlist on the API: the static origin is allowed explicitly; others get no `Access-Control-Allow-Origin`. This is to keep CORS out of the picture, not a security recommendation.
- Error reporting names the actual error (`err.name: err.message`). The fixture never labels a refused connection "CORS".
- The fix shown is **rebuild with the correct value**. Runtime configuration (e.g. a `/config.json` fetched at startup, or a server-injected `<script>window.__CONFIG__`) is a valid alternative and is mentioned in the narration as optional; it is **not implemented** here, to avoid a second half-built repair.

## Limitations / what is NOT tested

- **The remote-browser failure was NOT reproduced in an isolated browser.** No separate machine, container with verified network isolation, or headless browser was available here. The `remote_client_failure_model` step is a Node `fetch` to the embedded loopback port after the developer's API was stopped. It demonstrates the network condition (nothing listening on that loopback port → connection refused), not a browser. The video labels that scene *REMOTE CLIENT · CONCEPTUAL SIMULATION*.
- The browser-side error string (`TypeError: Failed to fetch`, `net::ERR_CONNECTION_REFUSED`) is stated from knowledge of browser behaviour, not captured here; what was captured is Node's `TypeError: fetch failed` with `cause.code = ECONNREFUSED`.
- `index.html` was never loaded in a browser; the bundle's correctness is checked by inspection and by fetching the URL it contains.
- Only `--mode development` builds are exercised (so `.env.development` is the file under test); production mode differs only in which `.env.*` files load and in minification.
- No HTTPS, no real hostnames, no deploy pipeline.
