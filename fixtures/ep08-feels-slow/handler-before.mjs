// BEFORE: the deliberately expensive interaction handler.
// For every item it scans the whole list again to count siblings in the same
// collection — O(n²) comparisons, all synchronous, on whichever thread calls it.
// In the browser that is the main thread, so the click cannot paint until it returns.
//
// Timing of this function in Node (measure.mjs) is "fixture-measured handler CPU
// time in Node", NOT a browser Interaction to Next Paint (INP) measurement.
export const label = 'before · O(n²) nested scan';

export const relatedCounts = (items) => {
  const n = items.length;
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let c = 0;
    const col = items[i].collection;
    for (let j = 0; j < n; j++) if (j !== i && items[j].collection === col) c++;
    out[i] = c;
  }
  return out;
};
