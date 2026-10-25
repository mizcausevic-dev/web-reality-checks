// Loopback-only HTTP wrapper around the synthetic directory. Binds 127.0.0.1 on an ephemeral port.
// /admin/* routes are a TEST HARNESS (worker trigger, fault injection, state snapshot) with no
// authentication; acceptable only because the server never leaves loopback and holds synthetic data.
import http from 'node:http';
import {createDirectory, parseId} from './directory.mjs';

export const createApp = (opts = {}) => {
  const dir = createDirectory(opts);
  const send = (res, status, body, headers = {}) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, {'content-type': 'application/json', ...headers});
    res.end(data);
  };
  const readJson = (req) =>
    new Promise((resolve) => {
      let s = '';
      req.on('data', (c) => (s += c));
      req.on('end', () => {
        try { resolve(s ? JSON.parse(s) : {}); } catch { resolve(null); }
      });
    });

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    let m;
    try {
      if (req.method === 'GET' && (m = /^\/contacts\/([^/]+)$/.exec(p))) {
        const c = dir.getPrimary(m[1]);
        return c ? send(res, 200, c) : send(res, 404, {error: 'not found'});
      }
      if (req.method === 'GET' && p === '/search') {
        const r = dir.search(u.searchParams.get('q') ?? '');
        return send(res, 200, {query: r.query, results: r.results}, {'x-cache': r.cache});
      }
      if (req.method === 'POST' && p === '/contacts') {
        const b = await readJson(req);
        if (!b || !b.name || !b.email || !b.phone || !b.org) return send(res, 400, {error: 'name, email, phone, org required'});
        return send(res, 201, {id: dir.createContact(b)});
      }
      // FLAWED: deletes the primary row only.
      if (req.method === 'DELETE' && (m = /^\/vuln\/contacts\/([^/]+)$/.exec(p))) {
        if (parseId(m[1]) == null) return send(res, 400, {error: 'bad id'});
        return dir.deleteContactFlawed(m[1]).deleted ? send(res, 204) : send(res, 404, {error: 'not found'});
      }
      // CORRECTED: primary delete + outbox event in one transaction; cleanup runs later (202 Accepted).
      if (req.method === 'DELETE' && (m = /^\/contacts\/([^/]+)$/.exec(p))) {
        if (parseId(m[1]) == null) return send(res, 400, {error: 'bad id'});
        let r;
        try { r = dir.deleteContact(m[1]); } catch (e) { return send(res, 500, {error: e.message}); }
        return r ? send(res, 202, r) : send(res, 404, {error: 'not found'});
      }
      if (req.method === 'POST' && p === '/admin/worker/run') return send(res, 200, {results: dir.worker.runOnce()});
      if (req.method === 'POST' && (m = /^\/admin\/worker\/retry\/(\d+)$/.exec(p))) {
        try { return send(res, 200, dir.worker.retryFailed(Number(m[1]))); } catch (e) { return send(res, 409, {error: e.message}); }
      }
      if (req.method === 'POST' && p === '/admin/fault') {
        const b = await readJson(req);
        try { dir.injectFault(b?.name, b?.times ?? 1); } catch (e) { return send(res, 400, {error: e.message}); }
        return send(res, 200, {faults: dir.faults});
      }
      if (req.method === 'GET' && (m = /^\/admin\/snapshot\/([^/]+)$/.exec(p))) return send(res, 200, dir.snapshot(m[1]));
      if (req.method === 'GET' && p === '/admin/alerts') return send(res, 200, {alerts: dir.alerts});
      send(res, 404, {error: 'no route'});
    } catch (e) {
      send(res, 500, {error: e.message});
    }
  });

  const listen = () => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  const close = () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
  return {dir, server, listen, close};
};
