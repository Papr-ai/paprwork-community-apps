/* Page 2: Unit Economics — margin expansion visual */
function buildUnitPage(p) {
  var h = '<p class="fn-headline">' + esc(p.headline) + '</p>';
  h += '<p class="fn-sub">' + esc(p.sub) + '</p>';
  // Margin gauge — two side-by-side
  h += '<div class="fn-margin-row">';
  h += '<div class="fn-margin-card">' +
    '<span class="fn-margin-label">Today</span>' +
    '<div class="fn-gauge-wrap"><canvas id="fn-gauge-now" width="140" height="80"></canvas></div>' +
    '<span class="fn-margin-val">' + p.grossMargin.current + '%</span></div>';
  h += '<span class="fn-margin-arrow">›</span>';
  h += '<div class="fn-margin-card">' +
    '<span class="fn-margin-label">At Scale</span>' +
    '<div class="fn-gauge-wrap"><canvas id="fn-gauge-target" width="140" height="80"></canvas></div>' +
    '<span class="fn-margin-val fn-accent">' + p.grossMargin.target + '%</span></div>';
  h += '</div>';
  // COGS breakdown — horizontal stacked bars (today vs future)
  h += '<div class="fn-cogs">';
  h += '<div class="fn-cogs-header"><span>Cost Structure</span></div>';
  h += '<div class="fn-cogs-labels"><span class="fn-cogs-tag fn-cogs-now">Today</span>' +
    '<span class="fn-cogs-tag fn-cogs-fut">At Scale</span></div>';
  p.cogs.forEach(function(c) {
    h += '<div class="fn-cog-row">' +
      '<span class="fn-cog-name">' + esc(c.name) + '</span>' +
      '<div class="fn-cog-bars">' +
      '<div class="fn-cog-bar fn-cog-now" style="width:' + c.pct + '%"></div>' +
      '<div class="fn-cog-bar fn-cog-fut" style="width:' + c.future + '%"></div>' +
      '</div>' +
      '<span class="fn-cog-pcts">' + c.pct + '% → ' + c.future + '%</span></div>';
  });
  h += '</div>';
  // Three drivers
  h += '<div class="fn-drivers">';
  p.drivers.forEach(function(d, i) {
    h += '<div class="fn-driver">' +
      '<span class="fn-driver-num">' + (i+1) + '</span>' +
      '<div class="fn-driver-text">' +
      '<span class="fn-driver-title">' + esc(d.title) + '</span>' +
      '<span class="fn-driver-desc">' + esc(d.desc) + '</span>' +
      '<span class="fn-driver-impact">' + esc(d.impact) + '</span>' +
      '</div></div>';
  });
  h += '</div>';
  return h;
}

function renderMarginChart(p) {
  drawGauge('fn-gauge-now', p.grossMargin.current, '#667085');
  drawGauge('fn-gauge-target', p.grossMargin.target, '#0161E0');
}

function drawGauge(id, pct, color) {
  var c = document.getElementById(id); if (!c) return;
  var ctx = c.getContext('2d');
  var cx = c.width / 2, cy = c.height - 8, r = 58;
  // Background arc
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = 'rgba(100,120,140,0.1)'; ctx.lineWidth = 14;
  ctx.lineCap = 'round'; ctx.stroke();
  // Value arc
  var angle = Math.PI + (Math.PI * pct / 100);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, angle);
  ctx.strokeStyle = color; ctx.lineWidth = 14;
  ctx.lineCap = 'round'; ctx.stroke();
}
