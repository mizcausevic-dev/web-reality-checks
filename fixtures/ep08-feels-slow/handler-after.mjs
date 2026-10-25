// AFTER: the genuinely cheaper implementation of the same interaction.
// One pass builds a histogram of collection sizes; a second pass reads it.
// O(n) time, identical output to handler-before.mjs for every input.
// The delay is removed, not hidden behind a spinner or animation.
//
// Timing of this function in Node (measure.mjs) is "fixture-measured handler CPU
// time in Node", NOT a browser Interaction to Next Paint (INP) measurement.
export const label = 'after · O(n) histogram';

export const relatedCounts = (items) => {
  const n = items.length;
  const hist = new Map();
  for (let i = 0; i < n; i++) {
    const col = items[i].collection;
    hist.set(col, (hist.get(col) ?? 0) + 1);
  }
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) out[i] = hist.get(items[i].collection) - 1; // minus itself
  return out;
};
