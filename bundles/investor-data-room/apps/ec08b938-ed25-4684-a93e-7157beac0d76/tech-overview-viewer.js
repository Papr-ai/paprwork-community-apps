// Technical Overview viewer — unlock + edit mode (mirrors memo-viewer.js)
function renderTechOverviewViewer(isFounder) {
  if (viewerOverlay) closeViewer(true);
  var bodyHtml = '';
  if (techOverviewEditMode) {
    bodyHtml = '<textarea class="op-editor" id="tech-overview-textarea"' +
      ' placeholder="# Technical Overview&#10;&#10;Write in markdown...">' +
      esc(techOverviewContent) + '</textarea>';
  } else if (!techOverviewContent) {
    bodyHtml = '<div class="memo-empty">' +
      '<div class="memo-empty-title">No technical overview yet</div>' +
      (isFounder ? '<button class="vw-act" id="tech-overview-start"' +
      ' style="width:auto;padding:8px 16px;background:rgba(1,97,224,.12);' +
      'color:#0161E0;border-radius:10px;font-size:14px">Start writing</button>' :
      '<p style="color:var(--text-secondary)">Content coming soon.</p>') + '</div>';
  } else {
    bodyHtml = mdToHtml(techOverviewContent);
  }
  var editFn = isFounder && !techOverviewEditMode
    ? function() { techOverviewEditMode = true; renderTechOverviewViewer(true); } : null;
  openViewer({
    title: techOverviewEditMode ? 'Editing Technical Overview' : 'Technical Overview',
    markdown: techOverviewContent, bodyHtml: bodyHtml, onEdit: editFn,
    afterBind: function(el) {
      var start = el.querySelector('#tech-overview-start');
      if (start) start.onclick = function() {
        techOverviewEditMode = true; renderTechOverviewViewer(true);
      };
      if (techOverviewEditMode) bindTechOverviewEditor(el, isFounder);
    }
  });
}

function bindTechOverviewEditor(el, isFounder) {
  var acts = el.querySelector('.vw-actions');
  if (!acts) return;
  acts.innerHTML =
    '<button class="vw-act" id="tech-overview-save"' +
    ' style="width:auto;padding:6px 14px;background:#0161E0;color:#fff;' +
    'border-radius:8px;font-size:13px;font-weight:500">Save</button>' +
    '<button class="vw-act vw-close" id="vw-close" title="Cancel">' +
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">' +
    '<path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round"/></svg></button>';
  acts.querySelector('#tech-overview-save').onclick = function() {
    var ta = el.querySelector('#tech-overview-textarea');
    if (ta) saveTechOverview(ta.value).then(function() {
      techOverviewEditMode = false; renderTechOverviewViewer(isFounder);
      toast('Saved');
    });
  };
  acts.querySelector('#vw-close').onclick = function() {
    techOverviewEditMode = false; renderTechOverviewViewer(isFounder);
  };
}
