// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
// Every timestamp in evidence.json is fixture-measured (Date.now() in this process) and labelled so.
// The only artificial element is the worker's controlled pacing delay, which is labelled as such.
import fs from 'node:fs';
import {listen, close, db, worker, MAX_UPLOAD_BYTES} from './server.mjs';
import {upload, getJson, pollJob} from './client.mjs';

const PACE_MS = 400; // labelled controlled pacing so the "processing" state is observable by polling
worker.setPace(PACE_MS);
const port = await listen();
const base = `http://127.0.0.1:${port}`;
const login = async (u) => (await fetch(`${base}/login/${u}`)).headers.get('set-cookie').split(';')[0];
const alice = await login('alice');
const bob = await login('bob');

const GOOD_CSV = Buffer.from('id,email,amount\n1,a@example.test,10.50\n2,b@example.test,4.25\n3,c@example.test,100\n');
const BAD_ROWS_CSV = Buffer.from('id,email,amount\n1,a@example.test,10.50\n2,not-an-email,4.25\n3,c@example.test,lots\n');
const PNG_AS_CSV = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]), Buffer.alloc(200, 7)]);

const T0 = Date.now();
const rel = (ms) => (ms == null ? null : ms - T0);
const stagesOf = (job) => ({accepted: rel(job.stages.accepted), processingStarted: rel(job.stages.processingStarted), finished: rel(job.stages.finished)});

const run = async (label, bytes, opts) => {
  const tStart = Date.now();
  const up = await upload(base, alice, bytes, {chunkSize: 32, ...opts});
  const tResponse = Date.now();
  const entry = {label,
    transfer: {label: up.label, fileBytes: up.fileBytes, requestBodyBytes: up.bodyBytes, multipartOverheadBytes: up.overheadBytes, progressEvents: up.progress.length,
      firstEvent: up.progress[0], lastEvent: up.progress.at(-1), transferCompleteAtMs: rel(tStart + up.progress.at(-1).atMs)},
    response: {status: up.response.status, body: up.response.body, receivedAtMs: rel(tResponse)},
    jobCreated: up.response.status === 202};
  if (up.response.status === 202) {
    const {jobId} = up.response.body;
    const earlyResult = await getJson(base, alice, `/jobs/${jobId}/result`);
    entry.resultBeforeReady = {status: earlyResult.status, body: earlyResult.body};
    const polled = await pollJob(base, alice, jobId, {intervalMs: 50});
    entry.polls = polled.seen.map((s) => ({atMs: rel(tResponse + s.atMs), jobStatus: s.jobStatus}));
    entry.final = polled.final.body;
    entry.stagesMs = stagesOf(db.jobs.get(jobId));
    const result = await getJson(base, alice, `/jobs/${jobId}/result`);
    entry.resultAfterFinal = {status: result.status, body: result.body};
    entry.statusAsBob = (await getJson(base, bob, `/jobs/${jobId}`)).status;
  }
  return entry;
};

const log = [];
log.push(await run('success: valid CSV', GOOD_CSV, {filename: 'orders.csv', mime: 'text/csv'}));
log.push(await run('http rejection: PNG bytes labelled totally.csv / text/csv', PNG_AS_CSV, {filename: 'totally.csv', mime: 'text/csv'}));
log.push(await run('http rejection: oversized body', Buffer.concat([Buffer.from('id,email,amount\n'), Buffer.alloc(MAX_UPLOAD_BYTES + 1024, 'x')]), {filename: 'big.csv', mime: 'text/csv', chunkSize: 8192}));
log.push(await run('processing failure: valid shape, invalid rows', BAD_ROWS_CSV, {filename: 'orders.csv', mime: 'text/csv'}));

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  labels: {
    timestamps: 'fixture-measured: Date.now() in the demo process, ms relative to demo start. Not representative of any real network or server.',
    transferBytes: 'fixture-measured transfer bytes, includes multipart overhead (request body, not stored-file size)',
    controlledPacing: `the worker waits ${PACE_MS} ms before processing starts. This delay is ARTIFICIAL and exists only so the processing state is observable. It is not a measured processing time.`,
    processingPercent: 'none. The server does not report a processing percentage because it does not measure one.',
    persistence: 'job records are in memory and stored files are in a per-process temp dir; nothing survives a restart.',
    browserUploader: 'public/index.html + app.js are provided, not executed (no browser in this environment).',
  },
  limits: {maxRequestBodyBytes: MAX_UPLOAD_BYTES},
  log,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(log.map((l) => ({label: l.label, transferPct: l.transfer.lastEvent.pct, bodyBytes: l.transfer.requestBodyBytes, http: l.response.status, job: l.jobCreated ? l.final.status : '-', result: l.resultAfterFinal?.status ?? '-', asBob: l.statusAsBob ?? '-'})));
close();
