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
};
export const F = {
  sans: 'InterBundled, Inter, "Inter Display", "DejaVu Sans", system-ui, sans-serif',
  mono: '"DejaVuMonoBundled", "DejaVu Sans Mono", "Courier New", monospace',
};
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
export const applyPalette = (name?: string) => { Object.assign(C, PALETTES[name ?? 'default'] ?? PALETTES.default); };
