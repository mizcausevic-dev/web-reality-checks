import React from 'react';
import {Arrow, Big, Box, Code, Overline, Pill, Svg, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, step, window as win} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Evidence (copied from fixtures/ep09-keyboard-form/evidence.json)    */
/* ------------------------------------------------------------------ */
const EV = {
  flawed: {tabStops: 3, submitReachable: false, labelled: '0/3', outlineNone: 2},
  corrected: {tabStops: 4, submitReachable: true, labelled: '3/3', outlineNone: 0, firstInvalid: 'email', keystrokes: 7},
  invalid: {name: 'Dana Okafor', email: 'dana.okafor@example', password: 'short1'},
  valid: {name: 'Dana Okafor', email: 'dana.okafor@example.test', password: 'correct-horse-9'},
  errors: {email: 'That email address does not look right.', password: 'Password must be at least 8 characters.'},
};

/* ------------------------------------------------------------------ */
/* Illustrative form geometry (1920×1080 frame)                        */
/* ------------------------------------------------------------------ */
const CARD = {x: 250, y: 150, w: 580, h: 690};
const PAD = 32;
const INPUT_W = CARD.w - 2 * PAD;
const fieldTop = (i: number) => CARD.y + 130 + i * 140;
const G = {
  label: (i: number) => ({x: CARD.x + PAD, y: fieldTop(i), w: INPUT_W, h: 30}),
  input: (i: number) => ({x: CARD.x + PAD, y: fieldTop(i) + 36, w: INPUT_W, h: 60}),
  error: (i: number) => ({x: CARD.x + PAD, y: fieldTop(i) + 104, w: INPUT_W, h: 26}),
  button: {x: CARD.x + PAD, y: fieldTop(3), w: INPUT_W, h: 60},
  chrome: {x: CARD.x + PAD, y: CARD.y + 14, w: INPUT_W, h: 26},
};
const FIELDS = ['Full name', 'Email address', 'Password'];
const PLACEHOLDERS = ['Full name', 'Email address', 'Password (8+ characters)'];
const RX = 860; // right-hand panel x
const RW = W - M - RX; // right-hand panel width (964)

type FormState = {
  variant: 'flawed' | 'corrected';
  labels?: boolean;
  values?: string[];
  errors?: (string | null)[];
  invalid?: boolean[];
  focus?: number | null; // 0..2 inputs, 3 button, -1 focus left the form (chrome), null nothing
  ring?: boolean; // the visible focus indicator (corrected only)
  spotlight?: boolean; // the restrained "true focus position" spotlight
  status?: string;
  o?: number;
  hint?: boolean;
};

const focusRect = (f: number) => (f === 3 ? G.button : f === -1 ? G.chrome : G.input(f));

/** Illustrative re-creation of the fixture form. Plain Box chrome, not a real product. */
const FormCard: React.FC<FormState> = ({variant, labels = false, values = ['', '', ''], errors = [null, null, null], invalid = [false, false, false], focus = null, ring = false, spotlight = true, status, o = 1, hint = false}) => {
  const fr = focus !== null && focus !== undefined ? focusRect(focus) : null;
  return (
    <div style={{opacity: o}}>
      {/* spotlight: a soft, restrained glow that shows where focus really is */}
      {fr && spotlight && (
        <div style={{position: 'absolute', left: fr.x + fr.w / 2 - 360, top: fr.y + fr.h / 2 - 140, width: 720, height: 280, borderRadius: '50%', background: `radial-gradient(closest-side, ${C.cyan}33, ${C.cyan}00)`, pointerEvents: 'none'}} />
      )}
      <Box x={CARD.x} y={CARD.y} w={CARD.w} h={CARD.h} accent={C.line} fill="#e9e8e3">
        <div style={{position: 'absolute', left: PAD, top: 14, display: 'flex', gap: 10, alignItems: 'center', height: 26}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.55}} />)}
          <div style={{marginLeft: 14, color: '#6b6a66', fontSize: 18, fontFamily: F.mono}}>127.0.0.1 · {variant}/index.html</div>
        </div>
        <div style={{position: 'absolute', left: PAD, top: 62, fontSize: 32, fontWeight: 800, color: '#1b1d22'}}>Create your account</div>
      </Box>
      {FIELDS.map((name, i) => {
        const inp = G.input(i);
        const lab = G.label(i);
        const err = G.error(i);
        const v = values[i] ?? '';
        const shown = i === 2 ? '•'.repeat(v.length) : v;
        const focused = focus === i;
        const isInvalid = invalid[i];
        return (
          <React.Fragment key={name}>
            {labels && <div style={{position: 'absolute', left: lab.x, top: lab.y, fontSize: 24, fontWeight: 700, color: '#1b1d22', fontFamily: F.sans, lineHeight: '30px'}}>{name}</div>}
            <div style={{position: 'absolute', left: inp.x, top: inp.y, width: inp.w, height: inp.h, boxSizing: 'border-box', borderRadius: 12, background: '#ffffff', border: isInvalid ? '3px solid #c0392b' : '2px solid #cfd2d8', outline: focused && ring ? `4px solid ${C.cyan}` : 'none', outlineOffset: 3, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 26, fontFamily: F.sans, color: v ? '#1b1d22' : '#9a9a96'}}>
              {v ? shown : labels ? '' : PLACEHOLDERS[i]}
              {focused && <span style={{marginLeft: 2, width: 2, height: 32, background: '#1b1d22', display: 'inline-block'}} />}
            </div>
            {hint && i === 2 && !errors[i] && <div style={{position: 'absolute', left: err.x, top: err.y, fontSize: 21, color: '#6b7280', fontFamily: F.sans}}>At least 8 characters.</div>}
            {errors[i] && <div style={{position: 'absolute', left: err.x, top: err.y, fontSize: 21, color: '#c0392b', fontFamily: F.sans, fontWeight: 600}}>{errors[i]}</div>}
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: G.button.x, top: G.button.y, width: G.button.w, height: G.button.h, boxSizing: 'border-box', borderRadius: 12, background: '#2d6cdf', color: '#fff', fontSize: 26, fontWeight: 700, fontFamily: F.sans, display: 'flex', alignItems: 'center', justifyContent: 'center', outline: focus === 3 && ring ? `4px solid ${C.cyan}` : 'none', outlineOffset: 3}}>
        Create account
      </div>
      {status && <div style={{position: 'absolute', left: G.button.x, top: G.button.y + 74, width: G.button.w, fontSize: 22, color: '#166534', fontFamily: F.sans, fontWeight: 600}}>{status}</div>}
    </div>
  );
};

/** Keystroke overlay: chips revealed up to `shown`; the latest chip is lit. */
const Keys: React.FC<{x: number; y: number; keys: string[]; shown: number; results?: (string | undefined)[]; o?: number}> = ({x, y, keys, shown, results = [], o = 1}) => {
  const n = Math.min(keys.length, Math.floor(shown));
  return (
    <div style={{position: 'absolute', left: x, top: y, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: o, flexWrap: 'wrap', width: RW}}>
      {keys.slice(0, n).map((k, i) => {
        const last = i === n - 1;
        const r = results[i];
        return (
          <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            <div style={{padding: '8px 18px', minWidth: 70, textAlign: 'center', borderRadius: 10, border: `3px solid ${last ? C.cyan : C.mute}`, background: last ? `${C.cyan}22` : C.panel, color: last ? C.text : C.dim, fontFamily: F.mono, fontSize: 26, fontWeight: 700, boxShadow: last ? `0 4px 0 ${C.cyanDim}` : `0 4px 0 ${C.line}`}}>{k}</div>
            {r && <div style={{fontSize: 18, color: r.startsWith('✕') ? C.red : r.startsWith('✓') ? C.green : C.amber, fontFamily: F.sans, fontWeight: 600, maxWidth: 120, textAlign: 'center', lineHeight: 1.15}}>{r}</div>}
          </div>
        );
      })}
    </div>
  );
};

/** Bracket connector drawn on the left of the card between two rects (label↔control, error↔control). */
const Connector: React.FC<{a: {x: number; y: number; h: number}; b: {x: number; y: number; h: number}; color: string; p: number; tag?: string}> = ({a, b, color, p, tag}) => {
  const x = a.x - 16;
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  const ey = y1 + (y2 - y1) * p;
  return (
    <g opacity={Math.min(1, p * 3)}>
      <line x1={x} y1={y1} x2={a.x - 4} y2={y1} stroke={color} strokeWidth={3} />
      <line x1={x} y1={y1} x2={x} y2={ey} stroke={color} strokeWidth={3} />
      {p > 0.95 && <line x1={x} y1={y2} x2={b.x - 4} y2={y2} stroke={color} strokeWidth={3} markerEnd={`url(#arr-${color.slice(1)})`} />}
      {tag && p > 0.95 && <text x={x - 10} y={(y1 + y2) / 2 + 8} fill={color} fontFamily={F.mono} fontSize={18} fontWeight={700} textAnchor="end">{tag}</text>}
    </g>
  );
};

const Note: React.FC<{t: number; at: number; children: React.ReactNode}> = ({t, at, children}) => (
  <Txt x={M} y={858} w={W - 2 * M} align="center" size={24} color={C.dim} o={ep(t, at, at + 0.5)}>{children}</Txt>
);

/* ------------------------------------------------------------------ */
/* 1. The polished form, as a static screenshot                        */
/* ------------------------------------------------------------------ */
const Polished: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.6);
  return (
    <>
      <FormCard variant="flawed" o={o} spotlight={false} />
      <Pill x={CARD.x} y={CARD.y - 46} text="STATIC SCREENSHOT" color={C.mute} size={20} o={o} />
      <Overline x={RX} y={160} o={ep(t, 0.6, 1)}>What a screenshot shows</Overline>
      {['Clean spacing and alignment', 'A clear primary button', 'Three tidy fields', 'Placeholder text in each'].map((s, i) => (
        <Txt key={s} x={RX} y={220 + i * 56} w={RW} size={30} color={C.text} o={ep(t, 0.9 + i * 0.3, 1.3 + i * 0.3)}>{'✓  ' + s}</Txt>
      ))}
      <Box x={RX} y={500} w={RW} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 3.2, 3.8)}>
        <div style={{fontSize: 24, color: C.amber, fontWeight: 700, letterSpacing: 2}}>WHAT IT CANNOT SHOW</div>
        <div style={{fontSize: 28, color: C.text, marginTop: 8}}>Where focus is. Whether the button can be reached. What each field is called.</div>
      </Box>
      <Txt x={RX} y={700} w={RW} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>Illustrative re-creation of the local fixture, not a real product.</Txt>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 2. Remove the pointer, start the keyboard test                      */
/* ------------------------------------------------------------------ */
const Keyboard: React.FC<SceneProps> = ({t}) => {
  const pointerO = 1 - ep(t, 1.2, 2.0);
  const tabAt = 2.8;
  const focused = step(t, tabAt) ? 0 : null;
  return (
    <>
      <FormCard variant="flawed" focus={focused} ring={false} />
      {/* illustrative pointer, struck through and removed */}
      <div style={{position: 'absolute', left: 560, top: 690, opacity: pointerO, transform: `translateY(${(1 - pointerO) * 40}px)`}}>
        <svg width="60" height="80" viewBox="0 0 60 80"><path d="M8 4 L8 62 L22 48 L34 76 L44 71 L32 44 L52 44 Z" fill={C.text} stroke={C.bg} strokeWidth={3} /></svg>
      </div>
      <Svg>
        <line x1={540} y1={680} x2={640} y2={790} stroke={C.red} strokeWidth={8} strokeLinecap="round" opacity={win(t, 0.6, 2.2)} />
      </Svg>
      <Overline x={RX} y={160} color={C.amber} o={ep(t, 0.4, 0.9)}>Keyboard-only test</Overline>
      <Txt x={RX} y={210} w={RW} size={34} color={C.text} o={ep(t, 0.8, 1.3)}>No pointer. Only Tab, Shift+Tab, Enter and Space.</Txt>
      <Keys x={RX} y={320} keys={['Tab']} shown={step(t, tabAt)} />
      <Txt x={RX} y={440} w={RW} size={28} color={C.cyan} o={ep(t, tabAt + 0.3, tabAt + 0.8)}>The spotlight marks where focus actually is.</Txt>
      <Txt x={RX} y={490} w={RW} size={28} color={C.amber} o={ep(t, tabAt + 1.0, tabAt + 1.5)}>The user sees nothing: no ring, no border change.</Txt>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Invisible focus, unreachable control                             */
/* ------------------------------------------------------------------ */
const Fail: React.FC<SceneProps> = ({t}) => {
  const keys = ['Tab', 'Tab', 'Tab', 'Tab', 'Enter', 'Space'];
  const times = [0.4, 1.1, 1.8, 2.7, 3.9, 4.7];
  const shown = times.filter((x) => t >= x).length;
  const focus = shown === 0 ? null : shown <= 3 ? shown - 1 : -1;
  const results: (string | undefined)[] = [undefined, undefined, undefined, '✕ left the form', '✕ nothing', '✕ nothing'];
  return (
    <>
      <FormCard variant="flawed" focus={focus} ring={false} />
      {shown >= 4 && <Pill x={CARD.x + CARD.w - 300} y={CARD.y - 46} text="focus left the form" color={C.red} size={20} />}
      <Keys x={RX} y={130} keys={keys} shown={shown} results={results} />
      <Code x={RX} y={300} w={460} title="flawed · stylesheet" size={26} hi={[0]} hiColor={C.red} o={ep(t, 0.6, 1.1)} lines={['* { outline: none; }', '.input:focus {', '  border-color: #d5d8de;', '}']} />
      <Code x={RX + 490} y={300} w={RW - 490} title="flawed · submit control" size={26} hi={[0]} hiColor={C.red} o={ep(t, 2.9, 3.4)} lines={['<div class="btn"', '  onclick="submitForm()">', '  Create account', '</div>', '<!-- no <form>, no tabindex -->']} />
      <Txt x={RX} y={560} w={RW} size={30} color={C.red} o={ep(t, 3.0, 3.5)}>Not focusable. Not in the Tab order. No key handler.</Txt>
      <Txt x={RX} y={610} w={RW} size={28} color={C.amber} o={ep(t, 5.2, 5.7)}>No `form` element, so Enter in a field submits nothing either.</Txt>
      <Box x={RX} y={690} w={RW} h={120} accent={C.red} fill="#1c1012" o={ep(t, 5.8, 6.3)}>
        <div style={{fontSize: 30, color: C.text, fontWeight: 700}}>Three Tab stops. Submit reachable: no.</div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 6}}>Labelled inputs {EV.flawed.labelled} · outline:none declarations {EV.flawed.outlineNone}</div>
      </Box>
      <Note t={t} at={6.2}>Observed from the local fixture (static audit + journey model, no browser): tab stops 3, submit unreachable, Enter/Space → nothing.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Native form + button, visible focus                              */
/* ------------------------------------------------------------------ */
const FixNative: React.FC<SceneProps> = ({t}) => {
  const times = [2.6, 3.3, 4.0, 4.7];
  const shown = times.filter((x) => t >= x).length;
  const focus = shown === 0 ? null : shown - 1;
  return (
    <>
      <FormCard variant="corrected" focus={focus} ring />
      <Overline x={RX} y={120} color={C.green}>Repair one · native controls</Overline>
      <Code x={RX} y={170} w={RW} title="corrected · markup + focus style" size={26} hi={[0, 1, 4, 5]} hiColor={C.green} o={ep(t, 0.3, 0.8)} lines={['<form id="signup" novalidate>', '  <button type="submit">Create account', '.input:focus-visible,', '.btn:focus-visible {', '  outline: 3px solid #1d4ed8;', '  outline-offset: 2px; }']} />
      <Keys x={RX} y={470} keys={['Tab', 'Tab', 'Tab', 'Tab']} shown={shown} results={[undefined, undefined, undefined, '✓ button']} />
      <Txt x={RX} y={600} w={RW} size={30} color={C.text} o={ep(t, 4.9, 5.4)}>Four Tab stops. The button is one of them.</Txt>
      <Txt x={RX} y={650} w={RW} size={28} color={C.dim} o={ep(t, 5.4, 5.9)}>Enter in any field submits the form. Enter or Space on the button submits too. No ARIA needed: the elements already have the right semantics.</Txt>
      <Note t={t} at={6.0}>Observed from the local fixture: tab order name → email → password → button; outline:none declarations {EV.corrected.outlineNone}.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 5. Persistent labels + simplified accessibility tree                */
/* ------------------------------------------------------------------ */
const FixLabels: React.FC<SceneProps> = ({t}) => {
  const labelsOn = step(t, 1.2) === 1;
  const typed = ep(t, 0.2, 0.9);
  const rows = [
    {role: 'textbox', name: 'Full name'},
    {role: 'textbox', name: 'Email address'},
    {role: 'textbox', name: 'Password', extra: 'described by: At least 8 characters.'},
    {role: 'button', name: 'Create account'},
  ];
  const treeX = RX + 40;
  const rowY = (i: number) => 300 + i * 110;
  return (
    <>
      <FormCard variant="corrected" labels={labelsOn} values={[typed > 0.5 ? 'Dana Okafor' : '', '', '']} hint={labelsOn} />
      <Svg>
        {labelsOn && [0, 1, 2].map((i) => <Connector key={i} a={G.label(i)} b={G.input(i)} color={C.cyan} p={ep(t, 1.6 + i * 0.3, 2.2 + i * 0.3)} tag={`for="${['name', 'email', 'password'][i]}"`} />)}
        {rows.map((r, i) => {
          const src = i === 3 ? G.button : G.input(i);
          return <Arrow key={i} x1={src.x + src.w + 6} y1={src.y + src.h / 2} x2={treeX - 10} y2={rowY(i) + 40} p={ep(t, 3.2 + i * 0.25, 3.8 + i * 0.25)} color={C.cyanDim} width={3} dashed />;
        })}
      </Svg>
      <Txt x={RX} y={120} w={RW} size={28} color={C.amber} o={win(t, 0, 1.4)}>Placeholder text disappears as soon as you type. The field is now unnamed.</Txt>
      <Overline x={RX} y={120} color={C.green} o={ep(t, 1.4, 1.9)}>Repair two · persistent labels</Overline>
      <Txt x={RX} y={160} w={RW} size={28} color={C.dim} o={ep(t, 1.4, 1.9)}>{'<label for="email">Email address</label>'} — visible, persistent, programmatically connected.</Txt>
      <Box x={treeX - 24} y={240} w={RW - 40 + 24} h={480} accent={C.cyanDim} fill="#0d0f14" o={ep(t, 2.8, 3.3)}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 20, letterSpacing: 3, color: C.mute, textTransform: 'uppercase'}}>Accessibility tree</div>
          <div style={{fontSize: 18, letterSpacing: 2, color: C.amber, border: `2px solid ${C.amber}`, borderRadius: 6, padding: '2px 10px', fontWeight: 700}}>SIMPLIFIED</div>
        </div>
      </Box>
      {rows.map((r, i) => (
        <div key={i} style={{position: 'absolute', left: treeX, top: rowY(i), opacity: ep(t, 3.6 + i * 0.25, 4.1 + i * 0.25), fontFamily: F.mono, fontSize: 26, color: C.text}}>
          <span style={{color: C.cyan}}>{r.role}</span> <span style={{color: C.green}}>"{r.name}"</span>
          {r.extra && <div style={{fontSize: 22, color: C.dim, marginTop: 4}}>{r.extra}</div>}
        </div>
      ))}
      <Txt x={RX} y={740} w={RW} size={24} color={C.mute} o={ep(t, 5.2, 5.7)}>Simplified diagram derived from the markup. No screen reader was run; what is announced was not verified.</Txt>
      <Note t={t} at={5.6}>Observed from the local fixture: labelled inputs flawed {EV.flawed.labelled} → corrected {EV.corrected.labelled}; every label[for] target exists.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 6. Invalid submission: associated errors, preserved values, focus   */
/* ------------------------------------------------------------------ */
const Errors: React.FC<SceneProps> = ({t}) => {
  const enterAt = 1.4;
  const after = step(t, enterAt) === 1;
  const errs = after ? [null, EV.errors.email, EV.errors.password] : [null, null, null];
  const inv = after ? [false, true, true] : [false, false, false];
  const focus = after ? 1 : 2;
  const vals = [EV.invalid.name, EV.invalid.email, EV.invalid.password];
  return (
    <>
      <FormCard variant="corrected" labels values={vals} errors={errs} invalid={inv} focus={focus} ring hint />
      <Svg>
        {after && <Connector a={G.error(1)} b={G.input(1)} color={C.red} p={ep(t, enterAt + 0.3, enterAt + 0.9)} tag="describedby" />}
        {after && <Connector a={G.error(2)} b={G.input(2)} color={C.red} p={ep(t, enterAt + 0.6, enterAt + 1.2)} tag="describedby" />}
      </Svg>
      <Keys x={RX} y={120} keys={['Enter']} shown={step(t, enterAt)} results={['in password field → submit']} />
      <Txt x={RX} y={120} w={RW} size={28} color={C.dim} o={win(t, 0, enterAt)}>Typed with the keyboard: a name, an email with no top-level domain, a six-character password.</Txt>
      <Code x={RX} y={250} w={RW} title="corrected · after validation (what the script sets)" size={26} hi={[1, 2, 4, 5]} hiColor={C.red} o={ep(t, enterAt + 0.8, enterAt + 1.3)} lines={['<input id="email" type="email"', '  aria-invalid="true"', '  aria-describedby="email-error">', '<input id="password" type="password"', '  aria-describedby="password-hint', '    password-error" aria-invalid="true">']} />
      <Box x={RX} y={570} w={460} h={120} accent={C.green} o={ep(t, enterAt + 1.8, enterAt + 2.3)}>
        <div style={{fontSize: 22, color: C.green, fontWeight: 700, letterSpacing: 2}}>VALUES PRESERVED</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>All three stay as typed.</div>
      </Box>
      <Box x={RX + 490} y={570} w={RW - 490} h={120} accent={C.cyan} o={ep(t, enterAt + 2.3, enterAt + 2.8)}>
        <div style={{fontSize: 22, color: C.cyan, fontWeight: 700, letterSpacing: 2}}>FOCUS MOVED ONCE</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>To the first invalid field: {EV.corrected.firstInvalid}.</div>
      </Box>
      <Txt x={RX} y={710} w={RW} size={26} color={C.dim} o={ep(t, enterAt + 3.0, enterAt + 3.5)}>The hint stays in aria-describedby; the error id is appended. Nothing else moves. Associations implemented; announcements not verified.</Txt>
      <Note t={t} at={enterAt + 3.6}>Observed from the local fixture (journey model): rejected · firstInvalid "email" · focusMovedTo "email" · valuesPreserved true.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 7. Retest: the full keyboard journey on the corrected form          */
/* ------------------------------------------------------------------ */
const Retest: React.FC<SceneProps> = ({t}) => {
  const keys = ['Tab', 'Tab', 'Tab', 'Enter', 'Tab', 'Tab', 'Space'];
  const times = [0.4, 1.0, 1.6, 2.4, 3.4, 4.0, 4.8];
  const shown = times.filter((x) => t >= x).length;
  // focus path: name, email, password, (Enter → rejected, focus→email), password, button, (Space → accepted)
  const focusPath = [0, 1, 2, 1, 2, 3, 3];
  const focus = shown === 0 ? null : focusPath[shown - 1];
  const afterEnter = shown >= 4;
  const corrected = shown >= 5;
  const done = shown >= 7;
  const vals = done || corrected ? [EV.valid.name, EV.valid.email, shown >= 6 ? EV.valid.password : EV.invalid.password] : [EV.invalid.name, EV.invalid.email, EV.invalid.password];
  const errs = afterEnter && !done ? [null, corrected ? null : EV.errors.email, shown >= 6 ? null : EV.errors.password] : [null, null, null];
  const inv = errs.map((e) => !!e);
  const results: (string | undefined)[] = [undefined, undefined, undefined, '✕ rejected → email', 'fixed, → password', 'fixed, → button', '✓ accepted'];
  return (
    <>
      <FormCard variant="corrected" labels values={vals} errors={errs} invalid={inv} focus={focus} ring hint={!done} status={done ? 'Account created for dana.okafor@example.test. (Local fixture, nothing was sent.)' : undefined} />
      <Overline x={RX} y={120} color={C.green}>Retest · same journey, corrected form</Overline>
      <Keys x={RX} y={170} keys={keys} shown={shown} results={results} />
      <Box x={RX} y={400} w={RW} h={200} accent={done ? C.green : C.line} fill={done ? '#0f1a13' : C.panel} o={ep(t, 0.2, 0.6)} glow={done}>
        <div style={{fontSize: 22, letterSpacing: 3, color: C.mute, textTransform: 'uppercase'}}>Keyboard-journey model · corrected</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginTop: 14, fontSize: 26}}>
          <div style={{color: C.dim}}>Tab stops</div><div style={{color: C.text, fontWeight: 700}}>{EV.corrected.tabStops} (flawed: {EV.flawed.tabStops})</div>
          <div style={{color: C.dim}}>Submit reachable</div><div style={{color: C.green, fontWeight: 700}}>yes (flawed: no)</div>
          <div style={{color: C.dim}}>Keystrokes to complete</div><div style={{color: C.text, fontWeight: 700, opacity: done ? 1 : 0.3}}>{EV.corrected.keystrokes}, excluding typing</div>
          <div style={{color: C.dim}}>Outcome</div><div style={{color: done ? C.green : C.amber, fontWeight: 700}}>{done ? 'accepted' : afterEnter ? 'rejected, values kept' : '…'}</div>
        </div>
      </Box>
      <Txt x={RX} y={640} w={RW} size={28} color={C.dim} o={ep(t, 5.2, 5.7)}>Same fields, same data path, same number of hands on the keyboard. The pointer never came back.</Txt>
      <Txt x={RX} y={730} w={RW} size={24} color={C.mute} o={ep(t, 5.8, 6.3)}>Static audit: flawed 3 of 11 checks pass · corrected 11 of 11. Test suite: 15 passed, 0 failed.</Txt>
      <Note t={t} at={6.2}>Observed from the local fixture (journey model, no browser): Tab Tab Tab Enter Tab Tab Space → accepted.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 8. End card                                                          */
/* ------------------------------------------------------------------ */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>A screenshot cannot show<br />whether a form is operable.</Big>
    <Txt x={M} y={580} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>This was a keyboard test. It does not establish accessibility compliance. Contrast, motion, timing and the rest of WCAG were not assessed.</Txt>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={26} color={C.mute} o={ep(t, 2.4, 3)}>The label, aria-describedby and aria-invalid associations are implemented. No screen reader was available, so what they announce was not verified.</Txt>
    <Txt x={M} y={760} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3, 3.5)}>Local fixture, synthetic data, static audit and keyboard-journey model. Confirm in a real browser with fixtures/ep09-keyboard-form/keyboard-test-checklist.md.</Txt>
  </>
);

export const scenes = {polished: Polished, keyboard: Keyboard, fail: Fail, fix_native: FixNative, fix_labels: FixLabels, errors: Errors, retest: Retest, end: End};
