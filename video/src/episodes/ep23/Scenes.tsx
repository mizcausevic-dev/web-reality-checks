import React from 'react';
import {Arrow, Big, Box, Code, Gate, Overline, Pill, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Values below come from fixtures/ep23-optimistic-concurrency/evidence.json.
   "Tabs" are two independent client instances in Node (own session, own local copy) - not real browsers. */
const ORIG = {title: 'Launch plan', body: 'Draft: audience, schedule.'};
const A_TITLE = 'Launch plan (approved)';
const B_BODY = 'Draft: audience, schedule, budget.';

/* Layout: two client panes on top, server document below. */
const TAB = {y: 170, h: 270};
const SRV = {x: 560, y: 600, w: 800, h: 270};
const AX = 96, BX = 1184, PW = 640;

type Row = {text: string; color?: string; strike?: boolean};
const Pane: React.FC<{x: number; y: number; w: number; h: number; label: string; sub?: string; title: Row; body: Row; version: string; accent?: string; vColor?: string; o?: number; glow?: boolean}> = ({x, y, w, h, label, sub, title, body, version, accent = C.line, vColor = C.cyan, o = 1, glow = false}) => (
  <Box x={x} y={y} w={w} h={h} title={label} sub={sub} accent={accent} o={o} glow={glow} titleSize={30}>
    <Pill x={w - 210} y={14} text={version} color={vColor} mono size={24} />
    {([['title', title], ['body', body]] as const).map(([k, r], i) => (
      <div key={k} style={{display: 'flex', gap: 16, marginTop: i === 0 ? 20 : 8, alignItems: 'baseline', fontFamily: F.sans}}>
        <span style={{width: 84, color: C.mute, fontSize: 24, fontWeight: 600}}>{k}</span>
        <span style={{color: r.color ?? C.text, fontSize: 28, fontWeight: 600, textDecoration: r.strike ? 'line-through' : 'none'}}>{r.text}</span>
      </div>
    ))}
  </Box>
);

const Note: React.FC<{t: number; a: number; children: React.ReactNode; color?: string}> = ({t, a, children, color = C.dim}) => (
  <Txt x={M} y={884} w={W - 2 * M} align="center" size={26} color={color} o={ep(t, a, a + 0.5)}>{children}</Txt>
);

/* 1. Outcome: A's saved change disappears after B saves */
const Lost: React.FC<SceneProps> = ({t}) => {
  const aEdit = step(t, 1.2);
  const pA = ep(t, 2.0, 2.8);
  const bEdit = step(t, 4.0);
  const pB = ep(t, 4.6, 5.4);
  const srvTitle = t < 2.8 ? ORIG.title : t < 5.4 ? A_TITLE : ORIG.title;
  const srvBody = t < 5.4 ? ORIG.body : B_BODY;
  const srvV = t < 2.8 ? 'v1' : t < 5.4 ? 'v2' : 'v3';
  const gone = t >= 5.4;
  return (
    <>
      <Pane x={AX} y={TAB.y} w={PW} h={TAB.h} label="Client A" sub="separate session, own local copy" title={{text: aEdit ? A_TITLE : ORIG.title, color: aEdit ? C.cyan : C.text}} body={{text: ORIG.body}} version="loaded v1" accent={C.cyan} o={ep(t, 0, 0.4)} />
      <Pane x={BX} y={TAB.y} w={PW} h={TAB.h} label="Client B" sub="separate session, own local copy" title={{text: ORIG.title}} body={{text: bEdit ? B_BODY : ORIG.body, color: bEdit ? C.amber : C.text}} version="loaded v1" accent={C.amber} o={ep(t, 0, 0.4)} />
      <Svg>
        <Arrow x1={620} y1={TAB.y + TAB.h} x2={620} y2={SRV.y} p={pA} color={C.green} label="save → 200 OK" />
        <Arrow x1={1300} y1={TAB.y + TAB.h} x2={1300} y2={SRV.y} p={pB} color={C.red} label="save → 200 OK" />
      </Svg>
      <Pane x={SRV.x} y={SRV.y} w={SRV.w} h={SRV.h} label="Server document" sub="flawed endpoint · unconditional update" title={{text: srvTitle, color: gone ? C.red : t >= 2.8 ? C.green : C.text}} body={{text: srvBody, color: gone ? C.amber : C.text}} version={srvV} accent={gone ? C.red : C.line} vColor={gone ? C.red : C.green} glow={gone} />
      <Txt x={SRV.x + 440} y={SRV.y + 190} w={340} size={26} weight={700} color={C.red} o={ep(t, 6.2, 6.8)}>A's accepted title is gone.</Txt>
      <Note t={t} a={7.2}>Observed from the local fixture: PUT /vuln/docs/doc_1 → 200, then 200. Final title "Launch plan", version 3.</Note>
    </>
  );
};

/* 2. Rewind: both clients load version 1 */
const Rewind: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 1.0, 2.0);
  return (
    <>
      <Overline y={110} color={C.amber}>Rewind</Overline>
      <Pane x={AX} y={TAB.y} w={PW} h={TAB.h} label="Client A" sub="own session cookie" title={{text: ORIG.title}} body={{text: ORIG.body}} version="loaded v1" accent={C.cyan} o={ep(t, 1.6, 2.2)} />
      <Pane x={BX} y={TAB.y} w={PW} h={TAB.h} label="Client B" sub="own session cookie" title={{text: ORIG.title}} body={{text: ORIG.body}} version="loaded v1" accent={C.amber} o={ep(t, 1.8, 2.4)} />
      <Pane x={SRV.x} y={SRV.y} w={SRV.w} h={SRV.h} label="Server document" sub="doc_1 · integer version" title={{text: ORIG.title}} body={{text: ORIG.body}} version="v1" />
      <Svg>
        <Arrow x1={620} y1={SRV.y} x2={620} y2={TAB.y + TAB.h} p={p1} color={C.cyan} label="GET /docs/doc_1" />
        <Arrow x1={1300} y1={SRV.y} x2={1300} y2={TAB.y + TAB.h} p={ep(t, 1.2, 2.2)} color={C.cyan} label="GET /docs/doc_1" />
      </Svg>
      <Txt x={M} y={452} w={W - 2 * M} align="center" size={30} weight={700} color={C.text} o={ep(t, 2.8, 3.4)}>Two independent client instances. Same document. Same version.</Txt>
      <Note t={t} a={4.0} color={C.amber}>Stand-in for two tabs: two client instances in Node, each with its own session. No real browser was used.</Note>
    </>
  );
};

/* 3. Local copies diverge */
const Diverge: React.FC<SceneProps> = ({t}) => {
  const aEdit = step(t, 1.0);
  const bEdit = step(t, 2.6);
  return (
    <>
      <Pane x={AX} y={TAB.y} w={PW} h={TAB.h} label="Client A" sub="edits the title" title={{text: aEdit ? A_TITLE : ORIG.title, color: aEdit ? C.cyan : C.text}} body={{text: ORIG.body}} version="based on v1" accent={C.cyan} glow={aEdit === 1} />
      <Pane x={BX} y={TAB.y} w={PW} h={TAB.h} label="Client B" sub="edits only the body" title={{text: ORIG.title, color: bEdit ? C.amber : C.text}} body={{text: bEdit ? B_BODY : ORIG.body, color: bEdit ? C.cyan : C.text}} version="based on v1" accent={C.amber} glow={bEdit === 1} />
      <Txt x={BX + 100} y={TAB.y + TAB.h + 14} w={540} size={26} weight={700} color={C.amber} o={ep(t, 3.4, 3.9)}>↑ stale: A already changed this</Txt>
      <Code x={AX} y={540} w={W - 2 * AX} size={26} title="B saves the WHOLE document" hi={[1]} hiColor={C.amber} o={ep(t, 4.2, 4.8)} lines={[
        'PUT /docs/doc_1',
        '{ title: "Launch plan",        // stale',
        '  body: "Draft: …schedule, budget." }',
      ]} />
      <Txt x={M} y={790} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 5.2, 5.8)}>Server still at v1: nothing has been saved yet.</Txt>
    </>
  );
};

/* 4. Reveal the unconditional update */
const Flawed: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>The flawed save</Overline>
    <Code x={M} y={170} w={940} size={26} title="PUT /vuln/docs/doc_1 · unconditional" hi={[3]} hiColor={C.red} o={ep(t, 0.3, 0.9)} lines={[
      'UPDATE docs',
      '   SET title = ?, body = ?,',
      '       version = version + 1',
      ' WHERE id = ?;   -- no version in sight',
    ]} />
    <Gate x={M + 1000} y={170} w={728} title="What the flawed save checks" accent={C.red} o={ep(t, 0.8, 1.3)} checks={[
      {label: 'Document id matches', state: 'pass'},
      {label: 'Caller is a member', state: 'pass'},
      {label: 'Caller saw the latest version', state: t > 2.6 ? 'missing' : 'pending'},
    ]} />
    <Txt x={M} y={470} w={W - 2 * M} size={34} weight={700} color={C.red} o={ep(t, 3.2, 3.8)}>Last writer wins. The version only counts up; it is never compared.</Txt>
    <Box x={M} y={580} w={W - 2 * M} h={190} accent={C.mute} o={ep(t, 4.4, 5)} fill="transparent" dashed>
      <div style={{fontSize: 26, color: C.dim, lineHeight: 1.4}}>
        B's request carried the whole document, including a title B never meant to change. The server had no way to tell that the title had moved since B loaded it.
      </div>
    </Box>
    <Note t={t} a={5.4}>Observed from the local fixture: A's change accepted at version 2, then replaced by B's save at version 3.</Note>
  </>
);

/* 5. Add the atomic version condition */
const Fix: React.FC<SceneProps> = ({t}) => {
  const glow = ep(t, 2.2, 2.8);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · optimistic concurrency</Overline>
      <Pill x={M} y={170} text="request carries expectedVersion: 1" color={C.cyan} mono size={26} o={ep(t, 0.3, 0.8)} />
      <Code x={M} y={250} w={1000} size={26} title="PUT /docs/doc_1 · ONE statement" hi={[3]} hiColor={C.green} o={ep(t, 0.8, 1.4)} lines={[
        'UPDATE docs',
        '   SET title = ?, body = ?,',
        '       version = version + 1',
        ' WHERE id = ? AND version = ?;',
        '-- rows changed: 1 → 200 · 0 → 409',
      ]} />
      <Gate x={M + 1060} y={250} w={668} title="What the save checks" accent={C.green} o={ep(t, 1.4, 1.9)} checks={[
        {label: 'Session user (401)', state: 'pass'},
        {label: 'Member of doc (404)', state: 'pass'},
        {label: 'id AND version match', state: glow > 0.5 ? 'pass' : 'pending'},
      ]} />
      <Txt x={M} y={600} w={W - 2 * M} size={30} color={C.text} weight={600} o={ep(t, 3.4, 4)}>The check and the write are the same statement. No gap between them for another save to slip into.</Txt>
      <Box x={M} y={720} w={W - 2 * M} h={140} accent={C.amber} dashed fill="transparent" o={ep(t, 5, 5.6)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>NOT THIS</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>SELECT the version, compare in code, then UPDATE. Another save can land between the read and the write.</div>
      </Box>
    </>
  );
};

/* 6. Replay: A succeeds, B receives a conflict */
const Retest: React.FC<SceneProps> = ({t}) => {
  const pA = ep(t, 1.0, 1.8);
  const pB = ep(t, 3.4, 4.2);
  const srvTitle = t < 1.8 ? ORIG.title : A_TITLE;
  const srvV = t < 1.8 ? 'v1' : 'v2';
  const conflict = t >= 4.2;
  return (
    <>
      <Pane x={AX} y={TAB.y} w={PW} h={TAB.h} label="Client A" sub="expectedVersion: 1" title={{text: A_TITLE, color: C.cyan}} body={{text: ORIG.body}} version={t >= 1.8 ? 'now v2' : 'based on v1'} accent={C.cyan} />
      <Pane x={BX} y={TAB.y} w={PW} h={TAB.h} label="Client B" sub="expectedVersion: 1" title={{text: ORIG.title}} body={{text: B_BODY, color: C.amber}} version="based on v1" accent={conflict ? C.red : C.amber} />
      <Svg>
        <Arrow x1={620} y1={TAB.y + TAB.h} x2={620} y2={SRV.y} p={pA} color={C.green} label="200 · version 2" />
        <Arrow x1={1300} y1={TAB.y + TAB.h} x2={1300} y2={SRV.y} p={pB} color={C.red} label="409 · current v2" />
      </Svg>
      <Pane x={SRV.x} y={SRV.y} w={SRV.w} h={SRV.h} label="Server document" sub={conflict ? 'B rejected · nothing overwritten' : 'conditional update'} title={{text: srvTitle, color: t >= 1.8 ? C.green : C.text}} body={{text: ORIG.body}} version={srvV} accent={conflict ? C.green : C.line} vColor={C.green} />
      <Note t={t} a={5.0}>Observed from the local fixture: A → 200, newVersion 2. B → 409, currentVersion 2. Server final: version 2.</Note>
    </>
  );
};

/* 7. Show both versions without an automatic merge */
const Compare: React.FC<SceneProps> = ({t}) => {
  const choice = step(t, 6.2);
  return (
    <>
      <Overline y={110} color={C.amber}>B's conflict view</Overline>
      <Pane x={AX} y={170} w={800} h={250} label="Server now" sub="what A saved" title={{text: A_TITLE, color: C.green}} body={{text: ORIG.body}} version="v2" accent={C.green} vColor={C.green} o={ep(t, 0.3, 0.9)} />
      <Pane x={AX + 832} y={170} w={800} h={250} label="Your unsaved text" sub="kept exactly as typed" title={{text: ORIG.title, color: C.amber}} body={{text: B_BODY, color: C.cyan}} version="based on v1" accent={C.amber} vColor={C.amber} o={ep(t, 1.1, 1.7)} />
      <Pill x={AX} y={470} text="Take theirs" color={C.cyanDim} size={28} o={ep(t, 2.6, 3.1)} />
      <Pill x={AX + 240} y={470} text="Keep mine" color={C.cyanDim} size={28} o={ep(t, 2.8, 3.3)} />
      <Pill x={AX + 450} y={470} text="Write a merge" color={C.cyan} size={28} o={ep(t, 3.0, 3.5)} />
      <Txt x={AX + 720} y={466} w={920} size={28} weight={700} color={C.amber} o={ep(t, 3.6, 4.2)}>Nothing is merged or retried automatically.</Txt>
      <Box x={M} y={580} w={W - 2 * M} h={230} accent={C.cyan} fill="transparent" o={ep(t, 4.8, 5.4)}>
        <div style={{fontSize: 24, color: C.cyan, fontWeight: 700, letterSpacing: 2}}>ONE PERSON'S DECISION, THEN A NEW SAVE</div>
        <div style={{fontSize: 28, color: C.text, marginTop: 10, lineHeight: 1.4, opacity: choice ? 1 : 0.5}}>
          Merged text: title from A, body from B. Saved with expectedVersion 2.
        </div>
        <div style={{fontSize: 28, color: C.green, marginTop: 10, fontWeight: 700, opacity: ep(t, 6.8, 7.4)}}>200 OK · version 3</div>
      </Box>
      <Note t={t} a={8.0}>Observed from the local fixture: B kept 1 PUT request, no retry. Merged save → 200, version 3. The merge was chosen by a person.</Note>
    </>
  );
};

/* 8. Limits: 409 vs 503, the race, and what this is not */
const Limits: React.FC<SceneProps> = ({t}) => (
  <>
    <Box x={M} y={150} w={548} h={330} title="409 · version conflict" sub="No row matched id AND version." accent={C.amber} o={ep(t, 0.3, 0.8)} titleSize={30}>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, fontFamily: F.sans}}>Body carries the current server version for comparison. Unsaved text stays on the client.</div>
    </Box>
    <Box x={M + 590} y={150} w={548} h={330} title="503 · database busy" sub="A lock, not a conflict." accent={C.red} o={ep(t, 1.4, 1.9)} titleSize={30}>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, fontFamily: F.sans}}>Retryable. Observed: lock held by a second connection → 503, server version still 1, text kept.</div>
    </Box>
    <Box x={M + 1180} y={150} w={548} h={330} title="Same version, two saves" sub="Barrier test" accent={C.green} o={ep(t, 2.6, 3.1)} titleSize={30}>
      <div style={{fontSize: 24, color: C.dim, marginTop: 14, lineHeight: 1.35, fontFamily: F.sans}}>Both in flight together: one 200, one 409. Server version 2. Never two accepted.</div>
    </Box>
    <Txt x={M} y={540} w={W - 2 * M} size={30} weight={700} color={C.text} o={ep(t, 4.2, 4.8)}>Conflict detection. Not real-time collaboration. Not a CRDT, not operational transformation.</Txt>
    <Txt x={M} y={640} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 5.6, 6.2)}>Authorization stays separate: session and document membership are checked first (401 / 404), then the version.</Txt>
    <Txt x={M} y={760} w={W - 2 * M} size={26} color={C.mute} o={ep(t, 6.8, 7.4)}>A database failure other than a lock returns 500 and is never reported as a conflict either.</Txt>
  </>
);

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={340} align="center" size={84} o={ep(t, 0.2, 0.9)}>Before saving, check<br />what you are replacing.</Big>
    <Txt x={M} y={640} w={W - 2 * M} align="center" size={28} color={C.dim} o={ep(t, 1.6, 2.2)}>One document, one conditional update, one local fixture. A conflict is detected, never merged for you.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {lost: Lost, rewind: Rewind, diverge: Diverge, flawed: Flawed, fix: Fix, retest: Retest, compare: Compare, limits: Limits, end: End};
