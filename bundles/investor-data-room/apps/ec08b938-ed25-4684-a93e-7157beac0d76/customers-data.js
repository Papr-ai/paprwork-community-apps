// DB loaders — try live DB first (founder view), fall back to ROOM_DATA (Vercel)
var _isVercel = location.hostname.indexOf('vercel') >= 0 || location.hostname.indexOf('dataroom') >= 0;
async function loadRevenueHistory() {
  if (!_isVercel) try { var r = await dbQuery("SELECT * FROM revenue_history ORDER BY month"); if (r.length) return r; } catch(e) {}
  return (window.ROOM_DATA && window.ROOM_DATA.revenue_history) || [];
}
async function loadCustomers() {
  if (!_isVercel) try { var r = await dbQuery("SELECT * FROM customers WHERE mrr > 0 ORDER BY mrr DESC"); if (r.length) return r; } catch(e) {}
  return (window.ROOM_DATA && window.ROOM_DATA.customers) || [];
}
async function loadPipeline() {
  if (!_isVercel) try { var r = await dbQuery("SELECT * FROM pipeline ORDER BY value DESC"); if (r.length) return r; } catch(e) {}
  return (window.ROOM_DATA && window.ROOM_DATA.pipeline) || [];
}
async function loadCaseStudies() {
  if (!_isVercel) try { var r = await dbQuery("SELECT * FROM case_studies ORDER BY sort_order"); if (r.length) return r; } catch(e) {}
  return (window.ROOM_DATA && window.ROOM_DATA.case_studies) || [];
}

function renderRevenueSnapshot(history, customers) {
  var latest = history.length ? history[history.length - 1] : {};
  var mrr = latest.mrr || 0;
  var arr = mrr * 12;
  var prev = history.length > 1 ? history[history.length - 2] : {};
  var growth = prev.mrr > 0 ? Math.round(((mrr - prev.mrr) / prev.mrr) * 100) : 0;
  var paying = customers.length;
  return '<div class="cd-snapshot">' +
    '<div class="cd-metric-big"><span class="cd-label">MRR</span><span class="cd-value">' + fmt(mrr) + '</span>' +
    (growth > 0 ? '<span class="cd-growth">↑ ' + growth + '% MoM</span>' : '') + '</div>' +
    '<div class="cd-metric"><span class="cd-label">ARR</span><span class="cd-value">' + fmt(arr) + '</span></div>' +
    '<div class="cd-metric"><span class="cd-label">Paying</span><span class="cd-value">' + paying + '</span></div>' +
    '<div class="cd-metric"><span class="cd-label">Retention</span><span class="cd-value cd-green">100%</span></div>' +
    '</div>';
}

function renderRevenueChart(history) {
  var recent = history.filter(function(h){return h.month>='2025-09';});
  if (!recent.length) return '';
  var max = Math.max.apply(null, recent.map(function(h){return h.mrr;}));
  return '<div class="cd-chart"><span class="cd-chart-title">Monthly Revenue</span>' +
    '<div class="cd-bars">' + recent.map(function(h) {
      var pct = max > 0 ? Math.max(4, (h.mrr / max) * 100) : 4;
      var label = h.month.split('-')[1] + '/' + h.month.split('-')[0].slice(2);
      return '<div class="cd-bar-col"><div class="cd-bar" style="height:' + pct + '%"></div>' +
        '<span class="cd-bar-val">' + fmt(h.mrr) + '</span>' +
        '<span class="cd-bar-label">' + label + '</span></div>';
    }).join('') + '</div></div>';
}
