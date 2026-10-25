// Episode 16 fixture: the FLAWED search client.
//
//   - sends a request on EVERY keystroke (no debounce)
//   - on 429 it retries IMMEDIATELY, ignoring Retry-After
//   - no request sequence number: whichever response arrives last is what the UI shows
//   - no AbortController: obsolete requests run to completion
//
// The immediate-retry loop is BOUNDED (maxImmediateRetries) purely so the tests terminate.
// Real flawed clients often have no such bound.
export const createFlawedClient = ({base, cookie, clock, fetchImpl = fetch, maxImmediateRetries = 3}) => {
  const log = [];        // what the CLIENT did, in clock ms
  const inflight = new Set();
  const state = {input: '', shown: null, shownFor: null, requests: 0, rejected: 0, retries: 0, staleRenders: 0};

  const send = (q, attempt) => {
    state.requests += 1;
    if (attempt > 0) state.retries += 1;
    const entry = {n: state.requests, at: clock.now(), q, attempt, status: null};
    log.push(entry);
    const p = fetchImpl(`${base}/search?q=${encodeURIComponent(q)}`, {headers: {cookie}})
      .then(async (r) => {
        entry.status = r.status;
        entry.doneAt = clock.now();
        if (r.status === 429) {
          state.rejected += 1;
          entry.retryAfter = r.headers.get('retry-after');
          // THE FLAW: retry at once. The server told us how long to wait; we did not read it.
          if (attempt < maxImmediateRetries) send(q, attempt + 1);
          else entry.gaveUp = true;
          return;
        }
        const body = await r.json();
        // THE OTHER FLAW: no guard. A slow, old response overwrites a newer one.
        state.shown = body.results;
        state.shownFor = body.query;
        if (body.query !== state.input) { state.staleRenders += 1; entry.stale = true; }
      })
      .catch((e) => { entry.status = 'error'; entry.error = e.message; })
      .finally(() => inflight.delete(p));
    inflight.add(p);
  };

  return {
    kind: 'flawed',
    log,
    state,
    onInput(text) { state.input = text; send(text, 0); },
    async settle() { while (inflight.size) await Promise.all([...inflight]); },
  };
};
