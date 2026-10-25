import React from 'react';
import {Img, staticFile} from 'remotion';
import {Arrow, Badge, Big, Box, Overline, Pill, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/** Real product frame from a rendered episode (1920x1080 source), cropped to y 110..930 so the baked-in tags and caption bar are not repeated. */
const FrameWindow: React.FC<{src: string; x: number; y: number; w: number; o?: number; accent?: string}> = ({src, x, y, w, o = 1, accent = C.line}) => {
  const s = w / 1920;
  const cropTop = 110;
  const cropH = 820;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: cropH * s, overflow: 'hidden', borderRadius: 16, border: `3px solid ${accent}`, opacity: o, boxSizing: 'border-box', background: C.bg}}>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: -cropTop * s, width: w, height: 1080 * s}} />
    </div>
  );
};
const frameH = (w: number) => 820 * (w / 1920);

const Chip: React.FC<{x: number; y: number; text: string; color?: string; o?: number}> = ({x, y, text, color = C.dim, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, padding: '6px 14px', borderRadius: 999, border: `2px solid ${color}`, color, fontFamily: F.sans, fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap', background: `${color}14`}}>{text}</div>
);

/* 1. hook: one tap, two orders (real frame from episode 15) */
const Hook: React.FC<SceneProps> = ({t, dur}) => {
  const fw = 1056;
  const fx = (W - fw) / 2;
  const two = ep(t, Math.min(dur * 0.4, 2.2), Math.min(dur * 0.4, 2.2) + 0.5);
  return (
    <>
      <Big y={130} size={84} align="center" o={ep(t, 0.1, 0.6)}>You tapped Pay once.</Big>
      <Big y={236} size={84} align="center" color={C.red} o={two}>Two orders.</Big>
      <FrameWindow src="launch/c-ep15-dup.png" x={fx} y={380} w={fw} accent={C.red} o={ep(t, 0.4, 1.0)} />
      <Txt x={M} y={380 + frameH(fw) + 24} w={W - 2 * M} align="center" size={26} o={ep(t, 1.2, 1.8)}>Frame from episode 15. Observed from the local fixture: 2 attempts, 2 orders.</Txt>
    </>
  );
};

/* 2. problem: four strange moments */
const Tile: React.FC<{x: number; y: number; title: string; sub: string; color: string; o: number; kind: string; children?: React.ReactNode}> = ({x, y, title, sub, color, o, kind, children}) => (
  <Box x={x} y={y} w={840} h={300} accent={color} o={o}>
    <div style={{position: 'absolute', left: 24, top: 22, width: 320, fontFamily: F.sans, fontSize: 34, fontWeight: 700, lineHeight: 1.15, color: C.text}}>{title}</div>
    <div style={{position: 'absolute', left: 24, top: 150, width: 320, fontFamily: F.sans, fontSize: 26, lineHeight: 1.25, color: C.dim}}>{sub}</div>
    <div style={{position: 'absolute', left: 24, bottom: 16, fontFamily: F.sans, fontSize: 24, color}}>{kind}</div>
    <div style={{position: 'absolute', left: 372, right: 24, top: 24, bottom: 24, display: 'flex', alignItems: 'center'}}>{children}</div>
  </Box>
);
const Problem: React.FC<SceneProps> = ({t, dur}) => {
  const a = (i: number) => ep(t, Math.min(dur * (0.06 + 0.2 * i), 0.6 + 2.2 * i), Math.min(dur * (0.06 + 0.2 * i), 0.6 + 2.2 * i) + 0.5);
  const X = [M, M + 888];
  const Y = [170, 500];
  return (
    <>
      <Overline y={120} color={C.amber}>Four strange moments</Overline>
      <Tile x={X[0]} y={Y[0]} title="An old page after an update" sub="The tab still says Build 1" color={C.cyan} o={a(0)} kind="Real frame, episode 12">
        <FrameWindow src="launch/c-ep12-fail.png" x={0} y={0} w={444} accent={C.line} />
      </Tile>
      <Tile x={X[1]} y={Y[0]} title="Someone else's name" sub="Bob sees Alice's page" color={C.violet} o={a(1)} kind="Conceptual card, episode 24">
        <Box x={0} y={0} w={444} h={160} accent={C.violet} title="Welcome back, Alice" titleSize={32} sub="viewer: Bob" />
      </Tile>
      <Tile x={X[0]} y={Y[1]} title="A date one day off" sub="Deadline: 2026-01-15" color={C.amber} o={a(2)} kind="Conceptual card, episode 22">
        <Box x={0} y={0} w={444} h={160} accent={C.amber} title="New York shows Jan 14" titleSize={32} sub="Tokyo shows Jan 15" />
      </Tile>
      <Tile x={X[1]} y={Y[1]} title="A deleted record still shows" sub="Lookup says not found" color={C.red} o={a(3)} kind="Conceptual card, episode 21">
        <Box x={0} y={0} w={444} h={160} accent={C.red} title="Search still returns c_1003" titleSize={30} sub="lookup: 404" />
      </Tile>
      <Txt x={M} y={832} w={W - 2 * M} align="center" size={28} color={C.text} o={ep(t, Math.min(dur * 0.82, 9), Math.min(dur * 0.82, 9) + 0.5)}>Nobody edited anything. Something kept a copy.</Txt>
    </>
  );
};

/* 3. method: Flaw, Control, Repair, Retest */
const Method: React.FC<SceneProps> = ({t, dur}) => {
  const steps = [
    {k: 'Flaw', c: C.red, d: 'Lost reply, then a retry: 2 orders'},
    {k: 'Control', c: C.amber, d: 'A test that proves the flaw can be caught'},
    {k: 'Repair', c: C.cyan, d: 'A ticket number on every attempt'},
    {k: 'Retest', c: C.green, d: 'Same retry: 1 order'},
  ];
  const bw = 396;
  const gap = 48;
  return (
    <>
      <Overline y={130}>The method</Overline>
      <Big y={176} size={64}>Flaw. Control. Repair. Retest.</Big>
      {steps.map((s, i) => {
        const at = Math.min(dur * (0.2 + 0.17 * i), 1.5 + 2.2 * i);
        const o = ep(t, at, at + 0.5);
        const x = M + i * (bw + gap);
        return (
          <React.Fragment key={s.k}>
            <Box x={x} y={340} w={bw} h={250} title={`${i + 1}  ${s.k}`} sub={s.d} accent={s.c} o={o} titleSize={40} glow={t > at + 0.4 && t < at + 1.6} />
            {i < 3 && (
              <Svg>
                <Arrow x1={x + bw + 6} y1={465} x2={x + bw + gap - 6} y2={465} p={o} color={C.dim} />
              </Svg>
            )}
          </React.Fragment>
        );
      })}
      <Txt x={M} y={650} w={W - 2 * M} align="center" size={28} o={ep(t, Math.min(dur * 0.75, 7), Math.min(dur * 0.75, 7) + 0.5)}>Episode 15 filled in. Each glitch is a small pretend app on a laptop.</Txt>
    </>
  );
};

/* 4. proof: real episode 15 frames and the real counts */
const Proof: React.FC<SceneProps> = ({t, dur}) => {
  const fw = 816;
  const lx = M;
  const rx = W - M - fw;
  const fy = 170;
  const rOn = Math.min(dur * 0.45, 3.4);
  const bOn = Math.min(dur * 0.7, 4.4);
  return (
    <>
      <FrameWindow src="launch/c-ep15-dup.png" x={lx} y={fy} w={fw} accent={C.red} o={ep(t, 0.3, 0.9)} />
      <FrameWindow src="launch/c-ep15-retest.png" x={rx} y={fy} w={fw} accent={C.green} o={ep(t, rOn, rOn + 0.6)} />
      <Overline x={lx} y={fy + frameH(fw) + 20} color={C.red} o={ep(t, 0.6, 1.1)}>No ticket number</Overline>
      <Overline x={rx} y={fy + frameH(fw) + 20} color={C.green} o={ep(t, rOn + 0.3, rOn + 0.8)}>With a ticket number</Overline>
      <Txt x={lx} y={fy + frameH(fw) + 70} w={fw} size={44} color={C.red} weight={800} o={ep(t, 0.8, 1.3)}>2 attempts → 2 orders</Txt>
      <Txt x={rx} y={fy + frameH(fw) + 70} w={fw} size={44} color={C.green} weight={800} o={ep(t, rOn + 0.5, rOn + 1.0)}>2 attempts → 1 order</Txt>
      <Badge x={M + 520} y={760} label="node --test" value="# pass 13   # fail 0" color={C.green} big o={ep(t, bOn, bOn + 0.5)} />
      <Txt x={M} y={856} w={W - 2 * M} align="center" size={24} o={ep(t, bOn + 0.4, bOn + 0.9)}>Observed from the local fixture, fixtures/ep15-idempotency/evidence.json</Txt>
    </>
  );
};

/* 5. range: more moments, with everyday objects */
const Range: React.FC<SceneProps> = ({t, dur}) => {
  const bw = 500;
  const gap = 114;
  const cx = (i: number) => M + i * (bw + gap);
  const obj = [
    {ep: 'Episode 15', t: 'A dropped phone call', d: 'You said it, the line died, you said it again.', c: C.red},
    {ep: 'Episode 12', t: 'A manager at the door', d: 'The new one waits until the old shift ends.', c: C.amber},
    {ep: 'Episode 21', t: 'A library card in the drawer', d: 'The book is gone. The card still says it is there.', c: C.green},
  ];
  const a = (i: number) => Math.min(dur * (0.1 + 0.25 * i), 0.8 + 2.2 * i);
  return (
    <>
      <Overline y={130}>One film for each strange moment</Overline>
      <Img src={staticFile('launch/c-ep15-thumb.png')} style={{position: 'absolute', left: cx(0), top: 180, width: bw, height: (bw * 9) / 16, borderRadius: 14, border: `3px solid ${C.red}`, opacity: ep(t, a(0), a(0) + 0.5)}} />
      <Img src={staticFile('launch/c-ep12-thumb.png')} style={{position: 'absolute', left: cx(1), top: 180, width: bw, height: (bw * 9) / 16, borderRadius: 14, border: `3px solid ${C.amber}`, opacity: ep(t, a(1), a(1) + 0.5)}} />
      <Box x={cx(2)} y={180} w={bw} h={(bw * 9) / 16} accent={C.green} dashed o={ep(t, a(2), a(2) + 0.5)} title="Episode 21 fixture result" titleSize={30}>
        <div style={{marginTop: 20, whiteSpace: 'pre-wrap', fontFamily: F.mono, fontSize: 30, lineHeight: 1.6, color: C.text}}>lookup c_1003 → 404{'\n'}search → still returns c_1003</div>
      </Box>
      {obj.map((o, i) => (
        <Box key={o.ep} x={cx(i)} y={520} w={bw} h={250} accent={o.c} o={ep(t, a(i) + 0.3, a(i) + 0.8)} title={o.t} sub={o.d} titleSize={32}>
          <div style={{position: 'absolute', left: 24, bottom: 16, fontFamily: F.sans, fontSize: 24, color: o.c, fontWeight: 700}}>{o.ep}</div>
        </Box>
      ))}
      <Txt x={M} y={810} w={W - 2 * M} align="center" size={24} o={ep(t, Math.min(dur * 0.85, 8), Math.min(dur * 0.85, 8) + 0.5)}>Thumbnails are real frames from episodes 12 and 15. The objects are illustrations.</Txt>
    </>
  );
};

/* 6. limits */
const Limits: React.FC<SceneProps> = ({t, dur}) => {
  const rows = [
    ['Made-up people and made-up data', C.cyan],
    ['Runs only on a local machine, no real payment', C.cyan],
    ['Not an audit of any real product or company', C.amber],
    ['Each fix covers only the problem it shows', C.amber],
  ] as const;
  return (
    <>
      <Overline y={130} color={C.amber}>What this is not</Overline>
      {rows.map(([txt, col], i) => {
        const at = Math.min(dur * (0.1 + 0.2 * i), 0.5 + 1.8 * i);
        return <Box key={txt} x={M + 120} y={210 + i * 130} w={W - 2 * M - 240} h={90} accent={col} o={ep(t, at, at + 0.5)} title={txt} titleSize={38} />;
      })}
    </>
  );
};

/* 7. CTA: repository URL on screen */
const Cta: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={190} o={ep(t, 0.2, 0.7)}>Web Reality Checks</Overline>
    <Big y={250} size={84} o={ep(t, 0.3, 0.9)}>Watch it. Break it. Run the tests.</Big>
    <Box x={M} y={470} w={W - 2 * M} h={140} accent={C.cyan} glow o={ep(t, 1.0, 1.6)}>
      <div style={{fontFamily: F.mono, fontSize: 44, color: C.text, textAlign: 'center', marginTop: 22}}>github.com/mizcausevic-dev/web-reality-checks</div>
    </Box>
    <Pill x={M} y={650} text="The repository, linked below" color={C.cyan} o={step(t, 1.8) * ep(t, 1.8, 2.3)} size={30} />
    <Txt x={M} y={760} w={W - 2 * M} size={28} o={ep(t, 2.4, 3.0)}>Miz Causevic, Kinetic Gain LLC</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {hook: Hook, problem: Problem, method: Method, proof: Proof, range: Range, limits: Limits, cta: Cta};
