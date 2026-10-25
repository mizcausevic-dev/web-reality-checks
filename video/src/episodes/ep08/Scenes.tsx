import React from 'react';
import {Arrow, Big, Box, Code, Lane, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, eio, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep08-feels-slow/evidence.json (recorded run). */
const EV = {
  beforeBytes: 12_173_721,
  afterBytes: 17_004,
  beforeDims: '4000×2250 PNG',
  afterDims: '1600×900 WebP q80',
  beforeMedianMs: 4253.02,
  afterMedianMs: 1.4,
  beforeRaw: [4299.32, 4921.91, 4253.02, 3555.42, 3288.51, 3891.63, 4488.83],
  afterRaw: [9.24, 1.35, 1.31, 29.84, 1.35, 1.4, 21.4],
  runs: 7,
  items: 20000,
  digest: 'ec44c9fd',
  node: 'Node v22.23.4',
};
const HANDLER_LABEL = 'Fixture-measured handler CPU time in Node · NOT browser INP';
const BYTES_LABEL = 'File bytes served by the loopback fixture · not a transfer time, not LCP';
const fmt = (n: number) => n.toLocaleString('en-GB');

/* ---- Local helpers ---- */

/** Illustrative page mock (plain Box chrome, never a real product). hero∈[0,1] = how much of the hero has arrived. */
const PageMock: React.FC<{x: number; y: number; w: number; h: number; hero: number; label: string; accent?: string; o?: number; clicked?: number; result?: string}> = ({x, y, w, h, hero, label, accent = C.line, o = 1, clicked = 0, result}) => {
  const heroH = Math.round(h * 0.52);
  return (
    <Box x={x} y={y} w={w} h={h} accent={accent} o={o} fill="#14171e">
      <div style={{display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center'}}>
        {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.6}} />)}
        <div style={{marginLeft: 14, color: C.mute, fontSize: 20, fontFamily: 'DejaVu Sans Mono'}}>http://127.0.0.1/{label}/</div>
        <div style={{marginLeft: 'auto', color: C.amber, fontSize: 16, letterSpacing: 2, fontWeight: 700}}>ILLUSTRATIVE</div>
      </div>
      <div style={{position: 'relative', height: heroH, borderRadius: 12, overflow: 'hidden', background: '#1a1e27'}}>
        {/* hero fills top-down as bytes arrive; the gradient stands in for the synthetic landscape */}
        <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: `${hero * 100}%`, background: 'linear-gradient(180deg, #121630 0%, #5a3a70 55%, #f59646 100%)'}} />
        {hero < 1 && <div style={{position: 'absolute', left: 16, top: heroH * hero + 10, color: C.mute, fontSize: 20, fontFamily: 'DejaVu Sans Mono'}}>hero image… {Math.round(hero * 100)}%</div>}
        <div style={{position: 'absolute', left: 20, bottom: 14, fontSize: 30, fontWeight: 800, color: C.text, textShadow: '0 2px 16px rgba(0,0,0,.7)'}}>Twenty thousand places, one map.</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginTop: 18}}>
        <div>
          {[1, 0.8, 0.9].map((wf, i) => <div key={i} style={{height: 14, width: `${wf * 100}%`, borderRadius: 7, background: '#22262f', marginBottom: 12}} />)}
        </div>
        <div>
          <div style={{padding: '12px 18px', borderRadius: 10, background: clicked > 0.5 && !result ? C.cyanDim : C.cyan, color: C.bg, fontSize: 22, fontWeight: 700, textAlign: 'center', transform: clicked > 0.5 && !result ? 'translateY(1px)' : 'none'}}>Show related counts</div>
          <div style={{marginTop: 10, color: result ? C.green : C.mute, fontSize: 20, fontFamily: 'DejaVu Sans Mono', minHeight: 28}}>{result ?? (clicked > 0.5 ? '…' : 'Click to compute.')}</div>
        </div>
      </div>
    </Box>
  );
};

/** Two horizontal timeline lanes used in several scenes. */
const TL = {load: 200, inter: 520};
const TwoLanes: React.FC<{t: number; hiLoad?: boolean; hiInter?: boolean}> = ({t, hiLoad = true, hiInter = true}) => (
  <>
    <Lane y={TL.load} h={250} label="Loading timeline" accent={hiLoad ? C.cyan : C.mute} o={ep(t, 0, 0.4)} />
    <Lane y={TL.inter} h={250} label="Interaction timeline" accent={hiInter ? C.cyan : C.mute} o={ep(t, 0.2, 0.6)} />
  </>
);

const Note: React.FC<{o: number; color?: string; y?: number; children: React.ReactNode}> = ({o, color = C.dim, y = 845, children}) => (
  <Txt x={M} y={y} w={W - 2 * M} align="center" size={26} color={color} o={o}>{children}</Txt>
);

/* 1. fail — the polished page loads its hero slowly and reacts late to a click */
const Fail: React.FC<SceneProps> = ({t}) => {
  const hero = prog(t, 0.6, 4.2); // slow arrival
  const clicked = step(t, 4.6);
  const result = t > 7.6 ? 'digest ec44c9fd · 20000 items' : undefined;
  const waiting = clicked === 1 && !result;
  return (
    <>
      <PageMock x={300} y={150} w={1000} h={700} hero={hero} label="before" clicked={clicked} result={result} accent={waiting ? C.red : C.line} />
      <Box x={1340} y={170} w={484} h={150} title="Hero image" sub={hero < 1 ? `arriving slowly · ${Math.round(hero * 100)}%` : 'painted late'} accent={hero < 1 ? C.amber : C.red} titleSize={28} o={ep(t, 0.6, 1)} />
      <Box x={1340} y={360} w={484} h={150} title="Click" sub={!clicked ? 'not yet' : waiting ? `waiting… ${(t - 4.6).toFixed(1)} s` : 'responded late'} accent={!clicked ? C.mute : C.red} titleSize={28} o={ep(t, 0.6, 1)} glow={waiting} />
      <Txt x={1340} y={560} w={484} size={30} weight={700} color={C.amber} o={ep(t, 8, 8.5)}>Two complaints. One word: “slow”.</Txt>
      <Note o={ep(t, 2, 2.5)} color={C.mute}>Illustrative page mock. The fixture pages are at fixtures/ep08-feels-slow/before and /after.</Note>
    </>
  );
};

/* 2. timelines — separate loading from interaction */
const Timelines: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 1.0, 3.0);
  const p2 = ep(t, 3.4, 5.4);
  return (
    <>
      <Overline y={110}>Two timelines, two questions</Overline>
      <TwoLanes t={t} />
      <Svg>
        <Arrow x1={M + 40} y1={TL.load + 130} x2={W - M - 40} y2={TL.load + 130} p={1} color={C.line} width={3} />
        <Arrow x1={M + 40} y1={TL.inter + 130} x2={W - M - 40} y2={TL.inter + 130} p={1} color={C.line} width={3} />
      </Svg>
      <Pill x={M + 40} y={TL.load + 60} text="navigation" color={C.mute} o={ep(t, 0.6, 1)} />
      <Token x1={M + 200} y1={TL.load + 60} x2={M + 1200} y2={TL.load + 60} p={p1} text="hero bytes → decode → paint" color={C.cyan} />
      <Pill x={M + 1340} y={TL.load + 60} text="largest element painted" color={C.cyanDim} o={ep(t, 2.8, 3.2)} />
      <Txt x={M + 40} y={TL.load + 165} w={1600} size={28} color={C.dim} o={ep(t, 2.4, 2.9)}>Loading: how soon is the largest thing on screen painted?  (lab metric: LCP)</Txt>

      <Pill x={M + 40} y={TL.inter + 60} text="click" color={C.mute} o={ep(t, 3.2, 3.6)} />
      <Token x1={M + 200} y1={TL.inter + 60} x2={M + 1200} y2={TL.inter + 60} p={p2} text="input delay → handler → next paint" color={C.cyan} />
      <Pill x={M + 1340} y={TL.inter + 60} text="page responds" color={C.cyanDim} o={ep(t, 5.2, 5.6)} />
      <Txt x={M + 40} y={TL.inter + 165} w={1600} size={28} color={C.dim} o={ep(t, 4.8, 5.3)}>Interaction: how soon does the page respond after you act?  (lab metric: Event Timing)</Txt>

      <Txt x={M} y={810} w={W - 2 * M} align="center" size={32} weight={700} color={C.amber} o={ep(t, 6, 6.6)}>Fixing one does nothing for the other.</Txt>
    </>
  );
};

/* 3. hero_request — inspect the hero image request */
const HeroRequest: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 0.8, 1.6);
  const bytes = prog(t, 2.0, 6.0);
  const painted = step(t, 6.2);
  return (
    <>
      <Overline y={110}>Loading timeline · the hero request</Overline>
      <Box x={M} y={190} w={420} h={170} title="Browser" sub="needs the hero to paint" accent={C.cyan} />
      <Box x={W - M - 420} y={190} w={420} h={170} title="Loopback server" sub="127.0.0.1 · no-store" accent={C.mute} />
      <Svg>
        <Arrow x1={M + 430} y1={250} x2={W - M - 430} y2={250} p={req} label="GET /assets/hero-large.png" />
        <Arrow x1={W - M - 430} y1={310} x2={M + 430} y2={310} p={bytes} color={C.amber} width={6 + 10 * bytes} label={`${fmt(Math.round(EV.beforeBytes * bytes))} bytes…`} labelDy={34} />
      </Svg>
      <Code x={M} y={420} w={820} title="before/index.html · hero" size={26} hi={[1]} hiColor={C.red} lines={[
        '<section class="hero">',
        '  <img src="/assets/hero-large.png"',
        '       width="4000" height="2250"',
        '       fetchpriority="high">   <!-- no lazy -->',
        '</section>',
      ]} />
      <Box x={M + 880} y={420} w={848} h={240} accent={C.red} o={ep(t, 2.4, 2.9)} fill="#1c1012">
        <div style={{fontSize: 22, color: C.red, fontWeight: 700, letterSpacing: 2}}>WHAT WAS REQUESTED</div>
        <div style={{fontSize: 44, fontWeight: 800, color: C.text, marginTop: 8}}>{fmt(EV.beforeBytes)} bytes</div>
        <div style={{fontSize: 26, color: C.dim, marginTop: 6}}>{EV.beforeDims} · lossless · for a slot 1600 CSS px wide</div>
        <div style={{fontSize: 24, color: C.amber, marginTop: 10}}>{painted ? 'Largest element painted only after all bytes arrived and decoded.' : 'Largest element cannot paint yet.'}</div>
      </Box>
      <Txt x={M} y={700} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 6.4, 6.9)}>The slot is 1600 px wide. 4000 px of lossless pixels is more than it can ever show.</Txt>
      <Note o={ep(t, 3, 3.5)}>Observed from the local fixture: GET /assets/hero-large.png → 200, content-length {fmt(EV.beforeBytes)}. {BYTES_LABEL}.</Note>
    </>
  );
};

/* 4. handler_work — inspect the interaction handler's main-thread work */
const HandlerWork: React.FC<SceneProps> = ({t}) => {
  const click = step(t, 0.6);
  const work = prog(t, 0.9, 6.5);
  const done = step(t, 6.6);
  const n = Math.round(EV.items * work);
  return (
    <>
      <Overline y={110} color={C.red}>Interaction timeline · main-thread work</Overline>
      <Lane y={190} h={230} label="Main thread" accent={C.red} />
      <Pill x={M + 40} y={250} text="click" color={click ? C.cyan : C.mute} />
      {/* one long synchronous block, growing with the work */}
      <div style={{position: 'absolute', left: M + 200, top: 250, width: Math.max(2, 1380 * work), height: 56, borderRadius: 10, background: done ? C.redDim : C.red, opacity: 0.9}} />
      <Txt x={M + 220} y={262} size={26} color={C.bg} weight={800}>{done ? 'relatedCounts() · returned' : `relatedCounts() · item ${fmt(n)} of ${fmt(EV.items)}`}</Txt>
      <Pill x={M + 1600} y={250} text="paint" color={done ? C.cyan : C.mute} o={0.5 + 0.5 * done} />
      <Txt x={M + 40} y={330} w={1600} size={26} color={C.dim}>{done ? 'Only now can the next frame paint.' : 'No frame can paint while this block runs.'}</Txt>

      <Code x={M} y={450} w={820} title="handler-before.mjs · O(n²)" size={26} hi={[2, 3]} hiColor={C.red} lines={[
        'for (let i = 0; i < n; i++) {',
        '  let c = 0;',
        '  for (let j = 0; j < n; j++)',
        '    if (j!==i && same(items[i],items[j])) c++;',
        '  out[i] = c;',
        '}',
      ]} />
      <Box x={M + 880} y={450} w={848} h={300} accent={C.red} o={ep(t, 1, 1.5)} fill="#1c1012">
        <div style={{fontSize: 22, color: C.red, fontWeight: 700, letterSpacing: 2}}>HANDLER CPU TIME IN NODE · MEDIAN OF {EV.runs}</div>
        <div style={{fontSize: 72, fontWeight: 800, color: C.text, marginTop: 6, lineHeight: 1}}>{done ? `${fmt(EV.beforeMedianMs)} ms` : `${fmt(Math.round(EV.beforeMedianMs * work))} ms`}</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 10}}>20,000 × 20,000 comparisons, synchronous</div>
        <div style={{fontSize: 22, color: C.amber, marginTop: 14, fontWeight: 700}}>{HANDLER_LABEL}</div>
      </Box>
      <Note o={ep(t, 6.8, 7.3)}>Observed from the local fixture (evidence.json): before median {fmt(EV.beforeMedianMs)} ms over {EV.runs} runs, raw {EV.beforeRaw.map((x) => Math.round(x)).join(' · ')} ms. {EV.node}.</Note>
    </>
  );
};

/* 5. fix_image — apply the image correction */
const FixImage: React.FC<SceneProps> = ({t}) => {
  const swap = eio(t, 1.2, 2.2);
  const bytes = ep(t, 2.4, 4.4);
  const bw = 1500;
  const beforeW = bw;
  const afterW = Math.max(8, (EV.afterBytes / EV.beforeBytes) * bw);
  return (
    <>
      <Overline y={110} color={C.green}>Loading correction · size and encode the hero</Overline>
      <Code x={M} y={180} w={820} title="after/index.html · hero" size={26} hi={[1, 2]} hiColor={C.green} lines={[
        '<section class="hero">',
        '  <img src="/assets/hero-sized.webp"',
        '       width="1600" height="900"',
        '       fetchpriority="high">   <!-- no lazy -->',
        '</section>',
      ]} />
      <Box x={M + 880} y={180} w={848} h={236} accent={C.green} o={ep(t, 0.6, 1.1)} fill="#0f1a14">
        <div style={{fontSize: 22, color: C.green, fontWeight: 700, letterSpacing: 2}}>SAME PICTURE · SIZED TO THE SLOT</div>
        <div style={{fontSize: 44, fontWeight: 800, color: C.text, marginTop: 8}}>{fmt(EV.afterBytes)} bytes</div>
        <div style={{fontSize: 26, color: C.dim, marginTop: 6}}>{EV.afterDims} · for a slot 1600 CSS px wide</div>
      </Box>

      <Txt x={M} y={470} size={24} color={C.mute}>before · {EV.beforeDims}</Txt>
      <div style={{position: 'absolute', left: M, top: 505, width: beforeW * bytes, height: 44, borderRadius: 8, background: C.red, opacity: 0.85}} />
      <Txt x={M + 20} y={512} size={26} color={C.bg} weight={800} o={bytes}>{fmt(EV.beforeBytes)} bytes</Txt>
      <Txt x={M} y={575} size={24} color={C.mute}>after · {EV.afterDims}</Txt>
      <div style={{position: 'absolute', left: M, top: 610, width: afterW, height: 44, borderRadius: 8, background: C.green, opacity: 0.4 + 0.6 * swap}} />
      <Txt x={M + afterW + 16} y={617} size={26} color={C.green} weight={800} o={swap}>{fmt(EV.afterBytes)} bytes</Txt>

      <Box x={M} y={700} w={W - 2 * M} h={110} accent={C.amber} dashed o={ep(t, 5, 5.5)} fill="transparent">
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE POLICY</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>The hero stays above the fold and is NOT lazy-loaded: it is the element the viewer is waiting for. Lazy-loading it would delay the largest paint.</div>
      </Box>
      <Note o={ep(t, 4.4, 4.9)}>Observed from the local fixture: hero-large.png {fmt(EV.beforeBytes)} B → hero-sized.webp {fmt(EV.afterBytes)} B. {BYTES_LABEL}.</Note>
    </>
  );
};

/* 6. fix_handler — apply the handler correction and retest the same interaction */
const FixHandler: React.FC<SceneProps> = ({t}) => {
  const click = step(t, 0.6);
  const work = prog(t, 0.9, 1.1);
  const done = step(t, 1.15);
  return (
    <>
      <Overline y={110} color={C.green}>Interaction correction · same click, cheaper work</Overline>
      <Lane y={190} h={230} label="Main thread" accent={C.green} />
      <Pill x={M + 40} y={250} text="click" color={click ? C.cyan : C.mute} />
      <div style={{position: 'absolute', left: M + 200, top: 250, width: Math.max(4, 40 * work), height: 56, borderRadius: 10, background: C.green, opacity: 0.9}} />
      <Pill x={M + 260} y={250} text="paint" color={done ? C.cyan : C.mute} o={0.5 + 0.5 * done} />
      <Txt x={M + 40} y={330} w={1600} size={26} color={C.dim} o={ep(t, 1.2, 1.6)}>Still synchronous. Just very little of it: the next frame is not held up.</Txt>

      <Code x={M} y={450} w={820} title="handler-after.mjs · O(n)" size={26} hi={[1, 2]} hiColor={C.green} lines={[
        'const hist = new Map();',
        'for (const it of items)',
        '  hist.set(it.col, (hist.get(it.col) ?? 0)+1);',
        'for (let i = 0; i < n; i++)',
        '  out[i] = hist.get(items[i].col) - 1;',
      ]} />
      <Box x={M + 880} y={450} w={848} h={300} accent={C.green} o={ep(t, 1.6, 2.1)} fill="#0f1a14">
        <div style={{fontSize: 22, color: C.green, fontWeight: 700, letterSpacing: 2}}>HANDLER CPU TIME IN NODE · MEDIAN OF {EV.runs}</div>
        <div style={{fontSize: 72, fontWeight: 800, color: C.text, marginTop: 6, lineHeight: 1}}>{EV.afterMedianMs.toFixed(2)} ms</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 10}}>identical output · digest {EV.digest} in both variants</div>
        <div style={{fontSize: 22, color: C.amber, marginTop: 14, fontWeight: 700}}>{HANDLER_LABEL}</div>
      </Box>
      <Txt x={M} y={790} w={W - 2 * M} size={28} color={C.text} o={ep(t, 4.6, 5.1)}>The cost was removed, not hidden behind a spinner or an animation.</Txt>
      <Note o={ep(t, 2.4, 2.9)}>Observed from the local fixture (evidence.json): after median {EV.afterMedianMs.toFixed(2)} ms over {EV.runs} runs, raw {EV.afterRaw.map((x) => x.toFixed(1)).join(' · ')} ms. Same digest as before.</Note>
    </>
  );
};

/* 7. results — actual measured results with their conditions; what is Blocked */
const Results: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node fixtures/ep08-feels-slow/demo.mjs', c: C.mute},
    {t: `hero bytes   before ${fmt(EV.beforeBytes)}   after ${fmt(EV.afterBytes)}`, c: C.text},
    {t: `handler ms   before ${fmt(EV.beforeMedianMs)}   after ${EV.afterMedianMs.toFixed(2)}   (median of ${EV.runs})`, c: C.text},
    {t: `digest       before ${EV.digest}   after ${EV.digest}   equal`, c: C.green},
    {t: `${EV.node} · linux x64 · 2 vCPU · shared container`, c: C.mute},
    {t: '$ node --test fixtures/ep08-feels-slow/test.mjs', c: C.mute},
    {t: '# tests 7  # pass 7  # fail 0', c: C.green},
  ];
  const shown = prog(t, 0.3, 3.6) * lines.length;
  return (
    <>
      <Overline y={110} color={C.green}>Measured here · and what was not</Overline>
      <Log x={M} y={170} w={1080} lines={lines} shown={shown} title="Executed · fixture output" />
      <Box x={M + 1130} y={170} w={598} h={200} accent={C.green} o={ep(t, 1.4, 1.9)} fill="#0f1a14">
        <div style={{fontSize: 22, color: C.green, fontWeight: 700, letterSpacing: 2}}>MEASURED · FILE BYTES</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 8, lineHeight: 1.3}}>Served by the loopback fixture. Not a transfer time. Not LCP.</div>
      </Box>
      <Box x={M + 1130} y={400} w={598} h={200} accent={C.amber} o={ep(t, 2.4, 2.9)} fill="#1a150e">
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 2}}>MEASURED · HANDLER CPU, NODE</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 8, lineHeight: 1.3}}>{EV.runs} runs each, median + raw kept. NOT browser INP.</div>
      </Box>
      <Box x={M} y={500} w={1080} h={300} accent={C.red} dashed o={ep(t, 4, 4.5)} fill="transparent">
        <div style={{fontSize: 22, color: C.red, fontWeight: 700, letterSpacing: 2}}>BLOCKED · NO BROWSER LAB IN THIS ENVIRONMENT</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 10, lineHeight: 1.35}}>No LCP and no Event Timing / INP values exist for either page, so none are shown.</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 10, lineHeight: 1.35}}>To get them: one browser build, one viewport (1600×900), one CPU throttle, one network preset, cold and warm defined separately, ≥5 trials per variant, median reported, raw kept, an initial trace first. Procedure: test-conditions.md.</div>
      </Box>
      <Txt x={M + 1130} y={640} w={598} size={26} color={C.dim} o={ep(t, 5.2, 5.7)}>One scripted click is a lab measurement. It is not a field INP assessment, and Total Blocking Time is not a substitute.</Txt>
    </>
  );
};

/* 8. end */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={330} align="center" size={80} o={ep(t, 0.2, 0.9)}>Loading quickly and responding quickly<br />are different tests.</Big>
    <Txt x={M} y={610} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Run both, under the same conditions, before calling the page fast.</Txt>
    <Txt x={M} y={690} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, synthetic image and data, loopback only. Byte sizes and Node handler CPU time were measured; LCP and Event Timing were not.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, timelines: Timelines, hero_request: HeroRequest, handler_work: HandlerWork, fix_image: FixImage, fix_handler: FixHandler, results: Results, end: End};
