import React from 'react';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step, window as win} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Values copied from fixtures/ep12-sw-update/evidence.json (node demo.mjs). The lifecycle
 * trace there comes from the deterministic model, not a browser capture. */
const EV = {
  cacheV1: 'wrc-ep12-v1',
  cacheV2: 'wrc-ep12-v2',
  cachesAfterActivation: ['wrc-ep12-v2'],
  reloads: 1,
  secondControllerChange: 'ignored',
  swBytes: 2487,
  tests: {pass: 14, fail: 0},
};

/* Build colours. These are page-content colours (the fixture's blue/green interfaces), kept
 * distinct from the kit's semantic cyan/amber/red/green so meaning is not confused. */
const BLUE = '#2f6fe0';
const GREEN = C.green;

/* Layout */
const LX = {page: M, worker: 700, cache: 1300};
const BW = 480;

/** An obviously illustrative page frame showing a build label. */
const PageFrame: React.FC<{x: number; y: number; build: 1 | 2; o?: number; w?: number; h?: number; note?: string}> = ({x, y, build, o = 1, w = BW, h = 320, note}) => {
  const col = build === 1 ? BLUE : GREEN;
  return (
    <Box x={x} y={y} w={w} h={h} accent={C.line} o={o} fill="#14171e">
      <div style={{display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18}}>
        {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.5}} />)}
        <div style={{marginLeft: 12, color: C.mute, fontSize: 20, fontFamily: 'DejaVu Sans Mono'}}>http://127.0.0.1/ · open tab</div>
      </div>
      <div style={{display: 'inline-block', padding: '10px 26px', borderRadius: 12, background: col, color: '#fff', fontSize: 54, fontWeight: 800, letterSpacing: -1}}>Build {build}</div>
      <div style={{marginTop: 14, fontSize: 24, color: C.dim}}>{build === 1 ? 'Blue interface' : 'Green interface'}</div>
      {note && <div style={{marginTop: 10, fontSize: 22, color: C.amber}}>{note}</div>}
    </Box>
  );
};

/** Worker card with lifecycle state. */
const WorkerCard: React.FC<{x: number; y: number; build: 1 | 2; state: string; role: string; accent?: string; o?: number; glow?: boolean}> = ({x, y, build, state, role, accent = C.cyan, o = 1, glow = false}) => (
  <Box x={x} y={y} w={BW} h={140} accent={accent} o={o} glow={glow} title={`sw.js · Build ${build}`} titleSize={28}>
    <div style={{display: 'flex', gap: 14, marginTop: 10, alignItems: 'center'}}>
      <span style={{fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: accent, fontWeight: 700}}>{role}</span>
      <span style={{fontFamily: 'DejaVu Sans Mono', fontSize: 24, color: C.text}}>{state}</span>
    </div>
  </Box>
);

/** Cache Storage card listing versioned caches. */
const CacheCard: React.FC<{x: number; y: number; names: {n: string; o: number; dim?: boolean}[]; o?: number; h?: number}> = ({x, y, names, o = 1, h = 220}) => (
  <Box x={x} y={y} w={BW} h={h} accent={C.violet} o={o} title="Cache Storage" sub="not the HTTP cache" titleSize={28}>
    {names.map((c) => (
      <div key={c.n} style={{marginTop: 12, opacity: c.o, fontFamily: 'DejaVu Sans Mono', fontSize: 24, color: c.dim ? C.mute : C.text, textDecoration: c.dim ? 'line-through' : 'none'}}>▸ {c.n}</div>
    ))}
  </Box>
);

/* 1. Deployment complete, tab still Build 1 */
const Fail: React.FC<SceneProps> = ({t}) => {
  const o1 = ep(t, 0, 0.6);
  const o2 = ep(t, 1.0, 1.6);
  const reload = win(t, 3.2, 5.6);
  return (
    <>
      <Overline y={110}>Deployment finished</Overline>
      <Box x={M} y={180} w={700} h={330} accent={GREEN} o={o1} title="Server now serves" titleSize={28}>
        <div style={{marginTop: 18, display: 'inline-block', padding: '10px 26px', borderRadius: 12, background: GREEN, color: C.bg, fontSize: 54, fontWeight: 800}}>Build 2</div>
        <div style={{marginTop: 16, fontSize: 24, color: C.dim}}>/index.html, /app.js, /styles.css, /sw.js</div>
        <div style={{marginTop: 8, fontSize: 22, color: C.green}}>✓ deploy complete</div>
      </Box>
      <Svg>
        <Arrow x1={820} y1={345} x2={1080} y2={345} p={ep(t, 1.2, 1.8)} color={C.amber} label="open tab?" />
      </Svg>
      <PageFrame x={1100} y={180} build={1} o={o2} w={624} h={330} note="still Build 1 after deployment" />
      <Pill x={1130} y={560} text="plain reload → still Build 1" color={C.amber} o={reload} size={26} />
      <Txt x={M} y={640} w={W - 2 * M} size={34} color={C.text} weight={700} o={ep(t, 5.4, 6)}>The server changed. The tab did not.</Txt>
      <Txt x={M} y={720} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 6.2, 6.8)}>This episode covers one controlled cause of stale content: a service worker still controlling the open page. HTTP caches, CDNs and DNS are other causes with other diagnoses.</Txt>
    </>
  );
};

/* 2. Reveal page, active worker, waiting worker (slot), Cache Storage */
const Layers: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>The four parts</Overline>
    <PageFrame x={LX.page} y={190} build={1} o={ep(t, 0.2, 0.7)} h={300} />
    <Txt x={LX.page} y={510} w={BW} size={24} color={C.dim} o={ep(t, 0.4, 0.9)}>1 · the page (one controlled tab)</Txt>
    <WorkerCard x={LX.worker} y={190} build={1} role="active" state="activated" o={ep(t, 1.0, 1.5)} />
    <Txt x={LX.worker} y={340} w={BW} size={24} color={C.dim} o={ep(t, 1.2, 1.7)}>2 · the worker that controls the page</Txt>
    <Box x={LX.worker} y={400} w={BW} h={90} accent={C.mute} dashed o={ep(t, 1.9, 2.4)} fill="transparent" title="waiting slot · empty" titleSize={26} />
    <Txt x={LX.worker} y={510} w={BW} size={24} color={C.dim} o={ep(t, 2.1, 2.6)}>3 · a second worker may wait here</Txt>
    <CacheCard x={LX.cache} y={190} names={[{n: EV.cacheV1, o: ep(t, 3.6, 4.1)}]} o={ep(t, 2.9, 3.4)} h={180} />
    <Txt x={LX.cache} y={370} w={BW} size={24} color={C.dim} o={ep(t, 3.1, 3.6)}>4 · Cache Storage, a separate store</Txt>
    <Svg>
      <Arrow x1={LX.page + BW} y1={300} x2={LX.worker} y2={300} p={ep(t, 1.6, 2.1)} label="controls" labelDy={-12} />
      <Arrow x1={LX.worker + BW} y1={260} x2={LX.cache} y2={260} p={ep(t, 4.2, 4.7)} color={C.violet} label="serves from" labelDy={-12} />
    </Svg>
    <Box x={M} y={600} w={W - 2 * M} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 5.2, 5.8)}>
      <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>TWO DIFFERENT CACHES</div>
      <div style={{fontSize: 26, color: C.text, marginTop: 8}}>HTTP cache: controlled by response headers such as Cache-Control. &nbsp;Cache Storage: written and read by the worker under a name it chooses. Here each build uses its own: <span style={{fontFamily: 'DejaVu Sans Mono'}}>{EV.cacheV1}</span>, <span style={{fontFamily: 'DejaVu Sans Mono'}}>{EV.cacheV2}</span>.</div>
    </Box>
    <Txt x={M} y={790} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 6.4, 7)}>Illustrative diagram. The lifecycle shown in this episode was modelled in Node, not captured from a browser.</Txt>
  </>
);

/* 3. New worker installs and waits; old worker keeps serving */
const Waiting: React.FC<SceneProps> = ({t}) => {
  const fetchP = ep(t, 0.6, 1.6);
  const install = ep(t, 2.0, 2.8);
  const waitShow = step(t, 3.0);
  const serve = win(t, 4.2, 7.5);
  const serveP = (t - 4.2) % 1.2 / 1.2;
  return (
    <>
      <Overline y={110}>registration.update() · same URL, different bytes</Overline>
      <PageFrame x={LX.page} y={190} build={1} h={300} />
      <WorkerCard x={LX.worker} y={190} build={1} role="active" state="activated" glow={serve > 0.5} />
      <WorkerCard x={LX.worker} y={400} build={2} role={waitShow ? 'waiting' : 'installing'} state={waitShow ? 'installed' : 'installing…'} accent={C.amber} o={install} glow={waitShow === 1 && t < 4.2} />
      <CacheCard x={LX.cache} y={190} names={[{n: EV.cacheV1, o: 1}, {n: EV.cacheV2, o: ep(t, 2.4, 2.9)}]} h={200} />
      <Svg>
        <Arrow x1={LX.page + BW} y1={300} x2={LX.worker} y2={300} label="controls" labelDy={-12} />
        <Arrow x1={LX.worker + BW} y1={260} x2={LX.cache} y2={260} color={C.violet} label={EV.cacheV1} labelDy={-12} />
        <Arrow x1={LX.worker + BW} y1={470} x2={LX.cache} y2={330} p={install} color={C.amber} label="precache v2" labelDy={-12} />
      </Svg>
      <Token x1={LX.page + 240} y1={560} x2={LX.worker + 60} y2={560} p={fetchP} text={`GET /sw.js → ${EV.swBytes} bytes, changed`} color={C.amber} />
      {serve > 0 && <Token x1={LX.worker + 40} y1={300} x2={LX.page + BW - 60} y2={300} p={Math.max(0, Math.min(1, serveP))} text="Build 1 asset" color={C.cyan} o={serve} />}
      <Box x={M} y={620} w={W - 2 * M} h={150} accent={C.amber} o={ep(t, 3.4, 4)} fill="#1c1710">
        <div style={{fontSize: 30, color: C.text, fontWeight: 700}}>The new worker is installed and <span style={{color: C.amber}}>waiting</span>. The old worker still controls the tab and still answers from {EV.cacheV1}.</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 8}}>Nothing replaced the running page's code. Both caches exist side by side; the old one is still needed by this client.</div>
      </Box>
      <Txt x={M} y={790} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 5, 5.6)}>Modelled in the local fixture: after update(), active = Build 1, waiting = Build 2 (installed), controller = Build 1, caches = {EV.cacheV1}, {EV.cacheV2}.</Txt>
    </>
  );
};

/* 4. Update notice + approval */
const Notice: React.FC<SceneProps> = ({t}) => {
  const notice = ep(t, 0.6, 1.2);
  const click = step(t, 5.2);
  const msg = ep(t, 5.4, 6.4);
  return (
    <>
      <Overline y={110}>The page notices · this app's policy</Overline>
      <Box x={LX.page} y={190} w={BW} h={400} accent={C.line} fill="#14171e">
        <div style={{display: 'inline-block', padding: '8px 22px', borderRadius: 10, background: BLUE, color: '#fff', fontSize: 40, fontWeight: 800}}>Build 1</div>
        <div style={{marginTop: 22, opacity: notice, border: `3px solid ${C.amber}`, borderRadius: 12, padding: '14px 18px', background: '#1c1710'}}>
          <div style={{fontSize: 28, fontWeight: 800, color: C.amber}}>Update available</div>
          <div style={{fontSize: 20, color: C.dim, marginTop: 6}}>A newer build is waiting. Approving reloads this tab once. Save work first.</div>
          <div style={{marginTop: 14, display: 'inline-block', padding: '10px 18px', borderRadius: 8, background: click ? C.green : C.amber, color: C.bg, fontSize: 22, fontWeight: 700}}>{click ? '✓ Approved' : 'Approve and reload'}</div>
        </div>
      </Box>
      <Code x={LX.worker} y={190} w={560} title="app.js · decision" size={24} hi={[2, 3]} hiColor={C.amber} lines={[
        'function updateAvailable(reg, ctl) {',
        '  if (!ctl) return false;',
        '  if (reg.waiting) return true;',
        "  if (reg.installing?.state === 'installed')",
        '    return true;',
        '  return false; }',
      ]} />
      <WorkerCard x={LX.cache} y={190} build={2} role="waiting" state="installed" accent={C.amber} />
      <WorkerCard x={LX.cache} y={400} build={1} role="active" state="activated" />
      <Svg>
        <Arrow x1={LX.cache + BW / 2} y1={400} x2={LX.cache + BW / 2} y2={330} p={ep(t, 1.4, 1.9)} color={C.amber} label="reg.waiting" />
      </Svg>
      <Token x1={LX.page + BW - 40} y1={640} x2={LX.cache + 40} y2={640} p={msg} text="postMessage({type:'SKIP_WAITING'})" color={C.amber} o={msg > 0 ? 1 : 0} />
      <Box x={M} y={700} w={W - 2 * M} h={110} accent={C.amber} dashed fill="transparent" o={ep(t, 2.6, 3.2)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>POLICY, NOT A BROWSER RULE</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Asking for approval is this app's choice. A worker may call skipWaiting() during install and take over immediately; many apps do.</div>
      </Box>
    </>
  );
};

/* 5. Activation, cache cleanup, controllerchange, single reload */
const Activate: React.FC<SceneProps> = ({t}) => {
  const act = ep(t, 0.4, 1.2);
  const del = ep(t, 1.6, 2.4);
  const cc = ep(t, 3.0, 3.8);
  const reload1 = step(t, 4.0);
  const second = ep(t, 5.4, 6.0);
  const lines = [
    {t: 'message  build2 SKIP_WAITING', c: C.amber},
    {t: 'skipWaiting  build2', c: C.amber},
    {t: 'redundant    build1', c: C.mute},
    {t: 'activating   build2', c: C.cyan},
    {t: `activated    build2`, c: C.green},
    {t: `caches=[${EV.cachesAfterActivation.join(',')}]`, c: C.green},
    {t: 'controllerchange → reload 1', c: C.green},
    {t: `controllerchange 2 → ${EV.secondControllerChange}`, c: C.dim},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Activation · controller change · one reload</Overline>
      <WorkerCard x={M} y={190} build={1} role={act > 0.5 ? 'redundant' : 'active'} state={act > 0.5 ? 'redundant' : 'activated'} accent={act > 0.5 ? C.mute : C.cyan} />
      <WorkerCard x={M} y={350} build={2} role={act > 0.5 ? 'active' : 'waiting'} state={act > 0.5 ? 'activated' : 'activating…'} accent={act > 0.5 ? C.green : C.amber} glow={act > 0.5 && t < 3} />
      <CacheCard x={M} y={510} names={[{n: EV.cacheV1, o: 1 - 0.6 * del, dim: del > 0.5}, {n: EV.cacheV2, o: 1}]} h={190} />
      <Code x={660} y={190} w={560} title="sw.js · activate" size={23} hi={[2, 3]} hiColor={C.green} lines={[
        'const names = await caches.keys();',
        'const stale = names.filter((n) =>',
        "  n.startsWith('wrc-ep12-') &&",
        '  n !== CACHE);',
        'await Promise.all(stale.map(caches.delete));',
        'await self.clients.claim();',
      ]} />
      <Code x={660} y={470} w={560} title="app.js · controllerchange guard" size={23} hi={[1, 2]} hiColor={C.green} lines={[
        'let refreshing = false;',
        'if (refreshing) return;',
        'refreshing = true;',
        'location.reload();',
      ]} />
      <Log x={1290} y={190} w={534} lines={lines} shown={prog(t, 0.2, 6.2) * lines.length} title="Modelled trace · not a browser capture" size={20} />
      <Svg>
        <Arrow x1={1180} y1={720} x2={1290} y2={720} p={cc} color={C.green} />
      </Svg>
      <Badge x={1290} y={690} label="reloads" value={reload1 ? String(EV.reloads) : '0'} color={C.green} o={cc} big />
      <Badge x={1500} y={690} label="2nd event" value={EV.secondControllerChange} color={C.dim} o={second} big />
      <Txt x={M} y={760} w={540} size={24} color={C.dim} o={ep(t, 2.6, 3.2)}>Only this app's old cache is removed, by prefix. clients.claim() takes clients; it does not delete anything.</Txt>
      <Txt x={660} y={800} w={1164} size={24} color={C.mute} o={ep(t, 6.2, 6.8)}>Observed from the local model (evidence.json): caches after activation = [{EV.cachesAfterActivation.join(', ')}], reloads = {EV.reloads}, second controllerchange = {EV.secondControllerChange}.</Txt>
    </>
  );
};

/* 6. Verify Build 2 */
const Verify: React.FC<SceneProps> = ({t}) => {
  const swap = ep(t, 0.8, 1.6);
  const lines = [
    {t: '$ node --test fixtures/ep12-sw-update/test.mjs', c: C.mute},
    {t: '✓ sw.js byte-different between builds, same URL', c: C.green},
    {t: '✓ precache names wrc-ep12-v1 ≠ wrc-ep12-v2', c: C.green},
    {t: '✓ activate deletes only stale wrc-ep12-* caches', c: C.green},
    {t: '✓ control: unversioned name → nothing to clean', c: C.amber},
    {t: '✓ Build 2 waits behind Build 1; page unchanged', c: C.green},
    {t: '✓ approve → activate → 1 reload; 2nd event ignored', c: C.green},
    {t: `# pass ${EV.tests.pass}  fail ${EV.tests.fail}`, c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Verify · after one reload</Overline>
      <PageFrame x={M} y={190} build={1} o={1 - swap} h={300} />
      <PageFrame x={M} y={190} build={2} o={swap} h={300} note="served by the Build 2 worker" />
      <CacheCard x={M} y={520} names={[{n: EV.cacheV2, o: 1}]} h={160} o={ep(t, 1.8, 2.3)} />
      <Log x={660} y={190} w={1164} lines={lines} shown={prog(t, 0.4, 5) * lines.length} title="Executed · node:test output" size={22} />
      <Txt x={M} y={700} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5, 5.5)}>Observed from the local fixture: reloads = {EV.reloads}; caches left = {EV.cachesAfterActivation.join(', ')}; server returns "Build 2" at / and a byte-different /sw.js with Cache-Control: no-cache.</Txt>
      <Txt x={M} y={770} w={W - 2 * M} size={24} color={C.amber} o={ep(t, 5.8, 6.4)}>Blocked here: the real browser lifecycle was not executed. The ten-step manual checklist in the fixture folder verifies it in a browser.</Txt>
    </>
  );
};

/* 7. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={78} o={ep(t, 0.2, 0.9)}>Deployment and client activation<br />are different events.</Big>
    <Txt x={M} y={580} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>An update belongs to the registration, not to one tab. When the new worker takes over, every controlled tab gets controllerchange, and with this handler every one of them reloads. Unsaved work in those tabs is at risk.</Txt>
    <Txt x={M} y={720} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.6, 3.2)}>One cause of stale content among several. Local fixture, loopback only. Lifecycle modelled in Node, not captured from a browser.</Txt>
  </>
);

export const scenes = {fail: Fail, layers: Layers, waiting: Waiting, notice: Notice, activate: Activate, verify: Verify, end: End};
