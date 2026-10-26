import React from 'react';
import {C, F, W} from './theme';
import './fonts';

/**
 * Symmetric layout kit. Everything here is centered on the vertical axis (x = CX) or mirrored about it,
 * so a scene reads the same from the left and from the right. Built in code, no raster artwork.
 * Safe vertical zone: y 120 to 880 (the caption bar owns y >= 950, the episode tag owns y <= 90).
 */
export const CX = W / 2;

type Kids = {children?: React.ReactNode};

/** Soft radial glow with concentric hairline rings, centered on the axis. */
export const Halo: React.FC<{y?: number; r?: number; color?: string; o?: number; rings?: number}> = ({y = 500, r = 520, color = C.cyan, o = 1, rings = 3}) => (
  <div style={{position: 'absolute', left: CX - r, top: y - r, width: 2 * r, height: 2 * r, opacity: o, pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${color}26 0%, ${color}0f 42%, transparent 70%)`}} />
    {Array.from({length: rings}, (_, i) => {
      const k = 0.4 + (0.6 * (i + 1)) / rings;
      return <div key={i} style={{position: 'absolute', left: r * (1 - k), top: r * (1 - k), width: 2 * r * k, height: 2 * r * k, borderRadius: '50%', border: `1.5px solid ${color}`, opacity: 0.22 - i * 0.05}} />;
    })}
  </div>
);

/** Vertical center line that fades at both ends. */
export const Axis: React.FC<{y1: number; y2: number; color?: string; o?: number; p?: number}> = ({y1, y2, color = C.line, o = 1, p = 1}) => (
  <div style={{position: 'absolute', left: CX - 1, top: y1, width: 2, height: (y2 - y1) * p, opacity: o, background: `linear-gradient(180deg, transparent 0%, ${color} 18%, ${color} 82%, transparent 100%)`}} />
);

/** Centered overline plus headline. */
export const Head: React.FC<{over: string; title?: string; color?: string; o?: number; y?: number; size?: number}> = ({over, title, color = C.cyan, o = 1, y = 118, size = 64}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, textAlign: 'center', opacity: o, fontFamily: F.sans}}>
    <div style={{fontSize: 24, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color}}>{over}</div>
    {title && <div style={{fontSize: size, fontWeight: 800, color: C.text, letterSpacing: -1.5, lineHeight: 1.1, marginTop: 14}}>{title}</div>}
  </div>
);

/** Centered line of text. */
export const Mid: React.FC<{y: number; size?: number; color?: string; weight?: number; o?: number; mono?: boolean; w?: number; lh?: number} & Kids> = ({y, size = 34, color = C.dim, weight = 500, o = 1, mono = false, w = W - 360, lh = 1.3, children}) => (
  <div style={{position: 'absolute', left: CX - w / 2, top: y, width: w, textAlign: 'center', fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: weight, color, opacity: o, lineHeight: lh, whiteSpace: 'pre-wrap'}}>{children}</div>
);

/** Centered command in a pill. Shrinks to its text. */
export const Cmd: React.FC<{y: number; text: string; color?: string; size?: number; o?: number; hi?: string}> = ({y, text, color = C.cyan, size = 34, o = 1, hi}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, display: 'flex', justifyContent: 'center', opacity: o}}>
    <div style={{padding: '18px 36px', borderRadius: 18, background: '#0d0f14', border: `2px solid ${color}`, boxShadow: `0 0 36px ${color}33`, fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'pre'}}>
      <span style={{color}}>$ </span>{hi ? text.split(hi).reduce<React.ReactNode[]>((a, part, i, arr) => { a.push(part); if (i < arr.length - 1) a.push(<span key={i} style={{color: C.amber, fontWeight: 700}}>{hi}</span>); return a; }, []) : text}
    </div>
  </div>
);

/** Circle with a short label (number, sign, vs). */
export const Medallion: React.FC<{y: number; x?: number; d?: number; text: string; color?: string; o?: number; size?: number; sub?: string}> = ({y, x = CX, d = 104, text, color = C.cyan, o = 1, size = 40, sub}) => (
  <div style={{position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: '50%', opacity: o, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, border: `3px solid ${color}`, boxShadow: `0 0 0 8px ${color}1a, 0 0 40px ${color}44`, fontFamily: F.sans, color: C.text, fontSize: size, fontWeight: 800, letterSpacing: -1}}>
    <span style={{lineHeight: 1}}>{text}</span>
    {sub && <span style={{fontSize: 14, letterSpacing: 2, color, textTransform: 'uppercase', marginTop: 4, fontWeight: 700}}>{sub}</span>}
  </div>
);

/** Rounded panel whose content is centered both ways. `side` tilts the inner glow toward the axis. */
export const Panel: React.FC<{x: number; y: number; w: number; h: number; color?: string; o?: number; side?: 'left' | 'right' | 'none'; dashed?: boolean} & Kids> = ({x, y, w, h, color = C.line, o = 1, side = 'none', dashed = false, children}) => {
  const dir = side === 'left' ? 'to left' : side === 'right' ? 'to right' : 'to bottom';
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', borderRadius: 28, border: `2.5px ${dashed ? 'dashed' : 'solid'} ${color}`, background: `linear-gradient(${dir}, ${color}1f 0%, ${C.panel} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', fontFamily: F.sans}}>
      {children}
    </div>
  );
};

export const Label: React.FC<{color?: string; size?: number} & Kids> = ({color = C.cyan, size = 22, children}) => (
  <div style={{fontSize: size, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color, fontFamily: F.sans}}>{children}</div>
);
export const Value: React.FC<{color?: string; size?: number} & Kids> = ({color = C.text, size = 96, children}) => (
  <div style={{fontSize: size, fontWeight: 800, color, letterSpacing: -2.5, lineHeight: 1.02, fontFamily: F.sans, whiteSpace: 'nowrap', margin: '10px 0 6px'}}>{children}</div>
);
export const Sub: React.FC<{color?: string; size?: number} & Kids> = ({color = C.dim, size = 28, children}) => (
  <div style={{fontSize: size, fontWeight: 500, color, lineHeight: 1.3, fontFamily: F.sans, whiteSpace: 'pre-wrap'}}>{children}</div>
);

export type Side = {label: string; value: string; sub?: string; color?: string; o?: number; valueSize?: number};

/** Two mirrored panels about the axis with a medallion on it. Left panel is index 0. */
export const Duel: React.FC<{y: number; h?: number; left: Side; right: Side; mid?: string; midSub?: string; midColor?: string; midO?: number; pw?: number; gap?: number}> = ({y, h = 400, left, right, mid = 'vs', midSub, midColor = C.mute, midO = 1, pw = 780, gap = 120}) => {
  const xl = CX - gap / 2 - pw;
  const xr = CX + gap / 2;
  const one = (s: Side, x: number, side: 'left' | 'right') => (
    <Panel x={x} y={y} w={pw} h={h} color={s.color ?? C.cyan} o={s.o ?? 1} side={side === 'left' ? 'right' : 'left'}>
      <Label color={s.color ?? C.cyan}>{s.label}</Label>
      <Value color={s.color ?? C.text} size={s.valueSize ?? 96}>{s.value}</Value>
      {s.sub && <Sub>{s.sub}</Sub>}
    </Panel>
  );
  return (
    <>
      {one(left, xl, 'left')}
      {one(right, xr, 'right')}
      <Medallion y={y + h / 2} text={mid} sub={midSub} color={midColor} o={midO} size={mid.length > 3 ? 28 : 40} />
    </>
  );
};

/** Three, five or n equal columns centered on the axis. Items with value show a big number. */
export type Stat = {label: string; value: string; sub?: string; color?: string; o?: number};
export const Row: React.FC<{y: number; h?: number; items: Stat[]; cw?: number; gap?: number; valueSize?: number}> = ({y, h = 300, items, cw = 520, gap = 40, valueSize = 88}) => {
  const n = items.length;
  const total = n * cw + (n - 1) * gap;
  const x0 = CX - total / 2;
  return (
    <>
      {items.map((s, i) => (
        <Panel key={i} x={x0 + i * (cw + gap)} y={y} w={cw} h={h} color={s.color ?? C.cyan} o={s.o ?? 1}>
          <Label color={s.color ?? C.cyan} size={20}>{s.label}</Label>
          <Value color={s.color ?? C.text} size={valueSize}>{s.value}</Value>
          {s.sub && <Sub size={26}>{s.sub}</Sub>}
        </Panel>
      ))}
    </>
  );
};

/** A frame drawn at true relative size, centered on (cx, cy). Dimensions are scaled by k. */
export const FrameBox: React.FC<{cx: number; cy: number; w: number; h: number; k?: number; color?: string; label?: string; sub?: string; o?: number; fill?: string}> = ({cx, cy, w, h, k = 1, color = C.cyan, label, sub, o = 1, fill}) => (
  <div style={{position: 'absolute', left: cx - (w * k) / 2, top: cy - (h * k) / 2, width: w * k, height: h * k, opacity: o, boxSizing: 'border-box', borderRadius: 14, border: `3px solid ${color}`, background: fill ?? `${color}1f`, boxShadow: `0 0 36px ${color}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, textAlign: 'center'}}>
    {label && <div style={{fontSize: 34, fontWeight: 800, color: C.text, letterSpacing: -0.5, whiteSpace: 'nowrap'}}>{label}</div>}
    {sub && <div style={{fontSize: 22, color: C.dim, marginTop: 4, whiteSpace: 'nowrap'}}>{sub}</div>}
  </div>
);

/** Diverging bar: label on the axis, left bar grows left, right bar grows right. p in [0,1] animates growth. */
export const Mirror: React.FC<{y: number; label: string; left: {value: number; text: string; color?: string}; right: {value: number; text: string; color?: string}; max: number; half?: number; p?: number; o?: number; bh?: number}> = ({y, label, left, right, max, half = 720, p = 1, o = 1, bh = 56}) => {
  const lw = (left.value / max) * half * p;
  const rw = (right.value / max) * half * p;
  const lc = left.color ?? C.cyan;
  const rc = right.color ?? C.amber;
  return (
    <div style={{position: 'absolute', left: 0, top: y, width: W, height: bh, opacity: o, fontFamily: F.sans}}>
      <div style={{position: 'absolute', left: CX - 70 - lw, top: 0, width: lw, height: bh, borderRadius: '14px 4px 4px 14px', background: `linear-gradient(to left, ${lc}, ${lc}88)`}} />
      <div style={{position: 'absolute', left: CX + 70, top: 0, width: rw, height: bh, borderRadius: '4px 14px 14px 4px', background: `linear-gradient(to right, ${rc}, ${rc}88)`}} />
      <div style={{position: 'absolute', left: CX - 70, top: 0, width: 140, height: bh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 3, color: C.mute, textTransform: 'uppercase'}}>{label}</div>
      <div style={{position: 'absolute', left: CX - 70 - lw - 250, top: 0, width: 230, height: bh, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 30, fontWeight: 700, color: lc, whiteSpace: 'nowrap', opacity: p > 0.8 ? 1 : 0}}>{left.text}</div>
      <div style={{position: 'absolute', left: CX + 70 + rw + 20, top: 0, width: 230, height: bh, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, color: rc, whiteSpace: 'nowrap', opacity: p > 0.8 ? 1 : 0}}>{right.text}</div>
    </div>
  );
};

/** Centered rule with a statement between two hairlines. */
export const Verdict: React.FC<{y: number; text: string; color?: string; o?: number; size?: number}> = ({y, text, color = C.amber, o = 1, size = 40}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, opacity: o, fontFamily: F.sans}}>
    <div style={{width: 200, height: 2, background: `linear-gradient(to right, transparent, ${color})`}} />
    <div style={{fontSize: size, fontWeight: 700, color, letterSpacing: -0.5, textAlign: 'center', maxWidth: 1100}}>{text}</div>
    <div style={{width: 200, height: 2, background: `linear-gradient(to left, transparent, ${color})`}} />
  </div>
);

/** Row of small cells centered on the axis (frames, packets, steps). `lit` marks cells that take `color`. */
export const Cells: React.FC<{y: number; cx?: number; n: number; lit?: (i: number) => boolean; color?: string; dim?: string; size?: number; gap?: number; o?: number; perRow?: number}> = ({y, cx = CX, n, lit = () => false, color = C.cyan, dim = C.line, size = 28, gap = 8, o = 1, perRow}) => {
  const per = perRow ?? n;
  const rows = Math.ceil(n / per);
  return (
    <div style={{position: 'absolute', left: 0, top: y, width: W, opacity: o}}>
      {Array.from({length: rows}, (_, r) => {
        const count = Math.min(per, n - r * per);
        const total = count * size + (count - 1) * gap;
        return Array.from({length: count}, (_, c) => {
          const i = r * per + c;
          const on = lit(i);
          return <div key={i} style={{position: 'absolute', left: cx - total / 2 + c * (size + gap), top: r * (size + gap), width: size, height: size, borderRadius: 6, background: on ? color : 'transparent', border: `2px solid ${on ? color : dim}`, boxShadow: on ? `0 0 14px ${color}77` : 'none'}} />;
        });
      })}
    </div>
  );
};
