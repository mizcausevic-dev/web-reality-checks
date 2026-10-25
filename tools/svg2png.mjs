#!/usr/bin/env node
// Rasterises an SVG (or HTML snippet file) to PNG with Playwright Chromium at the SVG's viewBox size.
// Usage: node tools/svg2png.mjs in.svg out.png [scale=2]
// CSS animations are frozen at their end state so the PNG is the settled design.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const [inp, outp, scaleArg] = process.argv.slice(2);
if (!inp || !outp) throw new Error('usage: svg2png.mjs in.svg out.png [scale]');
const {chromium} = createRequire(import.meta.url)('playwright');
const svg = fs.readFileSync(inp, 'utf8');
const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
if (!m) throw new Error('SVG needs viewBox="0 0 W H"');
const w = Math.round(+m[1]), h = Math.round(+m[2]);
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: w, height: h}, deviceScaleFactor: +(scaleArg ?? 2)});
await p.setContent(`<html><head><style>*{animation:none !important;transition:none !important}</style></head><body style="margin:0;background:#0b0c10">${svg}</body></html>`);
await p.screenshot({path: outp, clip: {x: 0, y: 0, width: w, height: h}});
await b.close();
console.log(`${outp} ${w * (+(scaleArg ?? 2))}x${h * (+(scaleArg ?? 2))}`);
