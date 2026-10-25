// Controllable mock search API. Nothing here uses timers or machine timing:
// a request stays pending until the caller explicitly release()s or fail()s it.
// Synthetic data only; no sockets.

// Synthetic ranking table (not a real search index).
const TABLE = {
  re: ['redis', 'redux', 'regex', 'request'],
  react: ['react', 'react-dom', 'react-router'],
  r: ['rails', 'redis', 'react', 'rust'],
};

export const resultsFor = (query) => TABLE[query] ?? [`${query}-1`, `${query}-2`];

export const isAbortError = (e) => e != null && e.name === 'AbortError';

/**
 * @param {object} [opts]
 * @param {(n:number)=>string} [opts.idFor]  request id for the nth request (1-based). Defaults to "req-<n>".
 *                                          Tests pass opaque/unordered ids to show the guard never relies on id order.
 * @param {boolean} [opts.honorAbort=true]  when false the mock "server" ignores the client's abort signal:
 *                                          the request stays pending and can still be released later.
 */
export function createMockApi({idFor = (n) => `req-${n}`, honorAbort = true} = {}) {
  /** @type {Array<{n:number,id:string,query:string,state:'pending'|'released'|'failed'|'aborted',signalAborted:boolean,settle:object}>} */
  const requests = [];

  const api = {
    requests,
    /** Starts a request; returns a promise that settles only when the test releases/fails/aborts it. */
    search(query, {signal} = {}) {
      const n = requests.length + 1;
      const rec = {n, id: idFor(n), query, state: 'pending', signalAborted: false, settle: null};
      requests.push(rec);
      return new Promise((resolve, reject) => {
        rec.settle = {resolve, reject};
        if (signal) {
          const onAbort = () => {
            rec.signalAborted = true; // the CLIENT aborted. This says nothing about whether any server stopped working.
            if (honorAbort && rec.state === 'pending') {
              rec.state = 'aborted';
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            }
          };
          if (signal.aborted) onAbort();
          else signal.addEventListener('abort', onAbort, {once: true});
        }
      });
    },
    byN(n) {
      const r = requests[n - 1];
      if (!r) throw new RangeError(`no request #${n}`);
      return r;
    },
    /** Deliver the success response for request #n. Response carries its original query and request id. */
    release(n) {
      const r = api.byN(n);
      if (r.state !== 'pending') return false; // already aborted/settled: nothing to deliver
      r.state = 'released';
      r.settle.resolve({requestId: r.id, query: r.query, items: resultsFor(r.query)});
      return true;
    },
    /** Deliver a failure for request #n. */
    fail(n, message = 'network error (simulated)') {
      const r = api.byN(n);
      if (r.state !== 'pending') return false;
      r.state = 'failed';
      r.settle.reject(new Error(message));
      return true;
    },
    pendingNs: () => requests.filter((r) => r.state === 'pending').map((r) => r.n),
  };
  return api;
}
