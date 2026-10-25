import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Readout, Svg, Token, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Values below are copied from fixtures/ep02-duplicate-purchase-events/evidence.json */
const TX = 'T-20261025-0001';
const EV = {
  flawedCount: 3,
  correctedCount: 1,
  envelopes: [
    {seq: 1, emitter: 'app.purchaseHandler', ts: '09:00:00.000Z'},
    {seq: 2, emitter: 'tagManager.purchaseTrigger', ts: '09:00:00.007Z'},
    {seq: 3, emitter: 'ConfirmationComponent.onMount', ts: '09:00:00.021Z'},
  ],
  correctedActions: [
    {action: 'completeOrder(T-20261025-0001)', count: 1},
    {action: 'remountConfirmation()', count: 1},
    {action: 'remountConfirmation()', count: 1},
  ],
};
const COLLECTOR = 'Local event collector — not GA4';

/* Shared layout: order (left) → emitters (middle column) → collector (right) */
const L = {
  order: {x: M, y: 400, w: 400, h: 150},
  emit: {x: 700, w: 460, h: 128, ys: [190, 400, 610]},
  coll: {x: 1340, y: 180, w: 484, h: 620},
};
const EMITTERS = [
  {key: 'app', name: 'app.purchaseHandler', sub: 'application purchase-completion handler'},
  {key: 'tag', name: 'tagManager.purchaseTrigger', sub: 'simulated tag-manager listener'},
  {key: 'mount', name: 'ConfirmationComponent.onMount', sub: 'confirmation-component mount handler'},
];

/* ---------- local components ---------- */
const OrderBox: React.FC<{o?: number; accent?: string; glow?: boolean}> = ({o = 1, accent = C.cyan, glow = false}) => (
  <Box x={L.order.x} y={L.order.y} w={L.order.w} h={L.order.h} title="Completed order" sub={`transaction_id ${TX}`} accent={accent} o={o} glow={glow} titleSize={28} />
);

const EmitterBox: React.FC<{i: number; o?: number; accent?: string; glow?: boolean; removed?: boolean; tag?: string; tagColor?: string}> = ({i, o = 1, accent = C.mute, glow = false, removed = false, tag, tagColor = C.green}) => {
  const e = EMITTERS[i];
  return (
    <>
      <Box x={L.emit.x} y={L.emit.ys[i]} w={L.emit.w} h={L.emit.h} accent={accent} o={o} glow={glow} dashed={removed} fill={removed ? 'transparent' : C.panel}>
        <div style={{fontFamily: F.mono, fontSize: 26, fontWeight: 700, color: removed ? C.mute : C.text, textDecoration: removed ? 'line-through' : 'none', lineHeight: 1.15}}>{e.name}</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 8, lineHeight: 1.25}}>{e.sub}</div>
      </Box>
      {tag && <Pill x={L.emit.x + L.emit.w - 24 - tag.length * 13} y={L.emit.ys[i] - 22} text={tag} color={tagColor} o={o} size={20} />}
    </>
  );
};

/** One received envelope row inside the collector. */
const Envelope: React.FC<{seq: number; emitter: string; ts: string; o?: number; accent?: string; hi?: 'event' | 'tx' | 'emitter' | 'ts' | null}> = ({seq, emitter, ts, o = 1, accent = C.red, hi = null}) => {
  const f = (k: string, on: boolean) => ({color: on ? C.amber : C.text, fontWeight: on ? 800 : 500});
  return (
    <div style={{opacity: o, borderLeft: `4px solid ${accent}`, background: '#0d0f14', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontFamily: F.mono, fontSize: 21, lineHeight: 1.35, color: C.text}}>
      <div><span style={{color: C.mute}}>#{seq} event </span><span style={f('event', hi === 'event')}>purchase</span></div>
      <div><span style={{color: C.mute}}>transaction_id </span><span style={f('tx', hi === 'tx')}>{TX}</span></div>
      <div><span style={{color: C.mute}}>emitter </span><span style={f('emitter', hi === 'emitter')}>{emitter}</span></div>
      <div><span style={{color: C.mute}}>ts </span><span style={f('ts', hi === 'ts')}>{ts}</span></div>
    </div>
  );
};

const Collector: React.FC<{o?: number; accent?: string; count?: number | null; children?: React.ReactNode}> = ({o = 1, accent = C.line, count = null, children}) => (
  <Box x={L.coll.x} y={L.coll.y} w={L.coll.w} h={L.coll.h} accent={accent} o={o} titleSize={26}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <div style={{fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.amber}}>{COLLECTOR}</div>
    </div>
    {count !== null && <div style={{fontSize: 24, color: C.dim, marginTop: 4}}>received: <span style={{color: C.text, fontWeight: 800}}>{count}</span></div>}
    {children}
  </Box>
);

/* Path geometry for tokens: order right edge → emitter left edge → collector left edge */
const ORDER_OUT = {x: L.order.x + L.order.w, y: L.order.y + L.order.h / 2};
const emitIn = (i: number) => ({x: L.emit.x, y: L.emit.ys[i] + L.emit.h / 2});
const emitOut = (i: number) => ({x: L.emit.x + L.emit.w, y: L.emit.ys[i] + L.emit.h / 2});
const collIn = (i: number) => ({x: L.coll.x, y: L.coll.y + 150 + i * 150});

/* ================================================================== */
/* 1. fail — one order beside three received envelopes */
const Fail: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>One order · three purchase envelopes</Overline>
    <Box x={M} y={300} w={560} h={180} title="1 completed order" sub={`transaction_id ${TX}`} accent={C.cyan} o={ep(t, 0, 0.5)} titleSize={40} />
    <Readout x={M + 80} y={540} w={400} label="orders completed" value={1} color={C.cyan} o={ep(t, 0.4, 0.9)} />
    <Svg><Arrow x1={700} y1={390} x2={1300} y2={390} p={ep(t, 0.9, 1.6)} color={C.red} label="collector received" /></Svg>
    <Collector o={ep(t, 0.6, 1.1)} accent={C.red} count={EV.flawedCount}>
      {EV.envelopes.map((e, i) => <Envelope key={e.seq} {...e} o={ep(t, 1.6 + i * 0.5, 2.0 + i * 0.5)} />)}
    </Collector>
    <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 3.6, 4.1)}>Observed from the local fixture: receivedCount = {EV.flawedCount} for one transaction_id. Raw envelopes, not GA4 conversions.</Txt>
  </>
);

/* 2. rewind — the original completion action */
const Rewind: React.FC<SceneProps> = ({t}) => {
  const click = ep(t, 0.6, 1.1);
  const done = ep(t, 1.6, 2.2);
  const screen = ep(t, 2.6, 3.2);
  return (
    <>
      <Overline y={110}>Rewind · the action</Overline>
      <Box x={M} y={200} w={520} h={460} accent={C.line} fill="#14171e">
        <div style={{color: C.mute, fontSize: 20, fontFamily: F.mono, marginBottom: 20}}>illustrative checkout · shop.example.test</div>
        <div style={{fontSize: 26, color: C.dim, lineHeight: 1.5}}>1 × SKU-4471<br />Total 149.00 USD</div>
        <div style={{marginTop: 40, padding: '18px 0', borderRadius: 12, background: click > 0.5 ? C.cyan : C.panel, border: `3px solid ${C.cyan}`, color: click > 0.5 ? C.bg : C.cyan, fontSize: 30, fontWeight: 800, textAlign: 'center', transform: `scale(${1 - 0.06 * Math.sin(click * Math.PI)})`}}>Confirm purchase</div>
        <div style={{marginTop: 30, fontSize: 24, color: C.dim, opacity: click}}>clicked once</div>
      </Box>
      <Svg>
        <Arrow x1={640} y1={430} x2={840} y2={430} p={done} label="order completes" />
        <Arrow x1={1240} y1={430} x2={1400} y2={430} p={screen} label="screen shows" />
      </Svg>
      <Box x={860} y={360} w={360} h={150} title="order:completed" sub={TX} accent={C.cyan} o={done} glow={done > 0.9} titleSize={28} />
      <Box x={1420} y={330} w={404} h={210} accent={C.line} o={screen} fill="#14171e">
        <div style={{color: C.mute, fontSize: 20, marginBottom: 12}}>illustrative confirmation component</div>
        <div style={{fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1.3}}>Thanks! Order {TX} confirmed.</div>
      </Box>
      <Badge x={M} y={740} label="business events" value="1" color={C.cyan} big o={ep(t, 3.6, 4.1)} />
      <Txt x={M + 420} y={752} w={1200} size={28} color={C.dim} o={ep(t, 3.8, 4.3)}>One click. One completed order. One confirmation screen.</Txt>
    </>
  );
};

/* 3. emitters — follow three emitters into the collector */
const Emitters: React.FC<SceneProps> = ({t}) => {
  const fan = [ep(t, 0.6, 1.3), ep(t, 1.0, 1.7), ep(t, 1.4, 2.1)];
  const out = [ep(t, 2.3, 3.1), ep(t, 2.7, 3.5), ep(t, 3.1, 3.9)];
  return (
    <>
      <Overline y={110} color={C.amber}>Three emitters, one signal</Overline>
      <OrderBox glow={t < 0.6} />
      <Svg>
        {EMITTERS.map((_, i) => <Arrow key={i} x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(i).x} y2={emitIn(i).y} p={fan[i]} color={C.cyan} />)}
        {EMITTERS.map((_, i) => <Arrow key={'o' + i} x1={emitOut(i).x} y1={emitOut(i).y} x2={collIn(i).x} y2={collIn(i).y} p={out[i]} color={C.red} />)}
      </Svg>
      {EMITTERS.map((_, i) => <EmitterBox key={i} i={i} accent={fan[i] > 0.9 ? C.amber : C.mute} o={ep(t, 0.2 + 0.2 * i, 0.6 + 0.2 * i)} glow={out[i] > 0 && out[i] < 1} />)}
      {EMITTERS.map((e, i) => out[i] > 0 && out[i] < 1 && <Token key={'t' + i} x1={emitOut(i).x} y1={emitOut(i).y - 24} x2={collIn(i).x - 60} y2={collIn(i).y - 24} p={out[i]} text="purchase" color={C.red} />)}
      <Collector accent={C.red} count={Math.round(out[0] >= 1 ? 1 : 0) + Math.round(out[1] >= 1 ? 1 : 0) + Math.round(out[2] >= 1 ? 1 : 0)}>
        {EV.envelopes.map((e, i) => <Envelope key={e.seq} {...e} o={step(t, [3.1, 3.5, 3.9][i])} />)}
      </Collector>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.2, 4.7)}>Observed: emitters in arrival order — app.purchaseHandler, tagManager.purchaseTrigger, ConfirmationComponent.onMount</Txt>
    </>
  );
};

/* 4. inspect — event name, transaction id, emitter, timestamp */
const Inspect: React.FC<SceneProps> = ({t}) => {
  const phase = t < 1.4 ? 'event' : t < 2.8 ? 'tx' : t < 4.2 ? 'emitter' : 'ts';
  const rows: {k: typeof phase; label: string; value: string; verdict: string; col: string}[] = [
    {k: 'event', label: 'event', value: 'purchase · purchase · purchase', verdict: 'same name ×3', col: C.amber},
    {k: 'tx', label: 'transaction_id', value: `${TX} ×3`, verdict: 'identical — one order', col: C.amber},
    {k: 'emitter', label: 'emitter', value: 'app · tagManager · ConfirmationComponent', verdict: 'three different sources', col: C.red},
    {k: 'ts', label: 'ts', value: '.000Z · .007Z · .021Z', verdict: '7 ms and 14 ms apart', col: C.amber},
  ];
  return (
    <>
      <Overline y={110} color={C.amber}>Inspect the envelopes</Overline>
      <Box x={M} y={180} w={760} h={660} accent={C.red} titleSize={26}>
        <div style={{fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.amber}}>{COLLECTOR}</div>
        {EV.envelopes.map((e) => <Envelope key={e.seq} {...e} hi={phase} />)}
      </Box>
      {rows.map((r, i) => {
        const on = ep(t, i * 1.4 + 0.2, i * 1.4 + 0.7);
        const active = phase === r.k;
        return (
          <Box key={r.k} x={920} y={180 + i * 150} w={904} h={130} accent={active ? r.col : C.line} o={on} glow={active}>
            <div style={{fontFamily: F.mono, fontSize: 24, color: C.mute}}>{r.label}</div>
            <div style={{fontFamily: F.mono, fontSize: 24, color: C.text, marginTop: 4}}>{r.value}</div>
            <div style={{fontSize: 26, fontWeight: 700, color: r.col, marginTop: 6}}>{r.verdict}</div>
          </Box>
        );
      })}
      <Txt x={920} y={790} w={904} size={30} weight={700} color={C.red} o={ep(t, 5.4, 5.9)}>Not three orders. Three claims on one order.</Txt>
    </>
  );
};

/* 5. problem — ownership, plus the GA4 caution */
const Problem: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>The problem · ownership</Overline>
    <Box x={M} y={180} w={520} h={120} title="business event" sub={`purchase · ${TX}`} accent={C.cyan} titleSize={28} />
    <Svg>
      {[0, 1, 2].map((i) => <Arrow key={i} x1={L.emit.x} y1={L.emit.ys[i] + 50} x2={M + 530} y2={250} p={ep(t, 0.4 + 0.3 * i, 1.0 + 0.3 * i)} color={C.red} dashed label="“mine”" />)}
    </Svg>
    {EMITTERS.map((_, i) => <EmitterBox key={i} i={i} accent={C.red} o={ep(t, 0.2 + 0.2 * i, 0.5 + 0.2 * i)} />)}
    <Box x={1240} y={180} w={584} h={620} accent={C.amber} dashed fill="transparent" o={ep(t, 2.6, 3.2)}>
      <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>CAUTION · REPORTING IS A SEPARATE QUESTION</div>
      <div style={{fontSize: 26, color: C.text, marginTop: 16, lineHeight: 1.35}}>3 raw envelopes ≠ 3 GA4 conversions.</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, opacity: ep(t, 3.6, 4.1)}}>GA4 documents deduplicating <span style={{color: C.text}}>purchase</span> events that share a <span style={{fontFamily: F.mono, color: C.text}}>transaction_id</span>, for web data streams.</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, opacity: ep(t, 5.2, 5.7)}}>That covers <span style={{color: C.text}}>purchase</span>, not every event type.</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, opacity: ep(t, 6.4, 6.9)}}>Reporting may hide the duplication. It does not remove the three emitters.</div>
      <div style={{fontSize: 20, color: C.mute, marginTop: 18, lineHeight: 1.3, opacity: ep(t, 7.0, 7.5)}}>This fixture does not reproduce GA4’s internal logic.</div>
    </Box>
    <Txt x={M} y={800} w={1100} size={30} weight={700} color={C.red} o={ep(t, 1.8, 2.3)}>Several components each claim ownership of the same business event.</Txt>
  </>
);

/* 6. choose — one authoritative emitter */
const Choose: React.FC<SceneProps> = ({t}) => {
  const pick = ep(t, 1.2, 1.9);
  return (
    <>
      <Overline y={110} color={C.green}>Choose one authoritative path</Overline>
      <OrderBox accent={C.cyan} />
      <Svg><Arrow x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(0).x} y2={emitIn(0).y} p={pick} color={C.green} label="order:completed" /></Svg>
      <EmitterBox i={0} accent={pick > 0.9 ? C.green : C.mute} glow={pick > 0.9} tag={pick > 0.9 ? 'OWNER' : undefined} />
      <EmitterBox i={1} accent={C.mute} o={1 - 0.5 * pick} />
      <EmitterBox i={2} accent={C.mute} o={1 - 0.5 * pick} />
      <Gate x={L.coll.x} y={L.coll.y} w={L.coll.w} title="Why this one" accent={C.green} o={ep(t, 2.2, 2.8)} checks={[
        {label: 'Runs when the order actually completes', state: 'pass'},
        {label: 'Tied to the state change, not the screen', state: step(t, 3.0) ? 'pass' : 'pending'},
        {label: 'Runs once per completion', state: step(t, 3.6) ? 'pass' : 'pending'},
      ]} />
      <Txt x={M} y={840} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.0, 4.5)}>One owner per business event. The thank-you screen and the tag container are consumers, not owners.</Txt>
    </>
  );
};

/* 7. fix — remove the redundant listeners */
const Fix: React.FC<SceneProps> = ({t}) => {
  const cut1 = ep(t, 1.0, 1.5);
  const cut2 = ep(t, 2.4, 2.9);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · remove redundant emitters</Overline>
      <OrderBox accent={C.cyan} />
      <Svg>
        <Arrow x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(0).x} y2={emitIn(0).y} color={C.green} />
        <Arrow x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(1).x} y2={emitIn(1).y} color={C.red} dashed o={1 - cut1} />
        <Arrow x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(2).x} y2={emitIn(2).y} color={C.red} dashed o={1 - cut2} />
      </Svg>
      <EmitterBox i={0} accent={C.green} tag="OWNER" />
      <EmitterBox i={1} accent={cut1 > 0.5 ? C.mute : C.red} removed={cut1 > 0.5} tag={cut1 > 0.5 ? 'REMOVED' : undefined} tagColor={C.red} />
      <EmitterBox i={2} accent={cut2 > 0.5 ? C.mute : C.red} removed={cut2 > 0.5} tag={cut2 > 0.5 ? 'RENDER ONLY' : undefined} tagColor={C.amber} />
      <Code x={L.coll.x} y={L.coll.y} w={L.coll.w} title="page.mjs · corrected" size={24} hi={[1, 4]} hiColor={C.green} lines={[
        "bus.on('order:completed',",
        '  (o) => send(APP, o));   // owner',
        '// tag trigger: removed',
        'mount: (o) => {',
        '  render(o);  // no send()',
        '}',
      ]} o={ep(t, 0.4, 0.9)} />
      <Txt x={M} y={840} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 3.4, 3.9)}>The confirmation component still renders. It simply no longer reports.</Txt>
    </>
  );
};

/* 8. retest — repeat the action, remount twice */
const Retest: React.FC<SceneProps> = ({t}) => {
  const send = ep(t, 0.6, 1.5);
  const toColl = ep(t, 1.5, 2.3);
  const rm1 = ep(t, 3.0, 3.6);
  const rm2 = ep(t, 4.2, 4.8);
  const mountO = (p: number) => 1 - 0.8 * Math.sin(p * Math.PI); // dip and return: unmount → mount
  return (
    <>
      <Overline y={110} color={C.green}>Retest · same action, then remount</Overline>
      <OrderBox accent={C.cyan} glow={t < 0.6} />
      <Svg>
        <Arrow x1={ORDER_OUT.x} y1={ORDER_OUT.y} x2={emitIn(0).x} y2={emitIn(0).y} p={send} color={C.cyan} label="order:completed" />
        <Arrow x1={emitOut(0).x} y1={emitOut(0).y} x2={collIn(0).x} y2={collIn(0).y} p={toColl} color={C.green} />
      </Svg>
      {toColl > 0 && toColl < 1 && <Token x1={emitOut(0).x} y1={emitOut(0).y - 24} x2={collIn(0).x - 60} y2={collIn(0).y - 24} p={toColl} text="purchase" color={C.green} />}
      <EmitterBox i={0} accent={C.green} glow={toColl > 0 && toColl < 1} tag="OWNER" />
      <EmitterBox i={1} accent={C.mute} removed tag="REMOVED" tagColor={C.red} />
      <Box x={L.emit.x} y={L.emit.ys[2]} w={L.emit.w} h={L.emit.h} accent={rm1 > 0 && rm1 < 1 || rm2 > 0 && rm2 < 1 ? C.amber : C.mute} o={mountO(rm1) * mountO(rm2)} fill={C.panel}>
        <div style={{fontFamily: F.mono, fontSize: 26, fontWeight: 700, color: C.text}}>ConfirmationComponent</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 8}}>{rm2 >= 1 ? 'remounted ×2 · rendered, no send()' : rm1 >= 1 ? 'remounted ×1 · rendered, no send()' : 'mounted · rendered, no send()'}</div>
      </Box>
      <Pill x={L.emit.x + L.emit.w + 20} y={L.emit.ys[2] + 44} text="remount" color={C.amber} o={(rm1 > 0 && rm1 < 1) || (rm2 > 0 && rm2 < 1) ? 1 : 0} />
      <Collector accent={C.green} count={toColl >= 1 ? EV.correctedCount : 0}>
        <Envelope seq={1} emitter={EV.envelopes[0].emitter} ts={EV.envelopes[0].ts} accent={C.green} o={step(t, 2.3)} />
        <div style={{marginTop: 20, fontFamily: F.mono, fontSize: 22, lineHeight: 1.6}}>
          {EV.correctedActions.map((a, i) => <div key={i} style={{color: C.dim, opacity: [step(t, 2.3), step(t, 3.6), step(t, 4.8)][i]}}>{a.action} <span style={{color: C.green}}>→ {a.count}</span></div>)}
        </div>
      </Collector>
    </>
  );
};

/* 9. count — the actual received count from the corrected test */
const Count: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep02-duplicate-purchase-events/test.mjs', c: C.mute},
    {t: '✓ collector is labelled local, not GA4; stores verbatim', c: C.green},
    {t: '✓ control: flawed page emits 3 envelopes for 1 order', c: C.amber},
    {t: '✓ flawed: remount emits a 4th envelope', c: C.amber},
    {t: '✓ corrected: 1 order → exactly 1 envelope (app handler)', c: C.green},
    {t: '✓ corrected: remounting the component emits nothing', c: C.green},
    {t: '✓ transaction_id is per order, not per emission', c: C.green},
    {t: '✓ LIMIT: replaying the same order emits again (not fixed)', c: C.amber},
    {t: '# pass 8  fail 0', c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Received count · corrected run</Overline>
      <Readout x={M} y={200} w={420} label="envelopes received" value={EV.correctedCount} color={C.green} o={ep(t, 0.2, 0.8)} />
      <Txt x={M} y={380} w={420} align="center" size={24} color={C.dim} o={ep(t, 0.8, 1.2)}>from app.purchaseHandler<br />{TX}</Txt>
      <Readout x={M} y={480} w={420} label="in the flawed run" value={EV.flawedCount} color={C.red} o={ep(t, 1.2, 1.7)} />
      <Log x={600} y={180} w={1224} lines={lines} shown={prog(t, 0.6, 5.0) * lines.length} title={`Executed · node:test output · ${COLLECTOR}`} size={22} />
      <Box x={600} y={600} w={1224} h={200} accent={C.amber} dashed fill="transparent" o={ep(t, 5.0, 5.5)}>
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 2}}>SCOPE OF THIS RESULT</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 8, lineHeight: 1.35}}>One emitter in the tested scenario. Not exactly-once delivery across reloads, devices, retries or distributed systems.</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 8, lineHeight: 1.35}}>Replaying the same completion action still emits again: order-level idempotency is a separate design concern.</div>
      </Box>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 2.0, 2.5)}>Observed from the local fixture: evidence.json → runs.corrected.receivedCount = {EV.correctedCount}; runs.flawed.receivedCount = {EV.flawedCount}</Txt>
    </>
  );
};

/* 10. end card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={330} align="center" size={84} o={ep(t, 0.2, 0.9)}>Fix the emitters.<br />Then verify the reporting.</Big>
    <Txt x={M} y={620} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Raw event duplication and platform reporting are separate questions. Count envelopes first; read the report second.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, synthetic order, loopback collector. Not GA4, not a reproduction of GA4’s logic, not a guarantee of exactly-once delivery.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, rewind: Rewind, emitters: Emitters, inspect: Inspect, problem: Problem, choose: Choose, fix: Fix, retest: Retest, count: Count, end: End};
