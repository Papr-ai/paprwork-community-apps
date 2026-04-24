/* Moat pager — text tabs + keyboard */
function initMoatTabs() {
  var wrap = document.querySelector('.mt-wrap');
  if (!wrap) return;
  var tabs = wrap.querySelectorAll('.mt-tab');
  var pages = wrap.querySelectorAll('.mt-page');
  var cur = 0;
  function go(n) {
    if (n < 0 || n >= pages.length) return;
    pages[cur].classList.add('hidden');
    tabs[cur].classList.remove('active');
    cur = n;
    pages[cur].classList.remove('hidden');
    tabs[cur].classList.add('active');
    var vb = document.querySelector('.vw-body');
    if (vb) vb.scrollTop = 0;
  }
  tabs.forEach(function(t) {
    t.addEventListener('click', function() { go(+t.dataset.pg); });
  });
  var handler = function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  };
  document.addEventListener('keydown', handler);
  var obs = new MutationObserver(function() {
    if (!document.querySelector('.mt-wrap')) {
      document.removeEventListener('keydown', handler);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
