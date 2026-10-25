import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {splitUrl, requestLine, EXAMPLE_URL} from './url-parts.mjs';

const here = (p) => new URL(p, import.meta.url);
const matrix = JSON.parse(fs.readFileSync(here('./visibility-matrix.json'), 'utf8'));
const checklist = fs.readFileSync(here('./accuracy-checklist.md'), 'utf8');
const scopeNotes = fs.readFileSync(here('./scope-notes.md'), 'utf8');
const script = JSON.parse(fs.readFileSync(here('../../episodes/ep20/script.json'), 'utf8'));

/* ---------- url-parts ---------- */

test('hostname is the resolution name; https defaults to port 443', () => {
  const p = splitUrl(EXAMPLE_URL);
  assert.equal(p.resolutionName, 'example.test');
  assert.equal(p.port, 443);
  assert.equal(p.scheme, 'https');
});

test('request target is path + query', () => {
  const p = splitUrl(EXAMPLE_URL);
  assert.equal(p.requestTarget, '/account?tab=billing');
  assert.equal(requestLine(EXAMPLE_URL), 'GET /account?tab=billing HTTP/1.1');
});

test('fragment is parsed but absent from the request target', () => {
  const p = splitUrl(EXAMPLE_URL);
  assert.equal(p.fragment, '#history');
  assert.equal(p.fragmentInRequestTarget, false);
  assert.ok(!p.requestTarget.includes('#'));
  assert.ok(!p.requestTarget.includes('history'));
});

test('KNOWN-POSITIVE CONTROL: a fragment-like string placed in the query IS in the request target', () => {
  // Proves the fragment test above is not vacuous: the same substring is detected when it is really part of the target.
  const p = splitUrl('https://example.test/account?tab=billing&h=history');
  assert.ok(p.requestTarget.includes('history'));
  assert.equal(p.fragment, '');
});

test('explicit port and http default are honoured', () => {
  assert.equal(splitUrl('https://example.test:8443/x').port, 8443);
  assert.equal(splitUrl('http://example.test/x').port, 80);
});

test('non-http(s) schemes are rejected', () => {
  assert.throws(() => splitUrl('ftp://example.test/x'), /expected http\(s\) URL/);
});

/* ---------- visibility-matrix.json schema ---------- */

const REQUIRED_ROWS = ['DNS question', 'Destination IP', 'Port', 'Timing / volume', 'SNI in ClientHello', 'Server certificate (TLS 1.3)', 'HTTP method / path / query', 'Headers', 'Cookies', 'Body', 'URL fragment'];

test('matrix has the required rows, columns and states', () => {
  assert.deepEqual(matrix.columns, ['browser', 'observer', 'endpoint']);
  assert.deepEqual(matrix.states, ['visible', 'encrypted', 'not-sent']);
  assert.deepEqual(matrix.rows.map((r) => r.label), REQUIRED_ROWS);
  assert.ok(matrix.label.startsWith('CONCEPTUAL ILLUSTRATION'));
});

test('every cell has a valid state, a one-line reason and a scope assumption', () => {
  const ids = new Set();
  for (const row of matrix.rows) {
    assert.match(row.id, /^[a-z_]+$/);
    assert.ok(!ids.has(row.id), `duplicate row id ${row.id}`);
    ids.add(row.id);
    assert.ok(matrix.categories.includes(row.category), `${row.id}: category`);
    for (const col of matrix.columns) {
      const c = row.cells[col];
      assert.ok(c, `${row.id}/${col} missing`);
      assert.ok(matrix.states.includes(c.state), `${row.id}/${col}: state ${c.state}`);
      assert.equal(typeof c.reason, 'string');
      assert.ok(c.reason.length > 10 && !c.reason.includes('\n'), `${row.id}/${col}: reason must be one line`);
      assert.ok(typeof c.scope === 'string' && c.scope.length > 3, `${row.id}/${col}: scope assumption required`);
    }
    assert.equal(Object.keys(row.cells).length, 3);
  }
});

test('the four visibility categories are all represented', () => {
  const seen = new Set(matrix.rows.map((r) => r.category));
  for (const c of ['names', 'addresses', 'timing', 'content']) assert.ok(seen.has(c), c);
});

test('observer never sees encrypted HTTP content or the TLS 1.3 certificate (A01, A02)', () => {
  for (const id of ['server_certificate', 'method_path_query', 'headers', 'cookies', 'body']) {
    const row = matrix.rows.find((r) => r.id === id);
    assert.equal(row.cells.observer.state, 'encrypted', id);
    assert.equal(row.cells.browser.state, 'visible', id);
    assert.equal(row.cells.endpoint.state, 'visible', id);
  }
});

test('observer sees metadata in the illustrated scope (A03, A04, A05, A06)', () => {
  for (const id of ['dns_question', 'destination_ip', 'port', 'timing_volume', 'sni']) {
    assert.equal(matrix.rows.find((r) => r.id === id).cells.observer.state, 'visible', id);
  }
});

test('fragment is not-sent to observer and endpoint, matching the URL module (E03)', () => {
  const row = matrix.rows.find((r) => r.id === 'url_fragment');
  assert.equal(row.cells.observer.state, 'not-sent');
  assert.equal(row.cells.endpoint.state, 'not-sent');
  assert.equal(row.cells.browser.state, 'visible');
  assert.equal(splitUrl(matrix.example.url).fragmentInRequestTarget, false);
  assert.equal(splitUrl(matrix.example.url).requestTarget, matrix.example.requestTarget);
  assert.equal(splitUrl(matrix.example.url).resolutionName, matrix.example.resolutionName);
});

test('variants reference real rows/columns and keep IP visible (A07, A08, A09)', () => {
  const ids = new Set(matrix.rows.map((r) => r.id));
  const byId = Object.fromEntries(matrix.variants.map((v) => [v.id, v]));
  for (const v of matrix.variants) {
    for (const ch of v.changes) {
      assert.ok(ids.has(ch.row), `${v.id}: row ${ch.row}`);
      assert.ok(matrix.columns.includes(ch.column), `${v.id}: column ${ch.column}`);
      assert.ok(matrix.states.includes(ch.state));
    }
    for (const r of v.stillVisible) assert.ok(ids.has(r), `${v.id}: stillVisible ${r}`);
    assert.ok(v.stillVisible.includes('destination_ip'), `${v.id} must keep destination IP visible`);
  }
  assert.equal(byId.ech.changes.find((c) => c.row === 'sni').state, 'encrypted');
  assert.equal(byId.encrypted_dns.changes.find((c) => c.row === 'dns_question').state, 'encrypted');
  assert.ok(byId.encrypted_dns.stillVisible.includes('sni'), 'encrypted DNS does not hide SNI without ECH');
  assert.match(byId.cdn_termination.note, /separate/);
});

/* ---------- accuracy checklist coverage ---------- */

test('matrix lists all eleven ACCURACY bullets plus scope and example claims', () => {
  const ids = matrix.accuracy.map((a) => a.id);
  assert.deepEqual(ids.filter((i) => i.startsWith('A')), ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11']);
  assert.ok(ids.includes('S01'));
  assert.deepEqual(ids.filter((i) => i.startsWith('E')), ['E01', 'E02', 'E03', 'E04']);
});

test('accuracy-checklist.md covers every accuracy id, each under a real scene heading', () => {
  const sceneIds = script.scenes.map((s) => s.id);
  // split by scene headings "## Scene N — `id`"
  const sections = [...checklist.matchAll(/^## Scene \d+ — `([a-z_]+)`[^\n]*\n([\s\S]*?)(?=^## |\n$(?![\s\S]))/gm)];
  assert.ok(sections.length >= sceneIds.length, 'one section per scene');
  const covered = {};
  for (const [, scene, body] of sections) {
    assert.ok(sceneIds.includes(scene), `checklist scene ${scene} is not in script.json`);
    for (const m of body.matchAll(/\[([ASE]\d{2})\]/g)) (covered[m[1]] ??= new Set()).add(scene);
  }
  for (const a of matrix.accuracy) {
    assert.ok(covered[a.id] && covered[a.id].size > 0, `${a.id} "${a.text}" is not mapped to any scene`);
  }
  for (const s of sceneIds) assert.ok(sections.some(([, id]) => id === s), `scene ${s} has no checklist section`);
});

test('checklist coverage index agrees with the per-scene sections', () => {
  const rows = [...checklist.matchAll(/^\| ([ASE]\d{2}) \| ([^|]+) \|$/gm)];
  assert.equal(rows.length, matrix.accuracy.length);
  for (const [, id, scenes] of rows) {
    for (const sc of scenes.split(',').map((s) => s.trim())) {
      const section = checklist.match(new RegExp(`^## Scene \\d+ — \`${sc}\`[^\\n]*\\n([\\s\\S]*?)(?=^## )`, 'm'));
      assert.ok(section, `index: scene ${sc} missing`);
      assert.ok(section[1].includes(`[${id}]`), `index says ${id} in ${sc} but section lacks it`);
    }
  }
});

/* ---------- script and scope notes ---------- */

test('every script scene carries the conceptual-illustration sim tag', () => {
  assert.equal(script.n, 20);
  for (const s of script.scenes) assert.equal(s.sim, 'CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED', s.id);
  const total = script.scenes.reduce((a, s) => a + s.narration.trim().split(/\s+/).length, 0);
  assert.ok(total >= 200 && total <= 260, `narration ${total} words`);
  for (const s of script.scenes) for (const c of s.captions) assert.ok(c.length <= 90, `${s.id}: caption > 90 chars`);
});

test('scope notes state every scope assumption and the three variants', () => {
  for (const needle of ['TLS 1.3', 'TCP', 'HTTP/3', 'unencrypted transport', 'No VPN, no proxy', 'No Encrypted Client Hello', 'No session resumption, no 0-RTT', 'Trusted browser', 'Passive observer', 'not a description of every modern browser connection', '### Encrypted Client Hello', '### Encrypted DNS', '### CDN terminates TLS']) {
    assert.ok(scopeNotes.includes(needle), `scope-notes.md missing: ${needle}`);
  }
  assert.ok(scopeNotes.startsWith('# EP20 scope notes'));
  assert.ok(scopeNotes.includes('NO TRAFFIC CAPTURED'));
});
