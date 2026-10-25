import React from 'react';
import {Img, staticFile} from 'remotion';
import {Arrow, Badge, Big, Box, Overline, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Real product frame, scaled to width w and cropped from the top to height h (hides the baked-in caption strip). */
const Shot: React.FC<{src: string; x: number; y: number; w: number; h: number; o?: number}> = ({src, x, y, w, h, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, overflow: 'hidden', borderRadius: 14, border: `3px solid ${C.line}`, boxSizing: 'border-box'}}>
    <Img src={staticFile(src)} style={{width: w, display: 'block'}} />
  </div>
);

/* 1. The demo went perfectly */
const Hook: React.FC<SceneProps> = ({t}) => {
  const rows = ['Sign-in works', 'Every page loads', 'Checkout completes'];
  return (
    <>
      <Box x={420} y={150} w={1080} h={560} accent={C.line} o={ep(t, 0, 0.6)} fill="#14171e">
        <div style={{display: 'flex', gap: 14, marginBottom: 30}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.6}} />)}
          <div style={{marginLeft: 20, color: C.mute, fontSize: 24, fontFamily: F.mono}}>illustrative demo</div>
        </div>
        {rows.map((r, i) => (
          <div key={r} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '14px 8px', opacity: ep(t, 0.8 + i * 0.7, 1.3 + i * 0.7)}}>
            <div style={{width: 52, height: 52, borderRadius: 26, background: C.green, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800}}>✓</div>
            <div style={{fontSize: 40, fontWeight: 700, color: C.text}}>{r}</div>
          </div>
        ))}
        <div style={{marginTop: 26, fontSize: 52, fontWeight: 800, color: C.green, opacity: ep(t, 3.2, 3.8)}}>Demo complete.</div>
      </Box>
      <Big y={750} align="center" size={50} color={C.amber} o={ep(t, 4.6, 5.4)}>Questions the demo cannot answer</Big>
    </>
  );
};

/* 2. What a demo never shows */
const Problem: React.FC<SceneProps> = ({t}) => {
  const cards = [
    {k: 'A customer asks', v: "for someone else's data", code: 'GET /projects/p_2002', col: C.red, at: 0.5},
    {k: 'A payment retried', v: 'after a lost response', code: 'attempt 1 lost, attempt 2', col: C.amber, at: 3.2},
    {k: 'A dashboard says', v: 'Live, with old data', code: 'updated 0 s ago', col: C.cyan, at: 6},
  ];
  return (
    <>
      <Overline y={110}>What a demo never shows</Overline>
      {cards.map((c, i) => {
        const x = 120 + i * 580;
        return (
          <Box key={c.k} x={x} y={190} w={520} h={470} accent={c.col} glow={t > c.at + 0.4 && t < c.at + 2.4} o={ep(t, c.at, c.at + 0.6)}>
            <div style={{fontSize: 24, color: c.col, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 20}}>Question {i + 1}</div>
            <div style={{fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1.12}}>{c.k}</div>
            <div style={{fontSize: 44, fontWeight: 800, color: c.col, lineHeight: 1.12, marginBottom: 30}}>{c.v}</div>
            <div style={{fontFamily: F.mono, fontSize: 26, color: C.dim, background: '#0d0f14', padding: '14px 18px', borderRadius: 10}}>{c.code}</div>
          </Box>
        );
      })}
      <Txt x={M} y={740} w={W - 2 * M} align="center" size={32} color={C.dim} o={ep(t, 7.4, 8.2)}>Illustrations of the questions. The real results come next.</Txt>
    </>
  );
};

/* 3. Flaw, control, repair, retest */
const Method: React.FC<SceneProps> = ({t}) => {
  const steps = [
    {n: 1, name: 'Flaw', text: 'Reproduce the failure on a local, synthetic fixture.', col: C.red},
    {n: 2, name: 'Control', text: 'A known-positive test proves the check can fail.', col: C.amber},
    {n: 3, name: 'Repair', text: 'The smallest fix, with its limits stated.', col: C.cyan},
    {n: 4, name: 'Retest', text: 'Same test, same schedule, real numbers.', col: C.green},
  ];
  return (
    <>
      <Overline y={110}>The method</Overline>
      {steps.map((s, i) => {
        const at = 0.6 + i * 2;
        const x = 120 + i * 430;
        return (
          <Box key={s.name} x={x} y={230} w={380} h={400} accent={s.col} glow={t > at + 0.3 && t < at + 2} o={ep(t, at, at + 0.5)}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22}}>
              <div style={{width: 56, height: 56, borderRadius: 28, border: `3px solid ${s.col}`, color: s.col, fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{s.n}</div>
              <div style={{fontSize: 44, fontWeight: 800}}>{s.name}</div>
            </div>
            <div style={{fontSize: 30, color: C.dim, lineHeight: 1.3}}>{s.text}</div>
          </Box>
        );
      })}
      <Svg>
        {[0, 1, 2].map((i) => (
          <Arrow key={i} x1={502 + i * 430} y1={430} x2={546 + i * 430} y2={430} p={ep(t, 1.4 + i * 2, 1.9 + i * 2)} color={C.dim} />
        ))}
      </Svg>
      <Txt x={M} y={720} w={W - 2 * M} align="center" size={32} color={C.dim} o={ep(t, 8.6, 9.4)}>Every episode follows the same four steps.</Txt>
    </>
  );
};

/* 4. Real footage, Episode 15 */
const Proof: React.FC<SceneProps> = ({t}) => {
  const swap = ep(t, 4.2, 4.9);
  return (
    <>
      <Shot src="launch/b-ep15-dup.png" x={192} y={120} w={1536} h={760} o={1 - 0.8 * swap} />
      <Txt x={192} y={886} w={1536} size={24} color={C.dim} o={1 - swap}>Observed from the local fixture: fixtures/ep15-idempotency/evidence.json</Txt>
      <Box x={360} y={210} w={1200} h={560} accent={C.green} glow o={swap}>
        <div style={{fontSize: 28, color: C.green, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700}}>After the repair, same lost response and retry</div>
        <Readout x={120} y={150} label="Attempts" value="2" color={C.cyan} />
        <Readout x={720} y={150} label="Orders" value="1" color={C.green} />
        <Txt x={420} y={168} size={80} color={C.mute} o={swap}>→</Txt>
        <Txt x={40} y={420} w={1100} size={28} color={C.dim}>Idempotency key, UNIQUE constraint, one transaction. Local synthetic fixture.</Txt>
      </Box>
    </>
  );
};

/* 5. Real footage, Episode 17 */
const Live: React.FC<SceneProps> = ({t}) => (
  <>
    <Shot src="launch/b-ep17-live.png" x={192} y={120} w={1536} h={520} o={ep(t, 0, 0.5)} />
    <Big y={690} align="center" size={46} color={C.amber} o={ep(t, 2.4, 3.1)}>Served 0 s ago. Measured 600 s ago.</Big>
    <Txt x={192} y={800} w={1536} align="center" size={24} color={C.dim} o={ep(t, 3.6, 4.2)}>Observed from the local fixture: simulated clock, fixtures/ep17-stale-dashboard/evidence.json</Txt>
  </>
);

/* 6. Five arcs, ten questions */
const Range: React.FC<SceneProps> = ({t}) => {
  const arcs = [
    ['Trust & access', C.red],
    ['Duplicates & ordering', C.amber],
    ['Data lifecycle', C.cyan],
    ['Delivery & freshness', C.green],
    ['Experience & speed', C.violet],
  ] as const;
  return (
    <>
      <Overline y={110}>Five arcs · ten questions</Overline>
      {arcs.map(([name, col], i) => (
        <div key={name} style={{position: 'absolute', left: M, top: 170 + i * 142, width: 1080, height: 112, opacity: ep(t, 0.3 + i * 0.35, 0.8 + i * 0.35), borderRadius: 16, background: C.panel, border: `3px solid ${col}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', fontFamily: F.sans}}>
          <div style={{fontSize: 40, fontWeight: 800, color: col}}>{name}</div>
          <div style={{fontSize: 28, color: C.dim}}>2 questions</div>
        </div>
      ))}
      <Shot src="launch/b-ep01-thumb.png" x={1264} y={170} w={560} h={315} o={ep(t, 1.2, 1.9)} />
      <Txt x={1264} y={492} w={560} size={24} color={C.dim} o={ep(t, 1.2, 1.9)}>Episode 01</Txt>
      <Shot src="launch/b-ep16-fail.png" x={1264} y={550} w={560} h={315} o={ep(t, 2.2, 2.9)} />
      <Txt x={1264} y={872} w={560} size={24} color={C.dim} o={ep(t, 2.2, 2.9)}>Episode 16</Txt>
    </>
  );
};

/* 7. Limits */
const Limits: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} align="center" size={96} color={C.text} o={ep(t, 0.2, 0.9)}>Not an audit.</Big>
    <Big y={310} align="center" size={96} color={C.amber} o={ep(t, 1.6, 2.3)}>Not a certification.</Big>
    {['Synthetic data', 'Loopback only', 'Limits stated per episode'].map((l, i) => (
      <Badge key={l} x={[360, 720, 1060][i] - (i === 2 ? 40 : 0)} y={520} label={l} color={C.cyan} big o={ep(t, 3.4 + i * 0.8, 4 + i * 0.8)} />
    ))}
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={32} color={C.dim} o={ep(t, 6.2, 6.9)}>Demonstrated, conceptual or planned: each episode says which. Nothing is promised.</Txt>
  </>
);

/* 8. Call to action */
const Cta: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} align="center" size={84} o={ep(t, 0.2, 0.9)}>Run the tests.</Big>
    <Big y={300} align="center" size={84} color={C.cyan} o={ep(t, 1, 1.7)}>Ask the questions.</Big>
    <Box x={300} y={500} w={1320} h={130} accent={C.cyan} glow o={ep(t, 2.4, 3)}>
      <div style={{fontFamily: F.mono, fontSize: 40, fontWeight: 700, color: C.text, textAlign: 'center', paddingTop: 30}}>github.com/mizcausevic-dev/web-reality-checks</div>
    </Box>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={36} color={C.text} o={ep(t, 3.6, 4.2)}>The repository, linked below.</Txt>
    <Txt x={M} y={750} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 4.4, 5)}>Miz Causevic, Kinetic Gain LLC</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {hook: Hook, problem: Problem, method: Method, proof: Proof, live: Live, range: Range, limits: Limits, cta: Cta};
