/* Financial pager — tab dots + keyboard */
function initFinPager() {
  var wrap = document.querySelector('.fn-wrap');
  if (!wrap) return;
  var dots = wrap.querySelectorAll('.fn-dot');
  var pages = wrap.querySelectorAll('.fn-page');
  var cur = 0;
  function go(n) {
    if (n < 0 || n >= pages.length) return;
    pages[cur].classList.add('hidden');
    dots[cur].classList.remove('active');
    cur = n;
    pages[cur].classList.remove('hidden');
    dots[cur].classList.add('active');
    var vb = document.querySelector('.vw-body');
    if (vb) vb.scrollTop = 0;
    // Render charts for the page we just switched to
    var d = window.FIN_DATA;
    if (cur === 0 && typeof renderFinRevenueChart === 'function') renderFinRevenueChart(d.pages[0].projections);
    if (cur === 1 && typeof renderMarginChart === 'function') renderMarginChart(d.pages[1]);
    if (cur === 2 && typeof renderAllocChart === 'function') renderAllocChart(d.pages[2].allocation);
  }
  dots.forEach(function(d) {
    d.addEventListener('click', function() { go(+d.dataset.pg); });
  });
  var handler = function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  };
  document.addEventListener('keydown', handler);
  var obs = new MutationObserver(function() {
    if (!document.querySelector('.fn-wrap')) {
      document.removeEventListener('keydown', handler);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
