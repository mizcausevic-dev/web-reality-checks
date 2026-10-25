import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Pill, Svg, Txt, Overline} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Values below are copied from fixtures/ep24-shared-cache-leak/evidence.json (demo.mjs). */

/** Illustrative client pane: one independent cookie jar. Plain Box chrome, not a real browser or product. */
const Pane: React.FC<{x: number; y: number; w: number; h: number; jar: string; greeting: string; sub: string; accent: string; o?: number; wrong?: boolean; glow?: boolean}> = ({x, y, w, h, jar, greeting, sub, accent, o = 1, wrong = false, glow = false}) => (
  <Box x={x} y={y} w={w} h={h} accent={accent} o={o} fill="#14171e" glow={glow}>
    <div style={{fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: C.mute, fontWeight: 700}}>Illustrative client · {jar}</div>
    <div style={{marginTop: 14, color: C.mute, fontSize: 22, fontFamily: F.mono}}>app.example.test/dashboard</div>
    <div style={{marginTop: 34, fontSize: 52, fontWeight: 800, color: wrong ? C.red : C.text, lineHeight: 1.1}}>{greeting}</div>
    <div style={{marginTop: 18, fontSize: 26, color: C.dim}}>{sub}</div>
  </Box>
);

/** The shared in-process cache slot. Its content is the payload that filled it. */
const Slot: React.FC<{x: number; y: number; w: number; h: number; content: string | null; accent?: string; o?: number; glow?: boolean; label?: string; struck?: boolean; dashed?: boolean}> = ({x, y, w, h, content, accent = C.amber, o = 1, glow = false, label = "key: '/dashboard'", struck = false, dashed = false}) => (
  <Box x={x} y={y} w={w} h={h} title="Shared cache slot" sub={label} accent={accent} o={o} glow={glow} dashed={dashed} fill="#1a1710">
    {content !== null && <div style={{marginTop: 14, fontSize: 28, fontWeight: 700, color: struck ? C.mute : C.text, textDecoration: struck ? 'line-through' : 'none'}}>{content}</div>}
    {content === null && <div style={{marginTop: 14, fontSize: 28, fontWeight: 700, color: C.green}}>empty · 0 entries</div>}
  </Box>
);

/* 1. Outcome first: Alice's greeting, then Bob sees Alice's name */
const Fail: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.red}>Two sessions · one page</Overline>
    <Pane x={M} y={170} w={800} h={330} jar="Alice's cookie jar" greeting="Welcome back, Alice" sub="signed in as Alice" accent={C.cyan} o={ep(t, 0.3, 0.9)} />
    <Pane x={M + 928} y={170} w={800} h={330} jar="Bob's cookie jar" greeting="Welcome back, Alice" sub="signed in as Bob" accent={C.red} wrong glow={t > 3.4} o={ep(t, 2.4, 3)} />
    <Txt x={M} y={520} w={800} size={28} color={C.cyan} o={ep(t, 1.0, 1.5)}>First request. Correct.</Txt>
    <Txt x={M + 928} y={520} w={800} size={28} color={C.red} weight={700} o={ep(t, 3.4, 4)}>Bob's session is correct. The page is not.</Txt>
    <Box x={M} y={640} w={W - 2 * M} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 4.6, 5.2)}>
      <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATELY FLAWED APPLICATION CACHE</div>
      <div style={{fontSize: 26, color: C.text, marginTop: 6}}>An in-process cache inside this local fixture. Synthetic users Alice and Bob. Not a CDN, and not a real incident.</div>
    </Box>
    <Txt x={M} y={820} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 5.4, 6)}>Observed from the local fixture: Bob's GET /dashboard → 200, viewer u_alice</Txt>
  </>
);

/* 2. Inspect Bob's response */
const Leak: React.FC<SceneProps> = ({t}) => {
  const shown = prog(t, 0.4, 3.2);
  return (
    <>
      <Overline y={110} color={C.red}>Bob's response, inspected</Overline>
      <Code x={M} y={170} w={1000} title="GET /dashboard · Bob's cookie jar" size={26} hi={[2, 3]} hiColor={C.red} o={ep(t, 0.2, 0.7)} lines={[
        '200   x-app-cache: HIT',
        'whoami            "u_bob"',
        'viewer.id         "u_alice"',
        'viewer.email      "alice@example.test"',
        'renderSeq         1',
      ].map((l, i) => (shown * 5 > i ? l : ''))} />
      <Box x={M + 1060} y={170} w={668} h={150} title="Alice's request" sub="MISS · rendered, renderSeq 1" accent={C.cyan} o={ep(t, 1.4, 1.9)} titleSize={28} />
      <Box x={M + 1060} y={350} w={668} h={150} title="Bob's request" sub="HIT · nothing rendered for Bob, renderSeq 1" accent={C.red} glow={t > 3} o={ep(t, 2.4, 2.9)} titleSize={28} />
      <Txt x={M} y={520} w={1000} size={32} weight={700} color={C.red} o={ep(t, 3.6, 4.2)}>Same render number: Bob received Alice's payload byte for byte.</Txt>
      <Box x={M} y={640} w={W - 2 * M} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 5, 5.6)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>SCOPE</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>A deliberately flawed application cache in a local fixture. This is not a claim that CDNs or browsers cache authenticated pages by default.</div>
      </Box>
      <Txt x={M} y={820} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 6, 6.6)}>Observed from the local fixture: cache stats after Bob's request: reads 2 · hits 1 · writes 1</Txt>
    </>
  );
};

/* 3. Reveal the path-only key: two identity badges, one slot */
const KeyScene: React.FC<SceneProps> = ({t}) => {
  const pa = ep(t, 1.2, 2.0);
  const pb = ep(t, 3.4, 4.2);
  return (
    <>
      <Overline y={110} color={C.amber}>The cache key</Overline>
      <Code x={M} y={170} w={900} size={26} hi={[0]} hiColor={C.amber} o={ep(t, 0.2, 0.7)} title="server.mjs · the flaw" lines={[
        'const key = url.pathname;',
        '// => "/dashboard"',
        'cache.get(key) // no user in the key',
      ]} />
      <Badge x={M} y={500} label="identity" value="Alice · u_alice" color={C.cyan} big o={ep(t, 0.8, 1.2)} />
      <Badge x={M} y={680} label="identity" value="Bob · u_bob" color={C.violet} big o={ep(t, 3.0, 3.4)} />
      <Slot x={1020} y={440} w={804} h={200} content={pa > 0.9 ? "payload: Alice's page" : '(empty)'} glow={pb > 0.9} accent={pb > 0.9 ? C.red : C.amber} o={ep(t, 0.6, 1.1)} />
      <Svg>
        <Arrow x1={560} y1={535} x2={1010} y2={520} p={pa} color={C.cyan} label="fills the slot" labelDy={-14} />
        <Arrow x1={520} y1={715} x2={1010} y2={580} p={pb} color={C.red} label="same key, same slot" labelDy={26} />
        <Arrow x1={1420} y1={650} x2={1420} y2={760} p={ep(t, 4.6, 5.2)} color={C.red} label="Bob gets Alice's page" />
      </Svg>
      <Txt x={M} y={780} w={W - 2 * M - 600} size={30} weight={700} color={C.text} o={ep(t, 5.4, 6)}>Identity changes the response. It was not in the key.</Txt>
    </>
  );
};

/* 4. Authentication was correct; the payload was not. Header ignored by custom code. */
const Auth: React.FC<SceneProps> = ({t}) => {
  const a1 = ep(t, 0.8, 1.4);
  const a2 = ep(t, 1.8, 2.4);
  const q = ep(t, 4.6, 5.2);
  return (
    <>
      <Overline y={110} color={C.amber}>Authenticated is not the same as correct</Overline>
      <Box x={M} y={180} w={480} h={150} title="1 · Authenticate" sub="session → u_bob" accent={C.green} titleSize={30} o={ep(t, 0.2, 0.7)} />
      <Box x={720} y={180} w={480} h={150} title="2 · Cache lookup" sub="key '/dashboard' → HIT" accent={C.amber} titleSize={30} o={ep(t, 1.4, 1.9)} />
      <Box x={1344} y={180} w={480} h={150} title="3 · Response" sub="payload: Alice's page" accent={C.red} titleSize={30} glow={a2 > 0.9} o={ep(t, 2.4, 2.9)} />
      <Svg>
        <Arrow x1={M + 484} y1={255} x2={716} y2={255} p={a1} color={C.cyan} />
        <Arrow x1={1204} y1={255} x2={1340} y2={255} p={a2} color={C.red} />
      </Svg>
      <Txt x={M} y={350} w={480} size={26} color={C.green} o={ep(t, 1.2, 1.7)}>✓ Bob is Bob</Txt>
      <Txt x={720} y={350} w={480} size={26} color={C.amber} o={ep(t, 2.2, 2.7)}>Chosen without asking whose it is</Txt>
      <Code x={M} y={470} w={900} title="Flawed server + the right header" size={26} hi={[0]} hiColor={C.green} o={ep(t, 3.4, 3.9)} lines={[
        'cache-control: private, no-store',
        'x-app-cache: HIT',
        'viewer.id: "u_alice"',
      ]} />
      <Box x={1020} y={470} w={804} h={160} accent={C.red} fill="#1c1012" o={q}>
        <div style={{fontSize: 28, color: C.text, fontWeight: 700}}>The in-process cache never reads Cache-Control.</div>
        <div style={{fontSize: 26, color: C.dim, marginTop: 8}}>A header only helps code that honours it. This server still leaked.</div>
      </Box>
      <Txt x={M} y={700} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6, 6.6)}>Observed from the local fixture: flawed-with-header variant → Bob: HIT, viewer u_alice, cache-control private, no-store</Txt>
    </>
  );
};

/* 5. The repair: bypass the shared slot, purge the old entry */
const Fix: React.FC<SceneProps> = ({t}) => {
  const bypass = ep(t, 1.0, 1.6);
  const purged = step(t, 6.0);
  const c = (k: number): 'pass' | 'pending' => (t > k ? 'pass' : 'pending');
  return (
    <>
      <Overline y={110} color={C.green}>The repair</Overline>
      <Slot x={M} y={170} w={860} h={170} content={purged ? null : "payload: Alice's page"} struck={t > 5 && !purged} accent={purged ? C.green : bypass > 0.5 ? C.mute : C.amber} dashed={bypass > 0.5} label={purged ? 'purged · reads/writes bypassed' : "key: '/dashboard'"} />
      <Badge x={M} y={470} label="identity" value="Alice" color={C.cyan} big />
      <Badge x={M} y={620} label="identity" value="Bob" color={C.violet} big />
      <Box x={480} y={440} w={476} h={250} title="Personalised route" sub="authenticate → authorise → render for this user" accent={C.green} glow o={ep(t, 0.4, 0.9)} />
      <Pill x={500} y={600} text="private, no-store" color={C.green} mono o={ep(t, 3.4, 3.9)} />
      <Svg>
        <Arrow x1={330} y1={500} x2={476} y2={540} p={ep(t, 0.6, 1.2)} color={C.cyan} />
        <Arrow x1={300} y1={650} x2={476} y2={600} p={ep(t, 0.8, 1.4)} color={C.violet} />
        <Arrow x1={718} y1={436} x2={718} y2={346} p={bypass} color={C.mute} dashed label="bypassed" />
        {bypass > 0.9 && <text x={730} y={410} fill={C.red} fontFamily={F.sans} fontSize={44} fontWeight={800}>✕</text>}
      </Svg>
      <Gate x={1000} y={170} w={824} title="Repair checklist" accent={C.green} checks={[
        {label: 'Shared slot bypassed for this page', state: c(1.6)},
        {label: 'Every request authenticated and authorised', state: c(2.8)},
        {label: 'Cache-Control: private, no-store', state: c(3.8)},
        {label: 'Old entry purged: present → absent', state: c(6.2)},
      ]} />
      <Txt x={1000} y={560} w={824} size={26} color={C.dim} o={ep(t, 6.4, 7)}>Observed from the local fixture: purge() → true · slot entries 1 → 0 · purgeLog: /dashboard (populated by u_alice)</Txt>
      <Txt x={1000} y={680} w={824} size={26} color={C.amber} o={ep(t, 7.6, 8.2)}>Bypass alone leaves the old entry in memory. The explicit purge removes it.</Txt>
    </>
  );
};

/* 6. Retest with independent sessions */
const rows = [
  {who: "Alice's jar", color: C.cyan, name: 'u_alice', seq: 2},
  {who: "Bob's jar", color: C.violet, name: 'u_bob', seq: 3},
  {who: "Alice's jar", color: C.cyan, name: 'u_alice', seq: 4},
  {who: "Bob's jar", color: C.violet, name: 'u_bob', seq: 5},
];
const Retest: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={110} color={C.green}>Retest · independent cookie jars</Overline>
    <Txt x={M} y={170} w={300} size={24} color={C.mute} weight={700}>CLIENT</Txt>
    <Txt x={M + 330} y={170} w={160} size={24} color={C.mute} weight={700}>STATUS</Txt>
    <Txt x={M + 500} y={170} w={260} size={24} color={C.mute} weight={700}>X-APP-CACHE</Txt>
    <Txt x={M + 780} y={170} w={340} size={24} color={C.mute} weight={700}>VIEWER</Txt>
    <Txt x={M + 1130} y={170} w={260} size={24} color={C.mute} weight={700}>RENDER</Txt>
    {rows.map((r, i) => {
      const o = ep(t, 0.8 + i * 1.2, 1.3 + i * 1.2);
      const y = 215 + i * 92;
      return (
        <React.Fragment key={i}>
          <Badge x={M} y={y} label="jar" value={r.who.replace(' jar', '')} color={r.color} o={o} />
          <Txt x={M + 330} y={y} w={160} size={30} weight={700} color={C.green} o={o}>200</Txt>
          <Pill x={M + 500} y={y} text="BYPASS" color={C.green} mono o={o} />
          <Txt x={M + 780} y={y} w={340} size={30} weight={700} mono color={C.text} o={o}>{r.name}</Txt>
          <Txt x={M + 1130} y={y} w={260} size={30} weight={700} mono color={C.text} o={o}>#{r.seq}</Txt>
        </React.Fragment>
      );
    })}
    <Box x={M + 1400} y={200} w={328} h={380} title="Shared slot" sub="not read, not written" accent={C.mute} dashed fill="transparent" o={ep(t, 0.4, 0.9)}>
      <div style={{marginTop: 18, fontSize: 26, color: C.dim, lineHeight: 1.5}}>reads 2 → 2{'\n'}writes 1 → 1{'\n'}entries 0</div>
    </Box>
    <Txt x={M} y={620} w={W - 2 * M} size={30} weight={700} o={ep(t, 5.4, 6)}>Two Client objects with separate cookie jars. There is no real browser here.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.2, 6.8)}>Observed from the local fixture: four requests, four distinct render numbers, shared-cache counters unchanged during the retest.</Txt>
  </>
);

/* 7. Verify isolation and state the limits */
const Verify: React.FC<SceneProps> = ({t}) => {
  const limit = (i: number, x: number, y: number, title: string, body: string) => (
    <Box key={i} x={x} y={y} w={840} h={140} accent={C.amber} dashed fill="transparent" o={ep(t, 2.2 + i * 1.0, 2.8 + i * 1.0)}>
      <div style={{fontSize: 28, color: C.amber, fontWeight: 700}}>{title}</div>
      <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.3}}>{body}</div>
    </Box>
  );
  return (
    <>
      <Overline y={110} color={C.green}>Verified · each user sees only their own page</Overline>
      <Pane x={M} y={165} w={840} h={250} jar="Alice's cookie jar" greeting="Welcome back, Alice" sub="u_alice · render #4 · BYPASS" accent={C.green} o={ep(t, 0.3, 0.9)} />
      <Pane x={M + 888} y={165} w={840} h={250} jar="Bob's cookie jar" greeting="Welcome back, Bob" sub="u_bob · render #5 · BYPASS" accent={C.green} o={ep(t, 1.0, 1.6)} />
      {limit(0, M, 440, 'Already delivered stays delivered', "Bob's earlier leaked response cannot be retracted by new headers or a purge.")}
      {limit(1, M + 888, 440, 'Vary: Cookie is not a universal fix', 'This fixture does not rely on Vary. Not a general recommendation.')}
      {limit(2, M, 600, 'no-store has limits', 'It does not claim to remove every earlier copy, log or historical artifact.')}
      {limit(3, M + 888, 600, 'Identity-aware caching is a separate design', 'Authorisation, partitioning, invalidation and data classification.')}
      <Txt x={M} y={790} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 6.4, 7)}>Executed: node --test fixtures/ep24-shared-cache-leak/test.mjs → # tests 18 · # pass 18 · # fail 0</Txt>
    </>
  );
};

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={340} align="center" size={80} o={ep(t, 0.2, 0.9)}>A cache key defines which requests<br />you treat as equivalent.</Big>
    <Txt x={M} y={640} w={W - 2 * M} align="center" size={26} color={C.mute} o={ep(t, 1.6, 2.2)}>Local fixture · synthetic users · loopback only · a deliberately flawed in-process cache, not a CDN incident.</Txt>
  </>
);

export const scenes = {fail: Fail, leak: Leak, key: KeyScene, auth: Auth, fix: Fix, retest: Retest, verify: Verify, end: End};
