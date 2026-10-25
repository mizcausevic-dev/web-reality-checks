#!/usr/bin/env node
// Static DOM audit for the EP09 registration-form fixture.
// Zero dependencies: a tiny HTML parser (written here) plus node: builtins.
// Runs against flawed/index.html and corrected/index.html and writes audit-results.json.
// The flawed version is the known positive: every check is expected to FAIL there.
//
// This is a static, heuristic audit of markup and CSS text. It is not a browser,
// not an accessibility-conformance tool, and it does not verify screen-reader output.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* Tiny HTML parser → element tree                                     */
/* ------------------------------------------------------------------ */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);

export class Node {
  constructor(type, tagName = null) {
    this.type = type; // 'element' | 'text'
    this.tagName = tagName;
    this.attrs = new Map();
    this.children = [];
    this.parent = null;
    this.text = '';
  }
}

export function parseHTML(html) {
  const root = new Node('element', '#root');
  let cur = root;
  let i = 0;
  const attrRe = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushText(cur, html.slice(i)); break; }
    if (lt > i) pushText(cur, html.slice(i, lt));
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt + 4); i = e === -1 ? html.length : e + 3; continue; }
    if (html.startsWith('<!', lt)) { const e = html.indexOf('>', lt); i = e === -1 ? html.length : e + 1; continue; }
    const gt = html.indexOf('>', lt);
    if (gt === -1) break;
    const raw = html.slice(lt + 1, gt);
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim().toLowerCase();
      let n = cur;
      while (n && n !== root && n.tagName !== name) n = n.parent;
      if (n && n !== root) cur = n.parent;
      i = gt + 1;
      continue;
    }
    const m = /^([a-zA-Z][^\s\/>]*)/.exec(raw);
    if (!m) { i = gt + 1; continue; }
    const tag = m[1].toLowerCase();
    const el = new Node('element', tag);
    let rest = raw.slice(m[0].length);
    const selfClose = /\/\s*$/.test(rest);
    rest = rest.replace(/\/\s*$/, '');
    attrRe.lastIndex = 0;
    let a;
    while ((a = attrRe.exec(rest))) el.attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? '');
    el.parent = cur;
    cur.children.push(el);
    i = gt + 1;
    if (RAW.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const end = close === -1 ? html.length : close;
      pushText(el, html.slice(i, end));
      const gt2 = html.indexOf('>', end);
      i = gt2 === -1 ? html.length : gt2 + 1;
      continue;
    }
    if (!VOID.has(tag) && !selfClose) cur = el;
  }
  return root;
}
function pushText(parent, s) {
  if (!s) return;
  const t = new Node('text');
  t.text = s;
  t.parent = parent;
  parent.children.push(t);
}

export const walk = (n, fn) => { fn(n); for (const c of n.children) walk(c, fn); };
export const all = (root, pred) => { const out = []; walk(root, (n) => { if (n.type === 'element' && pred(n)) out.push(n); }); return out; };
export const byTag = (root, tag) => all(root, (n) => n.tagName === tag);
export const byId = (root, id) => all(root, (n) => n.attrs.get('id') === id)[0] ?? null;
export const textOf = (n) => { let s = ''; walk(n, (x) => { if (x.type === 'text') s += x.text; }); return s.replace(/\s+/g, ' ').trim(); };
export const ancestors = (n) => { const out = []; for (let p = n.parent; p; p = p.parent) out.push(p); return out; };
export const classes = (n) => (n.attrs.get('class') ?? '').split(/\s+/).filter(Boolean);

/* ------------------------------------------------------------------ */
/* Focusability model (static)                                         */
/* ------------------------------------------------------------------ */
const NATIVE_FOCUSABLE = new Set(['input', 'button', 'select', 'textarea']);
export function isFocusable(n) {
  if (n.attrs.has('disabled')) return false;
  if (n.tagName === 'input' && n.attrs.get('type') === 'hidden') return false;
  if (n.attrs.has('tabindex')) return Number(n.attrs.get('tabindex')) >= 0;
  if (NATIVE_FOCUSABLE.has(n.tagName)) return true;
  if (n.tagName === 'a' && n.attrs.has('href')) return true;
  return false;
}
/** Sequential focus order: positive tabindex first (ascending), then DOM order. Positive values are flagged separately. */
export function tabOrder(root) {
  const f = all(root, isFocusable);
  const pos = f.filter((n) => Number(n.attrs.get('tabindex') ?? 0) > 0).sort((a, b) => Number(a.attrs.get('tabindex')) - Number(b.attrs.get('tabindex')));
  const rest = f.filter((n) => !(Number(n.attrs.get('tabindex') ?? 0) > 0));
  return [...pos, ...rest];
}
export const describe = (n) => `${n.tagName}${n.attrs.has('id') ? '#' + n.attrs.get('id') : ''}${n.attrs.has('type') ? `[type=${n.attrs.get('type')}]` : ''}`;

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */
export function audit(html, label) {
  const root = parseHTML(html);
  const inputs = byTag(root, 'input').filter((n) => !['hidden', 'submit', 'button', 'reset'].includes(n.attrs.get('type') ?? 'text'));
  const labels = byTag(root, 'label');
  const forIds = new Set(labels.map((l) => l.attrs.get('for')).filter(Boolean));

  // 1. Labelled inputs
  const labelled = [];
  const placeholderOnly = [];
  for (const inp of inputs) {
    const id = inp.attrs.get('id');
    const hasFor = id && forIds.has(id);
    const wrapped = ancestors(inp).some((a) => a.tagName === 'label');
    const ariaLabel = inp.attrs.has('aria-label') && inp.attrs.get('aria-label').trim() !== '';
    const ariaLabelledBy = inp.attrs.has('aria-labelledby') && inp.attrs.get('aria-labelledby').split(/\s+/).every((x) => byId(root, x));
    const ok = hasFor || wrapped || ariaLabel || ariaLabelledBy;
    if (ok) labelled.push(describe(inp));
    else if (inp.attrs.has('placeholder')) placeholderOnly.push(describe(inp));
  }

  // 2. Positive tabindex
  const positiveTabindex = all(root, (n) => Number(n.attrs.get('tabindex') ?? 0) > 0).map(describe);

  // 3. outline:none / outline:0 in <style> blocks and style attributes; and whether a :focus-visible rule exists
  const css = byTag(root, 'style').map(textOf).join('\n') + '\n' + all(root, (n) => n.attrs.has('style')).map((n) => n.attrs.get('style')).join('\n');
  const outlineNone = (css.match(/outline\s*:\s*(none|0)(px)?\s*[;}]/gi) ?? []).length;
  const focusVisibleRule = /:focus-visible\s*[^{]*\{[^}]*outline\s*:\s*(?!none|0\b)/i.test(css);

  // 4. Submit control
  const form = byTag(root, 'form')[0] ?? null;
  const nativeSubmit = all(root, (n) => (n.tagName === 'button' && (n.attrs.get('type') ?? 'submit') === 'submit') || (n.tagName === 'input' && n.attrs.get('type') === 'submit'));
  const customSubmit = all(root, (n) => !NATIVE_FOCUSABLE.has(n.tagName) && n.tagName !== 'a' && (n.attrs.has('onclick') || /\bbtn\b|submit/i.test(n.attrs.get('class') ?? '') || n.attrs.get('id') === 'submit'));
  let submit;
  if (nativeSubmit.length) {
    const b = nativeSubmit[0];
    submit = {kind: 'native', element: describe(b), insideForm: ancestors(b).some((a) => a.tagName === 'form'), focusable: true, keyboardOperable: true, enterInFieldSubmits: !!form && ancestors(b).some((a) => a.tagName === 'form')};
  } else if (customSubmit.length) {
    const d = customSubmit[0];
    const focusable = isFocusable(d);
    const hasRole = d.attrs.get('role') === 'button';
    const keyHandler = d.attrs.has('onkeydown') || d.attrs.has('onkeyup') || d.attrs.has('onkeypress');
    submit = {kind: 'custom', element: describe(d), insideForm: ancestors(d).some((a) => a.tagName === 'form'), focusable, role: hasRole, keyHandler, keyboardOperable: focusable && hasRole && keyHandler, enterInFieldSubmits: false, text: textOf(d)};
  } else {
    submit = {kind: 'none', keyboardOperable: false, enterInFieldSubmits: false};
  }

  // 5. aria-describedby targets exist (static)
  const describedBy = all(root, (n) => n.attrs.has('aria-describedby'));
  const danglingDescribedBy = [];
  for (const n of describedBy) for (const id of n.attrs.get('aria-describedby').split(/\s+/).filter(Boolean)) if (!byId(root, id)) danglingDescribedBy.push({element: describe(n), missingId: id});

  // 6. Error containers: do they have ids that a field could reference, and are they referenced statically or by the page script?
  const errorEls = all(root, (n) => classes(n).includes('error'));
  const script = byTag(root, 'script').map(textOf).join('\n');
  const errorsWithIds = errorEls.filter((n) => n.attrs.has('id')).length;
  const scriptSetsDescribedBy = /aria-describedby/.test(script);
  const scriptSetsInvalid = /aria-invalid/.test(script);
  const scriptClearsValuesOnError = /\.value\s*=\s*''/.test(script) && !/firstInvalid/.test(script); // heuristic, confirmed by demo.mjs run

  // 7. DOM order == visual order: flag CSS that reorders (order:, flex-direction: *-reverse, position absolute on fields)
  const reorderingCss = (css.match(/(^|[;{\s])(order\s*:|flex-direction\s*:\s*[a-z]+-reverse|float\s*:)/gi) ?? []).length;

  const findings = {
    label,
    counts: {
      inputs: inputs.length,
      labelledInputs: labelled.length,
      placeholderOnlyInputs: placeholderOnly.length,
      positiveTabindex: positiveTabindex.length,
      outlineNoneDeclarations: outlineNone,
      focusableElements: tabOrder(root).length,
      errorContainers: errorEls.length,
      errorContainersWithId: errorsWithIds,
      danglingDescribedBy: danglingDescribedBy.length,
      reorderingCssDeclarations: reorderingCss,
    },
    tabOrder: tabOrder(root).map(describe),
    nativeForm: !!form,
    focusVisibleRule,
    submit,
    labelled,
    placeholderOnly,
    positiveTabindex,
    danglingDescribedBy,
    script: {setsAriaDescribedBy: scriptSetsDescribedBy, setsAriaInvalid: scriptSetsInvalid, clearsValuesOnSuccessOnly: !scriptClearsValuesOnError},
    checks: {
      allInputsLabelled: labelled.length === inputs.length,
      noPlaceholderOnlyLabels: placeholderOnly.length === 0,
      noPositiveTabindex: positiveTabindex.length === 0,
      noOutlineNone: outlineNone === 0,
      visibleFocusStyle: focusVisibleRule,
      nativeForm: !!form,
      submitKeyboardOperable: submit.keyboardOperable,
      enterSubmitsFromField: submit.enterInFieldSubmits,
      describedByTargetsExist: danglingDescribedBy.length === 0,
      errorsAssociable: errorsWithIds === errorEls.length && scriptSetsDescribedBy && scriptSetsInvalid,
      domOrderIsVisualOrder: reorderingCss === 0 && positiveTabindex.length === 0,
    },
  };
  findings.passed = Object.values(findings.checks).filter(Boolean).length;
  findings.failed = Object.values(findings.checks).filter((x) => !x).length;
  return findings;
}

export function runAudit() {
  const versions = ['flawed', 'corrected'];
  const results = {};
  for (const v of versions) {
    const html = fs.readFileSync(path.join(here, v, 'index.html'), 'utf8');
    results[v] = audit(html, v);
  }
  return {generatedAt: new Date().toISOString(), method: 'static markup + CSS text audit; no browser; not an accessibility-conformance claim', results};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = runAudit();
  fs.writeFileSync(path.join(here, 'audit-results.json'), JSON.stringify(out, null, 2));
  for (const v of Object.keys(out.results)) {
    const r = out.results[v];
    console.log(`\n== ${v} ==  checks passed ${r.passed} / failed ${r.failed}`);
    for (const [k, ok] of Object.entries(r.checks)) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${k}`);
    console.log('  counts:', JSON.stringify(r.counts));
    console.log('  tab order:', r.tabOrder.join(' → ') || '(nothing focusable)');
  }
  console.log('\nwrote audit-results.json');
}
