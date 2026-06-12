// Founder-only editor for the forwardable intro email template.
// Edits live in window.ROOM_DATA.intro_email_template + intro_email_template DB row.
// Liquid Glass: side-by-side editor (left) + live preview (right).

async function _loadIntroTemplate() {
  var rows = [];
  try { rows = await dbQuery("SELECT subject, body FROM intro_email_template WHERE id=1"); } catch(e) {}
  if (rows && rows.length) return { subject: rows[0].subject||'', body: rows[0].body||'' };
  // Fallback to in-memory ROOM_DATA, then the JS default
  var rd = (window.ROOM_DATA && window.ROOM_DATA.intro_email_template) || null;
  if (rd) return { subject: rd.subject||'', body: rd.body||'' };
  return _DEFAULT_INTRO_TEMPLATE;
}

function _previewTemplate(subject, body) {
  var ctx = {
    connector_first: 'Sam',
    connector_name: 'Sam Hegge',
    vc_first: 'Brett',
    partner_name: 'Brett Berson',
    partner_title: 'Partner at First Round Capital',
    fund: 'First Round Capital',
    why_fund: 'your thesis on agent infra picks below the model layer'
  };
  return {
    subject: _renderTemplate(subject, ctx),
    body: _renderTemplate(body, ctx)
  };
}

async function openIntroTemplateEditor() {
  var t = await _loadIntroTemplate();
  var existing = document.getElementById('intro-tmpl-modal');
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'intro-tmpl-modal';
  m.className = 'vc-em-overlay';
  m.innerHTML =
    '<div class="vc-em-card glass intro-tmpl-card">'+
      '<div class="vc-em-head">'+
        '<div><div class="vc-em-title">Forwardable email template</div>'+
        '<div class="vc-em-sub">Edit the email connectors see when they request an intro. Placeholders: '+
        '<code>{{connector_first}}</code> · <code>{{vc_first}}</code> · <code>{{fund}}</code> · <code>{{why_fund}}</code> · <code>{{partner_name}}</code></div></div>'+
        '<button class="vc-em-x" data-it-close="1">×</button>'+
      '</div>'+
      '<div class="intro-tmpl-grid">'+
        '<div class="intro-tmpl-col">'+
          '<div class="intro-tmpl-pane-label">Edit</div>'+
          '<label class="vc-em-label">Subject</label>'+
          '<input class="vc-em-subject" id="it-subject" value="'+esc(t.subject)+'">'+
          '<label class="vc-em-label" style="margin-top:10px">Body</label>'+
          '<textarea class="vc-em-body it-body" id="it-body">'+esc(t.body)+'</textarea>'+
        '</div>'+
        '<div class="intro-tmpl-col">'+
          '<div class="intro-tmpl-pane-label">Preview · Sam Hegge → Brett Berson @ First Round</div>'+
          '<label class="vc-em-label">Subject</label>'+
          '<input class="vc-em-subject" id="it-subject-preview" readonly>'+
          '<label class="vc-em-label" style="margin-top:10px">Body</label>'+
          '<textarea class="vc-em-body it-body" id="it-body-preview" readonly></textarea>'+
        '</div>'+
      '</div>'+
      '<div class="vc-em-actions" style="justify-content:space-between">'+
        '<button class="btn-sm glass" id="it-reset" title="Restore default text">Reset to default</button>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
          '<span id="it-status" style="font-size:11px;color:rgba(255,255,255,.55)"></span>'+
          '<button class="btn-sm glass" data-it-close="1">Cancel</button>'+
          '<button class="btn-sm btn-primary" id="it-save">Save</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(m);

  var subjI = document.getElementById('it-subject');
  var bodyI = document.getElementById('it-body');
  var subjP = document.getElementById('it-subject-preview');
  var bodyP = document.getElementById('it-body-preview');
  var status = document.getElementById('it-status');
  function refresh(){
    var p = _previewTemplate(subjI.value, bodyI.value);
    subjP.value = p.subject;
    bodyP.value = p.body;
  }
  subjI.addEventListener('input', refresh);
  bodyI.addEventListener('input', refresh);
  refresh();

  document.getElementById('it-reset').onclick = function(){
    if (!confirm('Reset subject and body to the default template?')) return;
    subjI.value = _DEFAULT_INTRO_TEMPLATE.subject;
    bodyI.value = _DEFAULT_INTRO_TEMPLATE.body;
    refresh();
  };

  document.getElementById('it-save').onclick = async function(){
    var subj = subjI.value;
    var body = bodyI.value;
    if (!subj.trim() || !body.trim()) { status.textContent = 'Subject and body required'; return; }
    status.textContent = 'Saving…';
    try {
      await dbWrite(
        "INSERT INTO intro_email_template (id, subject, body, updated_at) VALUES (1, ?, ?, datetime('now')) "+
        "ON CONFLICT(id) DO UPDATE SET subject=excluded.subject, body=excluded.body, updated_at=datetime('now')",
        [subj, body]
      );
      // Update in-memory copy so Send-intro modal reflects right away
      window.ROOM_DATA = window.ROOM_DATA || {};
      window.ROOM_DATA.intro_email_template = { subject: subj, body: body };
      status.textContent = 'Saved · Publish to push to Vercel';
      if (typeof toast === 'function') toast('Template saved — Publish to push to Vercel');
      setTimeout(function(){ var em = document.getElementById('intro-tmpl-modal'); if (em) em.remove(); }, 700);
    } catch (err) {
      status.textContent = 'Save failed: ' + (err.message || err);
    }
  };

  document.querySelectorAll('#intro-tmpl-modal [data-it-close]').forEach(function(b){
    b.onclick = function(){ var em = document.getElementById('intro-tmpl-modal'); if (em) em.remove(); };
  });
  m.addEventListener('click', function(e){ if (e.target === m) m.remove(); });
}
window.openIntroTemplateEditor = openIntroTemplateEditor;
