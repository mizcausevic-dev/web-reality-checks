import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Values below are copied from fixtures/ep27-stale-search-responses/evidence.json.
   SIMULATED CONTROLLER driven by a mock API; every response is released explicitly by the test.
   Not recorded browser evidence. */
const EV = {
  re: ['redis', 'redux', 'regex', 'request'], // response for query "re"  (req-1)
  react: ['react', 'react-dom', 'react-router'], // response for query "react" (req-2)
  schedule: ['type "re"  → req-1', 'type "react"  → req-2', 'release req-2 (react)', 'release req-1 (re)'],
  flawedTimeline: [
    {seq: 1, event: 'start "re"', shown: 'none'},
    {seq: 2, event: 'start "react"', shown: 'none'},
    {seq: 3, event: 'success "react" (req-2)', shown: 'react'},
    {seq: 4, event: 'finally', shown: 'react'},
    {seq: 5, event: 'success "re" (req-1)', shown: 're'},
    {seq: 6, event: 'finally', shown: 're'},
  ],
  flawed: {finalQuery: 'react', finalResultsFor: 're'},
  corrected: {finalQuery: 'react', finalResultsFor: 'react', discards: ['success', 'finally'], generation: 2},
  staleFailure: {flawedError: 'network error (simulated)', correctedError: null, correctedDiscards: ['error', 'finally']},
  loading: {flawedLoading: false, flawedResultsFor: 're', correctedLoading: true, correctedResultsFor: 'none'},
  cleared: {flawedResultsFor: 're', correctedResultsFor: 'none'},
  disposed: {flawedWritesAfter: 2, correctedWritesAfter: 0},
  abort: {finalStateIdentical: true},
  tests: {pass: 22, fail: 0},
};

/* ---------- local components ---------- */
type PanelProps = {
  x: number; y: number; w?: number; h?: number;
  query: string; items: string[]; resultsFor: string | null; reqId?: string;
  loading?: boolean; error?: string | null; o?: number; accent?: string;
};
/** Illustrative search UI. Plain chrome, deliberately not any real product. */
const SearchPanel: React.FC<PanelProps> = ({x, y, w = 760, h = 470, query, items, resultsFor, reqId, loading = false, error = null, o = 1, accent}) => {
  const mismatch = resultsFor !== null && resultsFor !== query;
  const acc = accent ?? (mismatch ? C.red : C.line);
  return (
    <Box x={x} y={y} w={w} h={h} accent={acc} o={o} fill="#14171e" glow={mismatch}>
      <div style={{display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center'}}>
        {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
        <div style={{marginLeft: 12, color: C.mute, fontSize: 20, fontFamily: F.mono}}>search UI · illustrative</div>
      </div>
      <div style={{border: `2px solid ${C.line}`, borderRadius: 10, padding: '8px 16px', fontFamily: F.mono, fontSize: 32, color: C.text, background: '#0d0f14', height: 28 + 16}}>
        <span style={{color: C.mute}}>search: </span>{query}
      </div>
      <div style={{height: 38, marginTop: 8, fontSize: 26, fontWeight: 600, color: error ? C.red : C.amber}}>
        {error ? `error: ${error}` : loading ? 'loading…' : ''}
      </div>
      <div style={{height: 4 * 50}}>
        {items.map((it) => (
          <div key={it} style={{fontFamily: F.mono, fontSize: 28, padding: '5px 14px', borderRadius: 8, background: '#1a1e27', marginBottom: 6, color: C.text, height: 34}}>{it}</div>
        ))}
      </div>
      <div style={{marginTop: 4, fontSize: 24, fontWeight: 700, color: resultsFor === null ? C.mute : mismatch ? C.red : C.green}}>
        {resultsFor === null ? 'no results shown' : `showing results for "${resultsFor}" · ${reqId ?? ''}${mismatch ? '  ≠ query' : ''}`}
      </div>
    </Box>
  );
};

const Note: React.FC<{y: number; o?: number; color?: string; children: React.ReactNode}> = ({y, o = 1, color = C.dim, children}) => (
  <Txt x={M} y={y} w={W - 2 * M} align="center" size={26} color={color} o={o}>{children}</Txt>
);

const typed = (s: string, p: number) => s.slice(0, Math.ceil(s.length * p));

/* 1. Results for react appear, then results for re overwrite them */
const Fail: React.FC<SceneProps> = ({t}) => {
  const swapped = t >= 2.4;
  const shownLines = Math.min(EV.flawedTimeline.length, t < 2.4 ? Math.floor(t / 0.35) + 1 : t < 2.9 ? 5 : 6);
  const lines = EV.flawedTimeline.map((l) => ({
    t: `${l.seq}  ${l.event.padEnd(26)} shown: ${l.shown}`,
    c: l.seq >= 5 ? C.red : C.text,
  }));
  return (
    <>
      <Overline y={110} color={C.amber}>Flawed version · render every response</Overline>
      <SearchPanel x={M} y={170} w={800} h={480} query="react" items={swapped ? EV.re : EV.react} resultsFor={swapped ? 're' : 'react'} reqId={swapped ? 'req-1' : 'req-2'} />
      <Log x={960} y={170} w={864} lines={lines} shown={shownLines} size={24} title="evidence.json · stale_success · flawed" />
      <Badge x={960} y={520} label="query" value="react" color={C.cyan} o={ep(t, 0.3, 0.7)} />
      <Badge x={1240} y={520} label="results for" value={swapped ? 're' : 'react'} color={swapped ? C.red : C.green} o={ep(t, 0.3, 0.7)} />
      <Txt x={960} y={600} w={864} size={28} color={C.red} o={ep(t, 3.2, 3.8)}>The box says react. The list answers re.</Txt>
      <Note y={760} o={ep(t, 3.8, 4.4)}>Observed from the simulated controller: final query = {EV.flawed.finalQuery}, results shown = {EV.flawed.finalResultsFor}</Note>
    </>
  );
};

/* 2. Request order vs response order */
const Order: React.FC<SceneProps> = ({t}) => {
  const colX = [520, 1060];
  const bw = 400;
  const a1 = ep(t, 3.0, 4.2); // release req-2 (react)  : request #2 -> first response
  const a2 = ep(t, 5.2, 6.4); // release req-1 (re)     : request #1 -> second response
  return (
    <>
      <Overline y={110}>Request order ≠ response order</Overline>
      <Txt x={M} y={190} size={24} color={C.cyan} o={ep(t, 0.1, 0.5)} weight={700}>SENT (in this order)</Txt>
      <Box x={colX[0]} y={230} w={bw} h={110} title={'1st  "re"'} sub="req-1 · the slower one" accent={C.cyan} o={ep(t, 0.3, 0.9)} />
      <Box x={colX[1]} y={230} w={bw} h={110} title={'2nd  "react"'} sub="req-2 · the faster one" accent={C.cyan} o={ep(t, 1.4, 2.0)} />
      <Txt x={M} y={600} size={24} color={C.amber} o={ep(t, 2.4, 2.8)} weight={700}>ANSWERED (released by the test)</Txt>
      <Box x={colX[0]} y={640} w={bw} h={110} title={'1st  "react"'} sub="req-2 answers first" accent={C.amber} o={a1} />
      <Box x={colX[1]} y={640} w={bw} h={110} title={'2nd  "re"'} sub="req-1 answers last" accent={C.red} o={a2} />
      <Svg>
        <Arrow x1={colX[1] + bw / 2} y1={340} x2={colX[0] + bw / 2} y2={640} p={a1} color={C.amber} />
        <Arrow x1={colX[0] + bw / 2} y1={340} x2={colX[1] + bw / 2} y2={640} p={a2} color={C.red} />
      </Svg>
      <Txt x={M} y={800} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Release order is set step by step in the test: no timers, no machine timing.</Txt>
    </>
  );
};

/* 3. The late response from the earlier request */
const Late: React.FC<SceneProps> = ({t}) => {
  const fly = ep(t, 1.4, 3.0);
  const arrived = t >= 3.0;
  return (
    <>
      <Overline y={110}>The late response, still labelled with its own request</Overline>
      <Code x={M} y={170} w={640} title="response from req-1" lines={['{ requestId: "req-1",', '  query: "re",', '  items: ["redis", "redux", …] }']} hi={[0, 1]} hiColor={C.cyan} o={ep(t, 0.2, 0.8)} />
      <Code x={M} y={450} w={640} title="flawed handler" lines={['const res = await api.search(q);', 'setResults(res);   // no check', 'setLoading(false);']} hi={[1]} hiColor={C.red} o={ep(t, 0.6, 1.2)} />
      <SearchPanel x={980} y={170} w={780} h={480} query="react" items={arrived ? EV.re : EV.react} resultsFor={arrived ? 're' : 'react'} reqId={arrived ? 'req-1' : 'req-2'} />
      <Svg>
        <Arrow x1={760} y1={290} x2={960} y2={290} p={fly} color={C.red} />
      </Svg>
      <Pill x={770} y={230} text="req-1 · re" color={C.red} o={fly > 0.05 ? 1 : 0} mono />
      <Txt x={M} y={680} w={640} size={26} color={C.red} o={ep(t, 3.4, 4.0)}>Nothing compares this response to the current query.</Txt>
      <Note y={800} o={ep(t, 4.4, 5.0)}>Simulated controller · the response is data; the bug is the handler that renders it unchecked.</Note>
    </>
  );
};

/* 4. Add the latest-generation guard */
const Guard: React.FC<SceneProps> = ({t}) => {
  const gen = t < 1.4 ? 0 : t < 3.2 ? 1 : 2;
  const obsolete = t >= 5.0;
  return (
    <>
      <Overline y={110} color={C.green}>Corrected version · latest-generation guard</Overline>
      <Code x={M} y={170} w={820} title="corrected controller (excerpt)" size={26}
        lines={['async search(q) {', '  const gen = ++this.generation;', '  const res = await api.search(q);', '  if (gen !== this.generation) return;', '  this.results = res;', '}']}
        hi={t >= 5.4 ? [3] : t >= 1.4 ? [1] : []} hiColor={t >= 5.4 ? C.red : C.cyan} o={ep(t, 0.1, 0.7)} />
      <Readout x={1100} y={170} label="current generation" value={gen} color={gen === 2 ? C.green : C.cyan} w={340} o={ep(t, 0.3, 0.8)} />
      <Box x={1000} y={380} w={800} h={100} title={'search "re"  captured gen 1'} accent={obsolete ? C.red : C.cyan} o={ep(t, 1.6, 2.2) * (obsolete ? 0.8 : 1)} titleSize={30} sub={obsolete ? 'obsolete: 1 ≠ 2' : undefined} />
      <Box x={1000} y={510} w={800} h={100} title={'search "react"  captured gen 2'} accent={C.green} o={ep(t, 3.4, 4.0)} titleSize={30} sub={t >= 5.0 ? 'current: 2 = 2' : undefined} />
      <Txt x={M} y={600} w={820} size={28} color={C.text} o={ep(t, 5.4, 6.0)}>Each request remembers its own number. The controller owns the current number.</Txt>
      <Note y={800} o={ep(t, 6.4, 7.0)}>The counter is local to the client. It does not rely on server request IDs.</Note>
    </>
  );
};

/* 5. Repeat the exact response schedule */
const Retest: React.FC<SceneProps> = ({t}) => {
  const stepNo = t < 0.8 ? 0 : t < 1.8 ? 1 : t < 2.8 ? 2 : t < 3.8 ? 3 : 4;
  const query = stepNo === 0 ? '' : stepNo === 1 ? 're' : 'react';
  const loading = stepNo >= 1 && stepNo < 3;
  const hasReact = stepNo >= 3;
  return (
    <>
      <Overline y={110} color={C.green}>Same release schedule · corrected controller</Overline>
      {EV.schedule.map((s, i) => {
        const active = stepNo === i + 1;
        const done = stepNo > i + 1;
        const col = active ? C.cyan : done ? C.green : C.mute;
        return (
          <Box key={s} x={M} y={170 + i * 120} w={760} h={96} accent={col} o={ep(t, 0.2 + i * 0.1, 0.7 + i * 0.1)} glow={active} titleSize={28}>
            <div style={{display: 'flex', gap: 20, alignItems: 'center', fontSize: 30, fontWeight: 700, color: active || done ? C.text : C.dim}}>
              <span style={{color: col, fontSize: 40, width: 44}}>{i + 1}</span>
              <span style={{fontFamily: F.mono, fontSize: 28}}>{s}</span>
            </div>
          </Box>
        );
      })}
      <SearchPanel x={940} y={170} w={800} h={480} query={query} items={hasReact ? EV.react : []} resultsFor={hasReact ? 'react' : null} reqId="req-2" loading={loading} accent={hasReact ? C.green : undefined} />
      <Txt x={940} y={680} w={800} size={26} color={C.dim} o={ep(t, 4.2, 4.8)}>Step 4 is next: the older request answers.</Txt>
      <Note y={800} o={ep(t, 4.8, 5.4)}>Observed from the simulated controller: after step 3, results for "{EV.corrected.finalResultsFor}", generation {EV.corrected.generation}.</Note>
    </>
  );
};

/* 6. Discard the obsolete result (and its finally) */
const Discard: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.6, 2.0);
  const checked = t >= 2.0;
  const o1 = ep(t, 2.4, 3.0);
  const o2 = ep(t, 3.0, 3.6);
  return (
    <>
      <Overline y={110} color={C.red}>Request 1 answers, generation 1</Overline>
      <Box x={M} y={200} w={420} h={130} title="response" sub={'query "re" · req-1 · gen 1'} accent={C.red} titleSize={30} o={ep(t, 0.1, 0.5)} />
      <Svg>
        <Arrow x1={M + 420} y1={265} x2={680} y2={265} p={p} color={C.red} />
      </Svg>
      <Gate x={700} y={170} w={560} title="guard · gen === current ?" accent={checked ? C.red : C.cyan}
        checks={[{label: 'captured 1  vs  current 2', state: checked ? 'fail' : 'pending'}]} o={ep(t, 0.3, 0.8)} />
      <Box x={1340} y={170} w={484} h={90} title="success → discarded" accent={C.red} dashed titleSize={28} o={o1} />
      <Box x={1340} y={280} w={484} h={90} title="finally → discarded" accent={C.red} dashed titleSize={28} o={o2} />
      <Txt x={700} y={335} w={560} size={26} color={C.dim} o={ep(t, 2.4, 3.0)}>State is not written. Nothing re-renders.</Txt>

      <Overline y={470} color={C.cyan} o={ep(t, 4.0, 4.5)}>Variant: the older request answers first</Overline>
      <Box x={M} y={520} w={820} h={230} title="Flawed" sub="older finally clears loading" accent={C.red} o={ep(t, 4.2, 4.8)}>
        <div style={{marginTop: 10, fontFamily: F.mono, fontSize: 26, color: C.red, lineHeight: 1.45}}>loading = {String(EV.loading.flawedLoading)}  (req-2 still pending)<br />results for "{EV.loading.flawedResultsFor}"</div>
      </Box>
      <Box x={1004} y={520} w={820} h={230} title="Corrected" sub="older finally is ignored" accent={C.green} o={ep(t, 5.0, 5.6)}>
        <div style={{marginTop: 10, fontFamily: F.mono, fontSize: 26, color: C.green, lineHeight: 1.45}}>loading = {String(EV.loading.correctedLoading)}  (req-2 still pending)<br />results: {EV.loading.correctedResultsFor}</div>
      </Box>
      <Note y={790} o={ep(t, 6.0, 6.6)}>Observed from the simulated controller · discards recorded: {EV.corrected.discards.join(', ')}</Note>
    </>
  );
};

/* 7. Obsolete failure cannot replace current state */
const Failure: React.FC<SceneProps> = ({t}) => {
  const hit = t >= 2.8;
  return (
    <>
      <Overline y={110} color={C.red}>req-1 fails after req-2 succeeded</Overline>
      <Txt x={M} y={160} size={26} weight={700} color={C.red}>Flawed</Txt>
      <SearchPanel x={M} y={200} w={620} h={470} query="react" items={EV.react} resultsFor="react" reqId="req-2" error={hit ? EV.staleFailure.flawedError : null} accent={hit ? C.red : undefined} />
      <Txt x={736} y={160} size={26} weight={700} color={C.green}>Corrected</Txt>
      <SearchPanel x={736} y={200} w={620} h={470} query="react" items={EV.react} resultsFor="react" reqId="req-2" error={null} accent={C.green} />
      <Pill x={1400} y={118} text="req-1 fails (simulated)" color={C.red} o={ep(t, 1.2, 1.8)} size={24} />
      <Badge x={736} y={690} label="discarded" value="error · gen 1 ≠ 2" color={C.green} o={ep(t, 2.8, 3.4)} />
      <Gate x={1400} y={200} w={424} title="guard sites" accent={C.green}
        checks={[
          {label: 'success path', state: t >= 3.6 ? 'pass' : 'pending'},
          {label: 'error path', state: t >= 4.4 ? 'pass' : 'pending'},
          {label: 'finally path', state: t >= 5.2 ? 'pass' : 'pending'},
        ]} o={ep(t, 3.2, 3.8)} />
      <Txt x={1400} y={470} w={424} size={24} color={C.dim} o={ep(t, 5.6, 6.2)}>Corrected discards: {EV.staleFailure.correctedDiscards.join(', ')}</Txt>
      <Note y={720} o={ep(t, 6.0, 6.6)}>Observed from the simulated controller: flawed error = "{EV.staleFailure.flawedError}"; corrected error = none.</Note>
    </>
  );
};

/* Local card for the "other paths" scene */
const Card: React.FC<{x: number; y: number; title: string; sub: string; accent: string; rows: {text: string; color: string}[]; o?: number}> = ({x, y, title, sub, accent, rows, o = 1}) => (
  <Box x={x} y={y} w={844} h={330} title={title} sub={sub} accent={accent} o={o}>
    <div style={{marginTop: 14}}>
      {rows.map((r, i) => (
        <div key={i} style={{fontSize: 26, fontWeight: 600, color: r.color, lineHeight: 1.3, marginBottom: 8}}>{r.text}</div>
      ))}
    </div>
  </Box>
);

/* 8. Clear, dispose, abort, debounce */
const Paths: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>Other ways a pending response goes stale</Overline>
    <Card x={M} y={160} title="Query cleared" sub="clear() increments the generation" accent={C.cyan} o={ep(t, 0.2, 0.8)}
      rows={[
        {text: `Flawed: empty box, results for "${EV.cleared.flawedResultsFor}"`, color: C.red},
        {text: `Corrected: empty box, results: ${EV.cleared.correctedResultsFor}`, color: C.green},
      ]} />
    <Card x={980} y={160} title="Component disposed" sub="dispose() increments the generation" accent={C.cyan} o={ep(t, 2.8, 3.4)}
      rows={[
        {text: `Flawed: ${EV.disposed.flawedWritesAfter} state writes after dispose`, color: C.red},
        {text: `Corrected: ${EV.disposed.correctedWritesAfter} state writes after dispose`, color: C.green},
      ]} />
    <Card x={M} y={520} title="Abort superseded requests" sub="optional optimisation, not the guard" accent={C.amber} o={ep(t, 5.4, 6.0)}
      rows={[
        {text: 'An abort error is discarded, never shown to the user.', color: C.text},
        {text: `Final state identical with and without abort: ${EV.abort.finalStateIdentical}`, color: C.green},
        {text: 'An abort does not prove the server stopped.', color: C.amber},
      ]} />
    <Card x={980} y={520} title="Debouncing" sub="fewer requests, not ordered responses" accent={C.amber} o={ep(t, 9.0, 9.6)}
      rows={[
        {text: 'Two requests can still be in flight together.', color: C.text},
        {text: 'Debouncing alone does not guarantee response order.', color: C.amber},
      ]} />
  </>
);

/* 9. End */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={84} o={ep(t, 0.2, 1.0)}>The last response is not always the latest answer.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 1.8, 2.4)}>Local UI concurrency control, not a general distributed-ordering solution.</Txt>
    <Txt x={M} y={660} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 2.6, 3.2)}>Server request IDs need not be ordered; the guard uses its own counter.</Txt>
    <Txt x={M} y={760} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.6, 4.2)}>Simulated controller and mock API · executed: {EV.tests.pass} tests pass, {EV.tests.fail} fail · not recorded browser evidence</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  fail: Fail,
  order: Order,
  late: Late,
  guard: Guard,
  retest: Retest,
  discard: Discard,
  failure: Failure,
  paths: Paths,
  end: End,
};
void prog;
void step;
