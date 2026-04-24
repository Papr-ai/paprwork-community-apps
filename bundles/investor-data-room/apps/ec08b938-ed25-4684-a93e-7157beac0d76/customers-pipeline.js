function renderPipelineWaterfall(pipeline) {
  var real = pipeline.filter(function(p){return p.name&&p.name.indexOf('Probability')<0;});
  var won = real.filter(function(p){return p.stage==='Won'||p.stage==='Won 🎉';});
  var active = real.filter(function(p){return p.stage!=='Won'&&p.stage!=='Won 🎉'&&p.stage!=='Lost';});
  var wonT = won.reduce(function(s,p){return s+(p.value||0);},0);
  var actT = active.reduce(function(s,p){return s+(p.value||0);},0);
  var wtT = active.reduce(function(s,p){return s+(p.weighted_value||0);},0);
  var CLR={'Lead':'#94a3b8','Discovery':'#a78bfa','Deep Dive':'#818cf8','Qualified':'#60a5fa',
    'Testing':'#34d399','Pilot Evaluation':'#34d399','Proposal/Contract':'#fbbf24','Won':'#22c55e','Won 🎉':'#22c55e'};
  var SO={'Won 🎉':0,'Won':0,'Pilot Evaluation':1,'Testing':1,'Deep Dive':2,'Discovery':2,'Qualified':3,'Proposal/Contract':3,'Lead':4};
  var sorted=won.concat(active.sort(function(a,b){
    var sa=SO[a.stage]!=null?SO[a.stage]:9, sb=SO[b.stage]!=null?SO[b.stage]:9;
    return sa!==sb?sa-sb:b.value-a.value;
  }));
  return '<div class="cd-pipeline"><span class="cd-chart-title">Sales Pipeline</span>'+
    '<div class="cd-pipe-summary">'+
    '<div class="cd-metric"><span class="cd-label">Closed Won</span><span class="cd-value cd-green">'+fmt(wonT)+'</span></div>'+
    '<div class="cd-metric"><span class="cd-label">Active</span><span class="cd-value">'+fmt(actT)+'</span></div>'+
    '<div class="cd-metric"><span class="cd-label">Weighted</span><span class="cd-value">'+fmt(wtT)+'</span></div></div>'+
    '<div class="pl-grid">'+sorted.slice(0,12).map(function(d){return _dealCard(d,CLR);}).join('')+'</div></div>';
}
function _dealCard(d,CLR){
  var c=CLR[d.stage]||'#94a3b8',w=d.stage==='Won'||d.stage==='Won 🎉';
  var dm=d.company_domain||(d.name||'').replace(/\s/g,'').toLowerCase()+'.com';
  var lg=d.company_logo||'https://www.google.com/s2/favicons?domain='+dm+'&sz=64';
  var av=d.contact_avatar||'';
  if(!av&&d.contact_email) av='https://unavatar.io/'+d.contact_email;
  var note=d.notes||'';
  var upgradeHtml='';
  if(note&&note.indexOf('upgrade')>=0){
    upgradeHtml='<div class="pl-upgrade"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0161E0" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'+
    '<span class="pl-upgrade-text">'+esc(note)+'</span></div>';
  }
  return '<div class="pl-card'+(w?' pl-won':'')+'">'+
    '<div class="pl-top"><img class="pl-logo" src="'+esc(lg)+'" onerror="this.style.display=\'none\'">'+
    '<div class="pl-inf"><span class="pl-nm">'+esc(d.name)+'</span>'+
    '<span class="pl-vl">'+fmt(d.value||0)+'</span></div>'+
    '<span class="pl-dot" style="background:'+c+'"></span></div>'+
    (d.contact_name?'<div class="pl-ct">'+(av?'<img class="pl-av" src="'+av+'" onerror="this.style.display=\'none\'">':'')+
    '<span class="pl-cn">'+esc(d.contact_name)+'</span></div>':'')+
    upgradeHtml+
    '<span class="pl-st" style="color:'+c+'">'+esc(d.stage)+'</span></div>';
}

function renderTopCustomers(customers) {
  if (!customers.length) return '';
  return '<div class="cd-customers"><span class="cd-chart-title">Top Customers by MRR</span>' +
    '<div class="cd-cust-list">' + customers.slice(0,5).map(function(c) {
      var domain = (c.email||'').split('@')[1] || '';
      var logo = c.company_logo || (domain ? 'https://www.google.com/s2/favicons?domain='+domain+'&sz=32' : '');
      return '<div class="cd-cust-row">' +
        (logo ? '<img class="cd-cust-logo" src="'+logo+'" alt="">' : '<div class="cd-cust-logo"></div>') +
        '<div class="cd-cust-info"><span class="cd-cust-name">' + esc(c.name) + '</span>' +
        '<span class="cd-cust-plan">' + esc(c.plan) + ' · ' + c.months_active + ' mo</span></div>' +
        '<span class="cd-cust-mrr">' + fmt(c.mrr) + '/mo</span></div>';
    }).join('') + '</div></div>';
}

function renderCaseStudies(cases) {
  if (!cases.length) return '';
  return '<div class="cd-cases"><span class="cd-chart-title">Case Studies</span>' +
    cases.map(function(cs) {
      var hero = cs.hero_photo ? '<div class="cd-case-hero"><img src="' +
        cs.hero_photo + '" alt=""><div class="cd-hero-overlay">' +
        '<img class="cd-case-logo-lg" src="' + esc(cs.logo_url) + '" alt="">' +
        '<span class="cd-hero-name">' + esc(cs.customer_name) + '</span></div></div>' :
        '<div class="cd-case-head"><img class="cd-case-logo" src="' + esc(cs.logo_url) +
        '" alt=""><span class="cd-case-name">' + esc(cs.customer_name) + '</span></div>';
      return '<div class="cd-case glass">' + hero +
        '<div class="cd-case-body">' +
        '<div class="cd-case-section"><span class="cd-case-label">Problem</span><p>' + esc(cs.problem) + '</p></div>' +
        '<div class="cd-case-section"><span class="cd-case-label">Solution</span><p>' + esc(cs.solution) + '</p></div>' +
        '<div class="cd-case-section"><span class="cd-case-label">Result</span><p>' + esc(cs.result) + '</p></div></div>' +
        (cs.quote ? '<blockquote class="cd-quote">"' + esc(cs.quote) + '"' +
        '<cite>— ' + esc(cs.quote_author) + ', ' + esc(cs.quote_role) + '</cite></blockquote>' : '') +
        '</div>';
    }).join('') + '</div>';
}
