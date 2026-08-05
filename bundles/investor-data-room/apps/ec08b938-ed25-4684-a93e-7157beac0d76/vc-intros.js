// VC Intros — People-first connector list + full-page detail
var VI_COLORS=['#0161E0','#7C3AED','#059669','#EA580C','#CA8A04','#DC2626','#0891B2','#4F46E5','#BE185D','#065F46'];
var VI_TIERS={1:'Fund Returner',2:'Portfolio Founder',3:'Our Investor',4:'Senior Operator',5:'Network'};

async function renderVCIntros(){
  var connectors=await dbQuery("SELECT * FROM connectors WHERE is_curated=1 ORDER BY intro_score DESC");
  var photos=await dbQuery("SELECT * FROM connector_photos");
  var photoMap={}; photos.forEach(function(p){photoMap[p.connector_id]=p.photo_data});
  // Get top 3 partner faces per connector
  var previews=await dbQuery("SELECT ip.connector_id, ip.via_person, ip.via_person_title, i.name as vc_name, i.logo_url, i.fit_score FROM intro_pathways ip JOIN investors i ON i.id=ip.investor_id WHERE ip.connector_id IN (SELECT id FROM connectors WHERE is_curated=1) AND ip.via_person!='' ORDER BY COALESCE(i.fit_score,0) DESC");
  var previewMap={};
  previews.forEach(function(p){
    if(!previewMap[p.connector_id]) previewMap[p.connector_id]=[];
    if(previewMap[p.connector_id].length<3) previewMap[p.connector_id].push(p);
  });
  var uniqueVCs=new Set(); previews.forEach(function(p){uniqueVCs.add(p.vc_name)});
  var cards=connectors.map(function(c,i){
    var ini=c.name.split(' ').map(function(w){return w[0]}).join('').slice(0,2);
    var color=VI_COLORS[i%VI_COLORS.length];
    var tier=VI_TIERS[c.intro_quality_tier]||'Network';
    var photo=photoMap[c.id];
    var avatar=photo?'<img src="'+photo+'" class="vi-photo">':'<div class="vi-ini" style="background:'+color+'">'+ini+'</div>';
    var top3=(previewMap[c.id]||[]).map(function(p){
      var pIni=p.via_person.split(' ').map(function(w){return w[0]}).join('').slice(0,2);
      return '<div class="vi-prev-person" title="'+esc(p.via_person)+' — '+esc(p.via_person_title)+' at '+esc(p.vc_name)+'"><div class="vi-prev-ini">'+pIni+'</div><span class="vi-prev-name">'+esc(p.via_person.split(' ')[0])+'</span></div>';
    }).join('');
    return '<div class="vi-card glass" data-cid="'+c.id+'">'+
      '<div class="vi-card-left">'+avatar+
      '<div class="vi-card-info"><div class="vi-card-name">'+esc(c.name)+
      '<span class="vi-tier vi-tier-'+c.intro_quality_tier+'">'+tier+'</span></div>'+
      '<div class="vi-card-role">'+esc(c.title)+' · '+esc(c.company)+'</div></div></div>'+
      '<div class="vi-card-right"><div class="vi-prev-row">'+top3+'</div>'+
      '<div class="vi-reach"><span class="vi-reach-num">'+c.vc_reach_count+'</span> VCs</div></div></div>';
  }).join('');
  return '<div class="vi-list">'+
    '<div class="vi-summary"><span class="vi-sum-item"><b>'+connectors.length+'</b> Connectors</span>'+
    '<span class="vi-sum-sep">·</span><span class="vi-sum-item"><b>'+uniqueVCs.size+'</b> VCs Reachable</span></div>'+
    cards+'</div>';
}

function bindVCIntroEvents(container){
  container.querySelectorAll('.vi-card').forEach(function(card){
    card.style.cursor='pointer';
    card.addEventListener('click',function(){openConnectorDetail(card.dataset.cid)});
  });
}
