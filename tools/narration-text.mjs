#!/usr/bin/env node
// Prints the narration prompt for an episode (scenes joined by blank lines) and the word count.
import fs from 'node:fs';
import path from 'node:path';
const ep = process.argv[2];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const s = JSON.parse(fs.readFileSync(path.join(root, 'episodes', ep, 'script.json'), 'utf8'));
const text = s.scenes.map((x) => x.narration.trim()).join('\n\n');
process.stderr.write(`${ep}: ${text.split(/\s+/).length} words, ${s.scenes.length} scenes\n`);
process.stdout.write(text + '\n');
