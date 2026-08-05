// VC Detail — Founder view of connector's VC connections
// Single source of truth: vc_partners for LinkedIn/photos
async function openConnectorDetail(cid){
  var c=(await dbQuery("SELECT c.*, s.url as share_url FROM connectors c LEFT JOIN connector_share_urls s ON s.connector_id=c.id WHERE c.id=?",[cid]))[0];
  if(!c)return;
  var paths=await dbQuery(
    "SELECT ip.*, i.name as vc, i.logo_url, i.fit_score, "+
    "vp.linkedin_url as li_url, vp.photo_url as p_photo, vp.title as p_title "+
    "FROM intro_pathways ip JOIN investors i ON i.id=ip.investor_id "+
    "LEFT JOIN vc_partners vp ON vp.id=ip.partner_id "+
    "WHERE ip.connector_id=? AND ip.via_person!='' ORDER BY i.fit_score DESC",[cid]);
  var grp={};
  paths.forEach(function(p){
    var k=p.investor_id;
    if(!grp[k])grp[k]={vc:p.vc,logo:p.logo_url,fit:p.fit_score,ppl:[]};
    grp[k].ppl.push(p);
  });
  var blocks=Object.keys(grp).sort(function(a,b){return(grp[b].fit||0)-(grp[a].fit||0)}).map(function(k){
    var g=grp[k];
    var logo=g.logo?'<img src="'+esc(g.logo)+'" class="vd-logo" onerror="this.style.display=\'none\'">':'';
    var fitCls=g.fit>=85?'fit-high':g.fit>=70?'fit-med':'fit-low';
    var ppl=g.ppl.map(function(p){ return _partnerCard(p,cid); }).join('');
    return '<div class="vd-grp"><div class="vd-vc">'+logo+
      '<span class="vd-vc-nm">'+esc(g.vc)+'</span>'+
      '<span class="vc-fit-pill '+fitCls+'">'+Math.round(g.fit||0)+'</span></div>'+
      '<div class="vd-ppl">'+ppl+'</div></div>';
  }).join('');
  _renderDetailPage(c,paths,grp,blocks,cid);
}
