// Fixed, seeded catalogue used by both interaction handlers. Synthetic data only.
// 20,000 items, each with a "collection" id in [0, 400). The interaction asks:
// "for every item, how many OTHER items are in the same collection?"
export const N = 20000;
export const COLLECTIONS = 400;
export const SEED = 8;

// Mulberry32 — small deterministic PRNG, same sequence in Node and the browser.
export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const makeItems = (n = N, seed = SEED) => {
  const rnd = mulberry32(seed);
  const items = new Array(n);
  for (let i = 0; i < n; i++) items[i] = {id: i, collection: Math.floor(rnd() * COLLECTIONS), price: Math.round(rnd() * 20000) / 100};
  return items;
};

// Cheap deterministic digest of a numeric array, used to compare handler outputs.
export const digest = (arr) => {
  let h = 2166136261;
  for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
};
