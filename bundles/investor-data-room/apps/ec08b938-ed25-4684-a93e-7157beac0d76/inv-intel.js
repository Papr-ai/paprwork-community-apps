var EXT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
function intelLabel(r) { return r === 'direct' ? 'Direct competitor' : r === 'adjacent' ? 'Adjacent risk' : r === 'theme' ? 'Theme overlap' : 'No competitor conflict'; }
function intelChip(cls, txt) { return '<span class="intel-chip ' + cls + '">' + txt + '</span>'; }
function companyRow(c) {
  var risk = c.competitor_category === 'none' ? '' : intelChip('risk-' + c.competitor_category, intelLabel(c.competitor_category));
  var link = c.company_url ? '<a class="intel-link" href="' + esc(c.company_url) + '" target="_blank" onclick="event.stopPropagation()">' + EXT_ICON + '</a>' : '';
  var why = c.competitor_reason || c.intro_reason || c.thesis_alignment_reason || '';
  return '<div class="intel-row glass"><div class="intel-main"><div class="intel-top"><span class="intel-name">' + esc(c.company_name) + '</span>' + risk + '</div><div class="intel-sub">' + esc(why) + '</div></div>' + link + '</div>';
}
function intelBlock(title, rows, empty) {
  return '<div class="intel-block"><div class="intel-block-head">' + title + '</div>' + (rows.length ? rows.map(companyRow).join('') : '<div class="intel-empty">' + empty + '</div>') + '</div>';
}
function renderInvestorIntel(inv, rows) {
  if (!rows.length) return '<div class="inv-intel-panel glass"><div class="intel-empty">No portfolio data yet. Run the VC Portfolio Intelligence Builder for this fund.</div></div>';
  var riskRows = rows.filter(function(r){ return r.competitor_category !== 'none'; });
  var introRows = rows.filter(function(r){ return r.intro_priority_score >= 12 && r.competitor_category !== 'direct'; }).slice(0,8);
  var used = {};
  riskRows.concat(introRows).forEach(function(r){ used[r.company_name + '|' + (r.company_domain||'')] = 1; });
  var rest = rows.filter(function(r){ return !used[r.company_name + '|' + (r.company_domain||'')]; }).slice(0,12);
  var summary = '<div class="intel-summary">'
    + '<div class="intel-stat"><span class="intel-k">Raw Fit</span><strong>' + Math.round(inv.fit_score||0) + '</strong></div>'
    + '<div class="intel-stat"><span class="intel-k">Adjustment</span><strong>' + ((inv.competitor_adjustment||0) > 0 ? '+' : '') + (inv.competitor_adjustment||0) + '</strong></div>'
    + '<div class="intel-stat"><span class="intel-k">Adjusted</span><strong>' + Math.round(inv.adjusted_fit_score||inv.fit_score||0) + '</strong></div>'
    + '<div class="intel-stat intel-wide"><span class="intel-k">Best Intro Path</span><strong>' + esc(inv.best_intro_path || 'No intro target yet') + '</strong></div>'
    + '<div class="intel-stat intel-wide"><span class="intel-k">Thesis</span><strong>' + esc(inv.thesis_summary || 'No thesis summary yet') + '</strong></div></div>';
  var source = inv.portfolio_page_url ? '<a class="intel-source" href="' + esc(inv.portfolio_page_url) + '" target="_blank" onclick="event.stopPropagation()">Portfolio source ' + EXT_ICON + '</a>' : '';
  return '<div class="inv-intel-panel glass">'
    + '<div class="intel-head"><div><div class="intel-title">Investor intelligence</div><div class="intel-meta">' + (inv.portfolio_company_count||rows.length) + ' companies · ' + (inv.portfolio_intro_target_count||0) + ' intro targets · ' + (inv.portfolio_competitor_count||0) + ' risk flags</div></div>' + source + '</div>'
    + summary
    + intelBlock('Competitor risk', riskRows.slice(0,6), 'No competitor risk found in captured portfolio companies.')
    + intelBlock('Best intro paths', introRows, 'No high-signal intro targets yet.')
    + intelBlock('Portfolio', rest, 'No additional portfolio companies captured yet.')
    + '</div>';
}
async function hydrateInvestorIntel(wrap, invId) {
  var shell = wrap.querySelector('.inv-intel-shell');
  if (!shell || shell.dataset.loaded === '1') return;
  shell.dataset.loaded = '1'; shell.innerHTML = '<div class="inv-intel-panel glass"><div class="intel-empty">Loading portfolio intelligence…</div></div>';
  var inv = INV_BY_ID[invId] || {};
  try { shell.innerHTML = renderInvestorIntel(inv, await loadInvestorPortfolio(invId)); }
  catch(e) { shell.innerHTML = '<div class="inv-intel-panel glass"><div class="intel-empty">Could not load portfolio intelligence.</div></div>'; }
}
