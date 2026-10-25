# EP07 topology

Four boundaries matter. In the real world they are four machines. In this fixture **everything is one machine, loopback only**; the boundaries are drawn by *which process is listening on which ephemeral port at which moment*.

```
┌─ developer machine ───────────────────────────────┐
│  vite build  ──stamps──►  dist/assets/index-*.js   │
│      ▲                        contains the literal │
│  .env.development /           "http://127.0.0.1:P" │
│  process.env.VITE_API_BASE_URL                     │
│                                                    │
│  api.mjs  listening on 127.0.0.1:P  ◄── browser ✓  │   local success: 200
└────────────────────────────────────────────────────┘
          │ upload dist/ (bytes, unchanged)
          ▼
┌─ static host ─────────────────────────────────────┐
│  static-host.mjs serves dist/ on 127.0.0.1:S       │
│  process.env.VITE_API_BASE_URL=<anything>          │   changes THIS process only;
│  (--inject-env)                                    │   dist/ bytes are identical
└────────────────────────────────────────────────────┘
          │ GET /  →  index.html  →  /assets/index-*.js
          ▼
┌─ remote browser (CONCEPTUAL in this fixture) ─────┐
│  runs the bundle → fetch("http://127.0.0.1:P/health")
│  127.0.0.1 here is ITS OWN loopback. Nothing      │   TypeError: Failed to fetch
│  listens on P → connection refused. Not CORS.     │   (net::ERR_CONNECTION_REFUSED)
└────────────────────────────────────────────────────┘

┌─ API host ────────────────────────────────────────┐
│  api.mjs on 127.0.0.1:A, CORS allowlist = [S]      │   reachable by the test client
└────────────────────────────────────────────────────┘
   fix = rebuild with VITE_API_BASE_URL=http://127.0.0.1:A, re-upload dist/ → 200
```

## How each boundary is realised here

| boundary | real world | this fixture |
|---|---|---|
| developer machine | laptop with API on its loopback | `api.mjs` on an ephemeral port `P`; `vite build` with `VITE_API_BASE_URL=http://127.0.0.1:P` |
| static host | CDN / object storage / nginx | `static-host.mjs` serving `dist/` on port `S`; `--inject-env` mutates only its `process.env` |
| remote browser | someone else's machine, no API on its loopback | **not available.** Modelled by stopping the dev API and fetching `http://127.0.0.1:P/health` from Node → `ECONNREFUSED`. Labelled CONCEPTUAL SIMULATION in the video. |
| API host | the deployed API | `api.mjs` on port `A` with origin `S` allowlisted for CORS |

## Reproduction commands

```
cd fixtures/ep07-vite-env-localhost
npm install --no-audit --no-fund          # vite 8.3.5, pinned
node --test test.mjs                      # 9 tests
node demo.mjs                             # writes evidence.json + built-value-inspection.json

# by hand:
node api.mjs                                        # prints http://127.0.0.1:P
VITE_API_BASE_URL=http://127.0.0.1:P npx vite build # stamps P into dist/assets/*.js
node inspect-bundle.mjs                             # shows the embedded URL
node static-host.mjs dist --inject-env http://127.0.0.1:9999   # host env changed; bundle not
node inspect-bundle.mjs                             # same URL, same hash
VITE_API_BASE_URL=http://127.0.0.1:A npx vite build # rebuild with the reachable API
```

## Why CORS is not the failure

`api.mjs` sends `Access-Control-Allow-Origin: <static origin>` for allowlisted origins (see the `corsAllowOrigin` field in `evidence.json`). A connection-refused error happens *before* any HTTP response exists, so there is no CORS header to be missing; in the browser it surfaces as `TypeError: Failed to fetch` with `net::ERR_CONNECTION_REFUSED` in the console, not as a CORS policy message.
