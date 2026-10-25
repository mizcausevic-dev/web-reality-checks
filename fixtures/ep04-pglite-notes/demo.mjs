// demo.mjs — runs the scenario the video's NODE-EXECUTED scenes (1–3) show and writes evidence.json.
//
// What it does (all under Node, PGlite 0.5.11, filesystem data dir in a temp folder):
//   1. open data dir A, create a note, search for it            → scene 1
//   2. show which engine and filesystem type are in play           → scene 2/3
//   3. close, reopen the SAME data dir → the note is still there   → Node analogue of scene 4
//   4. open a DIFFERENT data dir → the note is absent               → Node analogue of scene 7
//   5. memory:// control: create, close, reopen → gone              → analogue of "working memory" in scene 3
//   6. delete the data dir → reopen → empty                        → Node analogue of scene 8
//
// What it does NOT do: anything with IndexedDB, service workers, offline mode or browser
// profiles. Those need a browser; see browser-test-checklist.md. evidence.json records
// them as "notExecuted" so the video cannot cite numbers for them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {NotesDb} from './notes-db.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('./node_modules/@electric-sql/pglite/package.json', import.meta.url), 'utf8'));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ep04-demo-'));
const dirA = path.join(tmpRoot, 'profile-a');
const dirB = path.join(tmpRoot, 'profile-b');
const steps = [];
const t0 = Date.now();
const rec = (label, data) => { steps.push({label, ms: Date.now() - t0, ...data}); console.log(`[${String(Date.now() - t0).padStart(6)} ms] ${label}`, JSON.stringify(data)); };
const open = async (dataDir) => { const s = Date.now(); const db = await new NotesDb(dataDir, {PGlite}).ready; return {db, openMs: Date.now() - s}; };
const pub = (r) => r && {id: r.id, title: r.title, body: r.body};

// 1. create + query
let {db, openMs} = await open(dirA);
rec('open data dir A (fresh, initdb runs)', {dataDir: 'A', kind: db.kind, openMs});
const note = await db.create('Groceries', 'milk, eggs, coffee');
rec('create note', {note: pub(note)});
const hits = await db.search('coffee');
rec("search 'coffee'", {matches: hits.length, rows: hits.map(pub)});
const pgv = (await db.pg.query('select version()')).rows[0].version;
rec('engine', {library: '@electric-sql/pglite', version: pkg.version, postgres: pgv.split(' on ')[0], fsType: db.kind, relaxedDurability: false});
await db.close();
rec('close A', {closed: db.pg.closed});

// 2. reopen same dir
({db, openMs} = await open(dirA));
let rows = await db.list();
rec('reopen data dir A → list', {openMs, count: rows.length, rows: rows.map(pub)});
const edited = await db.edit(note.id, {body: 'milk, eggs, coffee, bread'});
rec('edit note after reopen', {note: pub(edited)});
await db.close();

// 3. different dir
({db, openMs} = await open(dirB));
rows = await db.list();
rec('open DIFFERENT data dir B → list', {openMs, count: rows.length});
await db.close();

// 4. memory control
({db} = await open('memory://'));
await db.create('Ephemeral', 'working memory only');
rec('memory:// create', {kind: db.kind, count: await db.count()});
await db.close();
({db} = await open('memory://'));
rec('memory:// reopen after close → list', {count: await db.count()});
await db.close();

// 5. clear data → gone
({db} = await open(dirA));
rec('reopen A before clearing', {count: await db.count()});
await db.close();
fs.rmSync(dirA, {recursive: true, force: true});
({db} = await open(dirA));
rec('delete data dir A, reopen → list', {count: await db.count()});
await db.close();
fs.rmSync(tmpRoot, {recursive: true, force: true});

const evidence = {
  generatedAt: new Date().toISOString(),
  environment: {node: process.version, platform: process.platform, pglite: pkg.version, postgres: pgv.split(' on ')[0]},
  dataDirs: {A: 'filesystem temp dir (NodeFS)', B: 'second filesystem temp dir (NodeFS)', memory: 'memory://'},
  summary: {
    noteCreated: pub(note),
    searchMatches: hits.length,
    countAfterReopenSameDir: steps.find((s) => s.label.startsWith('reopen data dir A')).count,
    countInDifferentDir: steps.find((s) => s.label.startsWith('open DIFFERENT')).count,
    memoryCountAfterReopen: steps.find((s) => s.label.startsWith('memory:// reopen')).count,
    countAfterDeletingDataDir: steps.find((s) => s.label.startsWith('delete data dir')).count,
    relaxedDurability: false,
  },
  steps,
  notExecuted: [
    'idb://video-notes persistence in a real browser (IndexedDB) — needs a browser',
    'service worker precache and offline reload — needs a browser',
    'clean browser profile shows no notes — needs a browser',
    'clearing site data removes the stored notes — needs a browser',
  ],
  note: 'Filesystem temp dirs stand in for per-profile IndexedDB storage. The video labels scenes 4–8 as not executed here.',
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.log('\nevidence.json written:', JSON.stringify(evidence.summary));
