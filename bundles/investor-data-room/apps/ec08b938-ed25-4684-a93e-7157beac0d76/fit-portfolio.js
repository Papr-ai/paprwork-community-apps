/* Portfolio tab — logos, founders, links */
async function loadPortfolioTab(inv) {
  var ct = document.getElementById('fit-tab-portfolio');
  if (!ct || ct.dataset.loaded === inv.id) return;
  ct.dataset.loaded = inv.id;
  ct.innerHTML = '<div class="portfolio-loading">Loading portfolio...</div>';
  try {
    var rows = await loadInvestorPortfolio(inv.id);
    if (!rows || !rows.length) { ct.innerHTML = '<div class="port-empty">No portfolio data yet.</div>'; return; }
    var risks = rows.filter(function(r){ return r.competitor_category && r.competitor_category !== 'none'; });
    var others = rows.filter(function(r){ return !r.competitor_category || r.competitor_category === 'none'; });
    var html = '<div class="port-summary">' + rows.length + ' companies';
    if (risks.length) html += ' <span class="port-risk-count">' + risks.length + ' competitor risk</span>';
    html += '</div>';
    if (risks.length) {
      html += '<div class="port-section"><div class="port-section-head">Competitor Risk</div>';
      risks.forEach(function(r){ html += buildPortCard(r, true); });
      html += '</div>';
    }
    html += '<div class="port-section"><div class="port-section-head">Portfolio</div><div class="port-grid">';
    others.slice(0,60).forEach(function(r){ html += buildPortCard(r, false); });
    html += '</div>';
    if (others.length > 60) html += '<div class="port-more">' + (others.length-60) + ' more</div>';
    html += '</div>';
    ct.innerHTML = html;
  } catch(e) { ct.innerHTML = '<div class="port-empty">Could not load portfolio.</div>'; }
}
function portLogo(c) {
  var d = c.company_domain || '';
  var ini = (c.company_name||'?').charAt(0).toUpperCase();
  if (!d) return '<div class="port-logo-letter">' + ini + '</div>';
  var src = c.company_logo_url || ('https://icon.horse/icon/' + d);
  return '<img class="port-logo" src="' + esc(src) + '" loading="lazy" onerror="this.outerHTML=\'<div class=port-logo-letter>' + ini + '</div>\'">';
}
function portFounders(c) {
  if (!c.founder_names) return '';
  var names = c.founder_names.split(',').slice(0,3);
  var links = (c.founder_linkedin_urls || '').split(',');
  var html = '<div class="port-founders">';
  names.forEach(function(n, i) {
    var nm = n.trim(); if (!nm || nm.length > 50) return;
    var li = (links[i]||'').trim();
    if (li && li.indexOf('linkedin.com') > -1) {
      html += '<a class="port-founder" href="' + esc(li) + '" target="_blank" onclick="event.stopPropagation()">' + esc(nm) + '</a>';
    } else { html += '<span class="port-founder">' + esc(nm) + '</span>'; }
  });
  return html + '</div>';
}
function cleanName(n) {
  if (!n) return '';
  return n.replace(/https?:\/\/[^\s]+/g,'').replace(/VISIT WEBSITE/gi,'').replace(/\s{2,}/g,' ').trim().split(' ').slice(0,5).join(' ');
}
function buildPortCard(c, isRisk) {
  var risk = '';
  if (isRisk) {
    var cls = c.competitor_category === 'direct' ? 'risk-direct' : c.competitor_category === 'adjacent' ? 'risk-adjacent' : 'risk-theme';
    var lbl = c.competitor_category === 'direct' ? 'Direct' : c.competitor_category === 'adjacent' ? 'Adjacent' : 'Theme';
    risk = '<span class="port-risk-tag ' + cls + '">' + lbl + '</span>';
  }
  var ext = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  var link = c.company_url ? '<a class="port-ext" href="' + esc(c.company_url) + '" target="_blank" onclick="event.stopPropagation()">' + ext + '</a>' : '';
  var desc = c.company_description ? '<div class="port-desc">' + esc(c.company_description.substring(0,90)) + '</div>' : '';
  return '<div class="port-card' + (isRisk ? ' port-card-risk' : '') + '">'
    + '<div class="port-card-top">' + portLogo(c) + '<div class="port-card-info">'
    + '<div class="port-card-name">' + esc(cleanName(c.company_name)) + risk + '</div>' + desc
    + '</div>' + link + '</div>' + portFounders(c) + '</div>';
}
