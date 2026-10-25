import React from 'react';
import {Big, Box, Overline, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

type Q = {n: number; arc: string; col: string; prompt: string; options: [string, string, string]; correct: 0 | 1 | 2; explain: string; epNo: string; evidence: string};

/* Every value below is copied from the named fixture's evidence.json (local, synthetic). */
const QS: Q[] = [
  {n: 1, arc: 'Trust & access', col: C.red, prompt: "Alice is signed in and asks for Bob's private project. In the flawed version, what does the server answer?", options: ['An error: access refused', "Bob's project, status 200", 'Not found (404)'], correct: 1, explain: 'The server checked that Alice was signed in, never that the project was hers. After the repair: 404.', epNo: '01', evidence: 'ep01-authz: Alice asks for Bob (flawed) 200, repaired 404'},
  {n: 2, arc: 'Duplicates & ordering', col: C.amber, prompt: 'A customer clicks Pay once. The confirmation is lost and the app retries. In the flawed version, how many orders exist?', options: ['One', 'Two', 'Three'], correct: 1, explain: 'Nothing linked the retry to the first request. With a unique key per purchase, the repair ends with one order.', epNo: '15', evidence: 'ep15-idempotency: flawed orderCount 2, repaired 1'},
  {n: 3, arc: 'Data lifecycle', col: C.cyan, prompt: 'A directory has 10,000 listings. Its checker records 3,875 problems. How many different listings were flagged?', options: ['3,875', '3,303', '6,697'], correct: 1, explain: 'Some listings carry several flags (485 have two, 42 have three, 1 has four). Problems and affected listings are different counts.', epNo: '05', evidence: 'ep05-directory-quality: 3,875 instances, 3,303 unique listings'},
  {n: 4, arc: 'Delivery & freshness', col: C.green, prompt: 'A dashboard says Live, updated 0 s ago. Its sensor samples every 600 s. Just before the next sample, how old is the reading?', options: ['0 seconds', '30 seconds', '570 seconds'], correct: 2, explain: 'The label described the page refresh, not the measurement. At 570 s the reading was past the fixture’s 300 s stale threshold.', epNo: '17', evidence: 'ep17-stale-dashboard: poll at t=570, age 570 s, label Live'},
  {n: 5, arc: 'Experience & speed', col: C.violet, prompt: 'In the flawed version, eight keystrokes sent 17 requests and 12 were rejected. After the repair, how many requests for the same typing?', options: ['Eight', 'Four', 'One'], correct: 2, explain: 'The repaired client waits for typing to pause, drops stale answers and respects the retry delay.', epNo: '16', evidence: 'ep16-rate-limit: flawed 17 requests, repaired 1'},
];
const LETTERS = ['A', 'B', 'C'];

const Countdown: React.FC<{t: number; dur: number; col: string}> = ({t, dur, col}) => {
  const start = dur - 6;
  if (t < start) return null;
  const p = Math.min(1, (t - start) / 6);
  const r = 62;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{position: 'absolute', left: 1650, top: 150, width: 160, height: 160}}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={r} fill="none" stroke={C.line} strokeWidth={10} />
        <circle cx={80} cy={80} r={r} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * p} transform="rotate(-90 80 80)" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 64, fontWeight: 800, color: C.text}}>{Math.max(1, Math.ceil(6 - (t - start)))}</div>
    </div>
  );
};

const Options: React.FC<{q: Q; reveal: boolean; t: number}> = ({q, reveal, t}) => (
  <>
    {q.options.map((o, i) => {
      const right = i === q.correct;
      const y = 350 + i * 108;
      const col = reveal ? (right ? C.green : C.mute) : q.col;
      const o1 = reveal ? (right ? 1 : 0.35) : ep(t, 0.2 + i * 0.15, 0.6 + i * 0.15);
      return (
        <div key={i} style={{position: 'absolute', left: 120, top: y, width: 1440, height: 90, opacity: o1, borderRadius: 16, background: reveal && right ? `${C.green}1f` : C.panel, border: `3px solid ${col}`, boxShadow: reveal && right ? `0 0 40px ${C.green}55` : 'none', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 28, padding: '0 32px', fontFamily: F.sans}}>
          <div style={{width: 52, height: 52, borderRadius: 26, background: `${col}33`, color: col, fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{reveal && right ? '✓' : LETTERS[i]}</div>
          <div style={{fontSize: 38, fontWeight: 700, color: C.text}}>{o}</div>
        </div>
      );
    })}
  </>
);

const Ask = (q: Q): React.FC<SceneProps> => ({t, dur}) => (
  <>
    <Overline y={106} color={q.col}>{`Question ${q.n} of 5 · ${q.arc}`}</Overline>
    <Big y={160} w={1480} size={44} weight={700} o={ep(t, 0, 0.5)}>{q.prompt}</Big>
    <Options q={q} reveal={false} t={t} />
    <Txt x={120} y={690} w={1440} size={28} color={C.dim} o={ep(t, 1.5, 2.1)}>Pick A, B or C. The answer comes from a test result in the repository.</Txt>
    <Countdown t={t} dur={dur} col={q.col} />
  </>
);

const Answer = (q: Q): React.FC<SceneProps> => ({t}) => (
  <>
    <Overline y={106} color={C.green}>{`Answer ${q.n} · ${q.arc}`}</Overline>
    <Big y={160} w={1480} size={44} weight={700} o={0.55}>{q.prompt}</Big>
    <Options q={q} reveal t={t} />
    <Txt x={120} y={680} w={1440} size={30} color={C.text} o={ep(t, 0.6, 1.2)}>{q.explain}</Txt>
    <div style={{position: 'absolute', left: 120, top: 810, opacity: ep(t, 1.4, 2), padding: '12px 24px', borderRadius: 999, border: `3px solid ${C.green}`, background: `${C.green}1a`, fontFamily: F.sans, fontSize: 26, fontWeight: 700, color: C.text, whiteSpace: 'nowrap'}}>
      <span style={{color: C.green, letterSpacing: 2, textTransform: 'uppercase', fontSize: 20, marginRight: 14}}>{`Episode ${q.epNo}`}</span>
      {q.evidence}
    </div>
  </>
);

const Hook: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={240} o={ep(t, 0, 0.5)}>Web Reality Checks</Overline>
    <Big y={290} size={104} o={ep(t, 0.2, 0.9)}>Launch review quiz</Big>
    <Txt x={M} y={440} w={W - 2 * M} size={40} color={C.dim} o={ep(t, 1, 1.7)}>Five questions your demo cannot answer.</Txt>
    {QS.map((q, i) => (
      <div key={q.n} style={{position: 'absolute', left: M + i * 120, top: 560, width: 96, height: 96, borderRadius: 48, border: `4px solid ${q.col}`, color: q.col, fontFamily: F.sans, fontSize: 44, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ep(t, 1.6 + i * 0.3, 2 + i * 0.3)}}>{q.n}</div>
    ))}
    <Txt x={M} y={720} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4)}>Question, three options, six seconds to think, then the answer.</Txt>
  </>
);

const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={200} align="center" size={80} o={ep(t, 0.2, 0.9)}>Ask for the test,</Big>
    <Big y={300} align="center" size={80} color={C.cyan} o={ep(t, 1, 1.7)}>not the demo.</Big>
    <Box x={300} y={500} w={1320} h={130} accent={C.cyan} glow o={ep(t, 2.2, 2.8)}>
      <div style={{fontFamily: F.mono, fontSize: 40, fontWeight: 700, color: C.text, textAlign: 'center', paddingTop: 30}}>github.com/mizcausevic-dev/web-reality-checks</div>
    </Box>
    <Txt x={M} y={670} w={W - 2 * M} align="center" size={34} color={C.text} o={ep(t, 3.2, 3.8)}>The repository, linked below.</Txt>
    <Txt x={M} y={740} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 3.8, 4.4)}>Synthetic fixtures. Not an audit or a certification.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  q1: Ask(QS[0]), a1: Answer(QS[0]),
  q2: Ask(QS[1]), a2: Answer(QS[1]),
  q3: Ask(QS[2]), a3: Answer(QS[2]),
  q4: Ask(QS[3]), a4: Answer(QS[3]),
  q5: Ask(QS[4]), a5: Answer(QS[4]),
  close: Close,
};
