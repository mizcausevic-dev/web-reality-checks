import test from 'node:test';
import assert from 'node:assert/strict';
import {createLimiter, manualClock, scaledClock, TYPING_SCRIPT, TYPING_SCRIPT_PAUSED, runTyping} from './limiter.mjs';
import {createApp, latencyFor} from './server.mjs';
import {createFlawedClient} from './client-flawed.mjs';
import {createCorrectedClient} from './client-corrected.mjs';

/* ------------------------------------------------------------------ */
/* 1. Limiter boundary tests on a manual clock (nothing moves unless the test moves it) */
/* ------------------------------------------------------------------ */

test('limiter: first five requests in a window are allowed, the sixth is rejected', () => {
  const clock = manualClock(0);
  const lim = createLimiter({limit: 5, windowMs: 10_000, clock});
  for (let i = 1; i <= 5; i++) {
    const v = lim.check('id_a');
    assert.equal(v.allowed, true, `request ${i} should be allowed`);
    assert.equal(v.remaining, 5 - i);
  }
  const sixth = lim.check('id_a');
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.remaining, 0);
});

test('limiter: Retry-After is whole seconds until the window edge, rounded UP, never zero', () => {
  const clock = manualClock(0);
  const lim = createLimiter({clock});
  for (let i = 0; i < 5; i++) lim.check('id_a');
  clock.set(2_300);                      // 7 700 ms left -> 8
  assert.equal(lim.check('id_a').retryAfterSeconds, 8);
  clock.set(9_001);                      // 999 ms left -> 1 (not 0)
  assert.equal(lim.check('id_a').retryAfterSeconds, 1);
  clock.set(9_999);
  assert.equal(lim.check('id_a').retryAfterSeconds, 1);
});

test('limiter: allowance resets exactly at the window edge', () => {
  const clock = manualClock(0);
  const lim = createLimiter({clock});
  for (let i = 0; i < 5; i++) lim.check('id_a');
  clock.set(9_999);
  assert.equal(lim.check('id_a').allowed, false, 'one ms before the edge: still rejected');
  clock.set(10_000);
  const v = lim.check('id_a');
  assert.equal(v.allowed, true, 'at the edge: new window');
  assert.equal(v.remaining, 4);
  assert.equal(v.windowStart, 10_000);
});

test('limiter: rejected requests do not consume allowance (fixture policy)', () => {
  const clock = manualClock(0);
  const lim = createLimiter({clock});
  for (let i = 0; i < 5; i++) lim.check('id_a');
  for (let i = 0; i < 50; i++) assert.equal(lim.check('id_a').allowed, false); // hammering changes nothing
  clock.set(10_000);
  // if rejections had counted, the next window would still be allowed (new window) — so prove it differently:
  // the window-local count after 5 allowed + 50 rejected must still be exactly 5.
  clock.set(9_000);
  assert.equal(lim.check('id_a').remaining, 0);
  clock.set(10_000);
  let allowed = 0;
  for (let i = 0; i < 6; i++) if (lim.check('id_a').allowed) allowed++;
  assert.equal(allowed, 5, 'a fresh window grants exactly five again, regardless of how many were rejected before');
});

test('limiter: identities are independent', () => {
  const clock = manualClock(0);
  const lim = createLimiter({clock});
  for (let i = 0; i < 5; i++) lim.check('id_a');
  assert.equal(lim.check('id_a').allowed, false);
  assert.equal(lim.check('id_b').allowed, true);
});

/* ------------------------------------------------------------------ */
/* 2. Server behaviour */
/* ------------------------------------------------------------------ */

const boot = async (factor = 10) => {
  const clock = scaledClock(factor);
  const s = createApp({clock});
  const port = await s.listen();
  const base = `http://127.0.0.1:${port}`;
  const login = async (name = 'tester') => (await fetch(`${base}/login/${name}`)).headers.get('set-cookie').split(';')[0];
  return {...s, base, login};
};

test('server: /search without a server-established identity is 401; client identity claims are ignored', async () => {
  const s = await boot();
  try {
    assert.equal((await fetch(`${s.base}/search?q=po`)).status, 401);
    assert.equal((await fetch(`${s.base}/search?q=po&identity=id_x`, {headers: {'x-identity': 'id_x'}})).status, 401);
  } finally { await s.close(); }
});

test('server: sixth request in the window is 429 with integer Retry-After and RateLimit headers', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const statuses = [];
    for (let i = 0; i < 6; i++) { const r = await fetch(`${s.base}/search?q=postgres`, {headers: {cookie}}); statuses.push(r.status); if (i === 5) {
      assert.match(r.headers.get('retry-after'), /^\d+$/, 'Retry-After must be an integer number of seconds (this fixture\'s declared format)');
      assert.equal(r.headers.get('ratelimit-remaining'), '0');
      assert.ok(Number(r.headers.get('retry-after')) >= 1);
    } }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    assert.equal(s.log.length, 6);
    assert.equal(s.log.filter((e) => e.status === 429).length, 1);
  } finally { await s.close(); }
});

test('server: shorter prefixes answer slower (what makes out-of-order arrival possible)', () => {
  assert.ok(latencyFor('p') > latencyFor('post'));
  assert.ok(latencyFor('post') > latencyFor('postgres'));
});

/* ------------------------------------------------------------------ */
/* 3. Scripted typing: the SAME script against both clients */
/* ------------------------------------------------------------------ */

test('KNOWN-POSITIVE CONTROL: flawed client bursts on every keystroke, is rate-limited, retries at once and gets more 429s', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const client = createFlawedClient({base: s.base, cookie, clock: s.clock, maxImmediateRetries: 3});
    await runTyping(client, s.clock, TYPING_SCRIPT);
    const st = client.state;
    assert.equal(st.requests, 8 + 3 * 3, 'eight keystrokes + three bounded immediate retries for each of the three rejected keystrokes');
    assert.equal(st.rejected, 3 * 4, 'every immediate retry was itself rejected');
    assert.equal(s.log.filter((e) => e.status === 200).length, 5, 'the server allowed exactly five');
    assert.equal(s.log.filter((e) => e.status === 429).length, 12);
    // the immediate retries were pointless: Retry-After said wait, and the client did not
    const retries = client.log.filter((e) => e.attempt > 0);
    assert.ok(retries.every((e) => e.status === 429));
    assert.ok(retries.every((e) => Number(e.retryAfter) >= 1));
  } finally { await s.close(); }
});

test('KNOWN-POSITIVE CONTROL: flawed client shows results for an old prefix (stale render)', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const client = createFlawedClient({base: s.base, cookie, clock: s.clock});
    await runTyping(client, s.clock, TYPING_SCRIPT);
    assert.equal(client.state.input, 'postgres');
    assert.notEqual(client.state.shownFor, 'postgres', 'the box says "postgres" but the list is for something else');
    assert.ok(client.state.staleRenders >= 1);
  } finally { await s.close(); }
});

test('corrected client: same typing script -> one request, no 429, results match the input', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock});
    await runTyping(client, s.clock, TYPING_SCRIPT);
    assert.equal(client.state.requests, 1);
    assert.equal(client.state.rejected, 0);
    assert.equal(client.state.staleRenders, 0);
    assert.equal(client.state.shownFor, 'postgres');
    assert.deepEqual(client.state.shown, ['postgres', 'postgresql tuning', 'postgres replication']);
    assert.equal(s.log.length, 1);
  } finally { await s.close(); }
});

test('corrected client: obsolete in-flight request is aborted; server observed the abort; final result is current', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock});
    await runTyping(client, s.clock, TYPING_SCRIPT_PAUSED);
    const post = s.log.find((e) => e.q === 'post');
    assert.ok(post, 'the pause let the "post" request leave the client');
    assert.equal(post.abortedByClient, true, 'server saw the client go away before it answered');
    assert.equal(client.state.aborted, 1);
    assert.equal(client.state.requests, 2);
    assert.equal(client.state.shownFor, 'postgres');
    assert.equal(client.state.staleRenders, 0);
  } finally { await s.close(); }
});

test('corrected client without abort support: the late "post" response is dropped by the sequence guard', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock, abort: false});
    await runTyping(client, s.clock, TYPING_SCRIPT_PAUSED);
    const post = client.log.find((e) => e.q === 'post');
    assert.equal(post.status, 200, 'the server did answer');
    assert.equal(post.dropped, true, 'but the client refused to render it');
    assert.equal(client.state.dropped, 1);
    assert.equal(client.state.aborted, 0);
    assert.equal(client.state.shownFor, 'postgres');
    assert.equal(client.state.staleRenders, 0);
  } finally { await s.close(); }
});

test('corrected client: on 429 it waits ceil(Retry-After) seconds and retries the still-current query exactly once', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    for (let i = 0; i < 5; i++) await fetch(`${s.base}/search?q=p`, {headers: {cookie}}); // exhaust the window first
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock});
    await runTyping(client, s.clock, TYPING_SCRIPT);
    const [first, retry] = client.log.filter((e) => e.q);
    assert.equal(first.status, 429);
    assert.match(first.retryAfter, /^\d+$/);
    assert.equal(first.scheduledRetryInMs, Number(first.retryAfter) * 1000);
    assert.equal(retry.attempt, 1);
    assert.equal(retry.status, 200);
    assert.ok(retry.at >= first.doneAt + first.scheduledRetryInMs, 'retry did not fire before Retry-After elapsed');
    assert.ok(retry.at >= 10_000, 'retry landed in the next window');
    assert.equal(client.state.requests, 2);
    assert.equal(client.state.retries, 1);
    assert.equal(client.state.shownFor, 'postgres');
  } finally { await s.close(); }
});

test('corrected client: a second 429 is not retried again (bounded to one retry)', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    for (let i = 0; i < 5; i++) await fetch(`${s.base}/search?q=p`, {headers: {cookie}});
    // simulate a server whose next window is also exhausted: issue 5 more requests at the moment the retry would land
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock});
    client.onInput('postgres');
    await new Promise((r) => s.clock.setTimeout(r, 400));             // first request has been sent and rejected
    const first = client.log.find((e) => e.q);
    assert.equal(first.status, 429);
    const timerAt = first.doneAt + first.scheduledRetryInMs;
    await new Promise((r) => s.clock.setTimeout(r, Math.max(0, timerAt - s.clock.now() + 5)));
    for (let i = 0; i < 5; i++) await fetch(`${s.base}/search?q=p`, {headers: {cookie}}); // steal the new window
    await client.settle();
    const attempts = client.log.filter((e) => e.q);
    assert.equal(attempts.length, 2);
    // the retry raced the thieves; whichever way it went, there is never a third attempt
    assert.equal(client.state.retries, 1);
    if (attempts[1].status === 429) assert.equal(attempts[1].gaveUp, true);
  } finally { await s.close(); }
});

test('corrected client: a scheduled retry is cancelled when the query changes', async () => {
  const s = await boot();
  try {
    const cookie = await s.login();
    for (let i = 0; i < 5; i++) await fetch(`${s.base}/search?q=p`, {headers: {cookie}});
    const client = createCorrectedClient({base: s.base, cookie, clock: s.clock});
    client.onInput('postg');
    await new Promise((r) => s.clock.setTimeout(r, 400));
    assert.equal(client.log.find((e) => e.q === 'postg').status, 429);
    client.onInput('postgres');                                       // query changed while a retry was pending
    await client.settle();
    assert.equal(client.state.cancelledRetries, 1);
    assert.ok(client.log.some((e) => e.event === 'retry-cancelled' && e.q === 'postg'));
    const sent = client.log.filter((e) => e.q);
    assert.ok(!sent.some((e) => e.q === 'postg' && e.attempt > 0), 'the stale query was never retried');
    assert.equal(client.state.shownFor, 'postgres');
  } finally { await s.close(); }
});

test('corrected client: Retry-After parsing rounds up and tolerates a missing header', async () => {
  // Pure parsing check through a stub fetch: no server.
  const clock = scaledClock(10);
  const seen = [];
  const stub = async (url) => {
    const q = new URL(url).searchParams.get('q');
    seen.push({q, at: clock.now()});
    if (seen.length === 1) return new Response(JSON.stringify({error: 'rate limited'}), {status: 429, headers: {'retry-after': '2.2'}});
    return new Response(JSON.stringify({query: q, results: []}), {status: 200});
  };
  const c = createCorrectedClient({base: 'http://127.0.0.1:1', cookie: 'sid=x', clock, fetchImpl: stub, debounceMs: 10});
  c.onInput('po');
  await c.settle();
  assert.equal(c.log[0].scheduledRetryInMs, 3000, '2.2 s -> ceil -> 3 s');
  assert.ok(seen[1].at - seen[0].at >= 3000 - 50);

  const seen2 = [];
  const stub2 = async (url) => { seen2.push(clock.now()); return seen2.length === 1 ? new Response('{}', {status: 429}) : new Response(JSON.stringify({query: 'po', results: []}), {status: 200}); };
  const c2 = createCorrectedClient({base: 'http://127.0.0.1:1', cookie: 'sid=x', clock, fetchImpl: stub2, debounceMs: 10, fallbackRetryMs: 700});
  c2.onInput('po');
  await c2.settle();
  assert.equal(c2.log[0].retryAfter, null, 'no Retry-After header on this 429');
  assert.equal(c2.log[0].scheduledRetryInMs, 700, 'client falls back to its own delay');
});
