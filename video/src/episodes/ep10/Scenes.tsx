import React from 'react';
import {interpolate} from 'remotion';
import {Arrow, Badge, Big, Box, Code, Log, Overline, Pill, Readout, Stages, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Evidence constants — copied from fixtures/ep10-dns-caches/evidence.json
   (node demo.mjs). Every number shown on screen derives from these.     */
/* ------------------------------------------------------------------ */
const DOMAIN = 'example.test';
const OK_IP = '192.0.2.10';
const BAD_IP = '192.0.2.20';
const TTL = 60;

type Res = 'A' | 'B';
const AUTH: {t: number; value: string}[] = [
  {t: 0, value: OK_IP},
  {t: 10, value: BAD_IP},
  {t: 30, value: OK_IP},
];
const WRITES: {t: number; resolver: Res; answer: string; ttl: number; expiresAt: number}[] = [
  {t: 0, resolver: 'A', answer: OK_IP, ttl: 60, expiresAt: 60},
  {t: 15, resolver: 'B', answer: BAD_IP, ttl: 60, expiresAt: 75},
  {t: 60, resolver: 'A', answer: OK_IP, ttl: 60, expiresAt: 120},
  {t: 75, resolver: 'B', answer: OK_IP, ttl: 60, expiresAt: 135},
];
type Ev = {t: number; client: 'clientA' | 'clientB'; resolver: Res; cacheHit: boolean; answer: string; ttlRemaining: number; connect: 'ok' | 'failed'};
const EVENTS: Ev[] = [
  {t: 0, client: 'clientA', resolver: 'A', cacheHit: false, answer: OK_IP, ttlRemaining: 60, connect: 'ok'},
  {t: 15, client: 'clientB', resolver: 'B', cacheHit: false, answer: BAD_IP, ttlRemaining: 60, connect: 'failed'},
  {t: 20, client: 'clientA', resolver: 'A', cacheHit: true, answer: OK_IP, ttlRemaining: 40, connect: 'ok'},
  {t: 20, client: 'clientB', resolver: 'B', cacheHit: true, answer: BAD_IP, ttlRemaining: 55, connect: 'failed'},
  {t: 30, client: 'clientA', resolver: 'A', cacheHit: true, answer: OK_IP, ttlRemaining: 30, connect: 'ok'},
  {t: 30, client: 'clientB', resolver: 'B', cacheHit: true, answer: BAD_IP, ttlRemaining: 45, connect: 'failed'},
  {t: 60, client: 'clientA', resolver: 'A', cacheHit: false, answer: OK_IP, ttlRemaining: 60, connect: 'ok'},
  {t: 60, client: 'clientB', resolver: 'B', cacheHit: true, answer: BAD_IP, ttlRemaining: 15, connect: 'failed'},
  {t: 75, client: 'clientB', resolver: 'B', cacheHit: false, answer: OK_IP, ttlRemaining: 60, connect: 'ok'},
  {t: 75, client: 'clientA', resolver: 'A', cacheHit: true, answer: OK_IP, ttlRemaining: 45, connect: 'ok'},
];
const SUMMARY = {totalQueries: 10, failedConnections: 4, resolutionFailures: 0, resolverARecoveredAt: 60, resolverBRecoveredAt: 75};

/* ---------- derive board state from the constants at virtual time tv ---------- */
const authAt = (tv: number) => [...AUTH].reverse().find((a) => a.t <= tv)?.value ?? OK_IP;
const cacheAt = (r: Res, tv: number) => {
  const w = [...WRITES].reverse().find((x) => x.resolver === r && x.t <= tv);
  if (!w) return {status: 'empty' as const, answer: null as string | null, remaining: 0, cachedAt: 0, expiresAt: 0};
  const remaining = Math.max(0, w.expiresAt - tv);
  return {status: remaining > 0 ? ('fresh' as const) : ('expired' as const), answer: w.answer, remaining, cachedAt: w.t, expiresAt: w.expiresAt};
};
const lastQuery = (client: Ev['client'], tv: number) => [...EVENTS].reverse().find((e) => e.client === client && e.t <= tv) ?? null;
const ipColor = (ip: string | null) => (ip === OK_IP ? C.green : ip === BAD_IP ? C.red : C.mute);
const short = (ip: string | null) => (ip ? '.' + ip.split('.')[3] : '—');

/** Piecewise-linear virtual clock: maps scene time t to simulated seconds. */
const vclock = (t: number, pts: [number, number][]) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/* ---------- layout ---------- */
const L = {
  auth: {x: 640, y: 120, w: 640, h: 118},
  resA: {x: M, y: 330, w: 760, h: 200},
  resB: {x: 1064, y: 330, w: 760, h: 200},
  cliA: {x: M, y: 610, w: 760, h: 130},
  cliB: {x: 1064, y: 610, w: 760, h: 130},
};

const Clock: React.FC<{tv: number; x?: number; y?: number; o?: number}> = ({tv, x = 1480, y = 118, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, fontFamily: 'Inter, system-ui, sans-serif'}}>
    <div style={{fontSize: 20, letterSpacing: 3, color: C.mute, textTransform: 'uppercase', fontWeight: 600}}>Virtual clock</div>
    <div style={{fontSize: 64, fontWeight: 800, color: C.text, lineHeight: 1.05, fontFamily: '"DejaVu Sans Mono", monospace'}}>t = {String(Math.floor(tv)).padStart(2, ' ')} s</div>
  </div>
);

/** TTL countdown bar inside a resolver box. */
const TtlBar: React.FC<{remaining: number; color: string; label: string}> = ({remaining, color, label}) => (
  <div style={{marginTop: 14}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 24, color: C.dim, marginBottom: 8}}>
      <span>{label}</span>
      <span style={{color: remaining > 0 ? C.text : C.mute, fontFamily: '"DejaVu Sans Mono", monospace'}}>{remaining > 0 ? `${Math.ceil(remaining)} s left` : 'expired'}</span>
    </div>
    <div style={{height: 14, borderRadius: 7, background: C.line, overflow: 'hidden'}}>
      <div style={{height: '100%', width: `${(100 * Math.min(remaining, TTL)) / TTL}%`, background: color, opacity: remaining > 0 ? 1 : 0.2}} />
    </div>
  </div>
);

const ResolverBox: React.FC<{r: Res; tv: number; o?: number; glow?: boolean}> = ({r, tv, o = 1, glow = false}) => {
  const c = cacheAt(r, tv);
  const b = r === 'A' ? L.resA : L.resB;
  const col = c.status === 'empty' ? C.mute : c.status === 'expired' ? C.amber : ipColor(c.answer);
  return (
    <Box x={b.x} y={b.y} w={b.w} h={b.h} accent={col} o={o} glow={glow} title={`Recursive resolver ${r} · cache`} titleSize={28}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 8}}>
        <span style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 40, fontWeight: 700, color: col}}>{c.answer ?? 'empty'}</span>
        {c.status !== 'empty' && <span style={{fontSize: 24, color: C.dim}}>cached t={c.cachedAt} · expires t={c.expiresAt}</span>}
      </div>
      {c.status !== 'empty' && <TtlBar remaining={c.remaining} color={col} label={`TTL ${TTL} s`} />}
    </Box>
  );
};

const ClientBox: React.FC<{client: Ev['client']; tv: number; o?: number}> = ({client, tv, o = 1}) => {
  const q = lastQuery(client, tv);
  const b = client === 'clientA' ? L.cliA : L.cliB;
  const col = !q ? C.mute : q.connect === 'ok' ? C.green : C.red;
  return (
    <Box x={b.x} y={b.y} w={b.w} h={b.h} accent={col} o={o} title={`Client ${client === 'clientA' ? 'A' : 'B'} → resolver ${client === 'clientA' ? 'A' : 'B'}`} titleSize={28}>
      <div style={{display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, fontSize: 26}}>
        {q ? (
          <>
            <span style={{color: C.dim}}>t={q.t}</span>
            <span style={{color: C.cyan, fontWeight: 700}}>{q.cacheHit ? 'HIT' : 'MISS'}</span>
            <span style={{fontFamily: '"DejaVu Sans Mono", monospace', color: ipColor(q.answer)}}>{q.answer}</span>
            <span style={{marginLeft: 'auto', fontWeight: 800, color: col}}>{q.connect === 'ok' ? 'connect ok' : 'connect failed'}</span>
          </>
        ) : (
          <span style={{color: C.mute}}>no query yet</span>
        )}
      </div>
    </Box>
  );
};

const AuthBox: React.FC<{tv: number; o?: number; glow?: boolean}> = ({tv, o = 1, glow = false}) => {
  const v = authAt(tv);
  return (
    <Box x={L.auth.x} y={L.auth.y} w={L.auth.w} h={L.auth.h} accent={ipColor(v)} o={o} glow={glow} title={`Authoritative · ${DOMAIN}  A`} titleSize={26}>
      <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 40, fontWeight: 700, color: ipColor(v), marginTop: 4}}>{v} <span style={{fontSize: 24, color: C.dim, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500}}>TTL {TTL}</span></div>
    </Box>
  );
};

/** The whole simulated board at virtual time tv. */
const Board: React.FC<{tv: number; o?: number; glowAuth?: boolean; glowRes?: Res | null; wires?: boolean}> = ({tv, o = 1, glowAuth = false, glowRes = null, wires = true}) => (
  <>
    <AuthBox tv={tv} o={o} glow={glowAuth} />
    <Clock tv={tv} o={o} />
    {wires && (
      <Svg>
        <Arrow x1={L.auth.x + 120} y1={L.auth.y + L.auth.h} x2={L.resA.x + L.resA.w / 2} y2={L.resA.y - 4} color={C.mute} width={3} dashed o={o * 0.8} />
        <Arrow x1={L.auth.x + L.auth.w - 120} y1={L.auth.y + L.auth.h} x2={L.resB.x + L.resB.w / 2} y2={L.resB.y - 4} color={C.mute} width={3} dashed o={o * 0.8} />
        <Arrow x1={L.cliA.x + L.cliA.w / 2} y1={L.cliA.y} x2={L.resA.x + L.resA.w / 2} y2={L.resA.y + L.resA.h + 4} color={C.mute} width={3} o={o * 0.8} />
        <Arrow x1={L.cliB.x + L.cliB.w / 2} y1={L.cliB.y} x2={L.resB.x + L.resB.w / 2} y2={L.resB.y + L.resB.h + 4} color={C.mute} width={3} o={o * 0.8} />
      </Svg>
    )}
    <ResolverBox r="A" tv={tv} o={o} glow={glowRes === 'A'} />
    <ResolverBox r="B" tv={tv} o={o} glow={glowRes === 'B'} />
    <ClientBox client="clientA" tv={tv} o={o} />
    <ClientBox client="clientB" tv={tv} o={o} />
  </>
);

const Note: React.FC<{o: number; children: React.ReactNode; color?: string}> = ({o, children, color = C.dim}) => (
  <Txt x={M} y={868} w={W - 2 * M} align="center" size={26} color={color} o={o}>{children}</Txt>
);

/* ================================================================== */
/* 1. fail — the edit at t=10, then two clients, two results at t=20   */
/* ================================================================== */
const Fail: React.FC<SceneProps> = ({t}) => {
  const tv = vclock(t, [[0.4, 8], [1.6, 10], [3.2, 15], [4.6, 20], [20, 20]]);
  const edited = step(tv, 10);
  return (
    <>
      <Board tv={tv} glowAuth={edited === 1 && tv < 14} glowRes={tv >= 15 && tv < 19 ? 'B' : null} />
      <Pill x={L.auth.x} y={L.auth.y + L.auth.h + 10} text="t=10 · record edited → .20" color={C.red} o={ep(tv, 10, 11)} size={24} />
      <Note o={ep(t, 5.2, 5.7)} color={C.amber}>Observed from the simulator at t=20: client A HIT 192.0.2.10 connect ok · client B HIT 192.0.2.20 connect failed</Note>
    </>
  );
};

/* ================================================================== */
/* 2. layers — resolution vs connection, following client B at t=20    */
/* ================================================================== */
const Layers: React.FC<SceneProps> = ({t}) => {
  const q = EVENTS[3]; // t=20 clientB HIT 192.0.2.20 failed
  const p1 = ep(t, 0.8, 1.8);  // client → resolver
  const p2 = ep(t, 2.0, 3.0);  // resolver → client (answer)
  const p3 = ep(t, 3.4, 4.4);  // client → origin attempt
  const stageActive = t < 3.3 ? 0 : 1;
  const Y = 380;
  const CY = Y + 200; // connection lane
  return (
    <>
      <Overline y={110}>Two steps, two questions</Overline>
      <Stages x={M} y={170} w={W - 2 * M} stages={['1 · DNS resolution — which address?', '2 · Connection — can I reach it?']} active={stageActive} done={t > 3.3 ? [0] : []} failed={t > 4.5 ? 1 : undefined} />
      <Box x={M} y={Y} w={400} h={150} title="Client B" sub={`asks for ${DOMAIN}`} accent={C.cyan} titleSize={30} />
      <Box x={760} y={Y} w={400} h={150} title="Resolver B" sub={`cache: ${q.answer} (${q.ttlRemaining} s left)`} accent={C.red} titleSize={30} />
      <Box x={1424} y={Y} w={400} h={150} title="Intended origin" sub={OK_IP} accent={C.green} titleSize={30} dashed />
      <Svg>
        <Arrow x1={M + 400} y1={Y + 50} x2={760} y2={Y + 50} p={p1} label={`A? ${DOMAIN}`} />
        <Arrow x1={760} y1={Y + 110} x2={M + 400} y2={Y + 110} p={p2} color={C.cyan} label={`NOERROR · ${q.answer}`} labelDy={38} />
        <Arrow x1={M + 200} y1={Y + 150} x2={M + 200} y2={CY + 20} p={p3 > 0 ? 1 : 0} color={C.red} width={3} o={p3 > 0 ? 1 : 0} />
        <Arrow x1={M + 200} y1={CY + 20} x2={1624} y2={CY + 20} p={p3} color={C.red} dashed label={`TCP connect → ${q.answer} (not the origin)`} labelDy={44} />
        <Arrow x1={1624} y1={CY + 20} x2={1624} y2={Y + 150} p={p3 >= 1 ? 1 : 0} color={C.red} width={3} o={p3 >= 1 ? 1 : 0} />
      </Svg>
      <Token x1={M + 200} y1={CY} x2={1624 - 160} y2={CY} p={p3} text={q.answer} color={C.red} o={p3 > 0 && p3 < 1 ? 1 : 0} />
      <Badge x={760} y={CY + 70} label="resolution" value="succeeded" color={C.cyan} big o={ep(t, 3.0, 3.4)} />
      <Badge x={1180} y={CY + 70} label="connection" value="failed" color={C.red} big o={ep(t, 4.5, 4.9)} />
      <Box x={M} y={720} w={W - 2 * M} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 5.2, 5.8)}>
        <div style={{fontSize: 28, color: C.text}}>Not a DNS <span style={{color: C.red}}>failure</span>. A DNS <span style={{color: C.cyan}}>answer</span> that points at the wrong destination. Only the connection stage fails, and it fails because of where it was sent.</div>
      </Box>
      <Note o={ep(t, 6.2, 6.7)}>Simplified model: the connect stage is a comparison against 192.0.2.10. TLS and HTTP are not modelled. No browser or OS cache.</Note>
    </>
  );
};

/* ================================================================== */
/* 3. compare — three copies of the answer at t=20                     */
/* ================================================================== */
const Compare: React.FC<SceneProps> = ({t}) => {
  const tv = 20;
  const cols = [
    {title: 'Authoritative record', value: authAt(tv), sub: 'edited at t=10', note: 'what NEW lookups receive', x: M},
    {title: 'Resolver A cache', value: cacheAt('A', tv).answer!, sub: `cached t=0 · ${cacheAt('A', tv).remaining} s left`, note: 'asked BEFORE the edit', x: M + 590},
    {title: 'Resolver B cache', value: cacheAt('B', tv).answer!, sub: `cached t=15 · ${cacheAt('B', tv).remaining} s left`, note: 'asked AFTER the edit', x: M + 1180},
  ];
  return (
    <>
      <Overline y={110}>Three copies of one answer · t = 20 s</Overline>
      <Clock tv={tv} o={ep(t, 0, 0.5)} />
      {cols.map((c, i) => {
        const o = ep(t, 0.4 + i * 0.7, 1.0 + i * 0.7);
        const col = ipColor(c.value);
        return (
          <React.Fragment key={c.title}>
            <Box x={c.x} y={220} w={548} h={300} title={c.title} sub={c.sub} accent={col} o={o} titleSize={28}>
              <div style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 52, fontWeight: 800, color: col, marginTop: 22}}>{c.value}</div>
              <div style={{fontSize: 26, color: C.dim, marginTop: 14}}>{c.note}</div>
            </Box>
            {i > 0 && <TtlStrip x={c.x} y={540} remaining={i === 1 ? cacheAt('A', tv).remaining : cacheAt('B', tv).remaining} color={col} o={o} />}
          </React.Fragment>
        );
      })}
      <Txt x={M} y={640} w={W - 2 * M} size={30} color={C.text} o={ep(t, 3.0, 3.6)}>Each cache keeps whatever it fetched, for the TTL it fetched it with. Resolver A never saw the bad record. Resolver B never saw the good one.</Txt>
      <Txt x={M} y={740} w={W - 2 * M} size={28} color={C.amber} o={ep(t, 4.4, 5.0)}>Both resolvers answered NOERROR. Neither lookup "failed". One of them simply holds an unintended destination.</Txt>
      <Note o={ep(t, 5.6, 6.1)}>Observed from the simulator snapshot at t=20: authoritative 192.0.2.20 · resolver A 192.0.2.10 (40 s) · resolver B 192.0.2.20 (55 s)</Note>
    </>
  );
};

const TtlStrip: React.FC<{x: number; y: number; remaining: number; color: string; o: number}> = ({x, y, remaining, color, o}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 548, opacity: o}}>
    <div style={{height: 14, borderRadius: 7, background: C.line, overflow: 'hidden'}}>
      <div style={{height: '100%', width: `${(100 * remaining) / TTL}%`, background: color}} />
    </div>
    <div style={{fontSize: 22, color: C.dim, marginTop: 6, fontFamily: '"DejaVu Sans Mono", monospace'}}>TTL remaining {remaining}/{TTL} s</div>
  </div>
);

/* ================================================================== */
/* 4. restore — authoritative corrected at t=30; nothing changes yet    */
/* ================================================================== */
const Restore: React.FC<SceneProps> = ({t}) => {
  const tv = vclock(t, [[0.4, 24], [2.0, 30], [20, 30]]);
  return (
    <>
      <Board tv={tv} glowAuth={tv >= 30 && t < 4} glowRes={t > 4 ? 'B' : null} />
      <Pill x={L.auth.x} y={L.auth.y + L.auth.h + 10} text="t=30 · record restored → .10" color={C.green} o={ep(t, 2.0, 2.5)} size={24} />
      <Txt x={L.resB.x} y={L.resB.y + L.resB.h + 14} w={L.resB.w} size={26} color={C.amber} o={ep(t, 4.2, 4.8)}>Still fresh. Still wrong. Nobody told it.</Txt>
      <Note o={ep(t, 5.4, 5.9)} color={C.amber}>Observed at t=30: client A HIT 192.0.2.10 ok · client B HIT 192.0.2.20 connect failed. The fix reaches only caches that ask again.</Note>
    </>
  );
};

/* ================================================================== */
/* 5. stale — why resolver B's wrong answer survives the fix           */
/* ================================================================== */
const Stale: React.FC<SceneProps> = ({t}) => {
  const w = WRITES[1]; // resolver B wrote 192.0.2.20 at t=15, expires 75
  const x0 = M, x1 = W - M; // timeline 0..90 s
  const X = (s: number) => x0 + ((x1 - x0) * s) / 90;
  const Y = 320;
  const draw = ep(t, 0.4, 1.4);
  return (
    <>
      <Overline y={110} color={C.amber}>Why one wrong answer remains</Overline>
      <Svg>
        <line x1={x0} y1={Y} x2={x1} y2={Y} stroke={C.line} strokeWidth={4} />
        {[0, 15, 30, 45, 60, 75, 90].map((s) => (
          <g key={s}>
            <line x1={X(s)} y1={Y - 12} x2={X(s)} y2={Y + 12} stroke={C.mute} strokeWidth={3} />
            <text x={X(s)} y={Y + 44} fill={C.dim} fontSize={22} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">t={s}</text>
          </g>
        ))}
        <rect x={X(w.t)} y={Y - 60} width={(X(w.expiresAt) - X(w.t)) * draw} height={44} rx={8} fill={C.red} opacity={0.85} />
        <line x1={X(10)} y1={Y - 120} x2={X(10)} y2={Y - 60} stroke={C.red} strokeWidth={4} />
        <line x1={X(30)} y1={Y - 120} x2={X(30)} y2={Y - 60} stroke={C.green} strokeWidth={4} opacity={ep(t, 1.8, 2.2)} />
      </Svg>
      <Txt x={X(10) - 150} y={Y - 170} w={300} align="center" size={24} color={C.red}>t=10 bad edit</Txt>
      <Txt x={X(30) - 150} y={Y - 170} w={300} align="center" size={24} color={C.green} o={ep(t, 1.8, 2.2)}>t=30 restored</Txt>
      <Txt x={X(w.t) + 8} y={Y - 56} w={1100} size={24} color={C.bg} weight={700} o={draw}>resolver B · 192.0.2.20 · cached t={w.t} · TTL {w.ttl} → expires t={w.expiresAt}</Txt>
      <Code x={M} y={400} w={820} title="what fixes the expiry time" size={26} hi={[2]} hiColor={C.amber} lines={[
        'expiresAt = cachedAt + ttlAtFetch',
        `          = ${w.t} + ${w.ttl} = ${w.expiresAt}`,
        '// set when stored. not re-read later',
      ]} />
      <Code x={M + 880} y={400} w={848} title="lowering TTL at the authority now" size={26} hi={[1, 2]} hiColor={C.red} lines={[
        'authoritative.ttl = 5   // at t=30',
        'resolverB.expiresAt     // still 75',
        '// only lookups made after t=30 get TTL 5',
      ]} />
      <Box x={M} y={640} w={W - 2 * M} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 4.2, 4.8)}>
        <div style={{fontSize: 28, color: C.text, lineHeight: 1.3}}>Expiry is not a message. At t=75 nothing is sent to resolver B or to its clients. The entry merely becomes eligible for replacement <span style={{color: C.amber}}>the next time someone asks</span>.</div>
      </Box>
      <Note o={ep(t, 5.6, 6.1)}>Verified in test.mjs: TTL lowered after caching leaves expiresAt unchanged; an expired entry stays until queried. No serve-stale or prefetch in this model.</Note>
    </>
  );
};

/* ================================================================== */
/* 6. expire — advance the clock from 30 to 75                         */
/* ================================================================== */
const Expire: React.FC<SceneProps> = ({t}) => {
  const tv = vclock(t, [[0.3, 30], [3.0, 60], [4.4, 60], [6.6, 75], [20, 75]]);
  const aRefresh = step(tv, 60);
  const bRefresh = step(tv, 75);
  return (
    <>
      <Board tv={tv} glowRes={bRefresh ? 'B' : aRefresh && t < 4.6 ? 'A' : null} />
      <Pill x={L.resA.x} y={L.resA.y + L.resA.h + 12} text="t=60 · MISS → fetched .10 from the authority" color={C.green} o={ep(t, 3.0, 3.4) * aRefresh} size={24} />
      <Pill x={L.resB.x} y={L.resB.y + L.resB.h + 12} text="t=75 · MISS → fetched .10 from the authority" color={C.green} o={ep(t, 6.6, 7.0) * bRefresh} size={24} />
      <Txt x={M} y={800} w={W - 2 * M} align="center" size={28} color={C.text} o={ep(t, 7.0, 7.5)}>Each refresh happened only because a client queried after expiry. The clock alone changed nothing.</Txt>
      <Note o={ep(t, 7.8, 8.3)}>Observed: t=60 client A MISS 192.0.2.10 ok, client B HIT 192.0.2.20 failed (15 s left) · t=75 client B MISS 192.0.2.10 ok</Note>
    </>
  );
};

/* ================================================================== */
/* 7. recovery — the full event table and summary                      */
/* ================================================================== */
const Recovery: React.FC<SceneProps> = ({t}) => {
  const fmt = (e: Ev) => `t=${String(e.t).padStart(2, ' ')}  ${e.client}  ${e.cacheHit ? 'HIT ' : 'MISS'}  ${e.answer}  ttl ${String(e.ttlRemaining).padStart(2, ' ')}  ${e.connect}`;
  const lines = [
    {t: '$ node fixtures/ep10-dns-caches/demo.mjs', c: C.mute},
    ...EVENTS.map((e) => ({t: fmt(e), c: e.connect === 'ok' ? (e.cacheHit ? C.text : C.green) : C.red})),
  ];
  const shown = prog(t, 0.3, 4.2) * lines.length;
  return (
    <>
      <Overline y={110} color={C.green}>Recovery · the whole run</Overline>
      <Log x={M} y={160} w={1040} lines={lines} shown={shown} size={23} title="Executed · evidence.json events" />
      <Readout x={1180} y={180} w={300} label="queries" value={SUMMARY.totalQueries} color={C.cyan} o={ep(t, 1.0, 1.5)} />
      <Readout x={1500} y={180} w={300} label="resolution failures" value={SUMMARY.resolutionFailures} color={C.green} o={ep(t, 1.6, 2.1)} />
      <Readout x={1180} y={380} w={300} label="failed connects" value={SUMMARY.failedConnections} color={C.red} o={ep(t, 2.2, 2.7)} />
      <Box x={1500} y={380} w={300} h={150} accent={C.amber} o={ep(t, 2.8, 3.3)} title="recovered" titleSize={24}>
        <div style={{fontSize: 28, marginTop: 6, color: C.text}}>A at t={SUMMARY.resolverARecoveredAt}</div>
        <div style={{fontSize: 28, color: C.text}}>B at t={SUMMARY.resolverBRecoveredAt}</div>
      </Box>
      <Txt x={1180} y={560} w={620} size={26} color={C.amber} o={ep(t, 3.6, 4.1)}>Two caches, two moments. There is no single "propagation time"; each cache recovers at its own fetch time plus its own stored TTL, and only when asked.</Txt>
      <Box x={1180} y={690} w={620} h={150} accent={C.line} dashed fill="transparent" o={ep(t, 4.6, 5.1)}>
        <div style={{fontSize: 22, letterSpacing: 2, color: C.mute, textTransform: 'uppercase', fontWeight: 700}}>Not in this model</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 6, lineHeight: 1.3}}>browser DNS cache · OS cache · serve-stale · prefetch · AAAA records (check them too) · TLS · HTTP</div>
      </Box>
      <Note o={ep(t, 5.4, 5.9)}>Checklist in fixtures/ep10-dns-caches/diagnostic-checklist.md separates DNS resolution, connectivity, TLS and HTTP.</Note>
    </>
  );
};

/* ================================================================== */
/* 8. end                                                              */
/* ================================================================== */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>Fixing the source does not<br />erase every cached answer.</Big>
    <Txt x={M} y={590} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>A record TTL governs DNS answers. Website content has its own cache lifetimes (Cache-Control, CDN TTLs). Separate clocks, separate investigations.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Simulated DNS model, documentation addresses, no real network. Real incidents involve more caches, AAAA records, and no fixed recovery interval.</Txt>
  </>
);

export const scenes = {fail: Fail, layers: Layers, compare: Compare, restore: Restore, stale: Stale, expire: Expire, recovery: Recovery, end: End};
