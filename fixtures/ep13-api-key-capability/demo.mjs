// Runs the exact scenario shown in the video and writes evidence.json (actual outputs).
// Scene order: inspect flawed bundle → ask what each value does (upstream capability tests) →
// corrected architecture (unauthenticated / unauthorised / authorised / over-broad op) → inspect corrected bundle.
import fs from 'node:fs';
import path from 'node:path';
import {upstream, listenUpstream, PUBLIC_PROJECT_ID, SERVER_SECRET_TOKEN, state as upState} from './upstream.mjs';
import {createBackend, listenBackend} from './backend.mjs';
import {scanDir, controlRun} from './inspect-artifacts.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const UP = `http://127.0.0.1:${await listenUpstream()}`;
const backend = createBackend(UP);
const BE = `http://127.0.0.1:${await listenBackend(backend)}`;
const redact = (v) => v.slice(0, 10) + '…';

const log = [];
const call = async (label, url, init = {}) => {
  const r = await fetch(url, init);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  const entry = {label, target: url.startsWith(BE) ? 'backend' : 'upstream', request: `${init.method || 'GET'} ${new URL(url).pathname}`, status: r.status, body, secretInResponse: text.includes(SERVER_SECRET_TOKEN) || JSON.stringify([...r.headers.entries()]).includes(SERVER_SECRET_TOKEN)};
  log.push(entry);
  return entry;
};

// Scene 1 — inspect the flawed bundle
const flawed = controlRun();
log.push({label: 'inspect flawed bundle', scan: {dir: 'bundle-flawed', filesScanned: flawed.filesScanned, secretLike: flawed.secretLike, identifierLike: flawed.identifierLike, findings: flawed.findings.map((f) => ({file: f.file, line: f.line, kind: f.kind, valueRedacted: f.valueRedacted}))}});

// Scene 3/4 — what can each value actually do at the upstream?
const priv = (bearer, operation = 'rotate_webhook') => ({method: 'POST', headers: {'content-type': 'application/json', ...(bearer ? {authorization: `Bearer ${bearer}`} : {})}, body: JSON.stringify({operation, projectId: PUBLIC_PROJECT_ID})});
await call('public id → GET public info', `${UP}/public/${PUBLIC_PROJECT_ID}`);
await call('public id presented as bearer → privileged op', `${UP}/privileged`, priv(PUBLIC_PROJECT_ID));
await call('no credential → privileged op', `${UP}/privileged`, priv(null));
await call('CONTROL: synthetic secret → privileged op', `${UP}/privileged`, priv(SERVER_SECRET_TOKEN));
await call('CONTROL: synthetic secret → delete_project (upstream would allow it)', `${UP}/privileged`, priv(SERVER_SECRET_TOKEN, 'delete_project'));

// Scene 5–7 — corrected architecture: browser → backend → upstream
const loginAs = async (u) => (await fetch(`${BE}/login/${u}`)).headers.get('set-cookie').split(';')[0];
const be = (cookie, body = {operation: 'rotate_webhook'}) => ({method: 'POST', headers: {'content-type': 'application/json', ...(cookie ? {cookie} : {})}, body: JSON.stringify(body)});
log.push({label: 'sessions', note: 'server-side sessions for u_vik (viewer) and u_mara (maintainer) established via test harness; cookies are opaque'});
const vik = await loginAs('vik');
const mara = await loginAs('mara');
await call('browser config payload', `${BE}/config`);
await call('unauthenticated → backend privileged', `${BE}/privileged`, be(null));
await call('vik (viewer) → backend privileged', `${BE}/privileged`, be(vik));
const attemptsBeforeMara = upState.privilegedAttempts;
await call('mara (maintainer) → backend privileged', `${BE}/privileged`, be(mara));
log.push({label: 'upstream calls made during mara request', count: upState.privilegedAttempts - attemptsBeforeMara, credentialUsedByBackend: redact(SERVER_SECRET_TOKEN), note: 'the backend presented its own credential; the browser never held it'});
await call('mara → backend privileged with over-broad operation delete_project', `${BE}/privileged`, be(mara, {operation: 'delete_project'}));

// Scene 8 — inspect the corrected bundle
const corrected = scanDir(path.join(here, 'bundle-corrected'));
log.push({label: 'inspect corrected bundle', scan: {dir: 'bundle-corrected', filesScanned: corrected.filesScanned, secretLike: corrected.secretLike, identifierLike: corrected.identifierLike, findings: corrected.findings.map((f) => ({file: f.file, line: f.line, kind: f.kind, valueRedacted: f.valueRedacted}))}, controlPassedFirst: flawed.passed});

const summary = {
  flawedBundle: {secretLike: flawed.secretLike, identifierLike: flawed.identifierLike, files: flawed.filesScanned},
  correctedBundle: {secretLike: corrected.secretLike, identifierLike: corrected.identifierLike, files: corrected.filesScanned},
  upstream: {publicIdAsBearer: log.find((l) => l.label.startsWith('public id presented')).status, noCredential: log.find((l) => l.label.startsWith('no credential')).status, secret: log.find((l) => l.label.startsWith('CONTROL: synthetic secret → privileged')).status},
  backend: {unauthenticated: log.find((l) => l.label.startsWith('unauthenticated')).status, viewer: log.find((l) => l.label.startsWith('vik')).status, maintainer: log.find((l) => l.label.startsWith('mara (maintainer)')).status, overBroadOperation: log.find((l) => l.label.includes('over-broad')).status, secretInAnyBackendResponse: log.filter((l) => l.target === 'backend').some((l) => l.secretInResponse), backendResponsesChecked: log.filter((l) => l.target === 'backend').length},
  values: {PUBLIC_PROJECT_ID, SERVER_SECRET_TOKEN_redacted: redact(SERVER_SECRET_TOKEN), note: 'both values are synthetic; the secret is printed in full only inside the fixture source, never in evidence or video'},
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify({generatedAt: new Date().toISOString(), base: 'http://127.0.0.1:<ephemeral>', summary, log}, null, 2));
console.table(log.filter((l) => l.status !== undefined).map((l) => ({label: l.label, status: l.status, secretInResponse: l.secretInResponse, body: typeof l.body === 'object' ? (l.body.error ?? l.body.operation ?? l.body.publicProjectId ?? l.body.projectId ?? '-') : String(l.body).slice(0, 30)})));
console.log('flawed bundle:', summary.flawedBundle, '\ncorrected bundle:', summary.correctedBundle);
backend.close(); upstream.close();
