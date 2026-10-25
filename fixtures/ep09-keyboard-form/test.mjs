import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML, byTag, byId, tabOrder, audit, runAudit} from './audit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (v) => fs.readFileSync(path.join(here, v, 'index.html'), 'utf8');
const results = runAudit().results;
const flawed = results.flawed;
const corrected = results.corrected;

/* ---------- parser sanity ---------- */
test('tiny HTML parser builds the expected tree', () => {
  const root = parseHTML('<div id="a"><input id="x" type="text" placeholder="P"><label for="x">L</label><!-- c --><style>a{outline:none}</style></div>');
  assert.equal(byId(root, 'a').children.filter((c) => c.type === 'element').length, 3);
  assert.equal(byId(root, 'x').attrs.get('placeholder'), 'P');
  assert.equal(byTag(root, 'label')[0].attrs.get('for'), 'x');
  assert.match(byTag(root, 'style')[0].children[0].text, /outline:none/);
});

test('tab order model: positive tabindex would come first and is reported (none exists in either fixture)', () => {
  const root = parseHTML('<input id="a"><div tabindex="2" id="d"></div><button id="b"></button><div tabindex="-1" id="n"></div>');
  assert.deepEqual(tabOrder(root).map((n) => n.attrs.get('id')), ['d', 'a', 'b']);
  assert.equal(flawed.counts.positiveTabindex, 0);
  assert.equal(corrected.counts.positiveTabindex, 0);
});

/* ---------- KNOWN-POSITIVE CONTROL: the flawed version must exhibit every defect ---------- */
test('KNOWN-POSITIVE CONTROL: flawed form has zero labelled inputs, three placeholder-only inputs', () => {
  assert.equal(flawed.counts.inputs, 3);
  assert.equal(flawed.counts.labelledInputs, 0, 'the flaw must be observable or the fix test proves nothing');
  assert.equal(flawed.counts.placeholderOnlyInputs, 3);
  assert.equal(flawed.checks.allInputsLabelled, false);
});

test('KNOWN-POSITIVE CONTROL: flawed CSS removes focus indication (outline:none) and declares no :focus-visible style', () => {
  assert.ok(flawed.counts.outlineNoneDeclarations >= 1);
  assert.equal(flawed.checks.visibleFocusStyle, false);
});

test('KNOWN-POSITIVE CONTROL: flawed submit control is a <div onclick> with no form, not focusable, not keyboard operable', () => {
  assert.equal(flawed.nativeForm, false);
  assert.equal(flawed.submit.kind, 'custom');
  assert.equal(flawed.submit.focusable, false);
  assert.equal(flawed.submit.keyboardOperable, false);
  assert.equal(flawed.submit.enterInFieldSubmits, false);
  assert.ok(!flawed.tabOrder.some((d) => d.startsWith('div') || d.startsWith('button')), 'submit must be absent from the tab order');
});

test('KNOWN-POSITIVE CONTROL: flawed error text is never associated (no aria-describedby / aria-invalid in script)', () => {
  assert.equal(flawed.script.setsAriaDescribedBy, false);
  assert.equal(flawed.script.setsAriaInvalid, false);
  assert.equal(flawed.checks.errorsAssociable, false);
});

/* ---------- corrected version ---------- */
test('corrected: every input has a <label for> pointing at it; no placeholder-only labels', () => {
  assert.equal(corrected.counts.inputs, 3);
  assert.equal(corrected.counts.labelledInputs, 3);
  assert.equal(corrected.counts.placeholderOnlyInputs, 0);
  const root = parseHTML(read('corrected'));
  for (const l of byTag(root, 'label')) assert.ok(byId(root, l.attrs.get('for')), `label[for=${l.attrs.get('for')}] has a target`);
});

test('corrected: no outline:none anywhere; a :focus-visible rule with a visible outline exists', () => {
  assert.equal(corrected.counts.outlineNoneDeclarations, 0);
  assert.equal(corrected.checks.visibleFocusStyle, true);
});

test('corrected: native <form> and <button type=submit>, inside the form, reachable by Tab, Enter in a field submits', () => {
  assert.equal(corrected.nativeForm, true);
  assert.equal(corrected.submit.kind, 'native');
  assert.equal(corrected.submit.insideForm, true);
  assert.equal(corrected.submit.enterInFieldSubmits, true);
  assert.deepEqual(corrected.tabOrder, ['input#name[type=text]', 'input#email[type=email]', 'input#password[type=password]', 'button[type=submit]']);
});

test('corrected: DOM order is the visual order (no positive tabindex, no CSS reordering)', () => {
  assert.equal(corrected.checks.domOrderIsVisualOrder, true);
  assert.equal(corrected.counts.reorderingCssDeclarations, 0);
});

test('corrected: every static aria-describedby target exists; error containers have ids the script references', () => {
  assert.equal(corrected.counts.danglingDescribedBy, 0);
  assert.equal(corrected.counts.errorContainersWithId, corrected.counts.errorContainers);
  assert.equal(corrected.script.setsAriaDescribedBy, true);
  assert.equal(corrected.script.setsAriaInvalid, true);
});

test('corrected: no unnecessary ARIA roles on native controls', () => {
  const root = parseHTML(read('corrected'));
  for (const el of [...byTag(root, 'input'), ...byTag(root, 'button'), ...byTag(root, 'form')]) assert.equal(el.attrs.has('role'), false, `${el.tagName} carries no redundant role`);
});

/* ---------- the audit as a whole ---------- */
test('audit summary: flawed fails most checks, corrected passes all', () => {
  assert.ok(flawed.failed >= 7, `flawed failed ${flawed.failed}`);
  assert.equal(corrected.failed, 0);
  assert.equal(corrected.passed, Object.keys(corrected.checks).length);
});

test('audit() is a pure function of the markup (same input → same result)', () => {
  const a = audit(read('corrected'), 'x');
  const b = audit(read('corrected'), 'x');
  assert.deepEqual(a.checks, b.checks);
  assert.deepEqual(a.counts, b.counts);
});

/* ---------- demo evidence (journey model) ---------- */
test('evidence.json exists and the corrected journey preserves values, moves focus to the first invalid field, and completes', () => {
  const evPath = path.join(here, 'evidence.json');
  assert.ok(fs.existsSync(evPath), 'run `node demo.mjs` first');
  const ev = JSON.parse(fs.readFileSync(evPath, 'utf8'));
  const c = ev.journeys.corrected;
  assert.equal(c.invalidSubmission.outcome, 'rejected');
  assert.equal(c.invalidSubmission.firstInvalid, 'email');
  assert.equal(c.invalidSubmission.focusMovedTo, 'email');
  assert.equal(c.invalidSubmission.valuesPreserved, true);
  assert.equal(c.invalidSubmission.errors.email.ariaInvalid, 'true');
  assert.equal(c.invalidSubmission.errors.email.ariaDescribedBy, 'email-error');
  assert.equal(c.invalidSubmission.errors.password.ariaDescribedBy, 'password-hint password-error', 'existing hint is kept, error id is appended');
  assert.equal(c.invalidSubmission.errors.name.ariaInvalid, null);
  assert.equal(c.validSubmission.outcome, 'accepted');
  const f = ev.journeys.flawed;
  assert.equal(f.submitControl.reachableByTab, false);
  assert.equal(f.invalidSubmission.outcome, 'unreachable by keyboard');
  assert.equal(f.invalidSubmission.afterTab.enter, 'nothing happened');
  assert.equal(f.invalidSubmission.afterTab.space, 'nothing happened');
});
