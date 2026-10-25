import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* All numbers below come from fixtures/ep18-webhooks/evidence.json (receiver clock fixed at 1768000000). */
const EV = {
  v1: {id: 'evt_1d691bf2e854', status: 'trialing', plan: 'starter'},
  v2: {id: 'evt_75e0e5df4066', status: 'past_due', plan: 'starter'},
  v3: {id: 'evt_748d0c0d9c60', status: 'active', plan: 'pro'},
};

/** A subscription state card. */
const StateCard: React.FC<{x: number; y: number; version: number; status: string; plan: string; accent?: string; o?: number; label?: string; glow?: boolean}> = ({x, y, version, status, plan, accent = C.cyan, o = 1, label = 'Stored subscription state', glow = false}) => (
  <Box x={x} y={y} w={520} h={190} accent={accent} o={o} glow={glow}>
    <div style={{fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: accent, fontWeight: 700}}>{label}</div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 10}}>
      <span style={{fontSize: 56, fontWeight: 800, color: C.text}}>{status}</span>
      <span style={{fontSize: 28, color: C.dim}}>/ {plan}</span>
    </div>
    <div style={{fontSize: 24, color: C.dim, marginTop: 6, fontFamily: '"DejaVu Sans Mono", monospace'}}>version {version}</div>
  </Box>
);

/** Event chip: v-number with a colour. */
const Ev: React.FC<{x: number; y: number; v: 1 | 2 | 3; color?: string; o?: number; sub?: string}> = ({x, y, v, color = C.cyan, o = 1, sub}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o}}>
    <Pill x={0} y={0} text={`v${v}`} color={color} size={28} mono />
    {sub && <div style={{position: 'absolute', left: 0, top: 58, width: 220, fontFamily: 'Inter, "DejaVu Sans", sans-serif', fontSize: 22, color: C.dim, whiteSpace: 'nowrap'}}>{sub}</div>}
  </div>
);

/* 1. The regression: active/pro -> past_due after an older event arrives */
const Fail: React.FC<SceneProps> = ({t}) => {
  const arrive = ep(t, 1.6, 2.6);
  const flipped = step(t, 2.6);
  return (
    <>
      <Overline y={110} color={C.red}>Naive receiver · applies in arrival order</Overline>
      <StateCard x={M} y={200} version={flipped ? 2 : 3} status={flipped ? EV.v2.status : EV.v3.status} plan={flipped ? EV.v2.plan : EV.v3.plan} accent={flipped ? C.red : C.green} glow={flipped === 1 && t < 3.6} />
      <Svg>
        <Arrow x1={1500} y1={295} x2={M + 540} y2={295} p={arrive} color={C.amber} label="late delivery · v2 (older)" />
      </Svg>
      <Ev x={1520} y={262} v={2} color={C.amber} o={ep(t, 0.6, 1.2)} sub="created BEFORE v3" />
      <Box x={M} y={440} w={1200} h={110} accent={C.line} o={ep(t, 3.2, 3.8)}>
        <div style={{fontSize: 28, color: C.text}}><span style={{color: C.green}}>Signature valid.</span> <span style={{color: C.green}}>Timestamp fresh.</span> <span style={{color: C.red}}>State regressed anyway.</span></div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 6}}>Verification answers "is this really from the provider?" It says nothing about order.</div>
      </Box>
      <Txt x={M} y={600} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 4.4, 5)}>Observed from the local fixture (naive receiver): deliveries v1, v3, v2 → final state version 2, past_due / starter.</Txt>
    </>
  );
};

/* 2. Creation order vs delivery order */
const Order: React.FC<SceneProps> = ({t}) => {
  const cols = [M + 120, M + 620, M + 1120];
  const yTop = 240;
  const yBot = 560;
  const bottom: {v: 1 | 2 | 3; col: number; at: number; color: string; sub: string}[] = [
    {v: 1, col: 0, at: 1.6, color: C.cyan, sub: 'arrives first'},
    {v: 3, col: 1, at: 2.4, color: C.cyan, sub: 'arrives second'},
    {v: 2, col: 2, at: 3.2, color: C.amber, sub: 'arrives late (retry)'},
  ];
  return (
    <>
      <Overline y={110}>Two different orders</Overline>
      <Txt x={M} y={yTop - 60} size={24} color={C.mute} weight={700}>CREATION ORDER AT THE PROVIDER · version increments per subscription</Txt>
      {([1, 2, 3] as const).map((v, i) => <Ev key={v} x={cols[i]} y={yTop} v={v} o={ep(t, 0.2 + i * 0.25, 0.6 + i * 0.25)} sub={v === 1 ? 'trialing / starter' : v === 2 ? 'past_due / starter' : 'active / pro'} />)}
      <Svg>
        <Arrow x1={cols[0] + 90} y1={yTop + 22} x2={cols[1] - 20} y2={yTop + 22} p={ep(t, 0.6, 1)} color={C.mute} />
        <Arrow x1={cols[1] + 90} y1={yTop + 22} x2={cols[2] - 20} y2={yTop + 22} p={ep(t, 0.9, 1.3)} color={C.mute} />
        <Arrow x1={cols[1] + 40} y1={yTop + 100} x2={cols[2] + 40} y2={yBot - 10} p={ep(t, 2.9, 3.4)} color={C.amber} dashed />
      </Svg>
      <Txt x={M} y={yBot - 60} size={24} color={C.mute} weight={700}>DELIVERY ORDER ON THE WIRE · what the receiver sees</Txt>
      {bottom.map((b) => <Ev key={b.v} x={cols[b.col]} y={yBot} v={b.v} color={b.color} o={ep(t, b.at, b.at + 0.4)} sub={b.sub} />)}
      <Box x={M} y={720} w={W - 2 * M} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 4, 4.6)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>NOT A SORTING KEY</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Timestamps alone do not order events: clock skew, retries and parallel workers all reorder them. This fixture orders by the provider's per-subscription version.</div>
      </Box>
    </>
  );
};

/* 3. Verify signature over raw bytes, then timestamp tolerance */
const Verify: React.FC<SceneProps> = ({t}) => {
  const s1 = step(t, 1.2);
  const s2 = step(t, 3.4);
  return (
    <>
      <Overline y={110} color={C.green}>Trust the bytes first</Overline>
      <Code x={M} y={170} w={960} title="receiver.mjs · before any JSON.parse" size={26} hi={[1, 2]} hiColor={C.green} lines={[
        'const raw = await readRaw(req);  // bytes',
        'sig = HMAC_SHA256(secret, `${ts}.` + raw)',
        'ok  = crypto.timingSafeEqual(sig, given)',
        'if (!ok) return 401;',
        'if (|now - ts| > 300) return 401;',
        'const ev = validate(JSON.parse(raw));',
      ]} />
      <Gate x={M + 1020} y={170} w={708} title="Verification gate" accent={C.green} checks={[
        {label: 'HMAC over raw body bytes', state: s1 ? 'pass' : 'pending'},
        {label: 'Delivery timestamp within 300 s', state: s2 ? 'pass' : 'pending'},
        {label: 'Parse + validate (only now)', state: s2 ? 'pass' : 'pending'},
      ]} />
      <Box x={M} y={520} w={560} h={120} title="Tampered body, original signature" sub="401 invalid signature" accent={C.red} o={ep(t, 4.2, 4.7)} titleSize={26} />
      <Box x={M + 600} y={520} w={560} h={120} title="Signed with the wrong secret" sub="401 invalid signature" accent={C.red} o={ep(t, 4.6, 5.1)} titleSize={26} />
      <Box x={M + 1200} y={520} w={528} h={120} title="Valid signature, 301 s old" sub="401 outside tolerance" accent={C.amber} o={ep(t, 5.4, 5.9)} titleSize={26} />
      <Txt x={M} y={680} w={W - 2 * M} size={30} color={C.text} weight={700} o={ep(t, 6.2, 6.8)}>A valid signature proves origin and integrity. It does not prove freshness.</Txt>
      <Txt x={M} y={740} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Verifying over a re-serialised copy of the body would accept bytes the provider never signed. Observed from the local fixture: 401, 401, 401.</Txt>
    </>
  );
};

/* 4. Duplicate rejection by UNIQUE (provider, event_id) */
const Dedup: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.8, 1.8);
  const p2 = ep(t, 2.6, 3.6);
  const hit = step(t, 3.6);
  return (
    <>
      <Overline y={110}>Fresh is not unique</Overline>
      <Box x={M} y={200} w={420} h={250} title="Provider" sub="retries v3 with a FRESH timestamp and signature" accent={C.cyan} titleSize={30} />
      <Box x={M + 1180} y={200} w={548} h={250} title="webhook_events" sub="UNIQUE (provider, event_id)" accent={hit ? C.red : C.cyan} titleSize={30} glow={hit === 1 && t < 4.6}>
        <div style={{marginTop: 14, fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 22, color: C.text}}>subhub · {EV.v3.id}</div>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 22, color: C.dim, marginTop: 4}}>version 3 · applied</div>
      </Box>
      <Svg>
        <Arrow x1={M + 440} y1={290} x2={M + 1160} y2={290} p={p1} color={C.cyan} label="delivery 1 · ts 1767999990 · sig 56da…" />
        <Arrow x1={M + 440} y1={380} x2={M + 1160} y2={380} p={p2} color={C.amber} label="delivery 2 · ts 1768000010 · sig 851b…" />
      </Svg>
      <Token x1={M + 440} y1={255} x2={M + 1100} y2={255} p={p1} text="v3" color={C.cyan} />
      <Token x1={M + 440} y1={345} x2={M + 1100} y2={345} p={p2} text="v3" color={C.amber} o={hit ? 0 : 1} />
      <Pill x={M + 1200} y={470} text="UNIQUE constraint failed → ROLLBACK" color={C.red} o={ep(t, 3.6, 4)} size={24} />
      <Pill x={M + 1200} y={530} text="200 · outcome: duplicate" color={C.green} o={ep(t, 4.4, 4.8)} size={28} />
      <Txt x={M} y={600} w={1000} size={28} color={C.text} o={ep(t, 2, 2.5)}>Both deliveries pass the 300 s tolerance. Tolerance is about the delivery; it cannot tell a retry from a first arrival.</Txt>
      <Txt x={M} y={700} w={1000} size={26} color={C.dim} o={ep(t, 5, 5.5)}>No SELECT-then-INSERT: the constraint decides, so concurrent arrivals cannot both win. Observed from the local fixture: delivery 2 → 200 duplicate, one record.</Txt>
    </>
  );
};

/* 5. Older version rejected by version compare */
const Version: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.8, 1.8);
  const decided = step(t, 2.4);
  return (
    <>
      <Overline y={110}>Then the version</Overline>
      <StateCard x={M} y={190} version={3} status={EV.v3.status} plan={EV.v3.plan} accent={C.green} />
      <Ev x={1560} y={240} v={2} color={C.amber} o={ep(t, 0.2, 0.6)} sub="late · past_due" />
      <Svg>
        <Arrow x1={1540} y1={285} x2={M + 540} y2={285} p={p} color={C.amber} label="incoming version 2" />
      </Svg>
      <Code x={M} y={420} w={820} title="db.mjs · inside the transaction" size={26} hi={decided ? [1, 3] : []} hiColor={C.amber} lines={[
        'insertEvent(provider, ev.event_id)',
        'if (ev.version > stored.version) {',
        '  setState(ev.snapshot)   // full snapshot',
        '} else outcome = "stale" // recorded only',
        'COMMIT',
      ]} />
      <Badge x={M + 880} y={430} label="stored" value="3" color={C.green} big />
      <Badge x={M + 1080} y={430} label="incoming" value="2" color={C.amber} big />
      <Pill x={M + 880} y={520} text="2 > 3 is false → stale, not applied" color={C.amber} o={ep(t, 2.4, 2.9)} size={26} />
      <Pill x={M + 880} y={580} text="200 · outcome: stale · state stays v3" color={C.green} o={ep(t, 3, 3.5)} size={26} />
      <Box x={M} y={720} w={W - 2 * M} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 4.2, 4.8)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>WHY SKIPPING IS SAFE HERE — AND WHEN IT IS NOT</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Every event from this fictional provider carries the full snapshot, so the newest one is the whole truth. For incremental events (deltas, "add one seat", "charge X"), every intermediate operation may matter: do not skip them.</div>
      </Box>
    </>
  );
};

/* 6. Replay the full delivery set + one transaction + 503 on commit failure */
const Replay: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: 'replay v2 → 200 duplicate', c: C.green},
    {t: 'replay v3 → 200 duplicate', c: C.green},
    {t: 'replay v1 → 200 duplicate', c: C.green},
    {t: 'replay v3 → 200 duplicate', c: C.green},
    {t: 'replay v2 → 200 duplicate', c: C.green},
    {t: 'replay v1 → 200 duplicate', c: C.green},
    {t: 'state digest before 0d4e457d205b2702', c: C.dim},
    {t: 'state digest after  0d4e457d205b2702', c: C.dim},
    {t: 'event records 5 → 5 · state unchanged', c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Replay · same deliveries, shuffled</Overline>
      <Log x={M} y={170} w={900} lines={lines} shown={prog(t, 0.3, 3.6) * lines.length} title="Executed · demo.mjs replay" />
      <Code x={M + 960} y={170} w={768} title="one transaction" size={26} hi={[0, 4]} hiColor={C.green} lines={[
        'BEGIN',
        '  INSERT webhook_events …   // dedup',
        '  UPSERT subscriptions …    // if newer',
        '  // failure here → ROLLBACK, 503',
        'COMMIT  →  only now: 200',
      ]} />
      <Box x={M + 960} y={470} w={768} h={120} title="v4 with simulated commit failure" sub="503 · state unchanged · no event record" accent={C.red} o={ep(t, 4, 4.5)} titleSize={26} />
      <Box x={M + 960} y={610} w={768} h={120} title="v4 retried by the provider" sub="200 · applied · version 4" accent={C.green} o={ep(t, 4.8, 5.3)} titleSize={26} />
      <Txt x={M} y={620} w={900} size={26} color={C.dim} o={ep(t, 5.4, 5.9)}>Record and state change commit or roll back together, so a 200 always means "stored". Observed from the local fixture.</Txt>
    </>
  );
};

/* 7. Final state + concurrency result */
const Final: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.green}>Retest · latest valid state remains</Overline>
    <StateCard x={M} y={190} version={3} status={EV.v3.status} plan={EV.v3.plan} accent={C.green} label="after v1, v3, v2 late, v3 retry" o={ep(t, 0.2, 0.7)} />
    <Txt x={M} y={400} w={520} size={24} color={C.dim} o={ep(t, 0.8, 1.2)}>Naive receiver, same deliveries: version 2, past_due.</Txt>
    <Box x={M + 600} y={190} w={1128} h={330} title="Six concurrent deliveries of one new event (v5)" accent={C.cyan} o={ep(t, 1.4, 1.9)} titleSize={28}>
      <div style={{display: 'flex', gap: 14, marginTop: 22}}>
        {[0, 1, 2, 3, 4, 5].map((i) => <Pill key={i} x={0} y={0} text="v5" color={i === 0 ? C.green : C.amber} o={ep(t, 1.8 + i * 0.15, 2.1 + i * 0.15)} />)}
      </div>
      <div style={{display: 'flex', gap: 60, marginTop: 90}}>
        {[['6', 'HTTP 200', C.text], ['1', 'applied', C.green], ['5', 'duplicate', C.amber], ['1', 'event record', C.cyan]].map(([v, l, c]) => (
          <div key={l} style={{textAlign: 'center', opacity: ep(t, 3, 3.5)}}>
            <div style={{fontSize: 72, fontWeight: 800, color: c, lineHeight: 1}}>{v}</div>
            <div style={{fontSize: 22, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6}}>{l}</div>
          </div>
        ))}
      </div>
    </Box>
    <Txt x={M} y={580} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 3.8, 4.3)}>Observed from the local fixture: 6 × 200; applied 1, duplicate 5, records added 1. Concurrency is six HTTP requests into one process with one SQLite connection; the UNIQUE constraint and BEGIN IMMEDIATE serialise the writes.</Txt>
  </>
);

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={330} align="center" size={84} o={ep(t, 0.2, 0.9)}>Delivery order is not<br />business order.</Big>
    <Txt x={M} y={620} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>This fixture writes only to its own database. Emails, charges and queue publishes are external side effects and need extra coordination (an outbox, idempotent downstream calls).</Txt>
    <Txt x={M} y={720} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Fictional provider, synthetic secret, loopback only. Full-snapshot and monotonic-version guarantees are this provider's; real providers vary.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, order: Order, verify: Verify, dedup: Dedup, version: Version, replay: Replay, final: Final, end: End};
