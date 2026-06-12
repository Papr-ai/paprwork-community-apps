// Technical Overview — locked for non-whitelisted VCs
// Mirrors memo.js pattern. Gate key: 'tech_overview' in sections_visible.
var techOverviewContent = '';
var techOverviewEditMode = false;

async function loadTechOverview() {
  if (window.ROOM_DATA && window.ROOM_DATA.tech_overview) return window.ROOM_DATA.tech_overview;
  try {
    var rows = await dbQuery("SELECT content FROM tech_overview WHERE id='main'");
    return rows.length ? (rows[0].content || '') : '';
  } catch(e) { return ''; }
}

async function saveTechOverview(content) {
  await dbWrite("UPDATE tech_overview SET content=?, updated_at=strftime('%s','now') WHERE id='main'", [content]);
  techOverviewContent = content;
}

function canAccessTechOverview() {
  // Default-locked. Only opens if 'tech_overview' is whitelisted on the link.
  try {
    var link = window.ROOM_LINK || {};
    var vis = link.sections_visible;
    if (typeof vis === 'string') vis = JSON.parse(vis || '[]');
    if (Array.isArray(vis) && vis.indexOf('tech_overview') !== -1) return true;
  } catch(e) {}
  return false;
}

function openTechOverview(isFounder) {
  loadTechOverview().then(function(content) {
    techOverviewContent = content;
    techOverviewEditMode = false;
    if (isFounder) { renderTechOverviewViewer(true); return; }
    if (canAccessTechOverview()) { renderTechOverviewViewer(false); return; }
    renderTechOverviewLocked();
  });
}

function renderTechOverviewLocked() {
  if (viewerOverlay) closeViewer(true);
  viewerOverlay = document.createElement('div');
  viewerOverlay.className = 'vw-overlay';
  document.body.appendChild(viewerOverlay);
  viewerOverlay.innerHTML = '<div class="vw-backdrop"></div>' +
    '<div class="vw-card memo-locked-card">' +
    '<div class="vw-header"><span class="vw-title">Technical Overview</span>' +
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
    '<h3 class="memo-lock-title">Available on request</h3>' +
    '<p class="memo-lock-desc">This overview details the graph-native embedding architecture, ' +
    'the Caesar selector, and how the system is structurally different from prior art ' +
    '(Palantir, Relational AI, frontier-lab RAG). Shared selectively with technical partners ' +
    'on a quick call so we can walk through the right depth for your fund.</p>' +
    '<div class="memo-lock-preview">' +
    '<div class="memo-blur-line" style="width:90%"></div>' +
    '<div class="memo-blur-line" style="width:75%"></div>' +
    '<div class="memo-blur-line" style="width:85%"></div>' +
    '<div class="memo-blur-line" style="width:60%"></div>' +
    '<div class="memo-blur-line short" style="width:40%"></div>' +
    '<div class="memo-blur-line" style="width:80%"></div>' +
    '<div class="memo-blur-line" style="width:70%"></div></div>' +
    renderLockedCta((window.ROOM_DATA && window.ROOM_DATA.calendly_url) || '', 'Request a technical deep-dive') +
    '</div></div>';
  requestAnimationFrame(function() { viewerOverlay.classList.add('open'); });
  viewerOverlay.querySelector('.vw-backdrop').onclick = closeViewer;
  viewerOverlay.querySelector('#vw-close').onclick = closeViewer;
}
