// Intro Gaps — pathway detail modal
async function openIntroGapsModal(investorId, investorName) {
  var paths = await dbQuery(
    "SELECT ip.via_person, ip.via_person_title, ip.via_person_linkedin, ip.pathway_type, "
    + "ip.connector_id as cid, ip.connector_name, ip.connector_email, ip.connector_li "
    + "FROM intro_pathways ip "
    + "WHERE ip.investor_id=? AND ip.via_person != '' "
    + "ORDER BY ip.connector_name, ip.via_person", [investorId]
  );
  var byConn = {};
  paths.forEach(function(p){
    var cn = p.connector_name || p.cn || '— Unknown —';
    var k = cn + '||' + (p.cid||p.connector_id||'');
    if (!byConn[k]) byConn[k] = {
      name: cn,
      email: p.connector_email || p.cemail || '',
      linkedin: p.connector_li || p.connector_linkedin || ''
      , paths: [] };
    byConn[k].paths.push(p);
  });
  var groups = Object.keys(byConn).sort();
  var connHtml = groups.length ? groups.map(function(k){
    var g = byConn[k];
    var links = '';
    if (g.email) links += '<a class="igm-link" href="mailto:'+esc(g.email)+'">'+esc(g.email)+'</a>';
    if (g.linkedin) links += '<a class="igm-link" href="'+esc(g.linkedin)+'" target="_blank">LinkedIn ↗</a>';
    var people = g.paths.map(function(p){
      var li = p.via_person_linkedin ? ' <a href="'+esc(p.via_person_linkedin)+'" target="_blank" class="igm-li">↗</a>' : '';
      return '<div class="igm-person"><b>'+esc(p.via_person)+'</b>'+(p.via_person_title?' <span class="igm-title">'+esc(p.via_person_title)+'</span>':'')+li+'</div>';
    }).join('');
    return '<div class="igm-group">'
      + '<div class="igm-conn-head"><div class="igm-conn-name">'+esc(g.name)+'</div>'
      + '<div class="igm-conn-links">'+links+'</div></div>'
      + '<div class="igm-people">'+people+'</div></div>';
  }).join('') : '<div class="igm-empty">No connectors yet for this fund.</div>';

  var html = '<div class="igm-overlay" id="igm-overlay">'
    + '<div class="igm-box glass">'
    + '<div class="igm-head"><div><div class="igm-title-main">'+esc(investorName)+'</div>'
    + '<div class="igm-sub">'+paths.length+' intro path'+(paths.length===1?'':'s')+' via '+groups.length+' connector'+(groups.length===1?'':'s')+'</div></div>'
    + '<button class="igm-close" id="igm-close-btn" aria-label="Close">✕</button></div>'
    + '<div class="igm-body">'+connHtml+'</div></div></div>';
  var host = document.getElementById('igm-host');
  if (!host) { host = document.createElement('div'); host.id='igm-host'; document.body.appendChild(host); }
  host.innerHTML = html;
  var close = function(){ host.innerHTML=''; document.removeEventListener('keydown', onKey); };
  var onKey = function(e){ if(e.key==='Escape') close(); };
  document.getElementById('igm-close-btn').onclick = close;
  document.getElementById('igm-overlay').onclick = function(e){ if(e.target.id==='igm-overlay') close(); };
  document.addEventListener('keydown', onKey);
}
