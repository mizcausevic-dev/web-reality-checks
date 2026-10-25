// Runs the exact scenario the video shows and writes evidence.json.
// The video may display ONLY numbers from this file:
//   assets.before.bytes / assets.after.bytes          (file bytes)
//   handlers.before.medianMs / handlers.after.medianMs (Node CPU time, NOT browser INP)
// No LCP, no Event Timing and no INP figures exist here: the browser lab was not available.
import fs from 'node:fs';
import {measureAll, HANDLER_LABEL} from './measure.mjs';

const m = await measureAll({runs: 7});
const evidence = {
  generatedAt: new Date().toISOString(),
  simTag: 'LOCAL FIXTURE · NO BROWSER LAB MEASUREMENT',
  whatWasMeasured: ['hero image file bytes (before PNG vs after WebP), confirmed via the loopback server', `handler CPU time in Node over ${m.handlers.before.runs} runs each, median and raw (${HANDLER_LABEL})`],
  whatWasNotMeasured: ['LCP (loading timeline) — requires a browser lab run; see test-conditions.md', 'Event Timing / INP (interaction timeline) — requires a browser lab run; see test-conditions.md', 'any transfer time, network throttle or CPU throttle result'],
  ...m,
  equalOutputs: m.handlers.before.digest === m.handlers.after.digest,
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table([
  {variant: 'before', heroBytes: m.assets.before.bytes, heroFile: m.assets.before.file, handlerMedianMs: m.handlers.before.medianMs, digest: m.handlers.before.digest},
  {variant: 'after', heroBytes: m.assets.after.bytes, heroFile: m.assets.after.file, handlerMedianMs: m.handlers.after.medianMs, digest: m.handlers.after.digest},
]);
console.log(`handler timings: ${HANDLER_LABEL}`);
console.log(`equal outputs: ${evidence.equalOutputs}`);
