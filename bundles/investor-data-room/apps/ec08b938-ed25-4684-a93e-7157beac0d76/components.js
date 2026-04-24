function renderHeader(company) {
  var dark = window.COMPANY_LOGO_DARK || '<span style="font-weight:700;font-size:20px">P</span>';
  var light = window.COMPANY_LOGO_LIGHT || '<span style="font-weight:700;font-size:20px;color:#14161a">P</span>';
  return '<header class="header"><div class="header-brand">' +
    '<div class="logo-wrap dark-logo">' + dark + '</div>' +
    '<div class="logo-wrap light-logo">' + light + '</div>' +
    '<span class="header-sep">\u00b7</span>' +
    '<span class="header-label">Data Room</span></div></header>';
}

function renderRaiseBar(raise, isFounder) {
  var target = raise.target_amount || 3000000;
  var raised = raise.raised_amount || 0;
  var committed = raise.committed_amount || 0;
  var pctR = Math.min((raised / target) * 100, 100);
  var pctC = Math.min(((raised + committed) / target) * 100, 100);
  var hidden = raise.hide_from_vc === 1 || raise.hide_from_vc === true;
  var toggleBtn = isFounder
    ? '<button class="raise-vis-toggle" id="raise-vis-btn" title="' + (hidden ? 'Hidden from investors — click to show' : 'Visible to investors — click to hide') + '">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
      + (hidden ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>')
      + '</svg><span>' + (hidden ? 'Hidden from VCs' : 'Visible to VCs') + '</span></button>'
    : '';
  var cls = 'raise-bar glass' + (isFounder && hidden ? ' raise-hidden' : '');
  return '<div class="' + cls + '"><div class="raise-header">' +
    '<span class="raise-label">' + esc(raise.stage || 'Pre-Seed') + ' Round</span>' +
    toggleBtn +
    '<span class="raise-target">Target: ' + fmt(target) + '</span></div>' +
    '<div class="raise-track">' +
    '<div class="raise-fill raised" style="width:' + pctR + '%"></div>' +
    '<div class="raise-fill committed" style="width:' + pctC + '%"></div></div>' +
    '<div class="raise-meta">' +
    '<span class="raise-chip raised-chip">Raised ' + fmt(raised) + '</span>' +
    '<span class="raise-chip committed-chip">Committed ' + fmt(committed) + '</span>' +
    '<span class="raise-chip remaining-chip">Remaining ' + fmt(target - raised - committed) + '</span>' +
    '</div></div>';
}

function renderDocRow(doc, editable) {
  var svg = getDocIcon(doc.name);
  var edit = editable ? '<button class="hover-edit-btn doc-edit" data-id="' + doc.id + '">Edit</button>' : '';
  return '<div class="doc-row"><span class="doc-icon-svg">' + svg + '</span>' +
    '<div class="doc-info"><span class="doc-name">' + esc(doc.name) + '</span>' +
    '<span class="doc-desc">' + esc(doc.description) + '</span></div>' + edit + '</div>';
}
function renderLockedRow(name) {
  var lockIcon = (window.ICONS && window.ICONS.lock) || '';
  return '<div class="doc-row doc-row-locked">' +
    '<span class="doc-icon-svg lock-doc-icon">' + lockIcon + '</span>' +
    '<div class="doc-info"><span class="doc-name blurred-text" aria-label="Hidden">' + esc(name) + '</span>' +
    '<span class="doc-desc">Unlocks after verbal commit</span></div>' +
    '<span class="locked-pill">Locked</span></div>';
}
function renderLockedCta(calUrl, label) {
  var cal = calUrl || window.CALENDLY_URL || '';
  var calIcon = (window.ICONS && window.ICONS.calendar) || '';
  return '<div class="locked-cta-wrap">' +
    '<a href="' + esc(cal) + '" target="_blank" class="locked-cta-btn">' +
    calIcon + '<span>' + esc(label || 'Verbally commit to unlock') + '</span></a>' +
    '<span class="locked-cta-hint">15-min call with the founders to finalize your verbal commitment.</span></div>';
}
function renderLockedSection(section, itemNames, calUrl) {
  var lockIcon = (window.ICONS && window.ICONS.lock_sec) || '';
  var rows = itemNames.map(renderLockedRow).join('');
  var n = itemNames.length;
  return '<div class="section section-locked">' +
    '<div class="section-header"><span class="sec-icon lock-sec-icon">' + lockIcon + '</span>' +
    '<div class="section-header-text">' +
    '<span class="section-label blurred-text" aria-label="Locked section">' + esc(section.label || 'Locked') + '</span>' +
    '<span class="section-desc">' + n + ' item' + (n === 1 ? '' : 's') + ' \u00b7 unlocked post verbal commit</span>' +
    '</div></div>' +
    '<div class="section-docs">' + rows + '</div>' +
    renderLockedCta(calUrl) + '</div>';
}
function renderSectionWithLockedRows(section, visibleDocs, lockedNames, calUrl) {
  var rendered = renderSection(section, visibleDocs, false);
  var locked = lockedNames.map(renderLockedRow).join('') + renderLockedCta(calUrl, 'Verbally commit to unlock');
  // Insert locked rows at end of .section-docs block
  return rendered.replace(/(<div class="section-docs">[\s\S]*?)(<\/div>\s*<\/div>\s*$)/, '$1' + locked + '$2');
}
function renderSection(section, docs, editable) {
  var rows = docs.map(function(d) { return renderDocRow(d, editable); }).join('');
  var addBtn = editable ? '<button class="add-doc-btn" data-section="' + section.id + '">+ Add document</button>' : '';
  var secIcon = getSectionIcon(section.label);
  var iconHtml = secIcon ? '<span class="sec-icon">' + secIcon + '</span>' : '';
  return '<div class="section"><div class="section-header">' +
    iconHtml + '<div class="section-header-text"><span class="section-label">' + esc(section.label) + '</span>' +
    '<span class="section-desc">' + esc(section.description) + '</span></div></div>' +
    '<div class="section-docs">' + rows + '</div>' + addBtn + '</div>';
}
function renderTeamCard(m) {
  var stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('dr-photo-' + m.name.replace(/\s/g, '-')) : null;
  var src = stored || m.photo_url || '';
  var hasPhoto = !!src;
  var photoHTML = hasPhoto
    ? '<img src="' + esc(src) + '" class="team-photo" alt="' + esc(m.name) + '">'
    : '<div class="team-avatar" style="background:linear-gradient(135deg,#0161E0,#0CF)">' +
      m.name.split(' ').map(function(n){return n[0]}).join('') + '</div>';
  var overlayText = hasPhoto ? 'Change' : 'Add photo';
  var links = '';
  if (m.linkedin) links += '<a href="' + esc(m.linkedin) + '" target="_blank" class="team-link">LinkedIn</a>';
  if (m.x_url) links += '<a href="' + esc(m.x_url) + '" target="_blank" class="team-link">\ud835\udd4f</a>';
  return '<div class="team-card glass" style="position:relative">' +
    '<button class="hover-edit-btn team-edit-btn" data-member="' + esc(m.name) + '">Edit</button>' +
    '<div class="team-photo-wrap" data-name="' + esc(m.name) + '">' + photoHTML +
    '<div class="photo-overlay"><span>' + overlayText + '</span></div></div>' +
    '<span class="team-name">' + esc(m.name) + '</span>' +
    '<span class="team-role">' + esc(m.role) + '</span>' +
    '<span class="team-bio">' + esc(m.bio) + '</span>' +
    '<div class="team-links">' + links + '</div></div>';
}

function bindPhotoUploads() {
  document.querySelectorAll('.team-photo-wrap').forEach(function(wrap) {
    wrap.addEventListener('click', function() {
      var name = wrap.dataset.name;
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = function() {
        var file = input.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          var b64 = e.target.result;
          localStorage.setItem('dr-photo-' + name.replace(/\s/g, '-'), b64);
          dbWrite("UPDATE team_members SET photo_url=? WHERE name=?", [b64, name]).catch(function(){});
          renderFounderView(document.getElementById('app'));
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  });
}

// toast and syncPhotosToDb are in utils.js
