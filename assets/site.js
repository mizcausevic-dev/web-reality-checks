(() => {
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  // arc filter: without JavaScript every card stays visible
  const chips = $('.chip[data-arc]');
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const arc = c.dataset.arc;
    $('.ep[data-arc]').forEach((e) => { e.hidden = arc !== 'all' && e.dataset.arc !== arc; });
    const n = $('.ep[data-arc]').filter((e) => !e.hidden).length;
    const live = document.getElementById('count'); if (live) live.textContent = n + ' of ' + $('.ep[data-arc]').length + ' episodes shown';
  }));
  // chapter buttons seek the player
  const v = document.querySelector('video.player');
  $('.chap button').forEach((b) => b.addEventListener('click', () => { if (!v) return; v.currentTime = parseFloat(b.dataset.t); v.play().catch(() => {}); }));
  // copy buttons on code blocks
  $('pre').forEach((p) => {
    if (!navigator.clipboard) return;
    const w = document.createElement('div'); w.className = 'codewrap'; p.parentNode.insertBefore(w, p); w.appendChild(p);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy code to clipboard');
    b.addEventListener('click', () => navigator.clipboard.writeText(p.innerText).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); }));
    w.appendChild(b);
  });
})();
