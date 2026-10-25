import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Readout, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Evidence (fixtures/ep16-rate-limit/evidence.json). Every number shown comes from here. */
/* ------------------------------------------------------------------ */
const EV = {
  limit: 5,
  windowS: 10,
  typed: 'postgres',
  flawed: {requests: 17, retries: 9, r429: 12, r200: 5, staleRenders: 5, shownFor: 'p'},
  corrected: {requests: 1, r429: 0, shownFor: 'postgres'},
  abortRun: {requests: 2, aborted: 1, serverAbortsObserved: 1},
  retryRun: {firstDoneMs: 7725, retryAfter: 3, retryAtMs: 10889, retryStatus: 200},
  // first entries of request-log-flawed.json (n, q, attempt, status)
  flawedLog: [
    [1, 'p', 0, 200], [2, 'po', 0, 200], [3, 'pos', 0, 200], [4, 'post', 0, 200], [5, 'postg', 0, 200],
    [6, 'postgr', 0, 429], [7, 'postgr', 1, 429], [8, 'postgre', 0, 429], [9, 'postgr', 2, 429], [10, 'postgres', 0, 429],
    [11, 'postgre', 1, 429], [12, 'postgres', 1, 429], [13, 'postgr', 3, 429], [14, 'postgre', 2, 429], [15, 'postgres', 2, 429], [16, 'postgre', 3, 429], [17, 'postgres', 3, 429],
  ] as [number, string, number, number][],
};
const KEYS = EV.typed.split('').map((_, i) => EV.typed.slice(0, i + 1)); // p, po, pos, …

/* ------------------------------------------------------------------ */
/* Local components */
/* ------------------------------------------------------------------ */

/** Illustrative search UI (plain Box chrome, never a real product). */
const SearchUI: React.FC<{x: number; y: number; w: number; text: string; results?: string[]; status?: 'ok' | 'limited' | 'idle'; o?: number; caret?: boolean; label?: string}> = ({x, y, w, text, results = [], status = 'idle', o = 1, caret = true, label = 'Illustrative UI'}) => (
  <Box x={x} y={y} w={w} h={330} accent={status === 'limited' ? C.red : C.line} o={o} fill="#14171e">
    <div style={{display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18}}>
      {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
      <div style={{marginLeft: 16, color: C.mute, fontSize: 20, fontFamily: 'DejaVu Sans Mono'}}>{label} · search.example.test</div>
    </div>
    <div style={{height: 64, borderRadius: 12, background: '#0d0f14', border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 20px', fontFamily: 'DejaVu Sans Mono', fontSize: 34, color: C.text}}>
      <span style={{color: C.mute, marginRight: 14}}>⌕</span>{text}{caret && <span style={{display: 'inline-block', width: 3, height: 38, background: C.cyan, marginLeft: 4}} />}
    </div>
    <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8}}>
      {status === 'limited' ? (
        <div style={{padding: '12px 16px', borderRadius: 10, background: `${C.red}22`, border: `2px solid ${C.red}`, color: C.red, fontSize: 28, fontWeight: 700}}>429 Too Many Requests</div>
      ) : results.slice(0, 3).map((r) => <div key={r} style={{padding: '10px 16px', borderRadius: 10, background: '#1a1e27', color: C.text, fontSize: 26}}>{r}</div>)}
    </div>
  </Box>
);

/** Five-slot allowance meter for one fixed window. */
const Meter: React.FC<{x: number; y: number; used: number; rejected?: number; label?: string; o?: number}> = ({x, y, used, rejected = 0, label = 'window allowance · 5 / 10 s', o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, fontFamily: 'Inter, sans-serif'}}>
    <div style={{fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: C.dim, marginBottom: 10}}>{label}</div>
    <div style={{display: 'flex', gap: 10}}>
      {Array.from({length: EV.limit}).map((_, i) => (
        <div key={i} style={{width: 64, height: 40, borderRadius: 8, border: `3px solid ${i < used ? C.cyan : C.line}`, background: i < used ? `${C.cyan}33` : 'transparent'}} />
      ))}
      {rejected > 0 && <div style={{marginLeft: 14, padding: '4px 14px', borderRadius: 8, border: `3px solid ${C.red}`, color: C.red, fontSize: 24, fontWeight: 700}}>+{rejected} × 429</div>}
    </div>
  </div>
);

/** Horizontal time ruler, 0..secs seconds, mapped to [x, x+w]. */
const Ruler: React.FC<{x: number; y: number; w: number; secs: number; o?: number; marks?: number[]}> = ({x, y, w, secs, o = 1, marks}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o}}>
    <div style={{height: 3, background: C.line}} />
    {(marks ?? Array.from({length: secs + 1}).map((_, i) => i)).map((s) => (
      <div key={s} style={{position: 'absolute', left: (s / secs) * w - 1, top: -8, width: 2, height: 19, background: C.mute}}>
        <div style={{position: 'absolute', top: 24, left: -30, width: 60, textAlign: 'center', fontSize: 22, color: C.dim, fontFamily: 'Inter, sans-serif'}}>{s} s</div>
      </div>
    ))}
  </div>
);

const Obs: React.FC<{t: number; at: number; children: React.ReactNode}> = ({t, at, children}) => (
  <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, at, at + 0.5)}>{children}</Txt>
);

/* ------------------------------------------------------------------ */
/* 1. fail — typing bursts, 6th request is 429 */
/* ------------------------------------------------------------------ */
const Fail: React.FC<SceneProps> = ({t}) => {
  const K0 = 0.6, DK = 0.42; // one keystroke every 0.42 s from 0.6 s
  const k = Math.min(8, Math.floor(Math.max(0, t - K0) / DK) + (t >= K0 ? 1 : 0));
  const text = KEYS[Math.max(0, k - 1)] ?? '';
  const limited = k >= 6 && t > K0 + 5 * DK + 0.5;
  const sent = k;
  const allowed = Math.min(5, sent);
  const rejected = Math.max(0, sent - 5);
  return (
    <>
      <SearchUI x={M} y={130} w={860} text={k ? text : ''} status={limited ? 'limited' : 'ok'} results={k && !limited ? ['postgres', 'postgresql tuning', 'postgres replication'] : []} />
      <Box x={1360} y={190} w={464} h={210} title="Search API" sub="fixed-window limiter · per identity" accent={rejected ? C.red : C.cyan} glow={rejected > 0} />
      <Svg>
        {KEYS.map((_, i) => {
          const t0 = K0 + i * DK;
          const p = ep(t, t0, t0 + 0.5);
          if (t < t0) return null;
          return <Arrow key={i} x1={1250} y1={212 + i * 22} x2={1350} y2={212 + i * 22} p={p} color={i >= 5 ? C.red : C.cyan} width={3} />;
        })}
      </Svg>
      {KEYS.map((q, i) => {
        const t0 = K0 + i * DK;
        if (t < t0) return null;
        return <Pill key={q} x={990 + 8 * i} y={190 + i * 22} text={`/search?q=${q}`} color={i >= 5 ? C.red : C.cyanDim} mono size={20} o={Math.min(1, ep(t, t0, t0 + 0.2))} />;
      })}
      <Meter x={1360} y={440} used={allowed} rejected={rejected} o={ep(t, 0.3, 0.8)} />
      <Readout x={M} y={520} w={300} label="keystrokes" value={k} color={C.text} o={ep(t, 0.3, 0.8)} />
      <Readout x={M + 300} y={520} w={300} label="requests" value={sent} color={C.cyan} o={ep(t, 0.3, 0.8)} />
      <Readout x={M + 600} y={520} w={300} label="429" value={rejected} color={rejected ? C.red : C.mute} o={ep(t, 0.3, 0.8)} />
      <Txt x={M} y={720} w={1100} size={40} weight={700} color={C.amber} o={ep(t, 4.6, 5.2)}>Nothing is broken. The app is being rate-limited.</Txt>
      <Obs t={t} at={5.4}>Observed from the local fixture: eight keystrokes, eight first-attempt requests; the sixth onward answered 429.</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 2. window — reveal the fixed-window allowance */
/* ------------------------------------------------------------------ */
const Window: React.FC<SceneProps> = ({t}) => {
  const RX = M + 40, RW = W - 2 * M - 80, RY = 360;
  const xAt = (s: number) => RX + (s / 20) * RW;
  const reqs = [1, 2.4, 3.8, 5.2, 6.6, 8]; // six requests inside window 1 (seconds on the ruler), spaced so labels do not overlap
  const reset = ep(t, 4.2, 4.8);
  return (
    <>
      <Overline y={110}>The limiter · fixed window (this fixture's design)</Overline>
      <Txt x={M} y={160} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 0.2, 0.7)}>Five allowed requests per ten seconds, per server-established identity. Windows are aligned to the clock; the allowance resets at the edge.</Txt>
      {/* two windows */}
      <Box x={xAt(0)} y={RY - 90} w={xAt(10) - xAt(0) - 8} h={80} title="window 1 · 0–10 s" titleSize={24} accent={C.cyanDim} o={ep(t, 0.4, 0.9)} />
      <Box x={xAt(10)} y={RY - 90} w={xAt(20) - xAt(10)} h={80} title="window 2 · 10–20 s" titleSize={24} accent={reset > 0.5 ? C.green : C.line} o={ep(t, 0.6, 1.1)} glow={reset > 0.5} />
      <Ruler x={RX} y={RY} w={RW} secs={20} marks={[0, 5, 10, 15, 20]} o={ep(t, 0.4, 0.9)} />
      {reqs.map((s, i) => {
        const t0 = 1.2 + i * 0.35;
        const ok = i < 5;
        return (
          <React.Fragment key={i}>
            <Pill x={xAt(s) - 22} y={RY + 60} text={ok ? '200' : '429'} color={ok ? C.cyan : C.red} size={20} o={ep(t, t0, t0 + 0.3)} />
            <Svg><Arrow x1={xAt(s)} y1={RY + 56} x2={xAt(s)} y2={RY + 8} p={ep(t, t0, t0 + 0.3)} color={ok ? C.cyan : C.red} width={3} /></Svg>
          </React.Fragment>
        );
      })}
      <Meter x={M + 40} y={RY + 130} used={Math.min(5, reqs.filter((_, i) => t >= 1.2 + i * 0.35).length)} rejected={t >= 1.2 + 5 * 0.35 ? 1 : 0} o={ep(t, 1, 1.4)} />
      <Box x={1040} y={RY + 120} w={784} h={120} accent={C.red} o={ep(t, 3.2, 3.7)} fill="#1c1012">
        <div style={{fontSize: 26, color: C.red, fontWeight: 700, letterSpacing: 2}}>6TH REQUEST · 429</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6, fontFamily: 'DejaVu Sans Mono'}}>Retry-After: ⌈(reset − now) / 1000⌉ s   (integer, ≥ 1)</div>
      </Box>
      {/* reset arrow */}
      <Svg><Arrow x1={xAt(10)} y1={RY + 120} x2={xAt(10)} y2={RY + 60} p={reset} color={C.green} label="allowance restored" /></Svg>
      <Box x={M + 40} y={680} w={W - 2 * M - 80} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 5.4, 6)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>DELIBERATE FIXTURE POLICY</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Rejected requests do not consume allowance here. Real APIs vary: some count rejections, many use sliding windows or token buckets, and Retry-After may be absent or an HTTP-date.</div>
      </Box>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 3. retry_loop — immediate retries get more 429s */
/* ------------------------------------------------------------------ */
const RetryLoop: React.FC<SceneProps> = ({t}) => {
  const lines = EV.flawedLog.map(([n, q, a, s]) => ({t: `#${String(n).padStart(2, ' ')}  q=${q.padEnd(8)}  ${a ? `retry ${a}` : 'keystroke'}  → ${s}`, c: s === 429 ? C.red : C.green}));
  const shown = prog(t, 0.3, 6.5) * lines.length;
  const seen = Math.floor(shown);
  const n429 = EV.flawedLog.slice(0, seen).filter((e) => e[3] === 429).length;
  const nRetry = EV.flawedLog.slice(0, seen).filter((e) => e[2] > 0).length;
  return (
    <>
      <Overline y={110} color={C.red}>Flawed client · retry immediately on 429</Overline>
      <Log x={M} y={160} w={1000} lines={lines} shown={shown} size={22} title="request-log-flawed.json · what the client sent" />
      <Code x={1140} y={160} w={684} title="client-flawed.mjs" size={24} hi={[2]} hiColor={C.red} lines={[
        'onInput(text) { send(text) }',
        'if (r.status === 429) {',
        '  send(q)  // at once, no wait',
        '}',
      ]} />
      <Readout x={1140} y={400} w={220} label="requests" value={seen} color={C.cyan} />
      <Readout x={1370} y={400} w={220} label="retries" value={nRetry} color={C.amber} />
      <Readout x={1600} y={400} w={220} label="429" value={n429} color={C.red} />
      <Meter x={1140} y={600} used={5} rejected={n429} label="window 1 · the window has not moved" o={ep(t, 1, 1.5)} />
      <Txt x={1140} y={720} w={684} size={26} color={C.dim} o={ep(t, 3, 3.5)}>Each retry lands in the same window, so each retry is rejected. The loop is bounded to three retries per keystroke only so the tests terminate.</Txt>
      <Obs t={t} at={6.6}>Observed from the local fixture: 8 keystrokes → {EV.flawed.requests} requests, {EV.flawed.r429} × 429, {EV.flawed.r200} × 200.</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 4. debounce — same typing, one request */
/* ------------------------------------------------------------------ */
const Debounce: React.FC<SceneProps> = ({t}) => {
  const K0 = 0.6, DK = 0.42, DB = 1.3; // debounce shown as 1.3 s of scene time (represents 250 ms)
  const k = Math.min(8, Math.floor(Math.max(0, t - K0) / DK) + (t >= K0 ? 1 : 0));
  const lastKey = K0 + 7 * DK;
  const timerStart = k ? K0 + (k - 1) * DK : 0;
  const timerP = k ? prog(t, timerStart, timerStart + DB) : 0;
  const fired = t >= lastKey + DB;
  const RX = M, RW = 1000, RY = 560;
  const xAt = (s: number) => RX + ((s - K0) / (lastKey + DB + 1 - K0)) * RW;
  return (
    <>
      <Overline y={110} color={C.green}>Corrected client · 1 of 4 · debounce</Overline>
      <SearchUI x={M} y={150} w={1000} text={k ? KEYS[k - 1] : ''} status={fired ? 'ok' : 'idle'} results={fired ? ['postgres', 'postgresql tuning', 'postgres replication'] : []} />
      <Code x={1180} y={150} w={644} title="client-corrected.mjs" size={24} hi={[1, 2]} hiColor={C.green} lines={[
        'onInput(text) {',
        '  clearTimeout(timer)',
        '  timer = setTimeout(',
        '    () => send(text), 250)',
        '}',
      ]} />
      {/* keystroke ticks */}
      <Ruler x={RX} y={RY} w={RW} secs={1} marks={[]} o={ep(t, 0.2, 0.6)} />
      {KEYS.map((q, i) => {
        const t0 = K0 + i * DK;
        if (t < t0) return null;
        return <Pill key={q} x={xAt(t0) - 14} y={RY - 54} text={q.slice(-1)} color={C.text} size={22} o={1} />;
      })}
      {/* debounce timer bar restarting on every keystroke */}
      {k > 0 && !fired && <div style={{position: 'absolute', left: xAt(timerStart), top: RY + 20, width: Math.max(0, (xAt(timerStart + DB) - xAt(timerStart)) * timerP), height: 14, borderRadius: 7, background: C.amber}} />}
      {k > 0 && !fired && <Txt x={xAt(timerStart)} y={RY + 44} size={22} color={C.amber}>timer restarts · 250 ms</Txt>}
      {fired && (
        <>
          <div style={{position: 'absolute', left: xAt(lastKey), top: RY + 20, width: xAt(lastKey + DB) - xAt(lastKey), height: 14, borderRadius: 7, background: C.green}} />
          <Svg><Arrow x1={xAt(lastKey + DB)} y1={RY + 27} x2={xAt(lastKey + DB)} y2={RY - 10} p={ep(t, lastKey + DB, lastKey + DB + 0.4)} color={C.green} label="GET /search?q=postgres" /></Svg>
        </>
      )}
      <Readout x={1180} y={400} w={300} label="keystrokes" value={k} color={C.text} />
      <Readout x={1500} y={400} w={300} label="requests" value={fired ? 1 : 0} color={C.green} />
      <Txt x={1180} y={600} w={644} size={26} color={C.dim} o={ep(t, 1, 1.5)}>Debouncing lowers the client's rate. It does not replace the server's limiter.</Txt>
      <Obs t={t} at={lastKey + DB + 0.4}>Observed from the local fixture: same 8 keystrokes → {EV.corrected.requests} request, {EV.corrected.r429} × 429, results for "{EV.corrected.shownFor}".</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 5. stale — sequence guard */
/* ------------------------------------------------------------------ */
const Stale: React.FC<SceneProps> = ({t}) => {
  const out1 = ep(t, 0.6, 1.4);  // seq 1 "post" goes out
  const out2 = ep(t, 1.6, 2.4);  // seq 2 "postgres" goes out
  const back2 = ep(t, 2.6, 3.4); // seq 2 returns first (short latency)
  const back1 = ep(t, 3.8, 4.8); // seq 1 returns late
  const LYc = 200, LYs = 480;
  return (
    <>
      <Overline y={110} color={C.green}>Corrected client · 2 of 4 · ignore obsolete responses</Overline>
      <Lane y={LYc} h={140} label="Client · latest seq" accent={C.cyan} />
      <Lane y={LYs} h={140} label="Server · shorter prefix = slower" accent={C.mute} />
      <Badge x={M + 40} y={LYc + 60} label="latest" value={out2 > 0.1 ? 'seq 2 · postgres' : 'seq 1 · post'} color={C.cyan} />
      <Svg>
        <Arrow x1={700} y1={LYc + 130} x2={700} y2={LYs + 50} p={out1} label="seq 1 · q=post" />
        <Arrow x1={1000} y1={LYc + 130} x2={1000} y2={LYs + 50} p={out2} label="seq 2 · q=postgres" />
        <Arrow x1={1200} y1={LYs + 50} x2={1200} y2={LYc + 130} p={back2} color={C.green} label="seq 2 → applied" />
        <Arrow x1={1500} y1={LYs + 50} x2={1500} y2={LYc + 130} p={back1} color={C.amber} label="seq 1 arrives late" />
      </Svg>
      <Gate x={M + 40} y={LYc + 160} w={520} title="apply response?" accent={C.cyan} checks={[{label: 'response.seq === latest', state: back1 > 0.95 ? 'fail' : back2 > 0.95 ? 'pass' : 'pending'}]} o={ep(t, 2.4, 2.9)} />
      <Pill x={1560} y={LYc + 60} text="dropped · stale" color={C.amber} size={24} o={ep(t, 4.9, 5.3)} />
      <Code x={1180} y={LYs + 160} w={644} title="client-corrected.mjs" size={24} hi={[2]} hiColor={C.green} lines={[
        'const mySeq = ++seq',
        'const r = await fetch(url)',
        'if (mySeq !== seq) return // stale',
        'render(await r.json())',
      ]} o={ep(t, 2, 2.5)} />
      <Txt x={M + 40} y={LYs + 160} w={1000} size={26} color={C.dim} o={ep(t, 5.4, 5.9)}>Without the guard, the late "post" result would overwrite "postgres". The flawed run ended showing results for "{EV.flawed.shownFor}" ({EV.flawed.staleRenders} stale renders).</Txt>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 6. abort — AbortController */
/* ------------------------------------------------------------------ */
const Abort: React.FC<SceneProps> = ({t}) => {
  const out = ep(t, 0.6, 1.6);
  const keyAt = 2.2;
  const aborted = step(t, keyAt + 0.3);
  const logged = ep(t, keyAt + 1.2, keyAt + 1.7);
  const LYc = 200, LYs = 480;
  return (
    <>
      <Overline y={110} color={C.green}>Corrected client · 3 of 4 · abort obsolete requests</Overline>
      <Lane y={LYc} h={140} label="Client" accent={C.cyan} />
      <Lane y={LYs} h={140} label="Server (fixture)" accent={C.mute} />
      <Badge x={M + 40} y={LYc + 60} label="input" value={t >= keyAt ? 'postg' : 'post'} color={C.cyan} />
      <Svg>
        <Arrow x1={800} y1={LYc + 130} x2={800} y2={LYs + 50} p={out} label="q=post · in flight" />
        {aborted ? <Arrow x1={800} y1={LYs + 50} x2={800} y2={LYc + 130} p={0.45} color={C.amber} width={4} dashed /> : null}
      </Svg>
      <Pill x={830} y={LYc + 170} text="controller.abort('query changed')" color={C.amber} mono size={22} o={aborted} />
      <Pill x={M + 40} y={LYc + 170} text="keystroke · g" color={C.text} size={22} o={ep(t, keyAt, keyAt + 0.2)} />
      <Log x={1180} y={LYc + 50} w={644} size={22} title="server log · what the server saw" shown={logged * 2} lines={[
        {t: '{ q: "post", status: 200,', c: C.text},
        {t: '  abortedByClient: true }', c: C.amber},
      ]} />
      <Code x={M + 40} y={LYs + 160} w={700} title="client-corrected.mjs" size={24} hi={[1]} hiColor={C.green} lines={[
        'onInput(text) {',
        '  current?.controller.abort()',
        '  …debounce → send(text)',
        '}',
      ]} o={ep(t, 0.4, 0.9)} />
      <Box x={840} y={LYs + 160} w={984} h={130} accent={C.amber} dashed fill="transparent" o={ep(t, 4.2, 4.7)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>LIMIT</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>An abort stops the client waiting. It does not prove the server stopped processing or did not count the request. The sequence guard is what keeps the result safe.</div>
      </Box>
      <Obs t={t} at={5}>Observed from the local fixture (paused-typing run): {EV.abortRun.requests} requests, {EV.abortRun.aborted} aborted by the client, {EV.abortRun.serverAbortsObserved} abort observed by the server.</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 7. retry_after — wait, then one retry */
/* ------------------------------------------------------------------ */
const RetryAfter: React.FC<SceneProps> = ({t}) => {
  const RX = M + 40, RW = W - 2 * M - 80, RY = 360;
  const xAt = (ms: number) => RX + (ms / 14000) * RW;
  const first = ep(t, 0.6, 1.1);
  const wait = prog(t, 1.4, 4.4);
  const retry = ep(t, 4.6, 5.1);
  const {firstDoneMs, retryAfter, retryAtMs} = EV.retryRun;
  return (
    <>
      <Overline y={110} color={C.green}>Corrected client · 4 of 4 · respect Retry-After</Overline>
      <Txt x={M} y={160} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 0.2, 0.7)}>Run C: the window was already exhausted when typing began.</Txt>
      <Box x={xAt(0)} y={RY - 90} w={xAt(10000) - xAt(0) - 8} h={80} title="window 1 · exhausted" titleSize={24} accent={C.redDim} />
      <Box x={xAt(10000)} y={RY - 90} w={xAt(14000) - xAt(10000)} h={80} title="window 2" titleSize={24} accent={C.greenDim} />
      <Ruler x={RX} y={RY} w={RW} secs={14} marks={[0, 5, 10, 14]} />
      <Svg>
        <Arrow x1={xAt(firstDoneMs)} y1={RY + 110} x2={xAt(firstDoneMs)} y2={RY + 8} p={first} color={C.red} width={3} />
        <Arrow x1={xAt(retryAtMs)} y1={RY + 110} x2={xAt(retryAtMs)} y2={RY + 8} p={retry} color={C.green} width={3} />
      </Svg>
      <Pill x={xAt(firstDoneMs) - 160} y={RY + 116} text={`429 · Retry-After: ${retryAfter}`} color={C.red} size={22} o={first} />
      <div style={{position: 'absolute', left: xAt(firstDoneMs), top: RY + 60, width: (xAt(firstDoneMs + retryAfter * 1000) - xAt(firstDoneMs)) * wait, height: 14, borderRadius: 7, background: C.amber}} />
      <Txt x={xAt(firstDoneMs) + 10} y={RY + 78} size={22} color={C.amber} o={ep(t, 1.4, 1.8)}>wait ⌈{retryAfter}⌉ s = {retryAfter * 1000} ms</Txt>
      <Pill x={xAt(retryAtMs) - 20} y={RY + 116} text="retry · 200" color={C.green} size={22} o={retry} />
      <Code x={M + 40} y={RY + 190} w={860} title="client-corrected.mjs" size={24} hi={[1, 3]} hiColor={C.green} lines={[
        'const s = Number(r.headers.get("retry-after"))',
        'const wait = Math.ceil(s) * 1000   // round UP',
        'retry = setTimeout(() => {',
        '  if (q === input) send(q, 1)      // max one',
        '}, wait)',
        'onInput: clearTimeout(retry)        // cancel',
      ]} o={ep(t, 1.8, 2.3)} />
      <Box x={M + 940} y={RY + 190} w={W - 2 * M - 980} h={230} accent={C.amber} dashed fill="transparent" o={ep(t, 5.2, 5.7)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>ACCURACY</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.3}}>Not every real 429 carries Retry-After; this client falls back to its own delay. The header may be delta-seconds or an HTTP-date; this fixture emits seconds. The policy is for an idempotent read — do not reuse it for state-changing requests.</div>
      </Box>
      <Obs t={t} at={5.8}>Observed from the local fixture: 429 at {firstDoneMs} ms with Retry-After {retryAfter} → retry at {retryAtMs} ms → {EV.retryRun.retryStatus}. Clock values are virtual fixture ms.</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 8. compare — real request logs side by side */
/* ------------------------------------------------------------------ */
const Compare: React.FC<SceneProps> = ({t}) => {
  const fl = EV.flawedLog.slice(0, 8).map(([n, q, a, s]) => ({t: `#${String(n).padStart(2, ' ')} ${q.padEnd(8)} ${a ? `retry${a}` : 'key   '} ${s}`, c: s === 429 ? C.red : C.green}));
  fl.push({t: `… 9 more, all 429 (${EV.flawed.requests} total)`, c: C.mute});
  const co = [{t: '# 1 postgres key    200', c: C.green}, {t: '(end of log)', c: C.mute}];
  const o1 = ep(t, 0.3, 0.8), o2 = ep(t, 0.9, 1.4);
  return (
    <>
      <Overline y={110}>Same scripted typing · "postgres", 80 ms per key · two clients</Overline>
      <Log x={M} y={160} w={820} size={22} title="request-log-flawed.json" lines={fl} shown={prog(t, 0.4, 3) * fl.length} />
      <Log x={M + 880} y={160} w={820} size={22} title="request-log-corrected.json" lines={co} shown={prog(t, 1.2, 1.8) * co.length} />
      <Readout x={M} y={540} w={270} label="requests" value={EV.flawed.requests} color={C.red} o={o1} />
      <Readout x={M + 270} y={540} w={270} label="429" value={EV.flawed.r429} color={C.red} o={o1} />
      <Badge x={M + 560} y={580} label="results for" value={`"${EV.flawed.shownFor}"`} color={C.amber} big o={o1} />
      <Readout x={M + 880} y={540} w={270} label="requests" value={EV.corrected.requests} color={C.green} o={o2} />
      <Readout x={M + 1150} y={540} w={270} label="429" value={EV.corrected.r429} color={C.green} o={o2} />
      <Badge x={M + 1440} y={580} label="results for" value={`"${EV.corrected.shownFor}"`} color={C.green} big o={o2} />
      <Txt x={M} y={740} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 3.2, 3.7)}>Same keystrokes, same server, same limiter. The difference is coordination on the client: debounce, sequence guard, abort, and a bounded Retry-After wait.</Txt>
      <Obs t={t} at={4}>Observed from the local fixture: both runs driven by the identical TYPING_SCRIPT in fixtures/ep16-rate-limit/evidence.json.</Obs>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 9. end */
/* ------------------------------------------------------------------ */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={84} o={ep(t, 0.2, 0.9)}>Coordinate the work.<br />Don't just repeat it faster.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Debouncing does not replace server-side rate limiting. This retry policy is for idempotent reads, not for requests that change state.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Fixed-window accounting and integer Retry-After are this fixture's design. The shared test identity is a harness, not production authentication. Loopback only.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, window: Window, retry_loop: RetryLoop, debounce: Debounce, stale: Stale, abort: Abort, retry_after: RetryAfter, compare: Compare, end: End};
