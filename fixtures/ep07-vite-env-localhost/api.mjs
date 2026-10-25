// EP07 fixture: the API the frontend calls. Loopback only, ephemeral port.
//
//   GET /health  -> 200 {"ok":true,"service":"ep07-api","port":N}
//
// CORS is configured DELIBERATELY via an allowlist of static-host origins so that a
// cross-origin browser fetch from the static host succeeds and CORS cannot be the
// failure this episode is about. An Origin that is not allowlisted gets no
// Access-Control-Allow-Origin header (the browser would then block the response).
import http from 'node:http';

export const startApi = ({allowOrigins = new Set()} = {}) => {
  const allow = allowOrigins instanceof Set ? allowOrigins : new Set(allowOrigins);
  const requests = [];
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const allowed = origin && allow.has(origin);
    requests.push({method: req.method, url: req.url, origin: origin ?? null, corsAllowed: Boolean(allowed)});
    if (allowed) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
    }
    if (req.method === 'OPTIONS') { res.writeHead(allowed ? 204 : 403, {'access-control-allow-methods': 'GET'}); return res.end(); }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, {'content-type': 'application/json'});
      return res.end(JSON.stringify({ok: true, service: 'ep07-api', port: server.address().port}));
    }
    res.writeHead(404, {'content-type': 'application/json'});
    res.end(JSON.stringify({error: 'not found'}));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    resolve({
      port,
      base: `http://127.0.0.1:${port}`,
      allowOrigin: (o) => allow.add(o),
      requests,
      close: () => new Promise((r) => server.close(r)),
    });
  }));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const origins = process.argv.slice(2);
  startApi({allowOrigins: origins}).then((a) => console.log(`ep07 API on ${a.base}  (CORS allowlist: ${origins.join(', ') || 'none'})`));
}
