// Episode 14 fixture: Node upload client. Streams a multipart/form-data body in chunks and records
// transfer progress from the bytes the socket has written.
//
// Measurement label (apply wherever these numbers are shown):
//   "fixture-measured transfer bytes, includes multipart overhead"
// `sent` counts REQUEST BODY bytes (multipart headers + file + boundaries), not stored-file bytes.
// 100% sent means the body left this process. It says nothing about the HTTP status, about
// acceptance, or about processing. The response is read and reported separately.
import http from 'node:http';

export const buildMultipart = (fileBytes, {filename = 'data.csv', mime = 'text/csv', boundary = 'ep14boundary0123456789'} = {}) => {
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {body: Buffer.concat([head, fileBytes, tail]), contentType: `multipart/form-data; boundary=${boundary}`, overheadBytes: head.length + tail.length};
};

/** Streams the body to POST /uploads. Returns {progress[], response:{status, body}}. */
export const upload = (base, cookie, fileBytes, {filename, mime, chunkSize = 1024, onProgress} = {}) => new Promise((resolve, reject) => {
  const {body, contentType, overheadBytes} = buildMultipart(fileBytes, {filename, mime});
  const u = new URL(base);
  const progress = [];
  const t0 = Date.now();
  const req = http.request({host: u.hostname, port: u.port, method: 'POST', path: '/uploads', headers: {cookie, 'content-type': contentType, 'content-length': body.length}}, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      let parsed = null; try { parsed = JSON.parse(data); } catch { parsed = {raw: data}; }
      resolve({progress, response: {status: res.statusCode, body: parsed}, bodyBytes: body.length, fileBytes: fileBytes.length, overheadBytes,
        label: 'fixture-measured transfer bytes, includes multipart overhead'});
    });
  });
  req.on('error', reject);
  let sent = 0;
  const writeNext = () => {
    if (sent >= body.length) return req.end();
    const chunk = body.subarray(sent, sent + chunkSize);
    req.write(chunk, () => { // callback fires once the chunk has been handed to the OS socket buffer
      sent += chunk.length;
      const ev = {sentBytes: sent, totalBytes: body.length, pct: Math.round((sent / body.length) * 100), atMs: Date.now() - t0};
      progress.push(ev);
      if (onProgress) onProgress(ev);
      writeNext();
    });
  };
  writeNext();
});

export const getJson = async (base, cookie, p) => { const r = await fetch(base + p, {headers: {cookie}}); return {status: r.status, body: await r.json()}; };

/** Polls /jobs/:id until a terminal status or timeout. Records each observation with a timestamp. */
export const pollJob = async (base, cookie, jobId, {intervalMs = 20, timeoutMs = 5000} = {}) => {
  const seen = [];
  const t0 = Date.now();
  for (;;) {
    const r = await getJson(base, cookie, `/jobs/${jobId}`);
    seen.push({atMs: Date.now() - t0, status: r.status, jobStatus: r.body.status ?? null});
    if (r.status !== 200 || r.body.status === 'ready' || r.body.status === 'failed') return {final: r, seen};
    if (Date.now() - t0 > timeoutMs) return {final: r, seen, timedOut: true};
    await new Promise((res) => setTimeout(res, intervalMs));
  }
};
