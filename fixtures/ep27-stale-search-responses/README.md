# ep27-stale-search-responses — a simulated search controller with explicitly released responses

**SIMULATED CONTROLLER. NOT RECORDED BROWSER EVIDENCE.** Plain Node 22 ESM, zero dependencies, no DOM, no sockets, no timers. The search box is a framework-free state machine (`query`, `results`, `error`, `loading`, plus `generation` in the corrected version). The "API" is a mock in which every request stays pending until the test explicitly calls `release(n)` or `fail(n)`. Nothing depends on machine timing, so the output is identical on every run.

## What it is

| file | role |
|---|---|
| `mock-api.mjs` | controllable mock API: `search(query, {signal})` returns a pending promise; `release(n)` / `fail(n, msg)` settle request #n. Each response is `{requestId, query, items}`. Optional `idFor` (opaque ids) and `honorAbort:false` (an API that ignores the abort signal). |
| `search-controller.mjs` | `FlawedSearchController` (renders every arriving response; kept as the known-positive control) and `SearchController` (request-generation guard, optional `abortSuperseded`). |
| `driver.mjs` | `runSchedule(controller, api, steps)`: executes an explicit release schedule (`type`, `release`, `fail`, `clear`, `dispose`), awaiting exactly the call each step affects. |
| `test.mjs` | 22 `node:test` regression tests. |
| `demo.mjs` | runs the five video scenarios on both controllers plus the abort comparison and writes `evidence.json`. |

## Corrected controller: deliberate policies

- `search()` increments `generation`, captures the value, and compares it again **in the success path, the error path and the finally path** before writing any state.
- An obsolete outcome is recorded in `discards` and in the timeline (`kind: "discard"`) but never writes state.
- `clear()` and `dispose()` also increment `generation`, which invalidates every pending request. After `dispose()` the controller ignores `search()` and calls no listeners.
- A new search keeps the previous results visible while loading and clears the previous error (a UI policy of this fixture, not a requirement).
- An `AbortError` is never a user-facing error. With `abortSuperseded: true`, older requests are aborted when superseded, cleared or disposed; their rejections arrive as discarded error outcomes.
- **Abort is an optimisation, not the correctness mechanism.** The tests show identical final state with abort off, abort on, and abort on against an API that ignores the signal.
- The guard uses its own local counter. Request ids are only displayed; a test gives the newer request the "smaller" opaque id and the guard still works.

## Evidence (`evidence.json`)

Each scenario records the exact `releaseSchedule`, the per-step state, and the full state timeline (writes and discards) for the flawed and corrected controllers:

| scenario | schedule | flawed final | corrected final |
|---|---|---|---|
| `stale_success` | type re, type react, release 2, release 1 | query `react`, results for `re` | results for `react` (req-2), discards: success, finally |
| `stale_failure` | type re, type react, release 2, fail 1 | error `network error (simulated)` over react results | error `null`, discards: error, finally |
| `loading` | type re, type react, release 1, release 2 | after step 3: `loading=false`, results for `re`, req-2 pending | after step 3: `loading=true`, no results |
| `cleared` | type re, clear, release 1 | empty query, results for `re` | empty query, no results |
| `disposed` | type react, dispose, release 1 | 2 state writes after dispose | 0 state writes after dispose |

`abortComparison` replays the `stale_success` schedule with guard only, guard plus abort, and guard plus abort against an API that ignores the signal: final state identical (`true`).

## Executed

```
$ node --test fixtures/ep27-stale-search-responses/test.mjs
# tests 22
# suites 0
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
$ node fixtures/ep27-stale-search-responses/demo.mjs   # writes evidence.json
stale_success  flawed    query="react"  resultsFor=re     loading=false error=null
stale_success  corrected query="react"  resultsFor=react  loading=false error=null
abort comparison: final state identical = true
```

## Limitations and what is NOT tested

- No browser, no DOM, no framework (React or otherwise). The state machine models the control flow of a component's search handler; it is not that component.
- The mock API releases responses by explicit calls. Real networks, HTTP, server-side behaviour and real `fetch` abort semantics are not exercised. `AbortController` is the real Node global, but the abort rejection is produced by the mock.
- A client abort does not prove the server stopped executing. The mock records `signalAborted` only; with `honorAbort:false` the request stays pending, to show that the guard still protects the UI.
- Debouncing is not simulated (no timers). The debounce test only models that two requests are already in flight; it does not claim debouncing guarantees ordering, and it does not.
- Request ids are not assumed to be globally ordered; this is local UI concurrency control for one search box, not a distributed-ordering solution.
- Out of scope: caching, retries, pagination, keyboard/IME input, multiple controllers sharing a store, race conditions in code that is not this controller.
