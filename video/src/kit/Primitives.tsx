import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F, W, H, M, MV} from './theme';
import './fonts';

type Kids = {children?: React.ReactNode};

/* ---------- Text ---------- */
export const Big: React.FC<{x?: number; y: number; w?: number; color?: string; size?: number; align?: 'left' | 'center'; o?: number; weight?: number} & Kids> = ({x = M, y, w = W - 2 * M, color = C.text, size = 72, align = 'left', o = 1, weight = 700, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, fontFamily: F.sans, fontSize: size, fontWeight: weight, color, lineHeight: 1.12, letterSpacing: -1.2, textAlign: align, opacity: o}}>{children}</div>
);
export const Txt: React.FC<{x: number; y: number; w?: number; color?: string; size?: number; align?: 'left' | 'center' | 'right'; o?: number; weight?: number; mono?: boolean; lh?: number} & Kids> = ({x, y, w, color = C.dim, size = 30, align = 'left', o = 1, weight = 500, mono = false, lh = 1.3, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: weight, color, lineHeight: lh, textAlign: align, opacity: o, whiteSpace: 'pre-wrap'}}>{children}</div>
);
export const Overline: React.FC<{x?: number; y: number; color?: string; o?: number} & Kids> = ({x = M, y, color = C.cyan, o = 1, children}) => (
  <div style={{position: 'absolute', left: x, top: y, fontFamily: F.sans, fontSize: 24, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color, opacity: o}}>{children}</div>
);

/* ---------- Chrome ---------- */
export const Bg: React.FC<Kids> = ({children}) => (
  <AbsoluteFill style={{background: `radial-gradient(1200px 700px at 50% 30%, ${C.bg2} 0%, ${C.bg} 65%)`}}>{children}</AbsoluteFill>
);

/** Persistent corner tag for simulated / conceptual content. Never remove while the simulated content is visible. */
export const SimTag: React.FC<{label?: string; color?: string}> = ({label = 'SIMULATED LOCAL FIXTURE', color = C.amber}) => (
  <div style={{position: 'absolute', right: M, top: MV, padding: '8px 16px', border: `2px solid ${color}`, borderRadius: 8, fontFamily: F.sans, fontSize: 20, fontWeight: 700, letterSpacing: 3, color, background: `rgba(${C.bgRgb},0.7)`}}>{label}</div>
);

/** Bottom caption bar, kept separate from diagram labels. */
export const Caption: React.FC<{text: string; o?: number}> = ({text, o = 1}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: MV, display: 'flex', justifyContent: 'center', opacity: o}}>
    <div style={{maxWidth: W - 2 * M, padding: '14px 28px', background: 'rgba(0,0,0,0.72)', borderRadius: 10, fontFamily: F.sans, fontSize: 34, fontWeight: 600, color: C.text, textAlign: 'center', lineHeight: 1.25}}>{text}</div>
  </div>
);

export const EpisodeTag: React.FC<{n: number; title: string; label?: string; series?: string}> = ({n, title, label, series = 'Web Reality Checks'}) => (
  <div style={{position: 'absolute', left: M, top: MV, fontFamily: F.sans, fontSize: 20, fontWeight: 600, letterSpacing: 3, color: C.mute, textTransform: 'uppercase'}}>{label ? `${series} · ${label} · ${title}` : `${series} · ${String(n).padStart(2, '0')} · ${title}`}</div>
);

/* ---------- Diagram ---------- */
export const Box: React.FC<{x: number; y: number; w: number; h: number; title?: string; sub?: string; accent?: string; o?: number; glow?: boolean; dashed?: boolean; fill?: string; titleSize?: number} & Kids> = ({x, y, w, h, title, sub, accent = C.line, o = 1, glow = false, dashed = false, fill = C.panel, titleSize = 30, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, borderRadius: 16, background: fill, border: `3px ${dashed ? 'dashed' : 'solid'} ${accent}`, boxShadow: glow ? `0 0 0 6px ${accent}22, 0 0 40px ${accent}55` : 'none', boxSizing: 'border-box', padding: '18px 24px', fontFamily: F.sans, color: C.text}}>
    {title && <div style={{fontSize: titleSize, fontWeight: 700, lineHeight: 1.15}}>{title}</div>}
    {sub && <div style={{fontSize: 24, color: C.dim, marginTop: 6, lineHeight: 1.25}}>{sub}</div>}
    {children}
  </div>
);

export const Lane: React.FC<{y: number; h: number; label: string; accent?: string; o?: number} & Kids> = ({y, h, label, accent = C.mute, o = 1, children}) => (
  <div style={{position: 'absolute', left: M, top: y, width: W - 2 * M, height: h, opacity: o}}>
    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: accent, borderRadius: 3}} />
    <div style={{position: 'absolute', left: 24, top: -2, fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: accent}}>{label}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 36, borderTop: `1px solid ${C.line}`}} />
    {children}
  </div>
);

export const Badge: React.FC<{x: number; y: number; label: string; value?: string; color?: string; o?: number; big?: boolean}> = ({x, y, label, value, color = C.cyan, o = 1, big = false}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, display: 'inline-flex', alignItems: 'center', gap: 12, padding: big ? '14px 24px' : '8px 16px', borderRadius: 999, border: `3px solid ${color}`, background: `${color}1a`, fontFamily: F.sans, color: C.text, fontSize: big ? 32 : 24, fontWeight: 700, whiteSpace: 'nowrap'}}>
    <span style={{color, letterSpacing: 2, fontSize: big ? 20 : 16, textTransform: 'uppercase'}}>{label}</span>
    {value && <span>{value}</span>}
  </div>
);

export const Pill: React.FC<{x: number; y: number; text: string; color?: string; o?: number; mono?: boolean; size?: number}> = ({x, y, text, color = C.cyan, o = 1, mono = false, size = 24}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, padding: '8px 18px', borderRadius: 10, background: color, color: C.bg, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: 700, whiteSpace: 'nowrap'}}>{text}</div>
);

/** A moving token: interpolates from (x1,y1) to (x2,y2) by p∈[0,1]. */
export const Token: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; text: string; color?: string; o?: number; mono?: boolean}> = ({x1, y1, x2, y2, p, text, color = C.cyan, o = 1, mono = true}) => (
  <Pill x={x1 + (x2 - x1) * p} y={y1 + (y2 - y1) * p} text={text} color={color} o={o} mono={mono} />
);

/** SVG overlay for arrows; full frame. */
export const Svg: React.FC<Kids> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      {[C.cyan, C.amber, C.red, C.green, C.dim, C.violet, C.mute].map((c) => (
        <marker key={c} id={`arr-${c.slice(1)}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L12,6 L0,12 z" fill={c} />
        </marker>
      ))}
    </defs>
    {children}
  </svg>
);

/** Arrow drawn with progress p; optional label at midpoint. */
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; label?: string; width?: number; dashed?: boolean; o?: number; labelDy?: number}> = ({x1, y1, x2, y2, p = 1, color = C.cyan, label, width = 4, dashed = false, o = 1, labelDy = -14}) => {
  const ex = x1 + (x2 - x1) * p;
  const ey = y1 + (y2 - y1) * p;
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '14 10' : undefined} markerEnd={p > 0.05 ? `url(#arr-${color.slice(1)})` : undefined} strokeLinecap="round" />
      {label && p > 0.5 && (Math.abs(y2 - y1) > Math.abs(x2 - x1) ? (
        // vertical arrow: label sits to the right of the line so it never crosses it
        <text x={(x1 + x2) / 2 + 18} y={(y1 + y2) / 2 + 8} fill={color} fontFamily={F.sans} fontSize={22} fontWeight={600} textAnchor="start">{label}</text>
      ) : (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + labelDy} fill={color} fontFamily={F.sans} fontSize={22} fontWeight={600} textAnchor="middle">{label}</text>
      ))}
    </g>
  );
};

/** Condition check list used by "gate" visuals. */
export const Gate: React.FC<{x: number; y: number; w?: number; title: string; checks: {label: string; state: 'pass' | 'fail' | 'missing' | 'pending'}[]; o?: number; accent?: string}> = ({x, y, w = 520, title, checks, o = 1, accent = C.cyan}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, borderRadius: 16, border: `3px solid ${accent}`, background: C.panel, padding: 22, fontFamily: F.sans, boxSizing: 'border-box'}}>
    <div style={{fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: accent, marginBottom: 12}}>{title}</div>
    {checks.map((c, i) => {
      const col = c.state === 'pass' ? C.green : c.state === 'fail' ? C.red : c.state === 'missing' ? C.red : C.mute;
      const mark = c.state === 'pass' ? '✓' : c.state === 'fail' ? '✕' : c.state === 'missing' ? '?' : '·';
      return (
        <div key={i} style={{display: 'flex', gap: 16, alignItems: 'center', fontSize: 28, color: c.state === 'pending' ? C.mute : C.text, padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none', textDecoration: c.state === 'missing' ? 'line-through' : 'none'}}>
          <span style={{width: 40, height: 40, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${col}26`, color: col, fontWeight: 800, fontSize: 26, border: c.state === 'missing' ? `2px dashed ${col}` : 'none'}}>{mark}</span>
          <span>{c.label}</span>
        </div>
      );
    })}
  </div>
);

/** Simple monospace code panel with optional highlighted lines. */
export const Code: React.FC<{x: number; y: number; w: number; lines: string[]; hi?: number[]; hiColor?: string; o?: number; size?: number; title?: string}> = ({x, y, w, lines, hi = [], hiColor = C.amber, o = 1, size = 26, title}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, borderRadius: 14, background: '#0d0f14', border: `2px solid ${C.line}`, padding: '18px 24px', fontFamily: F.mono, fontSize: size, color: C.text, lineHeight: 1.45, boxSizing: 'border-box', whiteSpace: 'pre', overflow: 'hidden'}}>
    {title && <div style={{fontFamily: F.sans, fontSize: 18, letterSpacing: 3, color: C.mute, textTransform: 'uppercase', marginBottom: 8}}>{title}</div>}
    {lines.map((l, i) => (
      <div key={i} style={{background: hi.includes(i) ? `${hiColor}33` : 'transparent', borderLeft: hi.includes(i) ? `4px solid ${hiColor}` : '4px solid transparent', paddingLeft: 12, marginLeft: -16}}>{l}</div>
    ))}
  </div>
);

/** Horizontal stage/timeline bar with markers. */
export const Stages: React.FC<{x: number; y: number; w: number; stages: string[]; active: number; done?: number[]; failed?: number; o?: number}> = ({x, y, w, stages, active, done = [], failed, o = 1}) => {
  const n = stages.length;
  const seg = w / n;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: F.sans}}>
      {stages.map((s, i) => {
        const col = failed === i ? C.red : done.includes(i) ? C.green : i === active ? C.cyan : C.mute;
        return (
          <div key={i} style={{position: 'absolute', left: seg * i, width: seg - 12, top: 0}}>
            <div style={{height: 12, borderRadius: 6, background: col, opacity: i === active || done.includes(i) || failed === i ? 1 : 0.35}} />
            <div style={{marginTop: 12, fontSize: 24, fontWeight: 600, color: col}}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Big number readout. */
export const Readout: React.FC<{x: number; y: number; label: string; value: string | number; color?: string; o?: number; w?: number}> = ({x, y, label, value, color = C.cyan, o = 1, w = 300}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: F.sans, textAlign: 'center'}}>
    <div style={{fontSize: 112, fontWeight: 800, color, lineHeight: 1, letterSpacing: -3}}>{value}</div>
    <div style={{fontSize: 24, color: C.dim, marginTop: 10, letterSpacing: 2, textTransform: 'uppercase'}}>{label}</div>
  </div>
);

/** Terminal-like log lines, revealing up to `shown` lines. */
export const Log: React.FC<{x: number; y: number; w: number; lines: {t: string; c?: string}[]; shown: number; o?: number; size?: number; title?: string}> = ({x, y, w, lines, shown, o = 1, size = 24, title}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, borderRadius: 14, background: '#0d0f14', border: `2px solid ${C.line}`, padding: '16px 22px', fontFamily: F.mono, fontSize: size, lineHeight: 1.5, boxSizing: 'border-box', whiteSpace: 'pre'}}>
    {title && <div style={{fontFamily: F.sans, fontSize: 18, letterSpacing: 3, color: C.mute, textTransform: 'uppercase', marginBottom: 8}}>{title}</div>}
    {lines.slice(0, Math.max(0, Math.floor(shown))).map((l, i) => (
      <div key={i} style={{color: l.c ?? C.text}}>{l.t}</div>
    ))}
  </div>
);
