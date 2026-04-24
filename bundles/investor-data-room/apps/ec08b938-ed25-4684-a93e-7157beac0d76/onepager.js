// One-pager — uses shared viewer overlay
var opContent = '';
var opEditMode = false;
var _opTableReady = false;

async function ensureOnePagerTable() {
  if (_opTableReady) return;
  try {
    await dbWrite("CREATE TABLE IF NOT EXISTS one_pager (id TEXT PRIMARY KEY, content TEXT, updated_at INTEGER)");
  } catch(e) { /* table likely already exists — safe to continue */ }
  _opTableReady = true;
}

async function loadOnePager() {
  var dbContent = null;
  var dbTime = 0;
  try {
    await ensureOnePagerTable();
    var rows = await dbQuery("SELECT content, updated_at FROM one_pager WHERE id='main'");
    if (rows.length && rows[0].content) {
      dbContent = rows[0].content;
      dbTime = rows[0].updated_at || 0;
    }
  } catch(e) { console.warn('loadOnePager DB error:', e); }
  // Check localStorage — may have newer unsaved content
  var ls = localStorage.getItem('dr-one-pager');
  var lsTime = parseInt(localStorage.getItem('dr-one-pager-ts') || '0', 10);
  // Use whichever is newer (fixes: DB save failed but localStorage has edit)
  if (dbContent && dbTime >= lsTime) {
    localStorage.setItem('dr-one-pager', dbContent);
    localStorage.setItem('dr-one-pager-ts', String(dbTime));
    return dbContent;
  }
  if (ls && lsTime > dbTime) return ls;
  if (dbContent) return dbContent;
  if (ls) return ls;
  return window.ROOM_DATA && window.ROOM_DATA.one_pager || '';
}

async function saveOnePager(content) {
  // Save to localStorage FIRST with timestamp as reliable backup
  var nowTs = Math.floor(Date.now() / 1000);
  localStorage.setItem('dr-one-pager', content);
  localStorage.setItem('dr-one-pager-ts', String(nowTs));
  opContent = content;
  if (window.ROOM_DATA) window.ROOM_DATA.one_pager = content;
  // Then persist to DB with retry (SQLite can be locked by other jobs)
  await ensureOnePagerTable();
  var maxRetries = 5;
  var lastErr = null;
  for (var attempt = 0; attempt < maxRetries; attempt++) {
    try {
      var res = await dbWrite(
        "INSERT OR REPLACE INTO one_pager (id, content, updated_at) VALUES ('main', ?, ?)",
        [content, nowTs]
      );
      if (res && res.error) throw new Error(res.error);
      return; // success — DB and localStorage both saved
    } catch(e) {
      lastErr = e;
      if (attempt < maxRetries - 1) {
        await new Promise(function(r) { setTimeout(r, 500 * (attempt + 1)); });
      }
    }
  }
  // DB save failed — throw so UI shows error (content safe in localStorage)
  console.warn('DB save failed after retries, content safe in localStorage:', lastErr);
  throw new Error('Saved locally but DB write failed — your edit is safe and will persist on next save');
}

function openOnePager(isFounder) {
  loadOnePager().then(function(content) {
    opContent = content;
    opEditMode = false;
    renderOnePagerViewer(isFounder);
  });
}

function renderOnePagerViewer(isFounder) {
  if (viewerOverlay) closeViewer(true);
  var bodyHtml = '';
  if (opEditMode) {
    bodyHtml = '<textarea class="op-editor" id="op-textarea" placeholder="# Papr One-Pager&#10;&#10;Write in markdown...">' +
      esc(opContent) + '</textarea>';
  } else if (!opContent) {
    bodyHtml = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary,rgba(255,255,255,.4))">' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:8px">No one-pager yet</div>' +
      (isFounder ? '<button class="vw-act" id="op-start" style="width:auto;padding:8px 16px;background:rgba(1,97,224,.12);color:#0161E0;border-radius:10px;font-size:14px">Start writing</button>' : '') + '</div>';
  } else {
    bodyHtml = mdToHtml(opContent);
  }
  var editFn = null;
  if (isFounder && !opEditMode) {
    editFn = function() { opEditMode = true; renderOnePagerViewer(isFounder); };
  }
  openViewer({
    title: opEditMode ? 'Editing One-Pager' : 'One-Pager',
    markdown: opContent,
    bodyHtml: bodyHtml,
    onEdit: editFn,
    afterBind: function(el) {
      var start = el.querySelector('#op-start');
      if (start) start.onclick = function() { opEditMode = true; renderOnePagerViewer(isFounder); };
      // Intercept deep-problem-definition links → download rubric
      if (!opEditMode) bindRubricLinks(el);
      if (opEditMode) {
        var acts = el.querySelector('.vw-actions');
        if (acts) {
          acts.innerHTML = '<button class="vw-act" id="op-save" style="width:auto;padding:6px 14px;background:#0161E0;color:#fff;border-radius:8px;font-size:13px;font-weight:500">Save</button>' +
            '<button class="vw-act vw-close" id="vw-close" title="Cancel"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
          acts.querySelector('#op-save').onclick = function() {
            var ta = el.querySelector('#op-textarea');
            if (!ta) return;
            var btn = acts.querySelector('#op-save');
            btn.textContent = 'Saving…';
            btn.style.opacity = '0.6';
            saveOnePager(ta.value).then(function() {
              opEditMode = false;
              renderOnePagerViewer(isFounder);
              toast('Saved ✓');
            }).catch(function(err) {
              // Content is safe in localStorage even if DB failed
              opEditMode = false;
              renderOnePagerViewer(isFounder);
              toast('Saved locally ✓ (will sync to DB on next save)');
            });
          };
          acts.querySelector('#vw-close').onclick = function() {
            opEditMode = false; renderOnePagerViewer(isFounder);
          };
        }
      }
    }
  });
}
