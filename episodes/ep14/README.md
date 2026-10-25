# EP 14 — 100% Uploaded. Why Isn't My File Ready?

**Central idea.** Request-body transfer, server acceptance, processing and availability are four separate stages; a single "100%" bar only ever reported the first.

## What this fixture is
- `fixtures/ep14-upload-stages/` — a loopback-only Node 22 CSV uploader with zero dependencies: `server.mjs` (multipart `POST /uploads`, authorised `GET /jobs/:id` and `/jobs/:id/result`), `worker.mjs` (in-process parse + row validation → `ready` or `failed` with reason), `client.mjs` (streams the multipart body and records progress from bytes written), and `public/index.html` + `app.js` (a browser uploader using `XMLHttpRequest.upload.onprogress` with a `lengthComputable` check and four stage-specific statuses; **provided, not executed**).
- The server validates the **request-body size** (65536 bytes, multipart overhead included) and **sniffs the content** for CSV shape. The client's filename and MIME type are recorded but never trusted for the decision.
- Stored files get a **generated name** in a per-process temp directory outside anything served. A job record is created and the server answers **202 + jobId**.
- Deliberate policies: another user's job and an absent job both return **404**; the result endpoint returns **409** unless status is `ready`; acceptance is about size and shape, not row validity; no processing percentage is reported because none is measured.
- **The fixture does not survive process restarts.** Job records are in memory and stored files are removed on close. No persistence is claimed.
- Controlled pacing: the worker's start is delayed by a labelled 400 ms (tests and demo) so the not-ready state is observable through polling. This is artificial and is never presented as a measured processing time.

## Evidence
- Executed: `node --test fixtures/ep14-upload-stages/test.mjs` → `# tests 8  # pass 8  # fail 0` (success path; generated filename outside `public/`; oversized → 413 with no job; PNG labelled `.csv`/`text/csv` → 415 with no job; **known-positive control** that a label-trusting policy would have accepted the PNG; fully transferred CSV with invalid rows → 202 then `failed` with reason, result 409; status access as Bob → 404, absent → 404, unauthenticated → 401; stored files unreachable via served paths).
- Executed: `node fixtures/ep14-upload-stages/demo.mjs` → `evidence.json`: valid CSV **82 file bytes travelled as a 232-byte request body** (150 B multipart overhead), 100 % sent, **202** `job_89b35fbbbe7a`, result before ready **409**, polls `accepted` ×5 then `ready` (the count of pre-ready polls varies with scheduling between runs), result **200** (rows 3, totalAmount 114.75), same job as Bob **404**. PNG-as-CSV: 100 % sent, **415** "binary content (NUL byte) is not CSV". Oversized 66723-byte body: **413**. Invalid rows: 100 % sent, **202** `job_a664e78fb5bf`, then **failed** — `line 3: invalid email "not-an-email"; line 4: amount is not a number "lots"`, result **409**, as Bob **404**.
- Observed: all timestamps in `evidence.json` are `Date.now()` in one loopback process and are labelled "fixture-measured"; they are not representative of real networks or servers.
- Blocked: the browser uploader (`public/`) was not run; no browser is available in the build environment. Browser `upload.onprogress` behaviour is therefore described, not demonstrated. The transfer numbers shown come from the Node client (bytes written to the socket) and are labelled "fixture-measured transfer bytes, includes multipart overhead".
- Predicted: `video/src/episodes/ep14/timeline.json` was generated with `--no-audio` (word-count estimate) so the project type-checks; the orchestrator regenerates it from real narration. No MP4 is claimed here; the orchestrator fills `render-evidence.json`.

## Build and render
```
cd video && npm install
node tools/build-timeline.mjs ep14      # needs video/public/ep14/narration.mp3 (or add --no-audio)
node tools/gen-root.mjs
node tools/render.mjs ep14 --concurrency 2
```
Type-check: `cd video && npx tsc --noEmit` passes for `src/episodes/ep14/*`.

## Limitations
- Upload progress is a **request-body** measurement (multipart overhead included). It is never labelled as a stored-file byte count. A percentage is shown only when the total is known (`lengthComputable`); otherwise the browser page shows an indeterminate bar.
- Upload completion does not establish a successful HTTP status; the status is read separately. An accepted (202) response does not mean processing succeeded; the status endpoint is polled separately.
- No processing percentage is invented. The worker reports a state, not a progress figure.
- **Parsing is not malware scanning.** `ready` means the CSV parsed and its rows validated; it is not a security verdict.
- The content sniff is a shape check (UTF-8 text, no NUL bytes, header with required columns), not a full CSV grammar; quoted fields with embedded commas are unsupported in this fixture.
- Session handling (`GET /login/:user`) is a test harness, not production authentication. Multipart parsing buffers the whole size-limited body rather than streaming to disk.
- Scenes recreate a browser uploader with plain illustrative chrome and carry the `SIMULATED LOCAL FIXTURE` tag; no real product UI is mimicked.
