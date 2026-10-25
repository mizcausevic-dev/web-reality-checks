import React from 'react';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Readout, Stages, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep30-scheduled-job-twice/evidence.json:
   flawed rows 2, corrected rows 1, report = 7 source rows / 12325 cents,
   pre-commit: 0 rows visible while open, 0 after kill, 1 after retry,
   lock contention (30 ms busy timeout) -> retryable-busy, errcode 5, 0 rows,
   other constraint (reports.ref) -> constraint-violation, 0 rows. */
const RUN = 'daily_sales @ 2026-03-02T02:00:00Z';

type TRow = {text: string; color?: string; o?: number};

/** A table of report rows inside a shared-database box. */
const TableBox: React.FC<{x: number; y: number; w: number; h: number; title: string; sub?: string; accent?: string; rows: TRow[]; empty?: string; o?: number; glow?: boolean}> = ({x, y, w, h, title, sub, accent = C.cyan, rows, empty, o = 1, glow = false}) => (
  <Box x={x} y={y} w={w} h={h} title={title} sub={sub} accent={accent} o={o} glow={glow}>
    <div style={{marginTop: 18}}>
      {rows.length === 0 && empty && <div style={{fontFamily: F.mono, fontSize: 26, color: C.mute, padding: '10px 0'}}>{empty}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{fontFamily: F.mono, fontSize: 24, color: r.color ?? C.text, opacity: r.o ?? 1, padding: '10px 14px', marginBottom: 8, borderRadius: 8, background: '#0d0f14', border: `2px solid ${r.color ?? C.line}`, whiteSpace: 'pre'}}>{r.text}</div>
      ))}
    </div>
  </Box>
);

const REPORT_ROW = (id: number) => `id ${id} · complete · 7 rows · 12325 cents`;

/* 1. One scheduled instant, two reports */
const Fail: React.FC<SceneProps> = ({t}) => {
  const a1 = ep(t, 0.8, 1.6);
  const a2 = ep(t, 1.8, 2.6);
  return (
    <>
      <Overline y={110} color={C.red}>One logical run · two committed reports</Overline>
      <Box x={M} y={210} w={600} h={190} title="Scheduled instant (UTC)" sub={RUN} accent={C.cyan} o={ep(t, 0, 0.6)} />
      <Pill x={780} y={190} text="invocation 1" color={C.cyanDim} o={ep(t, 0.6, 1)} />
      <Pill x={780} y={330} text="invocation 2" color={C.cyanDim} o={ep(t, 1.6, 2)} />
      <Svg>
        <Arrow x1={696} y1={290} x2={770} y2={222} p={ep(t, 0.5, 1)} />
        <Arrow x1={696} y1={320} x2={770} y2={360} p={ep(t, 1.5, 2)} />
        <Arrow x1={1010} y1={222} x2={1130} y2={290} p={a1} />
        <Arrow x1={1010} y1={360} x2={1130} y2={400} p={a2} color={C.red} />
      </Svg>
      <TableBox x={1140} y={190} w={684} h={380} title="reports" sub="no UNIQUE on the logical run" accent={C.red} glow={t > 3}
        rows={[{text: REPORT_ROW(1), color: C.amber, o: a1}, {text: REPORT_ROW(2), color: C.red, o: a2}]} />
      <Readout x={M + 40} y={520} label="reports for one run" value={t > 2.6 ? 2 : t > 1.4 ? 1 : 0} color={t > 2.6 ? C.red : C.amber} w={420} />
      <Txt x={M + 520} y={560} w={560} size={32} weight={700} color={C.red} o={ep(t, 3.2, 3.8)}>Same run, committed twice.</Txt>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4, 4.6)}>Observed from the local fixture: 2 complete report rows for daily_sales @ 2026-03-02T02:00:00Z</Txt>
    </>
  );
};

/* Shared layout for the two-worker race scenes */
const WorkerBox: React.FC<{x: number; y: number; name: string; o?: number; accent?: string; sub?: string; glow?: boolean}> = ({x, y, name, o = 1, accent = C.cyan, sub = 'own process · own connection', glow = false}) => (
  <Box x={x} y={y} w={500} h={190} title={name} sub={sub} accent={accent} o={o} glow={glow} />
);

/* 2. Both workers pass separate existence checks (flawed) */
const Race: React.FC<SceneProps> = ({t}) => {
  const checked = ep(t, 1.4, 2);
  const bar = ep(t, 2.8, 3.3);
  const rel = step(t, 3.6);
  const p = ep(t, 3.8, 4.8);
  return (
    <>
      <Overline y={110}>Flawed version · check, then insert</Overline>
      <WorkerBox x={M} y={190} name="Worker A" o={ep(t, 0, 0.5)} />
      <WorkerBox x={M} y={460} name="Worker B" o={ep(t, 0.2, 0.7)} />
      <Badge x={M + 24} y={190 + 128} label="check" value="0 rows: absent" color={C.amber} o={checked} />
      <Badge x={M + 24} y={460 + 128} label="check" value="0 rows: absent" color={C.amber} o={ep(t, 1.7, 2.3)} />
      {/* test barrier */}
      <div style={{position: 'absolute', left: 786, top: 180, width: 0, height: 520, borderLeft: `4px dashed ${rel ? C.cyan : C.amber}`, opacity: bar}} />
      <Txt x={640} y={715} w={330} align="center" size={26} weight={700} color={rel ? C.cyan : C.amber} o={bar}>{rel ? 'TEST BARRIER · released' : 'TEST BARRIER · both arrived'}</Txt>
      <Svg>
        <Arrow x1={M + 500} y1={285} x2={1110} y2={330} p={p} label="INSERT + commit" labelDy={-12} />
        <Arrow x1={M + 500} y1={555} x2={1110} y2={500} p={p} label="INSERT + commit" labelDy={28} />
      </Svg>
      <TableBox x={1120} y={230} w={704} h={400} title="reports (one shared file)" sub="autocommit · short busy wait" accent={C.red}
        rows={[{text: REPORT_ROW(1), color: C.amber, o: ep(t, 4.6, 5.1)}, {text: REPORT_ROW(2), color: C.red, o: ep(t, 5.1, 5.6)}]} />
      <Txt x={1120} y={650} w={704} size={34} weight={700} color={C.red} o={ep(t, 6, 6.6)}>2 rows · 1 logical run</Txt>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Observed from the local fixture: both checks returned 0 before the barrier released either worker.</Txt>
    </>
  );
};

/* 3. Unique key + atomic transaction + three outcomes */
const Key: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.green}>Corrected version · decide inside one transaction</Overline>
    <Code x={M} y={180} w={900} title="worker.mjs · corrected" size={26} hi={[0, 3]} hiColor={C.green} o={ep(t, 0, 0.6)} lines={[
      'UNIQUE (report_type, scheduled_utc)',
      'BEGIN IMMEDIATE;',
      'INSERT INTO reports (...) VALUES (...)',
      '  ON CONFLICT (report_type, scheduled_utc)',
      '  DO NOTHING;  -- then check changes()',
    ]} />
    <Box x={1040} y={180} w={784} h={160} title="changes() = 0" sub="The run exists. Verify the committed report, then exit: already committed." accent={C.green} o={ep(t, 1.6, 2.2)} />
    <Box x={1040} y={360} w={784} h={160} title="SQLITE_BUSY after the timeout" sub="Retryable database failure. It proves nothing about the other worker." accent={C.amber} o={ep(t, 3, 3.6)} />
    <Box x={1040} y={540} w={784} h={160} title="Any other constraint" sub="A real error (e.g. UNIQUE on reports.ref). Never reported as already completed." accent={C.red} o={ep(t, 4.4, 5)} />
    <Txt x={M} y={470} w={900} size={28} color={C.amber} o={ep(t, 5.6, 6.2)}>A UNIQUE constraint does not retry anything by itself.</Txt>
    <Txt x={M} y={545} w={900} size={28} color={C.dim} o={ep(t, 6.4, 7)}>The report is a short, database-local read of synthetic source rows. No transaction is held around slow external work.</Txt>
    <Txt x={M} y={720} w={900} size={28} color={C.dim} o={ep(t, 7.4, 8)}>{'The logical run is (report type, scheduled instant), and the instant is a UTC string: 2026-03-02T02:00:00Z'}</Txt>
  </>
);

/* 4. Run both workers again */
const Rerun: React.FC<SceneProps> = ({t}) => {
  const toLock = ep(t, 1.4, 2.4);
  const decided = step(t, 3);
  return (
    <>
      <Overline y={110} color={C.green}>Corrected version · same stale check, same barrier</Overline>
      <WorkerBox x={M} y={190} name="Worker A" accent={C.cyan} glow={decided === 1} sub={decided ? 'holds the write lock' : 'own process · own connection'} />
      <WorkerBox x={M} y={460} name="Worker B" accent={decided ? C.amber : C.cyan} sub={decided ? 'waits (bounded busy timeout)' : 'own process · own connection'} />
      <Badge x={M + 24} y={190 + 128} label="check" value="0 rows: absent" color={C.amber} o={ep(t, 0.3, 0.8)} />
      <Badge x={M + 24} y={460 + 128} label="check" value="0 rows: absent" color={C.amber} o={ep(t, 0.5, 1)} />
      <Box x={1080} y={300} w={460} h={230} title="Write lock" sub="one connection at a time" accent={decided ? C.cyan : C.amber} glow={decided === 1} o={ep(t, 0.8, 1.4)}>
        <div style={{fontFamily: F.mono, fontSize: 26, color: C.text, marginTop: 14, opacity: toLock}}>BEGIN IMMEDIATE</div>
      </Box>
      <Svg>
        <Arrow x1={M + 500} y1={285} x2={1070} y2={380} p={toLock} color={decided ? C.cyan : C.amber} />
        <Arrow x1={M + 500} y1={555} x2={1070} y2={450} p={toLock} color={C.amber} dashed={decided === 1} />
      </Svg>
      <Txt x={1580} y={320} w={244} size={28} weight={700} color={C.cyan} o={ep(t, 3.2, 3.8)}>one holder</Txt>
      <Txt x={1580} y={400} w={244} size={28} weight={700} color={C.amber} o={ep(t, 3.8, 4.4)}>one waits</Txt>
      <Txt x={M} y={760} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>Either worker may win. The tests accept both orders.</Txt>
    </>
  );
};

/* 5. One committed report; the other detects it */
const One: React.FC<SceneProps> = ({t}) => {
  const a = [
    {t: 'BEGIN IMMEDIATE ✓', c: C.green},
    {t: 'INSERT … DO NOTHING → changes 1', c: C.text},
    {t: 'compute from source rows', c: C.text},
    {t: 'store COMPLETE result', c: C.text},
    {t: 'COMMIT ✓', c: C.green},
  ];
  const b = [
    {t: 'BEGIN IMMEDIATE … waits', c: C.amber},
    {t: 'INSERT … DO NOTHING → changes 0', c: C.text},
    {t: 'verify committed report ✓', c: C.green},
    {t: 'ROLLBACK (nothing to write)', c: C.dim},
    {t: 'exit: already committed', c: C.green},
  ];
  const k = prog(t, 0.6, 5.2) * 5;
  return (
    <>
      <Overline y={110} color={C.green}>One worker commits · the other detects it</Overline>
      <Log x={M} y={180} w={830} lines={a} shown={k} title="first to take the lock" size={26} />
      <Log x={M + 898} y={180} w={830} lines={b} shown={Math.max(0, k - 0.8)} title="second worker" size={26} />
      <TableBox x={M} y={520} w={1100} h={260} title="reports (committed)" sub={RUN} accent={C.green} glow={t > 5.4} rows={[{text: REPORT_ROW(1), color: C.green, o: ep(t, 5.2, 5.8)}]} />
      <Readout x={1300} y={540} label="rows for the run" value={t > 5.4 ? 1 : 0} color={C.green} w={420} />
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.2, 6.8)}>Observed from the local fixture: outcomes "committed" + "already-committed", 1 row, complete.</Txt>
    </>
  );
};

/* 6. Fail after insertion, before commit */
const Crash: React.FC<SceneProps> = ({t}) => {
  const killed = t >= 4.2;
  return (
    <>
      <Overline y={110} color={C.red}>Controlled fault · worker killed before COMMIT</Overline>
      <Stages x={M} y={190} w={W - 2 * M} stages={['BEGIN IMMEDIATE', 'INSERT row', 'compute + store', 'COMMIT']}
        active={killed ? -1 : t > 2 ? 1 : 0} done={[...(t > 0.8 ? [0] : []), ...(t > 2 ? [1] : [])]} failed={killed ? 2 : undefined} />
      <Box x={M} y={340} w={820} h={300} title="Inside the open transaction" sub="Only the worker's own connection can see this row" accent={killed ? C.red : C.amber} dashed o={ep(t, 2, 2.6)}>
        <div style={{marginTop: 18, fontFamily: F.mono, fontSize: 24, padding: '10px 14px', borderRadius: 8, background: '#0d0f14', border: `2px dashed ${killed ? C.red : C.amber}`, color: killed ? C.red : C.amber, opacity: killed ? 0.5 : 1, textDecoration: killed ? 'line-through' : 'none'}}>id 1 · pending · uncommitted</div>
      </Box>
      <Box x={M + 900} y={340} w={828} h={300} title="Another connection reads" sub="SELECT … FROM reports WHERE run = …" accent={C.cyan} o={ep(t, 2.6, 3.2)}>
        <div style={{marginTop: 22, fontFamily: F.mono, fontSize: 34, color: C.text}}>0 rows</div>
        <div style={{marginTop: 10, fontFamily: F.sans, fontSize: 24, color: C.dim}}>Uncommitted data is never visible</div>
      </Box>
      <Pill x={M} y={690} text="SIGKILL · no COMMIT, no cleanup" color={C.red} o={ep(t, 4.2, 4.8)} size={30} />
      <Txt x={M + 900} y={690} w={828} size={30} weight={700} color={C.green} o={ep(t, 5.4, 6)}>After the kill: still 0 rows.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6, 6.6)}>Observed from the local fixture: 0 rows visible while open, 0 after the process was killed.</Txt>
    </>
  );
};

/* 7. Rollback and retry; busy and other constraints */
const Retry: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.green}>Rollback, then retry</Overline>
    <Readout x={M} y={180} label="rows after rollback" value={0} color={C.red} w={420} o={ep(t, 0.2, 0.8)} />
    <Box x={700} y={210} w={520} h={150} title="Retry worker" sub="outcome: committed" accent={C.cyan} o={ep(t, 1.4, 2)} />
    <Readout x={1404} y={180} label="complete report after retry" value={1} color={C.green} w={420} o={ep(t, 2.6, 3.2)} />
    <Svg>
      <Arrow x1={540} y1={290} x2={690} y2={290} p={ep(t, 1, 1.6)} />
      <Arrow x1={1230} y1={290} x2={1394} y2={290} p={ep(t, 2.2, 2.8)} color={C.green} />
    </Svg>
    <Txt x={M} y={430} w={W - 2 * M} size={30} color={C.green} o={ep(t, 3.4, 4)}>Every committed row is complete. No placeholder is ever committed.</Txt>
    <Box x={M} y={520} w={840} h={230} title="Lock held elsewhere · 30 ms busy timeout" sub="retryable-busy (SQLITE_BUSY) · 0 rows. Not 'already completed'." accent={C.amber} o={ep(t, 4.4, 5)} />
    <Box x={M + 888} y={520} w={840} h={230} title="Another UNIQUE constraint (reports.ref)" sub="constraint-violation · 0 rows for the run. Not 'already completed'." accent={C.red} o={ep(t, 5.4, 6)} />
    <Txt x={M} y={850} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.4, 7)}>Observed from the local fixture: pre-commit failure → 0 rows → retry → 1 row; busy → 0 rows; other constraint → 0 rows.</Txt>
  </>
);

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={170} align="center" size={76} o={ep(t, 0.2, 0.9)}>Scheduling starts work.<br />Coordination decides what commits.</Big>
    <Txt x={M} y={440} w={W - 2 * M} size={30} weight={700} color={C.green} o={ep(t, 1.4, 2)}>Guarantee: one committed database report per logical run.</Txt>
    <Txt x={M} y={510} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 2.2, 2.8)}>Not exactly-once execution. A unique constraint does not retry anything by itself.</Txt>
    <Txt x={M} y={575} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 3, 3.6)}>An in-process Boolean cannot coordinate processes: two processes, two rows (tested).</Txt>
    <Txt x={M} y={640} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 3.8, 4.4)}>Reports are short and database-local; never hold the transaction around slow external work.</Txt>
    <Txt x={M} y={705} w={W - 2 * M} size={28} color={C.amber} o={ep(t, 4.6, 5.2)}>Emails, files and API calls need coordination beyond this fixture.</Txt>
    <Txt x={M} y={820} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 5.4, 6)}>Local fixture: synthetic rows, one SQLite file, two real worker processes. Not a claim about any specific scheduler.</Txt>
  </>
);

export const scenes = {fail: Fail, race: Race, key: Key, rerun: Rerun, one: One, crash: Crash, retry: Retry, end: End};
