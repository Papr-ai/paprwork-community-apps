// Moat & Long-Term Defensibility viewer — 2 tabs
function openMoat(isFounder) {
  var d = window.MOAT_DATA; if (!d) return;
  var saved = localStorage.getItem('moat_data_v2');
  if (saved) { try { Object.assign(d, JSON.parse(saved)); } catch(e){} }
  var tabs = '<div class="mt-tabs">' +
    '<span class="mt-tab active" data-pg="0">Customer Use-Cases</span>' +
    '<span class="mt-tab" data-pg="1">Data Flywheel</span></div>';
  // Page 1 — Customer Use-Cases (Fintech + Commerce vertical panels)
  var p1 = '<div class="mt-page" id="mt-pg-0">' +
    '<p class="mt-headline">' + esc(d.headline).replace(/\n/g,'<br>') + '</p>' +
    '<p class="mt-thesis">' + esc(d.thesis) + '</p>' +
    buildCustomerUseCases(d.verticals) + '</div>';
  // Page 2 — Data Flywheel + Moat Layers combined
  var p2 = '<div class="mt-page hidden" id="mt-pg-1">' +
    '<p class="mt-headline mt-headline-center">' + esc(d.headline).replace(/\n/g,'<br>') + '</p>' +
    '<p class="mt-thesis mt-thesis-center">' + esc(d.thesis) + '</p>' +
    buildFlywheel(d.flywheel) +
    '<div class="mt-divider"></div>' +
    buildMoatLayers(d.layers) + '</div>';
  var body = '<div class="mt-wrap">' + tabs +
    '<div class="mt-pages">' + p1 + p2 + '</div></div>';
  openViewer({
    title: d.title,
    bodyHtml: body,
    markdown: buildMoatMarkdown(d),
    onEdit: isFounder ? function() { openMoatEditor(d); } : null
  });
  setTimeout(function() { initMoatTabs(); renderMoatVisuals(); }, 50);
}
