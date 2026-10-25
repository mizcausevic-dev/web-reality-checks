// Episode 14 fixture: a small CSV uploader that keeps four stages separate:
//   transfer (request body bytes) -> acceptance (HTTP 202 + job) -> processing (worker) -> availability (ready)
// Loopback only. Synthetic users and data only. Zero npm dependencies.
//
//   GET  /login/:user          -> test harness: server-side session, opaque cookie
//   GET  /                     -> serves public/index.html (illustrative browser uploader; not executed by tests)
//   GET  /app.js               -> serves public/app.js
//   POST /uploads              -> multipart/form-data, field "file". Validates body size and sniffs
//                                 that the content is CSV-like (client filename / MIME are NOT trusted).
//                                 Stores under a generated name in an uploads dir that is never served.
//                                 Creates a job record and answers 202 {jobId, statusUrl}.
//   GET  /jobs/:id             -> job status; authorised: another user's job (or absent) -> 404
//   GET  /jobs/:id/result      -> 200 only when status === "ready"; otherwise 409 {status, reason}
//
// Job records live in memory and uploaded files in a per-process temp dir:
// THIS FIXTURE DOES NOT SURVIVE PROCESS RESTARTS. No persistence is claimed.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorker} from './worker.mjs';

export const MAX_UPLOAD_BYTES = 64 * 1024; // limit on the REQUEST BODY (includes multipart overhead)
export const REQUIRED_COLUMNS = ['id', 'email', 'amount'];

const here = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(here, 'public'); // the only directory ever served

export const db = {
  users: {alice: {id: 'u_alice', name: 'Alice'}, bob: {id: 'u_bob', name: 'Bob'}},
  jobs: new Map(), // jobId -> job record
};
const sessions = new Map(); // opaque sid -> {userId}

const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const cookieOf = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const currentUser = (req) => { const sid = cookieOf(req).sid; const s = sid && sessions.get(sid); return s ? Object.values(db.users).find((u) => u.id === s.userId) : null; };

/* ---------- content sniffing: is this CSV-like? (independent of client filename / MIME) ---------- */
export const sniffCsv = (buf) => {
  if (buf.length === 0) return {ok: false, reason: 'empty file'};
  const head = buf.subarray(0, Math.min(buf.length, 4096));
  if (head.includes(0)) return {ok: false, reason: 'binary content (NUL byte) is not CSV'};
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true}).decode(head); } catch { return {ok: false, reason: 'not valid UTF-8 text'}; }
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const cols = firstLine.split(',').map((c) => c.trim().toLowerCase());
  if (cols.length < 2) return {ok: false, reason: 'header line has no comma-separated fields'};
  const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return {ok: false, reason: `header missing required column(s): ${missing.join(', ')}`};
  return {ok: true, columns: cols};
};

/* ---------- minimal multipart/form-data parser (whole body is already size-limited) ---------- */
export const parseMultipart = (body, contentType) => {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return {error: 'missing multipart boundary'};
  const boundary = Buffer.from(`--${m[1] ?? m[2]}`);
  const parts = [];
  let pos = body.indexOf(boundary);
  while (pos !== -1) {
    pos += boundary.length;
    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break; // closing "--"
    pos += 2; // CRLF
    const hEnd = body.indexOf('\r\n\r\n', pos);
    if (hEnd === -1) return {error: 'malformed part headers'};
    const headers = body.subarray(pos, hEnd).toString('utf8');
    const next = body.indexOf(boundary, hEnd + 4);
    if (next === -1) return {error: 'unterminated part'};
    const data = body.subarray(hEnd + 4, next - 2); // strip CRLF before boundary
    const name = /name="([^"]*)"/i.exec(headers)?.[1] ?? '';
    const filename = /filename="([^"]*)"/i.exec(headers)?.[1];
    const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim();
    parts.push({name, filename, type, data});
    pos = next;
  }
  return {parts};
};

/* ---------- job records ---------- */
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep14-uploads-')); // outside PUBLIC_DIR; never served
export const worker = createWorker(db.jobs);
export const now = () => Date.now();

// Seeded, deterministic ids (so evidence.json and the video stay in step across runs). Not a security property.
let seq = 0;
const seededId = (prefix, len) => `${prefix}${crypto.createHash('sha256').update(`ep14-seed:${prefix}:${++seq}`).digest('hex').slice(0, len)}`;

const createJob = (owner, storedPath, meta) => {
  const id = seededId('job_', 12);
  const job = {id, ownerId: owner.id, status: 'accepted', storedPath, reason: null, result: null,
    meta, // what the client CLAIMED, kept for the record but never trusted for decisions
    stages: {accepted: now(), processingStarted: null, finished: null}};
  db.jobs.set(id, job);
  worker.enqueue(job);
  return job;
};
const publicJob = (job) => ({jobId: job.id, status: job.status, reason: job.reason, stages: job.stages, statusUrl: `/jobs/${job.id}`,
  resultUrl: job.status === 'ready' ? `/jobs/${job.id}/result` : null});

/* ---------- HTTP ---------- */
const readBodyLimited = (req, limit) => new Promise((resolve) => {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) { req.resume(); return resolve({tooLarge: true, declared}); }
  const chunks = []; let n = 0; let over = false;
  req.on('data', (c) => { if (over) return; n += c.length; if (n > limit) { over = true; req.resume(); return; } chunks.push(c); });
  req.on('end', () => resolve(over ? {tooLarge: true, declared: n} : {body: Buffer.concat(chunks)}));
  req.on('error', () => resolve({error: 'request aborted'}));
});

const serveStatic = (res, file) => {
  const abs = path.join(PUBLIC_DIR, file);
  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs)) return json(res, 404, {error: 'not found'});
  res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'});
  res.end(fs.readFileSync(abs));
};

export const app = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let m;
  if (req.method === 'GET' && (m = url.pathname.match(/^\/login\/(\w+)$/))) {
    const u = db.users[m[1]]; if (!u) return json(res, 404, {error: 'no such test user'});
    const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, {userId: u.id});
    res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
    return json(res, 200, {ok: true, user: u.id});
  }
  if (req.method === 'GET' && url.pathname === '/') return serveStatic(res, 'index.html');
  if (req.method === 'GET' && url.pathname === '/app.js') return serveStatic(res, 'app.js');

  const user = currentUser(req);
  if (req.method === 'POST' && url.pathname === '/uploads') {
    if (!user) { req.resume(); return json(res, 401, {error: 'unauthenticated'}); }
    if (!/^multipart\/form-data/i.test(req.headers['content-type'] || '')) { req.resume(); return json(res, 415, {error: 'expected multipart/form-data'}); }
    const r = await readBodyLimited(req, MAX_UPLOAD_BYTES);
    if (r.tooLarge) return json(res, 413, {error: 'request body too large', limitBytes: MAX_UPLOAD_BYTES, note: 'limit applies to the request body, multipart overhead included'});
    if (r.error) return json(res, 400, {error: r.error});
    const mp = parseMultipart(r.body, req.headers['content-type']);
    if (mp.error) return json(res, 400, {error: mp.error});
    const file = mp.parts.find((p) => p.name === 'file' && p.filename !== undefined);
    if (!file) return json(res, 400, {error: 'missing "file" part'});
    const sniff = sniffCsv(file.data);                 // decision is made on CONTENT, not on file.filename / file.type
    if (!sniff.ok) return json(res, 415, {error: 'content is not CSV-like', reason: sniff.reason, claimedFilename: file.filename, claimedType: file.type ?? null, note: 'client filename and MIME type were not trusted'});
    const storedPath = path.join(uploadDir, `${seededId('', 16)}.csv`); // generated name; never derived from client filename
    fs.writeFileSync(storedPath, file.data);
    const job = createJob(user, storedPath, {claimedFilename: file.filename, claimedType: file.type ?? null, storedBytes: file.data.length, requestBodyBytes: r.body.length});
    res.writeHead(202, {'content-type': 'application/json', location: `/jobs/${job.id}`});
    return res.end(JSON.stringify({accepted: true, ...publicJob(job), storedBytes: file.data.length, requestBodyBytes: r.body.length, note: 'accepted for processing; not processed yet'}));
  }
  if (req.method === 'GET' && (m = url.pathname.match(/^\/jobs\/(\w+)(\/result)?$/))) {
    if (!user) return json(res, 401, {error: 'unauthenticated'});
    const job = db.jobs.get(m[1]);
    if (!job || job.ownerId !== user.id) return json(res, 404, {error: 'not found'}); // absent OR another user's -> 404 (deliberate policy)
    if (!m[2]) return json(res, 200, publicJob(job));
    if (job.status !== 'ready') return json(res, 409, {error: 'result not available', status: job.status, reason: job.reason});
    return json(res, 200, {jobId: job.id, status: 'ready', result: job.result});
  }
  json(res, 404, {error: 'not found'});
});

export const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
export const close = () => { app.close(); worker.stop(); fs.rmSync(uploadDir, {recursive: true, force: true}); };
export const uploadDirPath = () => uploadDir;
if (import.meta.url === `file://${process.argv[1]}`) listen().then((p) => console.log(`ep14 fixture on http://127.0.0.1:${p}  (uploads in ${uploadDir}, not served)`));
