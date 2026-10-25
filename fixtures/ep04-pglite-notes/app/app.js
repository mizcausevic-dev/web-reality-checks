// app.js — browser notes app over PGlite with an IndexedDB-backed data directory.
//
// PGlite is imported from a LOCAL copy of the package's dist files (app/vendor/pglite/,
// produced by ../build-vendor.mjs). No CDN. The engine fetches pglite.wasm, pglite.data and
// initdb.wasm relative to that module URL, so they are same-origin too and the service worker
// can precache them.
//
// BROWSER-ONLY: `idb://video-notes` persists through IndexedDB. This file was not executed in
// the Node-only build environment; follow ../browser-test-checklist.md to verify it.
import {PGlite} from './vendor/pglite/index.js';
import {NotesDb} from './notes-db.mjs';

const DATA_DIR = 'idb://video-notes';
const $ = (id) => document.getElementById(id);
const logEl = $('log');
const log = (...a) => { const line = `${new Date().toISOString().slice(11, 19)} ${a.join(' ')}`; console.log('[notes]', ...a); logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 4000); };
const setStatus = (id, text, cls = '') => { const el = $(id); el.textContent = text; el.className = cls; };

// --- network + service worker status -------------------------------------------------------
const paintOnline = () => setStatus('st-online', navigator.onLine ? 'online' : 'offline', navigator.onLine ? 'ok' : 'warn');
paintOnline();
addEventListener('online', paintOnline);
addEventListener('offline', paintOnline);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const sw = reg.installing || reg.waiting || reg.active;
    const paint = () => setStatus('st-sw', sw ? sw.state : 'registered', sw && sw.state === 'activated' ? 'ok' : 'warn');
    paint();
    sw && sw.addEventListener('statechange', paint);
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'precached') { log(`service worker precached ${e.data.count} assets (${e.data.version})`); setStatus('st-sw', `activated · ${e.data.count} assets cached`, 'ok'); } });
    log('service worker registered');
  }).catch((e) => { setStatus('st-sw', 'failed', 'bad'); log('service worker registration failed:', e.message); });
} else {
  setStatus('st-sw', 'unsupported', 'bad');
}

// --- database -------------------------------------------------------------------------------
let db;
const render = async (term = '') => {
  const rows = term ? await db.search(term) : await db.list();
  setStatus('st-count', String(await db.count()));
  const ul = $('notes');
  ul.innerHTML = '';
  if (!rows.length) { const li = document.createElement('li'); li.innerHTML = `<p>${term ? 'No notes match.' : 'No notes yet in this browser profile.'}</p>`; ul.appendChild(li); return; }
  for (const r of rows) {
    const li = document.createElement('li');
    const h = document.createElement('h3'); h.textContent = r.title;
    const p = document.createElement('p'); p.textContent = r.body;
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `id ${r.id} · updated ${new Date(r.updated_at).toLocaleString()}`;
    const row = document.createElement('div'); row.className = 'row';
    const edit = document.createElement('button'); edit.className = 'secondary'; edit.type = 'button'; edit.textContent = 'Edit';
    edit.onclick = async () => {
      const title = prompt('Title', r.title); if (title === null) return;
      const body = prompt('Body', r.body); if (body === null) return;
      const u = await db.edit(r.id, {title, body});
      log(`edit id ${r.id} → ${u ? 'ok' : 'not found'}`);
      await render($('q').value.trim());
    };
    const del = document.createElement('button'); del.className = 'danger'; del.type = 'button'; del.textContent = 'Delete';
    del.onclick = async () => { const ok = await db.remove(r.id); log(`delete id ${r.id} → ${ok}`); await render($('q').value.trim()); };
    row.append(edit, del);
    li.append(h, p, meta, row);
    ul.appendChild(li);
  }
};

try {
  const t0 = performance.now();
  log(`opening ${DATA_DIR} …`);
  db = await new NotesDb(DATA_DIR, {PGlite}).ready; // relaxedDurability deliberately left at its default (false)
  const v = (await db.pg.query('select version()')).rows[0].version;
  setStatus('st-engine', `${v.split(' on ')[0]} · ready in ${Math.round(performance.now() - t0)} ms`, 'ok');
  log(`ready: ${v.split(' on ')[0]}, fs=${db.kind}, persistent=${db.persistent}`);
  $('create-btn').disabled = false;
  await render();
} catch (e) {
  setStatus('st-engine', `failed: ${e.message}`, 'bad');
  log('database failed to start:', e.message);
  throw e;
}

$('create').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const title = $('title').value.trim(); const body = $('body').value;
  if (!title) return;
  const n = await db.create(title, body); // awaited: the write has completed before we report it
  log(`create → id ${n.id}`);
  $('title').value = ''; $('body').value = '';
  await render($('q').value.trim());
});
$('q').addEventListener('input', () => render($('q').value.trim()));
$('clear-q').addEventListener('click', () => { $('q').value = ''; render(); });
