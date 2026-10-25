# EP14 distribution kit: 100% Uploaded. Why Isn't My File Ready?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep14-upload-stages/` (evidence.json, test.mjs, README.md). Transfer bytes are fixture-measured and include multipart overhead. The 400 ms pacing is artificial and labeled. The browser uploader was provided, not executed.

## YouTube

### Title options (≤ 60 chars), ranked

1. `100% Uploaded. Why Isn't My File Ready?` (39) : the series title; names the exact moment every user has lived through.
2. `Your Upload Bar Is Lying to You (Accurately)` (44) : the paradox is the hook; the bar is correct about bytes and wrong about meaning.
3. `An Upload Is Four Stages. The Bar Shows One.` (44) : states the mechanism in the title for search intent around upload progress.
4. `82 Bytes Sent as 232. Then 202. Then 409.` (41) : concrete numbers from the fixture; the status codes pull in engineers.
5. `202 Accepted Does Not Mean Processed` (36) : the single most misread status code; good for API-focused viewers.
6. `Bytes Transferred Is Not Work Completed` (39) : the closing line as a thesis; good for shares.

### Description

The bar says 100%. The file is not ready. Nothing is wrong with the bar: it was measuring something else, and nobody told you.

In this episode we build a small CSV uploader on a laptop with synthetic users and synthetic files, and pull an upload apart into its four stages: transfer (the request body leaves the browser), acceptance (the server answers with a status), processing (a worker parses and validates), and availability (the result can be fetched). A progress bar only ever reports the first.

Browser upload progress comes from XMLHttpRequest upload events, loaded over total, and only when the total is computable. Those bytes are the request body with multipart overhead included: an 82-byte file traveled as a 232-byte request body. After the last byte the response arrives separately, 202 Accepted plus a job ID. Accepted means stored and queued, not processed; asking for the result right then returns 409. Polling the authorized status endpoint, the job moves to ready, and only then does the result open: 3 rows, total 114.75. Another user asking for the same job gets 404.

Then the same flow with a different file. It transfers fully, is accepted, 202, and then the worker finds a bad email on line 3 and a non-numeric amount on line 4. The job fails with a reason. The bar had still said 100%.

The fix: replace the single bar with four statuses. Transfer from upload events, labeled as request-body bytes. Accepted from the HTTP status. Processing as a plain state with no invented percentage. Available only when ready. And parsing is not malware scanning.

The regression suite runs 8 tests, 8 pass, including a known-positive control showing that a label-trusting policy would have accepted PNG bytes named .csv while the content sniffer refuses them.

Limits: the browser uploader is provided but was not executed (no browser in the build environment); timings are fixture-measured on loopback with a labeled artificial 400 ms pacing delay; nothing survives a restart.

Chapters
00:00 The bar says 100%. The file is not ready.
00:09 Four stages: transfer, acceptance, processing, availability
00:23 XHR upload events and multipart overhead: 82 bytes travel as 232
00:40 202 Accepted means stored and queued; result now is 409
00:52 Polling to ready; another user gets 404
01:08 Same flow, bad rows: 100% transferred, 202, then failed
01:25 The repair: four statuses, no invented percentage
01:39 Bytes transferred is not the same as work completed

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep14/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

file upload, upload progress bar, xmlhttprequest, upload progress events, lengthComputable, multipart form data, 202 accepted, http status codes, async processing, job status polling, content sniffing, mime type validation, node.js, web development, javascript, ux design, progress indicators, csv upload, known-positive control, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic users and files. Transfer bytes are fixture-measured on loopback, the 400 ms delay is artificial and labeled, and the browser uploader was not executed. Source and 8 tests: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

An 82-byte file traveled as a 232-byte request body. The bar hit 100%. Then 202. Then 409.

Episode 14 of Web Reality Checks pulls an upload into four stages, because a progress bar only shows one.

Transfer: XHR upload.onprogress, loaded / total, only when lengthComputable. Request-body bytes, multipart overhead included. 100% means the body left the browser. Nothing more.

Acceptance: the response arrives after the last byte. 202 plus a job ID means stored and queued. Result right now: 409. A PNG renamed .csv also hit 100%, then got 415 from the content sniffer; no job.

Processing: the worker reports a state, not a percentage, because it does not measure one. A CSV with a bad email on line 3 and "lots" on line 4 went 100%, 202, then failed with a reason.

Availability: result 200 only on ready. Another user asking for the job gets 404, same as an absent job.

The repair is in the UI: four statuses, each sourced from the component that measures it, no invented processing bar.

8 tests, 8 pass, including a known-positive control showing a label-trusting policy would have accepted the PNG. Synthetic fixture, loopback only, labeled 400 ms artificial pacing, browser uploader not executed.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebDevelopment #JavaScript #UX

### Post 2: non-technical leaders

Your customer saw 100%, closed the tab, and the import had failed. Nobody lied. The bar answered a different question.

Episode 14 of Web Reality Checks. An upload has four stages: the file leaves the browser, the server accepts or refuses it, a worker processes it, the result becomes available. A progress bar reports only the first.

On a small fixture with made-up files, a clean file went 100%, accepted, ready. A file with two bad rows went 100%, accepted, then failed, naming the lines. A fake spreadsheet went 100% and was refused. Same full bar every time.

A courier app that says "Collected" when the driver takes the parcel is true, and useless if intake, inspection and pickup are never shown.

Five questions for your team:
1. What exactly does our progress bar measure?
2. When the server rejects a file, what does the user see, and when?
3. Does our interface say "accepted" is not "done"?
4. If we show a processing percentage, what measures it?
5. Can one customer see another's job by guessing a number?

The fix shows four short statuses and admits "no percentage: the server does not report one." It says less, and all of it is true.

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #CustomerExperience

## X/Twitter thread

1/ The upload bar says 100%. The file is not ready. The bar is not broken. It was measuring something else, and the interface never said so. Episode 14 of Web Reality Checks: an upload is four stages and the bar shows one. Thread.

2/ Stage 1, transfer: XHR upload.onprogress gives loaded / total, only when lengthComputable is true. Those are request-body bytes, multipart overhead included. In the fixture an 82-byte file traveled as a 232-byte body. 100% means the body left. Nothing else.

3/ Stage 2, acceptance: the response arrives after the last byte, separately. 202 Accepted plus a job ID means stored and queued. Not processed. Ask for the result right then: 409. A PNG renamed .csv also hit 100%, then got 415. No job created.

4/ Stage 3, processing: the worker parses and validates rows and reports a state, not a percentage, because it does not measure one. A CSV with a bad email on line 3 and "lots" on line 4 went 100%, 202, then failed with that exact reason.

5/ Stage 4, availability: the result endpoint returns 200 only when status is ready. Then: 3 rows, total 114.75. Another user asking for the same job gets 404, identical to an absent job, so the response never confirms a job ID exists.

6/ The repair is in the UI. Four statuses: transfer (labeled as request-body bytes, indeterminate if total unknown), accepted (from the HTTP status), processing (plain state, no invented bar), available (only on ready). Parsing is not malware scanning.

7/ 8 tests, 8 pass (local synthetic fixture), including a known-positive control: a filename-or-MIME policy would have accepted the PNG; the content sniffer refuses it. Timings are loopback with a labeled artificial 400 ms delay. Browser uploader provided, not executed.

8/ Bytes transferred is not the same as work completed. Fixture, tests, video and three write-ups (technical, business, general reader): github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A minimal Node fixture that separates file upload into transfer, acceptance, processing and availability, with tests for each stage and a content-sniffing known-positive control

**First comment:** This is a deliberately constructed loopback-only fixture with synthetic users and files, so it is not a finding about any real product; the browser uploader (XHR upload.onprogress with a lengthComputable check) is provided but was not executed because the build environment has no browser, and only the Node client's socket-byte measurement is exercised. All timings in evidence.json are Date.now() on loopback with a labeled artificial 400 ms worker delay so the not-ready state is observable through polling, and they are not presented as processing times. The suite is 8 tests covering the success path, 413 and 415 rejections with no job created, a known-positive control showing a filename-or-MIME policy would have accepted PNG bytes, a fully transferred CSV that fails row validation after 202, authorized status access (other user and absent job both 404), and stored files being unreachable through served paths; the README lists what is not covered, including restart persistence, CSV grammar and anything resembling malware scanning.

## Short-form hook lines (≤ 12 words)

1. The bar said 100%. The file was not ready.
2. An upload is four stages. Your progress bar shows one.
3. 82 bytes sent as 232. Then 202. Then 409.
4. Accepted is not processed. Processed is not available.
5. Bytes transferred is not the same as work completed.

## Alt text

**hero.png:** A browser upload panel with a progress bar filled to 100% while the status line beneath it reads that the file is not ready; a caption explains the bar measured request-body bytes, multipart overhead included, and not completed work. Tagged as a simulated local fixture.

**thumbnail.png:** Episode thumbnail for "100% Uploaded. Why Isn't My File Ready?" showing a full green progress bar above three unlit checkpoints labeled accepted, processing and available, with the series mark in the corner.
