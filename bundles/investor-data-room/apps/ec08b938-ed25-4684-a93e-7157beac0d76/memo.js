// Investment Memo — locked for non-verbal-commit VCs
var memoContent = '';
var memoEditMode = false;

async function loadMemo() {
  if (window.ROOM_DATA && window.ROOM_DATA.investment_memo) return window.ROOM_DATA.investment_memo;
  try {
    var rows = await dbQuery("SELECT content FROM investment_memo WHERE id='main'");
    return rows.length ? (rows[0].content || '') : '';
  } catch(e) { return ''; }
}

async function saveMemo(content) {
  await dbWrite("UPDATE investment_memo SET content=?, updated_at=strftime('%s','now') WHERE id='main'", [content]);
  memoContent = content;
}

function canAccessMemo(stage) {
  return stage === 'verbal_commit' || stage === 'closed';
}

function openMemo(isFounder, stage) {
  loadMemo().then(function(content) {
    memoContent = content;
    memoEditMode = false;
    if (isFounder) { renderMemoViewer(true); return; }
    if (canAccessMemo(stage)) { renderMemoViewer(false); return; }
    renderMemoLocked(stage);
  });
}

function renderMemoLocked() {
  if (viewerOverlay) closeViewer(true);
  viewerOverlay = document.createElement('div');
  viewerOverlay.className = 'vw-overlay';
  document.body.appendChild(viewerOverlay);
  viewerOverlay.innerHTML = '<div class="vw-backdrop"></div>' +
    '<div class="vw-card memo-locked-card">' +
    '<div class="vw-header"><span class="vw-title">Investment Memo</span>' +
    '<div class="vw-actions"><button class="vw-act vw-close" id="vw-close" title="Close">' +
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">' +
    '<path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg></button></div></div>' +
    '<div class="vw-body memo-locked-body">' +
    '<div class="memo-lock-icon">' +
    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none">' +
    '<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg></div>' +
    '<h3 class="memo-lock-title">Available after verbal commit</h3>' +
    '<p class="memo-lock-desc">This memo contains our detailed investment thesis, ' +
    'unit economics deep-dive, and strategic roadmap. ' +
    'It unlocks once you have verbally committed to the round.</p>' +
    '<div class="memo-lock-preview">' +
    '<div class="memo-blur-line" style="width:90%"></div>' +
    '<div class="memo-blur-line" style="width:75%"></div>' +
    '<div class="memo-blur-line" style="width:85%"></div>' +
    '<div class="memo-blur-line" style="width:60%"></div>' +
    '<div class="memo-blur-line short" style="width:40%"></div>' +
    '<div class="memo-blur-line" style="width:80%"></div>' +
    '<div class="memo-blur-line" style="width:70%"></div></div></div></div>';
  requestAnimationFrame(function() { viewerOverlay.classList.add('open'); });
  viewerOverlay.querySelector('.vw-backdrop').onclick = closeViewer;
  viewerOverlay.querySelector('#vw-close').onclick = closeViewer;
}
