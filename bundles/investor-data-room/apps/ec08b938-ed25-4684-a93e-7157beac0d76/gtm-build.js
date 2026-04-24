// GTM builder helpers — pricing, growth, cross-links, markdown
function buildPricing(tiers) {
  if (!tiers || !tiers.length) return '';
  var html = '<div class="gtm-section">' +
    '<span class="gtm-section-title">Pricing</span>' +
    '<div class="gtm-price-grid">';
  tiers.forEach(function(t) {
    var cls = t.highlight ? ' gtm-price-hl' : '';
    html += '<div class="gtm-price' + cls + '">' +
      '<span class="gtm-price-tier">' + esc(t.tier) + '</span>' +
      '<span class="gtm-price-amt">' + esc(t.price) +
      (t.period ? '<span class="gtm-price-per">' + esc(t.period) + '</span>' : '') +
      '</span>' +
      '<span class="gtm-price-desc">' + esc(t.desc) + '</span>' +
      '<ul class="gtm-price-list">' +
      t.features.map(function(f) { return '<li>' + esc(f) + '</li>'; }).join('') +
      '</ul>' +
      (t.proof ? '<span class="gtm-price-proof">' + esc(t.proof) + '</span>' : '') +
      '</div>';
  });
  html += '</div></div>';
  return html;
}

function buildGrowth(phases) {
  if (!phases || !phases.length) return '';
  var html = '<div class="gtm-section">' +
    '<span class="gtm-section-title">Growth Plan</span>' +
    '<div class="gtm-growth">';
  phases.forEach(function(p, i) {
    html += '<div class="gtm-phase">' +
      '<span class="gtm-phase-tag">' + esc(p.phase) + '</span>' +
      '<span class="gtm-phase-label">' + esc(p.label) + '</span>' +
      '<span class="gtm-phase-desc">' + esc(p.desc) + '</span>' +
      '<span class="gtm-phase-metric">' + esc(p.metric) + '</span>' +
      '</div>';
    if (i < phases.length - 1) html += '<span class="gtm-phase-arrow">\u203A</span>';
  });
  html += '</div></div>';
  return html;
}

function buildUseFundsLink() {
  return '<div class="gtm-section gtm-funds-link">' +
    '<div class="gtm-funds-card" id="gtm-funds-nav">' +
    '<div class="gtm-funds-left">' +
    '<span class="gtm-funds-label">Use of Funds</span>' +
    '<span class="gtm-funds-sub">$3M Pre-Seed allocation across Memory IP, Engineering & GTM</span>' +
    '</div>' +
    '<span class="gtm-funds-arrow">\u203A</span>' +
    '</div></div>';
}

function buildGTMMarkdown(d) {
  var md = '# ' + d.title + '\n\n';
  md += '> ' + d.headline + '\n\n' + d.thesis + '\n\n';
  md += '## Distribution Channels\n\n';
  if (d.distribution) d.distribution.forEach(function(c) {
    md += c.num + '. **' + c.channel + '** \u2014 ' + c.desc + '\n   ' + c.detail + '\n\n';
  });
  md += '## Community & Content\n\n';
  if (d.community) d.community.forEach(function(c) {
    md += '- **' + c.metric + '** ' + c.label + '\n';
  });
  md += '\n## Pricing\n\n| Tier | Price | Features |\n|------|-------|----------|\n';
  if (d.pricing) d.pricing.forEach(function(t) {
    md += '| ' + t.tier + ' | ' + t.price + (t.period||'') + ' | ' + t.features.join(', ') + ' |\n';
    if (t.proof) md += '\n> ' + t.proof + '\n\n';
  });
  md += '\n## Growth Plan\n\n';
  if (d.growth) d.growth.forEach(function(p) {
    md += '### ' + p.phase + ': ' + p.label + '\n' + p.desc + '\n*' + p.metric + '*\n\n';
  });
  return md;
}
