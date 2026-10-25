import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {app, listen, close, db, worker, MAX_UPLOAD_BYTES, sniffCsv, uploadDirPath} from './server.mjs';
import {upload, getJson, pollJob} from './client.mjs';

const port = await listen();
const base = `http://127.0.0.1:${port}`;
const loginAs = async (u) => { const r = await fetch(`${base}/login/${u}`); return r.headers.get('set-cookie').split(';')[0]; };

const GOOD_CSV = Buffer.from('id,email,amount\n1,a@example.test,10.50\n2,b@example.test,4.25\n3,c@example.test,100\n');
const BAD_ROWS_CSV = Buffer.from('id,email,amount\n1,a@example.test,10.50\n2,not-an-email,4.25\n3,c@example.test,lots\n');

test('success path: 202 accepted -> processing -> ready; result only when ready', async () => {
  worker.setPace(400); // labelled controlled pacing so the intermediate (not-ready) state is observable
  const c = await loginAs('alice');
  const jobsBefore = db.jobs.size;
  const up = await upload(base, c, GOOD_CSV, {filename: 'orders.csv', mime: 'text/csv', chunkSize: 32});
  // transfer: 100% of the REQUEST BODY, which is larger than the file
  assert.equal(up.progress.at(-1).pct, 100);
  assert.equal(up.progress.at(-1).sentBytes, up.bodyBytes);
  assert.ok(up.bodyBytes > up.fileBytes, 'request body includes multipart overhead');
  assert.equal(up.label, 'fixture-measured transfer bytes, includes multipart overhead');
  // acceptance: a separate fact, read from the response
  assert.equal(up.response.status, 202);
  const {jobId} = up.response.body;
  assert.ok(jobId);
  assert.equal(db.jobs.size, jobsBefore + 1);
  assert.equal(up.response.body.storedBytes, GOOD_CSV.length);
  assert.equal(up.response.body.requestBodyBytes, up.bodyBytes);
  // immediately after 202 the job is not ready; result is refused
  const early = await getJson(base, c, `/jobs/${jobId}`);
  assert.equal(early.status, 200);
  assert.ok(['accepted', 'processing'].includes(early.body.status), `expected accepted/processing, got ${early.body.status}`);
  assert.equal((await getJson(base, c, `/jobs/${jobId}/result`)).status, 409);
  // processing finishes: ready
  const {final, seen} = await pollJob(base, c, jobId);
  assert.equal(final.body.status, 'ready');
  assert.ok(seen.some((s) => s.jobStatus !== 'ready'), 'at least one poll observed a non-ready state');
  const result = await getJson(base, c, `/jobs/${jobId}/result`);
  assert.equal(result.status, 200);
  assert.equal(result.body.result.rows, 3);
  assert.equal(result.body.result.totalAmount, 114.75);
  worker.setPace(0);
});

test('stored filename is generated, lives outside public/, and ignores the client name', async () => {
  const c = await loginAs('alice');
  const up = await upload(base, c, GOOD_CSV, {filename: '../../evil.html', mime: 'text/csv'});
  assert.equal(up.response.status, 202);
  const job = db.jobs.get(up.response.body.jobId);
  assert.ok(job.storedPath.startsWith(uploadDirPath()));
  assert.ok(!job.storedPath.includes('evil'));
  assert.match(path.basename(job.storedPath), /^[0-9a-f]{16}\.csv$/);
  assert.ok(!job.storedPath.includes(`${path.sep}public${path.sep}`));
  assert.ok(fs.existsSync(job.storedPath));
});

test('HTTP rejection: oversized body -> 413, no job created', async () => {
  const c = await loginAs('alice');
  const before = db.jobs.size;
  const big = Buffer.concat([Buffer.from('id,email,amount\n'), Buffer.alloc(MAX_UPLOAD_BYTES + 1024, 'x')]);
  const up = await upload(base, c, big, {filename: 'big.csv', mime: 'text/csv'});
  assert.equal(up.response.status, 413);
  assert.equal(db.jobs.size, before);
});

test('HTTP rejection: non-CSV content with a CSV filename and MIME -> 415, no job created', async () => {
  const c = await loginAs('alice');
  const before = db.jobs.size;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]), Buffer.alloc(200, 7)]);
  const up = await upload(base, c, png, {filename: 'totally.csv', mime: 'text/csv'});
  // transfer still reached 100%: the request body was fully sent before the rejection was read
  assert.equal(up.progress.at(-1).pct, 100);
  assert.equal(up.response.status, 415);
  assert.equal(up.response.body.note, 'client filename and MIME type were not trusted');
  assert.equal(db.jobs.size, before);
});

test('KNOWN-POSITIVE CONTROL: trusting the client label alone would have accepted the PNG', () => {
  // The flawed policy "accept if filename ends in .csv or MIME is text/csv" says yes; content sniffing says no.
  const claimed = {filename: 'totally.csv', type: 'text/csv'};
  const trustsLabel = claimed.filename.endsWith('.csv') || claimed.type === 'text/csv';
  assert.equal(trustsLabel, true, 'the flaw must be observable or the content check proves nothing');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]), Buffer.alloc(200, 7)]);
  assert.equal(sniffCsv(png).ok, false);
});

test('processing failure: fully transferred CSV with invalid rows -> job failed with reason; result 409', async () => {
  const c = await loginAs('alice');
  const up = await upload(base, c, BAD_ROWS_CSV, {filename: 'orders.csv', mime: 'text/csv'});
  assert.equal(up.progress.at(-1).pct, 100);
  assert.equal(up.response.status, 202, 'acceptance is about shape and size, not row validity');
  const {jobId} = up.response.body;
  const {final} = await pollJob(base, c, jobId);
  assert.equal(final.body.status, 'failed');
  assert.match(final.body.reason, /line 3: invalid email "not-an-email"/);
  assert.match(final.body.reason, /line 4: amount is not a number "lots"/);
  const r = await getJson(base, c, `/jobs/${jobId}/result`);
  assert.equal(r.status, 409);
  assert.equal(r.body.status, 'failed');
});

test('status access: another user\'s job -> 404; absent job -> 404; unauthenticated -> 401', async () => {
  const alice = await loginAs('alice');
  const bob = await loginAs('bob');
  const up = await upload(base, alice, GOOD_CSV);
  const {jobId} = up.response.body;
  await pollJob(base, alice, jobId);
  assert.equal((await getJson(base, alice, `/jobs/${jobId}`)).status, 200);
  assert.equal((await getJson(base, bob, `/jobs/${jobId}`)).status, 404);
  assert.equal((await getJson(base, bob, `/jobs/${jobId}/result`)).status, 404);
  assert.equal((await getJson(base, alice, '/jobs/job_000000000000')).status, 404);
  assert.equal((await fetch(`${base}/jobs/${jobId}`)).status, 401);
  assert.equal((await fetch(`${base}/uploads`, {method: 'POST', body: 'x'})).status, 401);
});

test('uploads directory is not reachable through the served paths', async () => {
  const c = await loginAs('alice');
  const up = await upload(base, c, GOOD_CSV);
  const name = path.basename(db.jobs.get(up.response.body.jobId).storedPath);
  for (const p of [`/${name}`, `/uploads/${name}`, `/../${name}`, `/public/../${name}`]) {
    const r = await fetch(base + p, {headers: {cookie: c}});
    assert.notEqual(r.status, 200, `${p} must not be served`);
  }
});

test.after(() => { close(); void app; });
