// Episode 14 fixture: browser uploader with stage-specific status.
// PROVIDED, NOT EXECUTED by this fixture's tests (no browser in the build environment).
//
// Why XMLHttpRequest: fetch() gives no upload progress events; XHR's `upload.onprogress` does.
// `e.loaded` counts REQUEST BODY bytes (multipart overhead included), not stored-file bytes.
// A percentage is computed only when `e.lengthComputable` is true; otherwise the bar is indeterminate.
// 100% transferred is stage 1 only. The HTTP status (stage 2), job processing (stage 3) and result
// availability (stage 4) are each read separately.
(function () {
  const $ = (id) => document.getElementById(id);
  const set = (id, html, cls) => { const el = $(id); el.innerHTML = html; el.className = cls || ''; };

  $('send').addEventListener('click', function () {
    const f = $('file').files[0];
    if (!f) { set('transfer', 'choose a file first', 'warn'); return; }
    $('send').disabled = true;
    const form = new FormData();
    form.append('file', f, f.name); // the server does not trust f.name or f.type; it sniffs the content

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/uploads');
    const bar = $('transferBar');

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        bar.classList.remove('indeterminate');
        bar.firstElementChild.style.width = pct + '%';
        set('transfer', pct + '% of request body sent (' + e.loaded + ' / ' + e.total + ' bytes, multipart overhead included)');
      } else {
        bar.classList.add('indeterminate');
        set('transfer', e.loaded + ' bytes sent (total unknown: indeterminate)');
      }
    };
    xhr.upload.onload = function () {
      // Body fully handed to the network. NOT success: the status has not been read yet.
      set('transfer', 'request body fully sent. Waiting for the HTTP response…', 'warn');
    };
    xhr.onerror = function () { set('accepted', 'network error: no HTTP status received', 'bad'); };
    xhr.onload = function () {
      // Stage 2: completion of the request does not establish a successful status. Check it.
      let body = {}; try { body = JSON.parse(xhr.responseText); } catch (_) {}
      if (xhr.status === 202) {
        set('transfer', 'request body sent', 'ok');
        set('accepted', '202 Accepted · job ' + body.jobId + '<br><small>accepted ≠ processed</small>', 'ok');
        poll(body.jobId);
      } else {
        set('accepted', 'HTTP ' + xhr.status + ' · ' + (body.error || 'rejected') + (body.reason ? ' · ' + body.reason : '') + '<br><small>fully transferred, not accepted. No job was created.</small>', 'bad');
        $('send').disabled = false;
      }
    };
    xhr.send(form);
  });

  function poll(jobId) {
    set('processing', 'queued / processing… <small>(no percentage: the server does not report one)</small>', 'warn');
    const tick = function () {
      fetch('/jobs/' + jobId).then(function (r) { return r.json().then(function (b) { return {status: r.status, body: b}; }); }).then(function (res) {
        if (res.status !== 200) { set('processing', 'HTTP ' + res.status + ' from status endpoint', 'bad'); return; }
        const s = res.body.status;
        if (s === 'ready') {
          set('processing', 'processing finished', 'ok');
          set('available', 'ready · <a href="/jobs/' + jobId + '/result">open result</a>', 'ok');
        } else if (s === 'failed') {
          set('processing', 'failed · ' + res.body.reason, 'bad');
          set('available', 'not available (409 from result endpoint)', 'bad');
          $('send').disabled = false;
        } else {
          set('processing', 'status: ' + s + ' <small>(polling)</small>', 'warn');
          setTimeout(tick, 300);
        }
      }).catch(function () { set('processing', 'poll request failed', 'bad'); });
    };
    tick();
  }
})();
