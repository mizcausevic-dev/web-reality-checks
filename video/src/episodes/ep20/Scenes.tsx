import React from 'react';
import {Badge, Big, Box, Code, Overline, Pill, Stages, Svg, Token, Txt} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, window as win} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* ------------------------------------------------------------------ */
/* Three-view layout shared by every scene: browser | observer | endpoint */
/* All values on screen come from fixtures/ep20-https-visibility/evidence.json */
/* and visibility-matrix.json. Nothing is a capture.                      */
/* ------------------------------------------------------------------ */

type Who = 'browser' | 'observer' | 'endpoint';
type Vis = 'visible' | 'encrypted' | 'not-sent';

const CW = 544;
const COLS: Record<Who, {x: number; label: string; sub: string; accent: string}> = {
  browser: {x: 96, label: 'Browser', sub: 'trusted · builds the request', accent: C.cyan},
  observer: {x: 688, label: 'Passive network observer', sub: 'on the path · reads bytes only', accent: C.amber},
  endpoint: {x: 1280, label: 'TLS-terminating endpoint', sub: 'trusted · decrypts the request', accent: C.cyan},
};
const HEAD_Y = 160;
const BODY_Y = 290;
const WIRE_Y = 330;
const NOTE_Y = 846;

const URL_FULL = 'https://example.test/account?tab=billing#history';
const HOST = 'example.test';
const TARGET = '/account?tab=billing';
const FRAG = '#history';
const IP = '192.0.2.10';

const visColor = (s: Vis, who: Who) => (s === 'encrypted' ? C.green : s === 'not-sent' ? C.mute : who === 'observer' ? C.amber : C.cyan);
const visText = (s: Vis) => (s === 'visible' ? 'VISIBLE' : s === 'encrypted' ? 'ENCRYPTED' : 'NOT SENT');

/** Column headers. `focus` brightens one column. */
const Views: React.FC<{t: number; focus?: Who | 'all'; delay?: number}> = ({t, focus = 'all', delay = 0}) => (
  <>
    {(Object.keys(COLS) as Who[]).map((k, i) => {
      const c = COLS[k];
      const o = ep(t, delay + 0.15 * i, delay + 0.15 * i + 0.4) * (focus === 'all' || focus === k ? 1 : 0.45);
      return <Box key={k} x={c.x} y={HEAD_Y} w={CW} h={100} title={c.label} sub={c.sub} accent={c.accent} o={o} titleSize={28} />;
    })}
  </>
);

/** One visibility row inside a column: label on the left, state chip on the right. */
const Row: React.FC<{who: Who; y: number; label: string; state: Vis; o?: number; note?: string}> = ({who, y, label, state, o = 1, note}) => {
  const col = visColor(state, who);
  const x = COLS[who].x;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: CW, opacity: o, fontFamily: F.sans}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderRadius: 12, background: C.panel, border: `2px solid ${C.line}`}}>
        <span style={{fontSize: 26, color: state === 'not-sent' ? C.dim : C.text, fontWeight: 600}}>{label}</span>
        <span style={{fontSize: 18, fontWeight: 800, letterSpacing: 2, color: C.bg, background: col, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap'}}>{visText(state)}</span>
      </div>
      {note && <div style={{fontSize: 22, color: C.dim, marginTop: 6, paddingLeft: 16, lineHeight: 1.25}}>{note}</div>}
    </div>
  );
};

/** Opaque ciphertext block: hatched, no readable content. Width stands for a record length; it is a shape, not a measurement. */
const Cipher: React.FC<{x: number; y: number; w: number; h?: number; label?: string; o?: number}> = ({x, y, w, h = 44, label, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, fontFamily: F.mono}}>
    <div style={{width: w, height: h, borderRadius: 8, border: `2px solid ${C.greenDim}`, background: `repeating-linear-gradient(45deg, ${C.greenDim}66 0 7px, ${C.panel} 7px 14px)`}} />
    {label && <div style={{fontSize: 20, color: C.dim, marginTop: 6, whiteSpace: 'nowrap'}}>{label}</div>}
  </div>
);

/** Horizontal wire from browser to endpoint, passing through the observer column. */
const Wire: React.FC<{y?: number; o?: number}> = ({y = WIRE_Y, o = 1}) => (
  <Svg>
    <line x1={COLS.browser.x + CW} y1={y} x2={COLS.endpoint.x} y2={y} stroke={C.line} strokeWidth={6} strokeLinecap="round" opacity={o} />
    <circle cx={COLS.observer.x + CW / 2} cy={y} r={14} fill={C.bg} stroke={C.amber} strokeWidth={4} opacity={o} />
  </Svg>
);

const Note: React.FC<{t: number; at: number; children: React.ReactNode; color?: string; y?: number}> = ({t, at, children, color = C.dim, y = NOTE_Y}) => (
  <Txt x={M} y={y} w={W - 2 * M} align="center" size={24} color={color} o={ep(t, at, at + 0.5)}>{children}</Txt>
);

/* ------------------------------------------------------------------ */
/* 1. navigate — URL split, observer placed on the path                 */
/* ------------------------------------------------------------------ */
const Navigate: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0, 0.5);
  const split = ep(t, 1.6, 2.4);
  return (
    <>
      <Box x={420} y={110} w={1080} h={92} accent={C.line} o={o} fill="#14171e">
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.6}} />)}
          <div style={{marginLeft: 14, padding: '6px 14px', borderRadius: 8, background: '#0d0f14', border: `1px solid ${C.line}`, color: C.text, fontSize: 26, fontFamily: F.mono, flex: 1}}>
            <span style={{color: C.green}}>🔒 </span>{URL_FULL}
          </div>
        </div>
      </Box>
      <Txt x={M} y={214} w={W - 2 * M} align="center" size={22} color={C.mute} o={o}>Illustrative browser chrome, not a real product.</Txt>

      {/* URL split into three parts */}
      <Box x={COLS.browser.x} y={290} w={CW} h={120} accent={C.amber} o={split} title="Resolution name" sub="DNS question · TCP destination · SNI" titleSize={26}>
        <div style={{fontFamily: F.mono, fontSize: 28, color: C.amber, marginTop: 6}}>{HOST}</div>
      </Box>
      <Box x={COLS.observer.x} y={290} w={CW} h={120} accent={C.green} o={ep(t, 1.9, 2.7)} title="Request target" sub="inside the encrypted HTTP request" titleSize={26}>
        <div style={{fontFamily: F.mono, fontSize: 28, color: C.green, marginTop: 6}}>{TARGET}</div>
      </Box>
      <Box x={COLS.endpoint.x} y={290} w={CW} h={120} accent={C.mute} o={ep(t, 2.2, 3.0)} title="Fragment" sub="stays in the browser · never sent" titleSize={26}>
        <div style={{fontFamily: F.mono, fontSize: 28, color: C.dim, marginTop: 6}}>{FRAG}</div>
      </Box>

      {/* path with observer */}
      <Box x={COLS.browser.x} y={500} w={CW} h={100} title="Browser" sub="trusted" accent={C.cyan} o={ep(t, 3.0, 3.5)} titleSize={28} />
      <Box x={COLS.endpoint.x} y={500} w={CW} h={100} title="TLS-terminating endpoint" sub="trusted" accent={C.cyan} o={ep(t, 3.0, 3.5)} titleSize={28} />
      <Svg>
        <line x1={COLS.browser.x + CW} y1={550} x2={COLS.endpoint.x} y2={550} stroke={C.line} strokeWidth={6} strokeLinecap="round" opacity={ep(t, 3.3, 3.8)} />
      </Svg>
      <Box x={COLS.observer.x + 72} y={500} w={400} h={100} title="Passive observer" sub="reads bytes on the path" accent={C.amber} glow o={ep(t, 3.9, 4.5)} titleSize={28} />

      {/* scope strip */}
      <Box x={M} y={660} w={W - 2 * M} h={150} accent={C.amber} dashed fill="transparent" o={ep(t, 5.0, 5.6)}>
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 3}}>ILLUSTRATED SCOPE</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 8, lineHeight: 1.3}}>TLS 1.3 over TCP · plain DNS · no VPN or proxy · no Encrypted Client Hello · no resumption or 0-RTT · trusted browser and endpoint</div>
        <div style={{fontSize: 22, color: C.dim, marginTop: 8}}>These are the assumptions of this illustration. They are not every modern browser connection.</div>
      </Box>
      <Note t={t} at={6.2} color={C.mute}>Conceptual illustration. No DNS, TCP, TLS or HTTP traffic was generated or captured.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 2. dns — the unencrypted question                                    */
/* ------------------------------------------------------------------ */
const Dns: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 1.0, 2.6);
  const resolverX = COLS.endpoint.x;
  return (
    <>
      <Overline y={110} color={C.amber}>Step 1 · name to address</Overline>
      <Views t={t} focus="all" />
      <Box x={resolverX} y={BODY_Y} w={CW} h={90} title="DNS resolver" sub="a different party from the web server" accent={C.dim} titleSize={26} o={ep(t, 0.4, 0.9)} />
      <Svg>
        <line x1={COLS.browser.x + CW} y1={WIRE_Y + 100} x2={resolverX} y2={WIRE_Y + 100} stroke={C.line} strokeWidth={6} strokeLinecap="round" />
        <circle cx={COLS.observer.x + CW / 2} cy={WIRE_Y + 100} r={14} fill={C.bg} stroke={C.amber} strokeWidth={4} />
      </Svg>
      <Token x1={COLS.browser.x + CW - 260} y1={WIRE_Y + 72} x2={resolverX - 300} y2={WIRE_Y + 72} p={p} text={`DNS A? ${HOST}`} color={C.amber} />
      <Pill x={COLS.observer.x + 120} y={WIRE_Y + 140} text="plaintext on the wire" color={C.amberDim} o={win(t, 1.6, 2.9, 0.3)} size={22} />

      <Row who="browser" y={560} label="DNS question" state="visible" o={ep(t, 2.6, 3.0)} note="forms the question for example.test" />
      <Row who="observer" y={560} label="DNS question" state="visible" o={ep(t, 2.8, 3.2)} note="only with plain DNS and a position between browser and resolver" />
      <Row who="endpoint" y={560} label="DNS question" state="not-sent" o={ep(t, 3.0, 3.4)} note="the web server never receives the question" />

      <Box x={M} y={690} w={W - 2 * M} h={140} accent={C.amber} dashed fill="transparent" o={ep(t, 4.2, 4.8)}>
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 3}}>DEPENDS ON</div>
        <div style={{fontSize: 26, color: C.text, marginTop: 6}}>DNS transport (plain UDP/TCP 53 here; DoH or DoT would encrypt the question) and observer position (an observer not between browser and resolver sees nothing here).</div>
      </Box>
      <Note t={t} at={5.4} color={C.mute}>From visibility-matrix.json row "DNS question". No resolution performed.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 3. address — IP, port, timing, volume                                */
/* ------------------------------------------------------------------ */
const Address: React.FC<SceneProps> = ({t}) => {
  const conn = ep(t, 0.8, 1.8);
  const widths = [160, 60, 240, 90, 130, 200];
  const gaps = [0, 24, 14, 40, 18, 30];
  let acc = 0;
  const blocks = widths.map((w, i) => {
    acc += gaps[i];
    const x = acc;
    acc += w;
    return {x, w, i};
  });
  const scale = (CW - 40) / acc;
  return (
    <>
      <Overline y={110} color={C.amber}>Step 2 · the connection itself</Overline>
      <Views t={t} />
      <Wire o={conn} />
      <Token x1={COLS.browser.x + CW - 200} y1={WIRE_Y - 28} x2={COLS.endpoint.x - 220} y2={WIRE_Y - 28} p={conn} text={`TCP → ${IP}:443`} color={C.cyan} />

      <Badge x={COLS.observer.x} y={WIRE_Y + 60} label="dst ip" value={IP} color={C.amber} o={ep(t, 1.9, 2.3)} />
      <Badge x={COLS.observer.x + 300} y={WIRE_Y + 60} label="port" value="443" color={C.amber} o={ep(t, 2.1, 2.5)} />

      {/* timing / volume: opaque record blocks on a time axis */}
      <div style={{position: 'absolute', left: COLS.observer.x + 20, top: WIRE_Y + 150, width: CW - 40, opacity: ep(t, 2.6, 3.4), fontFamily: F.sans}}>
        {blocks.map((b) => (
          <div key={b.i} style={{position: 'absolute', left: b.x * scale, top: 0, width: b.w * scale, height: 36, borderRadius: 6, border: `2px solid ${C.amberDim}`, background: `repeating-linear-gradient(45deg, ${C.amberDim}66 0 7px, ${C.panel} 7px 14px)`}} />
        ))}
        <div style={{position: 'absolute', left: 0, right: 0, top: 48, borderTop: `2px solid ${C.mute}`}} />
        <div style={{position: 'absolute', left: 0, top: 56, fontSize: 20, color: C.mute}}>time →</div>
        <div style={{position: 'absolute', right: 0, top: 56, fontSize: 20, color: C.amber}}>sizes and timing: observable · not the content</div>
      </div>

      <Row who="observer" y={600} label="Destination IP · port" state="visible" o={ep(t, 3.6, 4.0)} note="IP and TCP headers are outside TLS; routing needs them" />
      <Row who="observer" y={700} label="Timing · volume" state="visible" o={ep(t, 3.9, 4.3)} note="record lengths and packet times, not the bytes inside" />
      <Row who="browser" y={600} label="Destination IP · port" state="visible" o={ep(t, 3.6, 4.0)} />
      <Row who="endpoint" y={600} label="Destination IP · port" state="visible" o={ep(t, 3.6, 4.0)} note="its own address; also sees the client address" />

      <Box x={COLS.browser.x} y={690} w={CW} h={110} accent={C.amber} dashed fill="transparent" o={ep(t, 4.6, 5.2)}>
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 3}}>ONE ADDRESS, MANY SITES</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.25}}>Shared hosting and CDNs: a destination IP does not necessarily identify one unique website.</div>
      </Box>
      <Note t={t} at={5.6} color={C.mute}>{IP} is an RFC 5737 documentation address used as a label. Block widths are shapes, not measured record lengths.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 4. sni — ClientHello in plaintext, no ECH                            */
/* ------------------------------------------------------------------ */
const Sni: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.8, 2.2);
  return (
    <>
      <Overline y={110} color={C.amber}>Step 3 · TLS ClientHello</Overline>
      <Views t={t} />
      <Wire />
      <Token x1={COLS.browser.x + CW - 220} y1={WIRE_Y - 28} x2={COLS.endpoint.x - 240} y2={WIRE_Y - 28} p={p} text="ClientHello" color={C.amber} />
      <Pill x={COLS.observer.x + 150} y={WIRE_Y + 40} text="plaintext · first TLS message" color={C.amberDim} o={win(t, 1.2, 2.6, 0.3)} size={22} />

      <Code x={COLS.observer.x} y={440} w={CW} title="ClientHello · as the observer reads it" size={24} hi={[3]} hiColor={C.amber} lines={[
        'legacy_version: TLS 1.2',
        'cipher_suites: [...]',
        'supported_versions: TLS 1.3',
        `server_name: ${HOST}`,
        'key_share: [public key]',
      ]} o={ep(t, 2.2, 2.8)} />
      <Badge x={COLS.observer.x} y={690} label="scope" value="no ECH" color={C.amber} o={ep(t, 2.8, 3.2)} />
      <Row who="observer" y={750} label="SNI in ClientHello" state="visible" o={ep(t, 3.0, 3.4)} />

      <Row who="browser" y={440} label="SNI in ClientHello" state="visible" o={ep(t, 2.2, 2.6)} note="the browser writes server_name = example.test" />
      <Row who="endpoint" y={440} label="SNI in ClientHello" state="visible" o={ep(t, 2.4, 2.8)} note="used to pick a certificate and virtual host" />

      <Box x={COLS.browser.x} y={560} w={CW} h={150} accent={C.line} fill="transparent" dashed o={ep(t, 3.6, 4.2)}>
        <div style={{fontSize: 22, color: C.dim, fontWeight: 700, letterSpacing: 3}}>SAME NAME, TWICE</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.25}}>The hostname that DNS just carried appears again in the handshake. Without ECH, the SNI can reveal the requested hostname.</div>
      </Box>
      <Note t={t} at={4.8}>With ECH the inner ClientHello is encrypted and the outer one shows a public name; destination IP, port and timing stay visible.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 5. serverhello — transition into the encrypted handshake             */
/* ------------------------------------------------------------------ */
const ServerHello: React.FC<SceneProps> = ({t}) => {
  const p = ep(t, 0.6, 1.8);
  const keys = ep(t, 2.0, 2.6);
  const enc = ep(t, 2.8, 3.6);
  return (
    <>
      <Overline y={110} color={C.cyan}>Step 4 · ServerHello, then keys</Overline>
      <Views t={t} />
      <Wire />
      <Token x1={COLS.endpoint.x + 20} y1={WIRE_Y - 28} x2={COLS.browser.x + CW - 240} y2={WIRE_Y - 28} p={p} text="ServerHello" color={C.cyan} />
      <Pill x={COLS.observer.x + 170} y={WIRE_Y + 40} text="last plaintext handshake message" color={C.cyanDim} o={win(t, 1.0, 2.4, 0.3)} size={22} />

      {/* key agreement at both ends */}
      <Badge x={COLS.browser.x + 40} y={WIRE_Y + 110} label="derives" value="handshake keys" color={C.green} o={keys} />
      <Badge x={COLS.endpoint.x + 40} y={WIRE_Y + 110} label="derives" value="handshake keys" color={C.green} o={keys} />
      <Txt x={COLS.observer.x} y={WIRE_Y + 118} w={CW} align="center" size={24} color={C.dim} o={keys}>sees both hellos · holds no key</Txt>

      <Stages x={M} y={540} w={W - 2 * M} active={2} done={[0, 1]} stages={['ClientHello', 'ServerHello', 'EncryptedExt.', 'Certificate', 'CertVerify', 'Finished']} o={ep(t, 2.2, 2.8)} />
      <Txt x={M} y={590} w={(W - 2 * M) / 3} size={22} color={C.amber} o={ep(t, 2.2, 2.8)}>plaintext</Txt>
      <Txt x={M + (W - 2 * M) / 3} y={590} w={(W - 2 * M) * (2 / 3)} size={22} color={C.green} o={enc}>encrypted with handshake keys</Txt>

      {/* ciphertext from here on */}
      <div style={{position: 'absolute', left: M + (W - 2 * M) / 3, top: 640, opacity: enc}}>
        <div style={{display: 'flex', gap: 14}}>
          {[150, 320, 110, 90].map((w, i) => <Cipher key={i} x={0} y={0} w={w} />)}
        </div>
      </div>
      <Txt x={M + (W - 2 * M) / 3} y={706} w={1100} size={26} color={C.green} weight={700} o={enc}>from here the handshake itself is encrypted</Txt>
      <Txt x={M + (W - 2 * M) / 3} y={748} w={1100} size={24} color={C.dim} o={enc}>the observer sees record boundaries and lengths, not the messages inside</Txt>
      <Note t={t} at={4.4} color={C.mute}>Key agreement drawn schematically. No key material, cipher suite or capture is shown.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 6. certificate — inside the encrypted handshake in TLS 1.3           */
/* ------------------------------------------------------------------ */
const CertCard: React.FC<{x: number; o: number; accent: string}> = ({x, o, accent}) => (
  <Box x={x} y={BODY_Y + 30} w={CW} h={230} accent={accent} o={o} title="Server certificate" titleSize={26}>
    <div style={{fontFamily: F.mono, fontSize: 24, color: C.text, marginTop: 10, lineHeight: 1.45}}>
      <div>subject: <span style={{color: C.cyan}}>{HOST}</span></div>
      <div>issuer:  Illustrative CA</div>
      <div>key:     [public key]</div>
      <div style={{color: C.green}}>chain verified ✓</div>
    </div>
  </Box>
);

const Certificate: React.FC<SceneProps> = ({t}) => {
  const inside = ep(t, 0.6, 1.4);
  const ends = ep(t, 1.8, 2.6);
  return (
    <>
      <Overline y={110} color={C.green}>Step 5 · the certificate</Overline>
      <Views t={t} />
      <CertCard x={COLS.endpoint.x} o={ends} accent={C.cyan} />
      <CertCard x={COLS.browser.x} o={ends} accent={C.cyan} />
      <Txt x={COLS.browser.x} y={BODY_Y + 270} w={CW} size={22} color={C.dim} o={ends}>decrypted with the handshake keys, then verified</Txt>
      <Txt x={COLS.endpoint.x} y={BODY_Y + 270} w={CW} size={22} color={C.dim} o={ends}>its own certificate</Txt>

      {/* observer: ciphertext only */}
      <Cipher x={COLS.observer.x + 32} y={BODY_Y + 60} w={CW - 64} h={120} o={inside} label="encrypted handshake record · ciphertext and length only" />
      <Txt x={COLS.observer.x} y={BODY_Y + 230} w={CW} align="center" size={24} color={C.green} weight={700} o={inside}>no readable fields</Txt>

      <Row who="browser" y={600} label="Server certificate (TLS 1.3)" state="visible" o={ep(t, 2.8, 3.2)} />
      <Row who="observer" y={600} label="Server certificate (TLS 1.3)" state="encrypted" o={ep(t, 3.0, 3.4)} note="follows ServerHello inside the encrypted handshake" />
      <Row who="endpoint" y={600} label="Server certificate (TLS 1.3)" state="visible" o={ep(t, 3.2, 3.6)} />

      <Box x={M} y={720} w={W - 2 * M} h={96} accent={C.line} dashed fill="transparent" o={ep(t, 4.0, 4.6)}>
        <div style={{fontSize: 26, color: C.text, lineHeight: 1.3}}><span style={{color: C.amber, fontWeight: 700}}>Version matters.</span> TLS 1.2 sent the server certificate in plaintext. TLS 1.3 does not. This illustration is TLS 1.3 only.</div>
      </Box>
      <Note t={t} at={5.0} color={C.mute}>Certificate fields are illustrative placeholders. No certificate was fetched.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 7. request — HTTP inside encrypted application data                  */
/* ------------------------------------------------------------------ */
const Request: React.FC<SceneProps> = ({t}) => {
  const req = ep(t, 0.4, 1.0);
  const send = ep(t, 1.4, 2.6);
  const rows: {label: string; at: number}[] = [
    {label: 'Method · path · query', at: 3.0},
    {label: 'Headers', at: 3.3},
    {label: 'Cookies', at: 3.6},
    {label: 'Body', at: 3.9},
  ];
  return (
    <>
      <Overline y={110} color={C.green}>Step 6 · the request</Overline>
      <Views t={t} />
      <Code x={COLS.browser.x} y={BODY_Y} w={CW} title="request · built by the browser" size={24} hi={[0]} hiColor={C.cyan} lines={[
        `GET ${TARGET} HTTP/1.1`,
        `Host: ${HOST}`,
        'Cookie: sid=[opaque]',
        'Accept: text/html',
      ]} o={req} />
      <Txt x={COLS.browser.x} y={BODY_Y + 246} w={400} size={22} color={C.dim} o={ep(t, 1.0, 1.4)}><span style={{textDecoration: 'line-through', color: C.mute}}>{FRAG}</span>  not in request target</Txt>

      {/* observer: application data records */}
      <div style={{position: 'absolute', left: COLS.observer.x + 20, top: BODY_Y + 10, width: CW - 40, opacity: send}}>
        <div style={{fontFamily: F.sans, fontSize: 18, letterSpacing: 3, color: C.mute, textTransform: 'uppercase', marginBottom: 10}}>application data · as the observer reads it</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          {[330, 180, 420].map((w, i) => <Cipher key={i} x={0} y={0} w={w} h={40} />)}
        </div>
        <div style={{fontFamily: F.sans, fontSize: 22, color: C.green, fontWeight: 700, marginTop: 12}}>ciphertext · record lengths only</div>
      </div>
      <Token x1={COLS.browser.x + CW - 100} y1={BODY_Y + 250} x2={COLS.endpoint.x + 20} y2={BODY_Y + 250} p={send} text="TLS record" color={C.green} />

      {rows.map((r, i) => (
        <React.Fragment key={r.label}>
          <Row who="observer" y={600 + i * 62} label={r.label} state="encrypted" o={ep(t, r.at, r.at + 0.4)} />
          <Row who="endpoint" y={600 + i * 62} label={r.label} state="visible" o={ep(t, r.at + 0.1, r.at + 0.5)} />
        </React.Fragment>
      ))}
      <Row who="browser" y={600} label="Method · path · query" state="visible" o={ep(t, 3.0, 3.4)} note="path and query are in the request; the fragment is not" />
      <Note t={t} at={4.4} color={C.dim}>Sizes and timing leak, but do not reveal the exact content by themselves. Record widths are shapes, not measurements.</Note>
      <Note t={t} at={5.2} color={C.mute} y={NOTE_Y + 34}>Request line from evidence.json: GET /account?tab=billing HTTP/1.1 · fragmentInRequestTarget = false</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 8. ends — both ends hold plaintext; the fragment never left           */
/* ------------------------------------------------------------------ */
const Ends: React.FC<SceneProps> = ({t}) => {
  const o = ep(t, 0.3, 0.9);
  const dec = ep(t, 1.0, 1.8);
  const Plain: React.FC<{x: number; title: string}> = ({x, title}) => (
    <Code x={x} y={BODY_Y} w={CW} title={title} size={24} lines={[`GET ${TARGET} HTTP/1.1`, `Host: ${HOST}`, 'Cookie: sid=[opaque]', 'Accept: text/html']} />
  );
  return (
    <>
      <Overline y={110} color={C.cyan}>Step 7 · plaintext at both ends</Overline>
      <Views t={t} focus="all" />
      <div style={{opacity: o}}><Plain x={COLS.browser.x} title="browser · built it" /></div>
      <div style={{opacity: dec}}><Plain x={COLS.endpoint.x} title="endpoint · decrypted it" /></div>
      <Cipher x={COLS.observer.x + 32} y={BODY_Y + 40} w={CW - 64} h={110} o={o} label="observer · ciphertext only" />

      <Badge x={COLS.browser.x} y={BODY_Y + 230} label="still in the browser" value={FRAG} color={C.cyan} o={ep(t, 1.8, 2.3)} />
      <Row who="observer" y={BODY_Y + 220} label="URL fragment" state="not-sent" o={ep(t, 2.1, 2.5)} />
      <Row who="endpoint" y={BODY_Y + 220} label="URL fragment" state="not-sent" o={ep(t, 2.3, 2.7)} />
      <Txt x={COLS.browser.x} y={BODY_Y + 290} w={CW} size={22} color={C.dim} o={ep(t, 2.6, 3.0)}>Page JavaScript could read location.hash and send it in a separate request — outside this illustration.</Txt>

      <Box x={COLS.endpoint.x} y={BODY_Y + 300} w={CW} h={96} accent={C.amber} dashed fill="transparent" o={ep(t, 3.2, 3.8)}>
        <div style={{fontSize: 24, color: C.text, lineHeight: 1.3}}>The endpoint holds plaintext and <span style={{color: C.amber, fontWeight: 700}}>may log it</span>.</div>
      </Box>
      <Box x={M} y={700} w={(W - 2 * M) / 2 - 12} h={116} accent={C.amber} dashed fill="transparent" o={ep(t, 4.0, 4.6)}>
        <div style={{fontSize: 22, color: C.amber, fontWeight: 700, letterSpacing: 3}}>IF A CDN TERMINATES TLS</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.25}}>The CDN is the endpoint for this connection. Any onward connection to the origin is separate.</div>
      </Box>
      <Box x={M + (W - 2 * M) / 2 + 12} y={700} w={(W - 2 * M) / 2 - 12} h={116} accent={C.red} dashed fill="transparent" o={ep(t, 4.4, 5.0)}>
        <div style={{fontSize: 22, color: C.red, fontWeight: 700, letterSpacing: 3}}>HTTPS DOES NOT PREVENT</div>
        <div style={{fontSize: 24, color: C.text, marginTop: 6, lineHeight: 1.25}}>Phishing, a compromised browser or server, or server-side logging.</div>
      </Box>
      <Note t={t} at={5.4} color={C.mute}>Trusted browser and trusted endpoint are scope assumptions, not guarantees HTTPS provides.</Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 9. end — takeaway                                                    */
/* ------------------------------------------------------------------ */
const End: React.FC<SceneProps> = ({t}) => {
  const rows: {label: string; state: Vis; note: string; at: number}[] = [
    {label: 'DNS question', state: 'visible', note: 'only with plain DNS and an on-path observer · encrypted DNS hides it, not the IP', at: 1.4},
    {label: 'Destination IP · port · timing', state: 'visible', note: 'always on this path · an IP is not necessarily one site', at: 1.7},
    {label: 'SNI in ClientHello', state: 'visible', note: 'no ECH here · ECH protects the inner ClientHello, not IP, port or timing', at: 2.0},
    {label: 'Certificate (TLS 1.3) · method · path · query · headers · cookies · body', state: 'encrypted', note: 'lengths and timing leak; the content does not', at: 2.3},
    {label: 'URL fragment', state: 'not-sent', note: 'never left the browser', at: 2.6},
  ];
  return (
    <>
      <Big y={120} align="center" size={64} o={ep(t, 0.2, 0.9)}>Encrypted content can still travel<br />with visible metadata.</Big>
      <Txt x={M} y={300} w={W - 2 * M} size={22} color={C.amber} weight={700} o={ep(t, 1.0, 1.4)}>WHAT THE PASSIVE OBSERVER GETS · ILLUSTRATED SCOPE</Txt>
      {rows.map((r, i) => {
        const col = visColor(r.state, 'observer');
        return (
          <div key={r.label} style={{position: 'absolute', left: M, top: 340 + i * 82, width: W - 2 * M, opacity: ep(t, r.at, r.at + 0.4), fontFamily: F.sans, display: 'flex', alignItems: 'center', gap: 20, padding: '10px 18px', borderRadius: 12, background: C.panel, border: `2px solid ${C.line}`}}>
            <span style={{fontSize: 18, fontWeight: 800, letterSpacing: 2, color: C.bg, background: col, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', minWidth: 120, textAlign: 'center'}}>{visText(r.state)}</span>
            <span style={{fontSize: 26, color: C.text, fontWeight: 600, minWidth: 560}}>{r.label}</span>
            <span style={{fontSize: 22, color: C.dim}}>{r.note}</span>
          </div>
        );
      })}
      <Txt x={M} y={770} w={W - 2 * M} align="center" size={26} color={C.text} o={ep(t, 3.4, 4.0)}>HTTPS does not stop phishing, a compromised endpoint, or server logging. Scope: TLS 1.3 over TCP, plain DNS, no VPN or proxy, no ECH, no resumption or 0-RTT.</Txt>
      <Txt x={M} y={850} w={W - 2 * M} align="center" size={22} color={C.mute} o={ep(t, 4.2, 4.8)}>Hand-authored visibility matrix (fixtures/ep20-https-visibility). No packets were captured and no TLS traffic was recorded.</Txt>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {navigate: Navigate, dns: Dns, address: Address, sni: Sni, serverhello: ServerHello, certificate: Certificate, request: Request, ends: Ends, end: End};
