// Partner card — blue circle avatar, LinkedIn, photo upload
function _partnerCard(p,cid){
  var ini=p.via_person.split(' ').map(function(w){return w[0]}).join('').slice(0,2);
  var liUrl=p.li_url||p.via_person_linkedin||'';
  var liHtml=liUrl?'<a href="'+esc(liUrl)+'" target="_blank" class="vd-li" title="LinkedIn" onclick="event.stopPropagation();event.preventDefault();window.open(this.href,\'_blank\')">in</a>':'';
  var avHtml=p.p_photo?'<img src="'+p.p_photo+'" class="vd-p-photo">':'<span class="vd-p-ini">'+ini+'</span>';
  var uid='pp-'+cid+'-'+(p.partner_id||'').slice(0,8);
  return '<div class="vd-person glass"><label class="vd-p-av vd-p-av-btn" for="'+uid+'" title="Upload photo">'+
    avHtml+
    '<input type="file" accept="image/*" id="'+uid+'" class="vd-file-input" data-pid="'+(p.partner_id||'')+'">'+
    '</label><div class="vd-p-info"><span class="vd-p-nm">'+esc(p.via_person)+liHtml+'</span>'+
    '<span class="vd-p-role">'+esc(p.p_title||p.via_person_title)+'</span></div></div>';
}

function _renderDetailPage(c,paths,grp,blocks,cid){
  var clr=PW_CLR[(c.id-1)%PW_CLR.length];
  var tier=PW_TIER[c.intro_quality_tier]||'Network';
  var uid='vd-up-'+cid;
  var avHtml=c.photo_url?'<img src="'+c.photo_url+'" class="vd-photo">':
    '<div class="pw-av vd-av" style="background:'+clr+'">'+_ini(c.name)+'</div>';
  var shareLabel=c.share_url?'Copy Link for '+esc(c.name.split(' ')[0]):
    'Deploy Link for '+esc(c.name.split(' ')[0]);
  var n1=paths.filter(function(p){return(p.pathway_type||'').indexOf('1st')>=0}).length;
  var statsHtml='<div class="vc-intro-stats">'+
    '<span class="vc-stat">'+paths.length+' people</span>'+
    '<span class="vc-stat">'+Object.keys(grp).length+' VCs</span>'+
    (n1?'<span class="vc-stat vc-stat-1d">'+n1+' direct</span>':'')+'</div>';
  var el=document.getElementById('tab-intros')||document.getElementById('tab-inv-intros');
  if(!el._prev||!el.querySelector('.vd-page')) el._prev=el.innerHTML;
  el.innerHTML='<div class="vd-page">'+
    '<div class="vd-bar"><button class="vd-back">\u2190 Back</button>'+
    '<button class="vd-share">'+shareLabel+'</button></div>'+
    '<div class="vd-head"><label class="vd-av-wrap" for="'+uid+'" title="Click to upload photo">'+
    avHtml+'<div class="vd-upload-hint">\uD83D\uDCF7</div>'+
    '<input type="file" accept="image/*" id="'+uid+'" class="vd-file-input"></label>'+
    '<div class="vd-meta"><div class="vd-nm">'+esc(c.name)+
    '<span class="pw-tier pw-t'+c.intro_quality_tier+'">'+tier+'</span></div>'+
    '<div class="vd-role">'+esc(c.title)+' \u00b7 '+esc(c.company)+'</div>'+
    '</div></div>'+statsHtml+'<div class="vd-body">'+blocks+'</div></div>';
  _bindDetailEvents(el,c,cid,uid);
}
