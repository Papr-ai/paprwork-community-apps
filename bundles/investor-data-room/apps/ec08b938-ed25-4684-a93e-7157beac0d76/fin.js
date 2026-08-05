/* Financial Model viewer — swipeable 3-page */
function openFinancials(isFounder, startPage) {
  var d = window.FIN_DATA; if (!d) return;
  var saved = localStorage.getItem('fin_data_v2');
  if (saved) { try { Object.assign(d, JSON.parse(saved)); } catch(e){} }
  var pages = d.pages;
  var dots = '<div class="fn-pager">';
  pages.forEach(function(p, i) {
    dots += '<span class="fn-dot' + (i===0?' active':'') + '" data-pg="'+i+'">' + esc(p.label) + '</span>';
  });
  dots += '</div>';
  var html = '<div class="fn-wrap">' + dots + '<div class="fn-pages">';
  html += '<div class="fn-page" id="fn-pg-0">' + buildRevenuePage(pages[0]) + '</div>';
  html += '<div class="fn-page hidden" id="fn-pg-1">' + buildUnitPage(pages[1]) + '</div>';
  html += '<div class="fn-page hidden" id="fn-pg-2">' + buildFundsPage(pages[2]) + '</div>';
  html += '</div></div>';
  openViewer({
    title: d.title, bodyHtml: html, markdown: buildFinMarkdown(d),
    onEdit: isFounder ? function() { openFinEditor(d); } : null
  });
  var _att = 0;
  var _ct = setInterval(function() {
    _att++;
    var cv = document.getElementById('fn-rev-chart');
    if (cv && cv.offsetHeight > 0) {
      clearInterval(_ct); initFinPager();
      renderFinRevenueChart(pages[0].projections);
      if (typeof renderMarginChart === 'function') renderMarginChart(pages[1]);
      if (typeof renderAllocChart === 'function') renderAllocChart(pages[2].allocation);
      if (startPage && startPage > 0) {
        var dot = document.querySelector('.fn-dot[data-pg="'+startPage+'"]');
        if (dot) dot.click();
      }
    }
    if (_att > 30) clearInterval(_ct);
  }, 100);
}
