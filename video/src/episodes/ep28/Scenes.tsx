import React from 'react';
import {Arrow, Badge, Big, Box, Code, Gate, Log, Overline, Pill, Readout, Svg, Txt} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* All numbers/statuses below come from fixtures/ep28-hidden-admin-button/evidence.json:
   flawed member publish 201 (count 1 -> 2); corrected member 403 PERMISSION_DENIED (count 2 -> 2);
   forged role claim 403 PERMISSION_DENIED; bad CSRF token 403 EBADCSRFTOKEN; no session 401 NO_SESSION;
   administrator corrected 201 (count 2 -> 3). */

/** Illustrative member page: the publish button is not rendered. */
const MemberPage: React.FC<{x: number; y: number; w: number; h: number; o?: number}> = ({x, y, w, h, o = 1}) => (
  <Box x={x} y={y} w={w} h={h} accent={C.line} fill="#14171e" o={o}>
    <div style={{fontSize: 22, color: C.mute, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14}}>Illustrative page · member view</div>
    <div style={{fontSize: 34, fontWeight: 700, color: C.text}}>Announcements</div>
    <div style={{fontSize: 26, color: C.dim, marginTop: 8}}>Signed in as Max (member)</div>
    <div style={{fontSize: 26, color: C.dim, marginTop: 8}}>Read-only view</div>
    <div style={{marginTop: 26, height: 70, border: `3px dashed ${C.mute}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: C.mute}}>no publish button rendered</div>
  </Box>
);

/** Count of rows in the announcements table. */
const Count: React.FC<{x: number; y: number; value: number; color?: string; label?: string; o?: number}> = ({x, y, value, color = C.cyan, label = 'announcements in the table', o = 1}) => (
  <div style={{opacity: o}}><Readout x={x} y={y} label={label} value={value} color={color} w={420} /></div>
);

/* 1. Outcome first: no button, yet it published */
const Fail: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 1.6, 2.6);
  const done = step(t, 2.8);
  return (
    <>
      <Overline y={110} color={C.red}>Hidden is not denied</Overline>
      <MemberPage x={M} y={190} w={600} h={400} o={ep(t, 0, 0.6)} />
      <Svg>
        <Arrow x1={M + 620} y1={390} x2={1100} y2={390} p={req} color={C.red} label="POST /vuln/announcements" labelDy={-16} />
      </Svg>
      <Box x={1110} y={190} w={714} h={400} title="Server · announcements table" accent={done ? C.red : C.line} glow={Boolean(done)} o={ep(t, 0.2, 0.8)}>
        <div style={{fontSize: 26, color: C.dim, marginTop: 14}}>#1 Welcome · u_admin</div>
        <div style={{fontSize: 26, color: C.red, marginTop: 10, opacity: done, fontWeight: 700}}>#2 Maintenance window · u_member</div>
        <div style={{marginTop: 22, opacity: done, position: 'relative', height: 56}}><Pill x={0} y={0} text="201 Created" color={C.red} size={30} mono /></div>
      </Box>
      <Count x={1255} y={620} value={done ? 2 : 1} color={done ? C.red : C.cyan} o={ep(t, 0.4, 0.9)} />
      <Txt x={M} y={640} w={640} size={30} color={C.amber} o={ep(t, 3.4, 4)}>The button was never rendered. The request still worked.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 4.4, 5)}>Observed from the local fixture: member POST /vuln/announcements → 201, count 1 → 2. Loopback only.</Txt>
    </>
  );
};

/* 2. Controlled test: valid session + valid CSRF token */
const Setup: React.FC<SceneProps> = ({t}) => {
  const send = ep(t, 3.4, 4.4);
  return (
    <>
      <Overline y={110} color={C.amber}>Controlled test · not a browser</Overline>
      <Badge x={M} y={190} label="session" value="member · valid, server-side" color={C.green} big o={ep(t, 0.4, 0.9)} />
      <Badge x={M} y={290} label="csrf token" value="valid for this session" color={C.green} big o={ep(t, 1.2, 1.7)} />
      <Badge x={M} y={390} label="role" value="member (no publish permission)" color={C.amber} big o={ep(t, 2, 2.5)} />
      <Code x={1000} y={190} w={824} title="request sent by the test client" size={26} hi={[1, 2]} hiColor={C.green} o={ep(t, 2.6, 3.2)} lines={[
        'POST /vuln/announcements',
        'Cookie: sid=<member session>',
        'x-csrf-token: <valid token>',
        '{"title":"Maintenance window",',
        ' "body":"Synthetic announcement."}',
      ]} />
      <Svg>
        <Arrow x1={820} y1={330} x2={990} y2={330} p={send} color={C.cyan} />
      </Svg>
      <Txt x={M} y={560} w={W - 2 * M} size={32} color={C.text} o={ep(t, 4.6, 5.2)}>Authentication and CSRF are both satisfied.</Txt>
      <Txt x={M} y={620} w={W - 2 * M} size={32} color={C.dim} o={ep(t, 5.4, 6)}>So any refusal that follows can only be about permission.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 6.2, 6.8)}>Plain HTTP on 127.0.0.1, synthetic users. The CSRF check is csrf-csrf 3.1.0, a double-submit token.</Txt>
    </>
  );
};

/* 3. The flawed endpoint publishes */
const Leak: React.FC<SceneProps> = ({t}) => {
  const p1 = ep(t, 0.4, 1.2);
  const p2 = ep(t, 1.4, 2.2);
  const p3 = ep(t, 2.6, 3.4);
  const inserted = step(t, 3.4);
  return (
    <>
      <Overline y={110} color={C.red}>Flawed endpoint · POST /vuln/announcements</Overline>
      <Box x={M} y={240} w={420} h={150} title="Authenticate" sub="session exists: yes" accent={C.green} glow={p1 > 0.9} />
      <Box x={M + 520} y={240} w={420} h={150} title="CSRF" sub="token matches: yes" accent={C.green} glow={p2 > 0.9} o={ep(t, 1.2, 1.7)} />
      <Box x={M + 1040} y={240} w={300} h={150} title="Permission?" sub="never asked" accent={C.red} dashed o={ep(t, 2.2, 2.7)} fill="transparent" />
      <Box x={M + 1440} y={240} w={288} h={150} title="INSERT" sub="row written" accent={inserted ? C.red : C.line} glow={Boolean(inserted)} o={ep(t, 2.4, 2.9)} />
      <Svg>
        <Arrow x1={M + 420} y1={315} x2={M + 520} y2={315} p={p1} color={C.cyan} />
        <Arrow x1={M + 940} y1={315} x2={M + 1040} y2={315} p={p2} color={C.amber} />
        <Arrow x1={M + 1340} y1={315} x2={M + 1440} y2={315} p={p3} color={C.red} />
      </Svg>
      <Pill x={M} y={470} text="201 Created" color={C.red} o={step(t, 3.6)} size={36} mono />
      <Count x={M + 520} y={440} value={inserted ? 2 : 1} color={inserted ? C.red : C.cyan} />
      <Txt x={M + 1000} y={470} w={730} size={30} color={C.text} o={ep(t, 4.2, 4.8)}>Checked: who you are, and that the request carries a valid token.</Txt>
      <Txt x={M + 1000} y={590} w={730} size={30} color={C.red} o={ep(t, 5, 5.6)}>Not checked: whether you may publish.</Txt>
      <Txt x={M} y={880} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 5.4, 6)}>Observed from the local fixture: member POST /vuln/announcements → 201 Created, publishedBy u_member.</Txt>
    </>
  );
};

/* 4. Separate UI visibility from server authorization: three different questions */
const Layers: React.FC<SceneProps> = ({t, dur}) => {
  // highlight follows the narration's order (word-count fractions of the scene)
  const f = t / dur;
  const hi = f < 0.07 ? 3 : f < 0.32 ? 0 : f < 0.74 ? 1 : 2;
  const col = (i: number) => (hi === i ? C.cyan : C.mute);
  return (
    <>
      <Overline y={110}>Three different questions</Overline>
      <Box x={M} y={180} w={560} h={300} title="1 · Authentication" sub="Who is this?" accent={col(0)} glow={hi === 0} o={ep(t, 0.2, 0.7)}>
        <div style={{fontSize: 28, color: C.text, marginTop: 18}}>No valid session</div>
        <div style={{fontSize: 36, fontWeight: 800, color: C.amber, marginTop: 8, fontFamily: 'DejaVu Sans Mono'}}>401</div>
      </Box>
      <Box x={M + 584} y={180} w={560} h={300} title="2 · CSRF" sub="Did it come from our page?" accent={col(1)} glow={hi === 1} o={ep(t, 0.5, 1)}>
        <div style={{fontSize: 28, color: C.text, marginTop: 18}}>Missing or wrong token</div>
        <div style={{fontSize: 36, fontWeight: 800, color: C.amber, marginTop: 8, fontFamily: 'DejaVu Sans Mono'}}>403 EBADCSRFTOKEN</div>
      </Box>
      <Box x={M + 1168} y={180} w={560} h={300} title="3 · Authorization" sub="May this user publish?" accent={hi === 2 ? C.red : C.mute} glow={hi === 2} o={ep(t, 0.8, 1.3)}>
        <div style={{fontSize: 28, color: C.text, marginTop: 18}}>Permission missing in the store</div>
        <div style={{fontSize: 36, fontWeight: 800, color: C.red, marginTop: 8, fontFamily: 'DejaVu Sans Mono'}}>403 PERMISSION_DENIED</div>
      </Box>
      <Box x={M} y={560} w={850} h={200} title="Browser: hides the button" sub="An interface decision. The user, or a script, can still send the request." accent={C.amber} dashed fill="transparent" o={ep(t, dur * 0.82, dur * 0.82 + 0.6)} />
      <Box x={M + 878} y={560} w={850} h={200} title="Server: denies the request" sub="A security decision, made from trusted server-side state." accent={C.green} fill="transparent" o={ep(t, dur * 0.86, dur * 0.86 + 0.6)} />
      <Txt x={M} y={800} w={W - 2 * M} size={30} color={C.dim} o={ep(t, dur * 0.9, dur * 0.9 + 0.6)}>Passing the first two does not answer the third.</Txt>
    </>
  );
};

/* 5. Add the permission check */
const Fix: React.FC<SceneProps> = ({t, dur}) => {
  const gate = step(t, dur * 0.5);
  return (
    <>
      <Overline y={110} color={C.green}>The repair · POST /announcements</Overline>
      <Code x={M} y={180} w={1000} title="server.mjs · corrected route" size={26} hi={[2, 3]} hiColor={C.green} o={ep(t, 0.2, 0.8)} lines={[
        'authenticate(req)      // 401',
        'csrf(req)              // 403 EBADCSRFTOKEN',
        "if (!can(user.id, 'announcement:publish'))",
        '  return 403;          // PERMISSION_DENIED',
        'insert(title, body, user.id);',
      ]} />
      <Gate x={M + 1060} y={180} w={668} title="Corrected route" accent={C.green} o={ep(t, 0.6, 1.2)} checks={[
        {label: 'Session is valid', state: 'pass'},
        {label: 'CSRF token is valid', state: 'pass'},
        {label: 'Store grants publish', state: gate ? 'pass' : 'pending'},
      ]} />
      <Box x={M} y={500} w={820} h={290} title="Server-side permission store" accent={C.cyan} o={ep(t, dur * 0.3, dur * 0.3 + 0.6)}>
        <div style={{fontFamily: 'DejaVu Sans Mono', fontSize: 26, marginTop: 16, lineHeight: 1.7}}>
          <div style={{color: C.green}}>admin  → announcement:publish</div>
          <div style={{color: C.dim}}>admin  → announcement:read</div>
          <div style={{color: C.dim}}>member → announcement:read</div>
        </div>
        <div style={{fontSize: 24, color: C.dim, marginTop: 12}}>Read at request time, before any write.</div>
      </Box>
      <Box x={M + 880} y={500} w={848} h={290} title="Never trusted as authority" accent={C.red} dashed fill="transparent" o={ep(t, dur * 0.74, dur * 0.74 + 0.6)}>
        <div style={{fontFamily: 'DejaVu Sans Mono', fontSize: 26, marginTop: 16, lineHeight: 1.7, color: C.text}}>
          <div>body: {'{"role":"admin"}'}</div>
          <div>header: x-role: admin</div>
          <div>query: ?role=admin</div>
        </div>
        <div style={{fontSize: 24, color: C.red, marginTop: 12}}>Browser-submitted role: ignored.</div>
      </Box>
    </>
  );
};

/* 6. Repeat the same member request: 403, and nothing created */
const Retest: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 0.6, 1.6);
  const denied = step(t, 1.8);
  return (
    <>
      <Overline y={110} color={C.green}>Retest · same member, same session, same valid token</Overline>
      <Box x={M} y={180} w={560} h={150} title="Member · POST /announcements" sub="valid session, valid CSRF token" accent={C.cyan} />
      <Svg>
        <Arrow x1={M + 560} y1={255} x2={M + 700} y2={255} p={req} color={C.cyan} />
      </Svg>
      <Box x={M + 700} y={180} w={1028} h={150} title="403 PERMISSION_DENIED" sub="required: announcement:publish" accent={C.red} glow={Boolean(denied)} o={denied} />
      <Count x={M} y={400} value={2} color={C.cyan} label="before" o={ep(t, 1, 1.5)} />
      <Count x={M + 460} y={400} value={2} color={C.green} label="after · unchanged" o={ep(t, 2.4, 3)} />
      <Txt x={M + 940} y={400} w={788} size={30} color={C.text} o={ep(t, 3.2, 3.8)}>Verified in the database: no announcement was created by the denied request.</Txt>
      <Box x={M} y={620} w={560} h={150} title="role=admin claim" sub="403 PERMISSION_DENIED" accent={C.red} titleSize={28} o={ep(t, 4.2, 4.8)} />
      <Box x={M + 584} y={620} w={560} h={150} title="bad CSRF token" sub="403 EBADCSRFTOKEN" accent={C.amber} titleSize={28} o={ep(t, 5, 5.6)} />
      <Box x={M + 1168} y={620} w={560} h={150} title="no session" sub="401 NO_SESSION" accent={C.amber} titleSize={28} o={ep(t, 5.8, 6.4)} />
      <Txt x={M} y={880} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 6.4, 7)}>Observed from the local fixture: three different failures, three different answers.</Txt>
    </>
  );
};

/* 7. Administrator succeeds */
const Admin: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 0.6, 1.6);
  const ok = step(t, 1.8);
  return (
    <>
      <Overline y={110} color={C.green}>Authorized request · administrator</Overline>
      <Box x={M} y={180} w={560} h={150} title="Ada (admin) · POST /announcements" sub="valid session, valid CSRF token" accent={C.cyan} titleSize={26} />
      <Svg>
        <Arrow x1={M + 560} y1={255} x2={M + 700} y2={255} p={req} color={C.cyan} />
      </Svg>
      <Box x={M + 700} y={180} w={1028} h={150} title="201 Created" sub="store grants announcement:publish" accent={C.green} glow={Boolean(ok)} o={ok} />
      <Count x={M} y={400} value={2} color={C.cyan} label="before" o={ep(t, 1, 1.5)} />
      <Count x={M + 460} y={400} value={ok ? 3 : 2} color={C.green} label="after" o={ep(t, 2, 2.5)} />
      <Gate x={M + 940} y={400} w={788} title="Same corrected route" accent={C.green} o={ep(t, 2.6, 3.2)} checks={[
        {label: 'Session is valid', state: 'pass'},
        {label: 'CSRF token is valid', state: 'pass'},
        {label: 'Store grants publish', state: 'pass'},
      ]} />
      <Txt x={M} y={880} w={W - 2 * M} size={24} color={C.mute} o={ep(t, 4, 4.6)}>Observed from the local fixture: administrator POST /announcements → 201, publishedBy u_admin, count 2 → 3.</Txt>
    </>
  );
};

/* 8. End card */
const End: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={250} align="center" size={80} o={ep(t, 0.2, 0.9)}>The browser can hide the action.<br />Only the server can deny it.</Big>
    <Txt x={M} y={520} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 1.6, 2.2)}>This is a function-level permission check: may this role perform this action at all?</Txt>
    <Txt x={M} y={580} w={W - 2 * M} align="center" size={30} color={C.dim} o={ep(t, 2.4, 3)}>It is not an object-ownership check. Which objects a user may touch needs its own test.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} align="center" size={24} color={C.mute} o={ep(t, 3.4, 4)}>Local fixture, synthetic users, loopback only. Not a claim that the application is fully secure.</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {fail: Fail, setup: Setup, leak: Leak, layers: Layers, fix: Fix, retest: Retest, admin: Admin, end: End};
