import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Values below are copied from fixtures/ep17-stale-dashboard/evidence.json (all SIMULATED time) */
const EV = {
  value: 21.2, // reading observed at sim 00:00:00
  value600: 22.8, // reading observed at sim 00:10:00
  sourceObservedAt: '00:00:00',
  collectedAt: '00:00:00',
  pollsBeforeRecollect: 19,
  firstStaleAtT: 330,
  staleThreshold: 300,
  collectInterval: 600,
  pollInterval: 30,
  collectorFailure: {failedCollections: 2, lastT: 1200, age: 1200, status: 200, connection: 'connected', freshness: 'stale'},
  apiFailure: {failedPolls: 2, status: 503, ageAt120: 120, warning: 'Last poll failed (503 Service Unavailable); showing last known value.', recoveryT: 150},
  pollingFaster: {slowPolls: 19, fastPolls: 119, collectorSamples: 1},
};

const pad = (n: number) => String(n).padStart(2, '0');
/** Simulated clock label from seconds since fixture start (epoch 00:00:00). */
const clk = (s: number) => `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;

/* ---------- local components ---------- */
/** Small simulated-clock readout; always labelled SIM so it is never read as wall-clock time. */
const SimClock: React.FC<{simSeconds: number; x?: number; y?: number; o?: number}> = ({simSeconds, x = 1440, y = 112, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 384, opacity: o, borderRadius: 12, border: `2px solid ${C.line}`, background: '#0d0f14', padding: '10px 18px', fontFamily: F.mono, fontSize: 28, color: C.text, boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
    <span style={{fontFamily: F.sans, fontSize: 18, letterSpacing: 3, color: C.amber}}>SIM CLOCK</span>
    <span>{clk(simSeconds)}</span>
  </div>
);

/** The illustrative dashboard panel. Plain chrome, deliberately not any real product. */
const Panel: React.FC<{x: number; y: number; w?: number; status: React.ReactNode; accent?: string; o?: number; value?: number; children?: React.ReactNode}> = ({x, y, w = 760, status, accent = C.line, o = 1, value = EV.value, children}) => (
  <Box x={x} y={y} w={w} h={300} accent={accent} o={o} fill="#14171e">
    <div style={{display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center'}}>
      {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
      <div style={{marginLeft: 16, color: C.mute, fontSize: 20, fontFamily: F.mono}}>ops.example.test/panel · illustrative</div>
    </div>
    <div style={{fontSize: 24, color: C.dim, letterSpacing: 2, textTransform: 'uppercase'}}>Inlet temperature</div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 4}}>
      <div style={{fontSize: 96, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: -3}}>{value.toFixed(1)}</div>
      <div style={{fontSize: 36, color: C.dim}}>°C</div>
    </div>
    <div style={{marginTop: 18, fontSize: 26, display: 'flex', alignItems: 'center', gap: 14}}>{status}</div>
    {children}
  </Box>
);

const Dot: React.FC<{color: string}> = ({color}) => <span style={{display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: color, boxShadow: `0 0 12px ${color}`}} />;

/* ---------- shared timeline layout ---------- */
const LY = {source: 150, collector: 330, api: 510, browser: 690};
const LH = 150;
const AX0 = 440; // x of sim t=0
const AX1 = 1780; // x of sim t=AXMAX
const AXMAX = 630;
const tx = (s: number) => AX0 + ((AX1 - AX0) * s) / AXMAX;

const LaneStack: React.FC<{t: number; hi?: Partial<Record<keyof typeof LY, string>>}> = ({t, hi = {}}) => (
  <>
    {(['source', 'collector', 'api', 'browser'] as const).map((k, i) => {
      const label = k === 'source' ? 'Source' : k === 'collector' ? 'Collector' : k === 'api' ? 'API' : 'Browser';
      return <Lane key={k} y={LY[k]} h={LH} label={label} accent={hi[k] ?? C.mute} o={ep(t, 0.15 * i, 0.15 * i + 0.4)} />;
    })}
  </>
);
const LaneNote: React.FC<{lane: keyof typeof LY; text: string; color?: string; o?: number}> = ({lane, text, color = C.dim, o = 1}) => (
  <Txt x={M + 24} y={LY[lane] + 50} w={300} size={22} color={color} o={o} lh={1.25}>{text}</Txt>
);
/** A vertical tick on a lane at sim time s. */
const Tick: React.FC<{lane: keyof typeof LY; s: number; color?: string; o?: number; label?: string; tall?: boolean}> = ({lane, s, color = C.cyan, o = 1, label, tall = false}) => (
  <g opacity={o}>
    <line x1={tx(s)} y1={LY[lane] + (tall ? 50 : 70)} x2={tx(s)} y2={LY[lane] + 125} stroke={color} strokeWidth={tall ? 6 : 4} strokeLinecap="round" />
    {label && <text x={tx(s)} y={LY[lane] + 148} fill={color} fontFamily={F.mono} fontSize={20} textAnchor="middle">{label}</text>}
  </g>
);
const AxisLabels: React.FC<{o?: number}> = ({o = 1}) => (
  <g opacity={o}>
    {[0, 120, 240, 360, 480, 600].map((s) => (
      <text key={s} x={tx(s)} y={LY.browser + LH + 34} fill={C.mute} fontFamily={F.mono} fontSize={20} textAnchor="middle">{clk(s)}</text>
    ))}
    <text x={AX0 - 20} y={LY.browser + LH + 34} fill={C.amber} fontFamily={F.sans} fontSize={18} fontWeight={700} textAnchor="end" letterSpacing={2}>SIM TIME</text>
  </g>
);

/* 1. The panel says Live; the measurement is ten minutes old */
const Fail: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.6);
  const reveal = ep(t, 2.8, 3.5);
  const both = ep(t, 5.2, 5.8);
  return (
    <>
      <SimClock simSeconds={600} o={o} />
      <Panel x={M} y={200} status={<><Dot color={C.green} /><span style={{color: C.green, fontWeight: 700}}>Live</span><span style={{color: C.dim}}>· updated 0 s ago</span></>} accent={C.line} o={o} />
      <Box x={M + 820} y={200} w={908} h={300} accent={C.amber} o={reveal} fill="#1a1710" title="What the response actually carried" titleSize={26}>
        <div style={{fontFamily: F.mono, fontSize: 26, color: C.text, marginTop: 16, lineHeight: 1.6, whiteSpace: 'pre'}}>
          <div>value            <span style={{color: C.cyan}}>{EV.value}</span></div>
          <div>servedAt         <span style={{color: C.green}}>{clk(600)}</span>  ← 0 s ago</div>
          <div>collectedAt      <span style={{color: C.amber}}>{EV.collectedAt}</span></div>
          <div>sourceObservedAt <span style={{color: C.amber}}>{EV.sourceObservedAt}</span>  ← 600 s ago</div>
        </div>
      </Box>
      <Txt x={M} y={560} w={W - 2 * M} size={40} weight={700} color={C.amber} o={both}>Both statements are true. The first hides the second.</Txt>
      <Txt x={M} y={640} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6, 6.6)}>Observed from the local fixture at sim 00:10:00 (collector failure scenario): HTTP 200, measurementAgeSeconds 600, naive label "Live".</Txt>
    </>
  );
};

/* 2. Four timelines */
const Timelines: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>Four stages, four timestamps</Overline>
    <LaneStack t={t} />
    <LaneNote lane="source" text="observes a value → sourceObservedAt" o={ep(t, 0.6, 1)} />
    <LaneNote lane="collector" text="samples every 600 s → collectedAt" o={ep(t, 1.6, 2)} />
    <LaneNote lane="api" text="serves latest stored → servedAt" o={ep(t, 2.8, 3.2)} />
    <LaneNote lane="browser" text="polls every 30 s → poll time" o={ep(t, 3.8, 4.2)} />
    <Svg>
      <AxisLabels o={ep(t, 0.6, 1.2)} />
      <Tick lane="source" s={0} color={C.cyan} tall o={ep(t, 0.8, 1.2)} label="21.2 observed" />
      <Tick lane="collector" s={0} color={C.cyan} tall o={ep(t, 1.8, 2.2)} label="sample" />
      <Tick lane="collector" s={600} color={C.cyan} tall o={ep(t, 2.2, 2.6)} label="sample" />
      {Array.from({length: 21}, (_, i) => (i + 1) * 30).map((s, i) => (
        <Tick key={s} lane="browser" s={s} color={C.cyanDim} o={ep(t, 4 + i * 0.08, 4.3 + i * 0.08)} />
      ))}
      <Arrow x1={tx(0)} y1={LY.source + 125} x2={tx(0)} y2={LY.collector + 60} p={ep(t, 1.4, 1.8)} color={C.cyan} />
      <Arrow x1={tx(0)} y1={LY.collector + 125} x2={tx(0)} y2={LY.api + 60} p={ep(t, 2.6, 3)} color={C.cyan} />
    </Svg>
    <Txt x={M} y={870} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 5.4, 6)}>Each stage stamps its own time from one shared, compressed clock. No stage rewrites another's stamp.</Txt>
  </>
);

/* 3. Successful polling without a new collected reading */
const PollOk: React.FC<SceneProps> = ({t}) => {
  const n = Math.floor(prog(t, 0.6, 5.2) * EV.pollsBeforeRecollect);
  const cur = n * 30;
  return (
    <>
      <Overline y={110}>Browser polls · collector does not</Overline>
      <SimClock simSeconds={Math.max(30, cur)} />
      <LaneStack t={0.9} hi={{browser: C.cyan, api: C.cyan}} />
      <LaneNote lane="collector" text="one sample at 00:00:00, next at 00:10:00" color={C.amber} />
      <Svg>
        <AxisLabels />
        <Tick lane="source" s={0} color={C.cyan} tall label="21.2" />
        <Tick lane="collector" s={0} color={C.cyan} tall label="collectedAt 00:00:00" />
        <Tick lane="collector" s={600} color={C.mute} tall o={0.5} label="next" />
        {Array.from({length: EV.pollsBeforeRecollect}, (_, i) => (i + 1) * 30).map((s, i) => (
          <g key={s}>
            <Tick lane="api" s={s} color={C.green} o={step(n, i + 1)} />
            <Tick lane="browser" s={s} color={C.green} o={step(n, i + 1)} />
            <text x={tx(s)} y={LY.browser + 64} fill={C.green} fontFamily={F.mono} fontSize={18} textAnchor="middle" opacity={step(n, i + 1)}>200</text>
          </g>
        ))}
        {n > 0 && <Arrow x1={tx(cur)} y1={LY.api + 70} x2={tx(cur)} y2={LY.browser + 60} p={1} color={C.green} />}
      </Svg>
      <Badge x={M + 24} y={LY.api + 76} label="polls · all 200" value={String(n)} color={C.green} big />
      <Code x={1200} y={LY.source + 22} w={580} size={22} title="every response body (sim)" lines={[
        `sourceObservedAt: ${EV.sourceObservedAt}  value ${EV.value}`,
        `collectedAt:      ${EV.collectedAt}`,
        `servedAt:         ${clk(Math.max(30, cur))}`,
      ]} hi={[2]} hiColor={C.green} o={ep(t, 1, 1.4)} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 5.4, 6)}>Observed from the local fixture: 19 polls before t=600, all HTTP 200, one distinct collectedAt.</Txt>
    </>
  );
};

/* 4. Response freshness vs measurement freshness */
const Compare: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>Two different freshness numbers · sim 00:09:30</Overline>
    <SimClock simSeconds={570} />
    <Box x={M} y={210} w={800} h={400} accent={C.green} fill="#101a14" o={ep(t, 0.2, 0.7)}>
      <div style={{position: 'absolute', left: 24, bottom: 22, fontFamily: F.mono, fontSize: 24, color: C.dim}}>servedAt {clk(570)} · HTTP 200</div>
    </Box>
    <Overline x={M + 24} y={232} color={C.green} o={ep(t, 0.2, 0.7)}>Response freshness</Overline>
    <Readout x={M + 150} y={310} w={500} label="seconds since servedAt" value="0 s" color={C.green} o={ep(t, 0.6, 1.1)} />
    <Box x={M + 928} y={210} w={800} h={400} accent={C.amber} fill="#1a1710" o={ep(t, 1.4, 1.9)}>
      <div style={{position: 'absolute', left: 24, bottom: 22, fontFamily: F.mono, fontSize: 24, color: C.dim}}>sourceObservedAt {EV.sourceObservedAt} · value {EV.value}</div>
    </Box>
    <Overline x={M + 952} y={232} color={C.amber} o={ep(t, 1.4, 1.9)}>Measurement freshness</Overline>
    <Readout x={M + 1078} y={310} w={500} label="seconds since sourceObservedAt" value="570 s" color={C.amber} o={ep(t, 1.8, 2.3)} />
    <Badge x={M} y={660} label="naive label" value="Live · updated 0 s ago" color={C.green} big o={ep(t, 3, 3.5)} />
    <Txt x={M + 620} y={672} w={1100} size={34} weight={700} color={C.amber} o={ep(t, 3.6, 4.2)}>reports only the left number. The right one is the one you care about.</Txt>
    <Txt x={M} y={790} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 4.6, 5.2)}>Observed from the local fixture: poll at sim t=570 → servedAt 00:09:30, sourceObservedAt 00:00:00, measurementAgeSeconds 570, naiveUpdatedSecondsAgo 0.</Txt>
  </>
);

/* 5. Replace Live with measurement age + connection status */
const Fix: React.FC<SceneProps> = ({t}) => {
  const swap = ep(t, 2.6, 3.2);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · two facts instead of one word</Overline>
      <Code x={M} y={180} w={900} title="state-rules.mjs · pure, reads the shared clock" size={26} hi={[0, 3]} hiColor={C.green} lines={[
        'age = now - reading.sourceObservedAt',
        '// not collectedAt, servedAt or poll time',
        '// never reset when a response arrives',
        "conn = lastPoll.ok ? 'connected' : 'down'",
        "fresh = age > STALE_THRESHOLD ? 'stale' : 'ok'",
        '// STALE_THRESHOLD = 300 s  (this fixture)',
      ]} />
      <Gate x={M + 960} y={180} w={768} title="What the panel derives" accent={C.green} checks={[
        {label: 'Age from sourceObservedAt', state: swap > 0.5 ? 'pass' : 'pending'},
        {label: 'Connection from the last poll', state: swap > 0.5 ? 'pass' : 'pending'},
        {label: 'Age reset by an arriving response', state: swap > 0.5 ? 'missing' : 'pending'},
      ]} />
      <Panel x={M} y={520} w={800} status={<><Dot color={C.green} /><span style={{color: C.green, fontWeight: 700}}>Connected</span><span style={{color: C.amber, fontWeight: 700}}>· Measured 570 s ago</span></>} accent={C.green} o={ep(t, 3.4, 4)}>
        <div style={{position: 'absolute', right: 24, top: 70}}><Badge x={0} y={0} label="freshness" value="STALE" color={C.amber} /></div>
      </Panel>
      <Box x={M + 860} y={560} w={868} h={200} accent={C.amber} dashed fill="transparent" o={ep(t, 4.4, 5)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE POLICY</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 8, lineHeight: 1.3}}>Stale after 300 s is <b>this fixture's</b> choice. A daily report or a slow sensor could set hours. Connected and stale can both be true at once.</div>
      </Box>
    </>
  );
};

/* 6. Advance the shared clock; the source value does not change */
const Advance: React.FC<SceneProps> = ({t, dur}) => {
  const simS = 30 + Math.floor(prog(t, 0.4, dur - 1.2) * 210); // sim 30 → 240
  const pollsDone = Math.floor(simS / 30);
  return (
    <>
      <Overline y={110} color={C.amber}>Advance the shared clock · source untouched</Overline>
      <SimClock simSeconds={simS} />
      <Panel x={M} y={210} w={760} value={EV.value} accent={C.line} status={<><Dot color={C.green} /><span style={{color: C.green, fontWeight: 700}}>Connected</span><span style={{color: simS > EV.staleThreshold ? C.amber : C.text}}>· Measured {simS} s ago</span></>} />
      <Box x={M + 820} y={210} w={908} h={300} accent={C.line} title="Source" sub="last observation 00:00:00 · value 21.2 · no new observation" titleSize={28}>
        <div style={{marginTop: 20, fontFamily: F.mono, fontSize: 24, color: C.dim, lineHeight: 1.6}}>
          <div>collector next sample at <span style={{color: C.text}}>00:10:00</span></div>
          <div>polls so far <span style={{color: C.green}}>{pollsDone}</span> · every one <span style={{color: C.green}}>200</span></div>
          <div>distinct collectedAt seen <span style={{color: C.amber}}>1</span></div>
        </div>
      </Box>
      <Svg>
        {Array.from({length: 8}, (_, i) => (i + 1) * 30).map((s) => (
          <g key={s} opacity={step(simS, s)}>
            <circle cx={M + 60 + (s / 30 - 1) * 220} cy={640} r={14} fill={C.green} />
            <text x={M + 60 + (s / 30 - 1) * 220} y={690} fill={C.dim} fontFamily={F.mono} fontSize={22} textAnchor="middle">{clk(s)}</text>
            <text x={M + 60 + (s / 30 - 1) * 220} y={722} fill={C.green} fontFamily={F.mono} fontSize={20} textAnchor="middle">200</text>
          </g>
        ))}
        <line x1={M + 40} y1={640} x2={M + 60 + 7 * 220 + 20} y2={640} stroke={C.line} strokeWidth={3} />
      </Svg>
      <Txt x={M} y={770} w={W - 2 * M} size={30} color={C.amber} o={ep(t, 2, 2.6)}>Each response arrives fresh. None of them makes the measurement younger.</Txt>
      <Txt x={M} y={840} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 3, 3.6)}>Compressed clock: this scene jumps 210 simulated seconds. The fixture advances the clock in 1 s steps; nothing waits in real time.</Txt>
    </>
  );
};

/* 7. Age increases between polls; crosses the fixture's stale policy */
const AgeGrows: React.FC<SceneProps> = ({t, dur}) => {
  const rows = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540, 570].map((s) => ({
    t: `poll ${clk(s)}  200  value 21.2  age ${String(s).padStart(3, ' ')} s  ${s > EV.staleThreshold ? 'STALE' : 'fresh'}`,
    c: s > EV.staleThreshold ? C.amber : C.green,
  }));
  const shown = prog(t, 0.3, dur - 1.6) * rows.length;
  const idx = Math.min(rows.length - 1, Math.max(0, Math.floor(shown) - 1));
  const simS = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540, 570][idx];
  const stale = simS > EV.staleThreshold;
  return (
    <>
      <Overline y={110} color={stale ? C.amber : C.cyan}>Age between polls · all responses 200</Overline>
      <SimClock simSeconds={simS} />
      <Log x={M} y={180} w={1040} lines={rows} shown={shown} size={24} title="evidence.json · healthy scenario (sim time)" />
      <Readout x={M + 1120} y={220} w={600} label="measurement age (s)" value={simS} color={stale ? C.amber : C.green} />
      <Badge x={M + 1260} y={430} label="freshness" value={stale ? 'STALE' : 'fresh'} color={stale ? C.amber : C.green} big />
      <Svg>
        <line x1={M + 1140} y1={520} x2={M + 1720} y2={520} stroke={C.line} strokeWidth={3} />
        <rect x={M + 1140} y={508} width={(580 * Math.min(simS, 600)) / 600} height={24} rx={6} fill={stale ? C.amber : C.green} />
        <line x1={M + 1140 + 580 * 0.5} y1={490} x2={M + 1140 + 580 * 0.5} y2={550} stroke={C.amber} strokeWidth={4} strokeDasharray="8 6" />
        <text x={M + 1140 + 580 * 0.5} y={580} fill={C.amber} fontFamily={F.mono} fontSize={20} textAnchor="middle">300 s policy</text>
        <text x={M + 1140} y={580} fill={C.mute} fontFamily={F.mono} fontSize={20} textAnchor="start">0</text>
        <text x={M + 1720} y={580} fill={C.mute} fontFamily={F.mono} fontSize={20} textAnchor="end">600</text>
      </Svg>
      <Box x={M + 1120} y={620} w={608} h={170} accent={C.amber} dashed fill="transparent">
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 2}}>STALE_THRESHOLD_SECONDS = 300</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 8, lineHeight: 1.3}}>This dashboard's policy. Not a universal rule: ten-minute-old data is fine for many uses.</div>
      </Box>
      <Txt x={M} y={860} w={1040} size={24} color={C.dim} o={ep(t, dur - 2.2, dur - 1.6)}>Observed from the local fixture: first "stale" at sim t=330; max age before re-collection 570 s; 19 × HTTP 200.</Txt>
    </>
  );
};

/* 8. Collector failure, then API failure */
const Failures: React.FC<SceneProps> = ({t, dur}) => {
  const half = dur / 2;
  const a = ep(t, 0.2, 0.8);
  const b = ep(t, half, half + 0.6);
  return (
    <>
      <Overline y={110} color={C.red}>Two failures · two different signals</Overline>
      {/* left: collector failure */}
      <Box x={M} y={170} w={830} h={720} accent={C.amber} o={a} fill="#14141a">
        <div style={{position: 'absolute', left: 24, top: 70, fontFamily: F.mono, fontSize: 24, lineHeight: 1.7, whiteSpace: 'pre'}}>
          <div style={{color: C.red}}>collector sample 00:10:00  FAILED</div>
          <div style={{color: C.red}}>collector sample 00:20:00  FAILED</div>
          <div style={{color: C.green}}>API GET /latest           200  (old reading)</div>
          <div style={{color: C.text}}>sourceObservedAt           00:00:00</div>
        </div>
        <div style={{position: 'absolute', left: 24, right: 24, top: 270}}>
          <Panel x={0} y={0} w={782} value={EV.value} accent={C.amber} status={<><Dot color={C.green} /><span style={{color: C.green, fontWeight: 700}}>Connected</span><span style={{color: C.amber, fontWeight: 700}}>· Measured 1200 s ago</span></>}>
            <div style={{position: 'absolute', right: 24, top: 70}}><Badge x={0} y={0} label="freshness" value="STALE" color={C.amber} /></div>
          </Panel>
        </div>
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, fontSize: 24, color: C.dim, lineHeight: 1.3}}>The HTTP path is healthy. The measurement is not. Both are reported, separately.</div>
      </Box>
      <Overline x={M + 24} y={190} color={C.amber} o={a}>1 · Collector fails</Overline>
      {/* right: API failure */}
      <Box x={M + 898} y={170} w={830} h={720} accent={C.red} o={b} fill="#1a1012">
        <div style={{position: 'absolute', left: 24, top: 70, fontFamily: F.mono, fontSize: 24, lineHeight: 1.7, whiteSpace: 'pre'}}>
          <div style={{color: C.red}}>poll 00:01:30  503 Service Unavailable</div>
          <div style={{color: C.red}}>poll 00:02:00  503 Service Unavailable</div>
          <div style={{color: C.text}}>last known value kept    21.2</div>
          <div style={{color: C.text}}>sourceObservedAt         00:00:00</div>
        </div>
        <div style={{position: 'absolute', left: 24, right: 24, top: 270}}>
          <Panel x={0} y={0} w={782} value={EV.value} accent={C.red} status={<><Dot color={C.red} /><span style={{color: C.red, fontWeight: 700}}>Disconnected</span><span style={{color: C.text}}>· Measured 120 s ago</span></>}>
            <div style={{position: 'absolute', left: 24, right: 24, bottom: 18, fontSize: 21, color: C.red, fontFamily: F.mono, lineHeight: 1.3}}>{EV.apiFailure.warning}</div>
          </Panel>
        </div>
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, fontSize: 24, color: C.dim, lineHeight: 1.3}}>No current reading is invented. The value shown is the last one actually received, and it says so.</div>
      </Box>
      <Overline x={M + 922} y={190} color={C.red} o={b}>2 · API fails</Overline>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={250} align="center" size={80} o={ep(t, 0.2, 0.9)}>Freshly fetched does not<br />mean freshly observed.</Big>
    <Txt x={M} y={540} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Polling faster, or a WebSocket, delivers the same old reading sooner. In the fixture, 119 polls and 19 polls both saw one collector sample.</Txt>
    <Txt x={M} y={640} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 2.6, 3.2)}>A timestamp from the future is flagged "impossible", never shown as a negative age.</Txt>
    <Txt x={M} y={730} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.4, 4)}>Simulated pipeline on one shared, compressed clock. Real systems have separate clocks; skew between them is not modelled here. The 300 s stale threshold is this fixture's policy.</Txt>
  </>
);

export const scenes = {fail: Fail, timelines: Timelines, poll_ok: PollOk, compare: Compare, fix: Fix, advance: Advance, age_grows: AgeGrows, failures: Failures, end: End};
