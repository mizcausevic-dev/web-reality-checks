// Generates build1/sw.js and build2/sw.js from sw.template.js.
// Same URL (/sw.js), different bytes: that difference is what makes a browser install a new worker.
import fs from 'node:fs';

const here = new URL('./', import.meta.url);
export const TEMPLATE = fs.readFileSync(new URL('./sw.template.js', here), 'utf8');

export const generateSw = (build) => {
  if (![1, 2].includes(build)) throw new Error('build must be 1 or 2');
  return TEMPLATE.replace(/__BUILD__/g, String(build)).replace('TEMPLATE.', `GENERATED for Build ${build}. Do not edit; edit sw.template.js.`);
};

export const writeAll = () => {
  for (const b of [1, 2]) fs.writeFileSync(new URL(`./build${b}/sw.js`, here), generateSw(b));
};

if (import.meta.url === `file://${process.argv[1]}`) { writeAll(); console.log('wrote build1/sw.js and build2/sw.js'); }
