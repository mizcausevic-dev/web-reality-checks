// Episode 16 fixture: the CORRECTED search client.
//
//   1. debounce      — a request leaves only after `debounceMs` of no typing
//   2. sequence      — every request carries a sequence number; a response is applied only if its
//                      sequence is still the latest (older responses are dropped, however late they arrive)
//   3. abort         — when the input changes, the in-flight request is aborted via AbortController
//                      (where supported). An abort only stops the client waiting; it does not prove
//                      the server stopped processing. The sequence guard is what makes the result safe.
//   4. Retry-After   — on 429 the client reads Retry-After (delta-seconds in this fixture; real servers
//                      may send an HTTP-date), rounds UP, and schedules AT MOST ONE retry of the
//                      still-current query. A scheduled retry is cancelled if the query changes.
//
// This policy is for an idempotent, read-only search. Do not reuse it blindly for state-changing requests.
export const createCorrectedClient = ({base, cookie, clock, fetchImpl = fetch, debounceMs = 250, abort = true, fallbackRetryMs = 1000, maxRetries = 1}) => {
  const log = [];
  const inflight = new Set();
  const state = {input: '', shown: null, shownFor: null, requests: 0, rejected: 0, retries: 0, staleRenders: 0, dropped: 0, aborted: 0, cancelledRetries: 0};
  let seq = 0;            // latest issued sequence number
  let debounceTimer = null;
  let retryTimer = null;  // at most one scheduled retry at a time
  let current = null;     // {controller, seq, q}

  /** Retry-After -> clock ms, rounded UP to whole seconds so we never retry before the reset. */
  const retryAfterMs = (header) => {
    if (header == null || header === '') return fallbackRetryMs; // not guaranteed on every real 429
    const secs = Number(header);
    if (Number.isFinite(secs)) return Math.ceil(secs) * 1000;
    const date = Date.parse(header);                               // HTTP-date form (not used by this fixture)
    return Number.isFinite(date) ? Math.max(1000, Math.ceil((date - Date.now()) / 1000) * 1000) : fallbackRetryMs;
  };

  const abortCurrent = (reason) => {
    if (current && current.controller && !current.controller.signal.aborted) {
      current.controller.abort(reason);
      state.aborted += 1;
      current.entry.abortedAt = clock.now();
      current.entry.abortReason = reason;
    }
  };

  const cancelRetry = () => {
    if (retryTimer) { clock.clearTimeout(retryTimer.id); state.cancelledRetries += 1; log.push({at: clock.now(), event: 'retry-cancelled', q: retryTimer.q, reason: 'query changed'}); retryTimer = null; }
  };

  const send = (q, attempt) => {
    const mySeq = ++seq;
    const controller = abort && typeof AbortController === 'function' ? new AbortController() : null;
    state.requests += 1;
    if (attempt > 0) state.retries += 1;
    const entry = {n: state.requests, at: clock.now(), seq: mySeq, q, attempt, status: null};
    log.push(entry);
    current = {controller, seq: mySeq, q, entry};
    const p = fetchImpl(`${base}/search?q=${encodeURIComponent(q)}`, {headers: {cookie}, signal: controller?.signal})
      .then(async (r) => {
        entry.status = r.status;
        entry.doneAt = clock.now();
        if (mySeq !== seq) { state.dropped += 1; entry.dropped = true; return; } // stale: a newer request exists
        if (r.status === 429) {
          state.rejected += 1;
          const ra = r.headers.get('retry-after');
          entry.retryAfter = ra;
          if (attempt < maxRetries) {
            const wait = retryAfterMs(ra);
            entry.scheduledRetryInMs = wait;
            retryTimer = {q, id: clock.setTimeout(() => { retryTimer = null; if (q === state.input) send(q, attempt + 1); }, wait)};
          } else entry.gaveUp = true;
          return;
        }
        const body = await r.json();
        if (mySeq !== seq) { state.dropped += 1; entry.dropped = true; return; } // re-check after body read
        state.shown = body.results;
        state.shownFor = body.query;
        if (body.query !== state.input) { state.staleRenders += 1; entry.stale = true; }
      })
      .catch((e) => { entry.status = e.name === 'AbortError' ? 'aborted' : 'error'; if (entry.status === 'error') entry.error = e.message; })
      .finally(() => inflight.delete(p));
    inflight.add(p);
  };

  return {
    kind: 'corrected',
    log,
    state,
    onInput(text) {
      state.input = text;
      seq += 1;                                        // any response still in flight is now stale, even before the next request leaves
      cancelRetry();                                   // a retry for an old query must never fire
      abortCurrent('query changed');                   // in-flight result can no longer be shown
      if (debounceTimer) clock.clearTimeout(debounceTimer);
      debounceTimer = clock.setTimeout(() => { debounceTimer = null; if (text) send(text, 0); }, debounceMs);
    },
    async settle() {
      // wait for debounce, in-flight requests and any scheduled retry to drain
      for (;;) {
        if (inflight.size) { await Promise.all([...inflight]); continue; }
        if (debounceTimer || retryTimer) { await new Promise((r) => clock.setTimeout(r, 50)); continue; }
        return;
      }
    },
  };
};
