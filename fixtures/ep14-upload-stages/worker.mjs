// Episode 14 fixture: in-process worker. Takes an accepted job, parses and validates the stored CSV,
// then marks the job "ready" (with a result) or "failed" (with a reason).
//
// What this worker does: structural CSV parsing + row validation (required columns, numeric amount,
// email shape). What it does NOT do: malware scanning, virus detection, or any security verdict.
// Parsing is not malware scanning.
//
// Controlled pacing: when `paceMs` > 0 the worker waits that long before it starts processing. This
// exists only so a demo can observe the "processing" state through the status endpoint. It is a
// labelled, artificial delay and never a measurement of real processing time.
import fs from 'node:fs';

export const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return {error: 'empty file'};
  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const rows = lines.slice(1).map((l, i) => ({line: i + 2, cells: l.split(',').map((c) => c.trim())}));
  return {header, rows};
};

export const validateRows = (parsed) => {
  const {header, rows} = parsed;
  const col = (n) => header.indexOf(n);
  const errors = [];
  if (col('id') === -1 || col('email') === -1 || col('amount') === -1) errors.push({line: 1, error: 'missing required column(s)'});
  for (const r of rows) {
    if (errors.length >= 5) break; // report the first few, not all
    if (r.cells.length !== header.length) { errors.push({line: r.line, error: `expected ${header.length} fields, got ${r.cells.length}`}); continue; }
    const email = r.cells[col('email')];
    const amount = r.cells[col('amount')];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push({line: r.line, error: `invalid email "${email}"`});
    if (!/^-?\d+(\.\d+)?$/.test(amount)) errors.push({line: r.line, error: `amount is not a number "${amount}"`});
  }
  return errors;
};

export const createWorker = (jobs, {paceMs = 0} = {}) => {
  let stopped = false;
  const timers = new Set();
  const process = (job) => {
    if (stopped || !jobs.has(job.id)) return;
    job.status = 'processing';
    job.stages.processingStarted = Date.now();
    try {
      const text = fs.readFileSync(job.storedPath, 'utf8');
      const parsed = parseCsv(text);
      if (parsed.error) throw new Error(parsed.error);
      const errors = validateRows(parsed);
      if (errors.length) {
        job.status = 'failed';
        job.reason = `validation failed: ${errors.map((e) => `line ${e.line}: ${e.error}`).join('; ')}`;
      } else {
        job.status = 'ready';
        const amountIdx = parsed.header.indexOf('amount');
        job.result = {rows: parsed.rows.length, columns: parsed.header, totalAmount: +parsed.rows.reduce((a, r) => a + Number(r.cells[amountIdx]), 0).toFixed(2)};
      }
    } catch (e) {
      job.status = 'failed';
      job.reason = `parse error: ${e.message}`;
    }
    job.stages.finished = Date.now();
  };
  return {
    enqueue(job) {
      if (paceMs > 0) { const h = setTimeout(() => { timers.delete(h); process(job); }, paceMs); timers.add(h); }
      else setImmediate(() => process(job));
    },
    setPace(ms) { paceMs = ms; },
    stop() { stopped = true; for (const h of timers) clearTimeout(h); timers.clear(); },
  };
};
