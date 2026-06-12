// Investor Detail Overlay — uses vw-overlay pattern, SVG icons, design tokens
async function openInvestorDetail(key) {
  var inv = (ANA.data && ANA.data.investors || []).find(function(i) { return i.key === key; });
  if (!inv) return;
  var exc = ANA.excWhere();
  var f = "timestamp > now() - interval 90 day AND properties.$current_url LIKE '%' || (window.DEPLOY_DOMAIN || 'your-dataroom.vercel.app') || '%'" + exc;
  var fundQ = inv.fund.replace(/'/g, "''"), partnerQ = inv.partner.replace(/'/g, "''");
  var who = "properties.fund_name='" + fundQ + "'" + (inv.partner ? " AND properties.partner_name='" + partnerQ + "'" : "");
  var detail = await ANA.query(
    "SELECT event, properties.section_name, properties.doc_name, properties.time_spent_seconds,"
    + " properties.scroll_depth_pct, timestamp, properties.$geoip_city_name"
    + " FROM events WHERE " + f + " AND " + who + " ORDER BY timestamp DESC LIMIT 200"
  ) || [];
  var old = document.getElementById('inv-detail-overlay');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'inv-detail-overlay'; ov.className = 'vw-overlay';
  var sc = inv.score || 0, bd = inv.scoreBreakdown || {};
  var html = '<div class="vw-backdrop"></div><div class="vw-card inv-detail-card">';
  html += '<div class="vw-header"><div class="vw-title">' + _esc(inv.partner || inv.fund) + ' · ' + _esc(inv.fund) + '</div>';
  html += '<div class="vw-actions"><button class="vw-act vw-close" onclick="closeInvestorDetail()">&#x2715;</button></div></div>';
  html += '<div class="vw-body">' + _renderScoreHeader(sc, bd) + _renderAction(inv) + _renderTimeline(detail) + _renderMulti(inv) + '</div></div>';
  ov.innerHTML = html;
  document.body.appendChild(ov);
  requestAnimationFrame(function() { ov.classList.add('open'); });
  ov.querySelector('.vw-backdrop').addEventListener('click', closeInvestorDetail);
  document.addEventListener('keydown', _invEsc);
}
function _esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function _invEsc(e) { if (e.key === 'Escape') closeInvestorDetail(); }
function closeInvestorDetail() {
  var o = document.getElementById('inv-detail-overlay');
  if (o) { o.classList.remove('open'); setTimeout(function() { o.remove(); }, 300); }
  document.removeEventListener('keydown', _invEsc);
}
function _renderScoreHeader(sc, bd) {
  var h = '<div class="id-score-header"><div class="id-score-circle" style="border-color:' + scoreColor(sc) + '">';
  h += '<span class="id-score-num">' + sc + '</span><span class="id-score-lbl">' + scoreLabel(sc) + '</span></div>';
  h += '<div class="id-score-bars">';
  var labels = { recency: 'Recency', depth: 'Depth', breadth: 'Breadth', velocity: 'Velocity', multi: 'Multi-Channel' };
  Object.keys(labels).forEach(function(k) {
    var v = bd[k] || 0;
    h += '<div class="id-bar"><span class="id-bar-label">' + labels[k] + '</span>';
    h += '<div class="id-bar-track"><div class="id-bar-fill" style="width:' + v + '%;background:' + scoreColor(v) + '"></div></div>';
    h += '<span class="id-bar-val">' + v + '</span></div>';
  });
  return h + '</div></div>';
}
function _renderAction(inv) {
  return inv.nextAction ? '<div class="id-action">' + AI.bulb + ' ' + inv.nextAction + '</div>' : '';
}
