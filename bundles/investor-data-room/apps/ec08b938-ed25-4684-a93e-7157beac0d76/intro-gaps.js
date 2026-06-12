// Intro Gaps — Founder-only view of high-fit Lead investors and who can intro
var IG_SEARCH = '';
var IG_FILTER = 'gap';
async function renderIntroGapsTab() {
  var leads = await dbQuery(
    "SELECT id, name, fund_url, logo_url, fit_score, "
    + "COALESCE(met,0) as met, COALESCE(last_met_at,'') as last_met_at, COALESCE(last_met_title,'') as last_met_title, "
    + "COALESCE(committed_connector_id,0) as committed_connector_id, COALESCE(committed_note,'') as committed_note "
    + "FROM investors WHERE (stage='Lead' AND COALESCE(fit_score,0) >= 70) OR COALESCE(met,0)=1 "
    + "ORDER BY met DESC, fit_score DESC, name ASC"
  );
  if (!leads.length) return '<div class="ig-empty">No high-fit Lead investors yet.</div>';

  var partners = await dbQuery("SELECT investor_id, name, title, linkedin_url FROM vc_partners");
  var ptrMap = {};
  partners.forEach(function(p){ (ptrMap[p.investor_id] = ptrMap[p.investor_id] || []).push(p); });

  var paths = await dbQuery(
    "SELECT ip.investor_id, ip.via_person, ip.via_person_title, ip.via_person_linkedin, "
    + "c.id as connector_id, c.name as connector_name "
    + "FROM intro_pathways ip LEFT JOIN connectors c ON c.id=ip.connector_id WHERE ip.via_person != ''"
  );
  var pathMap = {};
  paths.forEach(function(p){ (pathMap[p.investor_id] = pathMap[p.investor_id] || []).push(p); });

  var conns = await dbQuery("SELECT id, name, photo_url, company, title, vc_reach_count FROM connectors");
  var connMap = {}; conns.forEach(function(c){ connMap[c.id] = c; });
  window.__IG_CONNECTORS = conns;

  var gapCount = 0, coveredCount = 0, metCount = 0;
  var rows = leads.map(function(inv){
    var ptrs = ptrMap[inv.id] || [];
    var connectors = pathMap[inv.id] || [];
    var hasPath = connectors.length > 0;
    var isMet = inv.met === 1 || inv.met === '1';
    var committed = inv.committed_connector_id ? connMap[inv.committed_connector_id] : null;
    var state = isMet ? 'met' : (hasPath ? 'covered' : 'gap');
    if (isMet) metCount++; else if (hasPath) coveredCount++; else gapCount++;
    var fitCls = inv.fit_score >= 85 ? 'ig-fit-hi' : 'ig-fit-mid';
    var logo = inv.logo_url
      ? '<img src="'+esc(inv.logo_url)+'" class="ig-logo" onerror="this.style.display=\'none\'">'
      : '<div class="ig-logo-ph">'+(inv.name||'?').charAt(0)+'</div>';
    var ptrChips = ptrs.slice(0,3).map(function(p){
      var li = p.linkedin_url ? '<a href="'+esc(p.linkedin_url)+'" target="_blank" onclick="event.stopPropagation()">'+esc(p.name)+'</a>' : esc(p.name);
      return '<span class="ig-ptr">'+li+'</span>';
    }).join('') + (ptrs.length > 3 ? '<span class="ig-ptr-more">+'+(ptrs.length-3)+'</span>' : '');
    var statusPill = isMet
      ? '<span class="ig-pill ig-pill-met">✓ Already met</span>'
      : (committed
        ? '<span class="ig-pill ig-pill-commit">✓ Committed</span>'
        : (hasPath
          ? '<span class="ig-pill ig-pill-ok">✓ '+connectors.length+' path'+(connectors.length>1?'s':'')+'</span>'
          : '<span class="ig-pill ig-pill-gap">⚠ Needs intro</span>'));

    var commitChip = '';
    if (!isMet) {
      if (committed) {
        var firstName = (committed.name||'').split(' ')[0];
        var photo = committed.photo_url
          ? '<img src="'+esc(committed.photo_url)+'" class="ig-cc-av" onerror="this.outerHTML=\'<div class=&quot;ig-cc-av ig-cc-av-ph&quot;>'+(committed.name||'?').charAt(0)+'</div>\'">'
          : '<div class="ig-cc-av ig-cc-av-ph">'+(committed.name||'?').charAt(0)+'</div>';
        commitChip = '<button class="ig-cc" data-action="assign-connector" data-inv-id="'+esc(inv.id)+'" data-inv-name="'+esc(inv.name)+'" title="'+esc(committed.name)+' — click to change">'
          + photo + '<span class="ig-cc-n">'+esc(firstName)+'</span><span class="ig-cc-c">⌄</span></button>';
      } else {
        commitChip = '<button class="ig-cc ig-cc-empty" data-action="assign-connector" data-inv-id="'+esc(inv.id)+'" data-inv-name="'+esc(inv.name)+'" title="Assign a connector to make this intro">'
          + '<span class="ig-cc-plus">+</span><span class="ig-cc-n">Assign</span></button>';
      }
    }

    var viaList = isMet
      ? '<div class="ig-via-met">Met '+esc(inv.last_met_at||'')+(inv.last_met_title?' · <i>'+esc(inv.last_met_title)+'</i>':'')+'</div>'
      : (hasPath
        ? connectors.slice(0,3).map(function(c){
            return '<div class="ig-via"><b>'+esc(c.connector_name||'—')+'</b> → '+esc(c.via_person||'')+(c.via_person_title?' · '+esc(c.via_person_title):'')+'</div>';
          }).join('') + (connectors.length > 3 ? '<div class="ig-via-more">+'+(connectors.length-3)+' more</div>' : '')
        : '<div class="ig-via-empty">No connector yet — add one to unblock this lead</div>');

    var searchBlob = [
      inv.name,
      ptrs.map(function(p){return p.name+' '+(p.title||'')}).join(' '),
      connectors.map(function(c){return (c.connector_name||'')+' '+(c.via_person||'')}).join(' '),
      committed ? committed.name : ''
    ].join(' ').toLowerCase();
    return '<div class="ig-row glass" data-state="'+state+'" data-inv-id="'+esc(inv.id)+'" data-inv-name="'+esc(inv.name)+'" data-search="'+esc(searchBlob)+'" style="cursor:pointer">'
      + '<div class="ig-row-main">'+logo
      + '<div class="ig-info"><div class="ig-name">'+esc(inv.name)
      + '<span class="ig-fit '+fitCls+'">'+Math.round(inv.fit_score)+'</span></div>'
      + '<div class="ig-ptrs">'+(ptrChips || '<span class="ig-no-ptr">No partners listed</span>')+'</div></div>'
      + statusPill + commitChip + '</div>'
      + '<div class="ig-row-via">'+viaList+'</div></div>';
  }).join('');

  var dlIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9M4 7l4 4 4-4M2 14h12"/></svg>';
  return '<div class="ig-wrap"><div class="ig-head"><div class="ig-stats">'
    + '<div class="ig-stat" data-f="all" role="button" tabindex="0"><div class="ig-stat-n">'+leads.length+'</div><div class="ig-stat-l">High-fit</div></div><div class="ig-stat-sep"></div>'
    + '<div class="ig-stat gap" data-f="gap" role="button" tabindex="0"><div class="ig-stat-n">'+gapCount+'</div><div class="ig-stat-l">Need intro</div></div><div class="ig-stat-sep"></div>'
    + '<div class="ig-stat ok" data-f="covered" role="button" tabindex="0"><div class="ig-stat-n">'+coveredCount+'</div><div class="ig-stat-l">Covered</div></div><div class="ig-stat-sep"></div>'
    + '<div class="ig-stat met" data-f="met" role="button" tabindex="0"><div class="ig-stat-n">'+metCount+'</div><div class="ig-stat-l">Already met</div></div></div>'
    + '<div class="ig-actions">'
    + '<div class="ig-search-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" id="ig-search" class="ig-search-input" placeholder="Search investors, partners…" value="'+esc(IG_SEARCH||'')+'"/><button class="ig-search-clear" id="ig-search-clear" title="Clear" style="display:'+(IG_SEARCH?'inline-flex':'none')+'">×</button></div>'
    + '<div class="ig-filters">'
    + '<button class="ig-f'+(IG_FILTER==='gap'?' active':'')+'" data-f="gap"><span class="ig-f-dot"></span>Need intro</button>'
    + '<button class="ig-f'+(IG_FILTER==='covered'?' active':'')+'" data-f="covered"><span class="ig-f-dot"></span>Covered</button>'
    + '<button class="ig-f'+(IG_FILTER==='met'?' active':'')+'" data-f="met"><span class="ig-f-dot"></span>Already met</button>'
    + '<button class="ig-f'+(IG_FILTER==='all'?' active':'')+'" data-f="all"><span class="ig-f-dot"></span>All</button></div>'
    + '<button class="ig-export" id="ig-export-btn">'+dlIcon+'<span>Export CSV</span></button>'
    + '</div></div><div class="ig-list">'+rows+'</div></div>';
}

function bindIntroGapsEvents(el) {
  function applyView(){
    var f = IG_FILTER || 'gap';
    var q = (IG_SEARCH || '').trim().toLowerCase();
    el.querySelectorAll('.ig-f').forEach(function(x){
      x.classList.toggle('active', x.dataset.f === f);
    });
    el.querySelectorAll('.ig-stat[data-f]').forEach(function(x){
      x.classList.toggle('active', x.dataset.f === f);
    });
    var shown = 0;
    el.querySelectorAll('.ig-row').forEach(function(r){
      var stateOk = (f==='all' || f===r.dataset.state);
      var searchOk = !q || (r.dataset.search||'').indexOf(q) !== -1;
      var show = stateOk && searchOk;
      r.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    var emptyEl = el.querySelector('.ig-search-empty');
    if (q && shown === 0) {
      if (!emptyEl) {
        var list = el.querySelector('.ig-list');
        if (list) list.insertAdjacentHTML('beforeend', '<div class="ig-search-empty ig-empty">No investors match "<b>'+esc(q)+'</b>"</div>');
      }
    } else if (emptyEl) {
      emptyEl.remove();
    }
    var clearBtn = el.querySelector('#ig-search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';
  }
  el.querySelectorAll('.ig-f').forEach(function(b){
    b.onclick = function(){ IG_FILTER = b.dataset.f; applyView(); };
  });
  el.querySelectorAll('.ig-stat[data-f]').forEach(function(s){
    s.style.cursor = 'pointer';
    s.onclick = function(){ IG_FILTER = s.dataset.f; applyView(); };
    s.onkeydown = function(e){ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); IG_FILTER = s.dataset.f; applyView(); } };
  });
  var searchInput = el.querySelector('#ig-search');
  if (searchInput) {
    searchInput.oninput = function(){ IG_SEARCH = searchInput.value; applyView(); };
    searchInput.onkeydown = function(e){ if (e.key === 'Escape') { IG_SEARCH=''; searchInput.value=''; applyView(); } };
  }
  var clearBtn = el.querySelector('#ig-search-clear');
  if (clearBtn) clearBtn.onclick = function(){
    IG_SEARCH = '';
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
    applyView();
  };
  applyView();
  var exportBtn = el.querySelector('#ig-export-btn');
  if (exportBtn) exportBtn.onclick = function(){ exportIntroGapsCSV(); };
  el.querySelectorAll('.ig-row').forEach(function(r){
    r.onclick = function(e){
      if (e.target.closest('a')) return;
      var assignEl = e.target.closest('[data-action="assign-connector"]');
      if (assignEl) {
        e.stopPropagation();
        var iid = assignEl.dataset.invId, iname = assignEl.dataset.invName;
        if (iid && typeof openConnectorPicker === 'function') openConnectorPicker(iid, iname);
        return;
      }
      var id = r.dataset.invId, name = r.dataset.invName;
      if (id && typeof openIntroGapsModal === 'function') openIntroGapsModal(id, name);
    };
  });
}
