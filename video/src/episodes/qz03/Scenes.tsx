import React from 'react';
import {Img, staticFile} from 'remotion';
import {Badge, Big, Box, Overline, Pill, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ---------- shared pieces ---------- */
const FrameWindow: React.FC<{src: string; x: number; y: number; w: number; o?: number; accent?: string}> = ({src, x, y, w, o = 1, accent = C.line}) => {
  const s = w / 1920;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: 820 * s, overflow: 'hidden', borderRadius: 16, border: `3px solid ${accent}`, opacity: o, boxSizing: 'border-box', background: C.bg}}>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: -110 * s, width: w, height: 1080 * s}} />
    </div>
  );
};

type Opt = {k: 'A' | 'B' | 'C'; text: string};
type Q = {
  n: number;
  question: string;
  options: Opt[];
  correct: 'A' | 'B' | 'C';
  episode: string;
  evidence: string;
  source: string;
  explain: string;
  accent: string;
};

const QS: Q[] = [
  {n: 1, question: 'Pay was tapped once, the reply was lost, and the app retried with the same ticket number. How many orders exist?', options: [{k: 'A', text: 'One order'}, {k: 'B', text: 'Two orders'}, {k: 'C', text: 'Three orders'}], correct: 'A', episode: 'Episode 15', evidence: 'corrected_lost_response.orderCount = 1', source: 'fixtures/ep15-idempotency/evidence.json', explain: 'The same ticket returned the saved order. With no ticket, the flawed endpoint made 2.', accent: C.red},
  {n: 2, question: 'A new version is published, but your open tab still shows Build 1. What happens to Build 2?', options: [{k: 'A', text: 'It replaces Build 1 at once'}, {k: 'B', text: 'It installs and waits'}, {k: 'C', text: 'It is deleted'}], correct: 'B', episode: 'Episode 12', evidence: 'waiting = build2, active = build1', source: 'fixtures/ep12-sw-update/evidence.json (model)', explain: 'The old version keeps the open page until the new one may take over.', accent: C.amber},
  {n: 3, question: 'Alice loads her dashboard. Then Bob loads his. In the flawed test, what does Bob see?', options: [{k: 'A', text: 'Welcome back, Bob'}, {k: 'B', text: 'An error page'}, {k: 'C', text: 'Welcome back, Alice'}], correct: 'C', episode: 'Episode 24', evidence: 'flawed.bobGreeting = "Welcome back, Alice"', source: 'fixtures/ep24-shared-cache-leak/evidence.json', explain: 'The saved page was filed under /dashboard only, with no person in the label.', accent: C.violet},
  {n: 4, question: 'The deadline is the calendar date January 15. The flawed page shows it on a New York clock. Which date appears?', options: [{k: 'A', text: 'January 15'}, {k: 'B', text: 'January 16'}, {k: 'C', text: 'January 14'}], correct: 'C', episode: 'Episode 22', evidence: 'flawed New York: 2026-01-14, 19:00', source: 'fixtures/ep22-date-only-timezones/evidence.json', explain: 'Midnight in London is 7 pm the evening before in New York.', accent: C.cyan},
  {n: 5, question: 'Contact c_1003 is deleted and a direct lookup says not found. In the flawed version, what does a search for "dana" return?', options: [{k: 'A', text: 'The contact is still listed'}, {k: 'B', text: 'Nothing'}, {k: 'C', text: 'An error'}], correct: 'A', episode: 'Episode 21', evidence: 'search_dana_uncached.ids = [c_1003]', source: 'fixtures/ep21-deletion-copies/evidence.json', explain: 'The delete removed only the main record. The search copy stayed.', accent: C.green},
];

/** Right-hand picture for each question. Conceptual; never shows the answer before the reveal. */
const Visual: React.FC<{n: number; t: number; reveal: boolean}> = ({n, t, reveal}) => {
  const x = 1232;
  const w = 592;
  const o = ep(t, 0.3, 0.9);
  if (n === 1)
    return (
      <>
        <Box x={x} y={330} w={w} h={90} title="Attempt 1 · ticket ck_7f3a…" titleSize={28} accent={C.cyan} o={o} />
        <Box x={x} y={444} w={w} h={90} title="Reply lost" titleSize={28} accent={C.red} o={o} dashed />
        <Box x={x} y={558} w={w} h={90} title="Attempt 2 · same ticket" titleSize={28} accent={C.amber} o={o} />
      </>
    );
  if (n === 2)
    return (
      <>
        <Box x={x} y={330} w={w} h={150} title="Build 1" sub="open tab, active" titleSize={34} accent={C.cyan} o={o} />
        <Box x={x} y={510} w={w} h={150} title="Build 2" sub="newly published" titleSize={34} accent={C.green} o={o} dashed />
      </>
    );
  if (n === 3)
    return (
      <>
        <Box x={x} y={330} w={w} h={90} title="1 · Alice loads /dashboard" titleSize={28} accent={C.violet} o={o} />
        <Box x={x} y={444} w={w} h={90} title="2 · Bob loads /dashboard" titleSize={28} accent={C.cyan} o={o} />
        <Box x={x} y={558} w={w} h={90} title="Both signed in correctly" titleSize={28} accent={C.green} o={o} />
      </>
    );
  if (n === 4)
    return (
      <>
        <Box x={x} y={330} w={w} h={150} title="Deadline 2026-01-15" sub="a calendar date, no time" titleSize={32} accent={C.cyan} o={o} />
        <Box x={x} y={510} w={w} h={150} title="Shown on a New York clock" sub="UTC-05:00 in January" titleSize={32} accent={C.amber} o={o} />
      </>
    );
  return (
    <>
      <Box x={x} y={330} w={w} h={90} title="DELETE c_1003 → done" titleSize={28} accent={C.red} o={o} />
      <Box x={x} y={444} w={w} h={90} title="Direct lookup: 404" titleSize={28} accent={C.green} o={o} />
      <Box x={x} y={558} w={w} h={90} title={reveal ? 'Search "dana": c_1003' : 'Search "dana": ?'} titleSize={28} accent={C.amber} o={o} />
    </>
  );
};

const OptionRow: React.FC<{y: number; opt: Opt; state: 'ask' | 'right' | 'dim'; t: number; i: number}> = ({y, opt, state, t, i}) => {
  const o = ep(t, 0.1 + 0.08 * i, 0.5 + 0.08 * i);
  const col = state === 'right' ? C.green : C.line;
  const op = state === 'dim' ? 0.32 : 1;
  return (
    <div style={{position: 'absolute', left: M, top: y, width: 1070, height: 96, boxSizing: 'border-box', borderRadius: 16, background: state === 'right' ? `${C.green}1f` : C.panel, border: `3px solid ${col}`, boxShadow: state === 'right' ? `0 0 0 6px ${C.green}22, 0 0 36px ${C.green}55` : 'none', display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', opacity: o * op, fontFamily: F.sans}}>
      <div style={{width: 52, height: 52, borderRadius: 26, background: state === 'right' ? C.green : `${C.cyan}26`, color: state === 'right' ? C.bg : C.cyan, fontWeight: 800, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{opt.k}</div>
      <div style={{fontSize: 36, fontWeight: 600, color: C.text}}>{opt.text}</div>
      {state === 'right' && <div style={{marginLeft: 'auto', color: C.green, fontSize: 40, fontWeight: 800}}>✓</div>}
    </div>
  );
};

/** Countdown ring, shown only during the last 6 seconds of an ask scene. */
const Countdown: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const left = Math.max(0, dur - t);
  if (t < dur - 6) return null;
  const r = 62;
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, left / 6));
  return (
    <div style={{position: 'absolute', left: M, top: 722, width: 400, height: 150, fontFamily: F.sans}}>
      <svg width={150} height={150} viewBox="0 0 150 150" style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={75} cy={75} r={r} fill="none" stroke={C.line} strokeWidth={10} />
        <circle cx={75} cy={75} r={r} fill="none" stroke={left < 2 ? C.amber : C.cyan} strokeWidth={10} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} transform="rotate(-90 75 75)" />
      </svg>
      <div style={{position: 'absolute', left: 0, top: 36, width: 150, textAlign: 'center', fontSize: 64, fontWeight: 800, color: C.text}}>{Math.ceil(left)}</div>
      <div style={{position: 'absolute', left: 176, top: 48, fontSize: 34, fontWeight: 700, color: C.text}}>Think</div>
      <div style={{position: 'absolute', left: 176, top: 92, fontSize: 26, color: C.dim}}>Answer comes next</div>
    </div>
  );
};

const Question: React.FC<SceneProps & {q: Q}> = ({t, dur, q}) => (
  <>
    <Overline y={116} color={q.accent}>{`Question ${q.n} of 5`}</Overline>
    <Big y={160} size={44} w={W - 2 * M} o={ep(t, 0, 0.5)}>{q.question}</Big>
    {q.options.map((o, i) => (
      <OptionRow key={o.k} y={330 + i * 118} opt={o} state="ask" t={t} i={i} />
    ))}
    <Visual n={q.n} t={t} reveal={false} />
    <Countdown t={t} dur={dur} />
  </>
);

const Answer: React.FC<SceneProps & {q: Q}> = ({t, q}) => (
  <>
    <Overline y={116} color={C.green}>{`Answer ${q.n} of 5`}</Overline>
    <Big y={160} size={44} w={W - 2 * M} o={0.55}>{q.question}</Big>
    {q.options.map((o, i) => (
      <OptionRow key={o.k} y={330 + i * 118} opt={o} state={o.k === q.correct ? 'right' : 'dim'} t={t + 1} i={i} />
    ))}
    <Visual n={q.n} t={t + 1} reveal />
    <Txt x={M} y={696} w={1070} size={30} color={C.text} weight={600} o={ep(t, 0.5, 1.1)}>{q.explain}</Txt>
    <Badge x={M} y={800} label={q.episode} value={q.evidence} color={q.accent} o={ep(t, 0.9, 1.5)} />
    <Txt x={M} y={868} w={W - 2 * M} size={24} o={ep(t, 1.3, 1.9)}>{`Observed from ${q.source}`}</Txt>
  </>
);

const mkQ = (i: number): React.FC<SceneProps> => (p) => <Question {...p} q={QS[i]} />;
const mkA = (i: number): React.FC<SceneProps> => (p) => <Answer {...p} q={QS[i]} />;

/* ---------- hook and close ---------- */
const Hook: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={190} o={ep(t, 0.2, 0.7)}>Web Reality Checks · Quiz</Overline>
    <Big y={250} size={92} o={ep(t, 0.3, 0.9)}>Why do websites do weird things?</Big>
    <Txt x={M} y={520} w={W - 2 * M} size={40} color={C.text} o={ep(t, 1.0, 1.6)}>Five questions. Five everyday glitches.</Txt>
    {QS.map((q, i) => (
      <Pill key={q.n} x={M + i * 330} y={640} text={q.episode} color={q.accent} o={ep(t, 1.4 + 0.2 * i, 1.9 + 0.2 * i)} size={28} />
    ))}
    <Txt x={M} y={740} w={W - 2 * M} size={26} o={ep(t, 2.4, 3.0)}>Every answer comes from a test or evidence file in the open repository. Made-up people, made-up data.</Txt>
  </>
);

const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={160} o={ep(t, 0.2, 0.7)}>Web Reality Checks</Overline>
    <Big y={220} size={76} o={ep(t, 0.3, 0.9)}>Five weird moments. Each one tested.</Big>
    <FrameWindow src="launch/c-ep15-retest.png" x={M} y={400} w={640} accent={C.green} o={ep(t, 0.8, 1.4)} />
    <Box x={M + 700} y={400} w={W - 2 * M - 700} h={140} accent={C.cyan} glow o={ep(t, 1.2, 1.8)}>
      <div style={{fontFamily: F.mono, fontSize: 34, color: C.text, textAlign: 'center', marginTop: 28}}>github.com/mizcausevic-dev/web-reality-checks</div>
    </Box>
    <Pill x={M + 700} y={570} text="The repository, linked below" color={C.cyan} o={ep(t, 1.8, 2.3)} size={30} />
    <Txt x={M + 700} y={650} w={W - 2 * M - 700} size={26} o={ep(t, 2.2, 2.8)}>Frame from episode 15. Run the tests yourself with node --test.</Txt>
    <Txt x={M} y={800} w={W - 2 * M} size={26} o={ep(t, 2.6, 3.2)}>Miz Causevic, Kinetic Gain LLC</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  q1: mkQ(0), a1: mkA(0),
  q2: mkQ(1), a2: mkA(1),
  q3: mkQ(2), a3: mkA(2),
  q4: mkQ(3), a4: mkA(3),
  q5: mkQ(4), a5: mkA(4),
  close: Close,
};
