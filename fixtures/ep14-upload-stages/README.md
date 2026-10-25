# EP14 fixture — upload stages (transfer → acceptance → processing → availability)

A loopback-only Node 22 CSV uploader that keeps four stages separate and observable:

1. **Transfer** — the client streams a multipart/form-data request body. `client.mjs` records progress from bytes written to the socket. These numbers are **fixture-measured transfer bytes, includes multipart overhead**: they count the request body (multipart headers + file + boundaries), not the stored file.
2. **Acceptance** — `POST /uploads` checks the request-body size (`MAX_UPLOAD_BYTES` = 65536) and **sniffs the content** for CSV shape (UTF-8 text, no NUL bytes, header with `id,email,amount`). The client-supplied filename and MIME type are recorded but never used for the decision. Accepted files are written under a **generated name** to a per-process temp directory that is **never served**. A job record is created and the server answers `202 Accepted` with `jobId`, `statusUrl`, `storedBytes` and `requestBodyBytes`.
3. **Processing** — `worker.mjs` (in-process) parses the stored CSV and validates rows (field count, email shape, numeric amount). It marks the job `ready` with a result, or `failed` with a reason.
4. **Availability** — `GET /jobs/:id/result` answers `200` only when status is `ready`; otherwise `409 {status, reason}`.

Files: `server.mjs`, `worker.mjs`, `client.mjs`, `public/index.html` + `public/app.js` (browser uploader, **provided, not executed**), `test.mjs`, `demo.mjs`, `evidence.json`.

## Run
```
node --test fixtures/ep14-upload-stages/test.mjs
node fixtures/ep14-upload-stages/demo.mjs        # rewrites evidence.json
node fixtures/ep14-upload-stages/server.mjs      # standalone, prints the ephemeral port; open / after GET /login/alice
```
Zero npm dependencies.

## Deliberate policies
- `GET /jobs/:id` and `/jobs/:id/result` are **authorised** against the server-side session. Another user's job and an absent job both return **404** so the response does not confirm that a job id exists. Unauthenticated → 401.
- Acceptance (202) is about **size and shape**, not row validity. A file can be fully transferred, accepted, and still fail in processing.
- The result endpoint returns **409** for `accepted`, `processing` and `failed` jobs (404 is reserved for "not yours / not there").
- No processing percentage is reported anywhere: the worker does not measure one, so none is invented.
- The HTTP body-size limit applies to the **request body**, multipart overhead included; the 413 response says so.
- Controlled pacing: `worker.setPace(ms)` delays the start of processing so the intermediate state is observable. Both the tests and the demo use 400 ms. This delay is artificial and labelled in `evidence.json`; it is not a measurement.

## Executed
```
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
Tests: success path (202 → non-ready state observed → ready; result 409 before ready, 200 after, rows 3, totalAmount 114.75); generated filename outside `public/` even for `../../evil.html`; oversized body → 413 and no job; PNG bytes labelled `totally.csv`/`text/csv` → 415 and no job; **known-positive control** (a label-trusting policy would have accepted that PNG; the sniffer does not); fully transferred CSV with invalid rows → 202 then `failed` with a line-level reason, result 409; status access (Bob → 404, absent → 404, unauthenticated → 401); stored files unreachable through served paths.

`node demo.mjs` → `evidence.json` (last run): valid CSV 82 file bytes / 232 request-body bytes (150 overhead), 100 % transferred, 202, job `job_89b35fbbbe7a`, polls observed `accepted` ×5 then `ready` about 0.43 s after acceptance (poll count varies with scheduling between runs) (the 400 ms controlled pacing plus poll interval; fixture-measured, not a real processing time), result 200 with 3 rows, Bob → 404. PNG-as-CSV: 100 % transferred, 415 "binary content (NUL byte) is not CSV". Oversized 66723-byte body: 413, limit 65536. Invalid rows: 100 % transferred, 202 with job `job_a664e78fb5bf`, then `failed` — "line 3: invalid email \"not-an-email\"; line 4: amount is not a number \"lots\"", result 409, Bob → 404.

## Limitations / what is NOT tested
- **No restart persistence.** Job records are in memory; stored files live in a per-process temp dir removed on `close()`. Nothing survives a process restart, and none is claimed.
- The browser uploader (`public/`) uses `XMLHttpRequest.upload.onprogress`, computes a percentage only when `lengthComputable` is true, and otherwise shows an indeterminate bar. It was **not executed**: there is no browser in the build environment. Only the Node client's transfer measurement is exercised.
- Timestamps in `evidence.json` are `Date.now()` in one process on loopback and say nothing about real networks. For an 82-byte file the parse finishes within the same millisecond it starts, so polls see `accepted` and then the terminal state; the `processing` status exists but is too brief to catch here.
- Parsing and row validation are **not malware scanning**. A CSV that passes every check here could still be hostile to some downstream consumer (formula injection in spreadsheets, for example). No security verdict is implied.
- The content sniff is a shape check (text, header columns), not a full CSV grammar; quoted fields with embedded commas are not supported by this fixture's parser.
- The session mechanism (`GET /login/:user`) is a test harness, not production authentication.
- Multipart parsing buffers the whole (size-limited) body; a production server would stream to disk.
