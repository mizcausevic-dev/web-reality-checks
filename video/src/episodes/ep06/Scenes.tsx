import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Readout, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ---------- Values below come from fixtures/ep06-prompt-to-answer/evidence.json (node demo.mjs) ---------- */
const EV = {
  question: 'How many open support tickets are high priority?',
  count: 5, // org_acme open+high
  allOrgs: 13, // open+high across all orgs
  byOrg: [{org: 'org_acme', n: 5}, {org: 'org_globex', n: 6}, {org: 'org_initech', n: 2}],
  tickets: 120,
  reqId: 'req_7d7ac48d7b5f', // happy-path run
  reqIdFail: 'req_4685a9bbcf7a', // failure run
  answer: 'There are 5 open high-priority support tickets in your organisation.',
  failAnswer: 'I could not retrieve the ticket count right now: the ticket store did not respond. No count is available.',
};

/* Five lanes: UI, Application, Model API, Tool executor, Data store */
const LY = {ui: 150, app: 300, model: 450, tool: 600, data: 750} as const;
const LH = 140;
type LaneKey = keyof typeof LY;
const LABEL: Record<LaneKey, string> = {ui: 'User interface', app: 'Application', model: 'Model API', tool: 'Tool executor', data: 'Data store'};
const LaneStack: React.FC<{t: number; highlight?: LaneKey[]; stagger?: boolean}> = ({t, highlight = [], stagger = false}) => (
  <>
    {(Object.keys(LY) as LaneKey[]).map((k, i) => (
      <Lane key={k} y={LY[k]} h={LH} label={LABEL[k]} accent={highlight.includes(k) ? C.cyan : C.mute} o={stagger ? ep(t, 0.15 * i, 0.15 * i + 0.4) : 1} />
    ))}
  </>
);
const ReqId: React.FC<{x: number; y: number; o?: number; id?: string}> = ({x, y, o = 1, id = EV.reqId}) => <Pill x={x} y={y} text={id} color={C.violet} mono o={o} size={22} />;
const SimNote: React.FC<{x: number; y: number; o?: number; w?: number}> = ({x, y, o = 1, w = 520}) => (
  <Txt x={x} y={y} w={w} size={22} color={C.amber} o={o} weight={700}>SIMULATED MODEL RESPONSE · deterministic mock, no real model API</Txt>
);

/* 1. The question and the number */
const Ask: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.6);
  const ans = ep(t, 1.2, 1.8);
  const gap = ep(t, 3.4, 4.0);
  return (
    <>
      <Box x={360} y={170} w={1160} h={380} accent={C.line} o={o} fill="#14171e">
        <div style={{color: C.mute, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20}}>Illustrative assistant window · local fixture</div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 26}}>
          <div style={{maxWidth: 820, padding: '16px 24px', borderRadius: 16, background: `${C.cyan}22`, border: `2px solid ${C.cyanDim}`, fontSize: 30, color: C.text}}>{EV.question}</div>
        </div>
        <div style={{display: 'flex', opacity: ans}}>
          <div style={{maxWidth: 900, padding: '16px 24px', borderRadius: 16, background: '#1a1e27', border: `2px solid ${C.line}`, fontSize: 30, color: C.text}}>{EV.answer}</div>
        </div>
        <div style={{marginTop: 18, fontSize: 22, color: C.amber, opacity: ans, fontWeight: 700}}>SIMULATED MODEL RESPONSE</div>
      </Box>
      <Readout x={1560} y={250} label="answer" value={EV.count} color={C.green} o={ans} w={240} />
      <Svg>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} opacity={gap}>
            <rect x={360 + i * 246} y={640} width={220} height={74} rx={12} fill={C.panel} stroke={i === 2 ? C.amber : C.mute} strokeWidth={3} />
            <text x={470 + i * 246} y={686} fill={i === 2 ? C.amber : C.text} fontSize={26} fontWeight={700} fontFamily="Inter, sans-serif" textAnchor="middle">{['UI', 'Application', 'Model', 'Tool', 'Data'][i]}</text>
            {i < 4 && <line x1={580 + i * 246} y1={677} x2={606 + i * 246} y2={677} stroke={C.mute} strokeWidth={4} />}
          </g>
        ))}
      </Svg>
      <Txt x={M} y={760} w={W - 2 * M} align="center" size={32} color={C.amber} o={gap}>Between the question and the number sit several parts. The model is only one of them.</Txt>
      <Txt x={M} y={830} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.2, 4.8)}>Observed from the local fixture: run "happy" → count 5. One application design, not every AI request.</Txt>
    </>
  );
};

/* 2. The application assembles messages + tool definitions */
const Assemble: React.FC<SceneProps> = ({t}) => {
  const a = ep(t, 1.0, 1.4), b = ep(t, 1.6, 2.0), c = ep(t, 2.2, 2.6);
  const send = ep(t, 3.4, 4.4);
  return (
    <>
      <Overline y={110}>Step 1 · the application assembles the request</Overline>
      <LaneStack t={t} stagger highlight={['app']} />
      <Pill x={M + 60} y={LY.ui + 66} text={EV.question} color={C.cyanDim} o={ep(t, 0.6, 1.0)} size={24} />
      <ReqId x={1480} y={LY.ui + 66} o={ep(t, 0.8, 1.2)} />
      <Box x={M + 60} y={LY.app + 50} w={300} h={78} title="system message" titleSize={24} accent={C.cyan} o={a} />
      <Box x={M + 390} y={LY.app + 50} w={330} h={78} title="user · the question" titleSize={24} accent={C.cyan} o={b} />
      <Box x={M + 750} y={LY.app + 50} w={560} h={78} title="tool def · countTickets(status, priority)" titleSize={24} accent={C.amber} o={c} />
      <Code x={1430} y={LY.model + 10} w={394} size={22} title="tool-schema.json" o={c} lines={[
        '"status":   enum [open,',
        '            pending, closed]',
        '"priority": enum [low,',
        '            normal, high]',
        'additionalProperties: false',
      ]} />
      <Svg>
        <Arrow x1={700} y1={LY.app + 134} x2={700} y2={LY.model + 60} p={send} label="messages + 1 tool definition" />
      </Svg>
      <Txt x={M + 60} y={LY.model + 70} w={700} size={26} color={C.dim} o={ep(t, 4.4, 4.9)}>Nothing else is offered. The model can only ask for what is listed here.</Txt>
    </>
  );
};

/* 3. Simulated model response: a structured tool request */
const ToolCall: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 1.4, 2.6);
  return (
    <>
      <Overline y={110} color={C.amber}>Step 2 · the model requests a tool</Overline>
      <LaneStack t={t} highlight={['model']} />
      <Box x={M + 60} y={LY.model + 46} w={600} h={86} accent={C.amber} o={ep(t, 0.3, 0.8)} fill="#1c1710">
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>SIMULATED MODEL RESPONSE · type: tool_call</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 4}}>Not an answer. A request, with structured arguments.</div>
      </Box>
      <Token x1={M + 700} y1={LY.model + 64} x2={M + 700} y2={LY.app + 64} p={p} text='countTickets({status:"open", priority:"high"})' color={C.amber} o={ep(t, 1.2, 1.5)} />
      <ReqId x={1570} y={LY.model + 66} />
      <ReqId x={1570} y={LY.app + 66} o={step(p, 0.99)} />
      <Box x={M + 60} y={LY.tool + 46} w={1100} h={84} accent={C.mute} dashed fill="transparent" o={ep(t, 3.2, 3.7)}>
        <div style={{fontSize: 24, color: C.dim}}>Shown: the request the API returned. Not shown: any private model reasoning. This episode depicts observable steps only.</div>
      </Box>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 3.8, 4.3)}>Observed in trace.json: lane "model", event "response.received", simulated: true, name "countTickets"</Txt>
    </>
  );
};

/* 4. Validate tool name + arguments */
const Validate: React.FC<SceneProps> = ({t}) => {
  const s = (i: number): 'pass' | 'pending' => (t > 1.0 + i * 0.5 ? 'pass' : 'pending');
  return (
    <>
      <Overline y={110} color={C.green}>Step 3 · validate against the schema</Overline>
      <Gate x={M} y={180} w={760} title="Application · tool call check" accent={C.green} checks={[
        {label: 'Tool "countTickets" is offered', state: s(0)},
        {label: 'status "open" is in the enum', state: s(1)},
        {label: 'priority "high" is in the enum', state: s(2)},
        {label: 'No unexpected keys', state: s(3)},
      ]} />
      <Code x={M + 820} y={180} w={908} size={24} title="app.mjs · validateToolCall" lines={[
        'const def = tools.find(t => t.name',
        '                 === call.name);',
        'if (!def) return ["not offered"];',
        'return validate(def.parameters,',
        '                call.args);',
      ]} />
      <Box x={M + 820} y={460} w={908} h={100} accent={C.red} o={ep(t, 3.4, 3.9)} fill="#1c1012">
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.red, fontFamily: 'DejaVu Sans Mono'}}>runSql(…)</span> <span style={{color: C.mute}}>→ not offered → refused.</span> <span style={{color: C.red, fontFamily: 'DejaVu Sans Mono'}}>priority:"urgent"</span> <span style={{color: C.mute}}>→ refused.</span></div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 6}}>Nothing executes on a refused call. toolCalls: 0.</div>
      </Box>
      <Pill x={M} y={600} text="VALID → continue" color={C.green} o={ep(t, 3.0, 3.4)} size={28} />
      <Txt x={M} y={700} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 4.2, 4.7)}>The check runs in the application, on the model's output, before anything touches a tool.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.8, 5.3)}>Observed from the local fixture: tests "validator…", "unknown tool…", "invalid arguments…" pass; refused calls execute nothing.</Txt>
    </>
  );
};

/* 5. Enforce the user's data scope outside the model */
const Scope: React.FC<SceneProps> = ({t}) => {
  const claim = ep(t, 1.6, 2.1);
  const reject = step(t, 2.8);
  const flow = ep(t, 3.4, 4.2);
  return (
    <>
      <Overline y={110} color={C.cyan}>Step 4 · whose tickets? scope comes from the session</Overline>
      <Box x={M} y={180} w={760} h={150} title="Server-side session" sub="user u_alice (synthetic) · orgId: org_acme" accent={C.cyan} glow={t > 0.8} />
      <Badge x={M + 30} y={280} label="scope" value="orgId = org_acme" color={C.cyan} o={ep(t, 0.8, 1.2)} />
      <Box x={M + 820} y={180} w={908} h={200} title="Model-supplied arguments" sub="SIMULATED MODEL RESPONSE · scope probe variant" accent={C.amber} />
      <Pill x={M + 850} y={290} text='{status:"open", priority:"high",' color={C.amber} mono o={claim} size={22} />
      <Pill x={M + 850} y={334} text=' accountId:"org_globex"}' color={reject ? C.red : C.amber} mono o={claim} size={22} />
      <Txt x={M + 1270} y={336} w={430} size={24} color={C.red} weight={700} o={reject}>✕ not permitted → refused</Txt>
      <Gate x={M + 820} y={420} w={908} title="Scope decision" accent={C.cyan} checks={[
        {label: 'orgId taken from the session', state: t > 3.0 ? 'pass' : 'pending'},
        {label: 'accountId from the model used as scope', state: t > 3.0 ? 'missing' : 'pending'},
      ]} />
      <Svg>
        <Arrow x1={M + 380} y1={340} x2={M + 380} y2={760} p={flow} label="scope → tool, as a separate argument" />
      </Svg>
      <Pill x={M} y={780} text="countTickets(scope={orgId:org_acme}, {status, priority})" color={C.cyanDim} mono o={ep(t, 4.0, 4.4)} size={22} />
      <Txt x={M + 820} y={700} w={908} size={24} color={C.dim} o={ep(t, 4.4, 4.9)}>Three layers: schema forbids extra keys; stripScopeClaims ignores scope-like keys anyway; the tool refuses to run unscoped.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 5.0, 5.5)}>Observed from the local fixture: run "scope_probe" → refused, toolCalls 0. Control test: trusting accountId would have returned org_globex's 6, not 5.</Txt>
    </>
  );
};

/* 6. The tool queries the synthetic tickets */
const Query: React.FC<SceneProps> = ({t}) => {
  const go = ep(t, 0.8, 1.8);
  const n = Math.round(prog(t, 2.2, 4.0) * EV.count);
  return (
    <>
      <Overline y={110}>Step 5 · the tool runs: narrow, read-only</Overline>
      <LaneStack t={t} highlight={['tool', 'data']} />
      <Pill x={M + 60} y={LY.tool + 60} text="countTickets · read-only · no SQL" color={C.cyan} o={ep(t, 0.2, 0.6)} size={24} />
      <ReqId x={1570} y={LY.tool + 66} />
      <Token x1={M + 560} y1={LY.tool + 60} x2={M + 560} y2={LY.data + 60} p={go} text='filter {orgId:"org_acme", status:"open", priority:"high"}' color={C.cyan} o={ep(t, 0.6, 0.9)} />
      <Box x={M + 60} y={LY.data + 50} w={420} h={80} title={`tickets.json · ${EV.tickets} synthetic tickets`} titleSize={24} sub="seeded, 3 orgs" accent={C.mute} />
      <Readout x={1360} y={LY.data - 10} label="matched in org_acme" value={n} color={C.green} o={ep(t, 2.0, 2.4)} w={340} />
      <Code x={M + 300} y={LY.ui + 46} w={760} size={22} title="tools.mjs · the whole query" lines={[
        'tickets.filter(t =>',
        '  t.orgId    === scope.orgId &&',
        '  t.status   === args.status &&',
        '  t.priority === args.priority).length',
      ]} />
      <Box x={M + 1100} y={LY.ui + 46} w={628} h={120} accent={C.amber} dashed fill="transparent" o={ep(t, 2.6, 3.1)}>
        <div style={{fontSize: 24, color: C.text}}>Two allowed filters plus the session's org. No query string, no SQL path exists to expose.</div>
      </Box>
      <Txt x={M + 60} y={LY.model + 60} w={1000} size={26} color={C.dim} o={ep(t, 3.6, 4.1)}>The model lane is idle here. The model never opens the data store; the application does, through this function.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.4, 4.9)}>Observed from the local fixture: data.query filter {'{orgId: org_acme, status: open, priority: high}'} → count 5</Txt>
    </>
  );
};

/* 7. Structured result returns: data → tool → app → model */
const Result: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.4, 1.2), p2 = ep(t, 1.4, 2.2), p3 = ep(t, 2.6, 3.4);
  const X = 760;
  return (
    <>
      <Overline y={110} color={C.green}>Step 6 · a structured result travels back</Overline>
      <LaneStack t={t} highlight={['tool', 'app', 'model']} />
      <Token x1={X} y1={LY.data + 60} x2={X} y2={LY.tool + 60} p={p1} text='{count: 5, filters, scope}' color={C.green} />
      <Token x1={X} y1={LY.tool + 60} x2={X} y2={LY.app + 60} p={p2} text='{count: 5, filters, scope}' color={C.green} o={step(p1, 0.99)} />
      <Token x1={X} y1={LY.app + 60} x2={X} y2={LY.model + 60} p={p3} text='role: tool · content: {count: 5}' color={C.green} o={step(p2, 0.99)} />
      {(['data', 'tool', 'app', 'model'] as LaneKey[]).map((k, i) => <ReqId key={k} x={1480} y={LY[k] + 66} o={ep(t, 0.2 + i * 0.8, 0.6 + i * 0.8)} />)}
      <Txt x={1480} y={LY.ui + 70} w={330} size={24} color={C.violet} o={ep(t, 3.2, 3.7)}>one opaque request id, every step</Txt>
      <Box x={M + 60} y={LY.model + 46} w={560} h={84} accent={C.amber} o={ep(t, 3.4, 3.9)} fill="#1c1710">
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700}}>SIMULATED MODEL RESPONSE · turn 2</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 4}}>The model now sees the tool result as a message.</div>
      </Box>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.0, 4.5)}>Observed from the local fixture: toolresult.returned_to_model · callId call_1 · count 5 · requestId {EV.reqId}</Txt>
    </>
  );
};

/* 8. Final answer with the actual computed count */
const Answer: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0.2, 0.8);
  const bars = ep(t, 2.2, 3.2);
  const maxN = 6;
  return (
    <>
      <Overline y={110} color={C.green}>Step 7 · the final answer embeds the computed count</Overline>
      <Box x={M} y={180} w={1000} h={190} accent={C.green} o={o} fill="#14171e">
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 2}}>SIMULATED MODEL RESPONSE · type: text</div>
        <div style={{fontSize: 32, color: C.text, marginTop: 14, lineHeight: 1.3}}>{EV.answer}</div>
      </Box>
      <Readout x={1240} y={180} label="shown to this user" value={EV.count} color={C.green} o={o} w={480} />
      <Txt x={M} y={420} w={1000} size={26} color={C.dim} o={ep(t, 1.2, 1.7)}>The number is copied from the tool result. The mock never invents it; a real application should check the same.</Txt>
      <Overline y={520} color={C.dim}>open + high priority, by organisation · seeded fixture</Overline>
      {EV.byOrg.map((b, i) => {
        const w = (b.n / maxN) * 900 * bars;
        const mine = b.org === 'org_acme';
        return (
          <React.Fragment key={b.org}>
            <Txt x={M} y={580 + i * 70} w={260} size={26} color={mine ? C.text : C.dim} weight={mine ? 700 : 500} mono>{b.org}</Txt>
            <div style={{position: 'absolute', left: M + 280, top: 582 + i * 70, width: w, height: 34, borderRadius: 8, background: mine ? C.green : C.mute, opacity: mine ? 1 : 0.5}} />
            <Txt x={M + 300 + w} y={580 + i * 70} w={120} size={26} color={mine ? C.green : C.dim} weight={700} o={bars}>{b.n}</Txt>
          </React.Fragment>
        );
      })}
      <Box x={1280} y={570} w={524} h={180} accent={C.cyan} o={ep(t, 3.4, 3.9)}>
        <div style={{fontSize: 26, color: C.text}}><span style={{color: C.cyan, fontWeight: 800, fontSize: 40}}>{EV.allOrgs}</span> across all organisations.</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 8}}><span style={{color: C.green, fontWeight: 800, fontSize: 40}}>{EV.count}</span> visible to this user.</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 8}}>Scope was decided by the session, not the model.</div>
      </Box>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 4.2, 4.7)}>Observed from the local fixture: byOrg org_acme 5 · org_globex 6 · org_initech 2 · openHighAllOrgs 13</Txt>
    </>
  );
};

/* 9. Replay with a failing tool: one bounded retry, then an honest failure */
const Fail: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: `$ node demo.mjs   # run "failure" · ${EV.reqIdFail}`, c: C.mute},
    {t: 'tool   execute   attempt 1  countTickets', c: C.text},
    {t: 'tool   error     attempt 1  transient: true', c: C.red},
    {t: 'app    retry.scheduled  attempt 2 (read-only, idempotent)', c: C.amber},
    {t: 'tool   execute   attempt 2  countTickets', c: C.text},
    {t: 'tool   error     attempt 2  transient: true', c: C.red},
    {t: 'app    answer.failure  fabricatedCount: false', c: C.amber},
    {t: 'model  (not called again — nothing to invent from)', c: C.mute},
  ];
  const shown = prog(t, 0.3, 4.2) * lines.length;
  const done = step(t, 4.4);
  return (
    <>
      <Overline y={110} color={C.red}>Replay · the ticket store fails</Overline>
      <Log x={M} y={170} w={1080} lines={lines} shown={shown} title="Executed · trace.json (sanitized)" size={23} />
      <Readout x={1260} y={190} label="count available" value="—" color={C.red} o={done} w={480} />
      <Box x={1220} y={400} w={604} h={170} accent={C.red} o={done} fill="#1c1012">
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700}}>SIMULATED · honest failure message</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 8, lineHeight: 1.3}}>{EV.failAnswer}</div>
      </Box>
      <Box x={M} y={600} w={W - 2 * M} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 4.8, 5.3)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>WHY ONE RETRY IS SAFE HERE, AND NOT IN GENERAL</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 8}}>Counting is read-only and idempotent: running it twice changes nothing. A state-changing tool (create, update, charge) can duplicate its effect on retry and needs idempotency keys or no automatic retry.</div>
      </Box>
      <Txt x={M} y={880} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, 5.2, 5.7)}>Observed from the local fixture: run "failure" → ok false · count null · toolCalls 2 · modelCalls 1 · answer contains no digits</Txt>
    </>
  );
};

/* 10. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>The model requests the tool.<br />The application controls execution.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>One application design, not every AI request. Validation, scope, execution and retry policy all live outside the model.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 2.4, 3.0)}>Deterministic mock model, synthetic tickets, local fixture. No real model API was called; no private reasoning was depicted.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, assemble: Assemble, toolcall: ToolCall, validate: Validate, scope: Scope, query: Query, result: Result, answer: Answer, fail: Fail, end: End};
