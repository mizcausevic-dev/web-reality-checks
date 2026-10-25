import React from 'react';
import {Img, staticFile} from 'remotion';
import {Arrow, Badge, Big, Box, Code, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Real frame crop: shows region (sx,sy,sw,sh) of a 1920x1080 episode still at the given scale. */
const Frame: React.FC<{src: string; sx: number; sy: number; sw: number; sh: number; x: number; y: number; scale: number; o?: number; accent?: string}> = ({src, sx, sy, sw, sh, x, y, scale, o = 1, accent = C.line}) => (
  <div style={{position: 'absolute', left: x, top: y, width: sw * scale, height: sh * scale, overflow: 'hidden', borderRadius: 16, border: `3px solid ${accent}`, boxSizing: 'border-box', opacity: o, background: C.panel}}>
    <Img src={staticFile(src)} style={{position: 'absolute', left: -sx * scale, top: -sy * scale, width: 1920 * scale, height: 1080 * scale, maxWidth: 'none'}} />
  </div>
);

/* 1. hook: real node:test output from episode 1, with the control line singled out */
const Hook: React.FC<SceneProps> = ({t}) => {
  const SC = 1.3;
  const fx = (1920 - 1100 * SC) / 2;
  const fy = 190;
  // control row in the source still: x 110..940, y 331..367
  const rx = fx + (110 - 96) * SC;
  const ry = fy + (331 - 170) * SC;
  const hi = ep(t, 3.4, 4.0);
  return (
    <>
      <Overline y={120} o={ep(t, 0, 0.5)}>A green test run</Overline>
      <Frame src="launch/a-ep01-retest.png" sx={96} sy={170} sw={1100} sh={395} x={fx} y={fy} scale={SC} o={ep(t, 0.1, 0.7)} />
      <div style={{position: 'absolute', left: rx, top: ry, width: (940 - 110) * SC, height: 36 * SC, border: `4px solid ${C.amber}`, borderRadius: 10, background: `${C.amber}22`, opacity: hi}} />
      <Big x={fx} y={745} size={64} color={C.amber} o={ep(t, 2.4, 3.0)}>Could it have gone red?</Big>
      <Txt x={fx} y={835} w={1400} size={30} o={ep(t, 3.8, 4.4)}>The amber line is a known-positive control: it passes only because the flaw is real.</Txt>
    </>
  );
};

/* 2. problem: real frame from episode 15, then the three-step story */
const Problem: React.FC<SceneProps> = ({t}) => {
  const SC = 0.9;
  const fx = (1920 - 1768 * SC) / 2;
  return (
    <>
      <Frame src="launch/a-ep15-fail.png" sx={76} sy={150} sw={1768} sh={580} x={fx} y={130} scale={SC} o={ep(t, 0.1, 0.7)} />
      <Box x={fx} y={680} w={480} h={84} title="1 · request commits order 1" titleSize={26} accent={C.green} o={ep(t, 1.6, 2.1)} />
      <Box x={fx + 534} y={680} w={480} h={84} title="2 · response is lost" titleSize={26} accent={C.red} o={ep(t, 3.6, 4.1)} />
      <Box x={fx + 1068} y={680} w={486} h={84} title="3 · retry counted as new" titleSize={26} accent={C.amber} o={ep(t, 5.4, 5.9)} />
      <Big x={fx} y={810} size={44} color={C.amber} o={ep(t, 7.4, 8.0)}>A fix test that never failed proves nothing.</Big>
    </>
  );
};

/* 3. method: four moves, revealed in proportion to the scene length */
const METHOD = [
  {n: '1', name: 'Flaw', color: C.red, line1: 'Reproduce it on a', line2: 'local fixture.', chip: '2 attempts → 2 orders'},
  {n: '2', name: 'Control', color: C.amber, line1: 'Prove the test', line2: 'can fail.', chip: 'asserts the flaw'},
  {n: '3', name: 'Repair', color: C.cyan, line1: 'The smallest', line2: 'change.', chip: 'Idempotency-Key'},
  {n: '4', name: 'Retest', color: C.green, line1: 'Same schedule,', line2: 'real numbers.', chip: '2 attempts → 1 order'},
];
const Method: React.FC<SceneProps> = ({t, dur}) => {
  const PW = 390;
  const GAP = 56;
  const active = Math.max(0, Math.min(3, Math.floor((t / dur - 0.08) / 0.22)));
  return (
    <>
      <Overline y={120} o={ep(t, 0, 0.5)}>The method, with episode 15 as the example</Overline>
      {METHOD.map((m, i) => {
        const x = M + i * (PW + GAP);
        const o = ep(t, dur * (0.08 + 0.2 * i), dur * (0.08 + 0.2 * i) + 0.5);
        return (
          <React.Fragment key={m.name}>
            <Box x={x} y={220} w={PW} h={400} accent={m.color} o={o} glow={i === active}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26}}>
                <div style={{width: 52, height: 52, borderRadius: 26, border: `3px solid ${m.color}`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 28, fontWeight: 800}}>{m.n}</div>
                <div style={{fontFamily: F.sans, fontSize: 44, fontWeight: 800, color: C.text}}>{m.name}</div>
              </div>
              <div style={{fontFamily: F.sans, fontSize: 32, color: C.dim, lineHeight: 1.3}}>{m.line1}<br />{m.line2}</div>
              <div style={{position: 'absolute', left: 24, right: 24, bottom: 28, padding: '14px 12px', borderRadius: 12, background: C.bg, border: `2px solid ${C.line}`, fontFamily: F.mono, fontSize: 24, color: m.color, textAlign: 'center'}}>{m.chip}</div>
            </Box>
            {i < 3 && (
              <Svg>
                <Arrow x1={x + PW + 8} y1={420} x2={x + PW + GAP - 8} y2={420} color={C.mute} p={ep(t, dur * (0.08 + 0.2 * (i + 1)) - 0.3, dur * (0.08 + 0.2 * (i + 1)) + 0.2)} />
              </Svg>
            )}
          </React.Fragment>
        );
      })}
      <Txt x={M} y={690} w={W - 2 * M} size={30} o={ep(t, dur * 0.8, dur * 0.8 + 0.6)}>The chips show the episode 15 fixture: the same scenario before and after the repair.</Txt>
    </>
  );
};

/* 4. proof: episode 15 numbers from evidence.json and the executed test run */
const Proof: React.FC<SceneProps> = ({t}) => (
  <>
    <Frame src="launch/a-ep15-retest.png" sx={96} sy={160} sw={1728} sh={680} x={M} y={170} scale={0.6} o={ep(t, 0.1, 0.7)} />
    <Txt x={M} y={600} w={1040} size={26} o={ep(t, 0.8, 1.3)}>Observed from the local fixture: fixtures/ep15-idempotency/evidence.json</Txt>
    <Overline x={1180} y={170} color={C.red} o={ep(t, 0.9, 1.4)}>Control · flawed endpoint</Overline>
    <Readout x={1180} y={210} w={644} label="attempts → orders" value="2 → 2" color={C.red} o={ep(t, 1.0, 1.6)} />
    <Overline x={1180} y={400} color={C.green} o={ep(t, 3.8, 4.3)}>After the repair</Overline>
    <Readout x={1180} y={440} w={644} label="attempts → orders" value="2 → 1" color={C.green} o={ep(t, 3.9, 4.5)} />
    <Code x={1180} y={640} w={644} lines={['# tests 13', '# pass 13', '# fail 0']} hi={[1, 2]} hiColor={C.green} size={28} title="node --test · executed" o={ep(t, 5.4, 6.0)} />
  </>
);

/* 5. access: episode 1 status codes */
const Access: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={120} o={ep(t, 0, 0.5)}>Alice asks for Bob's project</Overline>
    <Box x={M} y={190} w={880} h={250} accent={C.red} title="Before the repair" sub="vulnerable endpoint, project p_2002" o={ep(t, 0.5, 1.0)} />
    <Readout x={M + 540} y={250} w={300} label="status" value="200" color={C.red} o={ep(t, 0.9, 1.5)} />
    <Box x={M} y={480} w={880} h={250} accent={C.green} title="After the repair" sub="lookup by project id and owner" o={ep(t, 2.6, 3.1)} />
    <Readout x={M + 540} y={540} w={300} label="status" value="404" color={C.green} o={ep(t, 3.0, 3.6)} />
    <Frame src="launch/a-ep01-retest.png" sx={1246} sy={170} sw={588} sh={430} x={1040} y={190} scale={1.32} o={ep(t, 1.6, 2.2)} accent={C.line} />
    <Txt x={M} y={790} w={W - 2 * M} size={28} o={ep(t, 4.4, 5.0)}>Observed from the local fixture: fixtures/ep01-authz/evidence.json, 7 of 7 tests pass.</Txt>
  </>
);

/* 6. range: three arcs, three real thumbnails */
const RANGE = [
  {thumb: 'launch/a-ep15-thumb.png', arc: 'Duplicates & ordering', color: C.violet, ep: 'Episode 15', pass: '# pass 13  # fail 0'},
  {thumb: 'launch/a-ep01-thumb.png', arc: 'Trust & access', color: C.cyan, ep: 'Episode 1', pass: '# pass 7  # fail 0'},
  {thumb: 'launch/a-ep17-thumb.png', arc: 'Delivery & freshness', color: C.amber, ep: 'Episode 17', pass: '# pass 12  # fail 0'},
];
const Range: React.FC<SceneProps> = ({t}) => (
  <>
    {RANGE.map((r, i) => {
      const x = M + i * 589;
      const o = ep(t, 0.3 + i * 1.0, 0.9 + i * 1.0);
      return (
        <React.Fragment key={r.ep}>
          <div style={{position: 'absolute', left: x, top: 190, width: 550, height: 309, borderRadius: 16, overflow: 'hidden', border: `3px solid ${r.color}`, boxSizing: 'border-box', opacity: o}}>
            <Img src={staticFile(r.thumb)} style={{width: 550, height: 309, display: 'block'}} />
          </div>
          <Txt x={x} y={520} w={550} size={34} weight={700} color={r.color} o={o}>{r.arc}</Txt>
          <Txt x={x} y={570} w={550} size={26} mono color={C.dim} o={o}>{r.ep} · {r.pass}</Txt>
        </React.Fragment>
      );
    })}
    <Big y={680} size={44} color={C.text} o={ep(t, 4.2, 4.8)}>Each one states what it does not prove.</Big>
    <Txt x={M} y={770} w={W - 2 * M} size={28} mono o={ep(t, 5.2, 5.8)}>node --test fixtures/epNN-slug/test.mjs</Txt>
  </>
);

/* 7. cta */
const Cta: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={170} size={112} o={ep(t, 0.2, 0.9)}>Break it on purpose.</Big>
    <Big y={320} size={72} color={C.cyan} o={ep(t, 1.6, 2.2)}>Then fix it.</Big>
    <Code x={M} y={470} w={1000} lines={['node --test fixtures/ep15-idempotency/test.mjs']} size={26} title="Run a fixture" o={ep(t, 3.0, 3.6)} />
    <Pill x={M} y={640} text="github.com/mizcausevic-dev/web-reality-checks" color={C.cyan} size={40} o={ep(t, 4.2, 4.8)} />
    <Txt x={M} y={730} w={W - 2 * M} size={28} o={ep(t, 5.0, 5.6)}>The repository, linked below. Open source code; local synthetic fixtures only.</Txt>
    <Badge x={M} y={800} label="Author" value="Miz Causevic, Kinetic Gain LLC" color={C.violet} o={prog(t, 5.6, 6.2)} />
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {hook: Hook, problem: Problem, method: Method, proof: Proof, access: Access, range: Range, cta: Cta};
