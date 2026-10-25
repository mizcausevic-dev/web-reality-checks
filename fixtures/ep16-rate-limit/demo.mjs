// Runs the exact scenario the video shows and writes evidence.json plus the two request logs.
//
// Same server policy, same scripted typing ("postgres", one character per 80 clock-ms), two clients:
//   A. flawed    — request per keystroke, immediate retry on 429 (bounded to 3 per keystroke)
//   B. corrected — debounce 250 ms, sequence guard, AbortController, Retry-After with ceil, max one retry
// Then a third run (C) that starts the corrected client inside an already-exhausted window, so the
// Retry-After path is exercised and recorded.
//
// Time: the fixture runs on a scaled clock (10 virtual ms per real ms). Every "ms" in the output is
// virtual fixture time; the limiter's 10 s window and Retry-After values are expressed in those units.
import fs from 'node:fs';
import {scaledClock, TYPING_SCRIPT, TYPING_SCRIPT_PAUSED, runTyping} from './limiter.mjs';
import {createApp} from './server.mjs';
import {createFlawedClient} from './client-flawed.mjs';
import {createCorrectedClient} from './client-corrected.mjs';

const FACTOR = 10;
const out = (name, data) => fs.writeFileSync(new URL(`./${name}`, import.meta.url), JSON.stringify(data, null, 2));

const run = async (label, make, script = TYPING_SCRIPT, {preExhaust = false} = {}) => {
  const clock = scaledClock(FACTOR);
  const s = createApp({clock});
  const port = await s.listen();
  const base = `http://127.0.0.1:${port}`;
  const cookie = (await fetch(`${base}/login/tester`)).headers.get('set-cookie').split(';')[0];
  if (preExhaust) for (let i = 0; i < 5; i++) await fetch(`${base}/search?q=p`, {headers: {cookie}});
  const client = make({base, cookie, clock});
  const keystrokes = await runTyping(client, clock, script);
  await s.close();
  const server200 = s.log.filter((e) => e.status === 200).length;
  const server429 = s.log.filter((e) => e.status === 429).length;
  return {
    label,
    client: client.kind,
    script: script.map((x) => x.ch).join('') + ` (${script.length} keystrokes, ${script === TYPING_SCRIPT ? '80 ms apart' : '80 ms apart, 600 ms pause after "post"'})`,
    preExhausted: preExhaust,
    summary: {
      clientRequests: client.state.requests,
      clientRetries: client.state.retries,
      client429: client.state.rejected,
      serverRequestsSeen: s.log.length,
      server200,
      server429,
      serverAbortsObserved: s.log.filter((e) => e.abortedByClient).length,
      droppedStaleResponses: client.state.dropped ?? 0,
      abortedByClient: client.state.aborted ?? 0,
      cancelledRetries: client.state.cancelledRetries ?? 0,
      staleRenders: client.state.staleRenders,
      finalInput: client.state.input,
      finalResultsFor: client.state.shownFor,
      finalResults: client.state.shown,
    },
    keystrokes,
    clientLog: client.log,
    serverLog: s.log,
  };
};

const flawed = await run('A. flawed client, scripted typing', (o) => createFlawedClient({...o, maxImmediateRetries: 3}));
const corrected = await run('B. corrected client, same scripted typing', (o) => createCorrectedClient(o));
const correctedAbort = await run('B2. corrected client, paused typing (shows abort + sequence guard)', (o) => createCorrectedClient(o), TYPING_SCRIPT_PAUSED);
const correctedRetry = await run('C. corrected client, window already exhausted (shows Retry-After path)', (o) => createCorrectedClient(o), TYPING_SCRIPT, {preExhaust: true});

// Strip the 5 pre-exhaust requests from C's server view so the counts describe the client under test only.
correctedRetry.serverLogIncludesPreExhaust = true;

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  clock: {kind: 'scaled', virtualMsPerRealMs: FACTOR, note: 'all ms values are virtual fixture time; limiter window = 10 000 virtual ms'},
  policy: {limit: 5, windowMs: 10_000, rejectedCount: false, retryAfterFormat: 'delta-seconds, integer, rounded up, min 1', identity: 'server-established synthetic test identity (not production auth)'},
  flawed: {...flawed, keystrokes: undefined, clientLog: undefined, serverLog: undefined},
  corrected: {...corrected, keystrokes: undefined, clientLog: undefined, serverLog: undefined},
  correctedAbort: {...correctedAbort, keystrokes: undefined, clientLog: undefined, serverLog: undefined},
  correctedRetry: {...correctedRetry, keystrokes: undefined, clientLog: undefined, serverLog: undefined,
    retryDetail: (() => { const [a, b] = correctedRetry.clientLog.filter((e) => e.q); return {firstStatus: a.status, retryAfterHeader: a.retryAfter, scheduledRetryInMs: a.scheduledRetryInMs, retryAt: b?.at, retryStatus: b?.status, firstDoneAt: a.doneAt}; })()},
};
out('evidence.json', evidence);
out('request-log-flawed.json', {generatedAt: evidence.generatedAt, clock: evidence.clock, ...flawed});
out('request-log-corrected.json', {generatedAt: evidence.generatedAt, clock: evidence.clock, runs: [corrected, correctedAbort, correctedRetry]});

console.table([flawed, corrected, correctedAbort, correctedRetry].map((r) => ({
  run: r.label.slice(0, 48), requests: r.summary.clientRequests, retries: r.summary.clientRetries, '429s': r.summary.client429,
  server200: r.summary.server200, aborted: r.summary.abortedByClient, dropped: r.summary.droppedStaleResponses, stale: r.summary.staleRenders, shownFor: r.summary.finalResultsFor,
})));
console.log('Retry-After path:', evidence.correctedRetry.retryDetail);
