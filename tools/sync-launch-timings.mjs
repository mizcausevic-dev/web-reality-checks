#!/usr/bin/env node
// Replaces estimated runtimes and chapter times in launch/*/commercial.md and quiz.md with values from the
// built timelines (video/src/episodes/<id>/timeline.json), and appends a "Final timings" block.
// Idempotent. Usage: node tools/sync-launch-timings.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pk = [['a-break-it-on-purpose', 'cm01', 'qz01'], ['b-launch-review', 'cm02', 'qz02'], ['c-weird-websites', 'cm03', 'qz03']];
const m = (s, pad) => `${pad ? String(Math.floor(s / 60)).padStart(2, '0') : Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const report = [];
for (const [dir, cm, qz] of pk) {
  for (const [file, id, kind] of [['commercial.md', cm, 'commercial'], ['quiz.md', qz, 'quiz']]) {
    const p = path.join(root, 'launch', dir, file);
    const tlp = path.join(root, 'video', 'src', 'episodes', id, 'timeline.json');
    if (!fs.existsSync(p) || !fs.existsSync(tlp)) continue;
    const tl = JSON.parse(fs.readFileSync(tlp, 'utf8'));
    if (!tl.audio) { report.push(`${id}: skipped, no narration timeline`); continue; }
    let t = fs.readFileSync(p, 'utf8');
    const dur = tl.duration.toFixed(1);
    // 1) stale estimate wording
    t = t.replace(/The timings below are estimates from word counts \([^)]*\)\. The orchestrator replaces them with the real timeline after narration is generated\./, `The timings below come from the built timeline (${dur} s, from the real narration).`);
    t = t.replace(/target 55 to 75 s \(estimate from [^)]*\)/, `target 55 to 75 s (built length ${dur} s from the real narration)`);
    t = t.replace(/Durations are estimates from `node tools\/build-timeline\.mjs cm02 --no-audio`; the orchestrator rebuilds them from the narration\./, `Durations come from \`node tools/build-timeline.mjs ${id}\` run on the real narration (${dur} s).`);
    t = t.replace(/\(Chapter times are estimates; the orchestrator replaces them from `[^`]*`\.\)/, `(Chapter times are scene starts from \`video/src/episodes/${id}/timeline.json\`.)`);
    t = t.replace(/Estimated 70 s from the narration word count \(about \d+ words\) before real audio exists\. The orchestrator rebuilds the timeline from the narration take\./, `Built length ${dur} s from the real narration.`);
    t = t.replace(/Chapters \(estimated, replace after rendering\):/, 'Chapters (from the built timeline):');
    t = t.replace(/runtime estimate about [^(]*\(about \d+ narration words plus six silent seconds per question; the real length comes from the narration take\)/, `runtime ${dur} s (narration plus six silent seconds per question, built from the real take)`);
    // 2) chapter times in order
    const starts = kind === 'quiz' ? ['hook', 'q1', 'q2', 'q3', 'q4', 'q5', 'close'].map((s) => tl.scenes.find((x) => x.id === s)?.start) : tl.scenes.map((s) => s.start);
    const lines = t.split('\n');
    let i = 0, inBlock = false, n = 0;
    const out = lines.map((line) => {
      const mm = line.match(/^(\s*(?:[-*]\s+)?)(\d{1,2}):(\d{2})(\s+\S.*)$/);
      if (mm) {
        if (!inBlock) { i = 0; inBlock = true; }
        if (i < starts.length && starts[i] !== undefined) { const nl = `${mm[1]}${m(starts[i], mm[2].length === 2)}${mm[4]}`; if (nl !== line) n++; i++; return nl; }
        return line;
      }
      if (inBlock && line.trim() === '') inBlock = false;
      return line;
    });
    t = out.join('\n');
    // 3) final timings block
    t = t.replace(/\n*<!-- timings:start -->[\s\S]*<!-- timings:end -->\n*/, '\n');
    t = t.replace(/\s*$/, '\n') + `\n<!-- timings:start -->\n## Final timings (built from the narration)\n\nFilm \`${id}\`, ${dur} s. Scene starts: ${tl.scenes.map((s) => `${s.id} ${m(s.start, true)}`).join(', ')}.${kind === 'quiz' ? ` Each question scene includes six silent seconds of think time inserted by \`tools/build-quiz.mjs\`.` : ''} Scene boundaries come from ${kind === 'quiz' ? 'transcript word timestamps' : 'detected silences (a heuristic that can be about a second off)'}.\n<!-- timings:end -->\n`;
    fs.writeFileSync(p, t);
    report.push(`${id}: ${dur} s, ${n} chapter times changed`);
  }
}
console.log(report.join('\n'));
