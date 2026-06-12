// Legal Documentation — subsection rows in the section, full-page overlay on click
// Uses same .dk-overlay pattern as the pitch deck viewer

function legalSubs(sections) {
  return (sections || []).filter(function(s){ return s.parent_id === 'legal'; })
    .sort(function(a,b){ return (a.sort_order||0)-(b.sort_order||0); });
}
function legalDocsIn(subId, allDocs) {
  return (allDocs || []).filter(function(d){ return d.section_id === subId; })
    .sort(function(a,b){ return (a.sort_order||0)-(b.sort_order||0); });
}
function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(0) + ' KB';
  return (n/(1024*1024)).toFixed(1) + ' MB';
}

// Subsection row in the Legal section card — left-aligned, same .doc-row
function renderSubRow(sub, count) {
  var icon = getSubsectionIcon(sub.id);
  var meta = count + (count === 1 ? ' document' : ' documents');
  return '<div class="doc-row lgl-sub-row" data-sub="' + sub.id + '" onclick="handleLegalSubClick(\'' + sub.id + '\')">' +
    '<span class="doc-icon-svg">' + icon + '</span>' +
    '<div class="doc-info">' +
      '<span class="doc-name">' + esc(sub.label) + '</span>' +
      '<span class="doc-desc">' + esc(sub.description || '') + ' · ' + meta + '</span>' +
    '</div>' +
    '<span class="lgl-chev">' + (window.ICONS.chevron_right||'') + '</span>' +
  '</div>';
}

// Legal section card — renders in the main page alongside other sections
function renderLegalSection(section, allDocs, sections, editable) {
  // Cache for click handlers — zero async needed on click
  window._lglSections = sections;
  window._lglAllDocs = allDocs;
  var subs = legalSubs(sections);
  var icon = getSectionIcon(section.label);
  var iconHtml = icon ? '<span class="sec-icon">' + icon + '</span>' : '';
  var rows = subs.map(function(s) {
    return renderSubRow(s, legalDocsIn(s.id, allDocs).length);
  }).join('');
  var addBtn = editable
    ? '<button class="add-doc-btn lgl-add-sub">+ Add section</button>' : '';
  return '<div class="section" data-section="legal">' +
    '<div class="section-header">' + iconHtml +
      '<div class="section-header-text">' +
        '<span class="section-label">' + esc(section.label) + '</span>' +
        '<span class="section-desc">' + esc(section.description||'') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="section-docs">' + rows + '</div>' +
    addBtn +
  '</div>';
}

// File row for inside the overlay
function renderLglFileRow(d, editable) {
  var icon = getFileIcon(d.mime_type || d.name);
  var sz = d.file_size ? '<span class="lgl-fsize">' + fmtBytes(d.file_size) + '</span>' : '';
  var actionIcon = editable ? (window.ICONS.dots_horizontal||'') : (window.ICONS.download_arrow||'');
  var cls = editable ? 'lgl-file-menu' : 'lgl-file-dl';
  return '<div class="doc-row lgl-file-row" data-doc="' + d.id + '" data-name="' + esc(d.name) + '">' +
    '<span class="doc-icon-svg">' + icon + '</span>' +
    '<div class="doc-info">' +
      '<span class="doc-name">' + esc(d.name) + '</span>' +
      (d.description ? '<span class="doc-desc">' + esc(d.description) + '</span>' : '') +
    '</div>' + sz +
    '<button class="' + cls + '" data-doc="' + d.id + '">' + actionIcon + '</button>' +
  '</div>';
}

// Full-page overlay — same pattern as dk-overlay (pitch deck viewer)
function openLegalSubOverlay(sub, allDocs, editable, refreshParent) {
  closeLegalOverlay();
  var docs = legalDocsIn(sub.id, allDocs);
  var rows = docs.map(function(d){ return renderLglFileRow(d, editable); }).join('');
  var empty = !docs.length
    ? '<p class="lgl-ov-empty">' + (editable ? 'No documents yet. Upload files below.' : 'No documents in this section yet.') + '</p>'
    : '';
  var upload = editable
    ? '<label class="add-doc-btn lgl-upload-label" for="lgl-up-' + sub.id + '">' +
        '+ Upload document' +
        '<input type="file" id="lgl-up-' + sub.id + '" class="lgl-upload-input" data-sub="' + sub.id + '" multiple hidden>' +
      '</label>' : '';
  var o = document.createElement('div');
  o.className = 'lgl-overlay';
  o.innerHTML =
    '<div class="lgl-ov-header">' +
      '<button class="lgl-ov-back">' + (window.ICONS.chevron_left||'') + ' Back</button>' +
      '<span class="lgl-ov-title">' + esc(sub.label) + '</span>' +
      '<button class="lgl-ov-close">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="lgl-ov-body">' +
      '<div class="lgl-ov-icon">' + getSubsectionIcon(sub.id) + '</div>' +
      '<h2 class="lgl-ov-heading">' + esc(sub.label) + '</h2>' +
      '<p class="lgl-ov-desc">' + esc(sub.description||'') + '</p>' +
      '<div class="lgl-ov-files">' + rows + empty + '</div>' +
      upload +
    '</div>';
  document.body.appendChild(o);
  window._lglOverlay = o;
  requestAnimationFrame(function(){ o.classList.add('open'); });
  // Bind events inside overlay
  _bindOverlayEvents(o, sub, allDocs, editable, refreshParent);
}

function closeLegalOverlay() {
  if (window._lglOverlay) {
    window._lglOverlay.remove();
    window._lglOverlay = null;
  }
}
