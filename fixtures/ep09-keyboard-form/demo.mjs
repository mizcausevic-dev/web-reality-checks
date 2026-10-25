#!/usr/bin/env node
// Runs the exact keyboard journey the video shows, against both fixture versions,
// and writes evidence.json.
//
// HOW THIS WORKS (read before quoting numbers):
//   * No browser is available in this environment. The journey is driven by a
//     keyboard-journey MODEL: sequential focus order comes from the static DOM
//     (audit.mjs tabOrder), Enter/Space behaviour comes from HTML semantics
//     (native <form>/<button> vs. a <div> with onclick), and the validation
//     rules are mirrored from the page scripts (same regex / lengths / messages).
//   * The aria-invalid / aria-describedby / focus-management outcomes recorded
//     for the corrected version describe what its script sets; they are checked
//     against the script text, not observed in a rendered page.
//   * Nothing here verifies what a screen reader would announce.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML, tabOrder, byId, byTag, describe, ancestors, textOf, runAudit} from './audit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// Validation rules mirrored from both pages' scripts (identical in both versions).
const RULES = {
  name: {test: (v) => v.trim().length > 0, msg: 'Please enter your name.'},
  email: {test: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), msg: 'That email address does not look right.'},
  password: {test: (v) => v.length >= 8, msg: 'Password must be at least 8 characters.'},
};

// Synthetic data only.
const INVALID = {name: 'Dana Okafor', email: 'dana.okafor@example', password: 'short1'};
const VALID = {name: 'Dana Okafor', email: 'dana.okafor@example.test', password: 'correct-horse-9'};

function model(version) {
  const html = fs.readFileSync(path.join(here, version, 'index.html'), 'utf8');
  const root = parseHTML(html);
  const script = byTag(root, 'script').map(textOf).join('\n');
  const order = tabOrder(root);
  const form = byTag(root, 'form')[0] ?? null;
  const nativeSubmit = order.find((n) => n.tagName === 'button' && (n.attrs.get('type') ?? 'submit') === 'submit') ?? null;
  const customSubmit = byId(root, 'submit');
  const values = {name: '', email: '', password: ''};
  const state = {name: {}, email: {}, password: {}};
  const keys = [];
  let focus = -1; // index into order; -1 = document body
  const focusedEl = () => (focus >= 0 ? order[focus] : null);
  const log = [];
  const press = (key, note) => { keys.push(key); log.push({key, focus: focusedEl() ? describe(focusedEl()) : 'body', note}); };

  const runValidation = (source) => {
    let firstInvalid = null;
    for (const id of ['name', 'email', 'password']) {
      const ok = RULES[id].test(values[id]);
      if (version === 'corrected') {
        // mirrors setError(): error text + aria-invalid + aria-describedby appended; values untouched
        const inp = byId(root, id);
        const base = (inp.attrs.get('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        state[id] = ok ? {error: null, ariaInvalid: null, ariaDescribedBy: base.length ? base.join(' ') : null} : {error: RULES[id].msg, ariaInvalid: 'true', ariaDescribedBy: [...base, `${id}-error`].join(' ')};
      } else {
        // mirrors flawed submitForm(): error div shown, nothing associated
        state[id] = ok ? {error: null, ariaInvalid: null, ariaDescribedBy: null} : {error: RULES[id].msg, ariaInvalid: null, ariaDescribedBy: null};
      }
      if (!ok && !firstInvalid) firstInvalid = id;
    }
    if (firstInvalid) {
      if (version === 'corrected' && /firstInvalid\.focus\(\)/.test(script)) focus = order.findIndex((n) => n.attrs.get('id') === firstInvalid);
      return {outcome: 'rejected', firstInvalid, focusMovedTo: version === 'corrected' ? firstInvalid : null, valuesAfter: {...values}, source};
    }
    if (version === 'flawed' && /\.value\s*=\s*''/.test(script)) { values.name = ''; values.email = ''; values.password = ''; }
    return {outcome: 'accepted', source, valuesAfter: {...values}};
  };

  // Enter inside a text field: implicit submission only exists inside a native <form> with a submit control.
  const enterInField = () => {
    const el = focusedEl();
    const inForm = el && ancestors(el).some((a) => a.tagName === 'form');
    if (inForm && nativeSubmit) return runValidation('Enter in field → implicit form submission');
    return {outcome: 'nothing happened', source: 'Enter in field (no <form>)'};
  };
  // Enter/Space on the focused element.
  const activate = (key) => {
    const el = focusedEl();
    if (el === nativeSubmit && nativeSubmit) return runValidation(`${key} on <button type=submit>`);
    if (el && el.tagName === 'input') return key === 'Enter' ? enterInField() : {outcome: 'typed a space into the field', source: `${key} in field`};
    return {outcome: 'nothing happened', source: `${key} on ${el ? describe(el) : 'body'}`};
  };
  const tab = (dir = 1) => { focus = Math.max(-1, Math.min(order.length, focus + dir)); if (focus === order.length) focus = -1; };
  const type = (id, v) => { values[id] = v; };

  /* ---- Journey 1: Tab through everything, try to reach and activate submit ---- */
  const tabStops = [];
  focus = -1;
  for (let i = 0; i < order.length + 1; i++) { tab(); press('Tab', 'move focus forward'); if (focusedEl()) tabStops.push(describe(focusedEl())); }
  const submitReachable = order.some((n) => n === nativeSubmit || (customSubmit && n === customSubmit));
  const submitDescribe = nativeSubmit ? describe(nativeSubmit) : customSubmit ? describe(customSubmit) : 'none';
  const focusVisibleAtEachStop = runAudit().results[version].checks.visibleFocusStyle;
  const sweepKeys = keys.length;

  /* ---- Journey 2: fill invalid data with keyboard, submit with Enter from the password field ---- */
  focus = -1;
  tab(); press('Tab', 'focus first field'); type('name', INVALID.name);
  tab(); press('Tab', 'focus email'); type('email', INVALID.email);
  tab(); press('Tab', 'focus password'); type('password', INVALID.password);
  const enterResult = enterInField(); press('Enter', `in password field → ${enterResult.outcome}`);

  /* ---- Journey 2b: if Enter did nothing, Tab onward and try Enter and Space on whatever follows ---- */
  let afterTab = null;
  if (enterResult.outcome === 'nothing happened') {
    tab(); press('Tab', `after last field → ${focusedEl() ? describe(focusedEl()) : 'focus left the form (body)'}`);
    const e = activate('Enter'); press('Enter', e.outcome);
    const s = activate('Space'); press('Space', s.outcome);
    afterTab = {focusAfterTab: focusedEl() ? describe(focusedEl()) : 'body', enter: e.outcome, space: s.outcome};
  }
  const invalidSubmit = enterResult.outcome === 'nothing happened' ? {outcome: 'unreachable by keyboard', valuesAfter: {...values}} : enterResult;
  const errorsAfterInvalid = JSON.parse(JSON.stringify(state));
  const focusAfterInvalid = focusedEl() ? describe(focusedEl()) : 'body';

  /* ---- Journey 3 (corrected only meaningful): fix data in place, Tab to the button, press Space ---- */
  let validSubmit = null;
  if (version === 'corrected') {
    // focus is on the first invalid field (email). Correct it, then password.
    type('email', VALID.email);
    tab(); press('Tab', 'focus password'); type('password', VALID.password);
    tab(); press('Tab', `focus ${describe(focusedEl())}`);
    validSubmit = activate('Space'); press('Space', `on submit button → ${validSubmit.outcome}`);
  } else {
    // In the flawed version there is no keyboard path to submission at all; record that instead of pretending.
    validSubmit = {outcome: 'no keyboard path to submission', source: 'n/a'};
  }

  return {
    version,
    tabOrder: order.map(describe),
    tabStops,
    submitControl: {element: submitDescribe, kind: nativeSubmit ? 'native <button type=submit>' : customSubmit ? '<div onclick>' : 'none', reachableByTab: submitReachable, insideNativeForm: !!form},
    focusVisibleStyleDeclared: focusVisibleAtEachStop,
    invalidSubmission: {...invalidSubmit, data: INVALID, errors: errorsAfterInvalid, focusAfter: focusAfterInvalid, valuesPreserved: JSON.stringify(invalidSubmit.valuesAfter) === JSON.stringify(INVALID), afterTab},
    validSubmission: validSubmit && {...validSubmit, data: version === 'corrected' ? VALID : null},
    keystrokes: keys,
    keystrokesAfterSweep: keys.slice(sweepKeys),
    keyLog: log,
  };
}

const audit = runAudit();
const flawed = model('flawed');
const corrected = model('corrected');
const evidence = {
  generatedAt: new Date().toISOString(),
  method: 'keyboard-journey model over the static DOM (tab order from markup, Enter/Space from HTML semantics, validation rules mirrored from the page scripts). No browser, no screen reader. Associations are implemented in markup/script; announcements were not verified.',
  audit: {
    flawed: {passed: audit.results.flawed.passed, failed: audit.results.flawed.failed, counts: audit.results.flawed.counts, checks: audit.results.flawed.checks},
    corrected: {passed: audit.results.corrected.passed, failed: audit.results.corrected.failed, counts: audit.results.corrected.counts, checks: audit.results.corrected.checks},
  },
  journeys: {flawed, corrected},
  summary: {
    flawed: {
      tabStops: flawed.tabStops.length,
      submitReachable: flawed.submitControl.reachableByTab,
      enterInFieldSubmits: flawed.invalidSubmission.outcome !== 'unreachable by keyboard',
      labelledInputs: `${audit.results.flawed.counts.labelledInputs}/${audit.results.flawed.counts.inputs}`,
      outlineNoneDeclarations: audit.results.flawed.counts.outlineNoneDeclarations,
      errorsAssociated: audit.results.flawed.checks.errorsAssociable,
    },
    corrected: {
      tabStops: corrected.tabStops.length,
      submitReachable: corrected.submitControl.reachableByTab,
      enterInFieldSubmits: corrected.invalidSubmission.outcome === 'rejected',
      firstInvalidField: corrected.invalidSubmission.firstInvalid,
      focusMovedTo: corrected.invalidSubmission.focusMovedTo,
      valuesPreserved: corrected.invalidSubmission.valuesPreserved,
      labelledInputs: `${audit.results.corrected.counts.labelledInputs}/${audit.results.corrected.counts.inputs}`,
      outlineNoneDeclarations: audit.results.corrected.counts.outlineNoneDeclarations,
      errorsAssociated: audit.results.corrected.checks.errorsAssociable,
      validSubmission: corrected.validSubmission.outcome,
      keystrokesToComplete: corrected.keystrokesAfterSweep.length,
    },
  },
};
fs.writeFileSync(path.join(here, 'evidence.json'), JSON.stringify(evidence, null, 2));
console.table([{version: 'flawed', ...evidence.summary.flawed}, {version: 'corrected', ...evidence.summary.corrected}]);
console.log('wrote evidence.json');
