import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep07-vite-env-localhost/evidence.json (node demo.mjs). */
const EV = {
  devApi: 'http://127.0.0.1:41073',
  devApiPort: '41073',
  devStatic: 'http://127.0.0.1:39285',
  newApi: 'http://127.0.0.1:42741',
  newStatic: 'http://127.0.0.1:44371',
  oldAsset: 'index-PKkaHDlY.js',
  newAsset: 'index-BLHWur4n.js',
  oldBytes: 1061,
  hash: '3d2951419c71e210…',
  vite: '8.3.5',
};

/* ---------- shared layout: four boundaries ---------- */
const B = {
  dev: {x: M, y: 170, w: 560, h: 330, title: 'Developer machine'},
  host: {x: 680, y: 170, w: 560, h: 250, title: 'Static host'},
  api: {x: 1264, y: 170, w: 560, h: 250, title: 'API host'},
  remote: {x: 680, y: 560, w: 560, h: 320, title: 'Remote browser'},
};
type BKey = keyof typeof B;
const Boundary: React.FC<{k: BKey; accent?: string; o?: number; sub?: string; children?: React.ReactNode}> = ({k, accent = C.mute, o = 1, sub, children}) => {
  const b = B[k];
  return <Box x={b.x} y={b.y} w={b.w} h={b.h} title={b.title} sub={sub} accent={accent} dashed o={o} fill="transparent" titleSize={26}>{children}</Box>;
};
const Note: React.FC<{o: number; children: React.ReactNode; color?: string}> = ({o, children, color = C.dim}) => (
  <Txt x={M} y={892} w={W - 2 * M} align="center" size={24} color={color} o={o}>{children}</Txt>
);
/* Small "machine" card with a loopback label */
const Loopback: React.FC<{x: number; y: number; w?: number; listening: boolean; port: string; o?: number; label?: string}> = ({x, y, w = 480, listening, port, o = 1, label}) => (
  <Box x={x} y={y} w={w} h={92} accent={listening ? C.green : C.red} o={o} fill={listening ? '#10201a' : '#1c1012'} titleSize={24} title={label ?? `127.0.0.1:${port}`} sub={listening ? 'API listening · GET /health → 200' : 'nothing listening · connection refused'} />
);

/* 1. Local success */
const LocalOk: React.FC<SceneProps> = ({t}) => {
  const go = ep(t, 0.8, 1.8);
  const back = ep(t, 2.2, 3.0);
  return (
    <>
      <Overline y={110}>Developer machine · everything on one loopback</Overline>
      <Box x={M} y={170} w={W - 2 * M} h={560} title="Developer machine" accent={C.cyan} dashed fill="transparent" titleSize={26} />
      <Box x={M + 60} y={270} w={640} h={380} title="Browser" sub={`page served from ${EV.devStatic}`} accent={C.line} fill="#14171e" titleSize={28}>
        <div style={{marginTop: 24, fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 24, color: C.dim}}>bundle says:</div>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 26, color: C.cyan, marginTop: 6}}>{EV.devApi}</div>
        <div style={{marginTop: 40, display: 'flex', alignItems: 'center', gap: 16, opacity: back}}>
          <div style={{width: 48, height: 48, borderRadius: 24, background: C.green, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800}}>✓</div>
          <div style={{fontSize: 34, fontWeight: 800, color: C.text}}>200 OK · {'{"ok":true}'}</div>
        </div>
      </Box>
      <Loopback x={1140} y={400} w={600} listening port={EV.devApiPort} o={ep(t, 0.3, 0.8)} />
      <Svg>
        <Arrow x1={760} y1={440} x2={1120} y2={440} p={go} label="GET /health" />
        <Arrow x1={1120} y1={480} x2={760} y2={480} p={back} color={C.green} label="200" labelDy={34} />
      </Svg>
      <Token x1={760} y1={400} x2={1080} y2={400} p={go} text={`${EV.devApi}/health`} o={go < 1 ? 1 : 0} />
      <Note o={ep(t, 3.4, 3.9)}>Observed from the local fixture: GET {EV.devApi}/health → 200, Access-Control-Allow-Origin: {EV.devStatic}</Note>
    </>
  );
};

/* 2. Remote client fails (CONCEPTUAL SIMULATION) */
const RemoteFail: React.FC<SceneProps> = ({t}) => {
  const load = ep(t, 0.4, 1.3);
  const req = ep(t, 1.8, 2.6);
  const fail = step(t, 2.7);
  return (
    <>
      <Overline y={110} color={C.red}>Same bundle · another machine</Overline>
      <Boundary k="host" accent={C.mute} sub="serves dist/ unchanged">
        <Pill x={30} y={120} text={`assets/${EV.oldAsset}`} color={C.cyanDim} mono size={22} />
      </Boundary>
      <Boundary k="api" accent={C.mute} sub="the API that should be called" o={0.6} />
      <Boundary k="remote" accent={fail ? C.red : C.amber} sub="no API on its own loopback">
        <div style={{marginTop: 16, fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 24, color: C.cyan}}>fetch("{EV.devApi}/health")</div>
        <div style={{marginTop: 28, fontSize: 30, fontWeight: 800, color: C.red, opacity: fail}}>TypeError: Failed to fetch</div>
        <div style={{marginTop: 6, fontSize: 24, color: C.dim, opacity: fail}}>net::ERR_CONNECTION_REFUSED</div>
      </Boundary>
      <Svg>
        <Arrow x1={960} y1={420} x2={960} y2={560} p={load} label="GET / → index.html + bundle" />
        <Arrow x1={1240} y1={760} x2={1480} y2={760} p={req} color={C.red} dashed label="to 127.0.0.1 …" labelDy={-16} />
      </Svg>
      <Loopback x={1300} y={800} w={524} listening={false} port={EV.devApiPort} o={ep(t, 1.6, 2.2)} label={`remote's own 127.0.0.1:${EV.devApiPort}`} />
      <Badge x={1300} y={480} label="not" value="CORS · not 404" color={C.amber} o={ep(t, 3.2, 3.7)} />
      <Note o={ep(t, 3.6, 4.1)} color={C.amber}>Conceptual: NOT reproduced in an isolated browser. Node model from the fixture: TypeError: fetch failed · cause ECONNREFUSED</Note>
    </>
  );
};

/* 3. Follow the request to the remote's own loopback */
const FollowLoopback: React.FC<SceneProps> = ({t}) => {
  const a = ep(t, 0.4, 1.0);
  const b = ep(t, 1.6, 2.4);
  const bl = blink(t, 2.6, 0.8);
  return (
    <>
      <Overline y={110} color={C.amber}>One address · two machines</Overline>
      <Code x={M} y={180} w={W - 2 * M} size={26} title="the bundle, on both machines" lines={[`fetch("${EV.devApi}/health")`]} hi={[0]} hiColor={C.amber} />
      <Box x={M} y={330} w={800} h={420} title="Developer machine" sub="127.0.0.1 → this laptop" accent={C.green} dashed fill="transparent" titleSize={28}>
        <Loopback x={30} y={150} w={740} listening port={EV.devApiPort} o={a} />
      </Box>
      <Box x={1024} y={330} w={800} h={420} title="Remote machine" sub="127.0.0.1 → itself, not the developer's laptop" accent={C.red} dashed fill="transparent" titleSize={28}>
        <Loopback x={30} y={150} w={740} listening={false} port={EV.devApiPort} o={b} />
      </Box>
      <Svg>
        <Arrow x1={500} y1={282} x2={500} y2={470} p={a} color={C.green} label="resolves here" />
        <Arrow x1={1420} y1={282} x2={1420} y2={470} p={b} color={C.red} label="resolves here" />
      </Svg>
      <Txt x={M} y={790} w={W - 2 * M} align="center" size={32} weight={700} color={C.amber} o={ep(t, 2.6, 3.2)}>127.0.0.1 is not a place. It is "this machine", wherever the code runs.</Txt>
      <Txt x={1054} y={660} w={740} size={26} color={C.red} o={bl}>connection refused — nothing listens on the remote's port {EV.devApiPort}</Txt>
      <Note o={ep(t, 3.6, 4.1)} color={C.amber}>Conceptual simulation of the remote client; the network condition (empty loopback port → ECONNREFUSED) was executed locally.</Note>
    </>
  );
};

/* 4. Reveal the stamped URL in the built JS */
const Bundle: React.FC<SceneProps> = ({t}) => {
  const stamp = ep(t, 1.4, 2.6);
  const built = ep(t, 2.6, 3.1);
  return (
    <>
      <Overline y={110}>Build time · the stamp</Overline>
      <Code x={M} y={180} w={760} size={26} title="src/main.js" hi={[0]} hiColor={C.cyan} lines={[
        'const base =',
        '  import.meta.env.VITE_API_BASE_URL;',
        'await fetch(`${base}/health`);',
      ]} />
      <Code x={M} y={420} w={760} size={26} title=".env.development · VITE_API_BASE_URL" lines={[`VITE_API_BASE_URL=${EV.devApi}`]} hi={[0]} hiColor={C.amber} />
      <Box x={900} y={300} w={240} h={120} title="vite build" sub={`vite ${EV.vite}`} accent={stamp > 0 && stamp < 1 ? C.amber : C.line} glow={stamp > 0 && stamp < 1} titleSize={28} />
      <Svg>
        <Arrow x1={856} y1={290} x2={900} y2={340} p={ep(t, 0.6, 1.1)} />
        <Arrow x1={856} y1={470} x2={900} y2={380} p={ep(t, 0.9, 1.4)} color={C.amber} />
        <Arrow x1={1140} y1={360} x2={1180} y2={360} p={built} color={C.green} />
      </Svg>
      <Token x1={M + 40} y1={500} x2={1230} y2={372} p={stamp} text={EV.devApi} color={C.amber} o={stamp > 0 && stamp < 1 ? 1 : 0} />
      <Code x={1180} y={180} w={644} size={26} title={`dist/assets/${EV.oldAsset}`} o={0.35 + 0.65 * built} hi={built > 0.5 ? [1] : []} hiColor={C.amber} lines={[
        '// minified · string literal',
        `const n="${EV.devApi}";`,
        'await fetch(`${n}/health`);',
        '// no import.meta.env left',
      ]} />
      <Gate x={1180} y={470} w={644} title="vite:define · verified in node_modules/vite" accent={C.cyan} o={ep(t, 3.4, 3.9)} checks={[
        {label: 'VITE_-prefixed keys are exposed to client', state: 'pass'},
        {label: 'import.meta.env.KEY → JSON literal at build', state: 'pass'},
        {label: 'Public config. Never a secret.', state: 'pass'},
      ]} />
      <Note o={ep(t, 4.4, 4.9)}>Observed from the local fixture: {EV.oldAsset} ({EV.oldBytes} bytes) contains {EV.devApi}; "import.meta.env" absent.</Note>
    </>
  );
};

/* 5. Change env on the static host */
const HostEnv: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: `$ node static-host.mjs dist \\`, c: C.mute},
    {t: `    --inject-env ${EV.newApi}`, c: C.text},
    {t: 'host process.env.VITE_API_BASE_URL set', c: C.green},
    {t: '$ curl …/__host-env', c: C.mute},
    {t: `{"VITE_API_BASE_URL":"${EV.newApi}"}`, c: C.green},
  ];
  return (
    <>
      <Overline y={110} color={C.amber}>The usual instinct</Overline>
      <Boundary k="dev" accent={C.mute} o={0.5} sub="built the bundle earlier" />
      <Box x={680} y={170} w={1144} h={330} title="Static host" sub="serves dist/ · its own process.env" accent={C.amber} dashed fill="transparent" titleSize={26} />
      <Log x={710} y={260} w={700} size={22} lines={lines} shown={prog(t, 0.4, 3.0) * lines.length} title="executed on the host" />
      <Badge x={1440} y={300} label="host env" value="set ✓" color={C.green} o={ep(t, 2.6, 3.1)} big />
      <Box x={1440} y={380} w={360} h={92} title={`assets/${EV.oldAsset}`} sub="unchanged file on disk" accent={C.amber} titleSize={22} o={ep(t, 3.2, 3.7)} />
      <Txt x={M} y={580} w={W - 2 * M} align="center" size={34} weight={700} color={C.amber} o={ep(t, 3.6, 4.2)}>The host process sees the new value. Does the bundle?</Txt>
      <Note o={ep(t, 4.2, 4.7)}>Observed from the local fixture: GET /__host-env → VITE_API_BASE_URL = {EV.newApi}</Note>
    </>
  );
};

/* 6. The served bundle still has the old value */
const StillOld: React.FC<SceneProps> = ({t}) => {
  const serve = ep(t, 0.6, 1.5);
  const reveal = step(t, 1.6);
  return (
    <>
      <Overline y={110} color={C.red}>Same bytes</Overline>
      <Box x={M} y={170} w={760} h={330} title="Static host" sub={`process.env.VITE_API_BASE_URL = ${EV.newApi}`} accent={C.amber} dashed fill="transparent" titleSize={26}>
        <Pill x={30} y={150} text={`GET /assets/${EV.oldAsset}`} color={C.cyanDim} mono size={22} />
      </Box>
      <Svg>
        <Arrow x1={856} y1={340} x2={1060} y2={340} p={serve} label="served" />
      </Svg>
      <Code x={1060} y={180} w={764} size={26} title={`served ${EV.oldAsset}`} hi={reveal ? [1] : []} hiColor={C.red} lines={[
        '// minified · string literal',
        `const n="${EV.devApi}";`,
        'await fetch(`${n}/health`);',
      ]} />
      <Gate x={M} y={560} w={760} title="what changed" accent={C.red} o={ep(t, 2.2, 2.7)} checks={[
        {label: 'Host process environment', state: 'pass'},
        {label: 'Bytes of the served bundle', state: 'fail'},
      ]} />
      <Box x={1060} y={560} w={764} h={200} title="dist/ hash before · after" accent={C.red} titleSize={24} o={ep(t, 2.8, 3.3)} fill="#1c1012">
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 26, color: C.text, marginTop: 14}}>{EV.hash}</div>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 26, color: C.text, marginTop: 6}}>{EV.hash}</div>
        <div style={{fontSize: 24, color: C.red, marginTop: 10, fontWeight: 700}}>identical · the host serves files, it does not rebuild</div>
      </Box>
      <Note o={ep(t, 3.8, 4.3)}>Observed from the local fixture: served JS contains {EV.devApi}; does not contain {EV.newApi}; dist hash unchanged.</Note>
    </>
  );
};

/* 7. Rebuild with a reachable URL */
const Fix: React.FC<SceneProps> = ({t}) => {
  const stamp = ep(t, 1.2, 2.4);
  const built = ep(t, 2.4, 2.9);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · rebuild where the build runs</Overline>
      <Code x={M} y={180} w={760} size={26} title="where the build runs (laptop or CI)" hi={[0]} hiColor={C.green} lines={[
        `VITE_API_BASE_URL=${EV.newApi} \\`,
        '  npx vite build',
      ]} />
      <Box x={900} y={240} w={240} h={120} title="vite build" sub={`vite ${EV.vite}`} accent={stamp > 0 && stamp < 1 ? C.green : C.line} glow={stamp > 0 && stamp < 1} titleSize={28} />
      <Svg>
        <Arrow x1={856} y1={260} x2={900} y2={300} p={ep(t, 0.5, 1.0)} color={C.green} />
        <Arrow x1={1140} y1={300} x2={1180} y2={300} p={built} color={C.green} />
      </Svg>
      <Token x1={M + 40} y1={250} x2={1230} y2={300} p={stamp} text={EV.newApi} color={C.green} o={stamp > 0 && stamp < 1 ? 1 : 0} />
      <Code x={1180} y={180} w={644} size={26} title={`dist/assets/${EV.newAsset}`} o={0.35 + 0.65 * built} hi={built > 0.5 ? [1] : []} hiColor={C.green} lines={[
        '// new file, new hash',
        `const n="${EV.newApi}";`,
        'await fetch(`${n}/health`);',
      ]} />
      <Box x={M} y={420} w={760} h={120} title={`old: ${EV.oldAsset}`} sub={`${EV.devApi} — gone from the new build`} accent={C.mute} titleSize={24} o={ep(t, 3.0, 3.5)} />
      <Txt x={M} y={600} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4.0)}>The variable must be present where <span style={{color: C.text}}>vite build</span> runs. Then upload the new dist/. Runtime configuration (a config file fetched at start-up) is a valid alternative design, not shown here.</Txt>
      <Note o={ep(t, 4.4, 4.9)}>Observed from the local fixture: {EV.newAsset} contains {EV.newApi}; old URL absent.</Note>
    </>
  );
};

/* 8. Retest */
const Retest: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep07-vite-env-localhost/test.mjs', c: C.mute},
    {t: '✓ build replaces import.meta.env.VITE_API_BASE_URL', c: C.green},
    {t: '✓ control: embedded localhost URL → ECONNREFUSED', c: C.amber},
    {t: '✓ host env change does NOT change served bundle', c: C.green},
    {t: '✓ rebuild with reachable URL → /health 200', c: C.green},
    {t: '✓ local success with CORS allowlist → 200', c: C.green},
    {t: '# pass 9  fail 0', c: C.text},
  ];
  const req = ep(t, 1.0, 1.9);
  const back = ep(t, 2.2, 3.0);
  return (
    <>
      <Overline y={110} color={C.green}>Retest · same request, new bundle</Overline>
      <Log x={M} y={170} w={900} size={22} lines={lines} shown={prog(t, 0.3, 4.2) * lines.length} title="Executed · node:test output" />
      <Box x={1040} y={170} w={784} h={150} title="Static host" sub={`serves ${EV.newAsset} on ${EV.newStatic}`} accent={C.cyan} dashed fill="transparent" titleSize={24} />
      <Box x={1040} y={560} w={784} h={120} title="API host" sub={`${EV.newApi} · CORS allowlist: ${EV.newStatic}`} accent={C.green} dashed fill="transparent" titleSize={24} />
      <Svg>
        <Arrow x1={1300} y1={320} x2={1300} y2={560} p={req} label="GET /health" />
        <Arrow x1={1560} y1={560} x2={1560} y2={320} p={back} color={C.green} label="200 OK" />
      </Svg>
      <Token x1={1300} y1={330} x2={1300} y2={520} p={req} text={`${EV.newApi}/health`} o={req < 1 ? 1 : 0} />
      <Pill x={1340} y={420} text={'200 · {"ok":true}'} color={C.green} o={back} size={28} />
      <Note o={ep(t, 3.4, 3.9)}>Observed from the local fixture: GET {EV.newApi}/health → 200, Access-Control-Allow-Origin: {EV.newStatic}</Note>
    </>
  );
};

/* 9. End */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={78} o={ep(t, 0.2, 0.9)}>A server environment change<br />cannot rewrite an existing bundle.</Big>
    <Txt x={M} y={590} w={W - 2 * M} align="center" size={30} color={C.amber} o={ep(t, 1.6, 2.2)}>VITE_ values are public client configuration, shipped to every visitor. Never put a secret in one.</Txt>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, vite {EV.vite}, loopback only. The remote-browser failure was a labelled conceptual simulation, not reproduced in an isolated browser. Runtime configuration is an alternative design, not implemented here.</Txt>
  </>
);

export const scenes = {local_ok: LocalOk, remote_fail: RemoteFail, follow_loopback: FollowLoopback, bundle: Bundle, host_env: HostEnv, still_old: StillOld, fix: Fix, retest: Retest, end: End};
