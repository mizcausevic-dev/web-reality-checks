import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Synthetic values shown on screen. The secret is always displayed truncated. */
const PUB = 'proj_pub_7f3a21';
const SEC = 'srv_secret_SYNTHETIC_9c1e…';

/* Three-column layout shared by the architecture scenes */
const COL = {browser: {x: M, w: 440}, backend: {x: 740, w: 440}, upstream: {x: 1384, w: 440}};
const ROW = {y: 190, h: 560};

const Column: React.FC<{k: keyof typeof COL; title: string; sub?: string; accent?: string; o?: number; glow?: boolean; dashed?: boolean; children?: React.ReactNode}> = ({k, title, sub, accent = C.line, o = 1, glow, dashed, children}) => (
  <Box x={COL[k].x} y={ROW.y} w={COL[k].w} h={ROW.h} title={title} sub={sub} accent={accent} o={o} glow={glow} dashed={dashed} titleSize={30}>{children}</Box>
);

/* A small "holds:" list inside a column */
const Holds: React.FC<{items: {text: string; color: string; o?: number}[]}> = ({items}) => (
  <div style={{marginTop: 22}}>
    <div style={{fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: C.mute, marginBottom: 10}}>holds</div>
    {items.map((it, i) => (
      <div key={i} style={{opacity: it.o ?? 1, marginBottom: 10, padding: '8px 14px', borderRadius: 10, background: `${it.color}1a`, border: `2px solid ${it.color}`, fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 24, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{it.text}</div>
    ))}
  </div>
);

/* 1. Inspect the shipped bundle: two credential-shaped strings */
const InspectLeak: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.5);
  const hiPub = step(t, 1.0);
  const hiSec = step(t, 1.8);
  return (
    <>
      <Overline y={110} color={C.amber}>bundle-flawed/app.js · as downloaded by the browser</Overline>
      <Code x={M} y={170} w={1040} title="app.js (illustrative)" size={26} hi={[...(hiPub ? [0, 1] : []), ...(hiSec ? [2, 3] : [])]} hiColor={hiSec ? C.red : C.amber} o={o} lines={[
        'const PUBLIC_PROJECT_ID =',
        `  "${PUB}";`,
        'const SERVER_SECRET_TOKEN =',
        `  "${SEC}";`,
        'fetch(UPSTREAM + "/privileged", {',
        '  headers: {authorization: "Bearer " + …',
      ]} />
      <Badge x={1200} y={200} label="named" value="PUBLIC" color={C.amber} big o={ep(t, 1.0, 1.4)} />
      <Badge x={1200} y={290} label="named" value="SECRET" color={C.red} big o={ep(t, 1.8, 2.2)} />
      <Txt x={1200} y={400} w={624} size={30} color={C.dim} o={ep(t, 2.4, 2.9)}>Same file. Same quotes. Both now sit in every visitor's browser cache.</Txt>
      <Big x={M} y={560} w={W - 2 * M} size={88} o={ep(t, 3.2, 3.8)}>Is this a leak?</Big>
      <Txt x={M} y={690} w={W - 2 * M} size={34} color={C.amber} o={ep(t, 4.2, 4.7)}>The names cannot tell you. "PUBLIC" is a label someone typed, not a property the upstream enforces.</Txt>
      <Txt x={M} y={860} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 5, 5.5)}>Observed from the local fixture: inspect-artifacts.mjs on bundle-flawed → 2 secret-like, 2 identifier-like (app.js, index.html)</Txt>
    </>
  );
};

/* 2. Ask what each value can actually do */
const Ask: React.FC<SceneProps> = ({t}) => {
  const q = ep(t, 1.6, 2.2);
  return (
    <>
      <Overline y={110}>A different question</Overline>
      <Big x={M} y={160} w={W - 2 * M} size={64} o={ep(t, 0, 0.6)}>What can each value actually do?</Big>
      <Box x={M} y={300} w={760} h={300} accent={C.amber} o={ep(t, 0.6, 1.1)} title={PUB} titleSize={34}>
        <div style={{marginTop: 18, fontSize: 26, color: C.dim}}>label: <span style={{color: C.amber, fontWeight: 700}}>PUBLIC</span></div>
        <div style={{marginTop: 14, fontSize: 26, color: C.dim}}>capability: <span style={{color: C.text, fontWeight: 700, opacity: q}}>unknown until tested</span></div>
      </Box>
      <Box x={M + 872} y={300} w={856} h={300} accent={C.red} o={ep(t, 0.9, 1.4)} title={SEC} titleSize={34}>
        <div style={{marginTop: 18, fontSize: 26, color: C.dim}}>label: <span style={{color: C.red, fontWeight: 700}}>SECRET</span></div>
        <div style={{marginTop: 14, fontSize: 26, color: C.dim}}>capability: <span style={{color: C.text, fontWeight: 700, opacity: q}}>unknown until tested</span></div>
      </Box>
      <Svg>
        <Arrow x1={476} y1={600} x2={860} y2={720} p={ep(t, 2.4, 3.0)} color={C.amber} />
        <Arrow x1={1396} y1={600} x2={1060} y2={720} p={ep(t, 2.6, 3.2)} color={C.red} />
      </Svg>
      <Box x={660} y={720} w={600} h={120} accent={C.cyan} o={ep(t, 2.8, 3.3)} title="Mock upstream · POST /privileged" sub="the only thing that decides what a credential does" titleSize={28} />
      <Txt x={M} y={870} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 3.8, 4.4)}>A name is a label. A capability is what the upstream performs for whoever presents the value.</Txt>
    </>
  );
};

/* Shared harness → upstream probe layout for scenes 3 and 4 */
const Probe: React.FC<{t: number; cred: string; credColor: string; status: string; statusColor: string; verdict: string; verdictColor: string; note: string; extra?: React.ReactNode}> = ({t, cred, credColor, status, statusColor, verdict, verdictColor, note, extra}) => {
  const fly = ep(t, 0.6, 1.8);
  const decided = ep(t, 2.0, 2.5);
  const back = ep(t, 2.6, 3.4);
  return (
    <>
      <Box x={M} y={260} w={500} h={240} title="Test harness" sub="any client that holds the value" accent={C.line} titleSize={30} />
      <Box x={1324} y={260} w={500} h={240} title="Mock upstream" sub="POST /privileged" accent={decided > 0.5 ? statusColor : C.cyan} glow={decided > 0.5} titleSize={30} />
      <Svg>
        <Arrow x1={596} y1={380} x2={1324} y2={380} p={Math.min(1, fly * 1.05)} color={C.cyan} dashed />
        <Arrow x1={1324} y1={440} x2={596} y2={440} p={back} color={statusColor} />
      </Svg>
      <Token x1={620} y1={330} x2={1120} y2={330} p={fly} text={`Authorization: Bearer ${cred}`} color={credColor} />
      <Gate x={1324} y={520} w={500} title="upstream check" accent={decided > 0.5 ? statusColor : C.mute} checks={[{label: 'bearer present', state: decided > 0.5 ? 'pass' : 'pending'}, {label: 'bearer == SERVER_SECRET_TOKEN', state: decided > 0.5 ? (statusColor === C.green ? 'pass' : 'fail') : 'pending'}]} />
      <Pill x={640} y={460} text={status} color={statusColor} o={back} size={34} />
      <Txt x={M} y={560} w={560} size={40} weight={700} color={verdictColor} o={ep(t, 3.4, 3.9)}>{verdict}</Txt>
      {extra}
      <Txt x={M} y={860} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 4.4, 4.9)}>{note}</Txt>
    </>
  );
};

/* 3. The public identifier fails to authorise */
const PublicFail: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.amber}>Capability test 1 · the value named PUBLIC</Overline>
    <Probe t={t} cred={PUB} credColor={C.amber} status="403 Forbidden" statusColor={C.red} verdict="It names a project. It authorises nothing." verdictColor={C.text} note={`Observed from the local fixture: POST /privileged with Bearer ${PUB} → 403; GET /public/${PUB} → 200`}
      extra={<Txt x={M} y={700} w={1100} size={28} color={C.amber} o={ep(t, 3.9, 4.4)}>"Public" is a tested fact here, not a promise from the name. The same test, not the prefix, is what settles it for any value.</Txt>} />
  </>
);

/* 4. The synthetic secret succeeds */
const SecretOk: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>Capability test 2 · the value named SECRET</Overline>
    <Probe t={t} cred={SEC} credColor={C.red} status="200 OK · rotate_webhook" statusColor={C.green} verdict="Anyone who downloaded the bundle holds this capability." verdictColor={C.red} note="Observed from the local fixture: POST /privileged with the synthetic secret → 200 (rotate_webhook); delete_project → 200 as well"
      extra={<Box x={M} y={700} w={1100} h={110} accent={C.red} dashed fill="transparent" o={ep(t, 3.9, 4.4)}>
        <div style={{fontSize: 24, color: C.red, fontWeight: 700, letterSpacing: 2}}>THIS IS THE LEAK</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Not the string. The capability it carries, now in every visitor's hands, including delete_project.</div>
      </Box>} />
  </>
);

/* 5. Move privileged access behind the backend (and why a bare proxy is not enough) */
const Fix: React.FC<SceneProps> = ({t}) => {
  const move = ep(t, 1.0, 2.2);
  const gateOn = step(t, 3.0);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · corrected architecture</Overline>
      <Column k="browser" title="Browser" sub="bundle-corrected/" accent={C.cyan} o={ep(t, 0, 0.5)}>
        <Holds items={[{text: PUB, color: C.amber}]} />
      </Column>
      <Column k="backend" title="App backend" sub="session · role · allow-list" accent={gateOn ? C.green : C.cyan} o={ep(t, 0.3, 0.8)} glow={gateOn === 1}>
        <Holds items={[{text: SEC, color: C.red, o: move}]} />
        <div style={{marginTop: 14, opacity: ep(t, 3.0, 3.5)}}>
          {['1  authenticate the user', '2  authorise the role', '3  validate the operation'].map((s, i) => <div key={i} style={{fontSize: 24, color: C.green, fontWeight: 600, marginBottom: 6}}>{s}</div>)}
        </div>
      </Column>
      <Column k="upstream" title="Mock upstream" sub="POST /privileged" accent={C.line} o={ep(t, 0.6, 1.1)}>
        <div style={{marginTop: 22, fontSize: 24, color: C.dim}}>accepts only the secret</div>
      </Column>
      <Token x1={COL.browser.x + 40} y1={330} x2={COL.backend.x + 30} y2={330} p={move} text={SEC} color={C.red} o={1 - move} />
      <Svg>
        <Arrow x1={COL.backend.x + COL.backend.w} y1={470} x2={COL.upstream.x} y2={470} p={ep(t, 2.4, 3.0)} color={C.cyan} label="backend's own credential" labelDy={-14} />
      </Svg>
      <Box x={M} y={780} w={W - 2 * M} h={110} accent={C.amber} dashed fill="transparent" o={ep(t, 4.0, 4.6)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>NOT ENOUGH ON ITS OWN</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>A backend that forwards whatever the browser asks is the leak with an extra hop. It must decide who, and which operation, itself.</div>
      </Box>
    </>
  );
};

/* 6. Reject unauthenticated and unauthorised requests at the backend */
const Reject: React.FC<SceneProps> = ({t}) => {
  const r1 = ep(t, 0.6, 1.4);
  const d1 = ep(t, 1.5, 1.9);
  const r2 = ep(t, 2.6, 3.4);
  const d2 = ep(t, 3.5, 3.9);
  return (
    <>
      <Overline y={110} color={C.red}>Retest · two requests that must fail</Overline>
      <Column k="browser" title="Browser" sub="two synthetic clients" accent={C.cyan}>
        <Badge x={24} y={110} label="session" value="none" color={C.mute} />
        <Badge x={24} y={300} label="session" value="u_vik · viewer" color={C.cyan} />
      </Column>
      <Column k="backend" title="App backend" accent={d2 > 0.5 || d1 > 0.5 ? C.red : C.cyan}>
        <Gate x={0} y={90} w={392} title="checks" accent={C.red} checks={[{label: 'authenticated', state: d1 > 0.5 ? 'fail' : d2 > 0.5 ? 'pass' : 'pending'}, {label: 'role allows it', state: d2 > 0.5 ? 'fail' : 'pending'}, {label: 'operation on allow-list', state: 'pending'}]} />
      </Column>
      <Column k="upstream" title="Mock upstream" accent={C.mute} o={0.6}>
        <div style={{marginTop: 22, fontSize: 24, color: C.dim}}>calls received during these two requests:</div>
        <div style={{marginTop: 10, fontSize: 72, fontWeight: 800, color: C.text, opacity: ep(t, 4.2, 4.7)}}>0</div>
      </Column>
      <Svg>
        <Arrow x1={COL.browser.x + COL.browser.w} y1={330} x2={COL.backend.x} y2={330} p={r1} color={C.cyan} label="POST /privileged" />
        <Arrow x1={COL.browser.x + COL.browser.w} y1={520} x2={COL.backend.x} y2={520} p={r2} color={C.cyan} label="POST /privileged + cookie" />
      </Svg>
      <Pill x={COL.browser.x + 40} y={395} text="401 unauthenticated" color={C.red} o={d1} size={28} />
      <Pill x={COL.browser.x + 40} y={585} text="403 forbidden for this user" color={C.red} o={d2} size={28} />
      <Txt x={M} y={790} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 4.4, 4.9)}>Answered from the backend's own session table and role list. Neither request is forwarded.</Txt>
      <Txt x={M} y={860} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 5, 5.5)}>Observed from the local fixture: no session → 401; u_vik (viewer) → 403; upstream privileged attempts during both: 0</Txt>
    </>
  );
};

/* 7. Allow the authorised request without exposing the secret; refuse an over-broad operation */
const Allow: React.FC<SceneProps> = ({t}) => {
  const r1 = ep(t, 0.4, 1.0);
  const g = ep(t, 1.1, 1.5);
  const up = ep(t, 1.6, 2.3);
  const back1 = ep(t, 2.4, 3.0);
  const back2 = ep(t, 3.1, 3.7);
  const r2 = ep(t, 4.6, 5.2);
  const d2 = ep(t, 5.3, 5.7);
  return (
    <>
      <Overline y={110} color={C.green}>Retest · the authorised request</Overline>
      <Column k="browser" title="Browser" sub="session u_mara · maintainer" accent={C.cyan}>
        <Code x={24} y={330} w={392} size={22} lines={['{ "ok": true,', '  "operation": "rotate_webhook",', '  "performedBy": "u_mara",', '  "webhookVersion": 2 }']} o={back2} />
      </Column>
      <Column k="backend" title="App backend" accent={g > 0.5 ? C.green : C.cyan} glow={g > 0.5}>
        <Gate x={0} y={90} w={392} title="checks" accent={C.green} checks={[{label: 'authenticated', state: g > 0.3 ? 'pass' : 'pending'}, {label: 'role allows it', state: g > 0.6 ? 'pass' : 'pending'}, {label: 'operation on allow-list', state: d2 > 0.5 ? 'fail' : g > 0.9 ? 'pass' : 'pending'}]} />
      </Column>
      <Column k="upstream" title="Mock upstream" accent={back1 > 0.5 ? C.green : C.cyan} glow={up > 0.95 && back1 < 1}>
        <div style={{marginTop: 22, fontSize: 24, color: C.dim}}>privileged calls received:</div>
        <div style={{marginTop: 10, fontSize: 72, fontWeight: 800, color: C.text}}>{up > 0.95 ? 1 : 0}</div>
        <div style={{marginTop: 10, fontSize: 24, color: C.dim}}>credential presented by: <span style={{color: C.green, fontWeight: 700}}>the backend</span></div>
      </Column>
      <Svg>
        <Arrow x1={COL.browser.x + COL.browser.w} y1={330} x2={COL.backend.x} y2={330} p={r1} color={C.cyan} label="rotate_webhook + cookie" />
        <Arrow x1={COL.backend.x + COL.backend.w} y1={330} x2={COL.upstream.x} y2={330} p={up} color={C.red} label={`Bearer ${SEC}`} labelDy={-14} />
        <Arrow x1={COL.upstream.x} y1={400} x2={COL.backend.x + COL.backend.w} y2={400} p={back1} color={C.green} label="200 · webhookVersion 2" labelDy={22} />
        <Arrow x1={COL.backend.x} y1={400} x2={COL.browser.x + COL.browser.w} y2={400} p={back2} color={C.green} label="200 · re-shaped, no secret" labelDy={22} />
        <Arrow x1={COL.browser.x + COL.browser.w} y1={600} x2={COL.backend.x} y2={600} p={r2} color={C.amber} label="delete_project + cookie" labelDy={22} />
      </Svg>
      <Pill x={COL.browser.x + 40} y={640} text="400 operation not permitted" color={C.red} o={d2} size={26} />
      <Txt x={M} y={785} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 3.8, 4.3)}>Body and headers checked: no secret in either. The upstream would perform delete_project for the secret; the backend never asks.</Txt>
      <Txt x={M} y={870} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 5.8, 6.3)}>Observed from the local fixture: u_mara → 200, 1 upstream call, secretInResponse false (5 backend responses checked); delete_project via backend → 400</Txt>
    </>
  );
};

/* 8. Inspect the corrected artefacts */
const RetestScan: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node inspect-artifacts.mjs bundle-corrected', c: C.mute},
    {t: '[control] bundle-flawed: 2 secret-like, 2 identifier-like', c: C.amber},
    {t: '          → scanner can see a planted secret', c: C.amber},
    {t: '[scan] bundle-corrected  files: app.js, index.html', c: C.text},
    {t: '  identifier-like  app.js:4      proj_pub_7…a21', c: C.cyan},
    {t: '  identifier-like  index.html:8  proj_pub_7…a21', c: C.cyan},
    {t: '  → 0 secret-like, 2 identifier-like', c: C.green},
    {t: 'Note: 0 in these files does not prove every path is clean', c: C.amber},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · inspect what the browser receives</Overline>
      <Log x={M} y={170} w={1120} lines={lines} shown={prog(t, 0.3, 4.6) * lines.length} title="Executed · artefact inspection" size={24} />
      <Box x={M + 1180} y={170} w={548} h={120} title="Scanned" sub="JavaScript · HTML · config payload (/config)" accent={C.cyan} o={ep(t, 0.8, 1.2)} titleSize={26} />
      <Box x={M + 1180} y={310} w={548} h={120} title="Source maps" sub="scanned if produced · this build produced none" accent={C.amber} o={ep(t, 1.6, 2.0)} titleSize={26} />
      <Box x={M + 1180} y={450} w={548} h={120} title="Control first" sub="flawed bundle: 2 secret-like found" accent={C.amber} o={ep(t, 2.6, 3.0)} titleSize={26} />
      <Box x={M + 1180} y={590} w={548} h={120} title="Corrected bundle" sub="0 secret-like · 2 identifier-like" accent={C.green} o={ep(t, 3.8, 4.2)} titleSize={26} />
      <Txt x={M} y={620} w={1120} size={28} color={C.amber} o={ep(t, 4.8, 5.3)}>Zero in these files is not zero everywhere: other routes, server-rendered pages, logs, caches, third-party scripts and history are outside this scan.</Txt>
      <Txt x={M} y={860} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 5.4, 5.9)}>Observed from the local fixture: evidence.json → flawedBundle.secretLike 2, correctedBundle.secretLike 0, identifierLike 2</Txt>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={250} align="center" size={78} o={ep(t, 0.2, 0.9)}>A public identifier names something.<br />A secret grants capability.</Big>
    <Txt x={M} y={520} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Some vendors ship browser keys with deliberately limited capability. This fictional fixture settles nothing about any real provider's policy. CORS is not authentication or authorisation.</Txt>
    <Txt x={M} y={660} w={W - 2 * M} align="center" size={30} color={C.amber} o={ep(t, 2.6, 3.2)}>A leaked production secret must be revoked or rotated at the issuer. Removing it from the bundle revokes no copies already downloaded.</Txt>
    <Txt x={M} y={790} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.4, 4)}>Local fixture, synthetic credentials, loopback only. A clean scan of tested assets is not proof that every leak is closed.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {inspect_leak: InspectLeak, ask: Ask, public_fail: PublicFail, secret_ok: SecretOk, fix: Fix, reject: Reject, allow: Allow, retest_scan: RetestScan, end: End};
