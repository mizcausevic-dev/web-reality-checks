# EP11 fixture — consent gate

A consent banner "page" simulated in Node 22 (no browser) plus a loopback-only collector labelled **`SIMULATED ANALYTICS · LOCAL COLLECTOR`**. Two versions of the page share the same UI actions, preference store, simulated analytics module and collector. The flawed one stores the visitor's choice and ignores it; the corrected one drives an event gate from an explicit consent state machine.

This is a technical fixture. It is **not a legal compliance certification** and makes no claim about any real website. Nothing here contacts a real analytics or advertising service.

## Files
- `collector.mjs` — `POST /collect` (envelope `{event, category, module, consentState, pageMode, clientId?, ts}`, 202), `GET /events`, `POST /reset`. Binds `127.0.0.1`, ephemeral port. Raw recorder: stores whatever reaches it, no filtering.
- `page-flawed.mjs` — the page as an in-process object. UI actions are function calls: `load()`, `acceptOptional()`, `rejectOptional()`, `openSettings()`, `withdrawOptional()`, `interact(name)`, `flush()`. The preference store persists to a JSON file; a second `createPage` on the same file is a reload in the same browser context. **Flaw:** `load()` calls `analytics.init()` unconditionally; `init`, `track` and `flush` never read `consent.state`.
- `page-corrected.mjs` — same surface. Explicit state machine `no_choice → rejected | accepted`, `accepted → withdrawn` (`TRANSITIONS`), one policy function `optionalAllowed(state) === (state === 'accepted')`, and a gate checked on all three paths: `init` (do not start), `track` (a stray listener cannot queue), `flush` (a stale queue cannot send). `withdrawOptional()` removes optional listeners and clears the unsent queue. `load()` honours a stored `rejected` from the first tick.
- `test.mjs` — regression tests (`node:test`, zero dependencies).
- `demo.mjs` — the exact video scenario; writes `evidence.json`, `collector-log-flawed.json`, `collector-log-corrected.json`.
- `evidence.json`, `collector-log-*.json` — the real outputs of `demo.mjs`. The video shows only these numbers.

Deterministic: fixed-epoch clock (+7 ms per tick), seeded client id, no wall-clock reads, no `Math.random`.

## Run
```
node --test fixtures/ep11-consent-gate/test.mjs
node fixtures/ep11-consent-gate/demo.mjs
```

## Deliberate policies
- No optional analytics requests before a choice; none after rejection; optional analytics begins only after acceptance; withdrawal stops **new** emissions; the stored preference recording the choice may remain.
- Optional analytics is allowed in exactly one state: `accepted`. Every emission path checks the current state, not a cached flag.
- Withdrawal clears the **unsent** queue. Requests that already reached the collector stay there; the fixture never portrays them as recoverable.
- The simulated module identifies the visitor with an in-memory client id. No cookie exists in this fixture, which is the point: tracking does not require cookies.
- The collector is same-origin to the simulated page ("first-party"). First-party does not make a request necessary or exempt from the visitor's choice.
- Invalid transitions (`rejected → accepted`, `rejected → withdrawn`, …) throw. A new choice after rejection would be a new consent flow, which this fixture does not model.

## Executed
`node --test test.mjs` (Node v22.23.4):
```
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Tests: no choice → 0; reject → 0; accept → 3 flow; withdraw → listeners 0, unsent queue 0, no new requests (the 1 already sent remains); reload with stored rejection → 0, banner hidden; reload with stored acceptance → resumes; invalid transitions throw; **known-positive controls**: flawed page emits 3 after `rejectOptional()` (stamped `consentState: "rejected"`), and emits before any choice and again after a reload with stored rejection; collector rejects malformed envelopes.

`node demo.mjs` → `evidence.json`:
- flawed run (`load → reject → browse+flush → reload → flush`): **4** optional requests received; by consent state `no_choice: 1, rejected: 3`. Stored preference: `{"state":"rejected"}`.
- corrected, no choice → reject → reload: **0, 0, 0**. `analyticsInitialized: false` throughout, listeners 0.
- corrected, accept → withdraw: accepted **3** (page_view + 2 interactions); at withdraw `unsentQueue` 1 → 0, listeners 2 → 0; after further browsing and flush the count **stays 3**.
- `collector-log-flawed.json`: 4 events. `collector-log-corrected.json`: 3 events, all `consentState: "accepted"`.

## Accuracy notes (reflected in the video and the episode README)
- Analytics is simulated and labelled as such; the collector is local.
- Tracking can occur without cookies (in-memory id here).
- First-party does not automatically mean necessary or exempt.
- Stopping future requests does not delete previously collected data.
- Already-sent requests are not cancellable; the fixture does not claim to recall them.
- Not a legal compliance certification. No real analytics or advertising service was contacted.

## Limitations / not tested
- No real browser, DOM, cookies, localStorage, service workers, third-party scripts or tag manager. The page, banner, store and module are in-process simulations; "reload" is a second instance reading the same JSON file.
- Only one optional category (`analytics_optional`) is modelled. Real consent models have several categories, vendors and purposes; a per-category gate is the same mechanism repeated.
- Necessary (non-optional) requests are not modelled at all, so the fixture does not demonstrate how to classify a request as necessary.
- Server-side deletion, data-subject requests and retention are out of scope; the fixture only shows that they are not achieved by stopping emissions.
- Re-consent after rejection, consent expiry, cross-site or cross-device state, and race conditions between a late-arriving flush and a withdrawal are not simulated.
- Network loss and retries are not simulated; every request to the collector succeeds.
