import React from 'react';
import {Arrow, Badge, Big, Box, Gate, Log, Overline, Pill, Svg, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* All numbers below are copied from fixtures/ep25-restore-tests/evidence.json (scenarios[], backupReport, foreignKeyEnforcement, liveWalControl).
   Reveal times are fractions of the scene length so they adapt to the real narration audio. */

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const TOTALS: [number, string, number, number][] = [
  [1, 'Ada Example', 2, 9084], [2, 'Bram Sample', 3, 21369], [3, 'Cleo Test', 3, 23154], [4, 'Dev Fixture', 3, 14883],
  [5, 'Esme Mock', 3, 11640], [6, 'Farid Demo', 4, 31844], [7, 'Gwen Synthetic', 2, 9084], [8, 'Hugo Placeholder', 3, 19911],
  [9, 'Ines Dummy', 4, 18872], [10, 'Jonas Stub', 2, 7626], [11, 'Kira Trial', 4, 27520], [12, 'Lev Sandbox', 3, 14883],
];

/* 1. A backup operation reports success */
const Success: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  const lines = [
    {t: '$ python3 backup.py source.db good.bak', c: C.mute},
    {t: '{"ok": true,', c: C.green},
    {t: ' "api": "sqlite3.Connection.backup",', c: C.text},
    {t: ' "bytes": 20480, "pageCount": 5}', c: C.text},
    {t: 'exit code 0', c: C.green},
  ];
  return (
    <>
      <Overline y={110}>Backup job</Overline>
      <Log x={M} y={170} w={980} lines={lines} shown={prog(t, f(0.05), f(0.4)) * lines.length} size={28} title="Observed · backup.py output" />
      <Box x={M + 1060} y={170} w={668} h={250} title="good.bak" sub="20480 bytes · 5 pages" accent={C.green} glow o={ep(t, f(0.35), f(0.45))}>
        <Pill x={24} y={150} text="BACKUP: SUCCESS" color={C.green} size={30} />
      </Box>
      <Overline y={500} color={C.amber} o={ep(t, f(0.55), f(0.65))}>Still unknown</Overline>
      <Box x={M} y={560} w={540} h={150} title="Opened?" sub="Not yet attempted" accent={C.amber} dashed fill="transparent" o={ep(t, f(0.58), f(0.68))} />
      <Box x={M + 594} y={560} w={540} h={150} title="Read back?" sub="Not yet attempted" accent={C.amber} dashed fill="transparent" o={ep(t, f(0.68), f(0.78))} />
      <Box x={M + 1188} y={560} w={540} h={150} title="Usable by the app?" sub="Not yet attempted" accent={C.amber} dashed fill="transparent" o={ep(t, f(0.78), f(0.88))} />
      <Txt x={M} y={800} w={W - 2 * M} size={26} color={C.dim} o={ep(t, f(0.85), f(0.95))}>Observed from the local fixture: backup.py exit code 0, file written. Nothing has read the file yet.</Txt>
    </>
  );
};

/* 2. What does that establish? */
const Question: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  return (
    <>
      <Big y={120} size={64} o={ep(t, 0, f(0.08))}>What did “success” establish?</Big>
      <Gate x={M} y={250} w={760} title="Established" accent={C.green} o={ep(t, f(0.12), f(0.22))} checks={[
        {label: 'A file was written', state: 'pass'},
        {label: 'The API call returned no error', state: 'pass'},
      ]} />
      <Gate x={M + 840} y={250} w={888} title="Not yet shown" accent={C.amber} o={ep(t, f(0.3), f(0.4))} checks={[
        {label: 'The file opens as a database', state: 'pending'},
        {label: 'Every order still has its customer', state: 'pending'},
        {label: 'The application’s numbers match', state: 'pending'},
      ]} />
      <Big y={640} size={56} align="center" color={C.amber} o={ep(t, f(0.75), f(0.9))}>A successful backup is not yet<br />a successful restore.</Big>
    </>
  );
};

/* 3. Restore into an isolated location */
const Restore: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  const a1 = ep(t, f(0.12), f(0.3));
  const a2 = ep(t, f(0.34), f(0.5));
  const later = ep(t, f(0.55), f(0.65));
  return (
    <>
      <Overline y={110}>Restore elsewhere</Overline>
      <Box x={M} y={170} w={470} h={190} title="source.db" sub="WAL mode · quiet · never opened by the validator" accent={C.mute} />
      <Box x={M + 630} y={170} w={470} h={190} title="good.bak" sub="one standalone file" accent={C.cyan} o={ep(t, f(0.1), f(0.2))} />
      <Box x={M + 1258} y={170} w={470} h={190} title="restored.db" sub="fresh temp path · validated here" accent={C.cyan} glow={a2 > 0.9} o={ep(t, f(0.3), f(0.4))} />
      <Svg>
        <Arrow x1={M + 470} y1={265} x2={M + 630} y2={265} p={a1} label="" />
        <Arrow x1={M + 1100} y1={265} x2={M + 1258} y2={265} p={a2} label="" />
      </Svg>
      <Txt x={M + 440} y={375} w={220} size={24} color={C.cyan} align="center" o={a1}>Online Backup API</Txt>
      <Txt x={M + 1070} y={375} w={220} size={24} color={C.cyan} align="center" o={a2}>copy to new path</Txt>
      <Badge x={M} y={450} label="source orders" value="41" color={C.mute} o={later} />
      <Txt x={M} y={505} w={470} size={24} o={later}>Order 5001 was written after the backup.</Txt>
      <Badge x={M + 630} y={450} label="backup orders" value="40" color={C.cyan} o={later} />
      <Badge x={M + 1258} y={450} label="restored orders" value="40" color={C.cyan} o={later} />
      <Txt x={M + 630} y={505} w={1098} size={24} o={later}>The restored copy holds the backup’s data, not later source writes.</Txt>
      <Box x={M} y={600} w={W - 2 * M} h={190} accent={C.red} dashed fill="transparent" o={ep(t, f(0.72), f(0.85))}>
        <div style={{fontSize: 24, color: C.red, fontWeight: 700, letterSpacing: 2}}>NOT A BACKUP · CONTROL</div>
        <div style={{fontSize: 30, color: C.text, marginTop: 8, fontWeight: 600}}>Copying only the main file of a live WAL database</div>
        <div style={{fontSize: 26, color: C.dim, marginTop: 6}}>Observed: main file 4096 bytes, while 49472 bytes of committed data sat in the -wal file.</div>
      </Box>
    </>
  );
};

/* 4. Structural and foreign-key checks, separately */
const Checks: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  const q1 = ep(t, f(0.05), f(0.15));
  const q2 = ep(t, f(0.3), f(0.4));
  const g = (a: number, b: number) => (ep(t, f(a), f(b)) > 0.5 ? 'pass' : 'pending') as 'pass' | 'pending';
  return (
    <>
      <Overline y={110}>Two separate questions</Overline>
      <Box x={M} y={160} w={840} h={230} title="Is the file structurally sound?" accent={C.cyan} o={q1}>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 28, color: C.text, marginTop: 20}}>PRAGMA integrity_check;</div>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 34, color: C.green, marginTop: 12, opacity: ep(t, f(0.15), f(0.25)), fontWeight: 700}}>→ ok</div>
      </Box>
      <Box x={M + 888} y={160} w={840} h={230} title="Does every order have a customer?" accent={C.cyan} o={q2}>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 28, color: C.text, marginTop: 20}}>PRAGMA foreign_key_check;</div>
        <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 34, color: C.green, marginTop: 12, opacity: ep(t, f(0.4), f(0.5)), fontWeight: 700}}>→ (no rows)</div>
      </Box>
      <Gate x={M} y={440} w={840} title="Validator results · good backup" accent={C.green} o={ep(t, f(0.5), f(0.58))} checks={[
        {label: 'integrity_check: ok', state: 'pass'},
        {label: 'foreign_key_check: no rows', state: 'pass'},
        {label: 'schema version (user_version): 3', state: g(0.62, 0.7)},
        {label: 'tables: customers, orders', state: g(0.72, 0.8)},
      ]} />
      <Box x={M + 888} y={440} w={840} h={250} title="Why both checks" accent={C.amber} dashed fill="transparent" o={ep(t, f(0.8), f(0.9))}>
        <div style={{fontSize: 26, color: C.text, marginTop: 10, lineHeight: 1.35}}>integrity_check inspects file structure.</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 8, lineHeight: 1.35}}>foreign_key_check inspects links between tables.</div>
        <div style={{fontSize: 26, color: C.amber, marginTop: 8, lineHeight: 1.35}}>Passing one does not answer the other.</div>
      </Box>
      <Txt x={M} y={810} w={W - 2 * M} size={26} color={C.dim} o={ep(t, f(0.88), f(0.97))}>Observed from the local fixture: SQLite 3.53.1 via Python sqlite3, run on the restored copy.</Txt>
    </>
  );
};

/* 5. Known data and the application query */
const Values: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  const known = [
    {t: '✓ customers: 12   orders: 40', c: C.green},
    {t: '✓ customers.id=1  email', c: C.green},
    {t: '✓ customers.id=12 name', c: C.green},
    {t: '✓ orders.id=1  amount_cents 9419', c: C.green},
    {t: '✓ orders.id=17 customer_id 2', c: C.green},
    {t: '✓ orders.id=40 status shipped', c: C.green},
    {t: '✓ SUM(amount_cents) 244580', c: C.green},
  ];
  const rows = Math.floor(prog(t, f(0.3), f(0.75)) * TOTALS.length);
  return (
    <>
      <Overline y={110}>Known values</Overline>
      <Log x={M} y={160} w={700} lines={known} shown={prog(t, f(0.05), f(0.3)) * known.length} size={26} title="Executed · selected checks" />
      <Overline x={M + 780} y={110}>The application’s order-total query</Overline>
      <div style={{position: 'absolute', left: M + 780, top: 160, width: 948, borderRadius: 14, background: '#0d0f14', border: `2px solid ${C.line}`, padding: '12px 22px', boxSizing: 'border-box', fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 25, lineHeight: 1.5}}>
        <div style={{display: 'flex', color: C.mute}}><span style={{width: 60}}>id</span><span style={{width: 330}}>name</span><span style={{width: 150}}>orders</span><span>total</span></div>
        {TOTALS.slice(0, rows).map((r) => (
          <div key={r[0]} style={{display: 'flex', color: C.text}}><span style={{width: 60}}>{r[0]}</span><span style={{width: 330}}>{r[1]}</span><span style={{width: 150}}>{r[2]}</span><span style={{color: C.green}}>{money(r[3])}</span></div>
        ))}
      </div>
      <Badge x={M} y={600} label="app query" value="12 of 12 totals as expected" color={C.green} big o={ep(t, f(0.78), f(0.88))} />
      <Txt x={M} y={680} w={700} size={26} color={C.amber} o={ep(t, f(0.85), f(0.95))}>Counts alone could not prove this: the next scene shows why.</Txt>
      <Txt x={M} y={800} w={W - 2 * M} size={24} color={C.dim} o={ep(t, f(0.88), f(0.97))}>Observed from the local fixture: totals exclude cancelled orders; amounts are synthetic cents shown as dollars.</Txt>
    </>
  );
};

/* 6. Deliberately invalid artifacts failing validation */
const Fail: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  const cw = 560;
  const xs = [M, M + 584, M + 1168];
  const o = [ep(t, f(0.05), f(0.15)), ep(t, f(0.33), f(0.43)), ep(t, f(0.62), f(0.72))];
  return (
    <>
      <Overline y={110} color={C.red}>Deliberately invalid artifacts</Overline>

      <Txt x={xs[0]} y={165} w={cw} size={26} color={C.text} weight={700} o={o[0]}>A. Not a SQLite file</Txt>
      <Gate x={xs[0]} y={210} w={cw} title="not_a_database.bak" accent={C.red} o={o[0]} checks={[
        {label: 'restore_open', state: 'fail'},
        {label: 'integrity_check · skipped', state: 'pending'},
        {label: 'foreign_key_check · skipped', state: 'pending'},
        {label: 'five more · skipped', state: 'pending'},
      ]} />
      <Txt x={xs[0]} y={600} w={cw} size={24} color={C.red} mono o={o[0]}>DatabaseError: file is not a database</Txt>
      <Txt x={xs[0]} y={680} w={cw} size={24} color={C.dim} o={o[0]}>Result: invalid, exit 1, one JSON object. No crash.</Txt>

      <Txt x={xs[1]} y={165} w={cw} size={26} color={C.text} weight={700} o={o[1]}>B. Orphan order, same counts</Txt>
      <Gate x={xs[1]} y={210} w={cw} title="orphan_same_counts.bak" accent={C.red} o={o[1]} checks={[
        {label: 'integrity_check: ok', state: 'pass'},
        {label: 'record counts: 12 / 40', state: 'pass'},
        {label: 'foreign_key_check', state: 'fail'},
        {label: 'order totals', state: 'fail'},
      ]} />
      <Txt x={xs[1]} y={600} w={cw} size={24} color={C.red} mono o={o[1]}>orders row 23 → customers: no match</Txt>
      <Txt x={xs[1]} y={680} w={cw} size={24} color={C.dim} o={o[1]}>Written with foreign keys OFF. Hugo Placeholder: 3 orders became 2.</Txt>

      <Txt x={xs[2]} y={165} w={cw} size={26} color={C.text} weight={700} o={o[2]}>C. One wrong amount, same counts</Txt>
      <Gate x={xs[2]} y={210} w={cw} title="wrong_value_same_counts.bak" accent={C.red} o={o[2]} checks={[
        {label: 'integrity_check: ok', state: 'pass'},
        {label: 'foreign_key_check: no rows', state: 'pass'},
        {label: 'record counts: 12 / 40', state: 'pass'},
        {label: 'known sum + order totals', state: 'fail'},
      ]} />
      <Txt x={xs[2]} y={600} w={cw} size={24} color={C.red} mono o={o[2]}>expected 19911, found 20011</Txt>
      <Txt x={xs[2]} y={680} w={cw} size={24} color={C.dim} o={o[2]}>Hugo Placeholder’s total is wrong. No orphan, no structural fault.</Txt>

      <Txt x={M} y={820} w={W - 2 * M} size={24} color={C.dim} o={ep(t, f(0.82), f(0.92))}>Observed from the local fixture. Artifacts built by explicit edits, not by random truncation.</Txt>
    </>
  );
};

/* 7. End card */
const End: React.FC<SceneProps> = ({t, dur}) => {
  const f = (x: number) => x * dur;
  return (
    <>
      <Big y={300} align="center" size={84} o={ep(t, 0.2, 0.9)}>A backup is a claim.<br />The restore is the test.</Big>
      <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, f(0.3), f(0.45))}>One small synthetic SQLite database. No recovery-time or recovery-point claim is made.</Txt>
      <Txt x={M} y={680} w={W - 2 * M} align="center" size={26} color={C.mute} o={ep(t, f(0.5), f(0.65))}>Out of scope: external files, object storage, secrets and infrastructure.</Txt>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {success: Success, question: Question, restore: Restore, checks: Checks, values: Values, fail: Fail, end: End};
