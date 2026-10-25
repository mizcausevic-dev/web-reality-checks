// Episode 19 fixture: inspection.
//
//   inspectRaw(base)          plain HTTP fetch of both routes; measures what the INITIAL RESPONSE contains
//                             (article paragraphs present, <h1>/<h2> count, <a href> list, title, description,
//                             robots). Writes captures/raw-csr.html and captures/raw-ssg.html.
//   captureDom(base, {js})    drives the Remotion-bundled headless Chrome over the DevTools protocol (CDP, via
//                             Node's built-in WebSocket) and returns document.documentElement.outerHTML after
//                             load, with JavaScript enabled or disabled (Emulation.setScriptExecutionDisabled)
//                             in a fresh temporary profile. Writes captures/dom-*.html.
//   main                      runs both and writes inspection-results.json.
//
// What these are NOT: a plain HTTP fetch is not a search-engine rendering test, and a browser with scripts
// disabled is not a Googlebot simulator. They show what each artefact contains; they say nothing about
// indexing or ranking. The counts are string/regex measures of synthetic content, not a DOM parser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {article} from './build.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
export const capturesDir = path.join(here, 'captures');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const CHROME = process.env.EP19_CHROME ?? path.resolve(here, '../../video/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell');

/** Measure what an HTML string contains, relative to article.json. */
export function measure(html) {
  const paragraphs = article.sections.flatMap((s) => s.paragraphs);
  const paragraphsPresent = paragraphs.filter((p) => html.includes(esc(p))).length;
  const headingsExpected = article.sections.map((s) => s.heading);
  const headingsPresent = headingsExpected.filter((h) => html.includes(`<h2>${esc(h)}</h2>`)).length;
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  const h2 = (html.match(/<h2[\s>]/g) ?? []).length;
  const hrefs = [...html.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? null;
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null;
  const articleWords = paragraphs.join(' ').split(/\s+/).length;
  const articleWordsPresent = paragraphs.filter((p) => html.includes(esc(p))).join(' ').split(/\s+/).filter(Boolean).length;
  return {
    bytes: Buffer.byteLength(html),
    title, description, robots,
    h1Count: h1, h2Count: h2,
    articleHeadingsPresent: headingsPresent, articleHeadingsExpected: headingsExpected.length,
    articleParagraphsPresent: paragraphsPresent, articleParagraphsExpected: paragraphs.length,
    articleWordsPresent, articleWordsExpected: articleWords,
    linkHrefs: hrefs, linkCount: hrefs.length,
    scriptTags: (html.match(/<script[\s>]/g) ?? []).length,
    renderedByClientJs: /data-rendered-by="client-js"/.test(html),
    containsLoadingShell: /Loading article…/.test(html),
  };
}

export async function fetchRaw(base, route) {
  const r = await fetch(base + route, {redirect: 'manual'});
  const html = await r.text();
  return {route, status: r.status, contentType: r.headers.get('content-type'), html};
}

export async function inspectRaw(base) {
  fs.mkdirSync(capturesDir, {recursive: true});
  const out = {};
  for (const v of ['csr', 'ssg']) {
    const r = await fetchRaw(base, `/${v}/article/`);
    fs.writeFileSync(path.join(capturesDir, `raw-${v}.html`), r.html);
    out[v] = {route: r.route, status: r.status, contentType: r.contentType, file: `captures/raw-${v}.html`, ...measure(r.html)};
  }
  return out;
}

/** Launch the bundled headless Chrome, load a URL, return the serialised DOM after load. */
export async function captureDom(url, {js = true, settleMs = 1500, timeoutMs = 20000} = {}) {
  if (!fs.existsSync(CHROME)) return {ok: false, reason: `chrome not found at ${CHROME}`};
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ep19-chrome-'));
  const args = ['--headless=new', '--no-sandbox', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage', '--no-proxy-server', '--no-first-run', '--disable-extensions', '--disable-background-networking', `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'];
  const chrome = spawn(CHROME, args, {stdio: ['ignore', 'ignore', 'pipe']});
  const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { fs.rmSync(prof, {recursive: true, force: true}); } catch {} };
  const deadline = new Promise((_, rej) => setTimeout(() => rej(new Error('chrome timeout')), timeoutMs).unref());
  try {
    const wsUrl = await Promise.race([deadline, new Promise((res) => { let buf = ''; chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\S+)/); if (m) res(m[1]); }); chrome.on('exit', () => res(null)); })]);
    if (!wsUrl) throw new Error('chrome exited before DevTools listened');
    const ws = new WebSocket(wsUrl);
    await Promise.race([deadline, new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); })]);
    let id = 0; const pending = new Map(); const events = [];
    ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else events.push(m); });
    const send = (method, params = {}, sessionId) => Promise.race([deadline, new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id: i, method, params, ...(sessionId ? {sessionId} : {})})); })]);
    const {result: {targetId}} = await send('Target.createTarget', {url: 'about:blank'});
    const {result: {sessionId}} = await send('Target.attachToTarget', {targetId, flatten: true});
    await send('Page.enable', {}, sessionId);
    await send('Network.enable', {}, sessionId);
    if (!js) await send('Emulation.setScriptExecutionDisabled', {value: true}, sessionId);
    const nav = await send('Page.navigate', {url}, sessionId);
    // wait for load event, then a short settle so the CSR fetch+insert (same host, loopback) can finish
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs && !events.some((e) => e.method === 'Page.loadEventFired' && e.sessionId === sessionId)) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, settleMs));
    const html = (await send('Runtime.evaluate', {expression: 'document.documentElement.outerHTML', returnByValue: true}, sessionId)).result?.result?.value ?? '';
    const requests = events.filter((e) => e.method === 'Network.requestWillBeSent' && e.sessionId === sessionId).map((e) => new URL(e.params.request.url).pathname);
    const mainStatus = events.find((e) => e.method === 'Network.responseReceived' && e.sessionId === sessionId && e.params.type === 'Document')?.params.response.status ?? null;
    ws.close();
    return {ok: true, js, url, mainStatus, requests, html, loadErrorText: nav.result?.errorText ?? null, chromeVersion: null};
  } catch (e) {
    return {ok: false, js, url, reason: String(e.message ?? e)};
  } finally { cleanup(); }
}

export async function inspectDom(base) {
  fs.mkdirSync(capturesDir, {recursive: true});
  const out = {};
  const runs = [['csr', true], ['ssg', true], ['csr', false], ['ssg', false]];
  for (const [v, js] of runs) {
    const key = `${v}${js ? '' : '-nojs'}`;
    const r = await captureDom(`${base}/${v}/article/`, {js});
    if (r.ok) {
      fs.writeFileSync(path.join(capturesDir, `dom-${key}.html`), r.html);
      out[key] = {route: `/${v}/article/`, javascript: js ? 'enabled' : 'disabled (Emulation.setScriptExecutionDisabled)', mainStatus: r.mainStatus, requests: r.requests, file: `captures/dom-${key}.html`, ...measure(r.html)};
    } else {
      out[key] = {route: `/${v}/article/`, javascript: js ? 'enabled' : 'disabled', blocked: true, reason: r.reason};
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {build} = await import('./build.mjs');
  const {app, listen} = await import('./server.mjs');
  build();
  const port = await listen();
  const base = `http://127.0.0.1:${port}`;
  const raw = await inspectRaw(base);
  const dom = await inspectDom(base);
  const results = {generatedAt: new Date().toISOString(), method: {raw: 'plain HTTP GET via fetch(); initial response body only', dom: 'headless Chrome (Remotion bundle) over CDP; document.documentElement.outerHTML after load + 1.5 s settle'}, raw, dom};
  fs.writeFileSync(path.join(here, 'inspection-results.json'), JSON.stringify(results, null, 2));
  console.table(Object.entries({...Object.fromEntries(Object.entries(raw).map(([k, v]) => [`raw ${k}`, v])), ...Object.fromEntries(Object.entries(dom).map(([k, v]) => [`dom ${k}`, v]))}).map(([k, v]) => ({capture: k, status: v.status ?? v.mainStatus ?? (v.blocked ? 'BLOCKED' : '-'), paragraphs: v.articleParagraphsPresent ?? '-', h2: v.h2Count ?? '-', links: v.linkCount ?? '-'})));
  app.close();
}
