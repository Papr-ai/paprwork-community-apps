// Connector Picker — assign / change who is committed to intro to a given investor
async function openConnectorPicker(investorId, investorName) {
  var conns = window.__IG_CONNECTORS;
  if (!conns) {
    conns = await dbQuery("SELECT id, name, photo_url, company, title, vc_reach_count, intro_score FROM connectors");
    window.__IG_CONNECTORS = conns;
  }
  var hints = await dbQuery("SELECT DISTINCT connector_id FROM intro_pathways WHERE investor_id=? AND connector_id IS NOT NULL",[investorId]);
  var hintSet = {}; hints.forEach(function(h){ hintSet[h.connector_id] = 1; });
  var cur = await dbQuery("SELECT committed_connector_id, committed_note FROM investors WHERE id=?", [investorId]);
  var curId = cur.length ? cur[0].committed_connector_id : null;
  var curNote = cur.length ? (cur[0].committed_note || '') : '';
  var sorted = conns.slice().sort(function(a,b){
    var ah = hintSet[a.id]?1:0, bh = hintSet[b.id]?1:0;
    if (ah !== bh) return bh - ah;
    return (b.vc_reach_count||0) - (a.vc_reach_count||0);
  });
  function renderRow(c) {
    var ph = c.photo_url ? '<img src="'+esc(c.photo_url)+'" class="cp-avatar" onerror="this.outerHTML=\'<div class=&quot;cp-avatar cp-avatar-ph&quot;>'+(c.name||'?').charAt(0)+'</div>\'">' : '<div class="cp-avatar cp-avatar-ph">'+(c.name||'?').charAt(0)+'</div>';
    var pb = hintSet[c.id] ? '<span class="cp-path-badge" title="Has known path to this investor">✓ path</span>' : '';
    var rch = c.vc_reach_count ? '<span class="cp-reach">'+c.vc_reach_count+' VC reach</span>' : '';
    var sub = [c.title, c.company].filter(Boolean).join(' · ');
    var isCur = curId == c.id;
    return '<div class="cp-row'+(isCur?' cp-row-cur':'')+'" data-cid="'+c.id+'" data-cname="'+esc(c.name)+'">'+ph
      +'<div class="cp-info"><div class="cp-name">'+esc(c.name)+(isCur?' <span class="cp-cur-tag">current</span>':'')+'</div>'
      +(sub?'<div class="cp-sub">'+esc(sub)+'</div>':'')+'</div>'
      +'<div class="cp-meta">'+pb+rch+'</div></div>';
  }
  var html = '<div class="cp-overlay" id="cp-overlay"><div class="cp-modal">'
    +'<div class="cp-head"><div><div class="cp-eyebrow">Assign connector</div><div class="cp-title">'+esc(investorName)+'</div></div>'
    +'<button class="cp-close" id="cp-close">✕</button></div>'
    +'<div class="cp-search-wrap"><input type="text" id="cp-search" class="cp-search" placeholder="Search connectors by name, company…" autofocus></div>'
    +'<div class="cp-list" id="cp-list">'+sorted.map(renderRow).join('')+'</div>'
    +'<div class="cp-foot"><input type="text" id="cp-note" class="cp-note" placeholder="Optional note (e.g. \'committed via DM on May 25\')" value="'+esc(curNote)+'">'
    +(curId?'<button class="cp-clear" id="cp-clear">Remove current</button>':'')+'</div></div></div>';
  var div = document.createElement('div'); div.innerHTML = html; document.body.appendChild(div.firstChild);
  var overlay = document.getElementById('cp-overlay');
  function close() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }
  overlay.onclick = function(e){ if (e.target === overlay) close(); };
  document.getElementById('cp-close').onclick = close;
  var search = document.getElementById('cp-search'); var list = document.getElementById('cp-list');
  search.oninput = function() {
    var q = search.value.trim().toLowerCase();
    list.querySelectorAll('.cp-row').forEach(function(r){
      var n = r.dataset.cname.toLowerCase();
      var sb = (r.querySelector('.cp-sub')||{}).textContent || '';
      r.style.display = (!q || n.indexOf(q)>=0 || sb.toLowerCase().indexOf(q)>=0) ? '' : 'none';
    });
  };
  list.querySelectorAll('.cp-row').forEach(function(r){
    r.onclick = async function() {
      var cid = parseInt(r.dataset.cid, 10);
      var note = (document.getElementById('cp-note').value || '').trim();
      await dbWrite("UPDATE investors SET committed_connector_id=?, committed_at=?, committed_note=? WHERE id=?",[cid, new Date().toISOString(), note, investorId]);
      close();
      if (typeof refreshIntroGapsTab === 'function') refreshIntroGapsTab();
      else window.dispatchEvent(new CustomEvent('intro-gaps:refresh'));
    };
  });
  var clr = document.getElementById('cp-clear');
  if (clr) clr.onclick = async function() {
    await dbWrite("UPDATE investors SET committed_connector_id=NULL, committed_at='', committed_note='' WHERE id=?", [investorId]);
    close();
    if (typeof refreshIntroGapsTab === 'function') refreshIntroGapsTab();
    else window.dispatchEvent(new CustomEvent('intro-gaps:refresh'));
  };
}
async function refreshIntroGapsTab() {
  var slot = document.querySelector('.ig-wrap');
  if (!slot || !slot.parentNode) return;
  var html = await renderIntroGapsTab();
  var w = document.createElement('div'); w.innerHTML = html;
  var newEl = w.firstChild;
  slot.parentNode.replaceChild(newEl, slot);
  if (typeof bindIntroGapsEvents === 'function') bindIntroGapsEvents(newEl);
}
