import test from 'node:test';
import assert from 'node:assert/strict';
import {createMockApi, isAbortError, resultsFor} from './mock-api.mjs';
import {FlawedSearchController, SearchController} from './search-controller.mjs';
import {runSchedule} from './driver.mjs';

// Every test drives the mock API by explicitly releasing responses. No timers, no sleeps, no machine timing.

const RE_THEN_REACT = [{do: 'type', query: 're'}, {do: 'type', query: 'react'}];

test('mock API: requests stay pending until released; response carries original query and request id', async () => {
  const api = createMockApi();
  const p1 = api.search('re');
  const p2 = api.search('react');
  assert.deepEqual(api.pendingNs(), [1, 2]);
  api.release(2);
  const r2 = await p2;
  assert.deepEqual(r2, {requestId: 'req-2', query: 'react', items: resultsFor('react')});
  assert.deepEqual(api.pendingNs(), [1], 'request 1 is still pending: nothing resolves on its own');
  api.release(1);
  const r1 = await p1;
  assert.equal(r1.query, 're');
  assert.equal(r1.requestId, 'req-1');
});

test('KNOWN-POSITIVE CONTROL (flawed): late response for "re" overwrites results for "react"', async () => {
  const api = createMockApi();
  const c = new FlawedSearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 2}]);
  assert.equal(c.snapshot().resultsFor, 'react');
  assert.deepEqual(c.snapshot().items, ['react', 'react-dom', 'react-router']);
  await runSchedule(c, api, [{do: 'release', request: 1}]); // the older request answers last
  const s = c.snapshot();
  assert.equal(s.query, 'react', 'the user still has "react" in the box');
  assert.equal(s.resultsFor, 're', 'BUG OBSERVED: results for "re" are on screen under a "react" query');
  assert.deepEqual(s.items, ['redis', 'redux', 'regex', 'request']);
  assert.equal(s.resultsRequestId, 'req-1');
});

test('corrected: the same release schedule leaves results for "react" in place', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'release', request: 1}]);
  const s = c.snapshot();
  assert.equal(s.query, 'react');
  assert.equal(s.resultsFor, 'react');
  assert.equal(s.resultsRequestId, 'req-2');
  assert.equal(s.loading, false);
  assert.equal(s.error, null);
  assert.deepEqual(c.discards.map((d) => d.path), ['success', 'finally'], 'the obsolete success and its finally were both discarded');
  assert.equal(c.discards[0].query, 're');
});

test('corrected: an obsolete response that arrives first (in order) is still discarded; results appear only for the current query', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 1}]);
  assert.equal(c.snapshot().resultsFor, null, 'nothing for "re" is shown while "react" is the current query');
  assert.equal(c.snapshot().loading, true, 'still waiting for the current request');
  await runSchedule(c, api, [{do: 'release', request: 2}]);
  assert.equal(c.snapshot().resultsFor, 'react');
  assert.equal(c.snapshot().loading, false);
});

test('stale failure — KNOWN-POSITIVE CONTROL (flawed): an obsolete failure replaces current state', async () => {
  const api = createMockApi();
  const c = new FlawedSearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'fail', request: 1, message: 'network error (simulated)'}]);
  const s = c.snapshot();
  assert.equal(s.resultsFor, 'react');
  assert.equal(s.error, 'network error (simulated)', 'BUG OBSERVED: the error for the OLD "re" request is shown beside current "react" results');
});

test('stale failure (corrected): an obsolete failure cannot replace current results or set an error', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'fail', request: 1, message: 'network error (simulated)'}]);
  const s = c.snapshot();
  assert.equal(s.resultsFor, 'react');
  assert.equal(s.error, null);
  assert.equal(s.loading, false);
  assert.deepEqual(c.discards.map((d) => d.path), ['error', 'finally'], 'the guard applies in the error path and the finally path');
  assert.equal(c.discards[0].message, 'network error (simulated)');
});

test('current failure (corrected): the guard does not swallow errors that belong to the current request', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 1}, {do: 'fail', request: 2, message: 'boom'}]);
  const s = c.snapshot();
  assert.equal(s.error, 'boom');
  assert.equal(s.loading, false);
  assert.equal(s.resultsFor, null);
});

test('starting a new search clears the previous error', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [{do: 'type', query: 're'}, {do: 'fail', request: 1, message: 'first failed'}]);
  assert.equal(c.snapshot().error, 'first failed');
  await runSchedule(c, api, [{do: 'type', query: 'react'}]);
  assert.equal(c.snapshot().error, null, 'starting a new search clears the previous error');
  await runSchedule(c, api, [{do: 'release', request: 2}]);
  assert.equal(c.snapshot().resultsFor, 'react');
});

test('loading — KNOWN-POSITIVE CONTROL (flawed): an older finally clears loading while the current request is pending', async () => {
  const api = createMockApi();
  const c = new FlawedSearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 1}]);
  const s = c.snapshot();
  assert.equal(s.loading, false, 'BUG OBSERVED: spinner is gone although the "react" request is still pending');
  assert.deepEqual(api.pendingNs(), [2]);
  assert.equal(s.resultsFor, 're');
});

test('loading (corrected): an older finally cannot clear the current loading state', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 1}]);
  assert.equal(c.snapshot().loading, true);
  assert.deepEqual(api.pendingNs(), [2]);
  // an older FAILURE's finally is also unable to clear it
  const api2 = createMockApi();
  const c2 = new SearchController(api2);
  await runSchedule(c2, api2, [...RE_THEN_REACT, {do: 'fail', request: 1}]);
  assert.equal(c2.snapshot().loading, true);
  assert.equal(c2.snapshot().error, null);
  await runSchedule(c2, api2, [{do: 'release', request: 2}]);
  assert.equal(c2.snapshot().loading, false);
  assert.equal(c2.snapshot().resultsFor, 'react');
});

test('query cleared — KNOWN-POSITIVE CONTROL (flawed): a pending response repopulates an emptied search box', async () => {
  const api = createMockApi();
  const c = new FlawedSearchController(api);
  await runSchedule(c, api, [{do: 'type', query: 're'}, {do: 'clear'}, {do: 'release', request: 1}]);
  const s = c.snapshot();
  assert.equal(s.query, '');
  assert.equal(s.resultsFor, 're', 'BUG OBSERVED: results for "re" appear under an empty query');
});

test('query cleared (corrected): clearing invalidates pending generations', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [{do: 'type', query: 're'}, {do: 'clear'}]);
  assert.deepEqual(
    {query: c.snapshot().query, loading: c.snapshot().loading, resultsFor: c.snapshot().resultsFor},
    {query: '', loading: false, resultsFor: null},
  );
  const writesBefore = c.stateWrites;
  await runSchedule(c, api, [{do: 'release', request: 1}]);
  assert.equal(c.stateWrites, writesBefore, 'the late response wrote nothing');
  assert.equal(c.snapshot().resultsFor, null);
  assert.equal(c.snapshot().loading, false);
  assert.deepEqual(c.discards.map((d) => d.path), ['success', 'finally']);
  // a late failure after clear is also discarded
  const api2 = createMockApi();
  const c2 = new SearchController(api2);
  await runSchedule(c2, api2, [{do: 'type', query: 're'}, {do: 'clear'}, {do: 'fail', request: 1}]);
  assert.equal(c2.snapshot().error, null);
  // searching again after clear still works
  await runSchedule(c2, api2, [{do: 'type', query: 'react'}, {do: 'release', request: 2}]);
  assert.equal(c2.snapshot().resultsFor, 'react');
});

test('disposed — KNOWN-POSITIVE CONTROL (flawed): state keeps being written after dispose', async () => {
  const api = createMockApi();
  const c = new FlawedSearchController(api);
  await runSchedule(c, api, [{do: 'type', query: 'react'}, {do: 'dispose'}]);
  const before = c.stateWrites;
  await runSchedule(c, api, [{do: 'release', request: 1}]);
  assert.ok(c.stateWrites > before, 'BUG OBSERVED: late response wrote state after dispose');
});

test('disposed (corrected): dispose invalidates pending generations; late success and failure write nothing', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  let notifications = 0;
  c.subscribe(() => notifications++);
  await runSchedule(c, api, [{do: 'type', query: 're'}, {do: 'type', query: 'react'}, {do: 'dispose'}]);
  const writes = c.stateWrites;
  const snap = JSON.stringify(c.snapshot().resultsFor) + c.snapshot().loading;
  const notified = notifications;
  await runSchedule(c, api, [{do: 'release', request: 2}, {do: 'fail', request: 1}]);
  assert.equal(c.stateWrites, writes);
  assert.equal(notifications, notified, 'no listener is called after dispose');
  assert.equal(JSON.stringify(c.snapshot().resultsFor) + c.snapshot().loading, snap);
  assert.equal(c.snapshot().error, null);
  assert.deepEqual(c.discards.map((d) => d.path), ['success', 'finally', 'error', 'finally']);
  // search() after dispose is ignored: no new request is even created
  const requestsBefore = api.requests.length;
  await runSchedule(c, api, [{do: 'type', query: 'again'}]);
  assert.equal(api.requests.length, requestsBefore);
});

test('request ids are opaque: the guard uses its own local counter, never server id ordering', async () => {
  // Ids deliberately NOT increasing: the newer request gets the "smaller" id.
  const ids = ['zz-900', 'aa-001'];
  const api = createMockApi({idFor: (n) => ids[n - 1]});
  const c = new SearchController(api);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'release', request: 1}]);
  assert.equal(c.snapshot().resultsFor, 'react');
  assert.equal(c.snapshot().resultsRequestId, 'aa-001');
  assert.deepEqual(c.discards[0], {path: 'success', generation: 1, current: 2, query: 're', requestId: 'zz-900'});
});

test('same query typed twice gets two generations; the first is obsolete', async () => {
  const api = createMockApi();
  const c = new SearchController(api);
  await runSchedule(c, api, [{do: 'type', query: 'react'}, {do: 'type', query: 'react'}, {do: 'release', request: 2}, {do: 'release', request: 1}]);
  assert.equal(c.snapshot().resultsRequestId, 'req-2');
  assert.equal(c.snapshot().generation, 2);
  assert.equal(c.discards[0].requestId, 'req-1');
});

test('debouncing spaces out request creation but does not order responses (modelled as two requests already in flight)', async () => {
  // A debounce only decides WHEN search() is called. Once the debounce window for "re" has elapsed and
  // the request is in flight, a later "react" request can still be answered first. No timer is used here;
  // the two search() calls stand for two debounce windows that each fired.
  const api = createMockApi();
  const flawed = new FlawedSearchController(api);
  await runSchedule(flawed, api, [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'release', request: 1}]);
  assert.equal(flawed.snapshot().resultsFor, 're', 'fewer requests would not have prevented this ordering');
});

// ---- abort -----------------------------------------------------------------

test('abort: a superseded request is aborted; its AbortError is discarded and never shown to the user', async () => {
  const api = createMockApi();
  const c = new SearchController(api, {abortSuperseded: true});
  await runSchedule(c, api, RE_THEN_REACT);
  assert.equal(api.byN(1).signalAborted, true);
  assert.equal(api.byN(1).state, 'aborted');
  assert.equal(api.byN(2).signalAborted, false);
  assert.equal(c.snapshot().error, null, 'abort errors are not user-facing errors');
  assert.equal(c.snapshot().loading, true, 'the aborted request\'s finally did not clear loading');
  assert.deepEqual(c.discards.map((d) => [d.path, d.abort ?? null]), [['error', true], ['finally', null]]);
  await runSchedule(c, api, [{do: 'release', request: 2}]);
  assert.equal(c.snapshot().resultsFor, 'react');
  assert.equal(c.snapshot().error, null);
  assert.equal(c.snapshot().loading, false);
});

test('abort: clear() and dispose() abort in-flight work too, with no error shown', async () => {
  const api = createMockApi();
  const c = new SearchController(api, {abortSuperseded: true});
  await runSchedule(c, api, [{do: 'type', query: 're'}, {do: 'clear'}]);
  assert.equal(api.byN(1).state, 'aborted');
  assert.equal(c.snapshot().error, null);
  assert.equal(c.snapshot().loading, false);
  await runSchedule(c, api, [{do: 'type', query: 'react'}, {do: 'dispose'}]);
  assert.equal(api.byN(2).state, 'aborted');
  assert.equal(c.snapshot().error, null);
});

test('abort is an optimisation: final user-visible state is identical with and without abort', async () => {
  const schedule = [...RE_THEN_REACT, {do: 'release', request: 2}, {do: 'release', request: 1}];
  const finals = [];
  for (const abortSuperseded of [false, true]) {
    const api = createMockApi();
    const c = new SearchController(api, {abortSuperseded});
    await runSchedule(c, api, schedule);
    finals.push(c.snapshot());
  }
  assert.deepEqual(finals[0], finals[1]);
  assert.equal(finals[0].resultsFor, 'react');
});

test('correctness without abort: an API that ignores the abort signal (server keeps working) is still handled by the guard', async () => {
  const api = createMockApi({honorAbort: false});
  const c = new SearchController(api, {abortSuperseded: true});
  await runSchedule(c, api, RE_THEN_REACT);
  assert.equal(api.byN(1).signalAborted, true, 'the client did abort');
  assert.equal(api.byN(1).state, 'pending', 'but the request was not stopped: an abort proves nothing about server-side execution');
  await runSchedule(c, api, [{do: 'release', request: 2}, {do: 'release', request: 1}]);
  assert.equal(c.snapshot().resultsFor, 'react');
  assert.equal(c.snapshot().loading, false);
  assert.deepEqual(c.discards.map((d) => d.path), ['success', 'finally']);
});

test('the guard works with abortSuperseded false even for failures and clear (abort is not the only mechanism)', async () => {
  const api = createMockApi();
  const c = new SearchController(api); // abortSuperseded defaults to false
  assert.equal(c.abortSuperseded, false);
  await runSchedule(c, api, [...RE_THEN_REACT, {do: 'fail', request: 1}, {do: 'release', request: 2}, {do: 'clear'}]);
  assert.equal(c.snapshot().error, null);
  assert.equal(c.snapshot().resultsFor, null);
  assert.equal(isAbortError(new DOMException('x', 'AbortError')), true);
});
