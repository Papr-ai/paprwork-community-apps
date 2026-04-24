// Portfolio card builders for investor intros
function buildPortCards(list, link, pFirst, canIntro) {
  return list.map(function(p) {
    var sc = p.icp_match_score||0, cl = sc>=55?'#34d399':sc>=45?'#fbbf24':'#9ca3af';
    var dom = p.domain||(p.company_url||'').replace(/^https?:\/\//,'').replace(/\/.*/,'');
    var logo = dom?'<img src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://'+esc(dom)+'&size=128" class="ic-logo" onerror="this.style.display=\'none\'">':'';
    var badge = p.verified==1?'<span class="ic-verified"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>':'';
    var siteIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    var siteLink = dom?'<a href="https://'+esc(dom)+'" target="_blank" rel="noopener" class="ic-site-link" title="'+esc(dom)+'" onclick="event.stopPropagation()">'+siteIcon+'</a>':'';
    var oneLiner = (p.description||'').replace(/\s+/g,' ').trim();
    if(oneLiner.length>140) oneLiner=oneLiner.slice(0,137).replace(/[,.;:\s]+\S*$/,'')+'…';
    var sub = oneLiner||dom||'';
    var fn = p.founder_name&&p.founder_name!='(Unverified)'?p.founder_name:'';
    var fli = fn&&p.founder_linkedin?'<a href="'+esc(p.founder_linkedin)+'" target="_blank" class="ic-li-link" title="LinkedIn">in</a>':'';
    var btn = canIntro?buildMailBtn(p,link,pFirst):'';
    return '<div class="ic-card glass">'+logo+'<div class="ic-info">'
      +'<span class="ic-name">'+esc(p.company_name)+badge+siteLink+'</span>'
      +(sub?'<span class="ic-sub">'+esc(sub)+'</span>':'')
      +(fn?'<span class="ic-meta">'+esc(fn)+fli+'</span>':'')
      +'</div><div class="ic-right"><div style="text-align:right">'
      +'<span class="ic-score" style="color:'+cl+'">'+sc+'%</span>'
      +'<span style="font-size:10px;color:var(--muted);display:block">ICP</span></div>'
      +btn+'</div></div>';
  }).join('');
}

function buildMailBtn(p, link, pFirst) {
  var who = p.founder_name && p.founder_name !== '(Unverified)'
    ? 'the team at '+p.company_name : 'the '+p.company_name+' team';
  var sub = 'Intro? '+p.company_name+' <> Papr';
  var body = 'Hi '+pFirst+',\n\n'
    + 'Would you be open to a quick intro to '+who+'?\n\n'
    + 'We\'re building Papr — the memory layer that turns a team\'s data into working intelligence '
    + '(no ML engineers required). #1 on Stanford STARK, and we\'ve seen real pull from teams like '
    + p.company_name+' that are already shipping AI products and running into memory/context limits.\n\n'
    + 'Happy to share a 2-min Loom or a one-pager you can forward — whatever\'s easiest. '
    + 'I\'ve CC\'d the Papr team so they can take it from here.\n\n'
    + 'Thanks!\n[Your name]';
  var href='mailto:?cc='+encodeURIComponent(window.FOUNDER_EMAILS||'')
    +'&subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body);
  var mailIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  return '<a href="'+href+'" class="ic-email-btn" title="Opens your mail app with Papr CC\'d">'
    + mailIcon + '<span>Email Intro</span></a>';
}

function buildIntroStatsBanner(pFirst, matchCount, avgIntros) {
  var avgTxt = avgIntros > 0
    ? '<strong>' + avgIntros + '</strong> · avg intros other VCs have sent us'
    : 'One-click intro · Papr team CC\'d automatically';
  return '<div class="ic-stats-banner glass">'
    + '<div class="ic-stat"><span class="ic-stat-num">' + matchCount + '</span>'
    + '<span class="ic-stat-lbl">ICP matches in ' + esc(pFirst) + '\'s portfolio</span></div>'
    + '<div class="ic-stat-divider"></div>'
    + '<div class="ic-stat"><span class="ic-stat-num">⚡</span>'
    + '<span class="ic-stat-lbl">' + avgTxt + '</span></div>'
    + '</div>';
}
