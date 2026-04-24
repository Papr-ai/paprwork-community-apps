/* Fit Score Explainer — detail builders (split from fit-explainer.js) */

function buildFundDetails(inv) {
  var chips = [];
  var amin = inv.preferred_amount_min || 0, amax = inv.preferred_amount_max || 0;
  var fs = inv.last_fund_size || 0;
  var types = inv.preferred_investment_types || '';
  var city = inv.hq_city || '';
  if (amin > 0 || amax > 0) {
    var range = amin > 0 && amax > 0 ? '$' + amin + 'M - $' + amax + 'M' : amin > 0 ? '$' + amin + 'M+' : 'Up to $' + amax + 'M';
    chips.push('<div class="fd-chip"><span class="fd-label">Avg Check</span><span class="fd-val">' + range + '</span></div>');
  }
  if (fs > 0) chips.push('<div class="fd-chip"><span class="fd-label">Fund Size</span><span class="fd-val">$' + fs + 'M</span></div>');
  if (types) chips.push('<div class="fd-chip"><span class="fd-label">Stage</span><span class="fd-val">' + esc(types) + '</span></div>');
  if (city) chips.push('<div class="fd-chip"><span class="fd-label">HQ</span><span class="fd-val">' + esc(city) + '</span></div>');
  if (inv.investments_12m > 0) chips.push('<div class="fd-chip"><span class="fd-label">Deals (12mo)</span><span class="fd-val">' + inv.investments_12m + '</span></div>');
  if (!chips.length) return '<div class="fd-row"><span class="fd-empty">Limited fund data available</span></div>';
  return '<div class="fd-row">' + chips.join('') + '</div>';
}

function buildDimSpecific(d, inv) {
  var det = d.detail;
  if (d.key === 'thesis') {
    if (det.t1 === 0 && det.t2 === 0)
      return '<span class="dim-warn">No keyword matches found</span> -- their description/verticals fields may be empty in our database.';
    return 'Found ' + (det.t1||0) + ' Tier-1 and ' + (det.t2||0) + ' Tier-2 keyword matches.';
  }
  if (d.key === 'stage') {
    var sh = det.stage_hit;
    var fs = det.fund_size || 0;
    var parts = [];
    parts.push(sh
      ? '<span class="dim-pass">Lists pre-seed/seed in investment types</span>'
      : '<span class="dim-fail">No pre-seed/seed in investment types</span>');
    if (fs > 0)
      parts.push('Fund size: $' + fs + 'M ' + (fs <= 200 ? '(sweet spot)' : fs <= 500 ? '(medium)' : '(large -- less likely to lead pre-seed)'));
    else
      parts.push('<span class="dim-warn">Fund size unknown</span>');
    return parts.join('<br/>');
  }
  if (d.key === 'activity') {
    var inv12 = det.inv_12m || 0;
    return inv12 > 0
      ? inv12 + ' investments in last 12 months'
      : '<span class="dim-warn">No recent investment data available</span>';
  }
  if (d.key === 'geography') {
    var city = det.city || '';
    return city ? 'HQ: ' + city : '<span class="dim-warn">No location data in our database</span>';
  }
  if (d.key === 'capacity') {
    var p = det.partners || 0;
    return p > 0 ? p + ' partner(s) tracked' : '<span class="dim-warn">No partner data available</span>';
  }
  return '';
}

function buildWhySection(inv, dims, hasGaps) {
  var html = '<div class="fit-why"><h4>Why This Score?</h4>';
  var zeros = dims.filter(function(d){ return d.val === 0; });
  var highs = dims.filter(function(d){ return d.val >= d.max * 0.7; });
  if (hasGaps) {
    html += '<p><strong>Primary reason: Missing data.</strong> '
      + zeros.length + ' of 5 dimensions scored zero -- not because '
      + esc(inv.name) + ' is a bad fit, but because we don\'t have enough data about them yet.</p>'
      + '<div class="data-gap">' + zeros.map(function(d){ return d.label; }).join(', ') + ' -- data needed</div>';
  } else if (zeros.length > 0) {
    html += '<p>' + zeros.map(function(d){ return '<strong>' + d.label + '</strong>: scored 0'; }).join('. ')
      + '. This may indicate a genuine mismatch or missing data.</p>';
  }
  if (highs.length > 0) {
    html += '<p>Strong signals: ' + highs.map(function(d){ return d.label + ' (' + d.val + '/' + d.max + ')'; }).join(', ') + '</p>';
  }
  html += '</div>';
  return html;
}

function buildPaprMapSection() {
  var ti = FIT_DIM_ICONS.thesis, si = FIT_DIM_ICONS.stage, ci = FIT_DIM_ICONS.capacity, gi = FIT_DIM_ICONS.geography;
  return '<div class="fit-section-title">How This Maps to Your Company</div><div class="fit-papr-map">'
    + '<div class="fit-map-card"><h5><span class="map-ico">' + ti + '</span> Our Thesis</h5><p>AI-native memory infrastructure. Checks if VCs invest in AI infra, dev tools, knowledge graphs.</p></div>'
    + '<div class="fit-map-card"><h5><span class="map-ico">' + si + '</span> Our Stage</h5><p>Pre-seed raising $2.5M. Penalizes mega-funds ($1B+) that rarely lead pre-seed rounds.</p></div>'
    + '<div class="fit-map-card"><h5><span class="map-ico">' + ci + '</span> Founders</h5><p>Alex & Sarah -- repeat founders, technical. Capacity favors VCs with bandwidth to be hands-on.</p></div>'
    + '<div class="fit-map-card"><h5><span class="map-ico">' + gi + '</span> Location</h5><p>Based in SF Bay Area. Proximity weighted for hands-on involvement.</p></div></div>';
}

function buildEquation(dims, score) {
  return '<div class="fit-section-title">The Equation</div><div class="fit-eq"><span class="eq-hl">Fit Score</span> = '
    + dims.map(function(d){ return '<span class="eq-hl">' + d.label + '</span>(<span class="eq-val">' + d.val + '</span>/' + d.max + ')'; }).join(' + ')
    + ' = <span class="eq-val">' + Math.round(score) + '</span></div>';
}

function buildVCLinksSection(inv) {
  var url = inv.fund_url || '';
  var domain = url.replace(/https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
  if (!domain) return '';
  var linkIco = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  var xIco = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
  var searchIco = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
  var html = '<div class="fit-vc-links">';
  html += '<a href="' + esc(url.startsWith('http') ? url : 'https://'+domain) + '" target="_blank" class="vc-link glass">' + linkIco + ' Website</a>';
  html += '<a href="https://x.com/search?q=' + encodeURIComponent(inv.name) + '" target="_blank" class="vc-link glass">' + xIco + ' Find on X</a>';
  html += '<a href="https://substack.com/search/' + encodeURIComponent(inv.name) + '" target="_blank" class="vc-link glass">' + searchIco + ' Substack</a>';
  html += '</div>';
  return html;
}
