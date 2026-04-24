// ICP editor — tabbed layout matching the viewer sections
function openICPEditorView(d) {
  if (viewerOverlay) closeViewer(true);
  _icpPhotos.profile = d.profilePhoto || '';
  _icpPhotos.background = d.backgroundPhoto || '';
  var tabs = '<div class="mt-tabs">' +
    '<span class="mt-tab active" data-ed="0">Filters</span>' +
    '<span class="mt-tab" data-ed="1">Buyer Journey</span>' +
    '<span class="mt-tab" data-ed="2">Verticals</span>' +
    '<span class="mt-tab" data-ed="3">Signal</span></div>';
  // Photos + identity header
  var bgPrev = _icpPhotos.background
    ? '<img src="' + _icpPhotos.background + '" class="icp-ed-bg-img">'
    : '<span class="icp-ed-bg-empty">Click to add background</span>';
  var pfPrev = _icpPhotos.profile
    ? '<img src="' + _icpPhotos.profile + '" class="icp-ed-pf-img">'
    : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 19.5c0-3 3-5.5 6.5-5.5s6.5 2.5 6.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var header = '<div class="icp-ed-photos">' +
    '<div class="icp-ed-bg" id="icp-bg-upload">' + bgPrev + '<div class="icp-ed-bg-hint">Background</div></div>' +
    '<div class="icp-ed-pf" id="icp-pf-upload">' + pfPrev + '</div></div>' +
    '<input type="file" id="icp-bg-file" accept="image/*" style="display:none">' +
    '<input type="file" id="icp-pf-file" accept="image/*" style="display:none">' +
    '<div class="icp-ed-fields">' +
    '<div class="icp-ed-field"><label>Persona Name</label><input id="icp-name" value="' + esc(d.name||'') + '"></div>' +
    '<div class="icp-ed-field"><label>Tagline</label><input id="icp-tagline" value="' + esc(d.tagline||'') + '"></div></div>';
  // Page 0: Must-Have Filters
  var filterRows = (d.filters||[]).map(function(f,i) {
    return _icpFilterRow(f, i);
  }).join('');
  var p0 = '<div class="mt-ed-page" id="icp-ed-0"><div class="icp-ed-filters">' + filterRows + '</div>' +
    '<button class="mt-ed-add" data-t="filter">+ Add filter</button></div>';
  // Page 1: Buyer Journey
  var buyerRows = (d.buyers||[]).map(function(b,i) {
    return _icpBuyerRow(b, i);
  }).join('');
  var p1 = '<div class="mt-ed-page hidden" id="icp-ed-1"><div class="icp-ed-buyers">' + buyerRows + '</div>' +
    '<button class="mt-ed-add" data-t="buyer">+ Add buyer</button></div>';
  // Page 2: Vertical Playbooks
  var vertRows = (d.verticals||[]).map(function(v,i) {
    return _icpVertRow(v, i);
  }).join('');
  var p2 = '<div class="mt-ed-page hidden" id="icp-ed-2"><div class="icp-ed-verts">' + vertRows + '</div>' +
    '<button class="mt-ed-add" data-t="vert">+ Add vertical</button></div>';
  // Page 3: Graph Signal + Criteria
  var critRows = (d.criteria||[]).map(function(c,i) {
    return '<div class="icp-ed-pair"><input class="icp-ed-lbl" value="'+esc(c.label)+'" placeholder="Label">' +
      '<input class="icp-ed-val" value="'+esc(c.value)+'" placeholder="Value">' +
      '<button class="mt-ed-rm">\u00d7</button></div>';
  }).join('');
  var p3 = '<div class="mt-ed-page hidden" id="icp-ed-3">' +
    '<label class="mt-ed-label">Graph Signal</label>' +
    '<textarea class="mt-ed-ta icp-ed-signal" rows="3">' + esc(d.graphSignal||'') + '</textarea>' +
    '<label class="mt-ed-label">Summary Criteria</label>' +
    '<div class="icp-ed-crits">' + critRows + '</div>' +
    '<button class="mt-ed-add" data-t="crit">+ Add criteria</button></div>';

  var body = '<div class="icp-editor">' + header + tabs +
    '<div class="mt-ed-pages">' + p0 + p1 + p2 + p3 + '</div>' +
    '<div class="mt-ed-actions"><button class="mt-ed-save" id="icp-save-v2">Save</button>' +
    '<button class="mt-ed-cancel" id="icp-cancel-v2">Cancel</button></div></div>';
  openViewer({ title: 'Edit \u2014 Ideal Customer Profile', bodyHtml: body,
    afterBind: function(el) { _bindIcpEditorV2(el, d); }
  });
}
