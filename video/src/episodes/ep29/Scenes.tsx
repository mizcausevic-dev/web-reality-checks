import React from 'react';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* All numbers below come from fixtures/ep29-server-side-price/evidence.json (integer cents, USD). */

/** Plainly illustrative page chrome. Not a real product UI. */
const PageMock: React.FC<{x: number; y: number; w: number; h: number; price: string; o?: number; accent?: string}> = ({x, y, w, h, price, o = 1, accent = C.line}) => (
  <Box x={x} y={y} w={w} h={h} accent={accent} o={o} fill="#14171e" title="Illustrative checkout page" titleSize={24}>
    <div style={{marginTop: 18, padding: '16px 20px', borderRadius: 12, background: '#1a1e27', fontSize: 28, color: C.text, display: 'flex', justifyContent: 'space-between'}}>
      <span>Synthetic mug × 2</span><span style={{fontWeight: 800}}>{price}</span>
    </div>
    <div style={{marginTop: 16, padding: '14px 20px', borderRadius: 12, border: `2px solid ${C.cyan}`, color: C.cyan, fontSize: 28, fontWeight: 700, textAlign: 'center'}}>Place mock order</div>
  </Box>
);

/* 1. Tamper: page says $10.00, the request says 100 cents */
const Tamper: React.FC<SceneProps> = ({t}) => {
  const edited = step(t, 4);
  const reqLines = [
    'POST /vuln/orders',
    '{ "productId": "p_mug",',
    '  "quantity": 2,',
    edited ? '  "unitPriceCents": 100 }' : '  "unitPriceCents": 1000 }',
  ];
  return (
    <>
      <Overline y={110} color={C.amber}>Edited in the request, not on the page</Overline>
      <PageMock x={M} y={190} w={700} h={330} price="$10.00" o={ep(t, 0, 0.5)} />
      <Txt x={M} y={545} w={700} size={28} color={C.dim} o={ep(t, 0.6, 1.1)}>The page still displays $10.00</Txt>
      <Code x={M + 800} y={190} w={928} lines={reqLines} hi={edited ? [3] : []} hiColor={C.amber} title="Request body, as sent" o={ep(t, 0.4, 0.9)} />
      <Badge x={M + 800} y={470} label="submitted" value={edited ? '$1.00 per mug' : '$10.00 per mug'} color={edited ? C.amber : C.cyan} big o={ep(t, 0.9, 1.4)} />
      <Txt x={M + 800} y={590} w={928} size={30} color={C.amber} o={ep(t, 4.4, 5)}>Nothing on screen changed. Only the request did.</Txt>
      <Txt x={M} y={720} w={W - 2 * M} size={26} color={C.mute} o={ep(t, 6, 6.6)}>Synthetic data. Integer cents. No payment provider, no real charge.</Txt>
    </>
  );
};

/* 2. Flawed endpoint creates an underpriced order */
const Fail: React.FC<SceneProps> = ({t}) => {
  const go = ep(t, 0.4, 1.4);
  const back = ep(t, 1.8, 2.6);
  const show = ep(t, 3, 3.6);
  return (
    <>
      <Overline y={110} color={C.red}>Flawed endpoint · client price trusted</Overline>
      <Pill x={M} y={230} text="unitPriceCents: 100" color={C.amber} mono />
      <Box x={M + 520} y={190} w={520} h={140} title="POST /vuln/orders" sub="uses the number it was given" accent={C.red} glow={go > 0.9} />
      <Svg>
        <Arrow x1={M + 380} y1={262} x2={M + 510} y2={262} p={go} color={C.amber} />
        <Arrow x1={M + 1040} y1={262} x2={M + 1180} y2={262} p={back} color={C.red} />
      </Svg>
      <Pill x={M + 1200} y={230} text="201 Created" color={C.red} mono o={back} size={30} />
      <Box x={M} y={400} w={820} h={190} accent={C.red} o={show} fill="#1c1012" title="Stored order line" titleSize={26}>
        <div style={{fontFamily: F.mono, fontSize: 28, color: C.text, marginTop: 10}}>p_mug · qty 2 · unit 100¢ · total 200¢</div>
        <div style={{fontSize: 26, color: C.red, marginTop: 10}}>snapshot = what the client sent</div>
      </Box>
      <Readout x={M + 900} y={400} label="stored total" value="$2.00" color={C.red} o={show} w={420} />
      <Readout x={M + 1308} y={400} label="catalog total" value="$20.00" color={C.green} o={ep(t, 3.6, 4.2)} w={420} />
      <Txt x={M} y={640} w={W - 2 * M} size={34} weight={700} color={C.red} o={ep(t, 4.6, 5.2)}>Underpriced by $18.00 (1800 cents).</Txt>
      <Txt x={M} y={720} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5.2, 5.8)}>Observed from the local fixture: POST /vuln/orders → 201, totalCents 200; catalog total 2000.</Txt>
    </>
  );
};

/* 3. Reveal the trusted client field */
const Leak: React.FC<SceneProps> = ({t}) => {
  const hi = t > 2.5 ? [2, 3] : [];
  return (
    <>
      <Overline y={110} color={C.red}>The trusted field</Overline>
      <Box x={M} y={190} w={560} h={190} title="Browser" sub="client-controlled input" accent={C.amber} o={ep(t, 0, 0.5)} />
      <Pill x={M + 40} y={310} text="unitPriceCents" color={C.amber} mono o={ep(t, 0.6, 1)} />
      <Svg>
        <Arrow x1={M + 580} y1={265} x2={M + 700} y2={265} p={ep(t, 1.1, 1.8)} color={C.amber} />
      </Svg>
      <Code x={M + 720} y={190} w={1008} title="flawed handler" size={26} hi={hi} hiColor={C.red} o={ep(t, 0.8, 1.3)} lines={[
        'const {productId, quantity,',
        '       unitPriceCents} = body;',
        'total = unitPriceCents * quantity;',
        'insertLine(productId, unitPriceCents);',
      ]} />
      <Box x={M} y={470} w={W - 2 * M} h={150} accent={C.red} dashed fill="transparent" o={ep(t, 6, 6.6)}>
        <div style={{fontSize: 34, color: C.text, fontWeight: 700}}>A price in a request is a <span style={{color: C.amber}}>claim</span> by the client.</div>
        <div style={{fontSize: 30, color: C.dim, marginTop: 8}}>It is not a <span style={{color: C.green}}>fact</span> held by the server.</div>
      </Box>
      <Txt x={M} y={660} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 8.5, 9.1)}>The browser can display a price. It cannot be the authority for the price the order uses.</Txt>
    </>
  );
};

/* 4. Authority moves to the catalog lookup, inside one short transaction */
const Fix: React.FC<SceneProps> = ({t}) => {
  const active = t < 6 ? -1 : t < 8 ? 0 : t < 10 ? 1 : t < 11.5 ? 2 : t < 13 ? 3 : 4;
  const lines = [
    'BEGIN IMMEDIATE;',
    'SELECT price FROM products WHERE id = ?;',
    'accepted == price ? else 409, ROLLBACK',
    'INSERT orders, order_lines(snapshot);',
    'COMMIT;',
  ];
  return (
    <>
      <Overline y={110} color={C.green}>The repair · price authority is the catalog</Overline>
      <Box x={M} y={190} w={600} h={290} title="Request carries" accent={C.cyan} o={ep(t, 2.6, 3.2)}>
        <div style={{fontFamily: F.mono, fontSize: 26, color: C.text, marginTop: 12, lineHeight: 1.6}}>productId<br />quantity<br /><span style={{color: C.amber}}>expectedUnitPriceCents</span></div>
        <div style={{fontSize: 24, color: C.amber, marginTop: 8}}>comparison only</div>
      </Box>
      <Svg>
        <Arrow x1={M + 620} y1={330} x2={M + 720} y2={330} p={ep(t, 4.6, 5.2)} color={C.cyan} />
      </Svg>
      <Code x={M + 740} y={190} w={988} title="one short transaction (SQLite)" size={26} lines={lines} hi={active >= 0 ? [active] : []} hiColor={C.green} o={ep(t, 5, 5.6)} />
      <Box x={M} y={560} w={820} h={140} title="products · p_mug · 1000¢" sub="the only source of the unit price" accent={C.green} o={ep(t, 1, 1.6)} glow={active === 1} />
      <Box x={M + 880} y={560} w={848} h={140} title="order_lines · unit_price_cents" sub="price snapshot read inside the transaction" accent={C.green} o={ep(t, 11.5, 12.1)} glow={active === 3} />
      <Txt x={M} y={740} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 13.2, 13.8)}>Extra client fields such as unitPriceCents or totalCents are ignored (tested).</Txt>
    </>
  );
};

/* 5. Repeat the altered request: no underpriced order */
const Retest: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: 'POST /orders  expectedUnitPriceCents: 100', c: C.text},
    {t: '→ 409 price_changed', c: C.amber},
    {t: '  current quote: 1000¢ · total 2000¢', c: C.amber},
    {t: 'quantity 0, -1, 1.5, "2", 101 → 400', c: C.green},
    {t: 'unknown product → 404', c: C.green},
    {t: 'unavailable product → 409', c: C.green},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · same altered request</Overline>
      <Log x={M} y={190} w={1060} lines={lines} shown={prog(t, 0.8, 9) * lines.length + 0.01} title="Executed · local fixture, corrected endpoint" size={26} />
      <Readout x={M + 1180} y={200} label="orders created" value="0" color={C.green} o={ep(t, 5, 5.6)} w={548} />
      <Box x={M + 1180} y={400} w={548} h={140} title="Tamper attempt refused" sub="the table row count did not move" accent={C.green} o={ep(t, 5.6, 6.2)} titleSize={26} />
      <Txt x={M} y={560} w={1060} size={26} color={C.dim} o={ep(t, 9.5, 10.1)}>Observed from the local fixture. Quantity range is 1 to 100. Numbers sent as strings are refused.</Txt>
    </>
  );
};

/* 6. Catalog price changes after the page loaded */
const Change: React.FC<SceneProps> = ({t}) => {
  const changed = step(t, 5);
  const p3 = ep(t, 7.6, 8.4);
  const resp = ep(t, 8.4, 9);
  return (
    <>
      <Overline y={110} color={C.amber}>The catalog changes after the page loads</Overline>
      <Box x={M} y={190} w={520} h={170} title="1 · Page loads" sub="displays $10.00 (1000¢)" accent={C.cyan} o={ep(t, 0, 0.5)} />
      <Box x={M + 600} y={190} w={520} h={170} title="2 · Catalog changes" sub={changed ? 'now $12.00 (1200¢)' : 'still $10.00 (1000¢)'} accent={changed ? C.amber : C.mute} glow={changed === 1} o={ep(t, 4.2, 4.7)} />
      <Box x={M + 1200} y={190} w={528} h={170} title="3 · Same request" sub="expectedUnitPriceCents: 1000" accent={C.cyan} o={ep(t, 7, 7.5)} />
      <Svg>
        <Arrow x1={M + 530} y1={275} x2={M + 590} y2={275} p={ep(t, 4.6, 5.1)} color={C.dim} />
        <Arrow x1={M + 1130} y1={275} x2={M + 1190} y2={275} p={ep(t, 7.2, 7.6)} color={C.dim} />
        <Arrow x1={M + 1460} y1={370} x2={M + 1460} y2={450} p={p3} color={C.amber} />
      </Svg>
      <Box x={M + 900} y={460} w={828} h={290} accent={C.amber} o={resp} fill="#1c1810" title="409 price_changed" titleSize={34}>
        <div style={{fontFamily: F.mono, fontSize: 26, color: C.text, marginTop: 12, lineHeight: 1.6}}>expected 1000¢ · current 1200¢<br />quote: 2 × $12.00 = $24.00 (2400¢)<br /><span style={{color: C.amber}}>requiresConfirmation: true</span></div>
      </Box>
      <Readout x={M} y={460} label="orders created" value="0" color={C.green} o={resp} w={420} />
      <Txt x={M} y={640} w={800} size={26} color={C.dim} o={ep(t, 10, 10.6)}>Observed from the local fixture. Retrying unchanged is not silently accepted.</Txt>
    </>
  );
};

/* 7. Updated quote and explicit confirmation */
const Confirm: React.FC<SceneProps> = ({t}) => {
  const a1 = ep(t, 2, 2.8);
  const a2 = ep(t, 4, 4.8);
  const busy = ep(t, 8.6, 9.2);
  return (
    <>
      <Overline y={110} color={C.green}>Explicit confirmation</Overline>
      <Box x={M} y={190} w={560} h={190} title="Updated quote shown" sub="Confirm $12.00 per mug?" accent={C.amber} o={ep(t, 0, 0.5)} />
      <Pill x={M + 20} y={330} text="Confirm $12.00 (illustrative)" color={C.amber} size={26} o={ep(t, 0.6, 1.1)} />
      <Svg>
        <Arrow x1={M + 580} y1={285} x2={M + 700} y2={285} p={a1} color={C.cyan} />
        <Arrow x1={M + 1240} y1={285} x2={M + 1340} y2={285} p={a2} color={C.green} />
      </Svg>
      <Box x={M + 720} y={190} w={520} h={190} title="POST /orders" accent={C.cyan} o={ep(t, 1.8, 2.3)}>
        <div style={{fontFamily: F.mono, fontSize: 24, color: C.text, marginTop: 10, lineHeight: 1.5}}>expected 1000<br /><span style={{color: C.green}}>confirmPriceCents: 1200</span></div>
      </Box>
      <Box x={M + 1360} y={190} w={368} h={190} title="201 Created" accent={C.green} glow={a2 > 0.9} o={ep(t, 4, 4.5)}>
        <div style={{fontFamily: F.mono, fontSize: 24, color: C.text, marginTop: 10, lineHeight: 1.5}}>snapshot 1200¢<br />total 2400¢</div>
      </Box>
      <Box x={M} y={450} w={W - 2 * M} h={190} accent={C.cyan} o={ep(t, 7.4, 8)} title="While the order transaction is open (BEGIN IMMEDIATE)" titleSize={28}>
        <div style={{fontFamily: F.mono, fontSize: 26, color: C.text, marginTop: 12}}>second connection: UPDATE products SET price … → <span style={{color: C.red, opacity: busy}}>SQLITE_BUSY</span></div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 8}}>Held out until commit, so the snapshot equals the price in force inside the transaction.</div>
      </Box>
      <Box x={M} y={670} w={W - 2 * M} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 11, 11.6)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>NOT A PRICE LOCK</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Nothing holds the price for the customer. Each new attempt is compared to the catalog again.</div>
      </Box>
    </>
  );
};

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={78} o={ep(t, 0.2, 0.9)}>The client requests the purchase.</Big>
    <Big y={410} align="center" size={78} color={C.cyan} o={ep(t, 1.2, 1.9)}>The server determines the price.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 2.6, 3.2)}>Not modelled: taxes, discounts, shipping, inventory reservation, payment.</Txt>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.4, 4)}>Local fixture, synthetic data, SQLite on loopback. No real charges. Not a claim that a checkout is now fully secure.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {tamper: Tamper, fail: Fail, leak: Leak, fix: Fix, retest: Retest, change: Change, confirm: Confirm, end: End};
