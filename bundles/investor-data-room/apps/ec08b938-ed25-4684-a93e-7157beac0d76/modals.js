async function showRaiseModal(raise) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal glass">
    <h3>Edit Raise</h3>
    <label>Target<input type="number" id="m-target" value="${raise.target_amount || 3000000}"></label>
    <label>Raised<input type="number" id="m-raised" value="${raise.raised_amount || 0}"></label>
    <label>Committed<input type="number" id="m-committed" value="${raise.committed_amount || 0}"></label>
    <label>Stage<input type="text" id="m-stage" value="${raise.stage || 'Pre-Seed'}"></label>
    <div class="modal-actions">
      <button class="btn-sm" id="m-cancel">Cancel</button>
      <button class="btn-primary-sm" id="m-save">Save</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#m-cancel').onclick = () => modal.remove();
  modal.querySelector('#m-save').onclick = async () => {
    await dbWrite("UPDATE raise_tracker SET target_amount=?, raised_amount=?, committed_amount=?, stage=?, updated_at=strftime('%s','now') WHERE id='current'",
      [+document.getElementById('m-target').value, +document.getElementById('m-raised').value,
       +document.getElementById('m-committed').value, document.getElementById('m-stage').value]);
    modal.remove(); toast('Raise updated'); renderFounderView(document.getElementById('app'));
  };
}
async function showAddDocModal(sectionId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal glass">
    <h3>Add Document</h3>
    <label>Name<input type="text" id="d-name" placeholder="e.g. Pitch Deck"></label>
    <label>Description<input type="text" id="d-desc" placeholder="Short description"></label>
    <label>URL<input type="text" id="d-url" placeholder="https://..."></label>
    <div class="modal-actions">
      <button class="btn-sm" id="d-cancel">Cancel</button>
      <button class="btn-primary-sm" id="d-save">Add</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#d-cancel').onclick = () => modal.remove();
  modal.querySelector('#d-save').onclick = async () => {
    const id = crypto.randomUUID();
    await dbWrite("INSERT INTO documents (id, section_id, name, description, file_url, file_type) VALUES (?,?,?,?,?,?)",
      [id, sectionId, document.getElementById('d-name').value, document.getElementById('d-desc').value,
       document.getElementById('d-url').value, 'link']);
    modal.remove(); toast('Document added'); renderFounderView(document.getElementById('app'));
  };
}
async function showAddInvestorModal() {
  var m = document.createElement('div'); m.className = 'modal-overlay';
  var opts = '<option value="intro">Lead</option><option value="waiting">Waiting</option>'
    + '<option value="active_diligence">Diligence</option><option value="verbal_commit">Verbal Commit</option>'
    + '<option value="closed">Closed</option>';
  m.innerHTML = '<div class="modal glass"><h3>Add Investor</h3>'
    + '<label>Fund name<input type="text" id="i-name" placeholder="e.g. Sequoia"></label>'
    + '<label>Website<input type="text" id="i-url" placeholder="https://sequoiacap.com"></label>'
    + '<label>Contact<input type="text" id="i-contact"></label><label>Email<input type="email" id="i-email"></label>'
    + '<label>Stage<select id="i-stage">' + opts + '</select></label>'
    + '<label>Amount<input type="number" id="i-amount" placeholder="50000"></label>'
    + '<div class="modal-actions"><button class="btn-sm" id="i-cancel">Cancel</button>'
    + '<button class="btn-primary-sm" id="i-save">Add</button></div></div>';
  document.body.appendChild(m);
  m.querySelector('#i-cancel').onclick = function() { m.remove(); };
  m.querySelector('#i-save').onclick = async function() {
    var id = crypto.randomUUID(), name = document.getElementById('i-name').value, url = document.getElementById('i-url').value;
    var domain = url ? new URL(url.startsWith('http') ? url : 'https://'+url).hostname : '';
    var logo = domain ? 'https://icon.horse/icon/'+domain : null;
    var stg = document.getElementById('i-stage').value, amt = parseFloat(document.getElementById('i-amount').value) || 0;
    await dbWrite("INSERT INTO investors (id,name,fund_url,logo_url,contact_name,contact_email,stage,passcode,invested_amount,committed_amount) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [id,name,url,logo,document.getElementById('i-contact').value,document.getElementById('i-email').value,
       stg,Math.random().toString(36).slice(-6).toUpperCase(),stg==='closed'?amt:0,stg==='verbal_commit'?amt:0]);
    m.remove(); toast(name+' added'); renderFounderView(document.getElementById('app'));
  };
}
async function generateShareLink(investorId, investorName) {
  // Ensure a token exists for this investor, then show the mode picker
  var existing = await dbQuery(
    "SELECT token FROM investor_links WHERE investor_id=? AND revoked=0 ORDER BY created_at DESC LIMIT 1",
    [investorId]);
  var token;
  if (existing.length) {
    token = existing[0].token;
  } else {
    token = crypto.randomUUID(); var id = crypto.randomUUID();
    var sections = JSON.stringify(['overview','traction','financials','team','legal']);
    await dbWrite("INSERT INTO investor_links (id, investor_id, token, sections_visible) VALUES (?,?,?,?)",
      [id, investorId, token, sections]);
  }
  showShareModeDialog(investorName, token, async function(mode, url){
    await navigator.clipboard.writeText(url);
    toast((mode === 'post' ? 'Unlocked link' : 'Pre-commit link') + ' copied for ' + investorName);
  });
}

// showShareModeDialog lives in share-mode.js

// Add VC Partner modal
function showAddPartnerModal(investorId, fundName, callback) {
  var html = '<div class="modal-overlay" id="partner-modal">'
    + '<div class="modal glass">'
    + '<h3>Add Partner for ' + esc(fundName) + '</h3>'
    + '<input id="pm-name" placeholder="Partner name (e.g. Andres Barreto)" class="input">'
    + '<input id="pm-title" placeholder="Title (e.g. Managing Director)" class="input">'
    + '<input id="pm-linkedin" placeholder="LinkedIn URL" class="input">'
    + '<input id="pm-photo" placeholder="Photo URL (optional)" class="input">'
    + '<div class="modal-actions">'
    + '<button class="btn-sm glass" onclick="document.getElementById(\'partner-modal\').remove()">Cancel</button>'
    + '<button class="btn-primary-sm" id="pm-save">Save & Generate Link</button>'
    + '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('pm-save').onclick = async function() {
    var name = document.getElementById('pm-name').value.trim();
    if (!name) return;
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await dbWrite("INSERT OR REPLACE INTO vc_partners (id, investor_id, name, title, fund_name, linkedin_url, photo_url) VALUES (?,?,?,?,?,?,?)",
      [id, investorId, name,
       document.getElementById('pm-title').value.trim(),
       fundName,
       document.getElementById('pm-linkedin').value.trim(),
       document.getElementById('pm-photo').value.trim()]);
    document.getElementById('partner-modal').remove();
    if (callback) callback(id);
  };
}
