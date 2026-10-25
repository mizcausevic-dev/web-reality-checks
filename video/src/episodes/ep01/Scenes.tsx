import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, window as win, step, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Layout constants shared across scenes */
const LY = {browser: 150, session: 350, api: 550, db: 750};
const LH = 150;

const LayerStack: React.FC<{t: number; show?: number; highlight?: string}> = ({t, show = 4, highlight}) => (
  <>
    {(['browser', 'session', 'api', 'db'] as const).slice(0, show).map((k, i) => {
      const o = ep(t, 0.2 * i, 0.2 * i + 0.4);
      const acc = highlight === k ? C.cyan : C.mute;
      const label = k === 'browser' ? 'Browser' : k === 'session' ? 'Server-side session' : k === 'api' ? 'API' : 'Database';
      return <Lane key={k} y={LY[k]} h={LH} label={label} accent={acc} o={o} />;
    })}
  </>
);

/* 1. Polished app says "Demo complete" */
const Demo: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.6);
  const check = ep(t, 0.8, 1.4);
  return (
    <>
      <Box x={420} y={190} w={1080} h={640} accent={C.line} o={o} fill="#14171e">
        <div style={{display: 'flex', gap: 14, marginBottom: 26}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.6}} />)}
          <div style={{marginLeft: 20, color: C.mute, fontSize: 22, fontFamily: 'DejaVu Sans Mono'}}>https://app.example.test/projects</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, height: 470}}>
          <div style={{borderRight: `1px solid ${C.line}`, paddingRight: 20}}>
            {['Projects', 'Tasks', 'Members', 'Settings'].map((n, i) => <div key={n} style={{padding: '14px 18px', borderRadius: 10, background: i === 0 ? '#1f2430' : 'transparent', color: i === 0 ? C.text : C.dim, fontSize: 26, marginBottom: 8}}>{n}</div>)}
          </div>
          <div>
            {['Private roadmap', 'Launch checklist', 'Q4 budget'].map((n, i) => <div key={n} style={{padding: '18px 22px', borderRadius: 12, background: '#1a1e27', marginBottom: 14, fontSize: 28, color: C.text, display: 'flex', justifyContent: 'space-between'}}><span>{n}</span><span style={{color: C.mute, fontSize: 22}}>owner · you</span></div>)}
            <div style={{marginTop: 40, display: 'flex', alignItems: 'center', gap: 18, opacity: check}}>
              <div style={{width: 54, height: 54, borderRadius: 27, background: C.green, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800}}>✓</div>
              <div style={{fontSize: 44, fontWeight: 800, color: C.text}}>Demo complete.</div>
            </div>
          </div>
        </div>
      </Box>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={34} color={C.amber} o={ep(t, 3.4, 4)}>But who is allowed to see what? The interface cannot answer that.</Txt>
    </>
  );
};

/* 2. Reveal layers */
const Layers: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>The request path</Overline>
    <LayerStack t={t} />
    <Badge x={M + 60} y={LY.browser + 70} label="user" value="Alice" color={C.cyan} o={ep(t, 0.4, 0.8)} />
    <Badge x={M + 60} y={LY.session + 70} label="session" value="sid → u_alice" color={C.cyan} o={ep(t, 0.9, 1.3)} />
    <Pill x={M + 60} y={LY.api + 66} text="GET /projects/:id" color={C.cyanDim} o={ep(t, 1.4, 1.8)} mono />
    <Box x={M + 60} y={LY.db + 56} w={360} h={70} title="p_1001 · owner u_alice" titleSize={24} accent={C.cyan} o={ep(t, 1.9, 2.3)} />
    <Box x={M + 460} y={LY.db + 56} w={360} h={70} title="p_2002 · owner u_bob" titleSize={24} accent={C.amber} o={ep(t, 2.1, 2.5)} />
  </>
);

/* 3. Alice reads her own project */
const AliceOk: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.6, 1.4);
  const p2 = ep(t, 1.6, 2.4);
  const p3 = ep(t, 2.6, 3.2);
  const back = ep(t, 3.6, 4.6);
  return (
    <>
      <LayerStack t={0.9} />
      <Badge x={M + 60} y={LY.browser + 70} label="user" value="Alice" />
      <Badge x={M + 60} y={LY.session + 70} label="session" value="sid → u_alice" o={step(t, 0.6)} />
      <Svg>
        <Arrow x1={700} y1={LY.browser + 100} x2={700} y2={LY.session + 60} p={p1} label="GET /projects/p_1001 + cookie" labelDy={-8} />
        <Arrow x1={700} y1={LY.session + 110} x2={700} y2={LY.api + 60} p={p2} label="authenticated as u_alice" />
        <Arrow x1={700} y1={LY.api + 110} x2={700} y2={LY.db + 60} p={p3} label="lookup p_1001" />
        <Arrow x1={1100} y1={LY.db + 60} x2={1100} y2={LY.browser + 110} p={back} color={C.green} label="200 OK · p_1001" labelDy={-20} />
      </Svg>
      <Box x={M + 60} y={LY.db + 56} w={360} h={70} title="p_1001 · owner u_alice" titleSize={24} accent={C.green} glow={p3 > 0.9} />
      <Box x={M + 460} y={LY.db + 56} w={360} h={70} title="p_2002 · owner u_bob" titleSize={24} accent={C.mute} />
      <Pill x={1240} y={LY.browser + 60} text="200 OK" color={C.green} o={back} size={30} />
      <Txt x={M} y={900} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.8, 5.3)}>Observed from the local fixture: GET /vuln/projects/p_1001 → 200</Txt>
    </>
  );
};

/* 4. Controlled test: request Bob's project as Alice */
const BobRequest: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.8, 1.6);
  return (
    <>
      <LayerStack t={0.9} />
      <Badge x={M + 60} y={LY.browser + 70} label="user" value="Alice" />
      <Badge x={M + 60} y={LY.session + 70} label="session" value="sid → u_alice" />
      <Overline y={110} color={C.amber}>Controlled test</Overline>
      <Svg>
        <Arrow x1={700} y1={LY.browser + 100} x2={700} y2={LY.session + 60} p={p1} color={C.amber} label="GET /projects/p_2002 + Alice's cookie" labelDy={-8} />
      </Svg>
      <Box x={M + 60} y={LY.db + 56} w={360} h={70} title="p_1001 · owner u_alice" titleSize={24} accent={C.mute} />
      <Box x={M + 460} y={LY.db + 56} w={360} h={70} title="p_2002 · owner u_bob" titleSize={24} accent={C.amber} glow={t > 2} o={1} />
      <Badge x={M + 860} y={LY.db + 62} label="resource owner" value="Bob" color={C.amber} o={ep(t, 2, 2.5)} />
      <Badge x={M + 860} y={LY.session + 62} label="authenticated" value="Alice" color={C.cyan} o={ep(t, 2.2, 2.7)} />
      <Txt x={M + 860} y={LY.session + 130} w={700} size={26} color={C.amber} o={ep(t, 2.8, 3.3)}>Two different people. Will the server notice?</Txt>
    </>
  );
};

/* 5. The vulnerable endpoint leaks */
const Leak: React.FC<SceneProps> = ({t}) => {
  const p2 = ep(t, 0.2, 0.9);
  const p3 = ep(t, 1.0, 1.6);
  const back = ep(t, 1.9, 2.9);
  return (
    <>
      <LayerStack t={0.9} />
      <Badge x={M + 60} y={LY.browser + 70} label="user" value="Alice" />
      <Badge x={M + 60} y={LY.session + 70} label="session" value="sid → u_alice" />
      <Svg>
        <Arrow x1={700} y1={LY.session + 110} x2={700} y2={LY.api + 60} p={p2} color={C.amber} label="authenticated? yes" />
        <Arrow x1={700} y1={LY.api + 110} x2={700} y2={LY.db + 60} p={p3} color={C.red} label="findProjectById('p_2002')" />
        <Arrow x1={1100} y1={LY.db + 60} x2={1100} y2={LY.browser + 110} p={back} color={C.red} label="200 OK · Bob's data" labelDy={-20} />
      </Svg>
      <Box x={M + 60} y={LY.db + 56} w={360} h={70} title="p_1001 · owner u_alice" titleSize={24} accent={C.mute} />
      <Box x={M + 460} y={LY.db + 56} w={360} h={70} title="p_2002 · owner u_bob" titleSize={24} accent={C.red} glow={p3 > 0.9} />
      <Pill x={1240} y={LY.browser + 60} text="200 OK  ← should be 404" color={C.red} o={back} size={30} />
      <Box x={1180} y={LY.api + 50} w={620} h={92} accent={C.red} o={ep(t, 3.2, 3.7)} fill="#1c1012">
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.cyan}}>authenticated</span> <span style={{color: C.mute}}>was mistaken for</span> <span style={{color: C.red}}>authorised</span></div>
      </Box>
      <Txt x={M} y={900} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 3.8, 4.3)}>Observed from the local fixture: GET /vuln/projects/p_2002 as Alice → 200, ownerId "u_bob"</Txt>
    </>
  );
};

/* 6. Freeze at the gate */
const Freeze: React.FC<SceneProps> = ({t}) => {
  const q2 = step(t, 2.2);
  return (
    <>
      <Overline y={110} color={C.red}>Freeze frame · the gate</Overline>
      <Gate x={M} y={190} w={760} title="Vulnerable gate" accent={C.red} checks={[{label: 'A user exists for this session', state: 'pass'}, {label: 'That user owns this resource', state: q2 ? 'missing' : 'pending'}]} />
      <Code x={M + 820} y={190} w={908} title="server.mjs · vulnerable read" size={26} hi={[2]} hiColor={C.red} lines={[
        "if (!user) return 401;",
        "const p = findProjectById(id);",
        "// missing: p.ownerId === user.id",
        "if (!p) return 404;",
        "return 200, p;",
      ]} />
      <Badge x={M} y={600} label="authenticated user" value="Alice" color={C.cyan} big />
      <Badge x={M + 420} y={600} label="resource owner" value="Bob" color={C.amber} big />
      <Txt x={M + 880} y={600} w={900} size={40} weight={700} color={C.red} o={ep(t, 2.4, 3)}>{'Alice ≠ Bob, and nothing compared them.'}</Txt>
      <Txt x={M} y={720} w={W - 2 * M} size={32} color={C.dim} o={ep(t, 4, 4.6)}>One missing condition. The interface could never have shown it.</Txt>
    </>
  );
};

/* 7. Apply the ownership-scoped query */
const Fix: React.FC<SceneProps> = ({t}) => {
  const swap = ep(t, 1.2, 2.0);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · ownership-scoped query</Overline>
      <Code x={M} y={190} w={1000} title="server.mjs · corrected read" size={26} hi={[1, 2]} hiColor={C.green} lines={[
        "if (!user) return 401;",
        "const p = findProjectForOwner(id, user.id);",
        "// WHERE id = :id AND owner_id = :user",
        "if (!p) return 404; // absent OR not hers",
        "return 200, p;",
      ]} />
      <Gate x={M + 1060} y={190} w={668} title="Corrected gate" accent={C.green} checks={[{label: 'A user exists for this session', state: 'pass'}, {label: 'That user owns this resource', state: swap > 0.5 ? 'pass' : 'pending'}]} />
      <Txt x={M} y={560} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3, 3.5)}>Identity is resolved on the server, never read from the request. The lookup is constrained by both project ID and owner ID.</Txt>
      <Box x={M} y={680} w={W - 2 * M} h={120} accent={C.amber} dashed o={ep(t, 4.5, 5)} fill="transparent">
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE POLICY</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>404 for both "does not exist" and "not yours", so the response does not confirm that someone else's project ID is real.</div>
      </Box>
    </>
  );
};

/* 8. Retest */
const Retest: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep01-authz/test.mjs', c: C.mute},
    {t: '✓ unauthenticated request is rejected (401)', c: C.green},
    {t: "✓ Alice can read Alice's project (200)", c: C.green},
    {t: "✓ control: vulnerable endpoint leaks Bob's project (200)", c: C.amber},
    {t: "✓ Alice cannot read Bob's project after repair (404)", c: C.green},
    {t: '✓ absent project also 404', c: C.green},
    {t: '✓ client-side identity claims do not bypass (404)', c: C.green},
    {t: '✓ logout invalidates session (401)', c: C.green},
    {t: '# pass 7  fail 0', c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · same scenario</Overline>
      <Log x={M} y={170} w={1100} lines={lines} shown={prog(t, 0.3, 4.5) * lines.length} title="Executed · node:test output" />
      <Box x={M + 1160} y={170} w={568} h={110} title="GET /projects/p_1001 as Alice" sub="200 OK" accent={C.green} o={ep(t, 1.2, 1.6)} titleSize={26} />
      <Box x={M + 1160} y={310} w={568} h={110} title="GET /projects/p_2002 as Alice" sub="404 Not Found" accent={C.red} o={ep(t, 2.4, 2.8)} titleSize={26} />
      <Box x={M + 1160} y={450} w={568} h={150} title="…?user=u_bob + X-User-Id: u_bob" sub="404 — the server never read those" accent={C.amber} o={ep(t, 3.8, 4.2)} titleSize={26} />
      <Txt x={M + 1160} y={640} w={568} size={26} color={C.dim} o={ep(t, 4.4, 4.9)}>Changing the client's UI state cannot change what the session table says.</Txt>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={330} align="center" size={84} o={ep(t, 0.2, 0.9)}>A working interface is not<br />an authorization test.</Big>
    <Txt x={M} y={620} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>This repair covers one read endpoint. Lists, writes, exports and admin paths each need the same ownership test.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, synthetic users, loopback only. Not a claim that the application is now fully secure.</Txt>
  </>
);

export const scenes = {demo: Demo, layers: Layers, alice_ok: AliceOk, bob_request: BobRequest, leak: Leak, freeze: Freeze, fix: Fix, retest: Retest, end: End};
