// Splits a URL into the three things the episode cares about, using the WHATWG URL API only:
//   resolutionName  — what DNS resolves and what SNI carries (the host)
//   requestTarget   — what the HTTP request line carries (path + query)
//   fragment        — what stays in the browser and is never serialised into the request
//
// This is a pure string-level function. It performs no network activity of any kind.

/**
 * @param {string} input absolute URL
 * @returns {{href: string, scheme: string, resolutionName: string, port: number, requestTarget: string, fragment: string, fragmentInRequestTarget: boolean}}
 */
export function splitUrl(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`expected http(s) URL, got ${u.protocol}`);
  const defaultPort = u.protocol === 'https:' ? 443 : 80;
  const port = u.port === '' ? defaultPort : Number(u.port);
  // RFC 9110 §7.1 origin-form request-target = absolute-path [ "?" query ]. The fragment is not part of it.
  const requestTarget = u.pathname + u.search;
  return {
    href: u.href,
    scheme: u.protocol.slice(0, -1),
    resolutionName: u.hostname,
    port,
    requestTarget,
    fragment: u.hash,
    fragmentInRequestTarget: u.hash.length > 1 && requestTarget.includes(u.hash),
  };
}

/** The illustrative request line the browser would form (origin-form, HTTP/1.1 syntax for readability). */
export function requestLine(input, method = 'GET') {
  const {requestTarget} = splitUrl(input);
  return `${method} ${requestTarget} HTTP/1.1`;
}

export const EXAMPLE_URL = 'https://example.test/account?tab=billing#history';
