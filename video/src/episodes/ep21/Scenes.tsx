import React from 'react';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep21-deletion-copies/evidence.json.
   The "browser" is SIMULATED CLIENT STATE (fixtures/ep21-deletion-copies/client.mjs), not a real browser. */
const EV = {
  id: 'c_1003',
  primaryGetAfterDelete: 404,
  cachedSearch: 'c_1003, c_1004', // GET /search?q=harbourline after flawed delete, X-Cache: hit
  outboxEventsFlawed: 0,
  attempts: 2,
  maxAttempts: 3,
  newContactId: 'c_1006',
  refreshed: 'c_1004',
};

/* ---- four "homes" of one contact, laid out as a row of cards ---- */
const CW = 408;
const GAP = (W - 2 * M - 4 * CW) / 3;
const CY = 190;
const CH = 300;
const cardX = (i: number) => M + i * (CW + GAP);

type Home = 'primary' | 'index' | 'cache' | 'browser';
const HOMES: {k: Home; title: string; sub: string; rows: string[]}[] = [
  {k: 'primary', title: 'Primary table', sub: 'contacts', rows: ['c_1003', 'Dana Whitlock', 'Harbourline Studio']},
  {k: 'index', title: 'Search index', sub: 'denormalised copy', rows: ['c_1003', 'Dana Whitlock', 'Harbourline Studio']},
  {k: 'cache', title: 'Response cache', sub: 'in-process, by query', rows: ['q=harbourline', '→ c_1003, c_1004', 'q=dana → c_1003']},
  {k: 'browser', title: 'Open browser', sub: 'simulated client state', rows: ['Dana Whitlock', 'Ravi Menon', '(fetched earlier)']},
];
const homeIdx = (k: Home) => HOMES.findIndex((h) => h.k === k);

/** rowO: 1 = copy present, 0 = copy removed. status: pill under the rows. */
const Store: React.FC<{k: Home; o?: number; rowO?: number; status?: {text: string; color: string}; accent?: string; glow?: boolean; y?: number; removedText?: string}> = ({k, o = 1, rowO = 1, status, accent = C.line, glow = false, y = CY, removedText = 'removed'}) => {
  const i = homeIdx(k);
  const h = HOMES[i];
  const x = cardX(i);
  const removedO = 1 - rowO;
  return (
    <>
      <Box x={x} y={y} w={CW} h={CH} title={h.title} sub={h.sub} accent={accent} glow={glow} o={o}>
        <div style={{position: 'absolute', left: 24, top: 118, width: CW - 48, fontFamily: F.mono, fontSize: 24, lineHeight: 1.45, color: C.text, opacity: rowO, whiteSpace: 'pre'}}>
          {h.rows.map((r, j) => <div key={j} style={{color: j === 0 && k !== 'cache' && k !== 'browser' ? C.cyan : C.text}}>{r}</div>)}
        </div>
        <div style={{position: 'absolute', left: 24, top: 118, width: CW - 48, height: 104, border: `2px dashed ${C.mute}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 26, color: C.mute, opacity: removedO}}>{removedText}</div>
      </Box>
      {status && <Pill x={x + 24} y={y + CH - 62} text={status.text} color={status.color} o={o} size={24} />}
    </>
  );
};

/* ---- illustrative browser window (plain chrome, no real UI) ---- */
const BrowserWin: React.FC<{x: number; y: number; w: number; h: number; query: string; rows: {name: string; flag?: string; color?: string}[]; o?: number; accent?: string; badge?: {text: string; color: string}}> = ({x, y, w, h, query, rows, o = 1, accent = C.line, badge}) => (
  <Box x={x} y={y} w={w} h={h} accent={accent} fill="#14171e" o={o}>
    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
      {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
      <div style={{marginLeft: 12, color: C.mute, fontSize: 24, fontFamily: F.mono}}>illustrative · search “{query}”</div>
    </div>
    {rows.map((r, i) => (
      <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', marginBottom: 10, borderRadius: 10, background: '#1a1e27', border: `2px solid ${r.color ?? 'transparent'}`, fontSize: 28, color: C.text, fontFamily: F.sans}}>
        <span>{r.name}</span>
        <span style={{fontSize: 24, color: r.color ?? C.mute, fontFamily: F.mono}}>{r.flag ?? ''}</span>
      </div>
    ))}
    {badge && <div style={{position: 'absolute', right: 24, bottom: 18, fontSize: 24, fontWeight: 700, color: badge.color, fontFamily: F.sans}}>{badge.text}</div>}
  </Box>
);

/* 1. Outcome: lookup says gone, search and the open page do not */
const Fail: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={120} size={64} o={ep(t, 0, 0.6)}>Deleted. Still showing up.</Big>
    <Box x={M} y={250} w={820} h={150} title={`GET /contacts/${EV.id}`} sub={`${EV.primaryGetAfterDelete} Not Found: the primary record is gone`} accent={C.green} o={ep(t, 0.8, 1.3)} />
    <Box x={M + 908} y={250} w={820} h={150} title="GET /search?q=harbourline" sub={`200 OK · still lists ${EV.id}`} accent={C.red} glow={t > 2.6} o={ep(t, 2, 2.5)} />
    <BrowserWin x={M} y={440} w={820} h={380} query="harbourline" accent={C.red} o={ep(t, 3.4, 3.9)} rows={[{name: 'Dana Whitlock', flag: EV.id, color: C.red}, {name: 'Ravi Menon', flag: 'c_1004'}]} badge={{text: 'already open', color: C.amber}} />
    <Txt x={M + 908} y={470} w={820} size={30} color={C.amber} o={ep(t, 4.4, 5)}>{'Same ID, different answers.\nWhich copy did the delete actually reach?'}</Txt>
    <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5.4, 6)}>Observed from the local fixture (flawed variant): primary lookup 404; search still returns {EV.id}. The open page is simulated client state.</Txt>
  </>
);

/* 2. Reveal the primary record and its derived representations */
const Copies: React.FC<SceneProps> = ({t}) => {
  const cx = (i: number) => cardX(i) + CW / 2;
  const busY = 560;
  return (
    <>
      <Overline y={110}>One contact · four homes</Overline>
      {HOMES.map((h, i) => <Store key={h.k} k={h.k} o={ep(t, 0.4 + 0.5 * i, 0.9 + 0.5 * i)} accent={i === 0 ? C.cyan : C.line} />)}
      <Svg>
        <line x1={cx(0)} y1={CY + CH} x2={cx(0)} y2={busY} stroke={C.cyanDim} strokeWidth={4} opacity={ep(t, 2.8, 3.2)} />
        <line x1={cx(0)} y1={busY} x2={cx(0) + (cx(3) - cx(0)) * ep(t, 3, 4)} y2={busY} stroke={C.cyanDim} strokeWidth={4} />
        {[1, 2, 3].map((i) => (
          <Arrow key={i} x1={cx(i)} y1={busY} x2={cx(i)} y2={CY + CH + 6} p={ep(t, 3.4 + 0.3 * i, 3.9 + 0.3 * i)} color={C.cyan} width={4} />
        ))}
      </Svg>
      <Txt x={cx(0) + 20} y={busY + 18} size={26} color={C.dim} o={ep(t, 3.6, 4.2)}>copied from the primary record</Txt>
      <Badge x={M} y={700} label="stable contact ID" value={EV.id} color={C.cyan} big o={ep(t, 4.6, 5.2)} />
      <Txt x={M + 640} y={705} w={1090} size={30} color={C.text} o={ep(t, 5.2, 5.8)}>The ID is the thread through every copy, and is never reused after deletion.</Txt>
    </>
  );
};

/* 3. Flawed deletion stops after the primary database operation */
const FlawedStale: React.FC<SceneProps> = ({t}) => {
  const gone = ep(t, 1.6, 2.2);
  return (
    <>
      <Overline y={110} color={C.red}>Flawed delete · primary row only</Overline>
      <Store k="primary" rowO={1 - gone} status={{text: gone > 0.9 ? 'removed' : 'present', color: gone > 0.9 ? C.green : C.cyan}} accent={gone > 0.9 ? C.green : C.cyan} />
      <Store k="index" status={t > 3 ? {text: 'still returns it', color: C.red} : undefined} accent={t > 3 ? C.red : C.line} glow={t > 3} />
      <Store k="cache" status={t > 3.6 ? {text: 'still returns it', color: C.red} : undefined} accent={t > 3.6 ? C.red : C.line} glow={t > 3.6} />
      <Store k="browser" status={t > 4.2 ? {text: 'still shows it', color: C.red} : undefined} accent={t > 4.2 ? C.red : C.line} glow={t > 4.2} />
      <Code x={M} y={540} w={760} title="the whole flawed delete" size={26} hi={[0, 1]} hiColor={C.red} lines={['DELETE FROM contacts', `  WHERE id = 1003;`, '-- nothing else runs', '-- no event recorded']} o={ep(t, 0.4, 1)} />
      <Badge x={M + 820} y={560} label="outbox events" value={String(EV.outboxEventsFlawed)} color={C.red} big o={step(t, 2.6)} />
      <Txt x={M + 820} y={650} w={900} size={28} color={C.amber} o={ep(t, 5, 5.6)}>Nothing knows the other copies exist, so nothing can clean them.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 5.8, 6.4)}>Observed from the local fixture: after DELETE /vuln/contacts/{EV.id}, cached search → {EV.cachedSearch}; search index row present; outbox events {EV.outboxEventsFlawed}.</Txt>
    </>
  );
};

/* 4. Transactional outbox + cleanup worker */
const FixOutbox: React.FC<SceneProps> = ({t}) => {
  const commit = ep(t, 2.4, 3);
  const toWorker = ep(t, 4.2, 5);
  const step1 = ep(t, 5.4, 6.2);
  const step2 = ep(t, 6.8, 7.6);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · outbox + cleanup worker</Overline>
      <Box x={M} y={170} w={700} h={270} title="One database transaction" accent={C.cyan} o={ep(t, 0.2, 0.7)}>
        <div style={{position: 'absolute', left: 24, top: 78, width: 640}}>
          <div style={{padding: '10px 16px', borderRadius: 10, background: '#1a1e27', fontFamily: F.mono, fontSize: 26, color: C.text, marginBottom: 14, opacity: ep(t, 0.8, 1.3)}}>DELETE contacts c_1003</div>
          <div style={{padding: '10px 16px', borderRadius: 10, background: '#1a1e27', fontFamily: F.mono, fontSize: 26, color: C.text, opacity: ep(t, 1.4, 1.9)}}>INSERT outbox contact.deleted</div>
        </div>
        <Pill x={24} y={206} text="COMMIT together" color={C.green} o={commit} size={26} />
      </Box>
      <Box x={M} y={510} w={700} h={190} title="outbox table" accent={C.amber} o={ep(t, 2.6, 3.2)}>
        <div style={{position: 'absolute', left: 24, top: 80, fontFamily: F.mono, fontSize: 26, color: C.text}}>#1 contact.deleted c_1003</div>
        <Pill x={24} y={122} text={step2 > 0.9 ? 'processed' : 'pending'} color={step2 > 0.9 ? C.green : C.amber} size={24} />
      </Box>
      <Box x={1000} y={330} w={340} h={170} title="Cleanup worker" sub="local · in-process" accent={C.cyan} glow={toWorker > 0.5} o={ep(t, 3.8, 4.3)} />
      <Box x={1480} y={190} w={344} h={150} title="1 · Search index" sub="delete row c_1003" accent={step1 > 0.9 ? C.green : C.line} o={ep(t, 4.8, 5.3)} />
      <Box x={1480} y={450} w={344} h={150} title="2 · Response cache" sub="clear the whole cache" accent={step2 > 0.9 ? C.green : C.line} o={ep(t, 4.8, 5.3)} />
      <Svg>
        <Arrow x1={446} y1={444} x2={446} y2={506} p={ep(t, 2.4, 3)} color={C.cyan} />
        <Arrow x1={M + 700} y1={595} x2={1000} y2={430} p={toWorker} color={C.cyan} label="read event" labelDy={-26} />
        <Arrow x1={1340} y1={380} x2={1480} y2={270} p={step1} color={C.cyan} />
        <Arrow x1={1340} y1={450} x2={1480} y2={520} p={step2} color={C.cyan} />
      </Svg>
      <Txt x={M} y={730} w={W - 2 * M} size={30} color={C.green} o={ep(t, 8, 8.6)}>Marked processed only after both steps succeed.</Txt>
      <Box x={M} y={790} w={W - 2 * M} h={100} accent={C.amber} dashed fill="transparent" o={ep(t, 9.2, 9.8)}>
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.amber, fontWeight: 700, letterSpacing: 2}}>LIMIT  </span>The outbox records cleanup intent. It does not make every destination update atomically.</div>
      </Box>
    </>
  );
};

/* 5. Cache invalidation fails once after the index entry was removed */
const PartialFail: React.FC<SceneProps> = ({t}) => {
  const idxGone = ep(t, 1.2, 1.8);
  const failed = t > 3;
  return (
    <>
      <Overline y={110} color={C.amber}>Deliberate fault · attempt 1</Overline>
      <Store k="primary" rowO={0} status={{text: 'removed', color: C.green}} accent={C.green} />
      <Store k="index" rowO={1 - idxGone} status={idxGone > 0.9 ? {text: 'removed', color: C.green} : undefined} accent={idxGone > 0.9 ? C.green : C.line} />
      <Store k="cache" status={failed ? {text: 'invalidation failed', color: C.red} : undefined} accent={failed ? C.red : C.line} glow={failed} />
      <Store k="browser" accent={C.line} />
      <Log x={M} y={540} w={900} title="worker · attempt 1" size={26} shown={prog(t, 1, 4.6) * 4} lines={[
        {t: 'search_index  ✓ removed', c: C.green},
        {t: 'cache         ✕ injected failure', c: C.red},
        {t: 'event #1      pending · attempts 1', c: C.amber},
        {t: 'not marked processed', c: C.amber},
      ]} />
      <Box x={M + 960} y={540} w={768} h={170} title="GET /search?q=harbourline" sub={`200 · X-Cache: hit · still lists ${EV.id}`} accent={C.red} o={ep(t, 5, 5.6)} titleSize={28} />
      <Txt x={M + 960} y={730} w={768} size={26} color={C.amber} o={ep(t, 6, 6.6)}>A directory cache can expose stale data until invalidation succeeds.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Observed from the local fixture: attempt 1 → status pending, stepsDone [search_index]; uncached query “ravi” served from the clean index.</Txt>
    </>
  );
};

/* 6. Retry, replay, and the exhausted-retries failed state */
const Retry: React.FC<SceneProps> = ({t}) => {
  const done = step(t, 3.4);
  return (
    <>
      <Overline y={110} color={C.green}>Retry · replay · exhausted</Overline>
      <Log x={M} y={170} w={900} title="worker log · local fixture" size={26} shown={prog(t, 0.6, 5.6) * 6} lines={[
        {t: 'attempt 1   index ✓   cache ✕', c: C.amber},
        {t: 'attempt 2   cache ✓', c: C.green},
        {t: `event #1 → processed (attempts ${EV.attempts})`, c: C.green},
        {t: 'replay ×2   state unchanged', c: C.cyan},
        {t: `new contact → ${EV.newContactId}`, c: C.cyan},
        {t: `${EV.id} is not reused`, c: C.cyan},
      ]} />
      <Box x={M + 960} y={170} w={768} h={170} title="Event #1" accent={done ? C.green : C.amber} o={ep(t, 0.4, 0.9)}>
        <Pill x={24} y={84} text={done ? `processed · attempts ${EV.attempts}` : 'pending · attempts 1'} color={done ? C.green : C.amber} size={26} />
      </Box>
      <Box x={M + 960} y={380} w={768} h={260} title="If retries run out" accent={C.red} o={ep(t, 6.4, 7)} fill="#1c1012">
        <div style={{fontSize: 28, color: C.text, lineHeight: 1.4, marginTop: 8}}>
          After {EV.maxAttempts} failed attempts the event becomes <span style={{color: C.red, fontWeight: 800}}>failed</span> and raises an alert. It is never silently marked complete, and stale data stays visible.
        </div>
      </Box>
      <Txt x={M} y={600} w={900} size={28} color={C.dim} o={ep(t, 7.4, 8)}>Each cleanup step is idempotent, so a redelivered event is safe: deleting what is already gone changes nothing.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 8.4, 9)}>Observed from the local fixture: exhausted run → status failed, attempts {EV.maxAttempts}, 1 alert. The alert is an in-process record, not a real paging system.</Txt>
    </>
  );
};

/* 7. Verify both backend representations are clean */
const Verify: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.green}>Verify · backend copies</Overline>
    <Store k="primary" rowO={0} status={{text: 'GET → 404', color: C.green}} accent={C.green} o={ep(t, 0.2, 0.7)} />
    <Store k="index" rowO={0} status={{text: '0 rows', color: C.green}} accent={C.green} o={ep(t, 0.6, 1.1)} />
    <Store k="cache" rowO={0} status={{text: '0 entries', color: C.green}} accent={C.green} o={ep(t, 1, 1.5)} removedText="cache cleared" />
    <Store k="browser" accent={C.amber} status={{text: 'not backend', color: C.amber}} o={ep(t, 1.4, 1.9)} />
    <Log x={M} y={560} w={1100} title="Observed · fixture snapshot" size={26} shown={prog(t, 2.4, 5) * 4} lines={[
      {t: 'primary: c_1003 absent', c: C.green},
      {t: 'search_index: c_1003 absent', c: C.green},
      {t: 'cache: no entry mentions c_1003', c: C.green},
      {t: 'event #1: processed', c: C.green},
    ]} />
    <Txt x={M + 1160} y={570} w={568} size={28} color={C.amber} o={ep(t, 5.4, 6)}>The browser card is not checked here: the server cannot see it.</Txt>
  </>
);

/* 8. Refresh the browser; stale display disappears */
const Refresh: React.FC<SceneProps> = ({t}) => {
  const pressed = ep(t, 2.6, 3.2);
  const fresh = t > 3.6;
  return (
    <>
      <Overline y={110} color={C.cyan}>Simulated client state · refresh</Overline>
      <BrowserWin x={M} y={170} w={820} h={380} query="harbourline"
        accent={fresh ? C.green : C.amber}
        rows={fresh ? [{name: 'Ravi Menon', flag: EV.refreshed}] : [{name: 'Dana Whitlock', flag: EV.id, color: C.amber}, {name: 'Ravi Menon', flag: 'c_1004'}]}
        badge={fresh ? {text: 're-fetched', color: C.green} : {text: 'fetched earlier · stale', color: C.amber}} />
      <Txt x={M} y={580} w={820} size={28} color={fresh ? C.green : C.amber} o={ep(t, 0.6, 1.2)}>{fresh ? 'After refresh the list matches the backend.' : 'Backend is clean, yet this page still shows her.'}</Txt>
      <Pill x={M + 920} y={190} text="Refresh" color={C.cyan} size={30} o={ep(t, 2, 2.5)} />
      <Svg>
        <Arrow x1={M + 1000} y1={290} x2={M + 1000} y2={370} p={pressed} color={C.cyan} label="GET /search?q=harbourline" labelDy={-14} />
      </Svg>
      <Box x={M + 920} y={380} w={808} h={140} title={`200 · X-Cache: miss · [${EV.refreshed}]`} sub="re-queried from the clean index" accent={C.green} o={ep(t, 3.4, 4)} titleSize={28} />
      <Box x={M + 920} y={560} w={808} h={170} accent={C.amber} dashed fill="transparent" o={ep(t, 5.2, 5.8)}>
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.amber, fontWeight: 700}}>While cleanup was still failing</span>, the same refresh returned X-Cache: hit and still listed {EV.id}.</div>
      </Box>
      <Txt x={M} y={850} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.2, 6.8)}>Observed from the simulated client: refresh → [{EV.refreshed}] for “harbourline”, [] for “dana”. Data already downloaded is not recalled.</Txt>
    </>
  );
};

/* 9. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={260} align="center" size={78} o={ep(t, 0.2, 0.9)}>Deletion is a workflow when data<br />has more than one home.</Big>
    <Txt x={M} y={560} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>This is not a privacy-erasure system. Backups, logs, exports and third-party copies are outside the fixture, and deleting cannot retrieve what a client already downloaded.</Txt>
    <Txt x={M} y={720} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.6, 3.2)}>Local fixture, synthetic contacts, loopback only. The browser is simulated client state.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, copies: Copies, flawed_stale: FlawedStale, fix_outbox: FixOutbox, partial_fail: PartialFail, retry: Retry, verify: Verify, refresh: Refresh, end: End};
