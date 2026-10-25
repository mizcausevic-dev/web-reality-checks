import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Overline, Pill, Stages, Svg, Token, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Data shown on screen. Every number comes from fixtures/ep19-initial-html/evidence.json. */
const EV = {
  rawCsr: {bytes: 727, words: 0, wordsTotal: 198, h1: 0, h2: 0, paras: 0, links: 0, scripts: 1},
  rawSsg: {bytes: 2520, words: 198, wordsTotal: 198, h1: 1, h2: 4, paras: 6, links: 3, scripts: 0},
  domJs: {paras: 6, h2: 4, links: 3},
};
const ART = {
  title: 'Field Notes on the Lantern Harbour Tide Clock',
  lede: 'A synthetic article about a fictional harbour clock…',
  sections: [
    {h: 'What the clock measures', p: 'The Lantern Harbour tide clock does not measure time. It measures the interval between successive high waters…'},
    {h: 'How the mechanism stays in step', p: 'A brass cam, cut to the local tidal curve, corrects the hand twice a day…'},
    {h: 'Reading the clock from the quay', p: 'From the quay you see one hand and one dial. From inside the tower you see the cam…'},
  ],
  links: ['/guides/tide-tables/', '/guides/clock-maintenance/', '/about/'],
};

/* Illustrative browser page. Plain Box chrome, never a real product's UI. */
const Page: React.FC<{x: number; y: number; w: number; h: number; route: string; label: string; accent?: string; fill: number; o?: number; jsOff?: boolean}> = ({x, y, w, h, route, label, accent = C.line, fill, o = 1, jsOff = false}) => {
  // fill: 0 = shell only ("Loading article…"); 1 = full article. Intermediate values reveal sections in order.
  const showLede = fill > 0.05;
  const nSec = Math.min(3, Math.floor(fill * 4));
  const showLinks = fill >= 1;
  return (
    <Box x={x} y={y} w={w} h={h} accent={accent} o={o} fill="#14171e">
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14}}>
        {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.5}} />)}
        <div style={{marginLeft: 12, color: C.mute, fontSize: 22, fontFamily: F.mono}}>http://127.0.0.1{route}</div>
        <div style={{marginLeft: 'auto', color: accent === C.line ? C.dim : accent, fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase'}}>{label}</div>
        {jsOff && <div style={{marginLeft: 14, padding: '2px 10px', border: `2px solid ${C.amber}`, borderRadius: 6, color: C.amber, fontSize: 18, fontWeight: 700}}>JS OFF</div>}
      </div>
      <div style={{borderTop: `1px solid ${C.line}`, paddingTop: 14, fontFamily: F.sans, color: C.text, overflow: 'hidden', maxHeight: h - 90}}>
        {fill <= 0 ? (
          <div style={{color: C.mute, fontSize: 28, marginTop: 20}}>Loading article…</div>
        ) : (
          <>
            <div style={{fontSize: 30, fontWeight: 800, lineHeight: 1.15}}>{ART.title}</div>
            {showLede && <div style={{fontSize: 24, color: C.dim, marginTop: 6}}>{ART.lede}</div>}
            {ART.sections.slice(0, nSec).map((s) => (
              <div key={s.h} style={{marginTop: 12}}>
                <div style={{fontSize: 26, fontWeight: 700}}>{s.h}</div>
                <div style={{fontSize: 24, color: C.dim, lineHeight: 1.3, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: h < 600 ? 1 : 2, WebkitBoxOrient: 'vertical'}}>{s.p}</div>
              </div>
            ))}
            {showLinks && (
              <div style={{marginTop: 12}}>
                <div style={{fontSize: 26, fontWeight: 700}}>Related</div>
                {ART.links.map((l) => <div key={l} style={{fontSize: 24, color: C.cyan, textDecoration: 'underline', fontFamily: F.mono, marginTop: 2}}>{l}</div>)}
              </div>
            )}
          </>
        )}
      </div>
    </Box>
  );
};

const PX = {left: M, right: 1004, w: 820, y: 170, h: 690};

/* 1. Both pages look identical after loading */
const Identical: React.FC<SceneProps> = ({t}) => {
  const f = ep(t, 0.4, 1.6);
  return (
    <>
      <Overline y={110}>Two pages, after loading · illustrative browser</Overline>
      <Page x={PX.left} y={PX.y} w={PX.w} h={PX.h} route="/csr/article/" label="page A" fill={f} o={ep(t, 0, 0.5)} />
      <Page x={PX.right} y={PX.y} w={PX.w} h={PX.h} route="/ssg/article/" label="page B" fill={f} o={ep(t, 0.15, 0.65)} />
      <Pill x={820} y={118} text="same title · same headings · same links" color={C.cyanDim} o={ep(t, 2.2, 2.8)} size={22} />
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 3.2, 3.8)}>Observed from the local fixture: both DOMs with JavaScript on contain {EV.domJs.paras} of 6 paragraphs, {EV.domJs.h2} h2 headings, {EV.domJs.links} links.</Txt>
    </>
  );
};

/* 2. Raw response HTML side by side */
const Raw: React.FC<SceneProps> = ({t}) => {
  const n = (v: number) => Math.round(v * prog(t, 2.2, 3.6));
  const col = (x: number, title: string, accent: string, lines: string[], hi: number[], e: typeof EV.rawCsr, o: number) => (
    <>
      <Code x={x} y={170} w={820} title={title} size={26} hi={hi} hiColor={accent} lines={lines} o={o} />
      <Badge x={x} y={480} label="bytes" value={String(n(e.bytes))} color={accent} o={ep(t, 2, 2.4)} />
      <Badge x={x + 200} y={480} label="article words" value={`${n(e.words)} / ${e.wordsTotal}`} color={accent} o={ep(t, 2.1, 2.5)} />
      <Badge x={x} y={550} label="h1" value={String(n(e.h1))} color={accent} o={ep(t, 2.2, 2.6)} />
      <Badge x={x + 130} y={550} label="h2" value={String(n(e.h2))} color={accent} o={ep(t, 2.3, 2.7)} />
      <Badge x={x + 260} y={550} label="paragraphs" value={String(n(e.paras))} color={accent} o={ep(t, 2.4, 2.8)} />
      <Badge x={x + 500} y={550} label="a href" value={String(n(e.links))} color={accent} o={ep(t, 2.5, 2.9)} />
      <Badge x={x} y={620} label="script tags" value={String(e.scripts)} color={e.scripts ? C.amber : C.green} o={ep(t, 2.6, 3)} />
    </>
  );
  return (
    <>
      <Overline y={110}>Raw response HTML · plain HTTP GET, before any script</Overline>
      {col(PX.left, 'GET /csr/article/ · client-rendered · 200', C.amber, [
        '<title>Field Notes on the Lantern…</title>',
        '<meta name="description" content="…">',
        '<meta name="robots" content="noindex">',
        '<main id="app">',
        '  <p class="shell">Loading article…</p>',
        '<script src="/csr/app.js"></script>',
      ], [4, 5], EV.rawCsr, ep(t, 0.2, 0.7))}
      {col(PX.right, 'GET /ssg/article/ · statically generated · 200', C.green, [
        '<title>Field Notes on the Lantern…</title>',
        '<meta name="description" content="…">',
        '<meta name="robots" content="noindex">',
        '<main id="app"><article>',
        '<h1>Field Notes on the Lantern…</h1>',
        '<h2>What the clock measures</h2> …',
      ], [4, 5], EV.rawSsg, ep(t, 0.5, 1.0))}
      <Box x={M} y={700} w={W - 2 * M} h={110} accent={C.cyan} dashed fill="transparent" o={ep(t, 3.8, 4.4)}>
        <div style={{fontSize: 26, color: C.text}}>Identical <span style={{color: C.cyan}}>title</span>, <span style={{color: C.cyan}}>description</span> and <span style={{color: C.cyan}}>robots</span> metadata on both. Different amounts of article in the bytes.</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 6}}>Observed from the local fixture: raw CSR {EV.rawCsr.words}/{EV.rawCsr.wordsTotal} article words, {EV.rawCsr.bytes} bytes · raw SSG {EV.rawSsg.words}/{EV.rawSsg.wordsTotal}, {EV.rawSsg.bytes} bytes.</div>
      </Box>
    </>
  );
};

/* 3. JavaScript populates the client-rendered article */
const Populate: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.6, 1.5); // browser -> server: GET /csr/app.js
  const p2 = ep(t, 1.7, 2.6); // app.js -> GET /article.json
  const p3 = ep(t, 2.8, 3.6); // JSON back
  const fill = ep(t, 3.8, 5.2);
  const BX = 1180, BW = 644, SX = 1180;
  return (
    <>
      <Overline y={110}>Client-rendered page · what the script does</Overline>
      <Page x={M} y={PX.y} w={1000} h={PX.h} route="/csr/article/" label="client-rendered" accent={fill > 0.95 ? C.green : C.amber} fill={fill} />
      <Box x={BX} y={170} w={BW} h={120} title="Server (loopback)" sub="static files, exact paths, no fallback" accent={C.line} titleSize={28} />
      <Box x={BX} y={340} w={BW} h={120} title="app.js" sub="fetch('/article.json') → root.innerHTML = …" accent={p1 > 0.95 ? C.cyan : C.mute} titleSize={28} />
      <Box x={SX} y={510} w={BW} h={120} title="article.json" sub="title, sections, links · 2062 bytes" accent={p3 > 0.95 ? C.cyan : C.mute} titleSize={28} />
      <Svg>
        <Arrow x1={1100} y1={240} x2={BX} y2={240} p={p1} label="GET /csr/app.js" labelDy={-12} />
        <Arrow x1={BX + 320} y1={290} x2={BX + 320} y2={340} p={p1} />
        <Arrow x1={BX + 320} y1={460} x2={BX + 320} y2={510} p={p2} label="GET /article.json" />
        <Arrow x1={BX} y1={570} x2={1100} y2={570} p={p3} color={C.green} label="200 · JSON" labelDy={-12} />
      </Svg>
      <Token x1={1100} y1={560} x2={M + 400} y2={PX.y + 300} p={fill} text="innerHTML ← renderArticle(json)" color={C.cyan} o={fill > 0 && fill < 1 ? 1 : 0} />
      <Badge x={BX} y={680} label="DOM after JS" value={`${EV.domJs.paras} paragraphs · ${EV.domJs.links} links`} color={C.green} o={ep(t, 5.2, 5.7)} />
      <Txt x={BX} y={750} w={BW} size={24} color={C.dim} o={ep(t, 5.4, 6)}>Observed from the local fixture: headless Chrome, JS on → data-rendered-by="client-js"; same {EV.domJs.h2} h2 and {EV.domJs.links} hrefs as the generated page.</Txt>
      <Txt x={BX} y={840} w={BW} size={24} color={C.amber} o={ep(t, 6, 6.5)}>The article now exists, but only in the browser's result.</Txt>
    </>
  );
};

/* 4. JavaScript disabled, clean context */
const NoJs: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.amber}>JavaScript disabled · fresh profile · headless Chrome</Overline>
    <Page x={PX.left} y={PX.y} w={PX.w} h={560} route="/csr/article/" label="client-rendered" accent={C.amber} fill={0} jsOff o={ep(t, 0.2, 0.7)} />
    <Page x={PX.right} y={PX.y} w={PX.w} h={560} route="/ssg/article/" label="statically generated" accent={C.green} fill={ep(t, 0.8, 1.8)} jsOff o={ep(t, 0.4, 0.9)} />
    <Badge x={PX.left} y={PX.y + 572} label="DOM, JS off" value="0 / 6 paragraphs · 0 links" color={C.amber} o={ep(t, 1.6, 2)} />
    <Badge x={PX.right} y={PX.y + 572} label="DOM, JS off" value="6 / 6 paragraphs · 3 links" color={C.green} o={ep(t, 2, 2.4)} />
    <Box x={M} y={808} w={W - 2 * M} h={108} accent={C.amber} fill="#1c1710" o={ep(t, 3, 3.6)}>
      <div style={{fontSize: 28, color: C.amber, fontWeight: 700}}>Not a Googlebot simulator. Google can execute JavaScript.</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 6}}>This shows what each response contains on its own; it says nothing about how any crawler renders, indexes or ranks the page.</div>
    </Box>
  </>
);

/* 5. Article already present in the generated response */
const Present: React.FC<SceneProps> = ({t}) => {
  const s = (k: number) => (step(t, 1 + k * 0.5) ? 'pass' : 'pending') as 'pass' | 'pending';
  return (
    <>
      <Overline y={110} color={C.green}>Generated response · the bytes the server sent</Overline>
      <Code x={M} y={170} w={1000} title="captures/raw-ssg.html · excerpt" size={26} hi={[1, 2, 4, 5]} hiColor={C.green} lines={[
        '<main id="app"><article>',
        '<h1>Field Notes on the Lantern…</h1>',
        '<h2>What the clock measures</h2>',
        '<p>The Lantern Harbour tide clock…</p>',
        '<a href="/guides/tide-tables/">Harbour…</a>',
        '</article></main></body>   <!-- no <script> -->',
      ]} />
      <Gate x={M + 1060} y={170} w={668} title="In the initial response" accent={C.green} checks={[
        {label: 'Article text (198 / 198 words)', state: s(0)},
        {label: 'Headings (1 h1, 4 h2)', state: s(1)},
        {label: 'Links with href (3)', state: s(2)},
        {label: 'Title · description · robots', state: s(3)},
      ]} />
      <Badge x={M} y={500} label="script tags" value="0" color={C.green} big o={ep(t, 3.2, 3.6)} />
      <Badge x={M + 300} y={500} label="hydration" value="none, not needed" color={C.green} big o={ep(t, 3.5, 3.9)} />
      <Txt x={M} y={600} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 4.2, 4.8)}>No script puts the article there. No hydration either: a static article with no client interactivity has nothing to re-attach, so none is shipped.</Txt>
      <Box x={M} y={720} w={W - 2 * M} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 5, 5.6)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE ROBOTS DECISION</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6}}>Both variants carry &lt;meta name="robots" content="noindex"&gt;: a local teaching fixture should never enter an index if deployed by mistake. Documented in the fixture README.</div>
      </Box>
    </>
  );
};

/* 6. Crawl / render / index / rank — conceptual */
const Pipeline: React.FC<SceneProps> = ({t}) => {
  const active = Math.min(3, Math.floor(prog(t, 0.6, 3.4) * 4));
  const desc = ['fetches the URL and reads the response', 'may execute scripts and build a DOM', 'decides what, if anything, to store', 'decides what to show for a query'];
  return (
    <>
      <Overline y={110} color={C.amber}>Four separate things a search engine does · conceptual</Overline>
      <Stages x={M} y={200} w={W - 2 * M} stages={['Crawl', 'Render', 'Index', 'Rank']} active={active} />
      {desc.map((d, i) => <Txt key={d} x={M + i * ((W - 2 * M) / 4)} y={290} w={(W - 2 * M) / 4 - 24} size={24} color={C.dim} o={step(t, 0.6 + i * 0.7)}>{d}</Txt>)}
      <Svg>
        <rect x={M - 10} y={180} width={(W - 2 * M) / 4 + 8} height={200} rx={14} fill="none" stroke={C.cyan} strokeWidth={3} strokeDasharray="12 10" opacity={ep(t, 3.8, 4.3)} />
        <rect x={M + (W - 2 * M) / 4 - 2} y={180} width={(W - 2 * M) / 8} height={200} rx={14} fill="none" stroke={C.cyan} strokeWidth={3} strokeDasharray="12 10" opacity={ep(t, 4.1, 4.6)} />
      </Svg>
      <Txt x={M} y={400} w={W - 2 * M} size={28} color={C.cyan} o={ep(t, 4.3, 4.9)}>This fixture touches crawl (a raw fetch) and one slice of render (one headless Chrome). Nothing here measures indexing or ranking.</Txt>
      <Gate x={M} y={490} w={800} title="Not established by this test" accent={C.amber} o={ep(t, 5, 5.6)} checks={[
        {label: 'Static HTML does not guarantee indexing', state: 'pass'},
        {label: 'Static HTML does not guarantee rankings', state: 'pass'},
        {label: 'Server-rendered pages can still be rendered', state: 'pass'},
      ]} />
      <Gate x={M + 860} y={490} w={868} title="Not claimed here" accent={C.amber} o={ep(t, 5.4, 6)} checks={[
        {label: 'No rendering delays or indexing timelines', state: 'pass'},
        {label: 'No Search Console results', state: 'pass'},
        {label: 'Not how every crawler handles this page', state: 'pass'},
      ]} />
    </>
  );
};

/* 7. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={320} align="center" size={80} o={ep(t, 0.2, 0.9)}>Initial HTML and the eventual DOM<br />are different artifacts.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Inspect both, and know which one you are looking at.</Txt>
    <Txt x={M} y={690} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, synthetic article, loopback only, one headless Chrome. Not a crawler test; not an indexing or ranking claim.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {identical: Identical, raw: Raw, populate: Populate, nojs: NoJs, present: Present, pipeline: Pipeline, end: End};
