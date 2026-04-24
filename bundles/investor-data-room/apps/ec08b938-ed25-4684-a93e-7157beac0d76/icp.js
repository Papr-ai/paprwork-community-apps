// ICP viewer — schema-conditioned intelligence layer
function getIcpData() {
  var base = window.ICP_DATA || {};
  var stored = localStorage.getItem('dr-icp-data');
  if (stored) try { return Object.assign({}, base, JSON.parse(stored)); } catch(e) {}
  return base;
}
(function() {
  var s = localStorage.getItem('dr-icp-data');
  if (s && typeof dbWrite === 'function') {
    dbWrite("INSERT OR REPLACE INTO config (key, value) VALUES ('icp_view_data', ?)", [s]).catch(function(){});
  }
})();
function saveIcpData(data) {
  localStorage.setItem('dr-icp-data', JSON.stringify(data));
  window.ICP_DATA = data;
  syncIcpToDB(data);
}
function syncIcpToDB(data) {
  var meta = Object.assign({}, data, {profilePhoto:'', backgroundPhoto:''});
  dbWrite("INSERT OR REPLACE INTO config (key, value) VALUES ('icp_view_data', ?)",
    [JSON.stringify(meta)]).catch(function(){});
}

function openICP(isFounder) {
  var d = getIcpData();
  if (viewerOverlay) closeViewer();
  openViewer({
    title: 'Ideal Customer Profile',
    bodyHtml: renderICPBody(d),
    onEdit: isFounder ? function() { openICPEditorView(d); } : null,
    afterBind: function(el) { bindVerticalTabs(el); }
  });
}

function renderICPBody(d) {
  var filters = (d.filters || []).map(function(f) {
    return '<div class="icp-filter"><span class="icp-filter-dot"></span>' +
      '<span class="icp-filter-lbl">' + esc(f.label) + '</span>' +
      '<span class="icp-filter-val">' + esc(f.value) + '</span></div>';
  }).join('');
  var buyers = (d.buyers || []).map(function(b, i) {
    var arrow = i < (d.buyers || []).length - 1
      ? '<div class="icp-arrow"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M4 9l4 4 4-4" stroke="' + b.color + '" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>' : '';
    return '<div class="icp-buyer" style="border-left:3px solid ' + b.color + '">' +
      '<div class="icp-buyer-head">' +
      '<span class="icp-buyer-role">' + esc(b.role) + '</span>' +
      '<span class="icp-buyer-badge" style="background:' + b.color + '14;color:' + b.color + '">' + esc(b.type) + '</span>' +
      '<span class="icp-buyer-deal">' + esc(b.deal) + '</span></div>' +
      '<p class="icp-buyer-desc">' + esc(b.desc) + '</p></div>' + arrow;
  }).join('');
  var verts = (d.verticals || []);
  var tabs = verts.map(function(v, i) {
    return '<button class="icp-vtab' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' + esc(v.name) + '</button>';
  }).join('');
  var panels = verts.map(function(v, i) {
    return '<div class="icp-vpanel' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
      '<div class="icp-vrow"><span class="icp-vl">Entry Pain</span><span class="icp-vv">' + esc(v.pain) + '</span></div>' +
      '<div class="icp-vrow"><span class="icp-vl">Why Flat Fails</span><span class="icp-vv">' + esc(v.why) + '</span></div>' +
      '<div class="icp-vrow"><span class="icp-vl">Targets</span><span class="icp-vv">' + esc(v.targets) + '</span></div>' +
      '<div class="icp-vrow"><span class="icp-vl">Champion</span><span class="icp-vv">' + esc(v.champion) + '</span></div>' +
      '<div class="icp-vrow"><span class="icp-vl">Trigger</span><span class="icp-vv">' + esc(v.trigger) + '</span></div></div>';
  }).join('');
  var signal = d.graphSignal
    ? '<div class="icp-signal"><svg width="14" height="14" viewBox="0 0 16 16"><circle cx="4" cy="8" r="2" fill="#0161E0"/><circle cx="12" cy="4" r="2" fill="#4f46e5"/><circle cx="12" cy="12" r="2" fill="#7c3aed"/><line x1="5.5" y1="7.2" x2="10.5" y2="4.8" stroke="#0161E0" stroke-width="1"/><line x1="5.5" y1="8.8" x2="10.5" y2="11.2" stroke="#4f46e5" stroke-width="1"/></svg>' +
      '<span>' + esc(d.graphSignal) + '</span></div>' : '';
  return '<div class="icp-section"><div class="icp-sec-title">Must-Have Filters</div>' + '<div class="icp-filters">' + filters + '</div></div>' +
    '<div class="icp-section"><div class="icp-sec-title">Buyer Journey</div>' + '<div class="icp-buyers">' + buyers + '</div></div>' +
    signal +
    '<div class="icp-section"><div class="icp-sec-title">Vertical Playbooks</div>' +
    '<div class="icp-vtabs">' + tabs + '</div><div class="icp-vpanels">' + panels + '</div></div>';
}

function bindVerticalTabs(el) {
  el.querySelectorAll('.icp-vtab').forEach(function(tab) {
    tab.onclick = function() {
      el.querySelectorAll('.icp-vtab').forEach(function(t) { t.classList.remove('active'); });
      el.querySelectorAll('.icp-vpanel').forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var p = el.querySelector('.icp-vpanel[data-idx="' + tab.dataset.idx + '"]');
      if (p) p.classList.add('active');
    };
  });
}
