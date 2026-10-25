# EP13 distribution kit: That API Key Is in Your JavaScript. Is That Always a Leak?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep13-api-key-capability/` (evidence.json, test.mjs, README.md). The synthetic secret is never printed in full anywhere in this kit.

## YouTube

### Title options (≤ 60 chars), ranked

1. `That API Key Is in Your JavaScript. Is That Always a Leak?` (58) : the series title; names the discovery and leaves the answer open, which is the episode's point.
2. `Public Key or Secret? Test the Lock, Not the Label` (50) : states the method in the title; lands search intent around public vs secret keys.
3. `We Found Two Keys in a Bundle. Only One Was a Leak.` (51) : concrete scene from the fixture; the "only one" invites the viewer to learn how to tell.
4. `An Identifier Names Something. A Secret Grants Power.` (53) : the closing thesis compressed for shares; "power" stands in for "capability" to fit.
5. `Moving the Key to a Backend Is Not Enough` (41) : for engineers who already know the first half and may be relying on a forwarding proxy.
6. `Deleting a Leaked Key Does Not Revoke It` (40) : the rotation point as a standalone hook; useful for the incident-response audience.

### Description

Two credential-shaped strings in your shipped JavaScript. One is named public, one secret. Which is the leak? The names cannot tell you. The lock can.

In this episode we build a fictional vendor API on a laptop that issues two synthetic values: an identifier and a bearer credential. A browser bundle embeds both. Then we ask the only question that matters: what does each value actually do? Presented to the privileged endpoint as a credential, the public identifier is refused, 403. The synthetic secret is accepted, 200, and the operation runs. Anyone who downloaded that bundle holds the same capability. That is the leak, and the name on the constant had nothing to do with it.

Then we repair it. The secret moves to backend-only configuration, and the backend does more than forward: no session, 401; signed-in viewer without the role, 403; maintainer requesting the one allowed operation, 200, with exactly one upstream call made by the backend and no secret in any response body or header. The same maintainer asks for a destructive operation the upstream would perform for the secret holder: 400, refused before any call is made. A scan of the corrected JavaScript, HTML and config payload reports 0 secret-like strings, after first proving it can find the planted one in the flawed bundle. 16 tests, 16 pass.

What this does not prove: zero in the tested assets is not zero everywhere. Some vendors issue browser keys with deliberately limited capability; this fixture settles nothing about theirs. CORS is not authorization. And a real leaked secret has to be rotated at the issuer, because removal revokes no copies.

Chapters
00:00 Two credential-shaped strings in the bundle
00:09 Ask what each value can actually do
00:21 Public identifier as bearer: 403
00:32 Synthetic secret: 200
00:39 Move the secret behind a backend that decides
00:54 No session 401, viewer 403
01:02 Maintainer 200, over-broad operation 400
01:17 Scan the corrected artifacts
01:30 Identifier names, secret grants

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep13/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

api key leak, secret in javascript, frontend secrets, public key vs secret key, bearer token, api security, web security, backend proxy, authorization, allow-list, secret scanning, source maps, known-positive control, credential rotation, node.js, javascript bundle, cors is not auth, capability, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with a fictional vendor and two synthetic values. The secret is invented and never shown in full; no real provider's key format or policy is tested or implied. Fixture, 16 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

Two credential-shaped strings in a shipped bundle. One named PUBLIC, one SECRET. Which is the leak? Neither name can tell you.

Episode 13 of Web Reality Checks asks: what does each value actually do at the upstream?

Public identifier as a bearer at the privileged endpoint: 403. Names a project, authorizes nothing. Synthetic secret: 200, operation performed. Every copy of the bundle is a copy of that capability. "Public" was a tested fact, not a promise.

Moving the secret to a backend is necessary, not sufficient. A backend that forwards whatever the browser requests is the same leak with an extra hop. Ours authenticates (401), checks a one-entry allow-list (delete_project: 400, no upstream call) and authorizes the role (viewer: 403) before using its own credential.

Two controls: the secret test proves the planted value grants capability, and the scanner proves it sees that value in the flawed bundle before it may report 0. 16 tests, 16 pass.

Limits: zero in scanned assets is not zero in logs or caches. Vendor browser keys with limited capability are a policy this fixture does not test. CORS is not auth. A leaked secret must be rotated; removal revokes no copies.

github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #APISecurity #SoftwareEngineering

### Post 2: non-technical leaders

Someone emails: "Your website is leaking API keys." Your team says one is labelled public, so it is fine. Nobody checked what it can do.

Episode 13 of Web Reality Checks reproduces that moment on a local fixture with a fictional vendor and two invented values.

The right test: show each value to the issuing service and ask for something privileged. Public: refused. Secret: accepted, action ran. The first is an address: it opens nothing. The second is a master key, and every visitor who loaded the site had a copy.

The fix is to keep the key on your own servers. The trap is a server that hands the key's power to anyone who asks. The episode's backend checks who is asking, whether they are allowed, and whether the request is an action it offers.

Five questions for your team or vendor:
1. For each key-shaped value in our website code, who tested what the issuer does when shown it?
2. Where does each secret live now?
3. Does our backend decide what it will do, or forward whatever the browser asks?
4. Was the scanner proven to catch a planted secret first?
5. If a real secret ever shipped, has it been rotated? Deleting it recalls no copies.

"It says public" is a label, not an answer.

github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #StartupSecurity #Leadership

## X/Twitter thread

1/ Open a shipped JavaScript bundle. Two credential-shaped strings fall out. One is named PUBLIC_PROJECT_ID, one SERVER_SECRET_TOKEN. Is this a leak? The names cannot tell you. Episode 13 of Web Reality Checks is about the question that can. Thread.

2/ A credential is a string, and strings carry no authority. Authority lives at the upstream, which decides what it will perform for whoever presents the bytes. So ask the upstream. Present each value to the privileged endpoint and record what happens.

3/ Public identifier presented as a bearer credential: 403. It names a project and authorizes nothing. Synthetic secret: 200, operation performed. Anyone who downloaded the bundle holds that capability. That is the leak; the names had nothing to do with it. (Synthetic fixture.)

4/ "Public" was safe here because it was tested and refused, not because of the word. Some real vendors ship browser keys with deliberately limited capability. This fixture models one fictional vendor and settles nothing about theirs. Test your key against your vendor's ops.

5/ The repair: secret moves to backend-only config. But a backend that forwards whatever the browser asks is the leak with an extra hop. Ours authenticates (401), checks an operation allow-list (delete_project: 400, no upstream call), authorizes the role (viewer: 403).

6/ Maintainer, allowed operation: 200. Exactly one upstream call, made by the backend. No secret in any response body or header. The upstream would have performed delete_project for the secret holder; a control test proves it, so the 400 is the allow-list doing real work.

7/ Scan the corrected JS, HTML, config payload and source maps if produced: 0 secret-like strings. The scanner first proved it finds the planted secret in the flawed bundle, or it refuses to report. Zero in tested assets is not zero in logs, caches or history. CORS is not auth.

8/ If this were a real production secret, removing it from the bundle would revoke no copies. Rotation at the issuer is a separate required step. 16 tests, 16 pass, synthetic fixture, fictional vendor. Fixture, tests, video: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture for classifying a browser-shipped credential by what it authorizes, with capability tests, an allow-listed backend, and an artifact scanner that must pass a known-positive control first

**First comment:** This is a deliberately constructed local fixture with a fictional vendor API and two synthetic values, an identifier and a bearer credential; neither reproduces or tests any real provider's key format or policy, and the secret is never printed in full outside the fixture source. The flawed bundle embeds both values and the test harness shows the identifier is refused (403) while the secret is accepted (200), then the corrected backend authenticates, validates the operation against a one-entry allow-list, and authorizes the role before making a single upstream call with its own credential. The limits are in the README: no real browser executes the bundles, the scanner is heuristic and only covers the two bundle folders plus the config payload, no source map was produced, and rotation is stated as a required response but not implemented.

## Short-form hook lines (≤ 12 words)

1. Two keys in the bundle. The names cannot tell you which leaks.
2. "Public" is a label. 403 is a fact.
3. Anyone who downloaded your bundle holds that capability.
4. A forwarding proxy is the same leak with an extra hop.
5. Deleting a leaked secret revokes no copies. Rotate it.

## Alt text

**hero.png:** A shipped JavaScript bundle opened in an inspector shows two credential-shaped strings, one labelled PUBLIC_PROJECT_ID and one labelled SERVER_SECRET_TOKEN with its value redacted, and the caption asks "Is this a leak? The names cannot tell you."

**thumbnail.png:** Episode thumbnail for "That API Key Is in Your JavaScript. Is That Always a Leak?" showing two key-shaped values pulled from a code bundle, one stamped 403 at a locked privileged endpoint and one stamped 200 with the lock open.
