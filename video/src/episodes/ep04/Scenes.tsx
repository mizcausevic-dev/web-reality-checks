import React from 'react';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------------------------------
 * EP04 — I Put a Database Inside a Website
 * Numbers shown come from fixtures/ep04-pglite-notes/evidence.json (Node run):
 *   note {id 1, "Groceries", "milk, eggs, coffee"}; search 'coffee' → 1; reopen same dir → 1;
 *   different dir → 0; memory:// reopen → 0; delete dir → 0; PostgreSQL 18.6 (PGlite 0.5.11).
 * Scenes 4–8 are browser steps that were NOT executed; they carry the illustrative sim tag and
 * never display a measured result.
 * ---------------------------------------------------------------------------------------- */

const EVID = {
  note: {id: 1, title: 'Groceries', body: 'milk, eggs, coffee'},
  edited: 'milk, eggs, coffee, bread',
  searchMatches: 1,
  reopenCount: 1,
  otherDirCount: 0,
  memoryCount: 0,
  clearedCount: 0,
  engine: 'PostgreSQL 18.6 (PGlite 0.5.11)',
  vendorMB: '~17 MB',
  precacheAssets: 19,
};

/* Browser boundary used by the browser-only scenes: app code, engine and storage inside; nothing outside. */
const BrowserFrame: React.FC<{o?: number; label?: string; accent?: string; children?: React.ReactNode}> = ({o = 1, label = 'Browser · origin http://127.0.0.1:8787 · profile A', accent = C.line, children}) => (
  <>
    <Box x={M} y={150} w={1180} h={720} accent={accent} o={o} fill="#12141a" dashed={false}>
      <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
        {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.55}} />)}
        <div style={{marginLeft: 16, color: C.dim, fontSize: 24, fontFamily: 'DejaVu Sans Mono'}}>{label}</div>
      </div>
    </Box>
    {children}
  </>
);

/* The three things inside the browser: app code, engine, storage. */
const Inside: React.FC<{t: number; storage?: string; storageColor?: string; engineColor?: string; o?: number}> = ({t, storage = 'IndexedDB · idb://video-notes', storageColor = C.cyan, engineColor = C.cyan, o = 1}) => (
  <>
    <Box x={M + 40} y={240} w={330} h={120} title="app.js" sub="notes UI · SQL calls" accent={C.mute} o={o * ep(t, 0, 0.4)} titleSize={28} />
    <Box x={M + 430} y={240} w={330} h={120} title="PGlite engine" sub="Postgres · WebAssembly" accent={engineColor} o={o * ep(t, 0.2, 0.6)} titleSize={28} />
    <Box x={M + 820} y={240} w={320} h={120} title="Storage" sub={storage} accent={storageColor} o={o * ep(t, 0.4, 0.8)} titleSize={28} />
  </>
);

/* Right-hand "remote" column: there is no server, and the diagram says so. */
const NoRemote: React.FC<{t: number; at?: number}> = ({t, at = 1.2}) => (
  <>
    <Box x={1330} y={150} w={494} h={720} accent={C.mute} dashed o={ep(t, at, at + 0.5)} fill="transparent">
      <div style={{fontSize: 24, color: C.mute, letterSpacing: 3, fontWeight: 700}}>REMOTE</div>
      <div style={{fontSize: 28, color: C.dim, marginTop: 220, textAlign: 'center'}}>No server.<br />No sync.<br />No backup.</div>
    </Box>
    <Svg>
      <Arrow x1={1276} y1={510} x2={1330} y2={510} p={ep(t, at + 0.3, at + 0.8)} color={C.mute} dashed />
      <line x1={1290} y1={480} x2={1318} y2={540} stroke={C.red} strokeWidth={6} opacity={ep(t, at + 0.8, at + 1.1)} strokeLinecap="round" />
      <line x1={1318} y1={480} x2={1290} y2={540} stroke={C.red} strokeWidth={6} opacity={ep(t, at + 0.8, at + 1.1)} strokeLinecap="round" />
    </Svg>
  </>
);

/* 1. Create a note and query it — Node run, real result */
const Create: React.FC<SceneProps> = ({t}) => {
  const ins = ep(t, 0.4, 1.2);
  const q = ep(t, 1.8, 2.6);
  const res = ep(t, 2.8, 3.4);
  return (
    <>
      <Overline y={110}>Create, then query</Overline>
      <Code x={M} y={170} w={880} title="app code → engine" size={26} hi={[res > 0.5 ? 3 : 0]} hiColor={C.green} lines={[
        "INSERT INTO notes (title, body)",
        "VALUES ('Groceries', 'milk, eggs, coffee');",
        "SELECT * FROM notes",
        "WHERE body ILIKE '%coffee%';",
      ]} />
      <Box x={1040} y={170} w={784} h={120} title="PGlite engine" sub={EVID.engine} accent={C.cyan} titleSize={28} glow={q > 0.9 && res < 0.5} />
      <Box x={1040} y={330} w={784} h={190} title="notes" accent={res > 0.5 ? C.green : C.line} titleSize={24}>
        <div style={{marginTop: 14, display: 'flex', gap: 18, alignItems: 'baseline', opacity: ins}}>
          <span style={{padding: '6px 14px', borderRadius: 10, background: C.cyanDim, color: C.text, fontFamily: 'DejaVu Sans Mono', fontSize: 24, fontWeight: 700}}>id {EVID.note.id}</span>
          <div style={{fontSize: 30, fontWeight: 700}}>{EVID.note.title}</div>
          <div style={{fontSize: 26, color: C.dim}}>{EVID.note.body}</div>
        </div>
      </Box>
      <Svg>
        <Arrow x1={980} y1={260} x2={1040} y2={230} p={Math.max(ins, q)} color={C.cyan} />
        <Arrow x1={1430} y1={290} x2={1430} y2={330} p={ins} color={C.cyan} label="write" />
        <Arrow x1={1600} y1={330} x2={1600} y2={290} p={res} color={C.green} label="1 row" />
      </Svg>
      <Token x1={900} y1={240} x2={1040} y2={210} p={q} text="SELECT … ILIKE '%coffee%'" color={C.cyan} o={q > 0 && q < 1 ? 1 : 0} />
      <Badge x={M} y={420} label="search 'coffee'" value={`${EVID.searchMatches} match`} color={C.green} big o={res} />
      <Big x={M} y={560} w={1000} size={64} o={ep(t, 3.6, 4.2)}>No server was involved.</Big>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.4, 5)}>Observed from the local fixture (Node): create → id 1 · search 'coffee' → 1 match</Txt>
    </>
  );
};

/* 2. Reveal the engine inside the page */
const Engine: React.FC<SceneProps> = ({t}) => {
  const grow = ep(t, 0.3, 1.4);
  return (
    <>
      <Overline y={110}>The engine, as an asset</Overline>
      <BrowserFrame o={1} label="Browser (illustrative) — or Node, for this run">
        <Inside t={t} storage="a data directory" storageColor={C.amber} />
        <Txt x={M + 40} y={400} w={1100} size={30} color={C.text} o={ep(t, 1, 1.5)}>PGlite = Postgres compiled to WebAssembly. Loaded like an image or a script, from the same origin:</Txt>
        <Code x={M + 40} y={470} w={1100} size={26} title="app/vendor/pglite (local copy, no CDN)" lines={[
          'index.js + chunks      ESM client',
          'pglite.wasm            ~10 MB  engine',
          'pglite.data            ~6 MB   share dir',
          'initdb.wasm            ~0.4 MB first-run init',
        ]} hi={[1, 2]} hiColor={C.cyan} />
        <div style={{position: 'absolute', left: M + 40, top: 760, width: 1100 * grow, height: 14, borderRadius: 7, background: C.cyan, opacity: 0.8}} />
        <Txt x={M + 40} y={786} w={1100} size={24} color={C.dim} o={ep(t, 1.6, 2)}>{EVID.vendorMB} of engine files served from the app's own origin, listed in the precache manifest</Txt>
      </BrowserFrame>
      <NoRemote t={t} at={2.2} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 3.2, 3.8)}>Executed here under Node against a filesystem directory; the browser run is illustrated in the next scenes.</Txt>
    </>
  );
};

/* 3. Working memory vs persistence */
const MemoryVsDisk: React.FC<SceneProps> = ({t}) => {
  const write = ep(t, 0.6, 1.4);
  const closeMem = step(t, 2.2);
  const reopenMem = ep(t, 3.0, 3.5);
  const reopenFs = ep(t, 3.8, 4.3);
  return (
    <>
      <Overline y={110}>Two places</Overline>
      <Box x={M} y={170} w={800} h={160} title="Engine working memory" sub="query execution, buffers — gone when the engine closes" accent={C.amber} titleSize={30} />
      <Box x={1024} y={170} w={800} h={160} title="Data directory" sub="written through after each query" accent={C.cyan} titleSize={30} />
      <Svg>
        <Arrow x1={896} y1={250} x2={1024} y2={250} p={write} color={C.cyan} label="write-through" />
      </Svg>
      <Token x1={700} y1={226} x2={1100} y2={226} p={write} text="Groceries" color={C.cyan} o={write > 0 && write < 1 ? 1 : 0} />

      <Txt x={M} y={380} w={800} size={24} color={C.mute} weight={700}>memory://</Txt>
      <Log x={M} y={420} w={800} size={24} title="node fixture · memory data dir" shown={1 + closeMem * 2 + reopenMem} lines={[
        {t: 'create "Groceries"        count 1', c: C.text},
        {t: 'close()', c: C.mute},
        {t: 'reopen memory://', c: C.mute},
        {t: `list                      count ${EVID.memoryCount}   ← lost`, c: C.red},
      ]} />

      <Txt x={1024} y={380} w={800} size={24} color={C.cyan} weight={700}>filesystem dir (Node) · idb:// (browser)</Txt>
      <Log x={1024} y={420} w={800} size={24} title="node fixture · filesystem data dir" shown={1 + closeMem * 2 + reopenFs} lines={[
        {t: 'create "Groceries"        count 1', c: C.text},
        {t: 'close()', c: C.mute},
        {t: 'reopen same dir', c: C.mute},
        {t: `list                      count ${EVID.reopenCount}   ← kept`, c: C.green},
      ]} />

      <Box x={M} y={700} w={W - 2 * M} h={100} accent={C.amber} dashed fill="transparent" o={ep(t, 4.6, 5.1)}>
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE </span>relaxedDurability is left at its default (off) and the fixture refuses it. Each write is awaited before the app reports it.</div>
      </Box>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.2, 5.7)}>Observed from the local fixture (Node): memory:// reopen → 0 · same filesystem dir reopen → 1</Txt>
    </>
  );
};

/* 4. Reload under the same origin + profile — NOT EXECUTED HERE */
const Reload: React.FC<SceneProps> = ({t}) => {
  const spin = prog(t, 1.4, 2.4);
  const back = ep(t, 2.6, 3.2);
  return (
    <>
      <Overline y={110} color={C.amber}>Reload · same origin, same profile</Overline>
      <BrowserFrame>
        <Inside t={t} />
        <Box x={M + 40} y={420} w={1100} h={110} accent={spin > 0 && spin < 1 ? C.amber : C.line} titleSize={26} title={spin > 0 && spin < 1 ? 'reloading…' : 'notes'} sub={spin >= 1 ? `id 1 · Groceries · milk, eggs, coffee  (expected: still present)` : spin === 0 ? 'id 1 · Groceries · milk, eggs, coffee' : ' '} />
        <Svg>
          <Arrow x1={M + 980} y1={360} x2={M + 980} y2={420} p={back} color={C.cyan} label="read back from IndexedDB" />
        </Svg>
        <Txt x={M + 40} y={580} w={1100} size={28} color={C.text} o={ep(t, 3.4, 3.9)}>IndexedDB is keyed by <b>origin</b> (scheme + host + port) and lives in <b>this browser profile</b>.</Txt>
        <Txt x={M + 40} y={660} w={1100} size={26} color={C.dim} o={ep(t, 4, 4.5)}>Same origin + same profile → the note should be read back. Different port, different profile, different device → a different store.</Txt>
      </BrowserFrame>
      <NoRemote t={t} at={0.8} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 0.2, 0.7)}>Not executed in this environment (no browser). Expected behaviour; see browser-test-checklist.md step 2.</Txt>
    </>
  );
};

/* 5. Service worker precache, then go offline — NOT EXECUTED HERE */
const Offline: React.FC<SceneProps> = ({t}) => {
  const fill = prog(t, 0.8, 3.6);
  const assets = ['index.html', 'app.js', 'notes-db.mjs', 'vendor/…/index.js', 'chunks ×7', 'fs/*.js ×3', 'pglite.wasm', 'pglite.data', 'initdb.wasm'];
  const done = Math.floor(fill * assets.length);
  const off = step(t, 4.2);
  return (
    <>
      <Overline y={110} color={C.amber}>Offline is a separate job</Overline>
      <BrowserFrame>
        <Box x={M + 40} y={240} w={520} h={560} title="Service worker" sub={`cache: ep04-notes-v0.5.11-<hash>`} accent={C.cyan} titleSize={28}>
          <div style={{marginTop: 16}}>
            {assets.map((a, i) => (
              <div key={a} style={{display: 'flex', gap: 14, alignItems: 'center', fontSize: 24, padding: '5px 0', color: i < done ? C.text : C.mute, fontFamily: 'DejaVu Sans Mono'}}>
                <span style={{color: i < done ? C.green : C.mute, width: 28}}>{i < done ? '✓' : '·'}</span>{a}
              </div>
            ))}
          </div>
        </Box>
        <Svg>
          <Arrow x1={M + 560} y1={400} x2={M + 660} y2={400} p={fill} color={C.cyan} label="precache (addAll)" />
        </Svg>
        <Box x={M + 660} y={240} w={480} h={200} title="Same origin" sub="every file served by the app itself — no CDN" accent={C.cyan} titleSize={28} />
        <Box x={M + 660} y={470} w={480} h={150} title="Cache first" sub="same-origin GET → cache, else network" accent={C.mute} titleSize={28} o={ep(t, 2, 2.5)} />
        <Badge x={M + 660} y={660} label="network" value={off ? 'offline' : 'online'} color={off ? C.amber : C.green} big />
        <Txt x={M + 660} y={740} w={480} size={24} color={C.amber} o={off}>Only after all {EVID.precacheAssets} assets are cached.</Txt>
      </BrowserFrame>
      <NoRemote t={t} at={0.6} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 0.2, 0.7)}>Not executed in this environment (no browser). The precache list is real; the install was not run.</Txt>
    </>
  );
};

/* 6. Offline reload + edit — NOT EXECUTED HERE; honest about failure */
const OfflineEdit: React.FC<SceneProps> = ({t}) => {
  const load = ep(t, 0.6, 1.6);
  const edit = ep(t, 2.2, 3.0);
  const write = ep(t, 3.2, 3.9);
  return (
    <>
      <Overline y={110} color={C.amber}>Offline reload, then edit</Overline>
      <BrowserFrame>
        <Badge x={M + 40} y={240} label="network" value="offline" color={C.amber} big />
        <Box x={M + 40} y={330} w={520} h={120} title="Service worker" sub="serves shell + engine from cache" accent={C.cyan} titleSize={28} o={load} />
        <Box x={M + 620} y={330} w={520} h={120} title="PGlite engine" sub="starts from cached wasm/data" accent={C.cyan} titleSize={28} o={load} />
        <Box x={M + 40} y={500} w={1100} h={110} accent={edit > 0.5 ? C.cyan : C.line} titleSize={26} title="id 1 · Groceries" sub={edit > 0.5 ? EVID.edited : EVID.note.body} />
        <Box x={M + 620} y={660} w={520} h={120} title="Storage" sub="IndexedDB · idb://video-notes" accent={write > 0.9 ? C.green : C.cyan} titleSize={28} />
        <Svg>
          <Arrow x1={M + 880} y1={610} x2={M + 880} y2={660} p={write} color={C.cyan} label="UPDATE … awaited" />
        </Svg>
        <Txt x={M + 40} y={680} w={520} size={24} color={C.red} o={ep(t, 4.2, 4.7)}>If the page is blank, the engine fails to start, or the edit does not survive a second offline reload: that is the result. Report it.</Txt>
      </BrowserFrame>
      <NoRemote t={t} at={0.6} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 0.2, 0.7)}>Not executed in this environment (no browser). Expected behaviour; checklist step 3. Not a recorded pass.</Txt>
    </>
  );
};

/* 7. Clean profile — NOT EXECUTED HERE; Node analogue is measured */
const CleanProfile: React.FC<SceneProps> = ({t}) => {
  const open = ep(t, 0.6, 1.4);
  return (
    <>
      <Overline y={110} color={C.amber}>A clean browser profile</Overline>
      <Box x={M} y={170} w={820} h={330} accent={C.line} fill="#12141a" title="Profile A · http://127.0.0.1:8787" titleSize={26}>
        <div style={{marginTop: 20}}>
          <Box x={30} y={80} w={360} h={100} title="Storage" sub="idb://video-notes" accent={C.cyan} titleSize={26} />
          <Box x={420} y={80} w={360} h={100} title="notes" sub="id 1 · Groceries" accent={C.green} titleSize={26} />
        </div>
      </Box>
      <Box x={1004} y={170} w={820} h={330} accent={C.amber} fill="#12141a" title="Profile B (clean) · same address" titleSize={26} o={open}>
        <div style={{marginTop: 20}}>
          <Box x={30} y={80} w={360} h={100} title="Storage" sub="idb://video-notes (empty)" accent={C.amber} titleSize={26} />
          <Box x={420} y={80} w={360} h={100} title="notes" sub="none — expected 0" accent={C.amber} titleSize={26} />
        </div>
      </Box>
      <Svg>
        <Arrow x1={916} y1={335} x2={1004} y2={335} p={ep(t, 1.8, 2.4)} color={C.mute} dashed />
        <line x1={940} y1={305} x2={980} y2={365} stroke={C.red} strokeWidth={6} opacity={ep(t, 2.4, 2.8)} strokeLinecap="round" />
        <line x1={980} y1={305} x2={940} y2={365} stroke={C.red} strokeWidth={6} opacity={ep(t, 2.4, 2.8)} strokeLinecap="round" />
      </Svg>
      <Txt x={M} y={540} w={W - 2 * M} size={30} color={C.text} o={ep(t, 2.8, 3.3)}>Nothing synchronised the note, because nothing exists to synchronise it. Each profile has its own IndexedDB.</Txt>
      <Log x={M} y={620} w={W - 2 * M} size={24} title="Executed · node fixture analogue" shown={prog(t, 3.4, 4.4) * 3} lines={[
        {t: 'open data dir A   → list   count 1   (Groceries)', c: C.green},
        {t: `open data dir B   → list   count ${EVID.otherDirCount}`, c: C.amber},
        {t: 'two data directories, no shared state', c: C.mute},
      ]} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 0.2, 0.7)}>Browser step not executed here (checklist step 4). The Node analogue above was executed: different dir → 0.</Txt>
    </>
  );
};

/* 8. Clear site data — NOT EXECUTED HERE; Node analogue is measured */
const ClearData: React.FC<SceneProps> = ({t}) => {
  const wipe = ep(t, 1.2, 2.2);
  const gone = step(t, 2.4);
  return (
    <>
      <Overline y={110} color={C.red}>Clear site data</Overline>
      <BrowserFrame accent={gone ? C.red : C.line}>
        <Box x={M + 40} y={240} w={330} h={120} title="app.js" sub="still served (re-fetched)" accent={C.mute} titleSize={28} />
        <Box x={M + 430} y={240} w={330} h={120} title="Cache Storage" sub={gone ? 'deleted' : `${EVID.precacheAssets} assets`} accent={gone ? C.red : C.cyan} titleSize={28} o={1 - 0.5 * wipe} />
        <Box x={M + 820} y={240} w={320} h={120} title="IndexedDB" sub={gone ? 'deleted' : 'idb://video-notes'} accent={gone ? C.red : C.cyan} titleSize={28} o={1 - 0.5 * wipe} />
        <Box x={M + 40} y={420} w={1100} h={110} accent={gone ? C.red : C.line} titleSize={26} title={gone ? 'notes · expected 0' : 'notes · 1'} sub={gone ? 'the stored note is gone; this app has no copy anywhere else' : 'id 1 · Groceries · milk, eggs, coffee, bread'} />
        <Pill x={M + 40} y={600} text="Clear site data  (IndexedDB · Cache Storage · service workers)" color={C.red} o={ep(t, 0.6, 1.2)} size={26} />
        <Txt x={M + 40} y={680} w={1100} size={28} color={C.text} o={ep(t, 2.8, 3.3)}>The browser owns this storage. The user, quota pressure, or a privacy setting can remove it. No permanence is promised.</Txt>
      </BrowserFrame>
      <Log x={1330} y={150} w={494} size={24} title="Executed · node analogue" shown={prog(t, 3.4, 4.4) * 3} lines={[
        {t: 'reopen A    count 1', c: C.green},
        {t: 'rm -rf A', c: C.red},
        {t: `reopen A    count ${EVID.clearedCount}`, c: C.red},
      ]} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 0.2, 0.7)}>Browser step not executed here (checklist step 5). Node analogue executed: delete the data dir → 0.</Txt>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>Local persistence is not cloud sync —<br />or a backup.</Big>
    <Txt x={M} y={580} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>One origin. One browser profile. One device. Until the browser decides otherwise.</Txt>
    <Txt x={M} y={660} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Node + PGlite 0.5.11 results were executed locally. Browser steps (IndexedDB, offline, profiles, clearing data) were not executed here and are illustrative. No universal browser-compatibility claim is made.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  create: Create,
  engine: Engine,
  memory_vs_disk: MemoryVsDisk,
  reload: Reload,
  offline: Offline,
  offline_edit: OfflineEdit,
  clean_profile: CleanProfile,
  clear_data: ClearData,
  end: End,
};
