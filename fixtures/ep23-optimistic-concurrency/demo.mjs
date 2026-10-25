// Runs the scenario shown in the video and writes evidence.json (actual outputs).
// "Two tabs" = two INDEPENDENT client instances in Node (own session cookie, own local copy). No real browser.
//   A  flawed:    both load v1; A saves title; B saves whole stale doc            -> A's change disappears
//   B  corrected: same steps with expectedVersion                                -> A 200 (v2), B 409
//   C  explicit resolution by a person (not an automatic merge)                  -> B saves against v2 -> v3
//   D  coordinated concurrent save (barrier), same expectedVersion               -> exactly one accepted
//   E  database lock (second connection, 50 ms busy timeout)                     -> 503, not 409
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {startFixture} from './server.mjs';
import {EditorClient} from './client.mjs';

const F = await startFixture();
const view = (d) => ({title: d.title, body: d.body, version: d.version});
const A_TITLE = 'Launch plan (approved)';
const B_BODY = 'Draft: audience, schedule, budget.';
const twoTabs = async (base = F.base) => {
  const a = await new EditorClient(base, 'Tab A').login('alice'); const b = await new EditorClient(base, 'Tab B').login('alice');
  await a.load('doc_1'); await b.load('doc_1');
  return {a, b};
};
const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  clients: 'two independent client instances in Node (separate session cookies and local copies). No real browser was used.',
  initial: view(F.db.getDoc('doc_1')),
  scenarios: {},
};

// A — flawed
{
  F.db.reset(); F.requests.length = 0;
  const {a, b} = await twoTabs();
  const loaded = {A: {version: a.baseVersion, ...a.local}, B: {version: b.baseVersion, ...b.local}};
  a.edit({title: A_TITLE}); const ra = await a.save({vuln: true});
  const afterA = view(F.db.getDoc('doc_1'));
  b.edit({body: B_BODY});
  const localB = {...b.local};
  const rb = await b.save({vuln: true});
  evidence.scenarios.flawed_unconditional = {
    endpoint: 'PUT /vuln/docs/doc_1', bothLoaded: loaded,
    aSaves: {changed: 'title', status: ra.status, serverAfter: afterA},
    bLocalCopy: localB, bSaves: {changed: 'body (sends the whole stale document)', status: rb.status},
    final: view(F.db.getDoc('doc_1')),
    lostUpdate: F.db.getDoc('doc_1').title !== A_TITLE,
  };
}

// B — corrected, then C — explicit resolution
{
  F.db.reset(); F.requests.length = 0;
  const {a, b} = await twoTabs();
  a.edit({title: A_TITLE}); const ra = await a.save();
  b.edit({body: B_BODY}); const rb = await b.save();
  evidence.scenarios.corrected_conditional = {
    endpoint: 'PUT /docs/doc_1', statement: 'UPDATE docs SET title=?, body=?, version=version+1, updated_by=? WHERE id=? AND version=?',
    aSaves: {expectedVersion: 1, status: ra.status, newVersion: ra.body.version},
    bSaves: {expectedVersion: 1, status: rb.status, error: rb.body.error, currentVersion: rb.body.currentVersion, currentOnServer: {title: rb.body.current.title, body: rb.body.current.body}},
    bClientAfterConflict: {state: b.state, unsavedLocalCopyPreserved: {...b.local}, putRequestsSent: b.sent.length},
    serverFinal: view(F.db.getDoc('doc_1')),
    putStatusesSeenByServer: F.requests.filter((r) => r.method === 'PUT').map((r) => r.status),
  };
  let refused = null;
  try { await b.save(); } catch (e) { refused = e.message; }
  const {server, yours} = b.conflict;
  b.resolve('merged', {title: server.title, body: yours.body}); // human-chosen content: A's title + B's body
  const rc = await b.save();
  evidence.scenarios.explicit_resolution = {
    note: 'The merged content was chosen by the person (A title + B body). The fixture does not merge automatically.',
    saveWhileConflictedRefusedByClient: refused,
    resolvedBaseVersion: 2, saveStatus: rc.status, newVersion: rc.body.version,
    serverFinal: view(F.db.getDoc('doc_1')),
  };
}

// D — coordinated concurrent save (HTTP, barrier)
{
  F.db.reset(); F.requests.length = 0; F.stats.maxInFlightPuts = 0;
  const {a, b} = await twoTabs();
  a.edit({title: 'title from A'}); b.edit({body: 'body from B'});
  let release; const gate = new Promise((r) => { release = r; }); let ready = 0;
  const fire = async (c) => { if (++ready === 2) release(); await gate; return c.save(); };
  const [ra, rb] = await Promise.all([fire(a), fire(b)]);
  evidence.scenarios.concurrent_same_expected_version = {
    expectedVersionSentByBoth: 1, statuses: {A: ra.status, B: rb.status}, accepted: [ra, rb].filter((r) => r.status === 200).length,
    maxPutRequestsInFlightTogether: F.stats.maxInFlightPuts, serverFinal: view(F.db.getDoc('doc_1')),
  };
}

// E — database lock vs version conflict
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ep23-demo-'));
  const file = path.join(dir, 'docs.db');
  const L = await startFixture({file, busyTimeoutMs: 50});
  const t = await new EditorClient(L.base, 'Tab T').login('alice'); await t.load('doc_1');
  t.edit({title: 'unsaved title'});
  const locker = new DatabaseSync(file); locker.exec('BEGIN IMMEDIATE');
  let r; try { r = await t.save(); } finally { locker.exec('ROLLBACK'); locker.close(); }
  evidence.scenarios.database_lock = {
    how: 'a second SQLite connection held BEGIN IMMEDIATE; the server connection used a 50 ms busy timeout',
    status: r.status, error: r.body.error, retryable: r.body.retryable, isVersionConflict: r.status === 409,
    clientState: t.state, unsavedTitlePreserved: t.local.title, loadedVersionKept: t.baseVersion, serverVersion: L.db.getDoc('doc_1').version,
  };
  await L.close(); fs.rmSync(dir, {recursive: true, force: true});
}

await F.close();
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence.scenarios, null, 2));
