import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F, D, applyPalette} from './theme';
import type {SceneProps, Timeline} from './Episode';

/**
 * Hero / thumbnail card: the episode's own signature diagram, frozen at a chosen moment,
 * scaled behind a title. Rendered as a still at 1600×900 (Medium hero) and 1280×720 (YouTube thumb).
 */
export const makeHero = (tl: Timeline & {fullTitle?: string; hero?: {scene: string; t: number}}, scenes: Record<string, React.FC<SceneProps>>, kind: 'hero' | 'thumb'): React.FC => {
  const Comp: React.FC = () => {
    applyPalette(tl.palette);
    if (tl.thumb) {
      const W0 = kind === 'hero' ? 1600 : 1280;
      const H0 = kind === 'hero' ? 900 : 720;
      const s = W0 / 1280;
      const num = tl.thumb.number;
      const nsz = Math.min(430 * s, ((W0 - 128 * s) * 0.9) / (num.length * 0.46)) * (D.k > 1 ? 1 : 0.85);
      const col = C[tl.thumb.color ?? 'red'];
      const title0 = tl.fullTitle ?? tl.title;
      return (
        <AbsoluteFill style={{background: `radial-gradient(900px 560px at 30% 25%, ${C.bg2} 0%, ${C.bg} 70%)`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 64 * s, top: 48 * s, fontFamily: F.mono, fontSize: 22 * s, letterSpacing: 4 * s, textTransform: 'uppercase', color: C.cyan, fontWeight: 700}}>{`${tl.series ?? 'FFmpeg Reality Checks'} · ${tl.kicker ?? `Episode ${String(tl.n).padStart(2, '0')}`}`}</div>
          <div style={{position: 'absolute', left: 58 * s, top: 70 * s, fontFamily: F.display, fontWeight: 900, fontSize: nsz, lineHeight: 1, letterSpacing: 0, color: C.text, textShadow: `${10 * s}px ${10 * s}px 0 ${col}8c`, whiteSpace: 'nowrap'}}>{num}</div>
          <div style={{position: 'absolute', left: 66 * s, top: 70 * s + nsz * 0.98, fontFamily: F.mono, fontSize: 30 * s, letterSpacing: 2 * s, color: col, fontWeight: 700}}>{tl.thumb.label}</div>
          <div style={{position: 'absolute', left: 64 * s, right: 64 * s, bottom: 84 * s, fontFamily: F.sans, fontWeight: 700, fontSize: 48 * s, lineHeight: 1.12, color: C.text, textWrap: 'balance' as never}}>{title0}</div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 * s, background: C.text}}>
            {Array.from({length: Math.ceil(W0 / (38 * s))}, (_, i) => (
              <React.Fragment key={i}>
                <div style={{position: 'absolute', left: (14 + i * 38) * s, top: 9 * s, width: 16 * s, height: 12 * s, borderRadius: 3 * s, background: C.bg}} />
                <div style={{position: 'absolute', left: (14 + i * 38) * s, bottom: 9 * s, width: 16 * s, height: 12 * s, borderRadius: 3 * s, background: C.bg}} />
              </React.Fragment>
            ))}
          </div>
          <div style={{position: 'absolute', right: 64 * s, top: 48 * s, fontFamily: F.mono, fontSize: 20 * s, letterSpacing: 3 * s, color: C.mute, textTransform: 'uppercase'}}>kineticgain.com</div>
        </AbsoluteFill>
      );
    }
    const h = tl.hero ?? {scene: tl.scenes[0].id, t: 3};
    const S = scenes[h.scene];
    const sc = tl.scenes.find((s) => s.id === h.scene)!;
    const W = kind === 'hero' ? 1600 : 1280;
    const H = kind === 'hero' ? 900 : 720;
    const scale = W / 1920;
    const titleSize = kind === 'hero' ? 82 : 92;
    const title = tl.fullTitle ?? tl.title;
    return (
      <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
        {/* diagram backdrop, shifted up and dimmed */}
        <div style={{position: 'absolute', left: 0, top: kind === 'hero' ? -60 * scale : -30 * scale, width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left', opacity: kind === 'hero' ? 0.55 : 0.4}}>
          {S && <S t={h.t} T={sc.start + h.t} dur={sc.end - sc.start} />}
        </div>
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(${C.bgRgb},0.15) 0%, rgba(${C.bgRgb},0.55) 45%, rgba(${C.bgRgb},0.96) 75%)`}} />
        <div style={{position: 'absolute', left: 64, right: 64, bottom: kind === 'hero' ? 72 : 56, fontFamily: F.sans}}>
          <div style={{fontSize: kind === 'hero' ? 22 : 24, letterSpacing: 5, textTransform: 'uppercase', color: C.cyan, fontWeight: 700, marginBottom: 18}}>{tl.kicker ? `${tl.series ?? 'Web Reality Checks'} · ${tl.kicker}` : `${tl.series ?? 'Web Reality Checks'} · Episode ${String(tl.n).padStart(2, '0')}`}</div>
          <div style={{fontSize: titleSize, lineHeight: 1.05, fontWeight: 800, color: C.text, letterSpacing: -2, textWrap: 'balance' as never, maxWidth: W - 128}}>{title}</div>
          {kind === 'hero' && <div style={{marginTop: 22, fontSize: 24, color: C.dim}}>Runnable local fixture · regression tests · narrated explainer</div>}
        </div>
      </AbsoluteFill>
    );
  };
  return Comp;
};
