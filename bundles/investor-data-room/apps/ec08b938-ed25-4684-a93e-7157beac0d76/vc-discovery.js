// VC Discovery — source investors from Mercury, OpenVC, NFX Signal
function openVCDiscovery() {
  if (viewerOverlay) closeViewer();
  var body = '<div class="vcd-panel">'
    +'<p class="vcd-subtitle">Import VCs that match your raise</p>'
    +'<div class="vcd-sources">'
    +srcCard('mercury','M','Mercury','Pre-seed · AI/ML · Infra · SaaS')
    +srcCard('openvc','O','OpenVC','Open fund database · browse & export')
    +srcCard('nfx','N','NFX Signal','AI-matched VCs for your profile')
    +'</div></div>';
  openViewer({title:'Discover VCs',bodyHtml:body,afterBind:function(el){
    el.querySelectorAll('.vcd-source').forEach(function(c){
      c.onclick=function(){openSrcImport(c.dataset.source);};
    });
  }});
}
function srcCard(k,ic,nm,desc){
  return '<div class="vcd-source glass" data-source="'+k+'">'
    +'<div class="vcd-source-icon">'+ic+'</div>'
    +'<div class="vcd-source-info"><span class="vcd-source-name">'+nm+'</span>'
    +'<span class="vcd-source-desc">'+desc+'</span></div>'
    +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>';
}
function buildChip(l,a){return '<button class="vcd-chip'+(a?' active':'')+'" data-val="'+l+'">'+l+'</button>';}
function openSrcImport(src){
  if(viewerOverlay)closeViewer();
  if(src==='mercury')openMercuryImport();
  else openExtImport(src==='openvc'?'OpenVC':'NFX Signal',
    src==='openvc'?'https://openvc.app/search?categories=ai-infrastructure,deep-tech':'https://signal.nfx.com/investor-lists');
}
function openMercuryImport(){
  var body='<div class="vcd-import">'
    +'<div class="vcd-filters"><div class="vcd-filter-group"><label>Stages</label>'
    +'<div class="vcd-chips" id="merc-stages">'+buildChip('Pre-seed',true)+buildChip('Seed',false)+buildChip('Series A',false)+'</div></div>'
    +'<div class="vcd-filter-group"><label>Industries</label>'
    +'<div class="vcd-chips" id="merc-industries">'+buildChip('AI/ML',true)+buildChip('Deep Tech',true)
    +buildChip('Developer Tools',true)+buildChip('Enterprise',true)+buildChip('SaaS',true)
    +buildChip('Automation',true)+buildChip('Cloud',true)+buildChip('API',true)
    +buildChip('Fintech',false)+buildChip('Open Source',false)+'</div></div></div>'
    +'<div class="vcd-action-bar"><button class="btn-primary-sm" id="merc-go">Import VCs</button>'
    +'<span class="vcd-note" id="merc-status"></span></div></div>';
  openViewer({title:'Mercury Import',bodyHtml:body,afterBind:function(el){
    el.querySelectorAll('.vcd-chip').forEach(function(c){c.onclick=function(){c.classList.toggle('active');};});
    el.querySelector('#merc-go').onclick=runMercuryImport;
  }});
}
async function runMercuryImport(){
  var btn=document.getElementById('merc-go'),st=document.getElementById('merc-status');
  btn.disabled=true;btn.textContent='Importing…';
  try{
    var r=await fetch('/api/jobs/run',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jobId:'8b738e60-10f2-4e72-987f-179757f3b8c4'})});
    if(r.ok){st.textContent='✓ Import running';toast('Mercury import started');
      setTimeout(function(){closeViewer();refreshInvestorsTab();},2000);
    } else throw new Error('job failed');
  }catch(e){
    var rows=await dbQuery("SELECT count(*) as c FROM investors WHERE notes LIKE '%Mercury%'");
    var c=rows[0]?.c||0;
    st.textContent=c>0?'✓ '+c+' Mercury VCs already imported':'Import requires Mercury job setup';
    toast(c>0?c+' Mercury VCs in pipeline':'Set up Mercury scraper first');
    btn.textContent='Done';
    setTimeout(function(){closeViewer();refreshInvestorsTab();},1500);
  }
}
function openExtImport(name,url){
  var body='<div class="vcd-import" style="text-align:center;padding:30px 0">'
    +'<a href="'+url+'" target="_blank" class="btn-primary-sm" style="display:inline-flex;padding:10px 20px">Open '+name+'</a>'
    +'<p class="vcd-note" style="margin-top:12px">Browse, export CSV, then drag into data room</p></div>';
  openViewer({title:name,bodyHtml:body,afterBind:function(){}});
}


