// Tiny cookie-jar HTTP client for tests and demo (models a browser's cookie store well enough for a
// loopback fixture; it is not a browser). Plain HTTP, 127.0.0.1 only.
export const makeClient = (base) => {
  const jar = new Map();
  const absorb = (res) => {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [nv] = raw.split(';');
      const i = nv.indexOf('=');
      jar.set(nv.slice(0, i).trim(), nv.slice(i + 1));
    }
  };
  const req = async (method, path, {body, headers = {}, cookies = true, raw = false} = {}) => {
    const h = {...headers};
    if (cookies && jar.size) h.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (body !== undefined) h['content-type'] = 'application/json';
    const res = await fetch(base + path, {method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'});
    absorb(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return {status: res.status, body: json, text};
  };
  return {
    get: (p, o) => req('GET', p, o),
    post: (p, body, o = {}) => req('POST', p, {...o, body}),
    jar,
    login: async (user) => (await req('GET', `/_fixture/login/${user}`)).body,
    csrf: async () => (await req('GET', '/csrf-token')).body.csrfToken,
  };
};
