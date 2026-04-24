/* Page 3: Use of Funds — pillars + donut chart */
function buildFundsPage(p) {
  var h = '<p class="fn-headline">' + esc(p.headline) + '</p>';
  h += '<p class="fn-sub">' + esc(p.sub) + '</p>';
  // Donut chart + pillars side by side
  h += '<div class="fu-alloc-row">';
  h += '<div class="fu-donut-wrap"><canvas id="fn-alloc-donut" width="220" height="220"></canvas>';
  h += '<div class="fu-donut-center"><span class="fu-donut-amt">' + esc(p.raise.amount) + '</span>';
  h += '<span class="fu-donut-type">' + esc(p.raise.type) + '</span></div></div>';
  // Pillars with percentages
  h += '<div class="fu-pillars-v">';
  (p.allocation || []).forEach(function(a) {
    h += '<div class="fu-pillar-h">' +
      '<div class="fu-pillar-pct" style="color:' + a.color + '">' + a.pct + '%</div>' +
      '<div class="fu-pillar-info"><div class="fu-pillar-title">' + esc(a.name) + '</div>' +
      '<div class="fu-pillar-desc">' + esc(a.desc) + '</div></div>' +
      '<div class="fu-pillar-bar"><div class="fu-pillar-fill" style="width:' + a.pct + '%;background:' + a.color + '"></div></div></div>';
  });
  h += '</div></div>';
  // Built to Compound timeline
  h += '<div class="fu-compound">';
  h += '<div class="fu-compound-label">BUILT TO COMPOUND</div>';
  h += '<div class="fu-timeline">';
  p.timeline.forEach(function(t, i) {
    h += '<div class="fu-stage fu-stage--' + t.status + '">' +
      '<div class="fu-stage-tag">' + esc(t.stage) + '</div>' +
      '<div class="fu-stage-metric">' + esc(t.metric) + '</div>' +
      '<div class="fu-stage-detail">' + esc(t.detail) + '</div></div>';
    if (i < p.timeline.length - 1) h += '<div class="fu-stage-arrow">›</div>';
  });
  h += '</div></div>';
  // Proof points
  h += '<div class="fu-proofs">';
  p.proofs.forEach(function(pr) {
    h += '<div class="fu-proof">' +
      '<div class="fu-proof-val">' + esc(pr.value) + '</div>' +
      '<div class="fu-proof-label">' + esc(pr.label) + '</div>' +
      '<div class="fu-proof-desc">' + esc(pr.desc) + '</div></div>';
  });
  h += '</div>';
  return h;
}

function renderAllocChart(alloc) {
  var c = document.getElementById('fn-alloc-donut');
  if (!c || !alloc) return;
  var ctx = c.getContext('2d');
  var cx = 110, cy = 110, r = 90, lw = 28;
  var total = 0;
  alloc.forEach(function(a) { total += a.pct; });
  var ang = -Math.PI / 2;
  var progress = 0, dur = 35;
  function draw(pct) {
    ctx.clearRect(0, 0, 220, 220);
    // Track
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,120,140,0.06)'; ctx.lineWidth = lw; ctx.stroke();
    var a = -Math.PI / 2;
    alloc.forEach(function(item) {
      var slice = (item.pct / total) * Math.PI * 2 * pct;
      ctx.beginPath(); ctx.arc(cx, cy, r, a, a + slice);
      ctx.strokeStyle = item.color; ctx.lineWidth = lw;
      ctx.lineCap = 'butt'; ctx.stroke();
      a += slice;
    });
  }
  function step() {
    progress++;
    var ease = 1 - Math.pow(1 - progress / dur, 3);
    draw(Math.min(ease, 1));
    if (progress < dur) requestAnimationFrame(step);
  }
  step();
}
