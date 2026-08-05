// VC Intros — People-first connector cards with photos + share links
var PW_CLR=['#0161E0','#7C3AED','#059669','#EA580C','#CA8A04','#DC2626','#0891B2','#4F46E5'];
var PW_TIER={1:'Fund Returner',2:'Portfolio Founder',3:'Our Investor',4:'Senior Operator',5:'Network'};

function _ini(name){return (name||'').split(' ').map(function(w){return w[0]}).join('').slice(0,2)}

async function renderVCIntrosTab(){
  var cs=await dbQuery("SELECT c.*, s.url as share_url FROM connectors c LEFT JOIN connector_share_urls s ON s.connector_id=c.id WHERE c.is_curated=1 ORDER BY c.intro_score DESC");
  // Get top 3 people per connector (highest fit VCs)
  var allP=await dbQuery("SELECT ip.connector_id,ip.via_person,ip.via_person_title,i.name as vc,i.logo_url,i.fit_score FROM intro_pathways ip JOIN investors i ON i.id=ip.investor_id WHERE ip.via_person!='' ORDER BY i.fit_score DESC");
  var topMap={};
  allP.forEach(function(p){
    if(!topMap[p.connector_id])topMap[p.connector_id]=[];
    // Dedupe people by name
    var exists=topMap[p.connector_id].some(function(x){return x.via_person===p.via_person});
    if(!exists && topMap[p.connector_id].length<3)topMap[p.connector_id].push(p);
  });
  var uVCs=new Set();allP.forEach(function(p){uVCs.add(p.vc)});
  var cards=cs.map(function(c,i){
    var clr=PW_CLR[i%PW_CLR.length];
    var tier=PW_TIER[c.intro_quality_tier]||'Network';
    var av=c.photo_url?'<img src="'+c.photo_url+'" class="pw-photo">':'<div class="pw-av" style="background:'+clr+'">'+_ini(c.name)+'</div>';
    var faces=(topMap[c.id]||[]).map(function(p){
      return '<div class="pw-face" title="'+esc(p.via_person)+' · '+esc(p.via_person_title)+' at '+esc(p.vc)+'">'+
        '<div class="pw-face-ini">'+_ini(p.via_person)+'</div>'+
        '<span class="pw-face-nm">'+esc(p.via_person.split(' ')[0])+'</span></div>';
    }).join('');
    var sBtn=c.share_url?'<button class="pw-sbtn" data-url="'+esc(c.share_url)+'" onclick="event.stopPropagation();navigator.clipboard.writeText(this.dataset.url);toast(\'Link copied!\')">&#x1F517;</button>':'';
    return '<div class="pw-card glass" data-cid="'+c.id+'">'+
      '<div class="pw-left">'+av+
      '<div class="pw-info"><div class="pw-nm">'+esc(c.name)+
      '<span class="pw-tier pw-t'+c.intro_quality_tier+'">'+tier+'</span></div>'+
      '<div class="pw-role">'+esc(c.title)+' · '+esc(c.company)+'</div></div></div>'+
      '<div class="pw-mid">'+faces+'</div>'+
      '<div class="pw-right">'+sBtn+
      '<span class="pw-num">'+c.vc_reach_count+'</span>'+
      '<span class="pw-lbl">VCs</span></div></div>';
  }).join('');
  return '<div class="pw-wrap">'+
    '<div class="pw-head"><div class="pw-stats">'+
    '<span class="pw-s"><b>'+cs.length+'</b> Connectors</span>'+
    '<span class="pw-dot">·</span>'+
    '<span class="pw-s"><b>'+uVCs.size+'</b> VCs Reachable</span></div></div>'+
    '<div class="pw-list">'+cards+'</div></div>';
}

function bindVCIntroEvents(el){
  el.querySelectorAll('.pw-card').forEach(function(c){
    c.style.cursor='pointer';
    c.onclick=function(){openConnectorDetail(c.dataset.cid)};
  });
}
function _bindIntroSubtabs(el){
  bindVCIntroEvents(el);
  bindFounderIntrosEvents(el);
  el.querySelectorAll('.ist-tabs .tab').forEach(function(b){
    b.onclick=function(){
      el.querySelectorAll('.ist-tabs .tab').forEach(function(x){x.classList.remove('active')});
      b.classList.add('active');
      var show=b.dataset.sub;
      el.querySelectorAll('.ist-panel').forEach(function(p){
        p.style.display='none'; p.classList.remove('active');
      });
      var t=document.getElementById('ip-'+show);
      if(t){t.style.display='';t.classList.add('active');}
    };
  });
}
