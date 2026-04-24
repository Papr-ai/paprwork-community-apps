// Moat helper functions — build HTML sections
var VERT_ICONS = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 018 0v2"/></svg>'
};

function buildCustomerUseCases(verts) {
  if (!verts || !verts.length) return '';
  var h = '<div class="mu-grid">';
  verts.forEach(function(v) {
    h += '<div class="mu-card">';
    h += '<div class="mu-card-head">';
    h += '<span class="mu-icon">' + (VERT_ICONS[v.icon]||'') + '</span>';
    h += '<div class="mu-sector">' + esc(v.sector) + '</div>';
    h += '</div>';
    h += '<div class="mu-customer">' + esc(v.customer) +
      '<span class="mu-tagline">' + esc(v.tagline) + '</span></div>';
    // Two columns: KEEPS | LEARNS
    h += '<div class="mu-cols">';
    h += '<div class="mu-col mu-col-keeps">';
    h += '<div class="mu-col-label">' + esc(v.customer.toUpperCase()) + ' KEEPS</div>';
    v.keeps.forEach(function(k) {
      h += '<div class="mu-item"><span class="mu-dot keeps"></span>' +
        '<div><span class="mu-item-label">' + esc(k.label) + '</span>' +
        '<span class="mu-item-desc">' + esc(k.desc) + '</span></div></div>';
    });
    h += '</div>';
    h += '<div class="mu-col mu-col-learns">';
    h += '<div class="mu-col-label">PAPR LEARNS</div>';
    v.learns.forEach(function(l) {
      h += '<div class="mu-item"><span class="mu-dot learns"></span>' +
        '<div><span class="mu-item-label">' + esc(l.label) + '</span>' +
        '<span class="mu-item-desc">' + esc(l.desc) + '</span></div></div>';
    });
    h += '</div></div></div>';
  });
  h += '</div>';
  return h;
}

function buildFlywheel(fw) {
  if (!fw || !fw.length) return '';
  var h = '<div class="mt-fly"><div class="mt-fly-ring">';
  fw.forEach(function(s) {
    h += '<div class="mt-fly-step">' +
      '<span class="mt-fly-num">' + s.num + '</span>' +
      '<span class="mt-fly-name">' + esc(s.step) + '</span>' +
      '<span class="mt-fly-desc">' + esc(s.desc) + '</span>' +
      '<span class="mt-fly-unit">' + esc(s.unit) + '</span></div>';
  });
  h += '</div></div>';
  return h;
}

function buildMoatLayers(layers) {
  if (!layers || !layers.length) return '';
  var visMap = ['graph','predict','embed','vertical'];
  var h = '<div class="mt-layers">';
  layers.forEach(function(l, i) {
    h += '<div class="mt-layer"><div class="mt-layer-row">' +
      '<div class="mt-layer-vis" id="moat-vis-' + (visMap[i]||'x') + '"></div>' +
      '<div class="mt-layer-text">' +
      '<span class="mt-layer-name">' + esc(l.name) + '</span>' +
      '<p class="mt-layer-what">' + esc(l.what) + '</p>' +
      '<p class="mt-layer-why">' + esc(l.why) + '</p>' +
      '</div></div></div>';
  });
  h += '</div>';
  return h;
}

function buildMoatMarkdown(d) {
  var md = '# ' + d.title + '\n\n';
  md += '> ' + d.headline + '\n\n' + d.thesis + '\n\n';
  md += '## Customer Use-Cases\n\n';
  if (d.verticals) d.verticals.forEach(function(v) {
    md += '### ' + v.sector + ' — ' + v.customer + '\n';
    md += '*' + v.tagline + '*\n\n';
    md += '**' + v.customer + ' keeps:**\n';
    v.keeps.forEach(function(k) { md += '- **' + k.label + '** — ' + k.desc + '\n'; });
    md += '\n**Papr learns:**\n';
    v.learns.forEach(function(l) { md += '- **' + l.label + '** — ' + l.desc + '\n'; });
    md += '\n';
  });
  md += '## Data Flywheel\n\n';
  if (d.flywheel) d.flywheel.forEach(function(s) {
    md += '**' + s.step + '** — ' + s.num + ' ' + s.desc + ' (' + s.unit + ')\n\n';
  });
  md += '## Moat Layers\n\n';
  if (d.layers) d.layers.forEach(function(l) {
    md += '### ' + l.name + '\n' + l.what + '\n\n*' + l.why + '*\n\n';
  });
  return md;
}
