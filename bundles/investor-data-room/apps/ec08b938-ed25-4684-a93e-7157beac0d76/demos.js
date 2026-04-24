// Demo viewer — text tabs using shared viewer overlay
var demoIdx = 0;
var demoData = [];

function demosToMarkdown(demos) {
  return demos.map(function(d) {
    var md = '## ' + d.title + '\n*' + d.subtitle + '*\n\n' + d.description + '\n\n';
    var meta = d.benchmark_data ? JSON.parse(d.benchmark_data) : {};
    if (meta.benchmarks) meta.benchmarks.forEach(function(b) {
      md += '- **' + b.name + '**: Papr ' + b.papr + '% vs Baseline ' + b.baseline + '% (' + b.metric + ')\n';
    });
    if (meta.features) meta.features.forEach(function(f) { md += '- **' + f.title + '**: ' + f.desc + '\n'; });
    if (meta.capabilities) meta.capabilities.forEach(function(c) { md += '- **' + c.title + '**: ' + c.desc + '\n'; });
    return md;
  }).join('\n---\n\n');
}

function openDemoViewer(demos) {
  demoData = demos; demoIdx = 0;
  renderDemoInViewer();
}

function renderDemoInViewer() {
  if (viewerOverlay) closeViewer(true);
  var d = demoData[demoIdx];
  var meta = d.benchmark_data ? JSON.parse(d.benchmark_data) : {};
  var content = '';
  var isCtxIntel = (d.id === 'ctx-intel');
  if (isCtxIntel) content = renderCtxIntelViz();
  else if (meta.benchmarks) content = renderBenchmarks(meta);
  else if (meta.features) content = renderFeatures(meta.features);
  else if (meta.capabilities) content = renderFeatures(meta.capabilities);
  // Text tabs instead of circle dots
  var tabs = '<div class="demo-tabs">' + demoData.map(function(item, i) {
    var label = item.title.length > 20 ? item.title.substring(0,18) + '...' : item.title;
    return '<span class="demo-tab' + (i === demoIdx ? ' active' : '') + '" data-di="' + i + '">' + esc(label) + '</span>';
  }).join('') + '</div>';
  var body = tabs +
    '<div class="demo-sub">' + esc(d.subtitle) + '</div>' +
    '<h2 class="demo-ttl">' + esc(d.title) + '</h2>' +
    '<p class="demo-desc">' + esc(d.description) + '</p>' +
    (d.video_url ? renderVideoEmbed(d.video_url) : '') + content;
  openViewer({
    title: 'Product Demo',
    markdown: demosToMarkdown(demoData),
    bodyHtml: body,
    afterBind: function(el) { bindDemoNav(el); if (isCtxIntel) bindCtxViz(el); }
  });
}

function bindDemoNav(el) {
  el.querySelectorAll('.demo-tab').forEach(function(tab) {
    tab.onclick = function() { demoIdx = parseInt(tab.dataset.di); renderDemoInViewer(); };
  });
}

function renderVideoEmbed(url) {
  var id = '';
  if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
  else if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
  if (!id) return '';
  return '<div class="demo-video"><iframe src="https://www.youtube.com/embed/' + id +
    '?rel=0&modestbranding=1" allowfullscreen></iframe></div>';
}

function renderBenchmarks(meta) {
  var bars = meta.benchmarks.map(function(b) {
    return '<div class="bench-row"><div class="bench-hdr"><span class="bench-name">' + esc(b.name) +
      '</span><span class="bench-met">' + esc(b.metric) + '</span></div>' +
      '<div class="bench-label">' + esc(b.label) + '</div>' +
      '<div class="bench-bars">' +
      '<div class="bb-wrap"><div class="bb baseline" style="width:' + b.baseline + '%"></div><span class="bb-val">' + b.baseline + '%</span></div>' +
      '<div class="bb-wrap"><div class="bb papr" style="width:' + b.papr + '%"></div><span class="bb-val pv">' + b.papr + '%</span></div>' +
      '</div></div>';
  }).join('');
  var legend = '<div class="bench-leg"><span><span class="bl-dot base"></span>Baseline</span>' +
    '<span><span class="bl-dot lgp"></span>Papr SCE</span></div>';
  var insight = meta.key_insight ? '<div class="bench-ins">' + esc(meta.key_insight) + '</div>' : '';
  return legend + bars + insight;
}

function renderFeatures(items) {
  return '<div class="demo-feats">' + items.map(function(f) {
    return '<div class="demo-feat"><div class="df-title">' + esc(f.title) + '</div>' +
      '<div class="df-desc">' + esc(f.desc) + '</div></div>';
  }).join('') + '</div>';
}
