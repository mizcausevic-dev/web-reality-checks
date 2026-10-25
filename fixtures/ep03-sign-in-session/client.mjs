// Tiny cookie-jar HTTP client for tests and demo. Models a browser's cookie store
// well enough for a loopback fixture: stores cookies by name, drops them when expired,
// records every Set-Cookie it sees. Not a browser.
export const makeClient = (base, {forwardedProto = 'https'} = {}) => {
  const jar = new Map(); // name -> {value, attrs}
  const seen = []; // raw Set-Cookie headers in order
  const parseSetCookie = (raw) => {
    const [nv, ...rest] = raw.split(';').map((s) => s.trim());
    const eq = nv.indexOf('=');
    const name = nv.slice(0, eq);
    const value = nv.slice(eq + 1);
    const attrs = {};
    for (const a of rest) {
      const i = a.indexOf('=');
      if (i === -1) attrs[a.toLowerCase()] = true; else attrs[a.slice(0, i).toLowerCase()] = a.slice(i + 1);
    }
    return {name, value, attrs};
  };
  const absorb = (res) => {
    const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const raw of list) {
      seen.push(raw);
      const c = parseSetCookie(raw);
      const expired = c.attrs.expires && new Date(c.attrs.expires).getTime() <= Date.now();
      if (expired || c.attrs['max-age'] === '0') jar.delete(c.name); else jar.set(c.name, c);
    }
  };
  const cookieHeader = () => [...jar.values()].map((c) => `${c.name}=${c.value}`).join('; ');
  const req = async (method, path, {body, headers = {}, cookies = true} = {}) => {
    const h = {'x-forwarded-proto': forwardedProto, ...headers};
    if (cookies && jar.size) h.cookie = cookieHeader();
    if (body !== undefined) h['content-type'] = 'application/json';
    const res = await fetch(base + path, {method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'});
    absorb(res);
    let json = null;
    try { json = await res.json(); } catch { json = null; }
    return {status: res.status, headers: res.headers, body: json, setCookie: res.headers.getSetCookie ? res.headers.getSetCookie() : []};
  };
  return {
    get: (p, o) => req('GET', p, o),
    post: (p, body, o = {}) => req('POST', p, {...o, body}),
    jar, seen, cookieHeader,
    cookie: (name) => jar.get(name),
    csrf: async () => (await req('GET', '/csrf-token')).body.csrfToken,
  };
};
