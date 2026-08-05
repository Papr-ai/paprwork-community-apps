// Shared viewer overlay — used by One-Pager, FAQ, and Product Demo
// Consistent: × close icon, Copy MD, Download PDF

var viewerOverlay = null;
var viewerTitle = '';
var viewerMarkdown = '';

function openViewer(opts) {
  viewerTitle = opts.title || '';
  viewerMarkdown = opts.markdown || '';
  viewerOverlay = document.createElement('div');
  viewerOverlay.className = 'vw-overlay';
  document.body.appendChild(viewerOverlay);
  var header = buildViewerHeader(opts);
  viewerOverlay.innerHTML = '<div class="vw-backdrop"></div>' +
    '<div class="vw-card">' + header +
    '<div class="vw-body">' + (opts.bodyHtml || '') + '</div></div>';
  requestAnimationFrame(function() { viewerOverlay.classList.add('open'); });
  bindViewerEvents(opts);
}

function buildViewerHeader(opts) {
  var btns = '';
  if (opts.onEdit) btns += '<button class="vw-act" id="vw-edit" title="Edit">' +
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
    '<span style="margin-left:4px;font-size:12px">Edit</span></button>';
  if (opts.markdown) {
    btns += '<button class="vw-act" id="vw-copy" title="Copy Markdown">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.5"/></svg></button>';
    btns += '<button class="vw-act" id="vw-pdf" title="Download PDF">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v10m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  }
  btns += '<button class="vw-act vw-close" id="vw-close" title="Close">' +
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
  return '<div class="vw-header"><span class="vw-title">' + esc(opts.title || '') +
    '</span><div class="vw-actions">' + btns + '</div></div>';
}

function closeViewer(instant) {
  if (!viewerOverlay) return;
  if (instant) { viewerOverlay.remove(); viewerOverlay = null; return; }
  viewerOverlay.classList.remove('open');
  var el = viewerOverlay; viewerOverlay = null;
  setTimeout(function() { el.remove(); }, 300);
}

function bindViewerEvents(opts) {
  if (!viewerOverlay) return;
  viewerOverlay.querySelector('.vw-backdrop').onclick = closeViewer;
  viewerOverlay.querySelector('#vw-close').onclick = closeViewer;
  var copyBtn = viewerOverlay.querySelector('#vw-copy');
  if (copyBtn) copyBtn.onclick = function() {
    navigator.clipboard.writeText(viewerMarkdown).then(function() {
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#34d399" stroke-width="2" stroke-linecap="round"/></svg>';
      setTimeout(function() { copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.5"/></svg>'; }, 1500);
    });
  };
  var pdfBtn = viewerOverlay.querySelector('#vw-pdf');
  if (pdfBtn) pdfBtn.onclick = function() { generatePDF(viewerTitle, viewerMarkdown); };
  var editBtn = viewerOverlay.querySelector('#vw-edit');
  if (editBtn && opts.onEdit) editBtn.onclick = opts.onEdit;
  if (opts.afterBind) opts.afterBind(viewerOverlay);
}

function generatePDF(title, md) {
  var name = (title || 'doc').replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_');
  var css = 'body{font-family:-apple-system,system-ui,sans-serif;' +
    'max-width:720px;margin:40px auto;padding:24px;color:#1a1a1a;' +
    'line-height:1.7}h1{font-size:24px;border-bottom:2px solid ' +
    '#0161E0;padding-bottom:8px}h2{font-size:18px;color:#0161E0;' +
    'margin-top:24px}h3{font-size:15px;color:#0161E0}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0}' +
    'th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}' +
    'th{background:#f5f5f5;font-weight:600}blockquote{border-left:' +
    '3px solid #0161E0;margin:12px 0;padding:8px 16px;color:#555}';
  var html = '<html><head><title>' + esc(title) + '</title>' +
    '<style>' + css + '</style></head><body>' +
    mdToHtml(md) + '</body></html>';
  navigator.clipboard.writeText(md).then(function() {
    showToast('Copied to clipboard — paste in Pages or Docs');
  }).catch(function() {
    showToast('Download ready');
  });
  var blob = new Blob([html], { type: 'text/html' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 500);
}
function showToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;' +
    'transform:translateX(-50%);background:rgba(0,0,0,.85);' +
    'color:#fff;padding:10px 20px;border-radius:8px;z-index:99999;' +
    'font:13px/1.4 -apple-system,sans-serif;backdrop-filter:blur(8px)';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
}
