// serve.mjs — minimal loopback static server for app/ (http://127.0.0.1 is a secure context,
// so service workers and IndexedDB work without HTTPS).
//
//   node serve.mjs            → picks an ephemeral port and prints the URL
//   node serve.mjs 8787       → fixed port (handy for repeat runs: the idb:// data and the
//                               service worker registration are keyed by origin, i.e. by port)
//
// Exports {start} so tests can spin it up programmatically.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), 'app');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

export const app = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root) || req.method !== 'GET') { res.writeHead(404); return res.end('not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-cache', // the service worker owns offline caching; the HTTP cache must not mask it
      'service-worker-allowed': '/',
    });
    fs.createReadStream(file).pipe(res);
  });
});

export const start = (port = 0) => new Promise((resolve) => app.listen(port, '127.0.0.1', () => resolve(app.address().port)));

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  if (!fs.existsSync(path.join(root, 'vendor', 'pglite', 'index.js'))) { console.error('app/vendor/pglite is missing — run `node build-vendor.mjs` first'); process.exit(1); }
  const port = await start(Number(process.argv[2] ?? 0));
  console.log(`serving ${root}\n→ http://127.0.0.1:${port}/   (Ctrl+C to stop)`);
}
