import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep15-idempotency/evidence.json (summary block). */
const EV = {vulnAttempts: 2, vulnOrders: 2, fixedAttempts: 2, fixedOrders: 1, mismatch: 422, concurrent: 5, concurrentOrders: 1, twoKeysOrders: 2, key: 'ck_7f3a9c21d4e8b6a0'};

/* Shared three-lane layout: client / server / database */
const LY = {client: 170, server: 410, db: 650};
const LH = 170;
const CX = 560; // request column x
const RX = 1180; // response column x
const Lanes: React.FC<{t: number; hl?: 'client' | 'server' | 'db' | null}> = ({t, hl = null}) => (
  <>
    <Lane y={LY.client} h={LH} label="Client" accent={hl === 'client' ? C.cyan : C.mute} o={ep(t, 0, 0.4)} />
    <Lane y={LY.server} h={LH} label="Order service" accent={hl === 'server' ? C.cyan : C.mute} o={ep(t, 0.15, 0.55)} />
    <Lane y={LY.db} h={LH} label="Database" accent={hl === 'db' ? C.cyan : C.mute} o={ep(t, 0.3, 0.7)} />
  </>
);

/* 1. Outcome: one tap, two orders */
const Fail: React.FC<SceneProps> = ({t}) => {
  const tap = ep(t, 0.4, 0.9);
  const rows = ep(t, 1.6, 2.2);
  return (
    <>
      <Box x={M} y={160} w={640} h={560} accent={C.line} fill="#14171e" o={ep(t, 0, 0.5)}>
        <div style={{color: C.mute, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase'}}>Illustrative checkout</div>
        <div style={{marginTop: 30, fontSize: 30, color: C.text}}>sku-100 · qty 1</div>
        <div style={{fontSize: 48, fontWeight: 800, color: C.text, marginTop: 8}}>$49.99</div>
        <div style={{marginTop: 60, padding: '22px 0', borderRadius: 14, textAlign: 'center', fontSize: 34, fontWeight: 800, background: tap > 0.5 ? C.cyanDim : C.cyan, color: C.bg, transform: `scale(${1 - 0.04 * Math.sin(Math.PI * tap)})`}}>Pay once</div>
        <div style={{marginTop: 30, fontSize: 26, color: C.amber, opacity: ep(t, 1.0, 1.5)}}>Tapped exactly once.</div>
      </Box>
      <Overline x={M + 720} y={170} color={C.red}>Database · orders for this user</Overline>
      <Box x={M + 720} y={230} w={1008} h={100} title="order 1 · sku-100 · 1 × $49.99" titleSize={28} accent={C.red} o={rows} />
      <Box x={M + 720} y={350} w={1008} h={100} title="order 2 · sku-100 · 1 × $49.99" titleSize={28} accent={C.red} o={ep(t, 2.1, 2.7)} glow />
      <Readout x={M + 720} y={490} w={300} label="taps" value={1} color={C.cyan} o={ep(t, 2.8, 3.3)} />
      <Readout x={M + 1060} y={490} w={300} label="orders" value={EV.vulnOrders} color={C.red} o={ep(t, 3.0, 3.5)} />
      <Txt x={M + 720} y={680} w={1008} size={24} color={C.mute} o={ep(t, 3.6, 4.1)}>Observed from the local fixture: {EV.vulnAttempts} request attempts, {EV.vulnOrders} committed orders.</Txt>
      <Txt x={M} y={790} w={W - 2 * M} size={32} color={C.amber} o={ep(t, 4.4, 5)}>The app treated every request as a new intention.</Txt>
    </>
  );
};

/* 2. First request commits */
const Commit: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.8, 1.6);
  const p2 = ep(t, 1.9, 2.7);
  const commit = ep(t, 3.0, 3.5);
  return (
    <>
      <Lanes t={t} hl="db" />
      <Pill x={M + 300} y={LY.client + 60} text="POST /vuln/orders  {sku, qty 1, $49.99}" color={C.cyanDim} mono o={ep(t, 0.4, 0.8)} />
      <Svg>
        <Arrow x1={CX} y1={LY.client + 120} x2={CX} y2={LY.server + 60} p={p1} label="attempt 1" />
        <Arrow x1={CX} y1={LY.server + 130} x2={CX} y2={LY.db + 60} p={p2} label="INSERT INTO orders" />
      </Svg>
      <Badge x={M + 300} y={LY.server + 70} label="validated" value="ok" color={C.green} o={step(t, 1.7)} />
      <Box x={M + 300} y={LY.db + 60} w={370} h={84} title="order 1 · committed" titleSize={26} accent={C.green} o={commit} glow />
      <Txt x={M + 720} y={LY.db + 70} w={900} size={28} color={C.dim} o={ep(t, 3.6, 4.1)}>From the server's view, the work is done.</Txt>
    </>
  );
};

/* 3. Response lost after commit */
const Lost: React.FC<SceneProps> = ({t}) => {
  const back = ep(t, 0.8, 1.5);
  const cut = step(t, 1.5);
  return (
    <>
      <Lanes t={0.9} hl="client" />
      <Box x={M + 300} y={LY.db + 60} w={370} h={84} title="order 1 · committed" titleSize={26} accent={C.green} />
      <Svg>
        <Arrow x1={RX} y1={LY.db + 60} x2={RX} y2={LY.server + 130} p={back} color={C.green} label="201 Created" />
        <Arrow x1={RX} y1={LY.server + 60} x2={RX} y2={LY.client + 120} p={Math.min(back, 0.45)} color={C.red} dashed />
        {cut === 1 && <g opacity={blink(t, 1.5, 0.8)}><line x1={RX - 40} y1={LY.server + 10} x2={RX + 40} y2={LY.server + 50} stroke={C.red} strokeWidth={8} strokeLinecap="round" /><line x1={RX + 40} y1={LY.server + 10} x2={RX - 40} y2={LY.server + 50} stroke={C.red} strokeWidth={8} strokeLinecap="round" /></g>}
      </Svg>
      <Pill x={M + 300} y={LY.server + 64} text="X-Fault: lose-response → socket destroyed" color={C.red} mono o={ep(t, 1.6, 2.0)} />
      <Box x={M + 300} y={LY.client + 50} w={760} h={100} title="network error · UND_ERR_SOCKET" sub="Did the order get created? The client cannot know." titleSize={26} accent={C.amber} o={ep(t, 2.4, 2.9)} glow />
      <Txt x={M} y={850} w={W - 2 * M} size={30} color={C.amber} o={ep(t, 4.2, 4.8)}>No network gives exactly-once delivery. A lost response is normal, not exotic.</Txt>
    </>
  );
};

/* 4. Client retries */
const Retry: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 1.2, 2.0);
  return (
    <>
      <Lanes t={0.9} hl="client" />
      <Box x={M + 300} y={LY.db + 60} w={370} h={84} title="order 1 · committed" titleSize={26} accent={C.green} />
      <Box x={M + 300} y={LY.client + 50} w={520} h={100} title="network error" sub="retry policy: try once more" titleSize={26} accent={C.amber} />
      <Pill x={M + 860} y={LY.client + 70} text="POST /vuln/orders  (same body)" color={C.cyanDim} mono o={ep(t, 0.6, 1.0)} />
      <Svg>
        <Arrow x1={CX + 500} y1={LY.client + 150} x2={CX + 500} y2={LY.server + 60} p={p1} label="attempt 2" color={C.amber} />
      </Svg>
      <Gate x={M + 1100} y={LY.server + 50} w={628} title="Would a disabled button help?" accent={C.amber} o={ep(t, 2.4, 2.9)} checks={[{label: 'Double click', state: 'pass'}, {label: 'Retry after a lost response', state: 'fail'}, {label: 'Refresh, second tab, flaky mobile link', state: 'fail'}]} />
      <Txt x={M} y={850} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 3.9)}>This is a retry, not a double click. UI state cannot see what the database committed.</Txt>
    </>
  );
};

/* 5. Vulnerable endpoint inserts again */
const Dup: React.FC<SceneProps> = ({t}) => {
  const p2 = ep(t, 0.6, 1.3);
  const second = ep(t, 1.5, 2.0);
  return (
    <>
      <Lanes t={0.9} hl="db" />
      <Code x={M + 300} y={LY.server + 48} w={680} size={24} hi={[1]} hiColor={C.red} lines={['// vulnerable', 'const id = db.createOrder(user, fields);', 'return 201;']} />
      <Svg>
        <Arrow x1={CX + 500} y1={LY.server + 130} x2={CX + 500} y2={LY.db + 60} p={p2} label="INSERT again" color={C.red} />
      </Svg>
      <Box x={M + 300} y={LY.db + 60} w={370} h={84} title="order 1 · committed" titleSize={26} accent={C.green} />
      <Box x={M + 700} y={LY.db + 60} w={370} h={84} title="order 2 · committed" titleSize={26} accent={C.red} o={second} glow />
      <Readout x={M + 1180} y={LY.db + 40} w={260} label="attempts" value={EV.vulnAttempts} color={C.amber} o={ep(t, 2.2, 2.6)} />
      <Readout x={M + 1460} y={LY.db + 40} w={260} label="orders" value={EV.vulnOrders} color={C.red} o={ep(t, 2.5, 2.9)} />
      <Txt x={M + 300} y={LY.server - 50} w={1400} size={28} color={C.dim} o={ep(t, 1.0, 1.5)}>No memory of attempt 1. Nothing links the two requests.</Txt>
      <Txt x={M} y={860} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 3, 3.5)}>Observed from the local fixture (known-positive control test): {EV.vulnAttempts} attempts → {EV.vulnOrders} orders.</Txt>
    </>
  );
};

/* 6. The fix */
const Fix: React.FC<SceneProps> = ({t}) => {
  const st = (at: number): 'pass' | 'pending' => (t > at ? 'pass' : 'pending');
  const checks = [
    {label: 'One key per checkout attempt, reused on retry', state: st(1.0)},
    {label: 'Scoped to session user + operation (not X-User-Id)', state: st(2.2)},
    {label: 'Fingerprint of validated, normalised fields', state: st(3.4)},
    {label: 'Order + key record in ONE transaction', state: st(4.6)},
    {label: 'UNIQUE(user, op, key): first writer wins', state: st(5.6)},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>The repair · atomic idempotency</Overline>
      <Gate x={M} y={170} w={860} title="Corrected POST /orders" accent={C.green} checks={checks} />
      <Code x={M + 900} y={170} w={828} size={24} title="db.mjs · one transaction" hi={[1, 2, 3]} hiColor={C.green} lines={['BEGIN IMMEDIATE;', 'INSERT INTO orders (...);', 'INSERT INTO idempotency (user, op,', '  key, fingerprint, body) -- UNIQUE', 'COMMIT;  -- or ROLLBACK both']} />
      <Box x={M + 900} y={470} w={828} h={120} accent={C.red} dashed fill="transparent" o={ep(t, 5.8, 6.3)}>
        <div style={{fontSize: 22, color: C.red, fontWeight: 700, letterSpacing: 2}}>AVOIDED</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6}}>SELECT key … then INSERT: two concurrent requests both see "absent" and both insert. The constraint, not the check, is the guard.</div>
      </Box>
      <Pill x={M} y={640} text={`Idempotency-Key: ${EV.key}`} color={C.cyan} mono o={ep(t, 0.6, 1.0)} />
      <Pill x={M} y={700} text="scope = (u_alice, create_order, key)" color={C.cyanDim} mono o={ep(t, 2.0, 2.4)} />
      <Pill x={M} y={760} text="fingerprint = sha256({amountCents, currency, qty, sku})" color={C.cyanDim} mono o={ep(t, 3.2, 3.6)} />
      <Txt x={M} y={830} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 4.4, 4.9)}>Same key + same fingerprint → stored result. Same key + different fingerprint → 422. Concurrent same key → wait for the first, then stored result.</Txt>
    </>
  );
};

/* 7. Retest: same fault, same key */
const Retest: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.6, 1.2);
  const commit = ep(t, 1.3, 1.7);
  const cut = step(t, 2.0);
  const p2 = ep(t, 2.8, 3.5);
  const found = ep(t, 3.7, 4.2);
  const back = ep(t, 4.3, 5.0);
  return (
    <>
      <Lanes t={0.9} hl="server" />
      <Pill x={M + 300} y={LY.client + 60} text={`Idempotency-Key: ${EV.key}`} color={C.cyan} mono />
      <Svg>
        <Arrow x1={CX} y1={LY.client + 120} x2={CX} y2={LY.db + 60} p={p1} label="attempt 1 · insert order + key" />
        <Arrow x1={CX + 140} y1={LY.db + 60} x2={CX + 140} y2={LY.client + 130} p={Math.min(ep(t, 1.8, 2.3), 0.5)} color={C.red} dashed />
        {cut === 1 && <g><line x1={CX + 100} y1={LY.server + 60} x2={CX + 180} y2={LY.server + 110} stroke={C.red} strokeWidth={8} strokeLinecap="round" /><line x1={CX + 180} y1={LY.server + 60} x2={CX + 100} y2={LY.server + 110} stroke={C.red} strokeWidth={8} strokeLinecap="round" /></g>}
        <Arrow x1={RX} y1={LY.client + 120} x2={RX} y2={LY.db + 60} p={p2} label="attempt 2 · same key, same fingerprint" color={C.amber} />
        <Arrow x1={RX + 460} y1={LY.db + 60} x2={RX + 460} y2={LY.client + 150} p={back} color={C.green} />
      </Svg>
      <Box x={M + 300} y={LY.db + 60} w={420} h={84} title="order 1 + key record · committed" titleSize={24} accent={C.green} o={commit} />
      <Pill x={CX + 200} y={LY.server + 70} text="response lost" color={C.red} o={cut} />
      <Box x={RX - 160} y={LY.db + 60} w={420} h={84} title="key found · fingerprint matches" sub="Idempotent-Replayed: true" titleSize={24} accent={C.green} o={found} glow />
      <Box x={RX - 60} y={LY.client + 40} w={500} h={100} title="201 Created · orderId 1 · replayed" sub="Observed from the local fixture" titleSize={26} accent={C.green} o={ep(t, 4.8, 5.3)} />
    </>
  );
};

/* 8. Counts */
const Count: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep15-idempotency/test.mjs', c: C.mute},
    {t: '✓ control: vulnerable lost response + retry → 2 orders', c: C.amber},
    {t: '✓ corrected lost response + retry, one key → 1 order', c: C.green},
    {t: '✓ same key, different payload → 422, no new order', c: C.green},
    {t: '✓ 5 concurrent, one key → 1 order (4 waited)', c: C.green},
    {t: '✓ UNIQUE constraint alone resolves the race', c: C.green},
    {t: '✓ two purchases, two keys → 2 orders', c: C.green},
    {t: '✓ X-User-Id / body.userId ignored', c: C.green},
    {t: '# pass 13  fail 0', c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · counts from evidence.json</Overline>
      <Readout x={M} y={180} w={300} label="attempts" value={EV.fixedAttempts} color={C.amber} o={ep(t, 0.3, 0.8)} />
      <Readout x={M + 320} y={180} w={300} label="orders" value={EV.fixedOrders} color={C.green} o={ep(t, 0.6, 1.1)} />
      <Box x={M} y={400} w={620} h={100} title={`same key · qty 1 → 3`} sub={`${EV.mismatch} · key reused with a different request`} titleSize={26} accent={C.amber} o={ep(t, 1.6, 2.1)} />
      <Box x={M} y={520} w={620} h={100} title={`${EV.concurrent} concurrent · one key`} sub={`${EV.concurrentOrders} order · the others waited, then replayed`} titleSize={26} accent={C.green} o={ep(t, 2.8, 3.3)} />
      <Box x={M} y={640} w={620} h={100} title="two purchases · two keys" sub={`${EV.twoKeysOrders} orders · different intention, different key`} titleSize={26} accent={C.cyan} o={ep(t, 4.0, 4.5)} />
      <Log x={M + 680} y={180} w={1048} lines={lines} shown={prog(t, 0.3, 5.0) * lines.length} title="Executed · node:test output" />
      <Txt x={M} y={780} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 5.0, 5.5)}>Observed from the local fixture: numbers above are read from fixtures/ep15-idempotency/evidence.json.</Txt>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={260} align="center" size={84} o={ep(t, 0.2, 0.9)}>A new request is not<br />always a new intention.</Big>
    <Txt x={M} y={560} w={W - 2 * M} align="center" size={30} color={C.amber} o={ep(t, 1.8, 2.4)}>The transaction covers the local database. An external payment provider call is a separate side effect and needs its own idempotency and reconciliation.</Txt>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={30} color={C.amber} o={ep(t, 3.2, 3.8)}>Key records here live for the test database lifetime. A service that expires them lets a late enough retry count as new.</Txt>
    <Txt x={M} y={800} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 4.4, 5)}>Local fixture, synthetic data, loopback only. No payment provider was contacted. Not exactly-once delivery: repeated requests made safe, not impossible.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, commit: Commit, lost: Lost, retry: Retry, dup: Dup, fix: Fix, retest: Retest, count: Count, end: End};
