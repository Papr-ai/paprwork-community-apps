// Moat editor — tabbed layout matching the viewer design
function openMoatEditor(d) {
  closeViewer(true);
  var tabs = '<div class="mt-tabs">' +
    '<span class="mt-tab active" data-ed="0">Data Flywheel</span>' +
    '<span class="mt-tab" data-ed="1">Moat Layers</span>' +
    '<span class="mt-tab" data-ed="2">Why They Can\'t Copy</span></div>';
  // Shared headline + thesis at top
  var header = '<div class="mt-ed-header">' +
    '<label class="mt-ed-label">Headline</label>' +
    '<textarea class="mt-ed-ta mt-ed-hl" rows="2">' + esc(d.headline) + '</textarea>' +
    '<label class="mt-ed-label">Thesis</label>' +
    '<textarea class="mt-ed-ta mt-ed-thesis" rows="3">' + esc(d.thesis) + '</textarea></div>';
  // Page 1: Flywheel steps
  var flyRows = (d.flywheel || []).map(function(s, i) {
    return _flyEditRow(s, i);
  }).join('');
  var p1 = '<div class="mt-ed-page" id="mt-ed-0">' +
    '<div class="mt-ed-flys">' + flyRows + '</div>' +
    '<button class="mt-ed-add" data-t="fly">+ Add step</button></div>';
  // Page 2: Moat layers
  var layerRows = (d.layers || []).map(function(l, i) {
    return _layerEditRow(l, i);
  }).join('');
  var p2 = '<div class="mt-ed-page hidden" id="mt-ed-1">' +
    '<div class="mt-ed-layers">' + layerRows + '</div>' +
    '<button class="mt-ed-add" data-t="layer">+ Add layer</button></div>';
  // Page 3: Competitors
  var compRows = (d.competitors || []).map(function(c, i) {
    return _compEditRow(c, i);
  }).join('');
  var p3 = '<div class="mt-ed-page hidden" id="mt-ed-2">' +
    '<div class="mt-ed-comps">' + compRows + '</div>' +
    '<button class="mt-ed-add" data-t="comp">+ Add competitor</button></div>';
  var body = '<div class="mt-ed-wrap">' + header + tabs +
    '<div class="mt-ed-pages">' + p1 + p2 + p3 + '</div>' +
    '<div class="mt-ed-actions">' +
    '<button class="mt-ed-save">Save</button>' +
    '<button class="mt-ed-cancel">Cancel</button></div></div>';
  openViewer({ title: 'Edit — Moat & Defensibility', bodyHtml: body,
    afterBind: function(el) { bindMoatEditorV2(el, d); _bindEditorTabs(el); }
  });
}

function _flyEditRow(s, i) {
  return '<div class="mt-fly-step glass mt-ed-row-card" data-i="' + i + '">' +
    '<input class="mt-ed-tq mt-fly-num-ed" value="' + esc(s.num) + '" placeholder="77.3K">' +
    '<input class="mt-ed-tq mt-fly-name-ed" value="' + esc(s.step) + '" placeholder="Step name">' +
    '<input class="mt-ed-tq" value="' + esc(s.desc) + '" placeholder="Description">' +
    '<input class="mt-ed-tq" value="' + esc(s.unit) + '" placeholder="Unit">' +
    '<button class="mt-ed-rm">&times;</button></div>';
}

function _layerEditRow(l, i) {
  return '<div class="mt-layer glass mt-ed-row-card" data-i="' + i + '">' +
    '<input class="mt-ed-tq mt-layer-name-ed" value="' + esc(l.name) + '" placeholder="Layer name">' +
    '<textarea class="mt-ed-ta" rows="2" placeholder="What">' + esc(l.what) + '</textarea>' +
    '<textarea class="mt-ed-ta" rows="2" placeholder="Why it compounds">' + esc(l.why) + '</textarea>' +
    '<button class="mt-ed-rm">&times;</button></div>';
}

function _compEditRow(c, i) {
  return '<div class="mt-gap glass mt-ed-row-card" data-i="' + i + '">' +
    '<input class="mt-ed-tq mt-gap-who-ed" value="' + esc(c.who) + '" placeholder="Competitor">' +
    '<input class="mt-ed-tq" value="' + esc(c.gap) + '" placeholder="Structural gap">' +
    '<button class="mt-ed-rm">&times;</button></div>';
}

function _bindEditorTabs(el) {
  el.querySelectorAll('.mt-tabs .mt-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      el.querySelectorAll('.mt-tabs .mt-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      el.querySelectorAll('.mt-ed-page').forEach(function(p) { p.classList.add('hidden'); });
      var target = el.querySelector('#mt-ed-' + tab.dataset.ed);
      if (target) target.classList.remove('hidden');
    });
  });
}
