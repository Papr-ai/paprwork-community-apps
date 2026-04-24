(async function init() {
  const el = document.getElementById('app');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (window.ROOM_LINK) {
    try {
      if (window.ROOM_LINK.is_connector) {
        await renderConnectorRoom(el, window.ROOM_LINK);
      } else {
        await renderInvestorRoom(el, window.ROOM_LINK);
      }
    }
    catch(e) { el.innerHTML = '<pre style="color:red;padding:40px">RENDER ERROR: '+e.message+'\n'+e.stack+'</pre>'; }
    return;
  }

  await loadVercelUrl();
  if (typeof syncPhotosToDb === 'function') syncPhotosToDb();

  if (token) {
    const links = await dbQuery("SELECT il.*, i.name as fund_name, i.logo_url, i.fund_url, i.passcode, i.stage as inv_stage, vp.name as partner_name, vp.title as partner_title, vp.photo_url as partner_photo, vp.linkedin_url as partner_linkedin, vp.bio as partner_bio FROM investor_links il JOIN investors i ON il.investor_id = i.id LEFT JOIN vc_partners vp ON il.partner_id = vp.id WHERE il.token=? AND il.revoked=0", [token]);
    if (!links.length) {
      el.innerHTML = '<div class="error-view"><h2>Link expired or revoked</h2><p>Contact the founder for a new link.</p></div>';
      return;
    }
    await renderInvestorRoom(el, links[0]);
  } else {
    await renderFounderView(el);
  }
})();

async function renderInvestorRoom(el, link) {
  const [company, raise, sections, allDocs, team] = await Promise.all([
    loadCompany(), loadRaise(), loadSections(), loadAllDocs(), loadTeam()
  ]);
  await loadBlurb();
  const visible = JSON.parse(link.sections_visible || '[]');
  const vs = visible.length ? sections.filter(s => visible.includes(s.id)) : sections;
  const byS = {};
  allDocs.forEach(d => { (byS[d.section_id] = byS[d.section_id] || []).push(d); });
  // Mode from URL: ?mode=pre → locked; default → unlocked (post-commit)
  const urlMode = (new URLSearchParams(window.location.search)).get('mode');
  const isPreCommit = urlMode === 'pre' || urlMode === 'pre_commit';
  const calUrl = (window.ROOM_DATA && window.ROOM_DATA.calendly_url) || '';
  // Pre-commit locks Cap Table doc (inside Team section) + entire Legal section
  const LOCKED_DOC_NAMES = ['Cap Table', 'Cap table'];

  const logo = link.logo_url
    ? '<img src="'+esc(link.logo_url)+'" class="inv-room-logo" alt="'+esc(link.fund_name)+'" onerror="this.style.display=\'none\'">'
    : '';

  el.innerHTML = renderHeader(company)
    + '<div class="container investor-room">'
    + '<nav class="tabs"><button class="tab active" data-tab="inv-room">Room</button>'
    + '<button class="tab" data-tab="inv-intros">Intros</button></nav>'
    + '<div id="tab-inv-room" class="tab-content active">'
    + (link.partner_name ? buildVCBanner(link, !window.ROOM_LINK) : '<div class="inv-room-personalized">'+logo
    + '<span class="inv-room-prepared">Prepared for '+esc(link.fund_name)+'</span></div>')
    + (raise.hide_from_vc ? '' : renderRaiseBar(raise, false))
    + '<div class="company-hero glass">'
    + '<div class="company-name-logo"><div class="hero-logo-dark">'+(window.COMPANY_LOGO_DARK||'')+'</div><div class="hero-logo-light">'+(window.COMPANY_LOGO_LIGHT||'')+'</div></div>'
    + '<p class="company-tagline">'+esc(company.tagline)+'</p>'
    + '<p class="company-overview">'+esc(company.overview)+'</p>'
    + '<div class="company-links">'
    + (company.website ? '<a href="'+esc(company.website)+'" target="_blank" class="link-pill">Website</a>' : '')
    + (company.linkedin ? '<a href="'+esc(company.linkedin)+'" target="_blank" class="link-pill link-pill-icon link-pill-li"><svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a>' : '')
    + (company.substack ? '<a href="'+esc(company.substack)+'" target="_blank" class="link-pill link-pill-icon link-pill-ss"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FF6719"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>Substack</a>' : '')
    + '</div></div>'
    + vs.map(function(s){
        var docs = byS[s.id] || [];
        if (isPreCommit && s.id === 'legal') {
          var names = docs.map(function(d){return d.name;});
          if (!names.length) names = ['Legal documents'];
          return renderLockedSection(s, names, calUrl);
        }
        if (isPreCommit && s.id === 'team') {
          var shown = docs.filter(function(d){return LOCKED_DOC_NAMES.indexOf(d.name) === -1;});
          var hidden = docs.filter(function(d){return LOCKED_DOC_NAMES.indexOf(d.name) !== -1;}).map(function(d){return d.name;});
          if (!hidden.length) hidden = ['Cap Table'];
          return renderSectionWithLockedRows(s, shown, hidden, calUrl);
        }
        return renderSection(s, docs, false);
      }).join('')
    + '<div class="team-section"><div class="section-header"><span class="sec-icon">' + getSectionIcon('Team & Cap Table') + '</span><div class="section-header-text"><span class="section-label">Founding team</span></div></div>'
    + '<div class="team-grid">'+team.map(function(m){return renderTeamCard(m)}).join('')+'</div></div>'
    + '</div>'
    + '<div id="tab-inv-intros" class="tab-content"></div>'
    + '</div>'
    + '<footer class="footer"><span class="footer-text">Confidential</span><a href="https://papr.ai" target="_blank" class="footer-badge"><svg class="footer-badge-icon" width="16" height="16" viewBox="0 0 512 512" fill="none"><path d="M171.096 395.341C31.7049 595.509 96.9894 216.431 225.445 250.088C422.668 301.763 478.75 109.362 367.589 65.0769C214.395 4.04686 255.79 266.03 171.096 395.341Z" stroke="url(#papr-g)" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="papr-g" x1="133.058" y1="352.55" x2="316.156" y2="163.438" gradientUnits="userSpaceOnUse"><stop stop-color="#0161E0"/><stop offset="0.6" stop-color="#0CCDFF"/><stop offset="1" stop-color="#00FEFE"/></linearGradient></defs></svg>Built on Paprwork</a></footer>';

  // Log view + bind events
  if (link.id) dbWrite("INSERT INTO view_events (link_id,investor_id,event_type) VALUES (?,?,'view')", [link.id, link.investor_id]).catch(function(){});
  bindInvestorViewEvents(el, link);
  bindBlurbEvents(el, false);
  if (typeof initPhotoUpload === 'function') initPhotoUpload();
}
