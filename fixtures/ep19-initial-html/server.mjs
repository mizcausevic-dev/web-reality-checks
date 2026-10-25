// Episode 19 fixture: loopback static server for dist/.
//
// Policy (deliberate):
//   - Serves EXACT paths only. "/csr/article/" -> dist/csr/article/index.html. "/csr/app.js" -> that file.
//   - A directory path without a trailing slash ("/csr/article") is redirected 301 to the slash form,
//     so there is exactly one canonical URL per page.
//   - Anything else is an explicit 404 with a short HTML body. There is NO SPA fallback: a dev
//     server's "serve index.html for every unknown route" would make a missing page look like a
//     200 OK shell, hiding route errors from both people and crawlers.
//   - GET and HEAD only; other methods get 405. Path traversal is refused by resolving inside dist/.
//   - Binds 127.0.0.1, ephemeral port. Nothing here is a production server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {dist} from './build.mjs';

const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8'};

export const requestLog = [];

const notFound = (res, pathname) => {
  res.writeHead(404, {'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex'});
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not found</title><meta name="robots" content="noindex"></head><body><h1>404 Not found</h1><p>No page at <code>${pathname.replace(/[<>&"]/g, '')}</code>. This server has no fallback route.</p></body></html>\n`);
};

export const app = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = decodeURIComponent(url.pathname);
  const entry = {method: req.method, path: pathname, status: 0};
  requestLog.push(entry);
  const done = (code) => { entry.status = code; };

  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {allow: 'GET, HEAD'}); res.end(); return done(405); }

  const abs = path.resolve(dist, '.' + pathname);
  if (!abs.startsWith(dist + path.sep) && abs !== dist) { notFound(res, pathname); return done(404); }

  let file = abs;
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    if (!pathname.endsWith('/')) { res.writeHead(301, {location: pathname + '/'}); res.end(); return done(301); }
    file = path.join(abs, 'index.html');
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { notFound(res, pathname); return done(404); }

  const body = fs.readFileSync(file);
  res.writeHead(200, {'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'content-length': body.length, 'cache-control': 'no-store'});
  res.end(req.method === 'HEAD' ? undefined : body);
  done(200);
});

export const listen = () => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));

if (import.meta.url === `file://${process.argv[1]}`) {
  const {build} = await import('./build.mjs');
  build();
  listen().then((p) => console.log(`ep19 fixture on http://127.0.0.1:${p}  (try /csr/article/ and /ssg/article/)`));
}
