// Loopback static server for the two fixture pages. 127.0.0.1 only, ephemeral port by default.
//
//   /before/            -> before/index.html (oversized PNG hero + O(n²) handler)
//   /after/             -> after/index.html  (sized WebP hero + O(n) handler)
//   /assets/*           -> generated images (run make-assets.mjs first)
//   /data.mjs, /handler-before.mjs, /handler-after.mjs -> shared ES modules
//
// Cache-Control is "no-store" so a browser test of a cold load is really cold; a warm-load
// test must then be defined by the tester (see test-conditions.md).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const types = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json'};
const allow = new Set(['/data.mjs', '/handler-before.mjs', '/handler-after.mjs']);

export const app = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let p = url.pathname;
  if (p === '/before' || p === '/before/') p = '/before/index.html';
  if (p === '/after' || p === '/after/') p = '/after/index.html';
  if (p === '/') { res.writeHead(200, {'content-type': types['.html']}); return res.end('<a href="/before/">before</a> · <a href="/after/">after</a>'); }
  const ok = allow.has(p) || p.startsWith('/assets/') || p === '/before/index.html' || p === '/after/index.html';
  const file = path.join(here, path.normalize(p));
  if (!ok || !file.startsWith(here) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  const st = fs.statSync(file);
  res.writeHead(200, {'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store'});
  fs.createReadStream(file).pipe(res);
});

export const listen = (port = 0) => new Promise((r) => app.listen(port, '127.0.0.1', () => r(app.address().port)));
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = await listen(Number(process.argv[2] ?? 0));
  console.log(`ep08 fixture on http://127.0.0.1:${port}/before/  and  http://127.0.0.1:${port}/after/`);
}
