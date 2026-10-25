#!/usr/bin/env node
// Measures social-copy limits across episode distribution kits and launch social.md files.
// LinkedIn post <= 1300 chars, <= 3 hashtags. X thread post <= 280 chars (raw length, URLs counted in full).
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [];
for (const d of fs.readdirSync(path.join(root, 'episodes'))) {
  const f = path.join(root, 'episodes', d, 'content', 'distribution.md');
  if (fs.existsSync(f)) files.push(f);
}
for (const d of fs.readdirSync(path.join(root, 'launch'))) {
  const f = path.join(root, 'launch', d, 'social.md');
  if (fs.existsSync(f)) files.push(f);
}
const bad = [];
let checked = {li: 0, x: 0};
for (const f of files) {
  const rel = path.relative(root, f);
  const txt = fs.readFileSync(f, 'utf8');
  // LinkedIn: sections whose heading mentions Post under a LinkedIn heading
  const parts = txt.split(/^#{2,3} /m);
  let inLi = false;
  for (const p of parts) {
    const head = p.split('\n')[0];
    if (/linkedin/i.test(head) && !/^Post/i.test(head)) { inLi = true; if (p.split('\n').slice(1).join('\n').trim().length > 400) { const body = p.split('\n').slice(1).join('\n').trim(); checked.li++; if (body.length > 1300) bad.push(`${rel} LinkedIn (single) ${body.length}`); } continue; }
    if (/^Post \d/i.test(head) && inLi) { const body = p.split('\n').slice(1).join('\n').trim(); checked.li++; const tags = (body.match(/#\w+/g) || []).length; if (body.length > 1300) bad.push(`${rel} ${head} LinkedIn ${body.length} chars`); if (tags > 3) bad.push(`${rel} ${head} hashtags ${tags}`); continue; }
    if (/X\/Twitter|thread/i.test(head)) {
      inLi = false;
      for (const line of p.split('\n').slice(1)) { const m = /^(\d+)\/ (.*)$/.exec(line); if (m) { checked.x++; if (line.length > 280) bad.push(`${rel} X post ${m[1]} ${line.length} chars`); } }
    } else if (!/^Post/i.test(head)) inLi = /linkedin/i.test(head);
  }
}
console.log(JSON.stringify({files: files.length, checked, violations: bad.length}));
console.log(bad.join('\n'));
