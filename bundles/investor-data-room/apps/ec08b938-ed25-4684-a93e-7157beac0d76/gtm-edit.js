// GTM Editor
function openGTMEditor(d) {
  var ov = document.createElement('div');
  ov.className = 'edit-overlay';
  ov.innerHTML = '<div class="edit-panel glass">' +
    '<div class="edit-header"><span>Edit Go-to-Market</span>' +
    '<button class="edit-close" id="gtm-edit-close">\u2715</button></div>' +
    '<div class="edit-body">' +
    '<label class="edit-label">Headline</label>' +
    '<input class="edit-input" id="gtm-e-hl" value="' + esc(d.headline) + '">' +
    '<label class="edit-label">Thesis</label>' +
    '<textarea class="edit-textarea" id="gtm-e-th" rows="3">' + esc(d.thesis) + '</textarea>' +
    '<label class="edit-label">Distribution Channels</label>' +
    '<div id="gtm-e-dist">' + d.distribution.map(function(c, i) {
      return '<div class="edit-row" style="margin-bottom:8px">' +
        '<input class="edit-input" placeholder="Channel" value="' + esc(c.channel) + '" data-di="' + i + '" data-df="channel">' +
        '<input class="edit-input" placeholder="Description" value="' + esc(c.desc) + '" data-di="' + i + '" data-df="desc">' +
        '<input class="edit-input" placeholder="Detail" value="' + esc(c.detail) + '" data-di="' + i + '" data-df="detail">' +
        '</div>';
    }).join('') + '</div>' +
    '<label class="edit-label">Community Metrics</label>' +
    '<div id="gtm-e-comm">' + d.community.map(function(c, i) {
      return '<div class="edit-row-inline">' +
        '<input class="edit-input-sm" value="' + esc(c.metric) + '" data-ci="' + i + '" data-cf="metric">' +
        '<input class="edit-input" value="' + esc(c.label) + '" data-ci="' + i + '" data-cf="label">' +
        '</div>';
    }).join('') + '</div>' +
    '<label class="edit-label">Pricing Tiers</label>' +
    '<div id="gtm-e-price">' + d.pricing.map(function(t, i) {
      return '<div class="edit-row" style="margin-bottom:8px">' +
        '<input class="edit-input-sm" value="' + esc(t.tier) + '" data-pi="' + i + '" data-pf="tier">' +
        '<input class="edit-input-sm" value="' + esc(t.price) + '" data-pi="' + i + '" data-pf="price">' +
        '<input class="edit-input" placeholder="Features (comma-separated)" value="' +
        esc(t.features.join(', ')) + '" data-pi="' + i + '" data-pf="features">' +
        '</div>';
    }).join('') + '</div>' +
    '<label class="edit-label">Growth Phases</label>' +
    '<div id="gtm-e-growth">' + d.growth.map(function(p, i) {
      return '<div class="edit-row" style="margin-bottom:8px">' +
        '<input class="edit-input-sm" value="' + esc(p.phase) + '" data-gi="' + i + '" data-gf="phase">' +
        '<input class="edit-input" value="' + esc(p.label) + '" data-gi="' + i + '" data-gf="label">' +
        '<input class="edit-input" value="' + esc(p.desc) + '" data-gi="' + i + '" data-gf="desc">' +
        '<input class="edit-input-sm" value="' + esc(p.metric) + '" data-gi="' + i + '" data-gf="metric">' +
        '</div>';
    }).join('') + '</div>' +
    '<button class="edit-save" id="gtm-e-save">Save</button>' +
    '</div></div>';
  document.body.appendChild(ov);
  document.getElementById('gtm-edit-close').onclick = function() { ov.remove(); };
  document.getElementById('gtm-e-save').onclick = function() { saveGTMEdit(d, ov); };
}

function saveGTMEdit(d, ov) {
  d.headline = document.getElementById('gtm-e-hl').value;
  d.thesis = document.getElementById('gtm-e-th').value;
  ov.querySelectorAll('[data-di]').forEach(function(el) {
    var i = +el.dataset.di, f = el.dataset.df;
    if (d.distribution[i]) d.distribution[i][f] = el.value;
  });
  ov.querySelectorAll('[data-ci]').forEach(function(el) {
    var i = +el.dataset.ci, f = el.dataset.cf;
    if (d.community[i]) d.community[i][f] = el.value;
  });
  ov.querySelectorAll('[data-pi]').forEach(function(el) {
    var i = +el.dataset.pi, f = el.dataset.pf;
    if (d.pricing[i]) {
      if (f === 'features') d.pricing[i].features = el.value.split(',').map(function(s){return s.trim();});
      else d.pricing[i][f] = el.value;
    }
  });
  ov.querySelectorAll('[data-gi]').forEach(function(el) {
    var i = +el.dataset.gi, f = el.dataset.gf;
    if (d.growth[i]) d.growth[i][f] = el.value;
  });
  localStorage.setItem('gtm_data_v1', JSON.stringify(d));
  ov.remove();
  var vwClose = document.getElementById('vw-close');
  if (vwClose) vwClose.click();
  openGTM(true);
}
