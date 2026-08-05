async function renderFounderView(el) {
  var data = await Promise.all([
    loadCompany(), loadRaise(), loadSections(), loadAllDocs(), loadTeam(), loadInvestors(), loadPartners()
  ]);
  var company = data[0], raise = data[1], sections = data[2], allDocs = data[3], team = data[4], investors = data[5], partners = data[6];
  var docsBySection = {};
  allDocs.forEach(function(d) { (docsBySection[d.section_id] = docsBySection[d.section_id] || []).push(d); });

  el.innerHTML =
    renderHeader(company) +
    '<div class="container">' +
    '<nav class="tabs">' +
    '<button class="tab active" data-tab="room">Room</button>' +
    '<button class="tab" data-tab="investors">Investors</button>' +
    '<button class="tab" data-tab="intros">Intros</button></nav>' +
    '<div id="tab-room" class="tab-content active">' +
    renderRaiseBar(raise, true) +
    '<div class="raise-actions">' +
    '<button class="btn-sm glass" id="edit-raise">Edit raise</button>' +
    '<button class="ob-reset-btn" onclick="window.showBuildOverlay?window.showBuildOverlay():void 0" title="Setup wizard"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg></button>' +
    '<button class="btn-primary-sm" id="publish-btn">Publish</button></div>' +
    '<div class="company-hero glass" style="position:relative">' +
    '<button class="hover-edit-btn" id="edit-summary">Edit</button>' +
    '<div class="company-name-logo"><div class="hero-logo-dark">' + (window.COMPANY_LOGO_DARK || '') + '</div><div class="hero-logo-light">' + (window.COMPANY_LOGO_LIGHT || '') + '</div></div>' +
    '<p class="company-tagline">' + esc(company.tagline) + '</p>' +
    '<p class="company-overview">' + esc(company.overview) + '</p>' +
    '<div class="company-links">' +
    (company.website ? '<a href="' + esc(company.website) + '" target="_blank" class="link-pill">Website</a>' : '') +
    (company.linkedin ? '<a href="' + esc(company.linkedin) + '" target="_blank" class="link-pill link-pill-icon link-pill-li"><svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a>' : '') +
    (company.substack ? '<a href="' + esc(company.substack) + '" target="_blank" class="link-pill link-pill-icon link-pill-ss"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FF6719"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>Substack</a>' : '') +
    '</div></div>' +
    sections.map(function(s) { return renderSection(s, docsBySection[s.id] || [], true); }).join('') +
    '<div class="team-section"><div class="section-header"><span class="sec-icon">' + getSectionIcon('Team & Cap Table') + '</span><div class="section-header-text"><span class="section-label">Team</span></div></div>' +
    '<div class="team-grid">' + team.map(function(m) { return renderTeamCard(m); }).join('') + '</div></div>' +
    '</div>' +
    '<div id="tab-investors" class="tab-content">' + renderInvestorsTab(investors, partners) + '</div>' +
    '<div id="tab-intros" class="tab-content"></div>' +
    '</div>' +
    '<footer class="footer"><span class="footer-text">Confidential</span></footer>';

  bindFounderEvents(el, company, raise);
  bindPhotoUploads();
  bindPartnerPhotoUploads();
  if (typeof bindInvLogoUploads === 'function') bindInvLogoUploads();
  if (typeof initFold === 'function') initFold();
  // Lazy-load intros tab with sub-tabs
  var introsLoaded = false;
  el.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', async function(){
      if (t.dataset.tab === 'intros' && !introsLoaded) {
        introsLoaded = true;
        var ie = document.getElementById('tab-intros');
        await loadBlurb();
        var custHtml = await renderFounderIntrosTab();
        var vcHtml = await renderVCIntrosTab();
        ie.innerHTML = renderBlurbCard(true) +
          '<div class="tabs ist-tabs" style="margin-bottom:24px">' +
          '<button class="tab active" data-sub="cust">Customer Intros</button>' +
          '<button class="tab" data-sub="vc">VC Intros</button></div>' +
          '<div class="ist-panel active" id="ip-cust">' + custHtml + '</div>' +
          '<div class="ist-panel" id="ip-vc" style="display:none">' + vcHtml + '</div>';
        bindBlurbEvents(ie, true);
        bindFounderIntrosEvents(ie);
        bindVCIntroEvents(ie);
        _bindIntroSubtabs(ie);
      }
    });
  });

  // Bind clickable doc rows — immediate, no async dependency
  var docHandlers = {
    'One-Pager': function() { openOnePager(true); },
    'Investment Memo': function() { openMemo(true); },
    'Pitch Deck': function() { openDeck(true); },
    'FAQ': function() { openFAQ(true); },
    'Customer Data': function() { openCustomerData(true); },
    'Ideal Customer Profile': function() { openICP(true); },
    'Competitive Analysis': function() { openCompAnalysis(true); },
    'Moat & Defensibility': function() { openMoat(true); },
    'Go-to-Market Strategy': function() { openGTM(true); },
    'Financial Model': function() { openFinancials(true); },
    'Use of Funds': function() { openFinancials(true, 2); },
    'Product Demo': function() { loadDemos().then(function(d) { if(d.length) openDemoViewer(d); }); }
  };
  el.querySelectorAll('.doc-row').forEach(function(row) {
    var nameEl = row.querySelector('.doc-name');
    if (!nameEl) return;
    var handler = docHandlers[nameEl.textContent.trim()];
    if (handler) { row.style.cursor = 'pointer'; row.addEventListener('click', handler); }
  });
}

function bindFounderEvents(el, company, raise) {
  el.querySelectorAll('.tab').forEach(function(t) {
    t.addEventListener('click', function() {
      el.querySelectorAll('.tab, .tab-content').forEach(function(e) { e.classList.remove('active'); });
      t.classList.add('active');
      el.querySelector('#tab-' + t.dataset.tab).classList.add('active');
    });
  });
  el.querySelector('#edit-raise')?.addEventListener('click', function() { showRaiseModal(raise); });
  el.querySelector('#edit-summary')?.addEventListener('click', function() { showSummaryEditModal(company); });
  el.querySelectorAll('.team-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var name = btn.dataset.member;
      var member = (window.ROOM_DATA && window.ROOM_DATA.team || []).find(function(m) { return m.name === name; });
      if (member) showProfileEditModal(member);
    });
  });
  el.querySelector('#publish-btn')?.addEventListener('click', publishToVercel);
  el.querySelector('#raise-vis-btn')?.addEventListener('click', async function() {
    var cur = await dbQuery("SELECT hide_from_vc FROM raise_tracker WHERE id='current'");
    var hidden = cur.length && cur[0].hide_from_vc ? 0 : 1;
    await dbWrite("UPDATE raise_tracker SET hide_from_vc=? WHERE id='current'", [hidden]);
    renderFounderView(document.getElementById('app'));
  });
  el.querySelectorAll('.add-doc-btn').forEach(function(b) {
    b.addEventListener('click', function() { showAddDocModal(b.dataset.section); });
  });
  bindInvestorEvents(el);
}
