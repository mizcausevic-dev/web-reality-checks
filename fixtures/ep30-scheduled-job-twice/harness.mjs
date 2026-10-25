// Parent-side test harness: forks real worker processes and runs the barrier.
import {fork} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REPORT_TYPE, SCHEDULED_UTC, DEFAULT_BUSY_TIMEOUT_MS} from './db.mjs';

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.mjs');

export const spawnWorker = (cfg) => {
  const full = {variant: 'corrected', reportType: REPORT_TYPE, scheduledUtc: SCHEDULED_UTC, busyTimeoutMs: DEFAULT_BUSY_TIMEOUT_MS, ...cfg};
  const child = fork(WORKER, [JSON.stringify(full)], {stdio: ['ignore', 'ignore', 'pipe', 'ipc'], execArgv: ['--no-warnings']});
  const w = {name: full.name, cfg: full, child, pid: child.pid, stderr: '', messages: [], result: null, waiters: [], exit: null};
  child.stderr.on('data', (d) => (w.stderr += d));
  w.exited = new Promise((res) => child.on('exit', (code, signal) => { w.exit = {code, signal}; res(w.exit); }));
  child.on('message', (m) => {
    w.messages.push(m);
    if (m.type === 'result') w.result = m;
    w.waiters = w.waiters.filter((x) => (x.type === m.type ? (x.res(m), false) : true));
  });
  w.waitFor = (type) => {
    const seen = w.messages.find((m) => m.type === type);
    return seen ? Promise.resolve(seen) : new Promise((res) => w.waiters.push({type, res}));
  };
  return w;
};

/**
 * Run workers with an explicit barrier controlled by the caller:
 *   1. every worker reports 'checked' or 'ready' (existence check done / connection open)
 *   2. only then does the parent send 'go' to all of them
 * `events` records the order the parent observed, so a test can prove that the barrier held.
 */
export const runWithBarrier = async (cfgs) => {
  const events = [];
  const workers = cfgs.map(spawnWorker);
  const arrivals = await Promise.all(workers.map(async (w) => {
    const m = await Promise.race([w.waitFor('checked'), w.waitFor('ready'), w.exited.then(() => ({type: 'exited-early', worker: w.name}))]);
    events.push(m.type === 'checked' ? `${w.name}: checked, found ${m.found}` : `${w.name}: ${m.type}`);
    return m;
  }));
  if (arrivals.some((m) => m.type === 'exited-early')) throw new Error('worker exited before the barrier: ' + workers.map((w) => w.stderr).join('|'));
  events.push('barrier: all workers arrived, releasing');
  for (const w of workers) w.child.send({type: 'go'});
  await Promise.all(workers.map((w) => w.exited));
  for (const w of workers) events.push(`${w.name}: ${w.result ? w.result.outcome : 'no result (' + (w.exit.signal ?? w.exit.code) + ')'}`);
  return {workers, events, arrivals, results: workers.map((w) => w.result), exits: workers.map((w) => w.exit)};
};

/** Run ONE worker through the barrier on its own (retries, lock-contention, constraint tests). */
export const runOne = async (cfg) => (await runWithBarrier([cfg]));
