import React from 'react';
import {Arrow, Big, Box, Code, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Numbers below come from fixtures/ep14-upload-stages/evidence.json (demo run). */
const EV = {
  fileBytes: 82,
  bodyBytes: 232,
  overhead: 150,
  jobOk: 'job_89b35fbbbe7a',
  jobBad: 'job_a664e78fb5bf',
  rows: 3,
  total: '114.75',
  failReason: ['line 3: invalid email "not-an-email"', 'line 4: amount is not a number "lots"'],
  bodyBytesBad: 231,
  pollsOk: ['accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'ready'], // from evidence.json; the count of 'accepted' polls varies with scheduling
};

/* ---------- shared layout: four checkpoints across the frame ---------- */
const STAGE_NAMES = ['Transfer', 'Accepted', 'Processing', 'Available'];
const STAGE_SUB = ['request-body bytes', 'HTTP status', 'worker parses', 'result fetchable'];
const SX = (i: number) => M + 40 + i * 420; // left x of each checkpoint box
const SW = 330;
const SY = 300;
const SH = 150;
const cx = (i: number) => SX(i) + SW / 2;

type St = 'idle' | 'active' | 'pass' | 'fail' | 'warn';
const stCol = (s: St) => (s === 'pass' ? C.green : s === 'fail' ? C.red : s === 'active' ? C.cyan : s === 'warn' ? C.amber : C.mute);

const Checkpoints: React.FC<{states: St[]; o?: number; appear?: number; labels?: (string | undefined)[]}> = ({states, o = 1, appear = 1, labels = []}) => (
  <>
    {STAGE_NAMES.map((n, i) => {
      const ai = Math.min(1, Math.max(0, appear * 4 - i));
      const s = states[i] ?? 'idle';
      return (
        <React.Fragment key={n}>
          <Box x={SX(i)} y={SY} w={SW} h={SH} title={`${i + 1} · ${n}`} sub={labels[i] ?? STAGE_SUB[i]} accent={stCol(s)} o={o * ai} glow={s === 'active'} titleSize={30} />
          {i < 3 && (
            <Svg>
              <Arrow x1={SX(i) + SW + 8} y1={SY + SH / 2} x2={SX(i + 1) - 8} y2={SY + SH / 2} color={s === 'idle' ? C.mute : stCol(s)} o={o * ai} width={3} />
            </Svg>
          )}
        </React.Fragment>
      );
    })}
  </>
);

/* An illustrative progress bar (plain chrome; not any product's UI). */
const Bar: React.FC<{x: number; y: number; w: number; p: number; color?: string; label?: string; indeterminate?: boolean; o?: number}> = ({x, y, w, p, color = C.cyan, label, indeterminate = false, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o}}>
    <div style={{height: 22, borderRadius: 11, background: C.line, overflow: 'hidden', position: 'relative'}}>
      {indeterminate ? (
        <div style={{position: 'absolute', left: `${(p * 130) % 130 - 30}%`, width: '30%', height: '100%', background: color, borderRadius: 11}} />
      ) : (
        <div style={{width: `${Math.round(p * 100)}%`, height: '100%', background: color, borderRadius: 11}} />
      )}
    </div>
    {label && <div style={{marginTop: 10, fontFamily: 'Inter, "DejaVu Sans", sans-serif', fontSize: 26, color: C.dim}}>{label}</div>}
  </div>
);

/* 1. The bar says 100% but the file is not ready */
const Fail: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.2, 2.0);
  const pct = Math.round(p * 100);
  const wait = step(t, 2.2);
  return (
    <>
      <Box x={420} y={170} w={1080} h={560} accent={C.line} fill="#14171e">
        <div style={{display: 'flex', gap: 14, marginBottom: 20}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.6}} />)}
          <div style={{marginLeft: 20, color: C.mute, fontSize: 22, fontFamily: 'DejaVu Sans Mono'}}>http://127.0.0.1/ · illustrative uploader</div>
        </div>
        <div style={{fontSize: 34, fontWeight: 700, color: C.text, marginBottom: 30}}>orders.csv</div>
        <Bar x={24} y={150} w={1000} p={p} color={pct >= 100 ? C.green : C.cyan} label={`${pct}% uploaded`} />
        <div style={{position: 'absolute', left: 24, top: 290, fontSize: 30, color: C.amber, opacity: wait}}>
          <span style={{opacity: blink(t, 2.2, 1.0) ? 1 : 0.35}}>●</span> Waiting… file not ready
        </div>
        <div style={{position: 'absolute', left: 24, top: 360, fontSize: 26, color: C.mute, opacity: wait}}>result: 409 result not available</div>
      </Box>
      <Txt x={M} y={790} w={W - 2 * M} align="center" size={34} color={C.amber} o={ep(t, 3.6, 4.2)}>The bar was measuring something else.</Txt>
      <Txt x={M} y={870} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.4, 5)}>Observed from the local fixture: 100% of the request body sent, then GET /jobs/:id/result → 409</Txt>
    </>
  );
};

/* 2. Four stages */
const Stages: React.FC<SceneProps> = ({t}) => {
  const a = prog(t, 0.2, 2.6);
  const reveal = ep(t, 3.2, 3.8);
  return (
    <>
      <Overline y={120}>An upload is four stages</Overline>
      <Checkpoints states={['active', 'active', 'active', 'active']} appear={a} />
      <Txt x={SX(0)} y={SY + SH + 40} w={SW} size={24} color={C.dim} o={ep(t, 0.4, 0.8)}>Body leaves the browser.</Txt>
      <Txt x={SX(1)} y={SY + SH + 40} w={SW} size={24} color={C.dim} o={ep(t, 1.0, 1.4)}>Server answers with a status.</Txt>
      <Txt x={SX(2)} y={SY + SH + 40} w={SW} size={24} color={C.dim} o={ep(t, 1.6, 2.0)}>A worker parses the file.</Txt>
      <Txt x={SX(3)} y={SY + SH + 40} w={SW} size={24} color={C.dim} o={ep(t, 2.2, 2.6)}>The result can be fetched.</Txt>
      <Box x={SX(0) - 16} y={SY - 16} w={SW + 32} h={SH + 32} accent={C.amber} dashed fill="transparent" o={reveal} />
      <Txt x={M} y={640} w={W - 2 * M} align="center" size={34} color={C.amber} o={reveal}>The single bar only showed stage one.</Txt>
      <Txt x={M} y={720} w={W - 2 * M} align="center" size={26} color={C.dim} o={ep(t, 4.2, 4.8)}>Each stage is a separate fact, read from a separate place.</Txt>
    </>
  );
};

/* 3. Browser upload progress events */
const Progress: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 1.2, 3.4);
  const sent = Math.round(p * EV.bodyBytes);
  const pct = Math.round((sent / EV.bodyBytes) * 100);
  return (
    <>
      <Overline y={120}>Stage 1 · transfer · request-body bytes</Overline>
      <Code x={M} y={180} w={900} title="public/app.js · provided, not executed" size={26} hi={[1, 2]} hiColor={C.cyan} lines={[
        'xhr.upload.onprogress = (e) => {',
        '  if (!e.lengthComputable) return indeterminate();',
        '  pct = Math.round(e.loaded / e.total * 100);',
        '  // loaded = request body, overhead included',
        '};',
      ]} />
      <Box x={M + 960} y={180} w={672} h={260} accent={C.cyan} title="Request body" titleSize={28} o={ep(t, 0.3, 0.8)}>
        <div style={{marginTop: 14, display: 'flex', height: 54, borderRadius: 10, overflow: 'hidden', border: `2px solid ${C.line}`}}>
          <div style={{width: `${(75 / EV.bodyBytes) * 100}%`, background: C.amberDim, fontSize: 20, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>headers</div>
          <div style={{width: `${(EV.fileBytes / EV.bodyBytes) * 100}%`, background: C.cyanDim, fontSize: 20, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>file {EV.fileBytes} B</div>
          <div style={{flex: 1, background: C.amberDim, fontSize: 20, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>boundary</div>
        </div>
        <div style={{marginTop: 14, fontSize: 24, color: C.dim}}>{EV.fileBytes}-byte file → {EV.bodyBytes}-byte body ({EV.overhead} B multipart overhead)</div>
      </Box>
      <Bar x={M} y={560} w={W - 2 * M} p={p} color={pct >= 100 ? C.green : C.cyan} label={`${pct}% · ${sent} / ${EV.bodyBytes} bytes of request body sent`} />
      <Txt x={M} y={700} w={W - 2 * M} size={28} color={C.amber} o={ep(t, 3.6, 4.1)}>This is a transfer number. It is not a stored-file byte count and not a status.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.2, 4.7)}>Fixture-measured transfer bytes (Node client), includes multipart overhead. Browser page provided, not executed.</Txt>
    </>
  );
};

/* 4. The HTTP response arrives separately: 202 + job id */
const Accepted: React.FC<SceneProps> = ({t}) => {
  const tok = ep(t, 0.3, 1.4);
  const resp = ep(t, 1.6, 2.4);
  const tryResult = ep(t, 3.4, 4.0);
  return (
    <>
      <Overline y={120}>Stage 2 · acceptance · the HTTP status</Overline>
      <Checkpoints states={['pass', resp > 0.5 ? 'pass' : 'idle', 'idle', 'idle']} />
      <Token x1={cx(0) - 60} y1={SY + SH + 50} x2={cx(1) - 60} y2={SY + SH + 50} p={tok} text="body · 232 B" color={C.cyan} o={1 - resp} />
      <Pill x={cx(1) - 110} y={SY - 70} text="202 Accepted" color={C.green} o={resp} size={30} />
      <Code x={M} y={540} w={960} title="response body · observed" size={26} hi={[1, 4]} hiColor={C.amber} o={resp} lines={[
        '{ "accepted": true,',
        `  "jobId": "${EV.jobOk}",`,
        '  "status": "accepted",',
        `  "storedBytes": ${EV.fileBytes}, "requestBodyBytes": ${EV.bodyBytes},`,
        '  "resultUrl": null }',
      ]} />
      <Box x={M + 1020} y={540} w={708} h={130} title={`GET /jobs/${EV.jobOk}/result`} sub="409 · result not available · status accepted" accent={C.amber} titleSize={24} o={tryResult} />
      <Txt x={M + 1020} y={700} w={708} size={28} color={C.amber} o={tryResult}>Accepted ≠ processed. Stored and queued, nothing more.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.2, 4.8)}>Observed from the local fixture: POST /uploads → 202, then GET …/result → 409</Txt>
    </>
  );
};

/* 5. Follow the job into ready */
const Ready: React.FC<SceneProps> = ({t}) => {
  const n = EV.pollsOk.length;
  const shown = prog(t, 0.4, 3.0) * n;
  const done = shown >= n - 0.01;
  const lines = EV.pollsOk.map((s, i) => ({t: `GET /jobs/${EV.jobOk}  → 200  status: ${s}`, c: s === 'ready' ? C.green : C.dim}));
  const open = ep(t, 3.3, 3.9);
  const bob = ep(t, 4.6, 5.2);
  return (
    <>
      <Overline y={120}>Stages 3 and 4 · processing, then availability</Overline>
      <Checkpoints states={['pass', 'pass', done ? 'pass' : 'active', done ? 'pass' : 'idle']} labels={[undefined, undefined, done ? 'finished' : 'no percentage: unmeasured', done ? 'ready' : 'locked']} />
      <Log x={M} y={500} w={1040} title="polling the authorised status endpoint · as Alice" lines={lines} shown={shown} size={22} />
      <Box x={M + 1100} y={500} w={628} h={150} title={`GET …/${EV.jobOk}/result`} sub={`200 · rows ${EV.rows} · totalAmount ${EV.total}`} accent={C.green} titleSize={24} o={open} glow={open > 0.9} />
      <Box x={M + 1100} y={680} w={628} h={130} title="same job, as Bob" sub="404 · not found (not his, by policy)" accent={C.red} titleSize={24} o={bob} />
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 3.0, 3.5)}>Observed from the local fixture. Worker start was paced by a labelled 400 ms delay so the not-ready state could be polled; not a measured processing time.</Txt>
    </>
  );
};

/* 6. Fully transferred, accepted, then failed in processing */
const FailRows: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.2, 1.2);
  const acc = step(t, 1.5);
  const proc = step(t, 2.4);
  const failed = step(t, 3.4);
  return (
    <>
      <Overline y={120} color={C.red}>Same flow, different file</Overline>
      <Checkpoints states={[p >= 1 ? 'pass' : 'active', acc ? 'pass' : 'idle', failed ? 'fail' : proc ? 'active' : 'idle', failed ? 'fail' : 'idle']} labels={[undefined, acc ? '202 Accepted' : undefined, failed ? 'failed, with reason' : undefined, failed ? '409 · not available' : undefined]} />
      <Bar x={SX(0)} y={SY + SH + 40} w={SW} p={p} color={p >= 1 ? C.green : C.cyan} label={`${Math.round(p * 100)}% · ${EV.bodyBytesBad} B body`} />
      <Pill x={cx(1) - 80} y={SY + SH + 40} text={EV.jobBad} color={C.green} mono o={acc} />
      <Code x={M} y={580} w={1100} title={`GET /jobs/${EV.jobBad} · observed`} size={26} hi={[1, 2, 3]} hiColor={C.red} o={failed} lines={[
        '{ "status": "failed",',
        '  "reason": "validation failed:',
        `     ${EV.failReason[0]};`,
        `     ${EV.failReason[1]}" }`,
      ]} />
      <Box x={M + 1160} y={580} w={568} h={190} title="The bar had said 100%." sub="It was right about transfer. Transfer was never the question." accent={C.amber} titleSize={30} o={ep(t, 4.0, 4.6)} />
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.6, 5.1)}>Observed from the local fixture: 100% transferred → 202 → status failed → GET …/result 409</Txt>
    </>
  );
};

/* 7. Replace the single bar with stage-specific status */
const Fix: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {n: 'Transfer', v: '100% of request body sent (232 B, overhead included)', src: 'xhr.upload.onprogress, lengthComputable only', c: C.green, at: 0.6},
    {n: 'Accepted', v: '202 Accepted · job_89b35fbbbe7a', src: 'the HTTP status, read after the body', c: C.green, at: 1.3},
    {n: 'Processing', v: 'processing… (no percentage: none is measured)', src: 'GET /jobs/:id · authorised', c: C.amber, at: 2.0},
    {n: 'Available', v: 'result link appears only when status is ready', src: 'GET /jobs/:id/result · 200 only when ready', c: C.cyan, at: 2.7},
  ];
  const oldO = 1 - ep(t, 0.1, 0.5);
  return (
    <>
      <Overline y={120} color={C.green}>The fix · four statuses, not one bar</Overline>
      <Box x={M} y={180} w={W - 2 * M} h={90} accent={C.red} dashed fill="transparent" o={oldO}>
        <div style={{fontSize: 26, color: C.red, textDecoration: 'line-through'}}>100% uploaded</div>
      </Box>
      {rows.map((r, i) => (
        <Box key={r.n} x={M} y={190 + i * 130} w={W - 2 * M} h={112} accent={r.c} o={ep(t, r.at, r.at + 0.5)} titleSize={26} title={`${i + 1} · ${r.n}`} sub={r.v}>
          <div style={{position: 'absolute', right: 24, top: 22, fontSize: 22, color: C.mute, textAlign: 'right', width: 620}}>source: {r.src}</div>
        </Box>
      ))}
      <Box x={M} y={720} w={W - 2 * M} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 3.8, 4.4)}>
        <div style={{fontSize: 26, color: C.amber, fontWeight: 700, letterSpacing: 2}}>LIMIT</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>Parsing and row validation are not malware scanning. "Ready" means the CSV parsed; it is not a security verdict.</div>
      </Box>
    </>
  );
};

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={330} align="center" size={84} o={ep(t, 0.2, 0.9)}>Bytes transferred is not<br />the same as work completed.</Big>
    <Txt x={M} y={620} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>Transfer, acceptance, processing and availability are four facts. Show each one from its own source.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3)}>Local fixture, loopback only, synthetic data. No restart persistence. Browser uploader provided, not executed.</Txt>
  </>
);

export const scenes = {fail: Fail, stages: Stages, progress: Progress, accepted: Accepted, ready: Ready, fail_rows: FailRows, fix: Fix, end: End};
