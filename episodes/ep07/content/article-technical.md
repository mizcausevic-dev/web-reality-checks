SEO title (≤60 chars): Vite Env Vars Are Baked In at Build Time. Here Is the Proof
Meta description (≤155 chars): A deployed Vite bundle kept calling 127.0.0.1: connection refused. Why import.meta.env is a build-time literal, why host env changes do nothing, the fix.
Slug: vite-env-localhost
Primary keyword: vite environment variables build time   Secondary keywords (3–5): import.meta.env.VITE_API_BASE_URL, works locally but not in production, static host environment variable, connection refused not CORS, rebuild vs runtime configuration
Medium tags (5): Vite, JavaScript, Frontend Development, DevOps, Web Development

# It Works Locally. Why Is Production Broken?

![A deployed browser runs the built bundle, fetches http://127.0.0.1:41073/health, and gets TypeError: Failed to fetch because 127.0.0.1 is its own loopback and nothing listens there; the scene is labeled REMOTE CLIENT · CONCEPTUAL SIMULATION](../hero.png)

On the developer's machine the page asks the API for `/health` and gets 200 OK. The same built files, served to a browser on any other machine, fail with `TypeError: Failed to fetch`, because the bundle is asking `127.0.0.1` for the API and `127.0.0.1` on that machine is the machine itself.

This is episode seven of Web Reality Checks. The whole episode is one string literal in one JavaScript file, placed there by the build tool, and the discovery that nothing done on the hosting server can change it. One part of the story, the remote browser, could not be reproduced in isolation and is presented as a labeled conceptual simulation. Everything else was executed on a local fixture and the numbers below come from it.

## What actually happens

Vite does not read environment variables when the page runs. It reads them when `vite build` runs. The fixture README records the mechanism as read from the installed package, `vite@8.3.5`: `loadEnv()` loads `.env`, `.env.local`, `.env.<mode>` and `.env.<mode>.local`, keeps only keys that match the `envPrefix` (default `VITE_`), and applies `process.env` entries last so they win over the files. The `vite:define` plugin then registers each `import.meta.env.<KEY>` as a define replacement: the expression is swapped for `JSON.stringify(value)` while the bundle is being produced.

So `import.meta.env.VITE_API_BASE_URL` in source becomes `"http://127.0.0.1:41073"` in `dist/assets/index-*.js`. It is no longer a lookup. It is a constant, and every browser that downloads that file gets the same constant.

Three consequences follow.

First, the value present at build time is the value the whole world receives. A loopback address works on the laptop because the API is listening on that laptop's loopback. On any other machine `127.0.0.1` resolves to that machine's own network stack, nothing is listening on that port, and the TCP connection is refused before any HTTP exchange begins.

Second, because the failure happens before a response exists, it is not a CORS failure. CORS is a browser rule about reading a response that did arrive. A refused connection has no response and therefore no missing header. The browser reports `TypeError: Failed to fetch` with `net::ERR_CONNECTION_REFUSED` in the console, not a CORS policy message. Labeling every cross-origin failure "CORS" sends the team to fix the wrong layer.

Third, a static host serves bytes. Setting `VITE_API_BASE_URL` in the host's environment changes that process's `process.env` and nothing else. The define replacement already happened; the file on disk is finished. Only a rebuild can produce a bundle with a different literal.

## The fixture

`fixtures/ep07-vite-env-localhost/` is a minimal real Vite frontend (`vite@8.3.5`, pinned, lockfile committed), two loopback Node servers, and an inspection script. Everything binds to `127.0.0.1` on ephemeral ports. The four real-world boundaries (developer machine, static host, API host, remote browser) are drawn by which process listens on which port at which moment; `topology.md` maps each one.

The client is short. The only source of the API address is the literal expression Vite replaces:

```js
const base = import.meta.env.VITE_API_BASE_URL;

const status = $('status');
try {
  const res = await fetch(`${base}/health`);
  const body = await res.json().catch(() => null);
  status.className = res.ok ? 'ok' : 'err';
  status.textContent = `GET ${base}/health → ${res.status} ${res.statusText} ${body ? JSON.stringify(body) : ''}`;
} catch (err) {
  status.className = 'err';
  status.textContent = `GET ${base}/health failed → ${err.name}: ${err.message}`;
}
```

The catch block prints `err.name` and `err.message` as they are. The fixture policy is to report the actual error, never to guess "CORS".

The API allowlists the static-host origin deliberately, so CORS cannot become an unrelated failure. An origin that is not allowlisted gets no `Access-Control-Allow-Origin` header:

```js
const origin = req.headers.origin;
const allowed = origin && allow.has(origin);
if (allowed) {
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('vary', 'origin');
}
if (req.method === 'GET' && req.url === '/health') {
  res.writeHead(200, {'content-type': 'application/json'});
  return res.end(JSON.stringify({ok: true, service: 'ep07-api', port: server.address().port}));
}
```

The static host, `static-host.mjs`, has one unusual flag, `--inject-env URL`, which sets `process.env.VITE_API_BASE_URL` on the host process at runtime and exposes it at `GET /__host-env`. It exists to prove a negative: the host can see a new value and still serve the old file.

`inspect-bundle.mjs` greps `dist/assets/*.js` for embedded `http(s)://` URLs, checks whether the literal string `import.meta.env` survived, and hashes every file plus the directory as a whole, so "unchanged" is a hash comparison rather than an impression.

## The test that proves it

`node --test fixtures/ep07-vite-env-localhost/test.mjs` runs real `vite build` in a child process and reports `# tests 9  # pass 9  # fail 0` (local synthetic fixture). The test names carry the argument:

- `vite build statically replaces import.meta.env.VITE_API_BASE_URL with the build-time value`
- `source still references the literal import.meta.env.VITE_API_BASE_URL (the thing that gets replaced)`
- `without an env override, .env.development supplies the localhost value`
- `KNOWN-POSITIVE CONTROL: the embedded localhost URL is unreachable where no API listens (ECONNREFUSED, not CORS)`
- `setting VITE_API_BASE_URL on the static host process does NOT change the served bundle`
- `rebuild with a reachable API URL: bundle contains the new value and GET /health succeeds (200)`
- `LOCAL SUCCESS: API up, bundle URL reachable, static-host origin allowlisted → 200 with CORS header`
- `CORS allowlist is deliberate: a non-allowlisted origin gets no Access-Control-Allow-Origin`
- `static host refuses path traversal and 404s unknown files`

The control test matters most. It builds the bundle with a loopback port that was bound and immediately released, so nothing is listening, then fetches the URL the bundle contains. It asserts `err.name === 'TypeError'`, `err.message === 'fetch failed'` and `err.cause.code === 'ECONNREFUSED'`. That is the network condition a remote browser's own loopback presents. It is also where the fixture is candid about its limit: this is Node's `fetch`, not a browser, and the test file says so in its first comment.

`demo.mjs` writes `evidence.json`. From it (local synthetic fixture): `local_success` built with `VITE_API_BASE_URL=http://127.0.0.1:41073`, allowlisted the static origin `http://127.0.0.1:39285`, and `GET http://127.0.0.1:41073/health` returned 200 with `Access-Control-Allow-Origin: http://127.0.0.1:39285`. `bundle_inspection` found `assets/index-PKkaHDlY.js` (1061 bytes) containing `http://127.0.0.1:41073` and no literal `import.meta.env`.

## The repair

Set the variable where the build runs, to an address the deployed browser can reach, and build again. In the fixture that is `VITE_API_BASE_URL=http://127.0.0.1:42741 npx vite build`. Vite stamps the new literal into a new hashed asset, and that new `dist/` is what gets uploaded.

Before showing the repair, the episode shows the instinctive non-repair. From `evidence.json` (local synthetic fixture), step `host_env_change_no_rebuild`: the static host was started with `--inject-env http://127.0.0.1:42741`. `GET /__host-env` returned the new value, so the host process really did see it. The served asset was still `/assets/index-PKkaHDlY.js`, `servedJsContainsOriginalUrl: true`, `servedJsContainsHostEnvValue: false`, and `distHashBefore` equaled `distHashAfter`. The operator did something real and the bundle did not notice.

The rebuild is deliberately the only repair implemented. Runtime configuration, a `/config.json` fetched at start-up or a server-injected `window.__CONFIG__`, is a valid alternative design that moves the address decision from build time to load time. The fixture names it and does not build it, to avoid a second half-finished fix next to the first.

## Retest

From `evidence.json`, step `rebuild_and_retest` (local synthetic fixture): after the rebuild the served asset is `/assets/index-BLHWur4n.js`, `servedJsContainsNewUrl: true`, `servedJsContainsOldUrl: false`. `GET http://127.0.0.1:42741/health` returned 200 with body `{"ok":true,"service":"ep07-api","port":42741}` and `Access-Control-Allow-Origin: http://127.0.0.1:44371`, the new static origin. The asset name changed because the content changed: a new file, not a cache purge.

## What this does not prove

- The remote-browser failure was not reproduced in an isolated browser. No separate machine, verified-isolated container or headless browser was available. Scenes `remote_fail` and `follow_loopback` carry the persistent on-screen tag `REMOTE CLIENT · CONCEPTUAL SIMULATION`. The executed stand-in is a Node `fetch` to the embedded loopback port after the developer's API was stopped. The browser strings `TypeError: Failed to fetch` and `net::ERR_CONNECTION_REFUSED` are stated from browser behavior, not captured.
- CORS success is measured with a Node fetch carrying an `Origin` header, not a browser preflight. `index.html` was never loaded in a browser.
- Only `--mode development` builds are exercised, so `.env.development` is the file under test. Production mode differs in which `.env.*` files load and in minification, not in the replacement mechanism.
- Vite behavior is described as read from the installed `vite@8.3.5` package, no other version.
- No HTTPS, no real hostnames, no deploy pipeline, no containers. The fixture is not audited for other leaks.

## Launch checklist

1. Every `VITE_`-prefixed value is treated as public: it ships to every visitor in plain text. No secret ever goes in one.
2. The production API address is set where the build runs (CI environment or `.env.production`), not on the static host after the fact.
3. A post-build step greps `dist/assets/*.js` for embedded URLs and fails the pipeline on `localhost`, `127.0.0.1` or any non-production origin, and asserts no literal `import.meta.env` survived.
4. Client error handling prints `err.name` and `err.message`; nobody labels a refused connection "CORS" without a response to point at.
5. The API's CORS allowlist names the deployed static origin explicitly, so a cross-origin failure is a real finding and not noise.
6. The team has written down which design it uses, build-time literal or runtime configuration, so nobody expects an environment change to do what only a rebuild can.
7. A known-positive control exists: a test that builds with an unreachable address and asserts `ECONNREFUSED`, so the pipeline check can be shown to catch the bug.

## FAQ

**Why does my Vite app work locally but not in production?**
Most often because `import.meta.env.VITE_*` values are replaced with string literals at build time. If the build ran with a localhost API address, every deployed browser tries to reach its own loopback, where nothing is listening, and gets `TypeError: Failed to fetch` with connection refused.

**Can I change a Vite environment variable without rebuilding?**
No. Setting the variable on the static host changes that process's environment, not the files it serves. In the fixture the host saw the new value while the served bundle stayed byte-identical. Either rebuild with the new value or move to runtime configuration, which is a different design.

**Is "TypeError: Failed to fetch" a CORS error?**
Not necessarily. A refused connection fails before any response exists, so there is no header to be missing; the console shows `net::ERR_CONNECTION_REFUSED`. A real CORS block produces a specific policy message. Check the console and the actual error before changing CORS settings.

## Watch the episode

[YouTube link]

- 00:00 Locally: GET /health, 200 OK
- 00:07 Remote browser: Failed to fetch (conceptual simulation)
- 00:18 Follow the request to 127.0.0.1, the remote machine's own loopback
- 00:29 The literal URL inside the built bundle
- 00:42 Set the variable on the static host
- 00:51 The served bundle is byte-identical
- 01:00 The fix: rebuild with a reachable API URL
- 01:11 Retest: 200 OK
- 01:19 VITE_ values are public; a host env change cannot rewrite a bundle

Related episodes: [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md) and [That API Key Is in Your JavaScript. Is That Always a Leak?](../../ep13/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A server environment change cannot rewrite an existing bundle. Decide where your configuration is read, build-time or load-time, and put the value there.

Miz Causevic, Kinetic Gain LLC
