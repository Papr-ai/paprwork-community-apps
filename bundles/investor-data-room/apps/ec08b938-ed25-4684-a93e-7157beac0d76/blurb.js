// Company blurb — loaded from DB, editable in founder mode
var PAPR_BLURB = '';
var _blurbLoaded = false;

async function loadBlurb() {
  if (_blurbLoaded) return PAPR_BLURB;
  try {
    var rows = await dbQuery("SELECT value FROM settings WHERE key='blurb'");
    if (rows.length && rows[0].value) PAPR_BLURB = rows[0].value;
  } catch(e) {}
  if (!PAPR_BLURB && window.ROOM_DATA && window.ROOM_DATA.blurb) PAPR_BLURB = window.ROOM_DATA.blurb;
  _blurbLoaded = true;
  return PAPR_BLURB;
}

function renderBlurbCard(isFounder) {
  var copyIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">'
    + '<rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>'
    + '<path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" '
    + 'stroke="currentColor" stroke-width="1.5"/></svg>';
  var editBtn = isFounder ? '<button class="btn-sm glass blurb-edit" id="edit-blurb" title="Edit blurb">'
    + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">'
    + '<path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.5"/></svg> Edit</button>' : '';
  return '<div class="blurb-card glass" id="blurb-container">'
    + '<div class="blurb-header">'
    + '<span class="section-label">Company Blurb</span>'
    + '<div class="blurb-actions">' + editBtn
    + '<button class="btn-sm glass blurb-copy" id="copy-blurb" title="Copy blurb">'
    + copyIcon + ' Copy</button></div></div>'
    + '<p class="blurb-text" id="blurb-display">' + esc(PAPR_BLURB) + '</p></div>';
}

function bindBlurbEvents(el, isFounder) {
  // Copy button
  var btn = el.querySelector('#copy-blurb');
  if (btn) btn.addEventListener('click', function() {
    navigator.clipboard.writeText(PAPR_BLURB).then(function() {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">'
        + '<path d="M3 8l3 3 7-7" stroke="#34d399" stroke-width="2" stroke-linecap="round"/></svg> Copied';
      setTimeout(function() { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">'
        + '<rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>'
        + '<path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" '
        + 'stroke="currentColor" stroke-width="1.5"/></svg> Copy'; }, 2000);
    });
  });
  // Edit button (founder only)
  if (isFounder) {
    var editBtn = el.querySelector('#edit-blurb');
    if (editBtn) editBtn.addEventListener('click', function() { openBlurbEditor(el); });
  }
}

function openBlurbEditor(el) {
  var container = el.querySelector('#blurb-container');
  if (!container) return;
  var display = container.querySelector('#blurb-display');
  if (!display) return;
  display.style.display = 'none';
  // Remove existing editor if any
  var old = container.querySelector('.blurb-editor');
  if (old) old.remove();
  var editor = document.createElement('div');
  editor.className = 'blurb-editor';
  editor.innerHTML = '<textarea class="blurb-textarea" id="blurb-input">' + esc(PAPR_BLURB) + '</textarea>'
    + '<div class="blurb-ed-actions">'
    + '<button class="btn-sm glass" id="blurb-cancel">Cancel</button>'
    + '<button class="btn-primary-sm" id="blurb-save">Save</button></div>';
  container.appendChild(editor);
  var textarea = editor.querySelector('#blurb-input');
  textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
  textarea.focus();
  editor.querySelector('#blurb-cancel').addEventListener('click', function() {
    editor.remove(); display.style.display = '';
  });
  editor.querySelector('#blurb-save').addEventListener('click', async function() {
    var newBlurb = textarea.value.trim();
    if (!newBlurb) return;
    try {
      await dbWrite("INSERT OR REPLACE INTO settings (key, value) VALUES ('blurb', ?)", [newBlurb]);
      PAPR_BLURB = newBlurb;
      display.textContent = newBlurb;
      // Update all blurb displays on page
      document.querySelectorAll('#blurb-display').forEach(function(d) { d.textContent = newBlurb; });
      editor.remove(); display.style.display = '';
    } catch(e) { alert('Save failed: ' + e.message); }
  });
}
