import React from 'react';
import {Big, Box, Code, Overline, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';
import EV from '../../../../fixtures/ep22-date-only-timezones/evidence.json';

/* Every date, time and offset shown below is read from fixtures/ep22-date-only-timezones/evidence.json
   (written by `node demo.mjs`). Nothing is typed in by hand except labels. */

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTitle = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ymd = (iso: string) => ({y: iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10)});
const short = (zone: string) => (zone.split('/').pop() as string).replace('_', ' ');
const [fUTC, fNY, fTK] = EV.flawed;
const [cUTC, cNY, cTK] = EV.corrected;
const [eUTC, eNY, eTK] = EV.event;
const D0 = ymd(EV.task.deadline);

/* ---------- local visual components ---------- */

/** Calendar tile = a date-only value: month header, day number, the YYYY-MM-DD it came from. No time, no zone. */
const CalTile: React.FC<{x: number; y: number; iso: string; color?: string; o?: number; s?: number}> = ({x, y, iso, color = C.cyan, o = 1, s = 1}) => {
  const p = ymd(iso);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 300, height: 320, opacity: o, transform: `scale(${s})`, transformOrigin: 'top left', borderRadius: 18, border: `4px solid ${color}`, background: C.panel, overflow: 'hidden', boxShadow: `0 0 40px ${color}33`, fontFamily: F.sans, textAlign: 'center'}}>
      <div style={{background: color, color: C.bg, fontSize: 32, fontWeight: 800, letterSpacing: 4, padding: '10px 0'}}>{MON[p.m - 1]} {p.y}</div>
      <div style={{fontSize: 150, fontWeight: 800, color: C.text, lineHeight: 1.05, marginTop: 14, letterSpacing: -4}}>{p.d}</div>
      <div style={{fontFamily: F.mono, fontSize: 28, color: C.dim, marginTop: 6}}>{iso}</div>
    </div>
  );
};

/** Centered label chip (used for results under the timeline pin). */
const Chip: React.FC<{cx: number; y: number; text: string; color: string; o?: number}> = ({cx, y, text, color, o = 1}) => (
  <div style={{position: 'absolute', left: cx, top: y, transform: 'translateX(-50%)', opacity: o, padding: '6px 20px', borderRadius: 10, border: `3px solid ${color}`, background: C.panel, boxShadow: `inset 0 0 0 100px ${color}22`, fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.text, whiteSpace: 'nowrap'}}>{text}</div>
);

/* Global timeline: UTC hours relative to 00:00Z on the deadline date. Axis spans -24h .. +24h. */
const X0 = 160;
const AXW = 1600;
const PXH = AXW / 48;
const hx = (h: number) => X0 + (h + 24) * PXH;
const rowTop = (axisY: number, i: number) => axisY + 38 + i * 175;

type TRow = {zone: string; offMin: number; color: string};
const ZoneTimeline: React.FC<{axisY: number; rows: TRow[]; pinH: number; pinColor: string; pinLabel: string; bandsO?: number; pinP?: number; hiBand?: boolean}> = ({axisY, rows, pinH, pinColor, pinLabel, bandsO = 1, pinP = 1, hiBand = true}) => {
  const lastBottom = rowTop(axisY, rows.length - 1) + 100;
  const pinY2 = axisY + (lastBottom - axisY) * pinP;
  return (
    <>
      {/* axis */}
      <Svg>
        <line x1={X0} y1={axisY} x2={X0 + AXW} y2={axisY} stroke={C.mute} strokeWidth={3} />
        {[-24, -12, 0, 12, 24].map((h) => <line key={h} x1={hx(h)} y1={axisY - 10} x2={hx(h)} y2={axisY + 10} stroke={C.dim} strokeWidth={3} />)}
        <line x1={hx(pinH)} y1={axisY} x2={hx(pinH)} y2={pinY2} stroke={pinColor} strokeWidth={5} strokeDasharray="10 8" />
        <circle cx={hx(pinH)} cy={axisY} r={13} fill={pinColor} />
      </Svg>
      {[-24, -12, 0, 12, 24].map((h) => (
        <Txt key={h} x={hx(h) - 70} y={axisY - 52} w={140} align="center" size={24} color={h === 0 ? C.text : C.dim} weight={h === 0 ? 700 : 500} mono>{h % 24 === 0 ? '00:00Z' : '12:00Z'}</Txt>
      ))}
      <Txt x={X0 - 60} y={axisY - 100} w={600} size={24} color={C.mute}>UTC axis · one shared global timeline</Txt>
      <Txt x={hx(pinH) - 300} y={axisY - 100} w={600} align="center" size={26} color={pinColor} weight={700} mono o={ep(pinP, 0, 0.3)}>{pinLabel}</Txt>
      {/* rows: each zone's local calendar days laid on the same axis */}
      {rows.map((r, i) => {
        const top = rowTop(axisY, i);
        return (
          <React.Fragment key={r.zone}>
            <Txt x={X0} y={top} size={26} color={r.color} weight={700} o={bandsO}>{r.zone}  ·  {r.offMin === 0 ? 'UTC+00:00' : `UTC${r.offMin < 0 ? '-' : '+'}${String(Math.floor(Math.abs(r.offMin) / 60)).padStart(2, '0')}:${String(Math.abs(r.offMin) % 60).padStart(2, '0')}`}</Txt>
            {[-2, -1, 0, 1].map((k) => {
              const s = 24 * k - r.offMin / 60; // local midnight of day D0+k, in UTC hours
              const e = s + 24;
              const a = Math.max(s, -24), b = Math.min(e, 24);
              if (b <= a) return null;
              const hit = hiBand && pinH >= s && pinH < e;
              return (
                <div key={k} style={{position: 'absolute', left: hx(a), top: top + 34, width: hx(b) - hx(a), height: 62, boxSizing: 'border-box', opacity: bandsO, border: `3px solid ${hit ? r.color : C.line}`, background: hit ? `${r.color}26` : C.panel, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 26, fontWeight: hit ? 800 : 500, color: hit ? C.text : C.mute, whiteSpace: 'nowrap', overflow: 'hidden'}}>
                  {MONTitle[D0.m - 1]} {D0.d + k}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
const offs = {utc: eUTC.offsetMinutes, ny: eNY.offsetMinutes, tk: eTK.offsetMinutes};

/* ---------- scenes ---------- */

/* 1. Two views, same deadline, different dates */
const Fail: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>Task: {EV.task.title}</Overline>
    <Box x={200} y={170} w={600} h={600} title={`Viewer A · ${short(fUTC.zone)}`} sub="same stored deadline" accent={C.cyan} o={ep(t, 0.1, 0.6)} />
    <CalTile x={350} y={290} iso={fUTC.date} color={C.cyan} o={ep(t, 0.4, 0.9)} />
    <Box x={1120} y={170} w={600} h={600} title={`Viewer B · ${short(fNY.zone)}`} sub="same stored deadline" accent={C.red} o={ep(t, 0.9, 1.4)} glow={t > 2} />
    <CalTile x={1270} y={290} iso={fNY.date} color={C.red} o={ep(t, 1.2, 1.7)} />
    <Big x={800} y={380} w={320} align="center" size={120} color={C.red} o={ep(t, 2, 2.5)}>≠</Big>
    <Txt x={M} y={810} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 2.8, 3.3)}>Observed from the local fixture (evidence.json): viewer A shows {fUTC.date}, viewer B shows {fNY.date}. Nobody edited the task.</Txt>
  </>
);

/* 2. Reveal the original date-only string */
const StringScene: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110}>The stored value</Overline>
    <Txt x={M + 40} y={250} w={1000} size={104} color={C.text} weight={700} mono o={ep(t, 0.2, 0.8)}>{`"${EV.task.deadline}"`}</Txt>
    <Txt x={M + 40} y={400} w={1000} size={34} color={C.cyan} weight={700} o={ep(t, 1.2, 1.8)}>A calendar date: year, month, day.</Txt>
    <CalTile x={1380} y={190} iso={cUTC.date} color={C.cyan} o={ep(t, 1.2, 1.8)} />
    <Box x={M + 40} y={520} w={520} h={140} title="time of day" sub="none" accent={C.mute} dashed fill="transparent" o={ep(t, 2.4, 2.9)} />
    <Box x={M + 620} y={520} w={520} h={140} title="time zone" sub="none" accent={C.mute} dashed fill="transparent" o={ep(t, 3.0, 3.5)} />
    <Txt x={M + 40} y={720} w={1500} size={30} color={C.dim} o={ep(t, 3.8, 4.4)}>Nothing here says where on Earth, or at what moment, it applies. It is the same date for everyone.</Txt>
  </>
);

/* 3. JavaScript reads date-only as UTC midnight */
const Utc: React.FC<SceneProps> = ({t}) => {
  const move = ep(t, 2.4, 3.6);
  const AY = 520;
  const tx = 1300 + (hx(0) - 38 - 1300) * move;
  const ty = 150 + (rowTop(AY, 0) + 34 - 150 - 20) * move;
  const sc = 1 - 0.8 * move;
  return (
    <>
      <Overline y={110} color={C.amber}>One unnecessary conversion</Overline>
      <Code x={M} y={150} w={1100} title="what the code does" size={30} hi={[1]} hiColor={C.amber} o={ep(t, 0.2, 0.7)} lines={[EV.jsReading.code, `// ${EV.jsReading.toISOString}`]} />
      <Txt x={M} y={320} w={1100} size={30} color={C.amber} weight={700} o={ep(t, 1.4, 2)}>The date-only form is read as UTC midnight.</Txt>
      <CalTile x={tx} y={ty} iso={EV.task.deadline} color={C.cyan} s={sc} o={1 - prog(t, 3.3, 3.8)} />
      <ZoneTimeline axisY={AY} rows={[{zone: eUTC.zone, offMin: offs.utc, color: C.amber}]} pinH={0} pinColor={C.amber} pinLabel={EV.jsReading.toISOString} bandsO={ep(t, 2.0, 2.6)} pinP={ep(t, 3.4, 4.2)} hiBand={false} />
      <Txt x={M} y={760} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>A date has become a moment: an instant on the global timeline.</Txt>
      <Txt x={M} y={820} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 5.2, 5.8)}>Other string formats are read differently: new Date("{EV.task.deadline}T00:00:00") follows the machine's own zone.</Txt>
    </>
  );
};

/* 4. Convert to New York, reveal the previous date */
const Leak: React.FC<SceneProps> = ({t}) => {
  const AY = 250;
  const chip = (i: number) => rowTop(AY, i) + 104;
  const cx = hx(0);
  const rows: TRow[] = [
    {zone: fUTC.zone, offMin: offs.utc, color: C.cyan},
    {zone: fNY.zone, offMin: offs.ny, color: C.red},
    {zone: fTK.zone, offMin: offs.tk, color: C.cyan},
  ];
  return (
    <>
      <Overline y={110} color={C.red}>Same instant, three explicit zones</Overline>
      <ZoneTimeline axisY={AY} rows={rows} pinH={0} pinColor={C.amber} pinLabel={fUTC.instantIso} bandsO={ep(t, 0.1, 0.7)} pinP={ep(t, 1.0, 2.0)} />
      <Chip cx={cx} y={chip(0)} text={`${short(fUTC.zone)} · ${fUTC.date} ${fUTC.time}`} color={C.cyan} o={ep(t, 2.2, 2.6)} />
      <Chip cx={cx} y={chip(1)} text={`${short(fNY.zone)} · ${fNY.date} ${fNY.time}`} color={C.red} o={ep(t, 2.9, 3.3)} />
      <Chip cx={cx} y={chip(2)} text={`${short(fTK.zone)} · ${fTK.date} ${fTK.time}`} color={C.cyan} o={ep(t, 3.6, 4.0)} />
      <Txt x={hx(0) + 330} y={chip(1) - 2} w={560} size={30} color={C.red} weight={700} o={ep(t, 3.3, 3.8)}>← previous calendar date</Txt>
      <Txt x={M} y={840} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.6, 5.2)}>Observed from the local fixture: {EV.jsReading.toISOString} formatted with Intl.DateTimeFormat in each named zone.</Txt>
    </>
  );
};

/* 5. Separate calendar deadlines from scheduled instants */
const Split: React.FC<SceneProps> = ({t}) => {
  const pinP = ep(t, 1.6, 2.4);
  return (
    <>
      <Box x={M} y={170} w={800} h={620} title="Deadline" sub="a calendar date" accent={C.cyan} o={ep(t, 0.1, 0.6)} />
      <CalTile x={M + 250} y={290} iso={EV.task.deadline} color={C.cyan} o={ep(t, 0.5, 1)} />
      <Txt x={M + 24} y={650} w={750} align="center" size={32} color={C.text} weight={700} o={ep(t, 2.8, 3.3)}>Stays as written</Txt>
      <Txt x={M + 24} y={700} w={750} align="center" size={26} color={C.dim} o={ep(t, 2.8, 3.3)}>Never converted between zones</Txt>
      <Box x={M + 928} y={170} w={800} h={620} title="Meeting" sub="a scheduled instant" accent={C.violet} o={ep(t, 0.9, 1.4)} />
      <Svg>
        <line x1={M + 988} y1={470} x2={M + 1668} y2={470} stroke={C.mute} strokeWidth={4} />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={M + 988 + i * 170} y1={456} x2={M + 988 + i * 170} y2={484} stroke={C.dim} strokeWidth={3} />)}
        <circle cx={M + 988 + 3 * 170 * pinP} cy={470} r={pinP > 0 ? 18 : 0} fill={C.violet} />
      </Svg>
      <Txt x={M + 948} y={360} w={760} align="center" size={30} color={C.violet} weight={700} mono o={ep(t, 1.6, 2.2)}>{EV.task.eventAt}</Txt>
      <Txt x={M + 948} y={520} w={760} align="center" size={26} color={C.dim} o={ep(t, 1.8, 2.4)}>one point on the global timeline</Txt>
      <Txt x={M + 948} y={650} w={760} align="center" size={32} color={C.text} weight={700} o={ep(t, 3.2, 3.7)}>Converted per display zone</Txt>
      <Txt x={M + 948} y={700} w={760} align="center" size={26} color={C.dim} o={ep(t, 3.2, 3.7)}>Same instant, different local clocks</Txt>
    </>
  );
};

/* 6. Render the deadline without instant conversion */
const Fix: React.FC<SceneProps> = ({t}) => {
  const rejects = EV.validation.rejects;
  return (
    <>
      <Overline y={110} color={C.green}>The repair · validate, then render</Overline>
      <Code x={M} y={150} w={1000} title="correctedDeadline" size={26} hi={[0, 2]} hiColor={C.green} o={ep(t, 0.2, 0.7)} lines={[`const d = parseCalendarDate("${EV.task.deadline}");`, '// real calendar date, or RangeError', 'return d.iso; // no Date object, no zone']} />
      {rejects.map((r, i) => (
        <Chip key={r.input} cx={1340} y={150 + i * 62} text={`✕ ${r.input}  rejected`} color={C.red} o={ep(t, 1.0 + i * 0.5, 1.4 + i * 0.5)} />
      ))}
      {[cUTC, cNY, cTK].map((c, i) => (
        <React.Fragment key={c.zone}>
          <CalTile x={M + 40 + i * 340} y={410} iso={c.date} color={C.green} o={ep(t, 2.4 + i * 0.5, 2.9 + i * 0.5)} s={0.9} />
          <Txt x={M + 40 + i * 340} y={706} w={270} align="center" size={28} color={C.text} weight={700} o={ep(t, 2.4 + i * 0.5, 2.9 + i * 0.5)}>{short(c.zone)}</Txt>
        </React.Fragment>
      ))}
      <Box x={M + 1130} y={410} w={600} h={290} title="Not a fix: add twelve hours" accent={C.amber} dashed fill="transparent" titleSize={28} o={ep(t, 4.4, 4.9)}>
        <div style={{fontSize: 26, color: C.text, marginTop: 8, lineHeight: 1.35}}>Noon UTC still lands on the wrong date for some zones.</div>
        <div style={{fontSize: 26, color: C.amber, marginTop: 10, fontFamily: F.mono}}>Pacific/Kiritimati → {EV.twelveHourHack.kiritimati}</div>
      </Box>
      <Txt x={M} y={800} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.2, 5.8)}>Observed from the local fixture: corrected path shows {cUTC.date}, {cNY.date}, {cTK.date}, whichever zone or machine runs it.</Txt>
    </>
  );
};

/* 7. The scheduled event changes local clock time by zone */
const Retest: React.FC<SceneProps> = ({t}) => {
  const AY = 250;
  const chip = (i: number) => rowTop(AY, i) + 104;
  const pinH = +eUTC.time.slice(0, 2) + (eUTC.date === EV.task.deadline ? 0 : 24);
  const cx = hx(pinH);
  const rows: TRow[] = [
    {zone: eUTC.zone, offMin: offs.utc, color: C.violet},
    {zone: eNY.zone, offMin: offs.ny, color: C.violet},
    {zone: eTK.zone, offMin: offs.tk, color: C.violet},
  ];
  return (
    <>
      <Overline y={110} color={C.violet}>Retest · the scheduled instant</Overline>
      <ZoneTimeline axisY={AY} rows={rows} pinH={pinH} pinColor={C.violet} pinLabel={EV.task.eventAt} bandsO={ep(t, 0.1, 0.7)} pinP={ep(t, 1.0, 2.0)} />
      <Chip cx={cx} y={chip(0)} text={`${eUTC.date} ${eUTC.time}`} color={C.violet} o={ep(t, 2.2, 2.6)} />
      <Chip cx={cx} y={chip(1)} text={`${eNY.date} ${eNY.time}`} color={C.violet} o={ep(t, 2.9, 3.3)} />
      <Chip cx={cx} y={chip(2)} text={`${eTK.date} ${eTK.time}`} color={C.amber} o={ep(t, 3.6, 4.0)} />
      <Txt x={X0 + 40} y={chip(2) - 2} w={900} size={28} color={C.amber} weight={700} o={ep(t, 3.9, 4.4)}>{short(eTK.zone)}: already {eTK.date}, correct for an instant →</Txt>
      <Txt x={M} y={840} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.8, 5.4)}>Observed from the local fixture: one instant, clocks {eUTC.time} / {eNY.time} / {eTK.time}. The date-only deadline stayed {cUTC.date}.</Txt>
    </>
  );
};

/* 8. End */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} align="center" size={96} o={ep(t, 0.2, 0.9)}>A date is not always<br />a moment.</Big>
    <Txt x={M} y={480} w={W - 2 * M} align="center" size={30} color={C.text} o={ep(t, 1.4, 2)}>Named IANA zones, not fixed offsets: {short(eNY.zone)} is {EV.zoneRules.january} in January and {EV.zoneRules.july} in July.</Txt>
    <Txt x={M} y={580} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 2.2, 2.8)}>Future recurring local schedules need local time plus zone rules. Daylight-saving ambiguity is outside this demo.</Txt>
    <Txt x={M} y={690} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3, 3.6)}>Executed on Node {EV.node}; Temporal {EV.temporalAvailable ? 'present' : 'not available'}, not used. Browsers and other engines not tested.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, string: StringScene, utc: Utc, leak: Leak, split: Split, fix: Fix, retest: Retest, end: End};
