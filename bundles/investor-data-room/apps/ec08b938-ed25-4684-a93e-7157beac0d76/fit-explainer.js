/* Fit Score Explainer Modal — with tabs: Fit Score + Portfolio */
var FIT_DIM_ICONS = {
  thesis: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></svg>',
  stage: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>',
  activity: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  geography: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  capacity: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M21 20c0-2.5-2-4-4-4-1 0-1.8.3-2.5.8"/></svg>'
};
var FIT_DIMS = [
  { key:'thesis', label:'Thesis Match', max:35, color:'#a78bfa', desc:'Scans VC focus areas for Tier-1 keywords (AI infra, devtools, deep tech, embeddings, vector, knowledge graph) at 10pts each, and Tier-2 (AI, SaaS, enterprise, cloud, data) at 3pts each.' },
  { key:'stage', label:'Stage Fit', max:20, color:'#22c55e', desc:'Checks if investment types mention pre-seed, seed, angel, or early-stage. Fund size matters -- smaller funds (under $200M) more likely to lead pre-seed than mega-funds.' },
  { key:'activity', label:'Activity', max:15, color:'#3b82f6', desc:'Investments in last 12 months (+2pts each), whether currently raising/open, and if latest fund closed 2024-2026.' },
  { key:'geography', label:'Geography', max:15, color:'#f59e0b', desc:'SF Bay Area = 15pts, NYC/Boston = 10pts, US/global = 8pts.' },
  { key:'capacity', label:'Capacity', max:15, color:'#ec4899', desc:'Avg board seats per partner (fewer = more available). 3+ partners helps.' }
];
function ensureFitOverlay() {
  var el = document.getElementById('fit-explainer-overlay');
  if (!el) { el = document.createElement('div'); el.id = 'fit-explainer-overlay'; el.className = 'fit-overlay'; el.innerHTML = '<div class="fit-modal"></div>'; el.addEventListener('click', function(e){ if (e.target === el) closeFitExplainer(); }); document.body.appendChild(el); }
  return el;
}
function closeFitExplainer() { var el = document.getElementById('fit-explainer-overlay'); if (el) el.classList.remove('open'); }

function openFitExplainer(inv) {
  var bd = {}; try { bd = JSON.parse(inv.fit_breakdown || '{}'); } catch(e) {}
  var score = inv.adjusted_fit_score > 0 ? inv.adjusted_fit_score : (inv.fit_score || 0);
  var rawScore = inv.fit_score || 0;
  var overlay = ensureFitOverlay(), modal = overlay.querySelector('.fit-modal');
  var scoreColor = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  var dims = FIT_DIMS.map(function(d) {
    var raw = bd[d.key] || bd[d.key === 'geography' ? 'geo' : d.key] || 0;
    var val = typeof raw === 'object' ? (raw.score || 0) : raw;
    var detail = typeof raw === 'object' ? raw : {};
    return Object.assign({}, d, { val: val, detail: detail });
  });
  if (bd.geo && !bd.geography) { var gd = dims.find(function(d){ return d.key === 'geography'; }); if (gd) { gd.val = typeof bd.geo === 'object' ? (bd.geo.score||0) : bd.geo; gd.detail = typeof bd.geo === 'object' ? bd.geo : {}; } }
  var gaps = dims.filter(function(d){ return d.val === 0; });
  var vcLinks = typeof buildVCLinksSection === 'function' ? buildVCLinksSection(inv) : '';
  var riskBanner = inv.competitor_risk && inv.competitor_risk !== 'none'
    ? '<div class="fit-risk-banner risk-' + inv.competitor_risk + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ' + (inv.competitor_risk === 'direct' ? 'Direct competitor in portfolio' : inv.competitor_risk === 'adjacent' ? 'Adjacent competitor risk' : 'Theme overlap') + ': ' + esc(inv.competitor_risk_reason || '') + '</div>' : '';
  var adjNote = inv.competitor_adjustment && inv.competitor_adjustment !== 0
    ? '<div class="fit-adj-note">Raw fit: ' + Math.round(rawScore) + ' / Competitor adjustment: ' + inv.competitor_adjustment + ' / Adjusted: ' + Math.round(score) + '</div>' : '';
  var tabs = '<div class="fit-tabs"><button class="fit-tab active" data-tab="score">Fit Score</button><button class="fit-tab" data-tab="portfolio">Portfolio</button></div>';
  var html = '<button class="fit-close" onclick="closeFitExplainer()">&times;</button>'
    + '<div class="fit-header"><h2>' + esc(inv.name) + '</h2>' + vcLinks + '</div>'
    + riskBanner + adjNote + tabs
    + '<div class="fit-tab-content" id="fit-tab-score">'
    + buildFundDetails(inv) + buildScoreRing(score, scoreColor) + buildDimBars(dims)
    + buildEquation(dims, score) + buildWhySection(inv, dims, gaps.length >= 3) + buildPaprMapSection() + '</div>'
    + '<div class="fit-tab-content" id="fit-tab-portfolio" style="display:none"><div class="portfolio-loading">Loading portfolio...</div></div>';
  modal.innerHTML = html; modal.dataset.invId = inv.id; overlay.classList.add('open');
  requestAnimationFrame(function(){ setTimeout(function(){
    var ring = document.getElementById('fit-ring-fg'); if (ring) ring.style.strokeDashoffset = 295 - (295 * Math.min(score,100) / 100);
    modal.querySelectorAll('.fit-dim-fill').forEach(function(f){ f.style.width = f.dataset.pct + '%'; });
  }, 50); });
  modal.querySelectorAll('.fit-dim').forEach(function(d){ d.onclick = function(){ var w = d.classList.contains('active'); modal.querySelectorAll('.fit-dim').forEach(function(x){ x.classList.remove('active'); }); if (!w) d.classList.add('active'); }; });
  modal.querySelectorAll('.fit-tab').forEach(function(t){ t.onclick = function(){ modal.querySelectorAll('.fit-tab').forEach(function(x){ x.classList.remove('active'); }); t.classList.add('active'); modal.querySelectorAll('.fit-tab-content').forEach(function(c){ c.style.display = 'none'; }); document.getElementById('fit-tab-' + t.dataset.tab).style.display = 'block'; if (t.dataset.tab === 'portfolio') loadPortfolioTab(inv); }; });
}
function buildScoreRing(score, scoreColor) {
  var circ = 295, offset = circ - (circ * Math.min(score, 100) / 100);
  return '<div class="fit-score-ring"><svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="47" class="ring-bg"/><circle cx="55" cy="55" r="47" class="ring-fg" id="fit-ring-fg" stroke="' + scoreColor + '"/></svg><div class="ring-val"><span class="ring-num" style="color:' + scoreColor + '">' + Math.round(score) + '</span><span class="ring-lbl">/ 100</span></div></div>';
}
function buildDimBars(dims) {
  var html = '<div class="fit-dims">'; dims.forEach(function(d, i) { var pct = Math.round(d.val / d.max * 100); var specDetail = typeof buildDimSpecific === 'function' ? buildDimSpecific(d, {}) : ''; var dimIcon = FIT_DIM_ICONS[d.key] || '';
    html += '<div class="fit-dim" data-idx="' + i + '"><div class="fit-dim-top"><span class="fit-dim-name"><span class="dim-icon">' + dimIcon + '</span>' + d.label + '</span><span class="fit-dim-score" style="background:' + d.color + '22;color:' + d.color + '">' + d.val + '/' + d.max + '</span></div><div class="fit-dim-bar"><div class="fit-dim-fill" style="background:' + d.color + '" data-pct="' + pct + '"></div></div><div class="fit-dim-detail">' + d.desc + (specDetail ? '<br/><br/>' + specDetail : '') + '</div></div>';
  }); html += '</div>'; return html;
}
