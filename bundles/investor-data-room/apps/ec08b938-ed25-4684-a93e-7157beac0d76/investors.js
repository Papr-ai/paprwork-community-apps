var INV_BY_ID = {};
var INV_FILTERS = { closed:true, verbal_commit:true, waiting:true, active_diligence:true, intro:true, Lead:true, ghosted:false, closed_lost:false, late_stage:false, passed:false };
var STAGE_LABELS = { closed:'Closed', verbal_commit:'Verbal Commit', waiting:'Waiting', active_diligence:'Diligence', intro:'Intro', Lead:'Lead', ghosted:'Ghosted', closed_lost:'Lost', late_stage:'Late Stage', passed:'Passed' };
var STAGE_CLS = { closed:'stage-closed', verbal_commit:'stage-commit', active_diligence:'stage-diligence', waiting:'stage-waiting', intro:'stage-intro', Lead:'stage-lead', ghosted:'stage-ghost', closed_lost:'stage-lost', late_stage:'stage-late', passed:'stage-ghost' };
var INV_SORT = 'fit_score';
var INV_GEO = 'us';
function renderInvestorsTab(investors, partners) {
  partners = partners || [];
  var pByInv = {}, stageCounts = {};
  partners.forEach(function(p){ if (p.investor_id) (pByInv[p.investor_id] = pByInv[p.investor_id] || []).push(p); });
  investors.forEach(function(i){ stageCounts[i.stage] = (stageCounts[i.stage] || 0) + 1; INV_BY_ID[i.id] = i; });
  var pills = Object.keys(STAGE_LABELS).filter(function(s){ return stageCounts[s] > 0; }).map(function(s){ return '<button class="filter-pill ' + (INV_FILTERS[s] ? 'active' : '') + '" data-stage="' + s + '">' + STAGE_LABELS[s] + ' <span class="filter-count">' + (stageCounts[s] || 0) + '</span></button>'; }).join('');
  var filtered = investors.filter(function(inv){
    if (!INV_FILTERS[inv.stage]) return false;
    if (INV_GEO === 'us') return inv.country === 'US' || inv.country === 'UNKNOWN';
    if (INV_GEO === 'int') return inv.country === 'INT';
    return true;
  });
  if (INV_SORT === 'fit_score') filtered.sort(function(a,b){ return (b.fit_score||0) - (a.fit_score||0); });
  else if (INV_SORT === 'name') filtered.sort(function(a,b){ return a.name.localeCompare(b.name); });
  var rows = filtered.map(function(inv){ return buildInvRow(inv, pByInv[inv.id] || []); }).join('');
  var hi = filtered.filter(function(i){ return (i.fit_score || 0) >= 70; }).length;
  var geo = '<div class="geo-toggle"><button class="geo-btn' + (INV_GEO === 'us' ? ' active' : '') + '" data-geo="us">US Only</button><button class="geo-btn' + (INV_GEO === 'all' ? ' active' : '') + '" data-geo="all">All</button></div>';
  return '<div class="investors-panel"><div class="investors-header"><h2>Investors <span class="inv-count">' + filtered.length + '</span></h2><span class="inv-hi-badge">' + hi + ' high fit</span>' + geo + '<select id="inv-sort" class="inv-sort-sel"><option value="fit_score"' + (INV_SORT === 'fit_score' ? ' selected' : '') + '>Fit Score</option><option value="name"' + (INV_SORT === 'name' ? ' selected' : '') + '>Name</option></select><button class="btn-sm glass" id="discover-vcs-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Discover VCs</button></div><div class="filter-bar">' + pills + '</div><div class="investors-list">' + (rows || '<p class="empty-state">No investors match.</p>') + '</div></div>';
}
function bindInvestorEvents(el) {
  el.querySelectorAll('.inv-row-wrap').forEach(function(w){
    w.querySelector('.inv-row').onclick = function(){ w.classList.toggle('expanded'); };
  });
  el.querySelectorAll('.share-link-btn').forEach(function(b){ b.onclick = function(){ generateShareLink(b.dataset.id, b.dataset.name); }; });
  el.querySelectorAll('.share-ptr-btn').forEach(function(b){ b.onclick = function(){ generatePartnerShareLink(b.dataset.invId, b.dataset.ptrId, b.dataset.name); }; });
  el.querySelectorAll('.add-person-btn').forEach(function(b){ b.onclick = function(){ showAddPersonModal(b.dataset.invId, b.dataset.fund); }; });
  el.querySelectorAll('.edit-ptr-btn').forEach(function(b){ b.onclick = function(){ showEditPartnerModal(b.dataset.ptrId); }; });
  el.querySelectorAll('.fit-badge').forEach(function(b){ b.onclick = function(e){ e.stopPropagation(); var inv = INV_BY_ID[b.dataset.invId]; if (inv && typeof openFitExplainer === 'function') openFitExplainer(inv); }; });
  el.querySelectorAll('.filter-pill').forEach(function(p){ p.onclick = function(){ INV_FILTERS[p.dataset.stage] = !INV_FILTERS[p.dataset.stage]; refreshInvestorsTab(); }; });
  el.querySelectorAll('.geo-btn').forEach(function(b){ b.onclick = function(){ INV_GEO = b.dataset.geo; refreshInvestorsTab(); }; });
  var d = el.querySelector('#discover-vcs-btn'); if (d) d.onclick = openVCDiscovery;
  var s = el.querySelector('#inv-sort'); if (s) s.onchange = function(){ INV_SORT = s.value; refreshInvestorsTab(); };
}
async function refreshInvestorsTab() {
  var container = document.getElementById('tab-investors');
  if (!container) return;
  container.innerHTML = renderInvestorsTab(await loadInvestors(), await loadPartners());
  bindInvestorEvents(container);
  if (typeof bindInvLogoUploads === 'function') bindInvLogoUploads();
}
