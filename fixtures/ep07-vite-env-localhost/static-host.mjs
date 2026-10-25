// EP07 fixture: a static file host for a built Vite bundle. Loopback only, ephemeral port.
//
//   node static-host.mjs [distDir] [--inject-env URL]
//
// `--inject-env URL` sets process.env.VITE_API_BASE_URL on THIS HOST PROCESS at runtime and
// exposes it at GET /__host-env. It exists to demonstrate that a server-side environment
// change cannot rewrite the files in dist/: the host serves bytes, it does not rebuild.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};

export const serveDist = ({distDir, injectEnv = null} = {}) => {
  const root = path.resolve(distDir);
  if (injectEnv != null) process.env.VITE_API_BASE_URL = injectEnv; // runtime env change on the host
  const served = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/__host-env') {
      res.writeHead(200, {'content-type': 'application/json'});
      return res.end(JSON.stringify({VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? null, note: 'process.env of the static host process; NOT what the bundle contains'}));
    }
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, {'content-type': 'text/plain'}); return res.end('not found'); }
    served.push(rel);
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    resolve({port, origin: `http://127.0.0.1:${port}`, distDir: root, served, close: () => new Promise((r) => server.close(r))});
  }));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--inject-env');
  const injectEnv = i >= 0 ? args[i + 1] : null;
  const distDir = args.find((a, j) => !a.startsWith('--') && j !== i + 1) ?? path.join(path.dirname(new URL(import.meta.url).pathname), 'dist');
  serveDist({distDir, injectEnv}).then((h) => console.log(`ep07 static host serving ${h.distDir} on ${h.origin}` + (injectEnv ? `  (host process.env.VITE_API_BASE_URL=${injectEnv}; bundle unchanged)` : '')));
}
