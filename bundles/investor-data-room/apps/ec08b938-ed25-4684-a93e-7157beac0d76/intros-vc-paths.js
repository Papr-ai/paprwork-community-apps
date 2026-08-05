// VC Intro Paths — Liquid Glass cards with blue circle avatars + LinkedIn
// Reads from vc_partners (single source of truth) via joined data
async function renderVCIntrosSection(connector) {
  var paths = await dbQuery("SELECT * FROM intro_pathways WHERE connector_id=?", [connector.id]);
  // Enrich from vc_partners if available (founder view has JOIN, Vercel has embedded data)
  var partnerIds = paths.map(function(p){ return p.partner_id; }).filter(Boolean);
  var partners = {};
  if (partnerIds.length && typeof dbQuery === 'function') {
    try {
      var pp = await dbQuery("SELECT id, linkedin_url, photo_url, title FROM vc_partners WHERE id IN ("+
        partnerIds.map(function(){return '?'}).join(',')+")", partnerIds);
      pp.forEach(function(p){ partners[p.id] = p; });
    } catch(e) {}
  }
  var grp = {};
  paths.forEach(function(p) {
    var k = p.investor_name || p.investor_id;
    if (!grp[k]) grp[k] = { vc: p.investor_name, logo: p.vc_logo, fit: p.vc_fit, ppl: [] };
    var vp = partners[p.partner_id] || {};
    p._li = vp.linkedin_url || p.via_person_linkedin || '';
    p._photo = vp.photo_url || p.via_person_photo || '';
    p._title = vp.title || p.via_person_title || '';
    grp[k].ppl.push(p);
  });
  var keys = Object.keys(grp).sort(function(a,b){return(grp[b].fit||0)-(grp[a].fit||0)});
  var blocks = keys.map(function(k) {
    var g = grp[k];
    var logoH = g.logo ? '<img src="'+esc(g.logo)+'" class="inv-logo" onerror="this.style.display=\'none\'">' : '';
    var fitCls = g.fit>=85?'fit-high':g.fit>=70?'fit-med':'fit-low';
    var avs = g.ppl.slice(0,3).map(function(p){
      return p._photo ? '<img class="inv-p-av" src="'+p._photo+'"/>'
        : '<span class="inv-p-av inv-p-av-i">'+p.via_person.split(' ').map(function(w){return w[0]}).join('')+'</span>';
    }).join('') + (g.ppl.length>3?'<span class="inv-p-av inv-p-av-i">+'+(g.ppl.length-3)+'</span>':'');
    var pBadge = '<div class="inv-people-badge">'+avs+'</div>';
    var hdr = '<div class="inv-row glass" style="cursor:pointer">'+logoH
      +'<div class="inv-info"><span class="inv-name">'+esc(g.vc)+'</span></div>'
      +'<span class="vc-fit-pill '+fitCls+'">'+Math.round(g.fit||0)+'%</span>'
      +pBadge
      +'<svg class="inv-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></div>';
    var cards = g.ppl.map(function(p){ return _vcPersonCard(p); }).join('');
    var expand = '<div class="inv-expand"><div class="inv-expand-inner">'+cards+'</div></div>';
    return '<div class="inv-row-wrap">'+hdr+expand+'</div>';
  }).join('');
  var n1 = paths.filter(function(p){return(p.pathway_type||'').indexOf('1st')>=0}).length;
  var stats = '<div class="vc-intro-stats">'+
    '<span class="vc-stat">'+paths.length+' people</span>'+
    '<span class="vc-stat">'+keys.length+' VCs</span>'+
    (n1?'<span class="vc-stat vc-stat-1d">'+n1+' direct</span>':'')+'</div>';
  var fn = connector.name.split(' ')[0];
  return '<div class="intros-investor"><div class="ic-header">'+
    '<span class="section-label">VC Introductions via '+esc(fn)+'</span></div>'+
    stats+blocks+'</div>';
}
