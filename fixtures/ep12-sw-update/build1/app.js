/* WRC EP12 page script — identical in build1 and build2 except the BUILD constant.
 * Registers /sw.js, exposes a manual registration.update() button, detects an installed
 * worker WAITING behind the controller, asks for explicit approval, and reloads exactly once.
 */
(function () {
  'use strict';
  var BUILD = 1;

  // @@logic-start  (pure, DOM-free; tested in Node via test.mjs against sw-lifecycle-sim.mjs)
  // Decide whether the page should show "Update available".
  // reg = {installing, waiting, active} as {state} objects or null; controller = worker or null.
  function updateAvailable(reg, controller) {
    // A waiting worker only matters if some worker already controls this page; on a first
    // install there is nothing to update, the new worker simply activates.
    if (!controller) return false;
    if (reg.waiting) return true;
    if (reg.installing && reg.installing.state === 'installed') return true;
    return false;
  }
  // controllerchange handler factory: reloads exactly once even if the event fires twice.
  function makeControllerChangeHandler(reload) {
    var refreshing = false;
    return function onControllerChange() {
      if (refreshing) return 'ignored';
      refreshing = true;
      reload();
      return 'reloaded';
    };
  }
  // @@logic-end

  var $ = function (id) { return document.getElementById(id); };
  var logEl = $('log');
  function log(msg) {
    var li = document.createElement('li');
    li.textContent = new Date().toISOString().slice(11, 23) + '  ' + msg;
    if (logEl) logEl.appendChild(li);
  }
  function stateOf(w) { return w ? w.state : '—'; }
  function render(reg) {
    $('st-controller').textContent = navigator.serviceWorker.controller ? 'yes (' + navigator.serviceWorker.controller.state + ')' : 'none';
    $('st-installing').textContent = stateOf(reg.installing);
    $('st-waiting').textContent = stateOf(reg.waiting);
    $('st-active').textContent = stateOf(reg.active);
    $('update-notice').hidden = !updateAvailable(reg, navigator.serviceWorker.controller);
  }

  if (!('serviceWorker' in navigator)) { log('serviceWorker unsupported in this browser'); return; }

  log('page script running: Build ' + BUILD);

  // One guard per page load. The reload is a full navigation, so the new document gets a
  // fresh script and a fresh guard; there is no loop because the new controller does not
  // change again on its own.
  var onControllerChange = makeControllerChangeHandler(function () {
    log('controllerchange → reloading once');
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

  navigator.serviceWorker.register('/sw.js').then(function (reg) {
    log('registered /sw.js (scope ' + reg.scope + ')');
    render(reg);

    function watch(worker, label) {
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        log(label + ' worker → ' + worker.state);
        render(reg);
      });
    }
    watch(reg.installing, 'installing');
    watch(reg.waiting, 'waiting');
    watch(reg.active, 'active');

    reg.addEventListener('updatefound', function () {
      log('updatefound: new worker installing (byte-different /sw.js)');
      watch(reg.installing, 'new');
      render(reg);
    });

    $('btn-update').addEventListener('click', function () {
      log('registration.update() requested');
      reg.update().then(function () { log('update check complete'); render(reg); })
        .catch(function (e) { log('update() failed: ' + e.message); });
    });

    $('btn-approve').addEventListener('click', function () {
      var w = reg.waiting;
      if (!w) { log('approve clicked but no waiting worker'); return; }
      log('approved: posting SKIP_WAITING to the waiting worker');
      w.postMessage({type: 'SKIP_WAITING'});
      // Activation → controllerchange → onControllerChange reloads once.
    });
  }).catch(function (e) { log('register failed: ' + e.message); });
})();
