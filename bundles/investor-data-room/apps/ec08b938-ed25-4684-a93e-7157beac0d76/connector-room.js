async function renderConnectorRoom(el, conn) {
  const [company, raise, sections, allDocs, team] = await Promise.all([
    loadCompany(), loadRaise(), loadSections(), loadAllDocs(), loadTeam()
  ]);
  await loadBlurb();
  const vs = sections;
  const byS = {};
  allDocs.forEach(d => { (byS[d.section_id] = byS[d.section_id] || []).push(d); });
  const calUrl = (window.ROOM_DATA && window.ROOM_DATA.calendly_url) || '';
  const urlMode = (new URLSearchParams(window.location.search)).get('mode');
  const isPreCommit = urlMode === 'pre' || urlMode === 'pre_commit';
  const LOCKED_DOC_NAMES = ['Cap Table', 'Cap table'];
  // Map connector to link format so buildVCBanner works
  const fakeLink = {
    partner_name: conn.name || '',
    partner_title: conn.title || '',
    partner_photo: conn.photo_url || '',
    partner_linkedin: conn.linkedin || '',
    fund_name: conn.company || '',
    logo_url: '', partner_id: '',
    is_connector: true,
    connector_id: conn.id,
    connector_name: conn.name
  };
  // Build VC intros only
  var paths = (window.ROOM_DATA && window.ROOM_DATA.vc_intro_paths||[])
    .filter(p => String(p.connector_id) === String(conn.id));
  var byVC = {};
  paths.forEach(p => {
    var k = p.investor_id;
    if(!byVC[k]) byVC[k]={vc:p.investor_name,logo:p.vc_logo,ppl:[]};
    byVC[k].ppl.push(p);
  });
  var vcKeys = Object.keys(byVC);
  var totalP = paths.length, totalV = vcKeys.length;
  var firstName = (conn.name||'').split(' ')[0];
  // All sections unlocked for connectors
  el.innerHTML = renderHeader(company)
    + '<div class="container investor-room">'
    + '<nav class="tabs"><button class="tab active" data-tab="inv-room">Room</button>'
    + (totalP > 0 ? '<button class="tab" data-tab="inv-intros">Intros ('+totalP+')</button>' : '')
    + '</nav>'
    + '<div id="tab-inv-room" class="tab-content active">'
    + buildVCBanner(fakeLink, false)
    + (raise.hide_from_vc ? '' : renderRaiseBar(raise, false))
    + buildCompanyHero(company)
    + vs.map(function(s){
        var docs = byS[s.id] || [];
        if (isPreCommit && s.id === 'legal') {
          var names = docs.map(function(d){return d.name;});
          if (!names.length) names = ['Legal documents'];
          return renderLockedSection(s, names, calUrl);
        }
        if (isPreCommit && s.id === 'team') {
          var shown = docs.filter(function(d){return LOCKED_DOC_NAMES.indexOf(d.name)===-1;});
          var hidden = docs.filter(function(d){return LOCKED_DOC_NAMES.indexOf(d.name)!==-1;}).map(function(d){return d.name;});
          if (!hidden.length) hidden = ['Cap Table'];
          return renderSectionWithLockedRows(s, shown, hidden, calUrl);
        }
        return renderSection(s, docs, false);
      }).join('')
    + '<div class="team-section"><div class="section-header">'
    + '<span class="sec-icon">' + getSectionIcon('Team & Cap Table') + '</span>'
    + '<div class="section-header-text"><span class="section-label">Founding team</span>'
    + '</div></div>'
    + '<div class="team-grid">'
    + team.map(function(m){return renderTeamCard(m)}).join('')
    + '</div></div></div>'
    + (totalP > 0 ? '<div id="tab-inv-intros" class="tab-content"></div>' : '')
    + '</div>'
    + '<footer class="footer"><span class="footer-text">Confidential</span>'
    + '<a href="https://papr.ai" target="_blank" class="footer-badge"><svg class="footer-badge-icon" width="16" height="16" viewBox="0 0 512 512" fill="none"><path d="M171.096 395.341C31.7049 595.509 96.9894 216.431 225.445 250.088C422.668 301.763 478.75 109.362 367.589 65.0769C214.395 4.04686 255.79 266.03 171.096 395.341Z" stroke="url(#papr-g2)" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="papr-g2" x1="133.058" y1="352.55" x2="316.156" y2="163.438" gradientUnits="userSpaceOnUse"><stop stop-color="#0161E0"/><stop offset="0.6" stop-color="#0CCDFF"/><stop offset="1" stop-color="#00FEFE"/></linearGradient></defs></svg>Built on Paprwork</a></footer>';
  bindInvestorViewEvents(el, fakeLink);
  bindBlurbEvents(el, false);
}

function buildCompanyHero(company) {
  return '<div class="company-hero glass">'
    + '<div class="company-name-logo">'
    + '<div class="hero-logo-dark">'+(window.COMPANY_LOGO_DARK||'')+'</div>'
    + '<div class="hero-logo-light">'+(window.COMPANY_LOGO_LIGHT||'')+'</div>'
    + '</div>'
    + '<p class="company-tagline">'+esc(company.tagline)+'</p>'
    + '<p class="company-overview">'+esc(company.overview)+'</p>'
    + '<div class="company-links">'
    + (company.website?'<a href="'+esc(company.website)+'" target="_blank" class="link-pill">Website</a>':'')
    + (company.linkedin?'<a href="'+esc(company.linkedin)+'" target="_blank" class="link-pill">LinkedIn</a>':'')
    + '</div></div>';
}

// Connector Intros tab now reuses renderVCIntrosSection (intros-vc-paths.js)
// for consistent design across investor and connector views.
