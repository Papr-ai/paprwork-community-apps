// Competitive Analysis viewer — 2x2 positioning + market map
function openCompAnalysis(isFounder) {
  var d = window.COMP_DATA; if (!d) return;
  var saved = localStorage.getItem('comp_data');
  if (saved) { try { Object.assign(d, JSON.parse(saved)); } catch(e){} }
  var body =
    '<div class="cp-wrap">' +
      '<div class="cp-positioning cp-pos-top">' +
        '<p class="cp-pos-text">' + esc(d.positioning) + '</p>' +
      '</div>' +
      '<div class="cp-tabs" role="tablist">' +
        '<button class="cp-tab cp-tab-active" data-tab="matrix">2x2 Positioning</button>' +
        '<button class="cp-tab" data-tab="map">Market Map</button>' +
      '</div>' +
      '<div class="cp-tab-panel cp-panel-active" data-panel="matrix">' + buildCompMatrix(d) + '</div>' +
      '<div class="cp-tab-panel" data-panel="map">' +
        (window.COMP_MARKET_MAP ? buildMarketMap(window.COMP_MARKET_MAP) : '') +
      '</div>' +
    '</div>';
  var md = '# ' + d.title + '\n\n' + d.positioning + '\n\n## 2x2 \u2014 ' +
    d.axes.x.label + ' \u00d7 ' + d.axes.y.label + '\n\n';
  d.competitors.forEach(function(c) {
    md += '- **' + c.name + '** \u2014 ' + (c.note || '') + '\n';
  });
  openViewer({
    title: d.title,
    bodyHtml: body,
    markdown: md,
    onEdit: isFounder ? function() { openCompEditor(d); } : null,
    afterBind: function(el) { renderCompLogos(el, d); bindCompTabs(el); }
  });
}

function bindCompTabs(el) {
  var tabs = el.querySelectorAll('.cp-tab'), panels = el.querySelectorAll('.cp-tab-panel');
  tabs.forEach(function(t) { t.addEventListener('click', function() {
    var target = t.getAttribute('data-tab');
    tabs.forEach(function(x) { x.classList.toggle('cp-tab-active', x === t); });
    panels.forEach(function(p) { p.classList.toggle('cp-panel-active', p.getAttribute('data-panel') === target); });
  }); });
}

function buildCompMatrix(d) {
  var q = function(pos, idx){ return '<div class="cp-quadrant cp-' + pos + '"><span class="cp-q-label">' + esc(d.quadrants[idx].label) + '</span><span class="cp-q-desc">' + esc(d.quadrants[idx].desc) + '</span></div>'; };
  return '<div class="cp-chart-area"><div class="cp-axis-y-title">' + esc(d.axes.y.label) + '</div>' +
    '<div class="cp-grid"><div class="cp-axis-y"><span>' + esc(d.axes.y.high) + '</span><span>' + esc(d.axes.y.low) + '</span></div>' +
    '<div class="cp-plot" id="cp-plot">' + q('tl',2) + q('tr',3) + q('bl',0) + q('br',1) + '</div>' +
    '<div class="cp-axis-x"><span>' + esc(d.axes.x.low) + '</span><span class="cp-axis-x-title">' + esc(d.axes.x.label) + '</span><span>' + esc(d.axes.x.high) + '</span></div>' +
    '</div></div>';
}

function buildMarketMap(m) {
  var rows = m.rows.map(function(r) {
    var chips = r.items.map(function(it) {
      var cls = 'cp-chip' + (r.papr && /sleep/i.test(it) ? ' cp-chip-hero' : '') + (r.papr ? ' cp-chip-papr' : '');
      return '<span class="' + cls + '">' + esc(it) + '</span>';
    }).join('');
    return '<div class="cp-mm-row' + (r.papr ? ' cp-mm-row-papr' : '') + '">' +
      '<div class="cp-mm-layer">' + esc(r.layer) + '</div>' +
      '<div class="cp-mm-items">' + chips + '</div></div>';
  }).join('');
  return '<div class="cp-mm-wrap">' +
    '<div class="cp-mm-head">' + esc(m.title) + '</div>' +
    '<div class="cp-mm-stack">' + rows + '</div>' +
    '<div class="cp-mm-legend"><span class="cp-mm-swatch"></span>Blue row = where Sleep AI operates</div>' +
  '</div>';
}

function renderCompLogos(el, d) {
  var plot = el.querySelector('#cp-plot'); if (!plot) return;
  var logos = window.COMP_LOGOS || {};
  d.competitors.forEach(function(cp) {
    var dot = document.createElement('div');
    dot.className = 'cp-dot' + (cp.hero ? ' cp-hero' : '');
    dot.style.left = cp.x + '%';
    dot.style.bottom = cp.y + '%';
    if (cp.note) dot.title = cp.note;
    var label = document.createElement('span');
    label.className = 'cp-dot-label';
    label.textContent = cp.name;
    dot.appendChild(label);
    var logoSrc = cp.logo ? logos[cp.logo] : null;
    if (logoSrc) {
      var img = document.createElement('img');
      img.src = logoSrc; img.className = 'cp-dot-logo';
      img.alt = cp.name;
      dot.appendChild(img);
    } else {
      var badge = document.createElement('div');
      badge.className = 'cp-dot-badge';
      badge.textContent = cp.name.charAt(0);
      dot.appendChild(badge);
    }
    plot.appendChild(dot);
  });
}
