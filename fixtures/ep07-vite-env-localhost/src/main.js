// EP07 fixture client. The ONLY source of the API address is the literal
// `import.meta.env.VITE_API_BASE_URL` below. Vite replaces that expression with a
// string literal when it builds the bundle (vite:define plugin), so whatever value
// was present at BUILD time is what every browser that loads this bundle will use.
//
// VITE_-prefixed values are public client configuration. They ship to every visitor.
// Never put a secret in one.
const base = import.meta.env.VITE_API_BASE_URL;

const $ = (id) => document.getElementById(id);
$('base').textContent = String(base);

const status = $('status');
try {
  const res = await fetch(`${base}/health`);
  const body = await res.json().catch(() => null);
  status.className = res.ok ? 'ok' : 'err';
  status.textContent = `GET ${base}/health → ${res.status} ${res.statusText} ${body ? JSON.stringify(body) : ''}`;
} catch (err) {
  // Report the ACTUAL error, not a guess. In a browser an unreachable host surfaces as
  // `TypeError: Failed to fetch` (the console additionally shows net::ERR_CONNECTION_REFUSED).
  // Do not label every failure "CORS".
  status.className = 'err';
  status.textContent = `GET ${base}/health failed → ${err.name}: ${err.message}`;
}
