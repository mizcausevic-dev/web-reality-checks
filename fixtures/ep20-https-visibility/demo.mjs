// Produces evidence.json for the video. This episode is a CONCEPTUAL ILLUSTRATION:
// the only executed behaviour is WHATWG URL parsing. No sockets, no DNS, no TLS, no capture.
import fs from 'node:fs';
import {splitUrl, requestLine, EXAMPLE_URL} from './url-parts.mjs';

const here = (p) => new URL(p, import.meta.url);
const matrix = JSON.parse(fs.readFileSync(here('./visibility-matrix.json'), 'utf8'));
const parts = splitUrl(EXAMPLE_URL);

// Per-observer tallies over the matrix (hand-authored protocol facts, not measurements).
const tally = {};
for (const col of matrix.columns) {
  tally[col] = {visible: 0, encrypted: 0, 'not-sent': 0};
  for (const row of matrix.rows) tally[col][row.cells[col].state]++;
}
const observerVisible = matrix.rows.filter((r) => r.cells.observer.state === 'visible').map((r) => r.label);
const observerEncrypted = matrix.rows.filter((r) => r.cells.observer.state === 'encrypted').map((r) => r.label);
const observerNotSent = matrix.rows.filter((r) => r.cells.observer.state === 'not-sent').map((r) => r.label);

const evidence = {
  generatedAt: new Date().toISOString(),
  label: matrix.label,
  executed: {
    what: 'WHATWG URL parsing of the example URL (string-level only). Nothing else ran.',
    url: EXAMPLE_URL,
    resolutionName: parts.resolutionName,
    port: parts.port,
    requestTarget: parts.requestTarget,
    requestLine: requestLine(EXAMPLE_URL),
    fragment: parts.fragment,
    fragmentInRequestTarget: parts.fragmentInRequestTarget,
  },
  notExecuted: ['DNS resolution', 'TCP connection', 'TLS handshake', 'HTTP request', 'packet capture'],
  matrix: {
    rows: matrix.rows.length,
    columns: matrix.columns,
    tally,
    observerVisible,
    observerEncrypted,
    observerNotSent,
    variants: matrix.variants.map((v) => ({id: v.id, changes: v.changes.map((c) => `${c.row}/${c.column} → ${c.state}`), stillVisible: v.stillVisible})),
  },
  accuracyIds: matrix.accuracy.map((a) => a.id),
};
fs.writeFileSync(here('./evidence.json'), JSON.stringify(evidence, null, 2));

console.log(matrix.label);
console.log(`URL           ${EXAMPLE_URL}`);
console.log(`resolve       ${parts.resolutionName}  (port ${parts.port})`);
console.log(`request line  ${evidence.executed.requestLine}`);
console.log(`fragment      ${parts.fragment}  in request target? ${parts.fragmentInRequestTarget}`);
console.table(Object.entries(tally).map(([who, t]) => ({who, ...t})));
console.log('observer sees:     ', observerVisible.join(', '));
console.log('observer encrypted:', observerEncrypted.join(', '));
console.log('observer not sent: ', observerNotSent.join(', '));
