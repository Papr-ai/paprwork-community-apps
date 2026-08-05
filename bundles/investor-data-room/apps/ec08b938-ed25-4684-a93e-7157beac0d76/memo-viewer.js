// Investment Memo viewer — unlock + edit mode
function renderMemoViewer(isFounder) {
  if (viewerOverlay) closeViewer(true);
  var bodyHtml = '';
  if (memoEditMode) {
    bodyHtml = '<textarea class="op-editor" id="memo-textarea"' +
      ' placeholder="# Investment Memo&#10;&#10;Write in markdown...">' +
      esc(memoContent) + '</textarea>';
  } else if (!memoContent) {
    bodyHtml = '<div class="memo-empty">' +
      '<div class="memo-empty-title">No investment memo yet</div>' +
      (isFounder ? '<button class="vw-act" id="memo-start"' +
      ' style="width:auto;padding:8px 16px;background:rgba(1,97,224,.12);' +
      'color:#0161E0;border-radius:10px;font-size:14px">Start writing</button>' :
      '<p style="color:var(--text-secondary)">Content coming soon.</p>') + '</div>';
  } else {
    bodyHtml = mdToHtml(memoContent);
  }
  var editFn = isFounder && !memoEditMode
    ? function() { memoEditMode = true; renderMemoViewer(true); } : null;
  openViewer({
    title: memoEditMode ? 'Editing Investment Memo' : 'Investment Memo',
    markdown: memoContent, bodyHtml: bodyHtml, onEdit: editFn,
    afterBind: function(el) {
      var start = el.querySelector('#memo-start');
      if (start) start.onclick = function() {
        memoEditMode = true; renderMemoViewer(true);
      };
      if (memoEditMode) bindMemoEditor(el, isFounder);
    }
  });
}

function bindMemoEditor(el, isFounder) {
  var acts = el.querySelector('.vw-actions');
  if (!acts) return;
  acts.innerHTML =
    '<button class="vw-act" id="memo-save"' +
    ' style="width:auto;padding:6px 14px;background:#0161E0;color:#fff;' +
    'border-radius:8px;font-size:13px;font-weight:500">Save</button>' +
    '<button class="vw-act vw-close" id="vw-close" title="Cancel">' +
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">' +
    '<path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round"/></svg></button>';
  acts.querySelector('#memo-save').onclick = function() {
    var ta = el.querySelector('#memo-textarea');
    if (ta) saveMemo(ta.value).then(function() {
      memoEditMode = false; renderMemoViewer(isFounder);
      toast('Saved');
    });
  };
  acts.querySelector('#vw-close').onclick = function() {
    memoEditMode = false; renderMemoViewer(isFounder);
  };
}
