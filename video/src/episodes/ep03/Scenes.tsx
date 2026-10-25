import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Lane, Log, Overline, Pill, Svg, Token, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, eio, prog, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ---------- shared layout: five lanes ---------- */
const LY = {browser: 140, https: 290, server: 440, db: 590, store: 740};
const LH = 140;
const LANES = ['browser', 'https', 'server', 'db', 'store'] as const;
type LaneKey = (typeof LANES)[number];
const LABEL: Record<LaneKey, string> = {browser: 'Browser', https: 'HTTPS connection', server: 'Application server', db: 'User database', store: 'Session store'};

const Lanes: React.FC<{t: number; show?: number; highlight?: LaneKey[]; httpsConceptual?: boolean}> = ({t, show = 5, highlight = [], httpsConceptual = true}) => (
  <>
    {LANES.slice(0, show).map((k, i) => {
      const o = ep(t, 0.15 * i, 0.15 * i + 0.4);
      const acc = highlight.includes(k) ? C.cyan : k === 'https' && httpsConceptual ? C.amberDim : C.mute;
      return <Lane key={k} y={LY[k]} h={LH} label={LABEL[k] + (k === 'https' && httpsConceptual ? ' · conceptual, not executed' : '')} accent={acc} o={o} />;
    })}
  </>
);

/** Browser-ish illustrative sign-in panel (plain Box chrome, never a real product). */
const SignInPanel: React.FC<{x: number; y: number; w: number; status?: 'none' | 'fail' | 'ok'; o?: number; pw?: string}> = ({x, y, w, status = 'none', o = 1, pw = '••••••••••••'}) => (
  <Box x={x} y={y} w={w} h={330} accent={C.line} o={o} fill="#14171e">
    <div style={{display: 'flex', gap: 12, marginBottom: 18}}>
      {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
      <div style={{marginLeft: 16, color: C.mute, fontSize: 24, fontFamily: 'DejaVu Sans Mono'}}>https://app.example.test/sign-in</div>
    </div>
    <div style={{fontSize: 26, color: C.dim, marginBottom: 6}}>Email</div>
    <div style={{padding: '10px 16px', borderRadius: 10, background: '#1a1e27', fontSize: 26, color: C.text, marginBottom: 14}}>alice@example.test</div>
    <div style={{fontSize: 26, color: C.dim, marginBottom: 6}}>Password</div>
    <div style={{padding: '10px 16px', borderRadius: 10, background: '#1a1e27', fontSize: 26, color: C.text, marginBottom: 18, fontFamily: 'DejaVu Sans Mono'}}>{pw}</div>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div style={{padding: '12px 28px', borderRadius: 10, background: status === 'fail' ? C.red : status === 'ok' ? C.green : C.cyan, color: C.bg, fontSize: 28, fontWeight: 800}}>Sign In</div>
      {status === 'fail' && <span style={{color: C.red, fontSize: 26, fontWeight: 700}}>401 · invalid credentials</span>}
      {status === 'ok' && <span style={{color: C.green, fontSize: 26, fontWeight: 700}}>200 · signed in as u_alice</span>}
    </div>
  </Box>
);

/* 1. click: the outcome first */
const Click: React.FC<SceneProps> = ({t}) => {
  const phase1 = t < 3.2; // wrong password attempt
  const o = ep(t, 0, 0.5);
  const st = phase1 ? (t > 1.6 ? 'fail' : 'none') : t > 4.6 ? 'ok' : 'none';
  const cookieO = ep(t, 5.0, 5.6);
  return (
    <>
      <SignInPanel x={M} y={170} w={880} status={st} o={o} />
      <Overline x={M + 960} y={190} color={C.dim}>Observed from the local fixture</Overline>
      <Box x={M + 960} y={240} w={768} h={100} title="POST /login · wrong password" sub="401 invalid credentials · no Set-Cookie" accent={C.red} o={ep(t, 1.8, 2.3)} titleSize={26} />
      <Box x={M + 960} y={360} w={768} h={100} title="POST /login · correct password" sub="200 · Set-Cookie sid=<84 chars, opaque>" accent={C.green} o={ep(t, 4.7, 5.2)} titleSize={26} />
      <Pill x={M + 960} y={490} text="sid=<opaque> ; HttpOnly ; Secure ; SameSite=Lax" color={C.cyan} mono o={cookieO} size={24} />
      <Txt x={M} y={560} w={880} size={28} color={C.dim} o={ep(t, 6, 6.6)}>Illustrative sign-in form. The statuses on the right are the fixture's actual responses.</Txt>
      <Txt x={M} y={800} w={W - 2 * M} align="center" size={32} color={C.amber} o={ep(t, 6.8, 7.4)}>One implementation: email + password, server-side session, opaque cookie. Not every sign-in system works this way.</Txt>
    </>
  );
};

/* 2. five lanes, three objects */
const LanesScene: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={104}>The sign-in path · five parts</Overline>
    <Lanes t={t} />
    <Txt x={M + 60} y={LY.https + 60} w={900} size={24} color={C.amber} o={ep(t, 1.2, 1.6)}>No trusted local CA here: this leg is illustrated, not executed.</Txt>
    <Pill x={M + 1180} y={LY.browser + 60} text="password" color={C.red} o={ep(t, 2.0, 2.4)} />
    <Pill x={M + 1180} y={LY.store + 60} text="session id" color={C.cyan} o={ep(t, 2.4, 2.8)} />
    <Pill x={M + 1180} y={LY.server + 60} text="authorisation decision" color={C.green} o={ep(t, 2.8, 3.2)} />
    <Txt x={M + 1180} y={LY.db + 56} w={500} size={24} color={C.dim} o={ep(t, 3.4, 3.9)}>Three different objects. None of them becomes another.</Txt>
  </>
);

/* 3. HTTPS: conceptual */
const Https: React.FC<SceneProps> = ({t}) => {
  const p = eio(t, 0.6, 2.4);
  return (
    <>
      <Overline y={104} color={C.amber}>Conceptual illustration · TLS not executed in this fixture</Overline>
      <Lanes t={0.9} show={3} highlight={['https']} httpsConceptual={false} />
      <Box x={M + 40} y={LY.https + 44} w={W - 2 * M - 80} h={84} accent={C.amber} dashed fill="rgba(245,182,61,0.06)" o={ep(t, 0.2, 0.6)}>
        <div style={{fontSize: 24, color: C.amber, letterSpacing: 2, fontWeight: 700}}>ENCRYPTED CHANNEL · browser ⇄ server</div>
      </Box>
      <Token x1={M + 120} y1={LY.browser + 60} x2={M + 1300} y2={LY.server + 56} p={p} text="POST /login {email, password}" color={C.red} />
      <Txt x={M + 60} y={LY.db - 40} w={1100} size={28} color={C.text} o={ep(t, 2.8, 3.3)}>Protects the credentials in transit between an honest browser and an honest server.</Txt>
      <Txt x={M + 60} y={LY.db + 20} w={1500} size={28} color={C.amber} o={ep(t, 3.8, 4.4)}>Does not protect a compromised browser, a compromised server, or a script already running in the page.</Txt>
      <Txt x={M} y={LY.store + 40} w={W - 2 * M} size={24} color={C.dim} o={ep(t, 5, 5.5)}>Executed instead: plain HTTP on 127.0.0.1 with X-Forwarded-Proto: https so express-session issues the Secure cookie.</Txt>
    </>
  );
};

/* 4. verify against salted hash */
const Verify: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.4, 1.2);
  const p2 = ep(t, 1.4, 2.0);
  const cmp = ep(t, 2.4, 3.0);
  return (
    <>
      <Overline y={104}>Password verification · argon2id</Overline>
      <Lanes t={0.9} show={4} highlight={['server', 'db']} />
      <Svg>
        <Arrow x1={700} y1={LY.server + 100} x2={700} y2={LY.db + 56} p={p1} label="lookup alice@example.test" />
        <Arrow x1={1000} y1={LY.db + 56} x2={1000} y2={LY.server + 100} p={p2} color={C.violet} label="passwordHash" />
      </Svg>
      <Pill x={M + 60} y={LY.browser + 60} text="password (submitted once)" color={C.red} />
      <Code x={M + 1080} y={LY.db + 40} w={648} size={24} title="stored · observed from the fixture" lines={['$argon2id$v=19$m=65536,t=3,p=4$…', '97 chars · random salt · one way']} />
      <Box x={M + 60} y={LY.server + 48} w={560} h={84} accent={cmp > 0.5 ? C.green : C.cyan} o={ep(t, 2.2, 2.6)} titleSize={24} title="argon2.verify(hash, submitted)" sub={cmp > 0.5 ? '→ true · recomputed and compared' : '…'} />
      <Gate x={M + 1080} y={LY.browser + 20} w={648} title="What hashing is" accent={C.violet} checks={[{label: 'One way: no key turns it back', state: 'pass'}, {label: 'Reversible encryption', state: 'missing'}]} />
      <Txt x={M} y={LY.store + 30} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 3.6, 4.2)}>Observed from the local fixture: two hashes of the same password differ (differ = true) and neither contains it (containsPassword = false). Both verify.</Txt>
    </>
  );
};

/* 5. fresh session after success */
const FreshSession: React.FC<SceneProps> = ({t}) => {
  const kill = ep(t, 1.0, 1.6);
  const fresh = ep(t, 1.8, 2.4);
  const write = ep(t, 3.0, 3.6);
  return (
    <>
      <Overline y={104} color={C.green}>Success · session.regenerate()</Overline>
      <Lanes t={0.9} highlight={['server', 'store']} />
      <Badge x={M + 60} y={LY.store + 56} label="pre-auth id" value="IXbv8tHA…" color={kill > 0.5 ? C.red : C.cyan} o={1 - 0.5 * kill} />
      <Txt x={M + 60} y={LY.store + 110} w={400} size={24} color={C.red} o={kill}>destroyed</Txt>
      <Badge x={M + 520} y={LY.store + 56} label="fresh id" value="KCWMieVO…" color={C.green} o={fresh} />
      <Box x={M + 980} y={LY.store + 44} w={748} h={84} accent={C.green} o={write} titleSize={24} title="{ userId: 'u_alice', role: 'member' }" sub="written only after regenerate" />
      <Code x={M + 60} y={LY.server + 40} w={900} size={24} lines={['argon2.verify → true', 'req.session.regenerate(() => {', '  req.session.userId = u.id; … })']} hi={[1]} hiColor={C.green} />
      <Txt x={M + 1000} y={LY.server + 50} w={728} size={26} color={C.dim} o={ep(t, 2.6, 3.1)}>An identifier planted before login is worthless afterwards.</Txt>
      <Txt x={M} y={LY.store + 140} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 4.2, 4.8)}>Observed from the local fixture: session id changed = true; replaying the pre-auth cookie after login → 401.</Txt>
    </>
  );
};

/* 6. the cookie */
const Cookie: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.4, 1.4);
  const attrs: {k: string; v: string; col: string; at: number}[] = [
    {k: 'sid=<84 chars, opaque>', v: 'random id, never the password or email', col: C.cyan, at: 1.6},
    {k: 'HttpOnly', v: 'hidden from ordinary page scripts; not a cure for every session attack', col: C.cyan, at: 2.4},
    {k: 'Secure', v: 'sent over HTTPS only', col: C.cyan, at: 3.2},
    {k: 'SameSite=Lax', v: 'defence in depth, not complete CSRF protection', col: C.amber, at: 4.0},
    {k: 'Path=/ · no Domain', v: 'host-only: exact host, no sibling subdomains', col: C.cyan, at: 4.8},
  ];
  return (
    <>
      <Overline y={104}>Set-Cookie · observed from the local fixture</Overline>
      <Lanes t={0.9} show={3} highlight={['browser']} />
      <Svg><Arrow x1={1000} y1={LY.server + 50} x2={1000} y2={LY.browser + 110} p={p} color={C.green} label="200 + Set-Cookie" /></Svg>
      <Pill x={M + 60} y={LY.browser + 56} text="sid=<opaque>" color={C.cyan} o={p} mono />
      <Pill x={M + 1200} y={LY.server + 50} text="password" color={C.redDim} o={0.5} />
      <Txt x={M + 1400} y={LY.server + 54} w={330} size={24} color={C.red}>never becomes the cookie</Txt>
      <Box x={M} y={LY.server + LH + 10} w={W - 2 * M} h={290} accent={C.line} fill="#0d0f14">
        {attrs.map((a, i) => (
          <div key={a.k} style={{display: 'flex', gap: 24, alignItems: 'baseline', padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none', opacity: ep(t, a.at, a.at + 0.4)}}>
            <span style={{fontFamily: 'DejaVu Sans Mono', fontSize: 26, color: a.col, width: 440, flexShrink: 0}}>{a.k}</span>
            <span style={{fontSize: 24, color: C.dim}}>{a.v}</span>
          </div>
        ))}
      </Box>
      <Txt x={M} y={886} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 5.4, 6)}>Browsers enforce HttpOnly and SameSite; the fixture verified the attributes on the wire, not browser behaviour.</Txt>
    </>
  );
};

/* 7. subsequent request */
const Request: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.4, 1.2);
  const p2 = ep(t, 1.4, 2.0);
  const p3 = ep(t, 2.2, 2.8);
  const back = ep(t, 3.0, 3.8);
  return (
    <>
      <Overline y={104}>A later request</Overline>
      <Lanes t={0.9} highlight={['browser', 'server', 'store']} />
      <Svg>
        <Arrow x1={700} y1={LY.browser + 100} x2={700} y2={LY.server + 56} p={p1} label="GET /me  Cookie: sid=<opaque>" />
        <Arrow x1={700} y1={LY.server + 100} x2={700} y2={LY.store + 56} p={p2} label="store.get(sid)" />
        <Arrow x1={1000} y1={LY.store + 56} x2={1000} y2={LY.server + 100} p={p3} color={C.violet} label="{ userId: u_alice, role: member }" />
        <Arrow x1={1300} y1={LY.server + 50} x2={1300} y2={LY.browser + 110} p={back} color={C.green} label="200 { user: u_alice }" />
      </Svg>
      <Pill x={M + 60} y={LY.browser + 56} text="sid=<opaque>" color={C.cyan} mono />
      <Badge x={M + 60} y={LY.store + 56} label="session" value="KCWMieVO… → u_alice" color={C.violet} o={step(t, 1.6)} />
      <Txt x={M + 1380} y={LY.store + 50} w={350} size={26} color={C.amber} o={ep(t, 4, 4.5)}>Identifies a session. Carries no permission.</Txt>
      <Txt x={M} y={LY.store + 140} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 4.4, 5)}>Observed from the local fixture: GET /me with the cookie → 200, user u_alice, role member.</Txt>
    </>
  );
};

/* 8. two checks */
const Authz: React.FC<SceneProps> = ({t}) => {
  const q2 = step(t, 1.6);
  const rows = [
    {label: 'no cookie', sub: '401 · no valid session', col: C.red, at: 2.2},
    {label: 'alice · member', sub: '403 · forbidden (required admin)', col: C.amber, at: 3.2},
    {label: 'carol · admin', sub: '200 · audit entries', col: C.green, at: 4.2},
  ];
  return (
    <>
      <Overline y={104}>GET /admin/audit · two separate checks</Overline>
      <Gate x={M} y={170} w={760} title="Check 1 · session valid?" accent={C.cyan} checks={[{label: 'cookie → live record in the session store', state: 'pass'}]} />
      <Gate x={M} y={370} w={760} title="Check 2 · permitted?" accent={q2 ? C.green : C.mute} checks={[{label: "session.role === 'admin'", state: q2 ? 'pass' : 'pending'}]} o={ep(t, 1.2, 1.7)} />
      <Code x={M} y={560} w={760} size={24} lines={["app.get('/admin/audit',", '  requireSession,   // 401', "  requireRole('admin'), // 403", '  handler);']} hi={[1, 2]} hiColor={C.green} />
      {rows.map((r, i) => <Box key={r.label} x={M + 840} y={190 + i * 150} w={888} h={120} title={r.label} sub={r.sub} accent={r.col} o={ep(t, r.at, r.at + 0.4)} titleSize={30} />)}
      <Txt x={M + 840} y={660} w={888} size={26} color={C.dim} o={ep(t, 4.8, 5.3)}>Observed from the local fixture. Being signed in answered question one; it did not answer question two.</Txt>
    </>
  );
};

/* 9. logout */
const Logout: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.4, 1.2);
  const p2 = ep(t, 1.4, 2.0);
  const back = ep(t, 2.4, 3.2);
  const lines = [
    {t: 'GET  /logout                     → 405 Allow: POST', c: C.amber},
    {t: 'POST /logout  (no CSRF token)    → 403', c: C.amber},
    {t: 'POST /login   (no CSRF token)    → 403', c: C.amber},
    {t: 'POST /logout  + x-csrf-token     → 200', c: C.green},
    {t: '  Set-Cookie sid=; Expires=Thu, 01 Jan 1970', c: C.green},
    {t: 'GET  /me  (old cookie replayed)  → 401', c: C.red},
  ];
  return (
    <>
      <Overline y={104}>Sign out · POST only, CSRF token required</Overline>
      <Lanes t={0.9} show={5} highlight={['browser', 'server', 'store']} />
      <Svg>
        <Arrow x1={620} y1={LY.browser + 100} x2={620} y2={LY.server + 56} p={p1} label="POST /logout + cookie + x-csrf-token" />
        <Arrow x1={620} y1={LY.server + 100} x2={620} y2={LY.store + 56} p={p2} color={C.red} label="destroy(sid)" />
        <Arrow x1={880} y1={LY.server + 50} x2={880} y2={LY.browser + 110} p={back} color={C.green} label="200 · expired" />
      </Svg>
      <Badge x={M + 60} y={LY.store + 56} label="session" value="KCWMieVO…" color={p2 > 0.9 ? C.red : C.violet} o={1 - 0.6 * p2} />
      <Txt x={M + 60} y={LY.store + 110} w={300} size={24} color={C.red} o={p2}>destroyed</Txt>
      <Log x={M + 940} y={LY.browser + 10} w={788} size={24} lines={lines} shown={prog(t, 0.6, 4.6) * lines.length} title="Observed from the local fixture" />
      <Txt x={M} y={LY.store + 140} w={W - 2 * M} size={26} color={C.dim} o={ep(t, 4.6, 5.2)}>SameSite=Lax alone is not complete CSRF protection, so a double-submit token is required on login and logout. Nothing changes state over GET.</Txt>
    </>
  );
};

/* 10. end card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={300} align="center" size={80} o={ep(t, 0.2, 0.9)}>The cookie identifies a session.<br />The server enforces access.</Big>
    <Txt x={M} y={600} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>One implementation: email + password, argon2id, express-session, csrf-csrf. Not the design of every sign-in system.</Txt>
    <Txt x={M} y={680} w={W - 2 * M} align="center" size={26} color={C.amber} o={ep(t, 2.4, 3)}>MemoryStore is for this loopback fixture only, not production. The TLS leg was illustrated, not executed.</Txt>
    <Txt x={M} y={760} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3, 3.6)}>Synthetic users, loopback only. Attributes verified on the wire; browser behaviour not tested.</Txt>
  </>
);

export const scenes = {click: Click, lanes: LanesScene, https: Https, verify: Verify, fresh_session: FreshSession, cookie: Cookie, request: Request, authz: Authz, logout: Logout, end: End};
