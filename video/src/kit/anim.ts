import {interpolate} from 'remotion';

/** 0→1 progress of t between a and b, clamped. */
export const prog = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Eased progress between two times. */
export const ep = (t: number, a: number, b: number) => easeOut(prog(t, a, b));
export const eio = (t: number, a: number, b: number) => easeInOut(prog(t, a, b));

/** Fade in at a, fade out at b (durations d). */
export const window = (t: number, a: number, b: number, d = 0.35) =>
  Math.min(prog(t, a, a + d), 1 - prog(t, b - d, b));

/** Step: 0 before t0, 1 after. */
export const step = (t: number, t0: number) => (t >= t0 ? 1 : 0);

/** Blink: on/off square wave with period p seconds, on only after t0. */
export const blink = (t: number, t0: number, p = 0.5) => (t < t0 ? 0 : Math.floor((t - t0) / (p / 2)) % 2 === 0 ? 1 : 0);

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const rnd = (seed: number) => {
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
