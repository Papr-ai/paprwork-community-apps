// Intros tab — Founder view: ICP + leaderboard + recent intros

async function renderFounderIntrosTab() {
  var icp = await loadICP();
  var stats = await loadIntroStats();
  var allIntros = await loadIntros();
  var active = stats.filter(function(s){return s.intro_count>0});
  var avgIntros = active.length ? Math.round(active.reduce(function(a,s){return a+s.intro_count},0)/active.length) : 0;
  var titles=[]; try{titles=JSON.parse(icp.title_patterns||'[]')}catch(e){}
  var verts=[]; try{verts=JSON.parse(icp.verticals||'[]')}catch(e){}

  var leaderRows = active.slice(0,10).map(function(s,i){
    var bar = Math.min((s.intro_count/Math.max(active[0].intro_count,1))*100,100);
    return '<div class="lb-row"><span class="lb-rank">'+(i+1)+'</span>'
      +'<span class="lb-name">'+esc(s.fund_name)+'</span>'
      +'<div class="lb-bar-wrap"><div class="lb-bar" style="width:'+bar+'%"></div></div>'
      +'<span class="lb-count">'+s.intro_count+'</span></div>';
  }).join('');

  var recentRows = allIntros.slice(0,8).map(function(intro){
    var st={requested:'Requested',sent:'Sent',accepted:'Accepted',meeting_booked:'Meeting'};
    var cls={requested:'intro-req',sent:'intro-sent',accepted:'intro-acc',meeting_booked:'intro-meet'};
    return '<div class="intro-row"><div class="intro-contact-info">'
      +'<span class="intro-contact-name">'+esc(intro.contact_name)+'</span>'
      +'<span class="intro-contact-meta">'+esc(intro.title)+' at '+esc(intro.company)+'</span></div>'
      +'<span class="intro-fund">via '+esc(intro.fund_name)+'</span>'
      +'<span class="intro-status '+(cls[intro.status]||'')+'">'+(st[intro.status]||intro.status)+'</span></div>';
  }).join('');

  return '<div class="intros-founder">'
    +'<div class="intros-header"><h2>Customer Intros</h2>'
    +'<button class="btn-sm glass" id="edit-icp-btn">Edit ICP</button></div>'
    +'<div class="icp-card glass"><span class="section-label">Ideal Customer Profile</span>'
    +'<p class="icp-desc">'+esc(icp.description)+'</p>'
    +'<div class="icp-tags">'+titles.map(function(t){return '<span class="icp-tag">'+esc(t)+'</span>'}).join('')
    +verts.map(function(v){return '<span class="icp-tag vert">'+esc(v)+'</span>'}).join('')+'</div></div>'
    +'<div class="lb-section"><span class="section-label">Intro Leaderboard</span>'
    +'<div class="lb-avg">Avg: '+avgIntros+' intros per active investor</div>'
    +(leaderRows||'<p class="empty-state">No intros yet</p>')+'</div>'
    +'<div class="recent-section"><span class="section-label">Recent Intros</span>'
    +(recentRows||'<p class="empty-state">No intros yet</p>')+'</div></div>';
}

function bindFounderIntrosEvents(el) {
  var btn = el.querySelector('#edit-icp-btn');
  if (btn) btn.addEventListener('click', openIntrosICPEditor);
  bindBlurbEvents(el, true);
}

async function openIntrosICPEditor() {
  var icp = await loadICP();
  var titles=[]; try{titles=JSON.parse(icp.title_patterns||'[]')}catch(e){}
  var verts=[]; try{verts=JSON.parse(icp.verticals||'[]')}catch(e){}
  var body = '<div class="sm-ed-wrap">'
    +'<label class="sm-ed-label">ICP Description</label>'
    +'<textarea class="sm-ed-textarea" id="icp-desc" rows="4">'+esc(icp.description)+'</textarea>'
    +'<label class="sm-ed-label">Target Titles (comma-separated)</label>'
    +'<input class="sm-ed-input" id="icp-titles" value="'+esc(titles.join(', '))+'">'
    +'<label class="sm-ed-label">Target Verticals (comma-separated)</label>'
    +'<input class="sm-ed-input" id="icp-verts" value="'+esc(verts.join(', '))+'">'
    +'<label class="sm-ed-label">Intro Email Blurb</label>'
    +'<textarea class="sm-ed-textarea" id="icp-blurb" rows="5">'+esc(icp.intro_blurb)+'</textarea>'
    +'<div class="sm-ed-actions">'
    +'<button class="sm-ed-save" id="icp-save">Save</button>'
    +'<button class="sm-ed-cancel" id="icp-cancel">Cancel</button>'
    +'</div></div>';
  openViewer({
    title: 'Edit \u2014 Ideal Customer Profile',
    bodyHtml: body,
    afterBind: function(el) {
      el.querySelector('#icp-save').addEventListener('click', async function() {
        var desc = el.querySelector('#icp-desc').value;
        var ts = JSON.stringify(el.querySelector('#icp-titles').value.split(',').map(function(s){return s.trim()}).filter(Boolean));
        var vs = JSON.stringify(el.querySelector('#icp-verts').value.split(',').map(function(s){return s.trim()}).filter(Boolean));
        var blurb = el.querySelector('#icp-blurb').value;
        await dbWrite("UPDATE icp_criteria SET description=?,title_patterns=?,verticals=?,intro_blurb=?,updated_at=datetime('now') WHERE id=1",[desc,ts,vs,blurb]);
        closeViewer(true);
        toast('ICP saved');
        renderFounderView(document.getElementById('app'));
        setTimeout(function(){document.querySelector('[data-tab="intros"]')?.click();},50);
      });
      el.querySelector('#icp-cancel').addEventListener('click', function() {
        closeViewer(true);
      });
    }
  });
}

