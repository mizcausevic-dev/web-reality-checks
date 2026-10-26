// Visual system shared by every episode.
// Near-black background, warm-white type, cyan = normal flow, amber = uncertainty, red = failure.
export const C: Record<string, string> = {
  bgRgb: '11,12,16',
  bg: '#0b0c10',
  bg2: '#12141a',
  panel: '#171a21',
  line: '#2a2e38',
  text: '#f3ede3',
  dim: '#9a978f',
  mute: '#5e5c57',
  cyan: '#3dd6f5',
  cyanDim: '#1a6f82',
  amber: '#f5b63d',
  amberDim: '#7a5a1c',
  red: '#f5533d',
  redDim: '#7a2a1f',
  green: '#5fe08a',
  greenDim: '#27603b',
  violet: '#a78bfa',
  // surfaces that must invert in light palettes
  codeBg: '#0d0f14',
  capBg: 'rgba(0,0,0,0.72)',
  capText: '', // empty means use text
};
export const F: Record<'sans' | 'mono' | 'display', string> = {
  display: 'InterBundled, Inter, "Inter Display", "DejaVu Sans", system-ui, sans-serif',
  sans: 'InterBundled, Inter, "Inter Display", "DejaVu Sans", system-ui, sans-serif',
  mono: '"DejaVuMonoBundled", "DejaVu Sans Mono", "Courier New", monospace',
};
/** Display metrics: size multiplier, letter spacing for headlines, big numbers and body-size display text, glow on or off. */
export const D = {k: 1, ls: -1.5, lsBig: -1.2, lsNum: -2.5, glow: true};
export const glowOf = (color: string, blur = 36) => (D.glow ? `0 0 ${blur}px ${color}33` : `5px 5px 0 ${color}40`);
export const W = 1920;
export const H = 1080;
export const M = 96; // 5% horizontal margin
export const MV = 54; // 5% vertical margin
export const FPS = 30;

/**
 * Palettes. `default` is the original look used by episodes 1 to 8 of every series so far.
 * `ember` is a warm-ink look with citron as the flow color (no teal, no cyan).
 * applyPalette mutates C in place, once per composition render, so every episode must call it
 * (makeEpisode and makeHero do): an episode with no palette resets to `default`.
 */
export const PALETTES: Record<string, Record<string, string>> = {
  default: {...C},
  ember: {
    bgRgb: '17,14,12', bg: '#110e0c', bg2: '#1a1511', panel: '#211b16', line: '#3a3129',
    text: '#f5eddd', dim: '#a89f8d', mute: '#6e6555',
    cyan: '#d6f26b', cyanDim: '#6d7a2f', amber: '#ffb347', amberDim: '#7a5420',
    red: '#ff5a43', redDim: '#7a2a20', green: '#58d68d', greenDim: '#2a6040', violet: '#e58cff',
  },
};
/**
 * `lab` is the two-ink print look from ff26 on: cream paper, indigo and madder inks, ochre for doubt, olive for verified.
 * No teal, no cyan, no glow. Display type is Big Shoulders Display (condensed signage face), body is B612 and numbers are
 * B612 Mono (the Airbus cockpit faces). All three are SIL OFL 1.1 and bundled in public/fonts.
 */
PALETTES.lab = {
  bgRgb: '239,230,210', bg: '#efe6d2', bg2: '#f7f0e0', panel: '#e5d9bf', line: '#c8b896', text: '#1b1713', dim: '#5a4f41', mute: '#85796a',
  cyan: '#2c3b8f', cyanDim: '#a3a9d4', amber: '#a8690f', amberDim: '#e3c88f', red: '#b3262b', redDim: '#e8b5aa', green: '#3d6a2b', greenDim: '#b9cfa6', violet: '#6b2d5c',
  codeBg: '#e2d6bb', capBg: 'rgba(27,23,19,0.94)', capText: '#f3ebda',
};
const FONT_SETS: Record<string, {F: Partial<typeof F>; D: Partial<typeof D>}> = {
  lab: {
    F: {
      display: '"BigShouldersBundled", "Arial Narrow", "DejaVu Sans Condensed", sans-serif',
      sans: '"B612Bundled", "DejaVu Sans", system-ui, sans-serif',
      mono: '"B612MonoBundled", "DejaVu Sans Mono", monospace',
    },
    D: {k: 1.32, ls: 0.4, lsBig: 0.4, lsNum: 0.2, glow: false},
  },
};
const BASE_F = {...F};
const BASE_D = {...D};
export const applyPalette = (name?: string) => {
  Object.assign(C, PALETTES.default, PALETTES[name ?? 'default'] ?? {});
  Object.assign(F, BASE_F, FONT_SETS[name ?? '']?.F ?? {});
  Object.assign(D, BASE_D, FONT_SETS[name ?? '']?.D ?? {});
};
