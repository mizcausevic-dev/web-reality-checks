import React from 'react';
import {Arrow, Big, Box, Code, Log, Overline, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, eio, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------
 * Values below are copied from fixtures/ep26-n-plus-one/evidence.json
 * (produced by `node demo.mjs`) and fixtures/ep26-n-plus-one/seed-data.json.
 * AUTHOR_IDS[i] = author_id of article i+1; the flawed endpoint looks authors up in exactly this order.
 * ------------------------------------------------------------------ */
const EV = {
  articles: 100,
  authors: 12,
  flawedSelects: 101, // evidence.flawed.selectCount
  correctedSelects: 1, // evidence.corrected.selectCount
  authorLookups: 100, // evidence.flawed.authorLookups
  repeated: 88, // evidence.flawed.lookupsThatRepeatedAnEarlierAuthor
  topAuthor: 1, // evidence.flawed.mostRepeatedAuthor.id
  topHandle: 'apetrov',
  topName: 'Ana Petrov',
  topLookups: 14,
  controlFlawed: 102, // evidence.knownPositiveControl.flawedWithHiddenQuery
  bodyBytes: 13544,
  sha: '612b997f8017', // first 12 hex of the shared SHA-256 of both bodies
  testsPass: 15,
  testsFail: 0,
};
const AUTHOR_IDS = [1, 4, 5, 6, 3, 12, 7, 11, 6, 10, 4, 3, 1, 5, 5, 12, 12, 8, 4, 10, 11, 3, 4, 1, 3, 4, 6, 7, 1, 3, 7, 1, 8, 6, 2, 1, 1, 1, 1, 8, 9, 1, 7, 5, 2, 6, 6, 1, 2, 6, 11, 12, 7, 7, 5, 4, 2, 8, 1, 3, 1, 3, 6, 5, 2, 5, 2, 6, 9, 9, 3, 2, 10, 9, 8, 2, 5, 8, 7, 9, 4, 5, 8, 3, 4, 9, 5, 8, 7, 12, 7, 8, 3, 9, 5, 3, 1, 5, 3, 12];
// true when this lookup is the first time its author is fetched
const FIRST_SEEN = AUTHOR_IDS.map((a, i) => AUTHOR_IDS.indexOf(a) === i);
const SAMPLE = [
  {id: 1, title: 'Routing: a worked example (1)', handle: 'apetrov'},
  {id: 2, title: 'Search: a worked example (2)', handle: 'dmarlowe'},
  {id: 3, title: 'Indexes: a field guide (3)', handle: 'evarga'},
];

/* ---------- query tree geometry ---------- */
const ROOT = {x: 770, y: 130, w: 380, h: 96};
const LIST = {x: 770, y: 270, w: 380, h: 96};
const ORIGIN = {x: 960, y: LIST.y + LIST.h}; // fan starts under the list-query node
const LEAF = AUTHOR_IDS.map((_, i) => ({cx: 200 + (i % 20) * 80, cy: 580 + Math.floor(i / 20) * 64}));
const HALF = 22;

type TreeProps = {
  /** number of author-lookup leaves revealed so far (0..100, fractional allowed) */
  reveal: number;
  /** 0 = full tree, 1 = every leaf has merged back into the single query */
  collapse?: number;
  color: (i: number) => string;
  listTitle: string;
  listSub: string;
  listAccent?: string;
  rootSub: string;
  o?: number;
};

const Tree: React.FC<TreeProps> = ({reveal, collapse = 0, color, listTitle, listSub, listAccent = C.cyan, rootSub, o = 1}) => {
  const cE = collapse; // already eased by the caller
  return (
    <>
      <Svg>
        <g opacity={o}>
          <Arrow x1={960} y1={ROOT.y + ROOT.h} x2={960} y2={LIST.y} color={C.cyan} width={4} />
          {LEAF.map((p, i) => {
            const a = Math.max(0, Math.min(1, reveal - i));
            if (a <= 0) return null;
            const cx = p.cx + (ORIGIN.x - p.cx) * cE;
            const cy = p.cy + (ORIGIN.y + 10 - p.cy) * cE;
            const col = color(i);
            const vis = a * (1 - prog(cE, 0.75, 1));
            return (
              <g key={i} opacity={vis}>
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={cx} y2={cy - HALF * (1 - cE)} stroke={col} strokeWidth={1.6} opacity={0.55} />
                <rect x={cx - HALF * (1 - cE * 0.6)} y={cy - HALF * (1 - cE * 0.6)} width={HALF * 2 * (1 - cE * 0.6)} height={HALF * 2 * (1 - cE * 0.6)} rx={8} fill={`${col}33`} stroke={col} strokeWidth={3} />
              </g>
            );
          })}
        </g>
      </Svg>
      <Box x={ROOT.x} y={ROOT.y} w={ROOT.w} h={ROOT.h} title="1 HTTP request" sub={rootSub} accent={C.cyan} o={o} titleSize={30} />
      <Box x={LIST.x} y={LIST.y} w={LIST.w} h={LIST.h} title={listTitle} sub={listSub} accent={listAccent} o={o} titleSize={30} glow />
    </>
  );
};

const count = (reveal: number) => 1 + Math.floor(Math.min(EV.authorLookups, reveal));

/* 1. fail: one request fans out into 101 SELECTs */
const Fail: React.FC<SceneProps> = ({t}) => {
  const reveal = prog(t, 1.8, 6.2) * EV.authorLookups;
  const n = t < 1.4 ? 0 : count(reveal);
  return (
    <>
      <Tree reveal={reveal} color={() => C.amber} listTitle="1 list SELECT" listSub="articles ORDER BY id" rootSub="GET /vuln/articles" o={ep(t, 0, 0.5)} />
      <Readout x={1330} y={128} w={420} label="SELECTs counted" value={n} color={n >= EV.flawedSelects ? C.red : C.amber} o={ep(t, 1.2, 1.7)} />
      <Txt x={M} y={872} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Observed from the local fixture: scope "article-list" counted {EV.flawedSelects} SELECTs for one request.</Txt>
    </>
  );
};

/* 2. split: the list query versus the per-article lookups */
const Split: React.FC<SceneProps> = ({t}) => {
  const listOn = ep(t, 0.4, 0.9);
  const loopOn = ep(t, 2.4, 3.0);
  return (
    <>
      <Tree reveal={EV.authorLookups} color={(i) => (t > 2.4 ? C.amber : C.mute)} listTitle="1 list SELECT" listSub="articles ORDER BY id" rootSub="GET /vuln/articles" listAccent={C.cyan} />
      <Code x={M} y={120} w={640} size={26} title="flawed handler" hi={[0]} hiColor={C.cyan} o={ep(t, 0.2, 0.7)} lines={[
        "rows = all('… FROM articles')",
        'for (const a of rows) {',
        "  get('… FROM authors WHERE id = ?')",
        '}',
      ]} />
      <Box x={M} y={350} w={560} h={92} title="1 × list SELECT" sub="all 100 articles at once" accent={C.cyan} o={listOn} titleSize={30} />
      <Box x={1210} y={128} w={614} h={96} title="100 × author SELECT" sub="one per article, inside the loop" accent={C.amber} o={loopOn} titleSize={30} />
      <Txt x={1210} y={250} w={614} align="center" size={64} weight={800} color={C.red} o={ep(t, 4.2, 4.8)}>1 + 100 = {EV.flawedSelects}</Txt>
      <Txt x={M} y={872} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.8, 6.4)}>Each amber square is one SELECT … FROM authors WHERE id = ? in the logged scope.</Txt>
    </>
  );
};

/* 3. repeat: the same author fetched again and again */
const Repeat: React.FC<SceneProps> = ({t}) => {
  const phaseTop = t > 1.2 && t < 5.2; // highlight the most-repeated author
  const phaseSeen = t >= 5.2; // first-time versus repeated lookups
  const color = (i: number) => {
    if (phaseSeen) return FIRST_SEEN[i] ? C.green : C.amber;
    if (phaseTop) return AUTHOR_IDS[i] === EV.topAuthor ? C.amber : C.mute;
    return C.mute;
  };
  return (
    <>
      <Tree reveal={EV.authorLookups} color={color} listTitle="1 list SELECT" listSub="articles ORDER BY id" rootSub="GET /vuln/articles" />
      <Box x={M} y={128} w={620} h={150} title={`${EV.topName} · ${EV.topHandle}`} sub={`author id ${EV.topAuthor}: fetched ${EV.topLookups} times`} accent={C.amber} o={ep(t, 1.4, 1.9) * (1 - prog(t, 5.0, 5.4))} titleSize={30} />
      <Box x={M} y={128} w={620} h={150} title={`${EV.authors} authors, ${EV.authorLookups} lookups`} sub={`${EV.repeated} lookups re-fetch an author already fetched`} accent={C.amber} o={ep(t, 5.4, 5.9)} titleSize={30} />
      <Txt x={1210} y={128} w={614} size={28} color={C.green} o={ep(t, 5.8, 6.3)}>■ first lookup of an author ({EV.authors})</Txt>
      <Txt x={1210} y={176} w={614} size={28} color={C.amber} o={ep(t, 6.0, 6.5)}>■ repeat of an author already seen ({EV.repeated})</Txt>
      <Txt x={M} y={872} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>Observed from the local fixture: counted from the scoped SQL log (evidence.json).</Txt>
    </>
  );
};

/* 4. fix: replace the loop with one joined SELECT; the tree collapses */
const Fix: React.FC<SceneProps> = ({t}) => {
  const collapse = eio(t, 3.0, 5.4);
  const remaining = 1 + Math.round(EV.authorLookups * (1 - collapse));
  const done = collapse >= 1;
  return (
    <>
      <Tree reveal={EV.authorLookups} collapse={collapse} color={() => C.amber} listTitle={done ? '1 joined SELECT' : '1 list SELECT'} listSub={done ? 'articles + authors, ORDER BY a.id' : 'articles ORDER BY id'} listAccent={done ? C.green : C.cyan} rootSub={done ? 'GET /articles' : 'GET /vuln/articles'} />
      <Code x={M} y={120} w={640} size={26} title="corrected query" hi={[2, 3]} hiColor={C.green} o={ep(t, 0.3, 0.9)} lines={[
        'SELECT a.id, a.title, a.published_on,',
        '       u.id, u.name, u.handle',
        'FROM articles a',
        'JOIN authors u ON u.id = a.author_id',
        'ORDER BY a.id',
      ]} />
      <Readout x={1330} y={128} w={420} label="SELECTs counted" value={remaining} color={done ? C.green : C.amber} o={ep(t, 0.6, 1.1)} />
      <Txt x={M} y={872} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.6, 6.2)}>Same fields, same ORDER BY, no loop. The author lookups collapse into the JOIN.</Txt>
    </>
  );
};

/* 5. equal: both endpoints return identical results */
const Result: React.FC<{x: number; title: string; sub: string; accent: string; o: number}> = ({x, title, sub, accent, o}) => (
  <Box x={x} y={150} w={780} h={470} title={title} sub={sub} accent={accent} o={o} titleSize={30}>
    <div style={{marginTop: 16, fontFamily: F.mono, fontSize: 24, color: C.text, lineHeight: 1.7}}>
      {SAMPLE.map((a) => (
        <div key={a.id} style={{whiteSpace: 'nowrap'}}>{`${String(a.id).padStart(3, ' ')} ${a.title.length > 31 ? a.title.slice(0, 30) + '…' : a.title}`}<span style={{color: C.cyan}}>{` @${a.handle}`}</span></div>
      ))}
      <div style={{color: C.mute}}>{'  … 97 more, ORDER BY id'}</div>
      <div style={{marginTop: 14, color: C.dim}}>{`${EV.bodyBytes} bytes`}</div>
      <div style={{color: C.dim}}>{`sha256 ${EV.sha}…`}</div>
    </div>
  </Box>
);
const Equal: React.FC<SceneProps> = ({t}) => {
  const eq = ep(t, 3.2, 3.9);
  return (
    <>
      <Overline y={110} color={C.green}>Same request, two implementations</Overline>
      <Result x={M} title="GET /vuln/articles" sub={`${EV.flawedSelects} SELECTs`} accent={C.amber} o={ep(t, 0.3, 0.8)} />
      <Result x={W - M - 780} title="GET /articles" sub={`${EV.correctedSelects} SELECT`} accent={C.green} o={ep(t, 1.2, 1.7)} />
      <Txt x={M + 780} y={330} w={W - 2 * M - 1560} align="center" size={72} weight={800} color={C.green} o={eq}>=</Txt>
      <Box x={M + 200} y={680} w={W - 2 * M - 400} h={120} title="Byte-equal JSON · 100 articles · ordered by id" sub="same keys: id, title, published_on, author{id, name, handle}" accent={C.green} o={ep(t, 4.2, 4.8)} titleSize={30} />
      <Txt x={M} y={872} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.2, 5.8)}>Observed from the local fixture: both response bodies hashed to the same SHA-256.</Txt>
    </>
  );
};

/* 6. retest: compare the counters, plus the known-positive control */
const Retest: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ node --test fixtures/ep26-n-plus-one/test.mjs', c: C.mute},
    {t: '✓ flawed endpoint: exactly 101 SELECTs', c: C.green},
    {t: '✓ corrected endpoint: exactly 1 SELECT', c: C.green},
    {t: '✓ byte-equal JSON, ORDER BY id', c: C.green},
    {t: '✓ control: hidden extra query → 102', c: C.amber},
    {t: `# pass ${EV.testsPass}  fail ${EV.testsFail}`, c: C.text},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Retest · counts from the instrumentation</Overline>
      <Readout x={260} y={160} w={440} label="flawed · SELECTs" value={EV.flawedSelects} color={C.red} o={ep(t, 0.3, 0.9)} />
      <Readout x={1220} y={160} w={440} label="corrected · SELECTs" value={EV.correctedSelects} color={C.green} o={ep(t, 1.3, 1.9)} />
      <Box x={M} y={380} w={820} h={130} title={`Control: hidden extra query → ${EV.controlFlawed}`} sub="the counter notices a single added statement" accent={C.amber} o={ep(t, 2.6, 3.2)} titleSize={30} />
      <Box x={W - M - 820} y={380} w={820} h={130} title="Not in the count" sub="setup · sign-in · BEGIN / COMMIT" accent={C.mute} dashed o={ep(t, 3.8, 4.4)} titleSize={30} />
      <Log x={M} y={550} w={W - 2 * M} lines={lines} shown={prog(t, 4.8, 7.2) * lines.length} size={26} title="Executed · node:test output" />
    </>
  );
};

/* 7. end card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={290} align="center" size={78} o={ep(t, 0.2, 0.9)}>The interface made one request.<br />The backend multiplied the work.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.8, 2.4)}>We counted statements. We did not measure speed, and fewer queries do not always mean a faster page.</Txt>
    <Txt x={M} y={690} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.8, 3.4)}>One N+1 pattern in a local fixture, synthetic data, loopback only. Not every form of it.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, split: Split, repeat: Repeat, fix: Fix, equal: Equal, retest: Retest, end: End};
