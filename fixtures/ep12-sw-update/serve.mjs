// Loopback static server for the EP12 fixture.
//   node serve.mjs --build 1     serves build1/ at /   (then switch to --build 2 to "deploy")
//   node serve.mjs --build 2
// /sw.js is always sent with Cache-Control: no-cache so the HTTP cache never hides a new worker
// script from the browser's update check. (HTTP cache and service-worker Cache Storage are
// separate stores; this header concerns only the former.)
// GET /__build returns the build currently served, for scripts and the manual checklist.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json'};

export const createServer = (build) => {
  let current = build;
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/__build') { res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'}); return res.end(JSON.stringify({build: current})); }
    if (url.pathname.startsWith('/__set-build/')) { // test/demo convenience: swap builds without restarting
      const b = Number(url.pathname.split('/').pop()); if (![1, 2].includes(b)) { res.writeHead(400); return res.end('build must be 1 or 2'); }
      current = b; res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'}); return res.end(JSON.stringify({build: current}));
    }
    const rel = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.join(here, `build${current}`, path.normalize(rel));
    if (!file.startsWith(path.join(here, `build${current}`)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, {'content-type': 'text/plain'}); return res.end('not found'); }
    const headers = {'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'x-wrc-build': String(current)};
    headers['cache-control'] = rel === '/sw.js' ? 'no-cache' : 'no-store'; // fixture: keep the HTTP cache out of the experiment entirely
    res.writeHead(200, headers);
    res.end(fs.readFileSync(file));
  });
  srv.setBuild = (b) => { current = b; };
  srv.getBuild = () => current;
  return srv;
};

export const listen = (build = 1) => { const srv = createServer(build); return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({srv, port: srv.address().port}))); };

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--build');
  const build = i > -1 ? Number(process.argv[i + 1]) : 1;
  if (![1, 2].includes(build)) { console.error('usage: node serve.mjs --build 1|2'); process.exit(2); }
  for (const b of [1, 2]) if (!fs.existsSync(path.join(here, `build${b}`, 'sw.js'))) { console.error('run `node generate-sw.mjs` first'); process.exit(2); }
  listen(build).then(({port}) => console.log(`ep12 fixture serving Build ${build} on http://127.0.0.1:${port}/  (sw at /sw.js, Cache-Control: no-cache)`));
}
