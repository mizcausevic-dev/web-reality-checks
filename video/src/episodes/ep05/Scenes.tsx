import React from 'react';
import {Arrow, Badge, Big, Box, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------------------------------------
 * Every number below is copied from fixtures/ep05-directory-quality/inspection-results.json
 * (summary + evaluation) and evidence.json, produced by `node demo.mjs` on the seeded dataset.
 * If the fixture is regenerated with a different seed these constants must be refreshed.
 * ---------------------------------------------------------------------------------------------- */
const EV = {
  total: 10000,
  totalIssueInstances: 3875,
  uniqueFlaggedListings: 3303,
  cleanListings: 6697,
  byCode: {site_unreachable: 1136, stale_verification: 921, duplicate_candidate: 636, edited_since_verified: 525, missing_required: 300, malformed_url: 231, site_gone: 126},
  flagsPerListing: {1: 2775, 2: 485, 3: 42, 4: 1},
  duplicateCandidatePairs: 318,
  reviewQueueSize: 2901,
  queueByTopFlag: {site_gone: 126, duplicate_candidate: 628, site_unreachable: 1070, edited_since_verified: 358, stale_verification: 719},
  unreachableButOpen: 1038,
  seeded: {
    duplicate: {seeded: 640, detected: 636, missed: 4},
    malformed_url: {seeded: 250, detected: 231, missed: 19},
    missing_required: {seeded: 300, detected: 300, missed: 0},
    stale_verification: {seeded: 900, detected: 900, missed: 0},
    changed_address: {seeded: 400, detected: 210, missed: 190},
    closed: {seeded: 350, detected: 224, missed: 126},
  },
  example: {id: 'L00070', name: 'Copper Framing Co.', street: '351 Elm St, Sedgewick OH', host: 'copper-framing-co.slow.test', error: 'timeout', lastCheckedAt: '2026-10-13', lastChangedAt: '2023-01-06', lastVerifiedAt: '2023-01-20', verifiedDaysAgo: 1374},
  decision: {decision: 'keep_listing_schedule_recheck', reviewedAt: '2026-10-25T09:14:00Z', reviewer: 'reviewer-synthetic-01', now: '2026-10-25'},
  mockResponderCalls: 8922,
};
const fmt = (n: number) => n.toLocaleString('en-GB');
const SRC = 'Observed from the local fixture: inspection-results.json (synthetic, seeded)';

/* ---------- small local primitives ---------- */
/** A tiny listing-card glyph. */
const MiniCard: React.FC<{x: number; y: number; w?: number; h?: number; accent?: string; o?: number; flags?: string[]}> = ({x, y, w = 150, h = 54, accent = C.line, o = 1, flags = []}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, borderRadius: 8, background: C.panel, border: `2px solid ${accent}`, boxSizing: 'border-box', padding: '8px 10px'}}>
    <div style={{height: 8, width: '60%', borderRadius: 4, background: C.mute}} />
    <div style={{height: 6, width: '85%', borderRadius: 3, background: C.line, marginTop: 7}} />
    <div style={{position: 'absolute', right: 8, top: 7, display: 'flex', gap: 4}}>
      {flags.map((f) => <div key={f} style={{width: 10, height: 10, borderRadius: 5, background: f}} />)}
    </div>
  </div>
);

/** Horizontal bar with label and value. */
const Bar: React.FC<{x: number; y: number; w: number; label: string; value: number; max: number; color?: string; p?: number; o?: number}> = ({x, y, w, label, value, max, color = C.cyan, p = 1, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: F.sans}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 26, color: C.text, marginBottom: 6}}>
      <span style={{fontFamily: F.mono}}>{label}</span><span style={{color, fontWeight: 700}}>{fmt(Math.round(value * p))}</span>
    </div>
    <div style={{height: 14, borderRadius: 7, background: C.line}}><div style={{height: 14, width: `${(value / max) * 100 * p}%`, borderRadius: 7, background: color}} /></div>
  </div>
);

/** The three timestamps, shown as three distinct fields. */
const Stamps: React.FC<{x: number; y: number; checked: string; changed: string; verified: string; o?: number; hi?: 'checked' | 'verified' | null; w?: number}> = ({x, y, checked, changed, verified, o = 1, hi = null, w = 700}) => {
  const row = (k: 'checked' | 'changed' | 'verified', label: string, v: string, meaning: string) => {
    const col = hi === k ? C.cyan : C.dim;
    return (
      <div key={k} style={{display: 'grid', gridTemplateColumns: '220px 170px 1fr', gap: 16, alignItems: 'baseline', padding: '8px 0', borderTop: `1px solid ${C.line}`}}>
        <span style={{fontFamily: F.mono, fontSize: 24, color: col}}>{label}</span>
        <span style={{fontFamily: F.mono, fontSize: 26, color: hi === k ? C.cyan : C.text, fontWeight: 700}}>{v}</span>
        <span style={{fontSize: 22, color: C.mute}}>{meaning}</span>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: F.sans}}>
      {row('checked', 'lastCheckedAt', checked, 'a probe ran')}
      {row('changed', 'lastChangedAt', changed, 'someone edited the row')}
      {row('verified', 'lastVerifiedAt', verified, 'a human confirmed it')}
    </div>
  );
};

const FLAG_COL: Record<string, string> = {site_unreachable: C.red, site_gone: C.red, duplicate_candidate: C.amber, edited_since_verified: C.amber, stale_verification: C.amber, missing_required: C.cyan, malformed_url: C.cyan};

/* 1. Headline counter reaches 10,000 */
const Counter: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.3, 3.2);
  const n = Math.round(EV.total * p);
  const cols = 24, rows = 6;
  const shown = Math.floor(cols * rows * p);
  return (
    <>
      <Overline y={110}>Listing count</Overline>
      <Readout x={660} y={200} w={600} label="listings" value={fmt(n)} color={C.cyan} />
      {Array.from({length: cols * rows}, (_, i) => {
        const cx = M + (i % cols) * 68, cy = 430 + Math.floor(i / cols) * 54;
        return <MiniCard key={i} x={cx} y={cy} w={60} h={44} accent={C.line} o={i < shown ? 0.9 : 0.12} />;
      })}
      <Txt x={M} y={790} w={W - 2 * M} align="center" size={34} color={C.text} o={ep(t, 4.2, 4.8)}>A count says how many rows exist.</Txt>
      <Txt x={M} y={845} w={W - 2 * M} align="center" size={34} color={C.amber} o={ep(t, 6.2, 6.8)}>It says nothing about how many are right.</Txt>
    </>
  );
};

/* 2. Overlapping problems behind the count */
const Overlap: React.FC<SceneProps> = ({t}) => {
  const flags = [
    {code: 'duplicate_candidate', at: 1.2, text: 'duplicate candidate'},
    {code: 'site_unreachable', at: 2.4, text: 'website unreachable'},
    {code: 'stale_verification', at: 3.6, text: 'verified 3+ years ago'},
  ];
  const planted = Object.entries(EV.seeded);
  return (
    <>
      <Overline y={110}>Behind the count</Overline>
      {Array.from({length: 40}, (_, i) => <MiniCard key={i} x={M + (i % 8) * 92} y={180 + Math.floor(i / 8) * 64} w={80} h={50} o={0.25 + 0.2 * rnd(i)} accent={C.line} />)}
      <Box x={M + 40} y={540} w={640} h={300} accent={C.cyan} glow title="L00070 · Copper Framing Co." sub="351 Elm St, Sedgewick OH · (555) 700-1476" titleSize={28} o={ep(t, 0.2, 0.7)}>
        <div style={{marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10}}>
          {flags.map((f) => {
            const o = ep(t, f.at, f.at + 0.4);
            return <div key={f.code} style={{opacity: o, transform: `translateX(${(1 - o) * 40}px)`, display: 'flex', gap: 12, alignItems: 'center'}}><div style={{width: 14, height: 14, borderRadius: 7, background: FLAG_COL[f.code]}} /><span style={{fontSize: 26, color: C.text}}>{f.text}</span></div>;
          })}
        </div>
      </Box>
      <Txt x={M + 40} y={860} w={640} size={24} color={C.dim} o={ep(t, 4, 4.5)}>One row, three flags. Flags overlap; rows do not multiply.</Txt>
      <Box x={960} y={180} w={864} h={660} accent={C.amber} dashed fill="transparent" o={ep(t, 4.6, 5.2)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 3}}>PLANTED IN THE GROUND-TRUTH FILE</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 4}}>Synthetic dataset, fixed seed. Labels may overlap on one listing.</div>
        {planted.map(([k, v], i) => (
          <div key={k} style={{display: 'flex', justifyContent: 'space-between', fontSize: 28, color: C.text, padding: '12px 0', borderTop: `1px solid ${C.line}`, marginTop: i === 0 ? 14 : 0, opacity: ep(t, 5 + i * 0.35, 5.4 + i * 0.35)}}>
            <span style={{fontFamily: F.mono}}>{k}</span><span style={{color: C.amber, fontWeight: 700}}>{fmt(v.seeded)} listings</span>
          </div>
        ))}
        <div style={{fontSize: 22, color: C.mute, marginTop: 14, opacity: ep(t, 7.4, 7.9)}}>The checker never opens this file. It is used only afterwards, to score what was found and what was missed.</div>
      </Box>
    </>
  );
};

/* 3. Five separate checks */
const Checks: React.FC<SceneProps> = ({t}) => {
  const names = ['Completeness', 'Duplicate candidates', 'URL syntax', 'Website availability', 'Verification age'];
  const bw = 316, gap = 12, bx = (i: number) => M + i * (bw + gap), by = 300;
  const active = Math.min(4, Math.floor(prog(t, 0.6, 5.6) * 5));
  const tokP = prog(t, 0.6, 5.6);
  return (
    <>
      <Overline y={110}>Five checks · public rows only</Overline>
      <Pill x={M} y={170} text="listings.json · 10,000 rows" color={C.cyanDim} mono />
      <Pill x={M + (bw + gap) * tokP * 4} y={236} text="row" color={C.cyan} mono o={step(t, 0.6)} />
      {names.map((n, i) => (
        <Box key={n} x={bx(i)} y={by} w={bw} h={130} title={n} titleSize={26} accent={i <= active && t > 0.6 ? C.cyan : C.line} glow={i === active && t > 0.6} o={ep(t, 0.1 * i, 0.1 * i + 0.4)} />
      ))}
      <Svg>
        <Arrow x1={bx(3) + bw / 2} y1={by + 130} x2={bx(3) + bw / 2} y2={560} p={ep(t, 4.2, 4.8)} color={C.amber} />
        <Arrow x1={bx(1) + bw / 2} y1={by + 130} x2={bx(1) + bw / 2} y2={560} p={ep(t, 6.6, 7.1)} color={C.red} dashed />
      </Svg>
      <Box x={bx(3) - 120} y={560} w={bw + 240} h={120} accent={C.amber} title="Local mock responder" sub="*.ok / *.slow / *.down / *.nx / *.gone .test — never a real site" titleSize={26} o={ep(t, 4.4, 4.9)} />
      <Box x={bx(1) - 60} y={560} w={bw + 120} h={120} accent={C.red} dashed fill="transparent" title="ground-truth.json" sub="not an input. The checker cannot read it." titleSize={26} o={ep(t, 6.8, 7.3)} />
      <div style={{position: 'absolute', left: bx(1) + bw / 2 - 28, top: 540, width: 56, height: 56, borderRadius: 28, background: C.red, color: C.bg, fontSize: 34, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ep(t, 7.0, 7.4)}}>✕</div>
      <Stamps x={M} y={730} w={W - 2 * M} checked={EV.example.lastCheckedAt} changed={EV.example.lastChangedAt} verified={EV.example.lastVerifiedAt} o={ep(t, 7.6, 8.2)} />
    </>
  );
};

/* 4. Actual computed counts */
const Counts: React.FC<SceneProps> = ({t}) => {
  const codes = Object.entries(EV.byCode);
  const max = Math.max(...codes.map(([, v]) => v));
  const p = ep(t, 0.4, 2.6);
  const hist = Object.entries(EV.flagsPerListing);
  return (
    <>
      <Overline y={110}>Computed on the seeded dataset</Overline>
      {codes.map(([k, v], i) => <Bar key={k} x={M} y={170 + i * 78} w={760} label={k} value={v} max={max} color={FLAG_COL[k]} p={p} o={ep(t, 0.1 * i, 0.1 * i + 0.4)} />)}
      <Txt x={M} y={720} w={760} size={24} color={C.mute} o={ep(t, 2.6, 3)}>Issue instances per code. In this dataset each code fires at most once per listing, so instances = listings per code.</Txt>
      <Readout x={980} y={180} w={400} label="issue instances" value={fmt(Math.round(EV.totalIssueInstances * p))} color={C.amber} />
      <Readout x={1400} y={180} w={400} label="distinct flagged listings" value={fmt(Math.round(EV.uniqueFlaggedListings * p))} color={C.cyan} />
      <Txt x={980} y={370} w={820} align="center" size={26} color={C.dim} o={ep(t, 2.8, 3.3)}>{`${fmt(EV.cleanListings)} listings carry no flag at all.`}</Txt>
      <Box x={980} y={430} w={820} h={200} accent={C.line} o={ep(t, 3.4, 3.9)}>
        <div style={{fontSize: 22, color: C.mute, letterSpacing: 3, textTransform: 'uppercase'}}>flags carried per flagged listing</div>
        <div style={{display: 'flex', gap: 24, marginTop: 16}}>
          {hist.map(([k, v]) => (
            <div key={k} style={{flex: 1, textAlign: 'center'}}>
              <div style={{fontSize: 40, fontWeight: 800, color: Number(k) > 1 ? C.amber : C.text}}>{fmt(v)}</div>
              <div style={{fontSize: 22, color: C.dim}}>{k} flag{Number(k) > 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      </Box>
      <Box x={980} y={660} w={820} h={150} accent={C.red} fill="#1c1012" o={ep(t, 5.2, 5.7)}>
        <div style={{fontSize: 26, color: C.text}}><span style={{textDecoration: 'line-through', color: C.red}}>{`${fmt(EV.totalIssueInstances)} wrong listings`}</span></div>
        <div style={{fontSize: 26, color: C.text, marginTop: 10}}>Adding the columns counts one listing several times. Report both numbers, never their sum.</div>
      </Box>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 6, 6.5)}>{SRC}</Txt>
    </>
  );
};

/* 5. A website timeout beside a business that is open in ground truth */
const FailTimeout: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 0.8, 1.6);
  const wait = prog(t, 1.6, 3.0);
  const fail = step(t, 3.0);
  const ex = EV.example;
  return (
    <>
      <Overline y={110} color={C.red}>A flag is not a verdict</Overline>
      <Box x={M} y={180} w={720} h={280} accent={fail ? C.red : C.cyan} glow={!!fail} title={`${ex.id} · ${ex.name}`} sub={ex.street} titleSize={28}>
        <div style={{marginTop: 16, fontFamily: F.mono, fontSize: 24, color: C.dim}}>website: https://{ex.host}</div>
        <div style={{marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          <span style={{opacity: fail, padding: '8px 18px', borderRadius: 10, background: C.red, color: C.bg, fontFamily: F.mono, fontSize: 24, fontWeight: 700}}>site_unreachable · timeout</span>
          <span style={{opacity: step(t, 3.6), padding: '8px 18px', borderRadius: 10, background: C.amber, color: C.bg, fontFamily: F.mono, fontSize: 24, fontWeight: 700}}>{`stale_verification · ${ex.verifiedDaysAgo} days`}</span>
        </div>
      </Box>
      <Svg>
        <Arrow x1={M + 720} y1={260} x2={1180} y2={260} p={req} color={C.cyan} label="GET / (mock)" />
        <Arrow x1={1180} y1={320} x2={M + 720} y2={320} p={fail ? ep(t, 3.0, 3.5) : 0} color={C.red} label="no response · timeout" labelDy={34} />
      </Svg>
      <Box x={1180} y={180} w={644} h={200} accent={C.amber} title="Local mock responder" sub={`${ex.host} → waits past the ${'50 ms'} limit`} titleSize={26}>
        <div style={{marginTop: 14, height: 14, borderRadius: 7, background: C.line}}><div style={{height: 14, width: `${wait * 100}%`, borderRadius: 7, background: fail ? C.red : C.amber}} /></div>
        <div style={{marginTop: 8, fontSize: 22, color: C.mute}}>{fail ? 'timed out' : 'waiting…'}</div>
      </Box>
      <Stamps x={M} y={490} w={720} checked={ex.lastCheckedAt} changed={ex.lastChangedAt} verified={ex.lastVerifiedAt} o={ep(t, 3.6, 4.1)} />
      <Box x={1180} y={430} w={644} h={230} accent={C.green} dashed fill="transparent" o={ep(t, 4.4, 5)}>
        <div style={{fontSize: 22, color: C.green, fontWeight: 700, letterSpacing: 3}}>GROUND TRUTH · OPENED ONLY FOR SCORING</div>
        <div style={{fontSize: 34, fontWeight: 800, color: C.text, marginTop: 10}}>Business status: open</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 8}}>Planted labels: stale_verification only. No closure. The checker never saw this file.</div>
      </Box>
      <Readout x={1180} y={690} w={644} label="failed website checks on open businesses" value={fmt(Math.round(EV.unreachableButOpen * ep(t, 5.4, 7)))} color={C.red} o={ep(t, 5.4, 5.9)} />
      <Txt x={M} y={720} w={720} size={26} color={C.amber} o={ep(t, 5.2, 5.7)}>A timeout says the probe got no answer. It does not say the business closed. Nor does a three-year-old verification date.</Txt>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 7, 7.5)}>{SRC}</Txt>
    </>
  );
};

/* 6. Route uncertain cases into reason-coded queues */
const Queue: React.FC<SceneProps> = ({t}) => {
  const cols = Object.entries(EV.queueByTopFlag);
  const cw = 316, gap = 12, cx = (i: number) => M + i * (cw + gap), cy = 420;
  // the example card: two flags, lands in the site_unreachable column (its top-priority flag)
  const move = ep(t, 1.6, 2.8);
  const target = 2;
  const ex = {x: M + 40 + (cx(target) + 20 - (M + 40)) * move, y: 220 + (cy + 70 - 220) * move};
  return (
    <>
      <Overline y={110} color={C.amber}>Review queue · reason-coded</Overline>
      <Txt x={M} y={160} w={900} size={26} color={C.dim}>Judgement flags route to review. Deterministic fixes (missing field, malformed URL) do not.</Txt>
      {/* the unsorted pile */}
      {Array.from({length: 14}, (_, i) => {
        const pm = ep(t, 2.6 + 0.12 * i, 3.4 + 0.12 * i);
        const col = i % cols.length;
        const sx = M + 260 + (i % 7) * 150, sy = 210 + Math.floor(i / 7) * 60;
        const tx = cx(col) + 20 + (i % 3) * 30, ty = cy + 90 + Math.floor(i / 5) * 40;
        const f = Object.keys(EV.queueByTopFlag)[col];
        return <MiniCard key={i} x={sx + (tx - sx) * pm} y={sy + (ty - sy) * pm} w={120} h={46} accent={pm > 0.9 ? FLAG_COL[f] : C.line} flags={[FLAG_COL[f]]} o={0.85} />;
      })}
      {/* one card carrying two flags */}
      <div style={{position: 'absolute', left: ex.x, top: ex.y, width: 276, height: 110, borderRadius: 10, background: C.panel, border: `3px solid ${C.red}`, boxSizing: 'border-box', padding: '10px 14px', fontFamily: F.sans, zIndex: 2}}>
        <div style={{fontSize: 24, fontWeight: 700, color: C.text}}>{EV.example.id} · Copper Framing</div>
        <div style={{display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
          <span style={{fontSize: 20, fontFamily: F.mono, color: C.bg, background: C.red, borderRadius: 6, padding: '2px 8px'}}>site_unreachable</span>
          <span style={{fontSize: 20, fontFamily: F.mono, color: C.bg, background: C.amber, borderRadius: 6, padding: '2px 8px'}}>stale_verification</span>
        </div>
      </div>
      {cols.map(([k, v], i) => (
        <Box key={k} x={cx(i)} y={cy} w={cw} h={330} accent={FLAG_COL[k]} fill="transparent" dashed o={ep(t, 0.3 + 0.1 * i, 0.7 + 0.1 * i)}>
          <div style={{fontFamily: F.mono, fontSize: 22, color: FLAG_COL[k]}}>{k}</div>
          <div style={{fontSize: 22, color: C.mute}}>priority {i + 1}</div>
          <div style={{position: 'absolute', left: 24, bottom: 16, fontSize: 40, fontWeight: 800, color: C.text, opacity: ep(t, 4.6 + 0.15 * i, 5 + 0.15 * i)}}>{fmt(v)}</div>
        </Box>
      ))}
      <Txt x={M} y={775} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5.8, 6.3)}>{`${fmt(EV.reviewQueueSize)} queue entries, one per listing, filed under its highest-priority flag. A card keeps all of its flags.`}</Txt>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 6.4, 6.9)}>Observed from the local fixture: review-queue.json (synthetic, seeded)</Txt>
    </>
  );
};

/* 7. Record a review decision */
const Decision: React.FC<SceneProps> = ({t}) => {
  const d = EV.decision, ex = EV.example;
  const lines = [
    {t: `listingId:  ${ex.id}  (${ex.name})`, c: C.text},
    {t: `decision:   ${d.decision}`, c: C.green},
    {t: `evidence:   site_unreachable · ${ex.host} · ${ex.error}`, c: C.red},
    {t: `            stale_verification · ${ex.verifiedDaysAgo} days`, c: C.amber},
    {t: `reason:     one weak signal; no corroboration → re-check in 7 days`, c: C.dim},
    {t: `reviewedAt: ${d.reviewedAt}`, c: C.text},
    {t: `reviewer:   ${d.reviewer}`, c: C.text},
  ];
  const upd = step(t, 5.0);
  return (
    <>
      <Overline y={110} color={C.green}>Review decision · recorded</Overline>
      <Log x={M} y={170} w={1100} lines={lines} shown={prog(t, 0.3, 4.2) * lines.length} title="review-queue.json · decisions[0]" size={24} />
      <Badge x={M + 1160} y={190} label="evidence" value="2 flags" color={C.amber} o={ep(t, 1.4, 1.8)} />
      <Badge x={M + 1160} y={260} label="timestamp" value="09:14 UTC" color={C.cyan} o={ep(t, 3.2, 3.6)} />
      <Badge x={M + 1160} y={330} label="reviewer" value="synthetic-01" color={C.cyan} o={ep(t, 3.8, 4.2)} />
      <Txt x={M} y={520} w={700} size={24} color={C.mute} o={ep(t, 4.4, 4.8)}>What the decision changes on the row</Txt>
      <Stamps x={M} y={560} w={1000} checked={upd ? d.now : ex.lastCheckedAt} changed={ex.lastChangedAt} verified={ex.lastVerifiedAt} hi={upd ? 'checked' : null} o={ep(t, 4.4, 4.9)} />
      <Pill x={M + 1040} y={575} text={`${ex.lastCheckedAt} → ${d.now}`} color={C.cyan} mono o={ep(t, 5.0, 5.4)} />
      <Pill x={M + 1040} y={673} text="unchanged · nothing was verified" color={C.amber} mono o={ep(t, 5.8, 6.2)} />
      <Txt x={M} y={760} w={W - 2 * M} size={28} color={C.text} o={ep(t, 6.4, 6.9)}>A re-check moves <span style={{color: C.cyan}}>last checked</span>. Only a human confirmation against an independent source moves <span style={{color: C.amber}}>last verified</span>.</Txt>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 7, 7.5)}>Observed from the local fixture: review-queue.json · decisions[0] (synthetic reviewer, fixed timestamp)</Txt>
    </>
  );
};

/* 8. End card: missed problems + takeaway */
const End: React.FC<SceneProps> = ({t}) => {
  const rows = Object.entries(EV.seeded);
  return (
    <>
      <Txt x={M} y={120} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 0.2, 0.6)}>Detected vs missed, scored against the ground-truth file after the checker ran (synthetic, seeded)</Txt>
      <div style={{position: 'absolute', left: M, top: 160, width: W - 2 * M, fontFamily: F.sans, opacity: ep(t, 0.3, 0.8)}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 160px 160px 160px', gap: 12, fontSize: 22, color: C.mute, letterSpacing: 2, textTransform: 'uppercase', padding: '6px 0'}}><span>planted class</span><span style={{textAlign: 'right'}}>seeded</span><span style={{textAlign: 'right'}}>detected</span><span style={{textAlign: 'right'}}>missed</span></div>
        {rows.map(([k, v], i) => (
          <div key={k} style={{display: 'grid', gridTemplateColumns: '1fr 160px 160px 160px', gap: 12, fontSize: 26, padding: '7px 0', borderTop: `1px solid ${C.line}`, opacity: ep(t, 0.5 + 0.15 * i, 0.9 + 0.15 * i)}}>
            <span style={{fontFamily: F.mono, color: C.text}}>{k}</span>
            <span style={{textAlign: 'right', color: C.dim}}>{fmt(v.seeded)}</span>
            <span style={{textAlign: 'right', color: C.green}}>{fmt(v.detected)}</span>
            <span style={{textAlign: 'right', color: v.missed ? C.red : C.mute, fontWeight: v.missed ? 700 : 500}}>{fmt(v.missed)}</span>
          </div>
        ))}
      </div>
      <Txt x={M} y={520} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 1.8, 2.3)}>Missed by design of the data, not hidden: a move with no edit trail leaves nothing in the row; a closed business whose site still answers 200 passes a website check.</Txt>
      <Big y={640} align="center" size={72} o={ep(t, 2.6, 3.3)}>A failed website check is a lead<br />to investigate — not proof.</Big>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.6, 4.1)}>Synthetic dataset, fixed seed, local mock responder, zero real network calls. Rates describe this fixture only, not any real directory.</Txt>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {counter: Counter, overlap: Overlap, checks: Checks, counts: Counts, fail_timeout: FailTimeout, queue: Queue, decision: Decision, end: End};
