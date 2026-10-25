SEO title (≤60 chars): API Key in Your JavaScript Bundle: Leak or Identifier?
Meta description (≤155 chars): Two credential-shaped strings in a shipped bundle. One authorizes nothing, one runs privileged operations. The capability test that tells them apart.
Slug: api-key-capability
Primary keyword: API key in JavaScript bundle   Secondary keywords (3–5): secret in frontend code, public key vs secret key, backend proxy authorization, secret scanning source maps, API key rotation
Medium tags (5): Web Security, API Security, JavaScript, Node.js, Software Engineering

# That API Key Is in Your JavaScript. Is That Always a Leak?

![A shipped JavaScript bundle opened in an inspector shows two credential-shaped strings, one labelled public and one labelled secret, with the caption asking which one is a leak](../hero.png)

Open the bundle your users download and two credential-shaped strings fall out: `PUBLIC_PROJECT_ID` and `SERVER_SECRET_TOKEN`. Someone files a ticket that says "secrets in the frontend," someone else replies "the public one is fine, it says public," and both are guessing, because a name cannot tell you what a value does.

This is episode 13 of Web Reality Checks. It builds a fictional vendor API, a bundle that embeds both values, and a harness that presents each value to the privileged endpoint and records what happens. Then it moves the secret behind a backend that does more than forward, and scans the result. Everything is loopback-only and synthetic.

## What actually happens

A credential is a string, and strings carry no authority on their own. Authority lives at the upstream: the service that receives the string decides what it will perform for whoever presents it. That decision is the capability. The constant name, the prefix, the comment in source: the upstream consults none of them. It compares the presented bytes against what it issued.

So the only honest classification of a value found in a bundle is empirical. Present it to the privileged operation. If the upstream refuses, the value is an identifier: it names something and authorizes nothing. If the upstream performs the operation, the value is a secret, and every copy of the bundle is a copy of that capability. Anything delivered to a browser, in JavaScript, inline HTML, a JSON config payload or a source map, is in the hands of every visitor and every cache.

Two related confusions deserve naming. CORS is not authentication or authorization; it is a browser rule about which origins may read a response, and `curl` ignores it. And "move it to the backend" fixes nothing by itself: a backend that forwards whatever the browser names, secret attached, is the same leak with an extra hop.

## The fixture

`fixtures/ep13-api-key-capability/` is plain Node 22 ESM, zero dependencies, loopback only.

The mock upstream (`upstream.mjs`) is the fictional vendor. It issues `PUBLIC_PROJECT_ID = proj_pub_7f3a21`, an identifier, and `SERVER_SECRET_TOKEN = srv_secret_SYNTHETIC_…`, a bearer credential. Neither reproduces any real vendor's format or policy. `GET /public/:projectId` is open; `POST /privileged` is the gate:

```js
const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
const body = await readJson(req);
if (!bearer) return outcome(401, {error: 'missing bearer credential'});
if (bearer !== SERVER_SECRET_TOKEN) return outcome(403, {error: 'credential does not authorise this operation'});
if (!body || !UPSTREAM_OPERATIONS.includes(body.operation)) return outcome(400, {error: 'unknown operation'});
```

It performs `rotate_webhook` and `delete_project` for the secret holder; the second exists so the secret is visibly more powerful than anything the corrected backend exposes.

The application backend (`backend.mjs`) is the corrected architecture: test-harness sessions, two synthetic users (`u_mara` maintainer, `u_vik` viewer), a `/config` payload holding the identifier only, and a one-entry allow-list, `ALLOWED_OPERATIONS = {rotate_webhook: {roles: ['maintainer']}}`. Its `POST /privileged` route:

```js
const user = currentUser(req);
if (!user) return json(res, 401, {error: 'unauthenticated'});               // 1. who is asking?
const rule = ALLOWED_OPERATIONS[op];
if (!rule) return json(res, 400, {error: 'operation not permitted by this backend'}); // 2. is this something we do at all?
if (!rule.roles.includes(user.role)) return json(res, 403, {error: 'forbidden for this user'}); // 3. may THIS user do it?
// 4. perform it upstream, with the backend's own credential, for the backend's own project.
```

The secret comes from `config.serverSecretToken`, backend-only configuration. The project ID is the backend's own. The browser contributes only the operation name. The response is re-shaped so only `ok`, `operation`, `performedBy` and `webhookVersion` reach the browser.

`bundle-flawed/` embeds both values, as a JS constant in `app.js` and an inline `window.__ENV__` block in `index.html`, and calls the upstream directly. `bundle-corrected/` embeds only the identifier.

`inspect-artifacts.mjs` walks `.js/.mjs/.cjs/.html/.htm/.json/.map` files and classifies hits by shape, not name: a fixture secret prefix, a `Bearer <token>` literal, a private-key block, or a high-entropy value assigned to a secret-ish name. Values are redacted. It runs a known-positive control first:

```js
/** Known-positive control: the scanner must see the planted secret in bundle-flawed/. */
export const controlRun = () => {
  const r = scanDir(path.join(here, 'bundle-flawed'));
  return {...r, passed: r.secretLike > 0};
};
```

If the control fails, the CLI exits 3 and prints no clean result for anything. A scanner that has not proved it can see a leak cannot be trusted to say zero.

## The test that proves it

`node --test fixtures/ep13-api-key-capability/test.mjs` reports `# tests 16  # pass 16  # fail 0` (local synthetic fixture).

The capability tests ask what each value does:

- `public identifier presented as a bearer credential does NOT authorise the privileged operation (403)`
- `KNOWN-POSITIVE CONTROL: possession of the synthetic secret authorises the privileged operation (200)`

The control's assertion message: "if the secret did nothing, finding it in a bundle would prove nothing." A scan only becomes a leak report once a capability test has shown the scanned value grants capability.

The inspection tests make the scanner earn its clean result, and assert that no finding reprints the full secret (reported as `srv_secret…0a3`):

- `KNOWN-POSITIVE CONTROL: scanner finds the planted secret in bundle-flawed (JS and HTML)`
- `corrected bundle contains 0 secret-like strings and still carries the public identifier`

The backend tests check each gate and count upstream attempts. Unauthenticated (401) and viewer (403) requests never reach the upstream; the maintainer succeeds with no secret in body or headers. Then the pair that gives the allow-list meaning:

- `backend validates the operation: unknown/over-broad operation is rejected (400) even for an authorised user, no upstream call`
- `control: the upstream itself WOULD perform delete_project for the secret-holder (so the backend allow-list is doing real work)`

Without the control, a 400 could mean the operation was never possible. With it, the 400 is the allow-list refusing something the upstream would have done.

From `evidence.json` (local synthetic fixture): the flawed bundle scan found 2 secret-like strings, at `app.js:6` and `index.html:10`, plus 2 identifier-like. Public identifier as bearer: 403. No credential: 401. Synthetic secret: 200 for `rotate_webhook` and 200 for `delete_project`.

## The repair

Remove the secret from every browser-delivered asset and keep it in backend-only configuration. Then build the backend route as a policy decision, not a relay: authentication first (no session, 401), operation validation second (not on the allow-list, 400, whoever asks), authorization third (role not listed, 403). Only then does the backend call the upstream, with its own credential and its own project ID. The client's body, headers and any bearer it attaches are never forwarded.

Keeping 401, 403 and 400 distinct is a fixture choice so the video can show which gate fired; production may collapse them. What must not change is that every rejection happens before the upstream call; the suite counts `privilegedAttempts` to prove it. The route's last step rebuilds the response from named fields, because a proxy that returns the upstream response verbatim can leak the credential through an echoed header or error body.

## Retest

From `evidence.json` (local synthetic fixture), after the repair:

- `GET /config`: 200, `{"publicProjectId": "proj_pub_7f3a21"}`.
- Unauthenticated `POST /privileged`: 401. `u_vik` (viewer): 403.
- `u_mara` (maintainer), `rotate_webhook`: 200, `performedBy: "u_mara"`, exactly 1 upstream call, by the backend.
- `u_mara`, `delete_project`: 400, no upstream call.
- `secretInResponse: false` across all 5 backend responses checked.
- Corrected bundle scan: 0 secret-like, 2 identifier-like, in `app.js` and `index.html`, after the control passed.

The identifier stays in the corrected bundle on purpose: it was tested and refused, and it stays flagged so a reviewer asks rather than assumes.

## What this does not prove

- The identifier here authorizes nothing, established by testing, not by its name. A value is not safe because it is called PUBLIC; it is safe when the upstream refuses it.
- Some real vendors issue browser-exposed keys that intentionally grant limited capability and are expected to be restricted by other means. This fixture models one fictional vendor and establishes nothing about any real provider.
- CORS played no part. Nothing in the fixture relies on it and the harness is not a browser.
- The backend is a minimal repair: test-harness sessions, one operation, one role, no rate limiting, no audit logging.
- The scan covers the two bundle folders plus the `/config` payload. This build produced no source map, so none was scanned. The scanner is heuristic and ignores server-rendered pages, logs, caches, third-party scripts and history. Zero in tested assets does not prove every leak is closed.
- No real browser executed either bundle; behavior is implied from the code.
- Rotation is not implemented. Had this been a real leaked production secret, removing it from the bundle would not revoke copies already downloaded. Rotation at the issuer is a separate required response.

## Launch checklist

1. For every credential-shaped value in a browser-delivered asset, present it to each privileged operation the upstream offers and record the status.
2. Treat a value as a secret when the upstream performs any operation for it, whatever its name.
3. Keep secrets in backend-only configuration; the browser receives identifiers only.
4. The backend route that uses a secret authenticates, validates the operation against an allow-list, and authorizes the role before the upstream call, and never forwards client-supplied operations, IDs or credentials.
5. Scan JavaScript, HTML, JSON config payloads and source maps, with a known-positive control before accepting a zero.
6. Write down what the scan did not cover: other routes, SSR pages, logs, caches, third-party scripts, history.
7. If a real secret ever reached a browser, rotate it at the issuer. Removal revokes nothing.

## FAQ

**Is it safe to put an API key in frontend JavaScript?**
Only if the key authorizes nothing privileged, and you know that because you tested it against the privileged operations, not because it is labelled public. Anything in the bundle is held by every visitor. Here the identifier was refused (403) and the secret accepted (200).

**Does moving the API key to a backend proxy fix the leak?**
Not on its own. A proxy that forwards whatever the browser requests is the leak with an extra hop. The backend must authenticate the user, check the operation against an allow-list, authorize the role, and call the upstream with its own credential.

**If I remove a leaked secret from my code, is the leak closed?**
No. Every copy of the old bundle, in browser caches, CDNs and downloads, still holds a working credential. Revoke or rotate the secret at the issuer. The fixture demonstrates removal and states that rotation is a separate required step.

## Watch the episode

[YouTube link]

- 00:00 Two credential-shaped strings in the bundle
- 00:09 Ask what each value can actually do
- 00:21 Public identifier as bearer: 403
- 00:32 Synthetic secret: 200
- 00:39 Move the secret behind a backend that decides
- 00:54 No session 401, viewer 403
- 01:02 Maintainer 200, over-broad operation 400
- 01:17 Scan the corrected artifacts
- 01:30 Identifier names, secret grants

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A public identifier names something. A secret grants capability. The constant name tells you which one the author hoped for; only the upstream can tell you which one it is.

Miz Causevic, Kinetic Gain LLC
