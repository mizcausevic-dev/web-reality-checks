import React from 'react';
import {Badge, Big, Box, Code, Overline, Pill, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

type QuizItem = {
  n: number;
  ep: string;
  fixture: string;
  q: string;
  opts: [string, string, string];
  correct: 0 | 1 | 2;
  expl: string;
  evidence: string[];
};

/* Every value below is copied from the named fixture's evidence.json or test output. */
const QUIZ: QuizItem[] = [
  {
    n: 1,
    ep: 'Episode 26',
    fixture: 'fixtures/ep26-n-plus-one',
    q: 'The flawed article list serves 100 articles and looks up each author separately. How many SELECT statements does the counter report?',
    opts: ['100', '101', '200'],
    correct: 1,
    expl: 'One list query plus one author lookup per article. The repaired JOIN reports 1; a doctored endpoint with one hidden extra query reports 102, so the counter can fail.',
    evidence: ['flawed.selectCount: 101', 'corrected.selectCount: 1', 'knownPositiveControl: 102'],
  },
  {
    n: 2,
    ep: 'Episode 15',
    fixture: 'fixtures/ep15-idempotency',
    q: 'A retry reuses the same idempotency key, but the quantity changed from 1 to 3. What does the corrected endpoint return?',
    opts: ['200 · replay the old order', '409', '422'],
    correct: 2,
    expl: 'Same key, different request: the order count stays at 1. The key identifies an attempt, and a changed payload is treated as a mistake, not a replay.',
    evidence: ['corrected_mismatched_payload', 'status: 422', 'orderCount: 1'],
  },
  {
    n: 3,
    ep: 'Episode 23',
    fixture: 'fixtures/ep23-optimistic-concurrency',
    q: 'A save hits a locked database. What does the fixture return?',
    opts: ['409 · version conflict', '503 · retryable, not a conflict', '200 · with a warning'],
    correct: 1,
    expl: '409 is only for a failed version check, where zero rows matched. A lock is a different failure: 503, retryable, and the client keeps the unsaved text.',
    evidence: ['database_lock.status: 503', 'retryable: true', 'isVersionConflict: false'],
  },
  {
    n: 4,
    ep: 'Episode 01',
    fixture: 'fixtures/ep01-authz',
    q: "Alice, signed in, asks the repaired endpoint for Bob's project, with a user parameter and header claiming to be Bob. What status?",
    opts: ['200', '403', '404'],
    correct: 2,
    expl: 'The server never reads those claims, and absent and inaccessible look the same by policy. The control test shows the old endpoint returned 200.',
    evidence: ['spoofed identity, corrected: 404', 'vulnerable p_2002: 200', '7 of 7 tests pass'],
  },
  {
    n: 5,
    ep: 'Episode 17',
    fixture: 'fixtures/ep17-stale-dashboard',
    q: 'The dashboard polls every 5 seconds instead of every 30. At 570 seconds on the simulated clock, how old is the measurement?',
    opts: ['5 s', '30 s', '570 s'],
    correct: 2,
    expl: 'Polling faster makes 119 polls instead of 19, but the collector still sampled once. Fetching faster does not observe faster.',
    evidence: ['pollingFaster.fast.ageAt570: 570', 'polls: 119 vs 19', 'collector samples: 1'],
  },
];

const LETTERS = ['A', 'B', 'C'];
const LEFT_W = 1074;
const RX = 1220;
const RW = W - M - RX;

const Options: React.FC<{item: QuizItem; reveal: boolean; t: number}> = ({item, reveal, t}) => (
  <>
    {item.opts.map((text, i) => {
      const isCorrect = i === item.correct;
      const color = reveal ? (isCorrect ? C.green : C.mute) : C.cyan;
      const o = reveal ? (isCorrect ? 1 : 0.35) : 1;
      return (
        <div key={i} style={{position: 'absolute', left: M, top: 390 + i * 112, width: LEFT_W, height: 92, borderRadius: 16, boxSizing: 'border-box', border: `3px solid ${color}`, background: reveal && isCorrect ? `${C.green}22` : C.panel, boxShadow: reveal && isCorrect ? `0 0 0 6px ${C.green}22, 0 0 40px ${C.green}44` : 'none', opacity: o, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', fontFamily: F.sans}}>
          <div style={{width: 52, height: 52, borderRadius: 26, background: `${color}26`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800}}>{reveal && isCorrect ? '✓' : LETTERS[i]}</div>
          <div style={{fontSize: 36, fontWeight: 700, color: C.text}}>{text}</div>
        </div>
      );
    })}
  </>
);

const Countdown: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const remaining = Math.max(0, dur - t);
  const show = t >= dur - 6;
  const p = Math.min(1, remaining / 6);
  const R = 96;
  const CIRC = 2 * Math.PI * R;
  const cx = RX + RW / 2;
  const cy = 560;
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, opacity: show ? 1 : 0}} width={1920} height={1080} viewBox="0 0 1920 1080">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={14} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.amber} strokeWidth={14} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - p)} transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      <div style={{position: 'absolute', left: cx - 80, top: cy - 52, width: 160, textAlign: 'center', fontFamily: F.sans, fontSize: 104, fontWeight: 800, color: C.amber, lineHeight: 1, opacity: show ? 1 : 0}}>{Math.ceil(remaining)}</div>
      <Txt x={RX} y={cy + 128} w={RW} size={28} align="center" color={C.amber} o={show ? 1 : 0}>Think</Txt>
    </>
  );
};

const QuizScene: React.FC<SceneProps & {item: QuizItem; reveal: boolean}> = ({t, dur, item, reveal}) => (
  <>
    <Overline y={120} color={reveal ? C.green : C.cyan}>{`Question ${item.n} of 5${reveal ? ' · answer' : ''}`}</Overline>
    <Big y={176} w={LEFT_W} size={44} weight={700} o={ep(t, 0, 0.5)}>{item.q}</Big>
    <Options item={item} reveal={reveal} t={t} />
    {!reveal && (
      <>
        <Box x={RX} y={176} w={RW} h={130} accent={C.line} title={item.ep} titleSize={30} sub={item.fixture} o={ep(t, 0.2, 0.7)} />
        <Countdown t={t} dur={dur} />
      </>
    )}
    {reveal && (
      <>
        <Txt x={M} y={728} w={LEFT_W} size={30} color={C.text} o={ep(t, 0.6, 1.2)}>{item.expl}</Txt>
        <Pill x={RX} y={176} text={item.ep} color={C.green} size={30} o={ep(t, 0.8, 1.3)} />
        <Box x={RX} y={250} w={RW} h={290} accent={C.green} title="From the fixture" titleSize={26} o={ep(t, 1.0, 1.6)}>
          <div style={{marginTop: 14, fontFamily: F.mono, fontSize: 24, color: C.dim, lineHeight: 1.45}}>{item.fixture}/evidence.json</div>
          {item.evidence.map((l, i) => (
            <div key={i} style={{marginTop: 12, fontFamily: F.mono, fontSize: 26, color: i === 0 ? C.green : C.text, opacity: prog(t, 1.4 + i * 0.4, 1.8 + i * 0.4)}}>{l}</div>
          ))}
        </Box>
      </>
    )}
  </>
);

const mk = (i: number, reveal: boolean): React.FC<SceneProps> => (props) => <QuizScene {...props} item={QUIZ[i]} reveal={reveal} />;

const HOOK_ROWS = [
  'Q1 · Episode 26 · counting queries',
  'Q2 · Episode 15 · idempotency keys',
  'Q3 · Episode 23 · 409 or 503',
  'Q4 · Episode 01 · spoofed identity',
  'Q5 · Episode 17 · stale data',
];
const Hook: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={120} o={ep(t, 0, 0.5)}>Quiz</Overline>
    <Big y={170} size={84} o={ep(t, 0.2, 0.8)}>Five questions your test suite should answer.</Big>
    {HOOK_ROWS.map((r, i) => (
      <Txt key={r} x={M} y={420 + i * 62} w={1100} size={36} weight={600} color={i % 2 ? C.text : C.dim} o={ep(t, 1.0 + i * 0.6, 1.5 + i * 0.6)}>{r}</Txt>
    ))}
    <Badge x={1250} y={470} label="Think time" value="6 seconds each" color={C.amber} big o={ep(t, 4.2, 4.8)} />
    <Txt x={1250} y={560} w={574} size={28} o={ep(t, 4.6, 5.2)}>Answers come from tests and evidence.json files in the repository.</Txt>
  </>
);

const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={170} size={104} o={ep(t, 0.2, 0.9)}>Score yourself.</Big>
    <Txt x={M} y={330} w={1500} size={36} color={C.text} o={ep(t, 1.2, 1.8)}>Every answer sits in a fixture's evidence.json or test output.</Txt>
    <Code x={M} y={430} w={1000} lines={['node --test fixtures/ep26-n-plus-one/test.mjs']} size={26} title="Run one yourself" o={ep(t, 2.4, 3.0)} />
    <Pill x={M} y={600} text="github.com/mizcausevic-dev/web-reality-checks" color={C.cyan} size={40} o={ep(t, 3.4, 4.0)} />
    <Txt x={M} y={690} w={W - 2 * M} size={28} o={ep(t, 4.0, 4.6)}>The repository, linked below. Break something on purpose.</Txt>
    <Badge x={M} y={770} label="Author" value="Miz Causevic, Kinetic Gain LLC" color={C.violet} o={ep(t, 4.6, 5.2)} />
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  q1: mk(0, false), a1: mk(0, true),
  q2: mk(1, false), a2: mk(1, true),
  q3: mk(2, false), a3: mk(2, true),
  q4: mk(3, false), a4: mk(3, true),
  q5: mk(4, false), a5: mk(4, true),
  close: Close,
};
