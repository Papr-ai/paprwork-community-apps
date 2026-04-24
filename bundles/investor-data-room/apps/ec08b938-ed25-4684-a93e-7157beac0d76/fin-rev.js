/* Revenue page builder */
function buildRevenuePage(p) {
  var h = '<div class="fn-rev-header">';
  h += '<p class="fn-headline">' + esc(p.headline) + '</p>';
  if (p.nrr) h += '<span class="fn-nrr-badge">' + p.nrr + '% NRR</span>';
  h += '</div>';
  h += '<p class="fn-sub">' + esc(p.sub) + '</p>';
  h += '<div class="fn-chart-wrap"><canvas id="fn-rev-chart" width="640" height="260"></canvas></div>';
  h += '<div class="fn-proj-row fn-proj-row--5">';
  p.projections.forEach(function(pr, i) {
    var isLast = i === p.projections.length - 1;
    h += '<div class="fn-proj-card' + (isLast ? ' fn-proj-hero' : '') + '">';
    h += '<span class="fn-proj-year">' + esc(pr.year) + '</span>';
    h += '<span class="fn-proj-arr">$' + (pr.arr >= 1000 ? (pr.arr/1000)+'M' : pr.arr+'K') + '</span>';
    h += '<span class="fn-proj-cust">' + pr.customers + ' customers</span>';
    h += '<span class="fn-proj-note">' + esc(pr.note) + '</span></div>';
    if (!isLast) h += '<span class="fn-proj-arrow">›</span>';
  });
  h += '</div>';
  return h;
}
