import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Readout, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ---------- shared layout: the four parts, left to right ---------- */
const PX = {ui: M, store: M + 450, module: M + 900, collector: M + 1350};
const PW = 378;
const PY = 300;
const PH = 240;
const PARTS: {k: keyof typeof PX; title: string; sub: string}[] = [
  {k: 'ui', title: 'Consent UI', sub: 'Accept · Reject · Settings'},
  {k: 'store', title: 'Preference store', sub: 'remembers the choice'},
  {k: 'module', title: 'Analytics module', sub: 'simulated · optional'},
  {k: 'collector', title: 'Local collector', sub: 'records every request'},
];
const Parts: React.FC<{t: number; accents?: Partial<Record<keyof typeof PX, string>>; stagger?: number}> = ({t, accents = {}, stagger = 0.25}) => (
  <>
    {PARTS.map((p, i) => (
      <Box key={p.k} x={PX[p.k]} y={PY} w={PW} h={PH} title={p.title} sub={p.sub} accent={accents[p.k] ?? C.mute} o={ep(t, stagger * i, stagger * i + 0.4)} titleSize={30} />
    ))}
  </>
);

/* A small illustrative "button" used inside the plain Box chrome. Never mimics a real product. */
const Btn: React.FC<{label: string; color?: string; pressed?: number}> = ({label, color = C.line, pressed = 0}) => (
  <div style={{padding: '12px 22px', borderRadius: 10, border: `2px solid ${color}`, background: pressed > 0 ? `${color}44` : 'transparent', color: C.text, fontSize: 24, fontWeight: 600, transform: `scale(${1 - 0.06 * pressed})`}}>{label}</div>
);

/* State-machine node */
const SNode: React.FC<{x: number; y: number; label: string; active: boolean; color: string; o?: number}> = ({x, y, label, active, color, o = 1}) => (
  <div style={{position: 'absolute', left: x - 120, top: y - 36, width: 240, height: 72, opacity: o, borderRadius: 36, border: `3px solid ${active ? color : C.mute}`, background: active ? `${color}26` : C.panel, boxShadow: active ? `0 0 30px ${color}66` : 'none', color: active ? C.text : C.dim, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>{label}</div>
);

/* 1. Reject optional — the flawed page keeps sending. Numbers from evidence.json (flawed run: 4). */
const Fail: React.FC<SceneProps> = ({t}) => {
  const press = Math.min(ep(t, 1.0, 1.25), 1 - ep(t, 1.25, 1.5));
  const bannerGone = ep(t, 1.6, 2.2);
  const stored = ep(t, 1.8, 2.3);
  // three requests after the click (flush), a fourth after reload
  const sends = [3.0, 3.7, 4.4, 6.6];
  const received = sends.filter((s) => t >= s + 0.8).length;
  const reload = ep(t, 5.6, 6.0);
  return (
    <>
      <Box x={M} y={150} w={1040} h={720} accent={C.line} fill="#14171e">
        <div style={{display: 'flex', gap: 14, marginBottom: 18}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.6}} />)}
          <div style={{marginLeft: 20, color: C.mute, fontSize: 22, fontFamily: 'DejaVu Sans Mono'}}>http://127.0.0.1/  ·  illustrative page</div>
        </div>
        {[0, 1, 2].map((i) => <div key={i} style={{height: 26, borderRadius: 8, background: '#1a1e27', marginBottom: 16, width: `${[92, 78, 64][i]}%`}} />)}
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 24, padding: '22px 26px', borderRadius: 14, border: `2px solid ${C.amber}`, background: '#1a1a14', opacity: 1 - bannerGone, transform: `translateY(${bannerGone * 40}px)`}}>
          <div style={{fontSize: 26, color: C.text, marginBottom: 16}}>This page would like to use optional analytics.</div>
          <div style={{display: 'flex', gap: 16}}>
            <Btn label="Accept optional" color={C.cyanDim} />
            <Btn label="Reject optional" color={C.amber} pressed={press} />
            <Btn label="Settings" />
          </div>
        </div>
        <div style={{position: 'absolute', left: 24, bottom: 24, padding: '14px 22px', borderRadius: 10, border: `2px dashed ${C.mute}`, color: C.dim, fontSize: 24, opacity: reload}}>reload — stored choice: rejected · banner not shown</div>
      </Box>
      <Badge x={M + 1100} y={170} label="stored preference" value={stored > 0.5 ? 'rejected' : 'no_choice'} color={stored > 0.5 ? C.amber : C.mute} />
      <Box x={M + 1100} y={260} w={628} h={300} title="Local collector" sub="SIMULATED · receives analytics requests" accent={received > 0 ? C.red : C.mute} glow={received > 0} titleSize={30}>
        <Readout x={120} y={110} w={380} label="requests received" value={received} color={received > 0 ? C.red : C.mute} />
      </Box>
      <Svg>
        {sends.map((s, i) => <Arrow key={i} x1={1136} y1={560 - i * 60} x2={M + 1100} y2={420} p={Math.min(ep(t, s, s + 0.8), 1)} color={C.red} o={t >= s && t < s + 1.2 ? 1 : 0} />)}
      </Svg>
      {sends.map((s, i) => <Token key={i} x1={1000} y1={560 - i * 60} x2={M + 1140} y2={400} p={ep(t, s, s + 0.8)} text={i === 0 ? 'page_view' : i === 3 ? 'page_view (reload)' : 'interaction'} color={C.red} o={t >= s && t < s + 0.85 ? 1 : 0} />)}
      <Txt x={M + 1100} y={600} w={628} size={28} color={C.red} weight={700} o={ep(t, 4.0, 4.5)}>Choice stored. Requests sent anyway.</Txt>
      <Txt x={M + 1100} y={660} w={628} size={24} color={C.dim} o={ep(t, 7.6, 8.1)}>Observed from the local fixture (flawed page): 4 optional requests received, 3 stamped consentState "rejected".</Txt>
    </>
  );
};

/* 2. Reveal the four parts */
const Layers: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>The parts involved</Overline>
    <Parts t={t} accents={{ui: C.cyan, store: C.cyan, module: C.amber, collector: C.amber}} />
    <Svg>
      <Arrow x1={PX.ui + PW} y1={PY + PH / 2} x2={PX.store} y2={PY + PH / 2} p={ep(t, 1.3, 1.9)} color={C.cyan} label="writes choice" />
      <Arrow x1={PX.module + PW} y1={PY + PH / 2} x2={PX.collector} y2={PY + PH / 2} p={ep(t, 2.0, 2.6)} color={C.amber} label="POST /collect" />
    </Svg>
    <Pill x={PX.ui + 24} y={PY + 150} text="Accept · Reject · Settings" color={C.cyanDim} o={ep(t, 0.8, 1.2)} />
    <Pill x={PX.store + 24} y={PY + 150} text='{ state: "…" }' color={C.cyanDim} o={ep(t, 1.4, 1.8)} mono />
    <Pill x={PX.module + 24} y={PY + 150} text="init · track · flush" color={C.amberDim} o={ep(t, 2.0, 2.4)} mono />
    <Pill x={PX.collector + 24} y={PY + 150} text="127.0.0.1 only" color={C.amberDim} o={ep(t, 2.6, 3.0)} mono />
    <Box x={M} y={640} w={W - 2 * M} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 3.4, 4.0)}>
      <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>SIMULATED</div>
      <div style={{fontSize: 26, color: C.text, marginTop: 6}}>The analytics module and the collector are local stand-ins. No real analytics or advertising service is contacted.</div>
    </Box>
  </>
);

/* 3. The missing connection between preference and execution */
const Gap: React.FC<SceneProps> = ({t}) => {
  const miss = step(t, 2.0);
  return (
    <>
      <Overline y={110} color={C.red}>Where the wiring stops</Overline>
      <Parts t={0.9} accents={{ui: C.cyan, store: C.cyan, module: C.red, collector: C.red}} stagger={0} />
      <Svg>
        <Arrow x1={PX.ui + PW} y1={PY + 80} x2={PX.store} y2={PY + 80} p={ep(t, 0.4, 1.0)} color={C.cyan} label="writes" />
        <Arrow x1={PX.store + PW} y1={PY + 80} x2={PX.module} y2={PY + 80} p={ep(t, 1.4, 2.0)} color={C.red} dashed label="never read" />
        <Arrow x1={PX.module + PW} y1={PY + 170} x2={PX.collector} y2={PY + 170} p={ep(t, 3.6, 4.2)} color={C.red} label="sends regardless" />
      </Svg>
      {miss ? <Pill x={PX.store + PW + 8} y={PY + 100} text="✕" color={C.red} size={28} /> : null}
      <Code x={M} y={600} w={900} title="page-flawed.mjs · load()" size={26} hi={[2]} hiColor={C.red} lines={[
        'const stored = store.read();',
        'ui.bannerVisible = stored.state === "no_choice";',
        'analytics.init();   // no consent check',
        '// init → listeners → track → flush',
        '// none of them reads consent.state',
      ]} o={ep(t, 2.6, 3.1)} />
      <Gate x={M + 960} y={600} w={768} title="Flawed emission path" accent={C.red} o={ep(t, 4.4, 4.9)} checks={[
        {label: 'init: is optional consent accepted?', state: 'missing'},
        {label: 'track: still accepted?', state: 'missing'},
        {label: 'flush: still accepted?', state: 'missing'},
      ]} />
      <Badge x={PX.module + 24} y={PY + 160} label="id" value="cid_… in memory · no cookie" color={C.amber} o={ep(t, 6.0, 6.5)} />
      <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.8, 7.3)}>Tracking does not require a cookie. The requests are same-origin ("first-party") and still optional.</Txt>
    </>
  );
};

/* 4. The repair: explicit state machine driving one gate */
const Fix: React.FC<SceneProps> = ({t}) => {
  // Walk the machine: no_choice (0–2.4) → accepted (2.4–5.2) → withdrawn (5.2+)
  const st = t < 2.4 ? 'no_choice' : t < 5.2 ? 'accepted' : 'withdrawn';
  const open = st === 'accepted';
  const nx = {no_choice: 330, rejected: 330, accepted: 820, withdrawn: 1310};
  const ny = {no_choice: 230, rejected: 400, accepted: 230, withdrawn: 230};
  const col = {no_choice: C.amber, rejected: C.red, accepted: C.green, withdrawn: C.red};
  return (
    <>
      <Overline y={110} color={C.green}>The repair · consent state machine → event gate</Overline>
      <Svg>
        <Arrow x1={nx.no_choice + 120} y1={ny.no_choice} x2={nx.accepted - 120} y2={ny.accepted} p={ep(t, 0.6, 1.2)} color={C.dim} label="accept" />
        <Arrow x1={nx.no_choice + 60} y1={ny.no_choice + 36} x2={nx.rejected + 60} y2={ny.rejected - 36} p={ep(t, 0.6, 1.2)} color={C.dim} />
        <Arrow x1={nx.accepted + 120} y1={ny.accepted} x2={nx.withdrawn - 120} y2={ny.withdrawn} p={ep(t, 0.9, 1.5)} color={C.dim} label="withdraw" />
        <Arrow x1={nx.accepted} y1={ny.accepted + 36} x2={nx.accepted} y2={560} p={ep(t, 1.6, 2.2)} color={open ? C.green : C.mute} label="drives the gate" />
      </Svg>
      <Txt x={nx.no_choice + 80} y={ny.no_choice + 60} size={24} color={C.dim} o={ep(t, 0.9, 1.3)}>reject</Txt>
      <SNode x={nx.no_choice} y={ny.no_choice} label="no_choice" active={st === 'no_choice'} color={col.no_choice} o={ep(t, 0, 0.4)} />
      <SNode x={nx.rejected} y={ny.rejected} label="rejected" active={false} color={col.rejected} o={ep(t, 0.2, 0.6)} />
      <SNode x={nx.accepted} y={ny.accepted} label="accepted" active={st === 'accepted'} color={col.accepted} o={ep(t, 0.4, 0.8)} />
      <SNode x={nx.withdrawn} y={ny.withdrawn} label="withdrawn" active={st === 'withdrawn'} color={col.withdrawn} o={ep(t, 0.6, 1.0)} />
      <Gate x={M} y={580} w={760} title={`Event gate · ${open ? 'OPEN' : 'CLOSED'}`} accent={open ? C.green : C.red} o={ep(t, 1.8, 2.3)} checks={[
        {label: 'init: consent is accepted', state: open ? 'pass' : 'fail'},
        {label: 'track: consent is accepted', state: open ? 'pass' : 'fail'},
        {label: 'flush: consent is accepted', state: open ? 'pass' : 'fail'},
      ]} />
      <Code x={M + 820} y={580} w={908} title="page-corrected.mjs" size={26} hi={st === 'withdrawn' ? [4, 5] : [0, 1]} hiColor={C.green} o={ep(t, 2.4, 2.9)} lines={[
        'const optionalAllowed = s => s === "accepted";',
        'if (!gate.check("init"))  return;  // 1',
        'if (!gate.check("track")) return;  // 2',
        'if (!gate.check("flush")) { queue = []; } // 3',
        'teardown(): remove listeners,',
        '            drop unsent queue',
      ]} />
      <Txt x={M} y={860} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5.6, 6.1)}>Withdrawal closes the gate, removes optional listeners and clears the unsent queue. The stored preference may remain.</Txt>
    </>
  );
};

/* 5. Retest every state. Values from evidence.json (corrected runs). */
const Retest: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep11-consent-gate/test.mjs', c: C.mute},
    {t: '✓ no choice → zero optional requests', c: C.green},
    {t: '✓ reject → zero optional requests', c: C.green},
    {t: '✓ accept → optional requests flow (3)', c: C.green},
    {t: '✓ withdraw → listeners removed, queue cleared', c: C.green},
    {t: '✓ reload with stored rejection → still zero', c: C.green},
    {t: '✓ reload with stored acceptance → resumes', c: C.green},
    {t: '✓ invalid transitions rejected', c: C.green},
    {t: '✓ CONTROL: flawed page emits after reject', c: C.amber},
    {t: '✓ CONTROL: flawed emits before choice + after reload', c: C.amber},
    {t: '✓ collector rejects malformed envelopes', c: C.green},
    {t: '# pass 10  fail 0', c: C.text},
  ];
  const cells: {label: string; value: string; color: string; at: number}[] = [
    {label: 'no choice', value: '0', color: C.green, at: 0.8},
    {label: 'rejected', value: '0', color: C.green, at: 1.6},
    {label: 'reload · stored rejection', value: '0', color: C.green, at: 2.4},
    {label: 'accepted', value: '3', color: C.cyan, at: 3.4},
    {label: 'after withdraw', value: '3', color: C.green, at: 4.4},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · corrected page, every state</Overline>
      <Log x={M} y={170} w={1000} lines={lines} shown={prog(t, 0.3, 5.5) * lines.length} title="Executed · node:test output" size={23} />
      {cells.map((c, i) => <Readout key={c.label} x={M + 1060} y={170 + i * 118} w={660} label={`${c.label} · optional requests`} value={c.value} color={c.color} o={ep(t, c.at, c.at + 0.4)} />)}
      <Txt x={M} y={760} w={1000} size={26} color={C.dim} o={ep(t, 5.0, 5.5)}>Withdraw: 1 unsent event dropped, 0 listeners left, banner stays hidden after reload.</Txt>
      <Txt x={M} y={830} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 5.6, 6.1)}>Observed from the local fixture: evidence.json · summary.corrected</Txt>
    </>
  );
};

/* 6. The actual collector logs (collector-log-flawed.json / collector-log-corrected.json) */
const Logs: React.FC<SceneProps> = ({t}) => {
  const flawed = [
    {t: 'seq  event        consentState  pageMode', c: C.mute},
    {t: '1    page_view    no_choice     flawed', c: C.amber},
    {t: '2    interaction  rejected      flawed', c: C.red},
    {t: '3    interaction  rejected      flawed', c: C.red},
    {t: '4    page_view    rejected      flawed', c: C.red},
    {t: 'count: 4', c: C.text},
  ];
  const fixed = [
    {t: 'seq  event        consentState  pageMode', c: C.mute},
    {t: '1    page_view    accepted      corrected', c: C.cyan},
    {t: '2    interaction  accepted      corrected', c: C.cyan},
    {t: '3    interaction  accepted      corrected', c: C.cyan},
    {t: 'count: 3   (nothing from no_choice, rejected, withdrawn)', c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.amber}>Collector logs · real output of demo.mjs</Overline>
      <Log x={M} y={170} w={840} lines={flawed} shown={prog(t, 0.3, 2.4) * flawed.length} title="collector-log-flawed.json" size={24} />
      <Log x={M + 888} y={170} w={840} lines={fixed} shown={prog(t, 2.0, 4.0) * fixed.length} title="collector-log-corrected.json" size={24} />
      <Readout x={M + 240} y={470} w={360} label="flawed · received" value={4} color={C.red} o={ep(t, 2.4, 2.9)} />
      <Readout x={M + 1128} y={470} w={360} label="corrected · received" value={3} color={C.cyan} o={ep(t, 4.0, 4.5)} />
      <Box x={M} y={680} w={W - 2 * M} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 5.0, 5.6)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>HONEST LIMIT</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>The 3 requests sent while accepted are still in the collector after withdrawal. Stopping future requests does not delete collected data, and a request that reached a server cannot be cancelled.</div>
      </Box>
    </>
  );
};

/* 7. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>The button is a promise.<br />The requests show the implementation.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>First-party does not mean necessary or exempt. A banner is not a compliance certificate, and neither is this fixture.</Txt>
    <Txt x={M} y={690} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3.0)}>Simulated analytics, local loopback collector, synthetic data. Not a legal compliance certification. No real analytics or advertising service was contacted.</Txt>
  </>
);

export const scenes = {fail: Fail, layers: Layers, gap: Gap, fix: Fix, retest: Retest, logs: Logs, end: End};
