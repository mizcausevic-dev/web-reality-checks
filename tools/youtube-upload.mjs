#!/usr/bin/env node
// Uploads Web Reality Checks films to YouTube through the official YouTube Data API v3.
// Safe by default: dry run, private uploads, nothing public without --confirm-public, no duplicate uploads.
//
//   node tools/youtube-upload.mjs --auth                       one-time consent; prints a refresh token once
//   node tools/youtube-upload.mjs --auth --store-token         Windows: saves the token to your user environment instead of printing it
//   node tools/youtube-upload.mjs --ids ep15                   dry run: validates copy, files, quota plan
//   node tools/youtube-upload.mjs --whoami                      shows which channel the token uploads to
//   node tools/youtube-upload.mjs --ids ep15 --upload --expect-channel @KG303Multimedia          upload as PRIVATE, then set the thumbnail
//   node tools/youtube-upload.mjs --ids ep01..ep30 --upload --playlist --captions
//   node tools/youtube-upload.mjs --ids series --upload        the full-series cut (run tools/build-series-cut.mjs first)
//
// Options: --privacy private|unlisted|public (default private; public also needs --confirm-public)
//          --playlist (create/reuse the series playlist and add each film)  --captions (400 quota units each)
//          --category 28 (YouTube category id, default 28 Science & Technology)  --synthetic (set the altered/synthetic disclosure)
//          --max-units 9000 (stop before this many quota units in one run; rerun the next day to continue)
//
// Environment variable NAMES only (values never printed, logged or written): YOUTUBE_CLIENT_ID,
// YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN. Progress is kept in youtube-uploads.json (ids only, git-ignored)
// so a rerun resumes instead of uploading twice. Requires Node 22+. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const LOOPBACK = new Set(['127.0.0.1', 'localhost']);

// Endpoints may be overridden for tests, but only to loopback or the real Google hosts, so a tampered
// environment cannot send a token to a stranger.
function safeBase(envName, fallback, allowedHosts) {
  const v = process.env[envName];
  if (!v) return fallback;
  const u = new URL(v);
  if (!(LOOPBACK.has(u.hostname) || allowedHosts.includes(u.hostname))) throw new Error(`${envName} must point to loopback or ${allowedHosts.join(', ')}`);
  return v.replace(/\/$/, '');
}
const API = () => safeBase('YOUTUBE_API_BASE', 'https://www.googleapis.com', ['www.googleapis.com']);
const TOKEN_URL = () => safeBase('YOUTUBE_TOKEN_URL', 'https://oauth2.googleapis.com/token', ['oauth2.googleapis.com']);
const STATE_FILE = () => process.env.YOUTUBE_STATE_FILE ?? path.join(ROOT, 'youtube-uploads.json');

export const LIMITS = {title: 100, descriptionBytes: 5000, tagsChars: 495};
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ex = (p) => fs.existsSync(path.join(ROOT, p));

// ---------- copy extraction and validation (pure, tested) ----------
export function sanitize(text) {
  // The API forbids < and > in titles and descriptions; a markdown quote marker is also dropped.
  return text.replace(/^>\s?/gm, '').replace(/[<>]/g, '').replace(/\r\n/g, '\n').trim();
}
export function tagBudget(tags) {
  return tags.reduce((n, t) => n + t.length + (/\s/.test(t) ? 2 : 0), 0) + Math.max(0, tags.length - 1);
}
export function fitTags(tags) {
  const kept = [...tags];
  while (kept.length && tagBudget(kept) > LIMITS.tagsChars) kept.pop();
  return {kept, dropped: tags.slice(kept.length)};
}
export function section(md, startRe, endRe) {
  const m = md.match(startRe);
  if (!m) return null;
  const rest = md.slice(m.index + m[0].length);
  const e = endRe ? rest.search(endRe) : -1;
  return (e === -1 ? rest : rest.slice(0, e)).trim();
}
export function parseDistribution(md, titleOption = 1) {
  const titles = [...(section(md, /### Title options[^\n]*\n/, /\n### /) ?? '').matchAll(/^\d+\. `([^`]+)`/gm)].map((m) => m[1]);
  const desc = section(md, /### Description\s*\n/, /\n### Tags/);
  const tagLine = (section(md, /### Tags[^\n]*\n/, /\n### |\n## /) ?? '').split('\n').find((l) => l.trim()) ?? '';
  const pinned = section(md, /### Pinned comment[^\n]*\n/, /\n## /);
  return {title: titles[titleOption - 1] ?? null, description: desc, tags: tagLine.split(',').map((t) => t.trim()).filter(Boolean), pinned};
}
export function validate(meta) {
  const v = [];
  if (!meta.title) v.push('no title');
  else if ([...meta.title].length > LIMITS.title) v.push(`title ${[...meta.title].length} chars > ${LIMITS.title}`);
  if (!meta.description) v.push('no description');
  else if (Buffer.byteLength(meta.description) > LIMITS.descriptionBytes) v.push(`description ${Buffer.byteLength(meta.description)} bytes > ${LIMITS.descriptionBytes}`);
  if (/[<>]/.test(meta.title ?? '') || /[<>]/.test(meta.description ?? '')) v.push('contains < or >');
  if (!meta.tags.length) v.push('no tags');
  return v;
}
export function buildFilm(id, opts = {}) {
  if (id === 'series') {
    const rel = rd('SERIES_RELEASE.md');
    const title = (section(rel, /### Playlist title[^\n]*\n/, /\n### /) ?? '').match(/^2\. `([^`]+)`/m)?.[1] ?? null;
    const desc = (section(rel, /### Playlist description[^\n]*\n/, /\n## /) ?? '').replace(/^```\n?|\n?```$/g, '').replace('This episode uses', 'This series uses');
    const chapters = ex('series-cut/chapters.txt') ? rd('series-cut/chapters.txt').trim() : null;
    const kw = [...(section(rel, /### Series-level keywords[^\n]*\n/, /\n### /) ?? '').matchAll(/^\d+\. (.+)$/gm)].map((m) => m[1].trim());
    const meta = {id, kind: 'series', title: title && sanitize(title), description: sanitize(`${desc}${chapters ? `\n\nChapters\n${chapters}` : ''}`), tags: kw, pinned: null,
      file: 'series-cut/web-reality-checks-full-series.mp4', thumb: opts.seriesThumb ?? null, captions: null};
    meta.notes = chapters ? [] : ['series-cut/chapters.txt missing: run node tools/build-series-cut.mjs'];
    return finish(meta);
  }
  if (!/^ep\d\d$/.test(id)) throw new Error(`unsupported id ${id}: this tool handles ep01..ep30 and series`);
  const dp = `episodes/${id}/content/distribution.md`;
  if (!ex(dp)) throw new Error(`missing ${dp}`);
  const p = parseDistribution(rd(dp), opts.titleOption ?? 1);
  const meta = {id, kind: 'ep', title: p.title && sanitize(opts.titleSuffix ? `${p.title} ${opts.titleSuffix}` : p.title), description: p.description && sanitize(p.description), tags: p.tags, pinned: p.pinned,
    file: `episodes/${id}/${id}.mp4`, thumb: `episodes/${id}/thumbnail.png`, captions: `episodes/${id}/captions.srt`, notes: []};
  return finish(meta);
}
function finish(meta) {
  const {kept, dropped} = fitTags(meta.tags);
  meta.tagsDropped = dropped;
  meta.tags = kept;
  meta.violations = validate(meta);
  for (const f of [meta.file, meta.thumb, meta.captions].filter(Boolean)) if (!ex(f)) meta.violations.push(`missing file ${f}`);
  return meta;
}
export function plannedUnits(meta, o) {
  return (meta.thumb ? 50 : 0) + (o.playlist ? 50 : 0) + (o.captions && meta.captions ? 400 : 0);
}

// ---------- HTTP ----------
class ApiError extends Error {}
async function apiError(r) {
  let msg = '';
  try { const j = await r.json(); msg = j.error?.message ?? j.error_description ?? j.error ?? ''; } catch { /* body not JSON */ }
  return new ApiError(`HTTP ${r.status} ${String(msg).slice(0, 300)}`.trim());
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retrying(fn, tries = 3) {
  for (let i = 0; ; i++) {
    try { const r = await fn(); if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep(1000 * 2 ** i); continue; } return r; }
    catch (e) { if (i >= tries - 1) throw e; await sleep(1000 * 2 ** i); }
  }
}
let cachedToken = null;
async function accessToken() {
  if (cachedToken) return cachedToken;
  const need = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].filter((k) => !process.env[k]);
  if (need.length) throw new Error(`BLOCKED: set environment variable(s) ${need.join(', ')} (names only; see header of this file)`);
  const r = await fetch(TOKEN_URL(), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET, refresh_token: process.env.YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token'})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    const hint = j.error === 'invalid_grant' ? ' The refresh token is expired or revoked (apps in Testing status expire tokens after 7 days). Run --auth again.' : '';
    throw new Error(`token refresh failed: ${j.error ?? r.status} ${j.error_description ?? ''}.${hint}`.trim());
  }
  return (cachedToken = j.access_token);
}
const authz = async (extra = {}) => ({Authorization: `Bearer ${await accessToken()}`, ...extra});
const sameHost = (u) => new URL(u).host === new URL(API()).host;

// Which channel does this token upload to? A Google account can own several (personal + Brand Account); the
// consent screen decides. Uploads are refused unless the channel handle matches --expect-channel.
export async function currentChannel() {
  const r = await fetch(`${API()}/youtube/v3/channels?part=snippet&mine=true`, {headers: await authz()});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`channels.list failed: ${r.status} ${j.error?.message ?? ''}`.trim());
  const c = j.items?.[0];
  if (!c) throw new Error('BLOCKED: this token has no YouTube channel. Run --auth again and choose the channel account.');
  return {id: c.id, title: c.snippet?.title ?? '', handle: String(c.snippet?.customUrl ?? '').replace(/^@/, '').toLowerCase()};
}

// ---------- upload steps ----------
export async function startSession(meta, o, size) {
  const status = {privacyStatus: o.privacy, selfDeclaredMadeForKids: false, ...(o.synthetic ? {containsSyntheticMedia: true} : {})};
  const body = JSON.stringify({snippet: {title: meta.title, description: meta.description, tags: meta.tags, categoryId: String(o.category)}, status});
  const r = await retrying(async () => fetch(`${API()}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, {method: 'POST',
    headers: await authz({'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4'}), body}));
  if (!r.ok) throw await apiError(r);
  const loc = r.headers.get('location');
  if (!loc || !sameHost(loc)) throw new Error('upload session URL missing or on an unexpected host');
  return loc;
}
// videos.update REPLACES the whole snippet, so send every field again (title, description, tags, category).
export async function updateSnippet(videoId, meta, o) {
  const r = await retrying(async () => fetch(`${API()}/youtube/v3/videos?part=snippet`, {method: 'PUT', headers: await authz({'Content-Type': 'application/json'}),
    body: JSON.stringify({id: videoId, snippet: {title: meta.title, description: meta.description, tags: meta.tags, categoryId: String(o.category)}})}));
  if (!r.ok) throw await apiError(r);
}
async function queryOffset(url, size) {
  const r = await fetch(url, {method: 'PUT', headers: await authz({'Content-Length': '0', 'Content-Range': `bytes */${size}`})});
  if (r.status === 200 || r.status === 201) return {done: await r.json()};
  if (r.status === 308) { const m = (r.headers.get('range') ?? '').match(/bytes=0-(\d+)/); return {offset: m ? Number(m[1]) + 1 : 0}; }
  if (r.status === 404) return {expired: true};
  throw await apiError(r);
}
export async function putFile(url, file, size) {
  let offset = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const headers = await authz({'Content-Length': String(size - offset), 'Content-Type': 'video/mp4', ...(offset ? {'Content-Range': `bytes ${offset}-${size - 1}/${size}`} : {})});
      const r = await fetch(url, {method: 'PUT', headers, body: Readable.toWeb(fs.createReadStream(file, {start: offset})), duplex: 'half'});
      if (r.status === 200 || r.status === 201) return r.json();
      if (r.status === 404) return {expired: true};
      if (r.status < 500 && r.status !== 308) throw await apiError(r);
    } catch (e) { if (e instanceof ApiError) throw e; }
    await sleep(attempt === 0 ? 200 : 1000 * 2 ** (attempt - 1));
    const q = await queryOffset(url, size);
    if (q.done) return q.done;
    if (q.expired) return {expired: true};
    offset = q.offset;
  }
  throw new Error('upload did not complete after retries');
}
async function setThumbnail(videoId, file) {
  const r = await retrying(async () => fetch(`${API()}/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {method: 'POST', headers: await authz({'Content-Type': 'image/png'}), body: fs.readFileSync(file)}));
  if (!r.ok) throw await apiError(r);
}
async function ensurePlaylist(state, o) {
  if (state.playlistId) return state.playlistId;
  const rel = rd('SERIES_RELEASE.md');
  const title = (section(rel, /### Playlist title[^\n]*\n/, /\n### /) ?? '').match(/^1\. `([^`]+)`/m)?.[1] ?? 'Web Reality Checks';
  const description = sanitize((section(rel, /### Playlist description[^\n]*\n/, /\n## /) ?? '').replace(/^```\n?|\n?```$/g, ''));
  const r = await retrying(async () => fetch(`${API()}/youtube/v3/playlists?part=snippet,status`, {method: 'POST', headers: await authz({'Content-Type': 'application/json'}),
    body: JSON.stringify({snippet: {title, description}, status: {privacyStatus: o.privacy}})}));
  if (!r.ok) throw await apiError(r);
  state.playlistId = (await r.json()).id;
  return state.playlistId;
}
async function addToPlaylist(playlistId, videoId) {
  const r = await retrying(async () => fetch(`${API()}/youtube/v3/playlistItems?part=snippet`, {method: 'POST', headers: await authz({'Content-Type': 'application/json'}),
    body: JSON.stringify({snippet: {playlistId, resourceId: {kind: 'youtube#video', videoId}}})}));
  if (!r.ok) throw await apiError(r);
  return (await r.json()).id;
}
async function uploadCaptions(videoId, file) {
  const B = `wrc-${crypto.randomBytes(8).toString('hex')}`;
  const meta = JSON.stringify({snippet: {videoId, language: 'en', name: 'English'}});
  const body = Buffer.concat([Buffer.from(`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${B}\r\nContent-Type: application/octet-stream\r\n\r\n`), fs.readFileSync(file), Buffer.from(`\r\n--${B}--`)]);
  const r = await retrying(async () => fetch(`${API()}/upload/youtube/v3/captions?uploadType=multipart&part=snippet`, {method: 'POST', headers: await authz({'Content-Type': `multipart/related; boundary=${B}`}), body}));
  if (!r.ok) throw await apiError(r);
}

// ---------- state (ids only, no secrets) ----------
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch { return {films: {}}; } };
const saveState = (s) => { const t = `${STATE_FILE()}.tmp`; fs.writeFileSync(t, JSON.stringify(s, null, 2)); fs.renameSync(t, STATE_FILE()); };

// ---------- --auth (installed-app loopback flow with PKCE) ----------
async function auth(storeToken) {
  if (storeToken && process.platform !== 'win32') throw new Error('--store-token is Windows only; run --auth without it and set YOUTUBE_REFRESH_TOKEN yourself');
  for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']) if (!process.env[k]) throw new Error(`BLOCKED: set environment variable ${k} first`);
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  const code = await new Promise((resolve, reject) => {
    let port = 0; // read once at listen time: address() is null after close()
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404).end(); return; }
      res.writeHead(200, {'Content-Type': 'text/plain'}).end('Authorization received. You can close this tab and return to the terminal.');
      srv.close();
      if (u.searchParams.get('state') !== state) reject(new Error('state mismatch, aborting')); else if (u.searchParams.get('error')) reject(new Error(`consent failed: ${u.searchParams.get('error')}`)); else resolve({code: u.searchParams.get('code'), redirect: `http://127.0.0.1:${port}`});
    }).listen(0, '127.0.0.1', () => {
      port = srv.address().port;
      const redirect = `http://127.0.0.1:${port}`;
      const url = `${AUTH_URL}?${new URLSearchParams({client_id: process.env.YOUTUBE_CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', code_challenge: challenge, code_challenge_method: 'S256', state})}`;
      console.log(`Open this URL in your browser and approve access:\n\n${url}\n`);
      if (!process.env.YOUTUBE_NO_BROWSER) {
        const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
        try { spawn(cmd, args, {stdio: 'ignore', detached: true}).on('error', () => {}).unref(); } catch { /* user can open the URL manually */ }
      }
    });
    setTimeout(() => { srv.close(); reject(new Error('timed out after 5 minutes waiting for consent')); }, 300000).unref();
  });
  const r = await fetch(TOKEN_URL(), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET, code: code.code, code_verifier: verifier, redirect_uri: code.redirect, grant_type: 'authorization_code'})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.refresh_token) throw new Error(`token exchange failed: ${j.error ?? r.status} ${j.error_description ?? ''}`.trim());
  if (storeToken) {
    // Windows only. The token travels in the child's environment, never on a command line, and is never printed.
    const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', "[Environment]::SetEnvironmentVariable('YOUTUBE_REFRESH_TOKEN', $env:WRC_TMP_TOKEN, 'User')"], {env: {...process.env, WRC_TMP_TOKEN: j.refresh_token}, stdio: 'ignore'});
    if (r.status !== 0) throw new Error('could not store the token in the user environment; rerun --auth without --store-token');
    console.log('SUCCESS. Refresh token stored in the user environment variable YOUTUBE_REFRESH_TOKEN (value not shown). Open a new terminal to use it.');
    return;
  }
  console.log('SUCCESS. Copy the refresh token below into the user environment variable YOUTUBE_REFRESH_TOKEN, then clear this terminal.');
  console.log('It is shown once and is not saved anywhere by this tool.\n');
  console.log(j.refresh_token);
}

// ---------- main ----------
export function parseArgs(argv) {
  const o = {ids: null, upload: false, privacy: 'private', playlist: false, captions: false, category: 28, synthetic: false, maxUnits: 9000, confirmPublic: false, auth: false, storeToken: false, whoami: false, expectChannel: null, titleSuffix: null, retitle: false, titleOption: 1, seriesThumb: null};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], nx = () => argv[++i];
    if (a === '--auth') o.auth = true; else if (a === '--store-token') o.storeToken = true; else if (a === '--whoami') o.whoami = true; else if (a === '--title-suffix') o.titleSuffix = nx(); else if (a === '--retitle') o.retitle = true; else if (a === '--expect-channel') o.expectChannel = nx(); else if (a === '--upload') o.upload = true; else if (a === '--playlist') o.playlist = true; else if (a === '--captions') o.captions = true;
    else if (a === '--synthetic') o.synthetic = true; else if (a === '--confirm-public') o.confirmPublic = true; else if (a === '--ids') o.ids = nx(); else if (a === '--privacy') o.privacy = nx();
    else if (a === '--category') o.category = Number(nx()); else if (a === '--max-units') o.maxUnits = Number(nx()); else if (a === '--title-option') o.titleOption = Number(nx()); else if (a === '--series-thumb') o.seriesThumb = nx();
    else throw new Error(`unknown option ${a}`);
  }
  if (!['private', 'unlisted', 'public'].includes(o.privacy)) throw new Error('--privacy must be private, unlisted or public');
  if (o.privacy === 'public' && o.upload && !o.confirmPublic) throw new Error('BLOCKED: public uploads need --confirm-public (default is private)');
  return o;
}
export function expandIds(spec) {
  const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => `ep${String(a + i).padStart(2, '0')}`);
  if (!spec || spec === 'all') return range(1, 30);
  return spec.split(',').flatMap((p) => {
    const m = p.match(/^ep(\d\d)\.\.ep(\d\d)$/);
    return m ? range(+m[1], +m[2]) : [p];
  });
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  API(); TOKEN_URL(); // fail fast if the environment points these at a non-Google, non-loopback host
  if (o.auth) return auth(o.storeToken);
  if (o.whoami) { const c = await currentChannel(); console.log(`This token uploads to: ${c.title} (@${c.handle}) id ${c.id}`); return; }
  if (o.upload && !o.ids) throw new Error('BLOCKED: --upload needs an explicit --ids (for example --ids ep15)');
  if (o.upload && !o.expectChannel) throw new Error('BLOCKED: --upload needs --expect-channel @handle (run --whoami to see which channel the token uses)');
  const films = expandIds(o.ids).map((id) => buildFilm(id, o));
  let bad = 0, units = 0;
  console.log(`${o.upload ? 'UPLOAD' : 'DRY RUN'} | privacy=${o.privacy} | films=${films.length} | playlist=${o.playlist} captions=${o.captions}`);
  for (const f of films) {
    const u = plannedUnits(f, o); units += u;
    console.log(`${f.id.padEnd(6)} title ${[...(f.title ?? '')].length}c | desc ${Buffer.byteLength(f.description ?? '')}B | tags ${f.tags.length}${f.tagsDropped.length ? ` (dropped ${f.tagsDropped.length} to fit 500)` : ''} | ~${u} units${f.violations.length ? ` | PROBLEMS: ${f.violations.join('; ')}` : ''}${f.notes.length ? ` | NOTE: ${f.notes.join('; ')}` : ''}`);
    if (f.violations.length) bad++;
  }
  console.log(`Planned quota (excluding the separate videos.insert bucket of 100/day): ~${units} units against 10000/day${units > o.maxUnits ? `; this needs about ${Math.ceil(units / o.maxUnits)} days at --max-units ${o.maxUnits} (progress is saved, rerun to continue)` : ''}`);
  if (bad) { console.error(`${bad} film(s) have problems; fix them before uploading.`); process.exit(2); }
  if (!o.upload) { console.log('Dry run only. Nothing was sent. Add --upload to upload as private.'); return; }

  const ch = await currentChannel();
  if (ch.handle !== o.expectChannel.replace(/^@/, '').toLowerCase()) throw new Error(`BLOCKED: token belongs to "${ch.title}" (@${ch.handle}), expected ${o.expectChannel}. Nothing was uploaded. Run --auth again and pick the right channel account.`);
  const state = loadState();
  if (state.channelId && state.channelId !== ch.id) throw new Error(`BLOCKED: the state file records uploads to a different channel (${state.channelId}). Move or delete it, then rerun.`);
  state.channelId = ch.id; saveState(state);
  console.log(`Channel: ${ch.title} (@${ch.handle})`);
  state.films ??= {};
  let used = 0;
  const budget = (n) => { if (used + n > o.maxUnits) { console.log(`Quota budget ${o.maxUnits} reached; rerun later to continue. Progress is saved.`); saveState(state); process.exit(0); } used += n; };
  for (const f of films) {
    const s = (state.films[f.id] ??= {});
    const size = fs.statSync(path.join(ROOT, f.file)).size;
    if (!s.videoId) {
      if (!s.session) { s.session = await startSession(f, o, size); saveState(state); }
      let res = await putFile(s.session, path.join(ROOT, f.file), size);
      if (res.expired) { s.session = await startSession(f, o, size); saveState(state); res = await putFile(s.session, path.join(ROOT, f.file), size); }
      if (!res.id) throw new Error(`${f.id}: upload finished without a video id`);
      s.videoId = res.id; s.title = f.title; delete s.session; saveState(state);
      console.log(`${f.id} uploaded (${o.privacy}): https://youtu.be/${s.videoId}`);
    } else console.log(`${f.id} already uploaded: https://youtu.be/${s.videoId}`);
    if (o.retitle && s.title !== f.title) { budget(50); await updateSnippet(s.videoId, f, o); s.title = f.title; saveState(state); console.log(`${f.id} title updated: ${f.title}`); }
    if (f.thumb && !s.thumbnail) { budget(50); await setThumbnail(s.videoId, path.join(ROOT, f.thumb)); s.thumbnail = true; saveState(state); }
    if (o.playlist && !s.playlistItemId) { budget(50); const pid = await ensurePlaylist(state, o); s.playlistItemId = await addToPlaylist(pid, s.videoId); saveState(state); }
    if (o.captions && f.captions && !s.captions) { budget(400); await uploadCaptions(s.videoId, path.join(ROOT, f.captions)); s.captions = true; saveState(state); }
  }
  console.log('\nDone. Review each video in YouTube Studio before changing visibility.');
  for (const f of films.filter((x) => x.pinned)) console.log(`\nPinned comment for ${f.id} (paste and pin by hand; the API cannot pin):\n${f.pinned}`);
}

const norm = (p) => { const r = fs.realpathSync(path.resolve(p)); return process.platform === 'win32' ? r.toLowerCase() : r; };
if (process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url))) main().catch((e) => { console.error(e.message); process.exit(1); });
