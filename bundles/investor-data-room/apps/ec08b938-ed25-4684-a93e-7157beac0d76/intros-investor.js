// Investor intros — sub-tabs: Customer Intros + VC Intros
async function renderInvestorIntrosTab(link) {
  var connectors = await dbQuery("SELECT * FROM connectors WHERE is_curated=1");
  var myC = null, pName = (link.partner_name || '').toLowerCase();
  connectors.forEach(function(c) {
    if (pName && c.name.toLowerCase().indexOf(pName.split(' ')[0].toLowerCase()) >= 0) myC = c;
  });
  var hasPaths = false;
  if (myC) {
    var paths = await dbQuery("SELECT * FROM intro_pathways WHERE connector_id=?", [myC.id]);
    hasPaths = paths.length > 0;
  }
  // Visibility rules:
  //   Investors: Customer Intros always visible, VC Intros HIDDEN unless closed (e14/Techstars)
  //   Closed investors (e14, Techstars): see both Customer Intros and VC Intros
  var isPostClose = link.commit_mode === 'post_close';
  var showCust = true;
  var showVC = isPostClose && hasPaths;
  var showVCLocked = false; // Never show blurred VC Intros teaser
  var tabs = '';
  if (showVC || showVCLocked) {
    tabs = '<div class="tabs ist-tabs"><button class="tab active" data-ist="cust">Customer Intros</button>'
      + '<button class="tab" data-ist="vc">VC Intros</button></div>';
  }
  var cust = await renderCustomerIntrosSection(link);
  var vc = showVC ? await renderVCIntrosSection(myC) : '';
  var vcLocked = showVCLocked ? renderLockedVCIntrosTeaser(link) : '';
  var vcContent = vc || vcLocked;
  await loadBlurb();
  if (showVC || showVCLocked) {
    return renderBlurbCard(false) + tabs
      + '<div id="ist-cust" class="ist-panel active">' + cust + '</div>'
      + '<div id="ist-vc" class="ist-panel" style="display:none">' + vcContent + '</div>';
  }
  return renderBlurbCard(false) + cust;
}

function renderLockedVCIntrosTeaser(link) {
  var lockIcon = (window.ICONS && window.ICONS.lock_sec) || '';
  var pFirst = (link.partner_name || '').split(' ')[0] || 'Partner';
  var calUrl = window.CALENDLY_URL || '';
  var calIcon = (window.ICONS && window.ICONS.calendar) || '';
  var teaserNames = ['VC-to-VC Warm Intros', 'Co-investor Connections', 'Follow-on Syndicate Paths'];
  var rows = teaserNames.map(function(n) {
    return '<div class="doc-row doc-row-locked">'
      + '<span class="doc-icon-svg lock-doc-icon">' + lockIcon + '</span>'
      + '<div class="doc-info"><span class="doc-name blurred-text">' + esc(n) + '</span>'
      + '<span class="doc-desc">Unlocks after verbal commit</span></div>'
      + '<span class="locked-pill">Locked</span></div>';
  }).join('');
  return '<div class="section section-locked">'
    + '<div class="section-header"><span class="sec-icon lock-sec-icon">' + lockIcon + '</span>'
    + '<div class="section-header-text">'
    + '<span class="section-label">VC Intros</span>'
    + '<span class="section-desc">Warm paths to other investors via ' + esc(pFirst)
    + ' · unlocked post verbal commit</span>'
    + '</div></div>'
    + '<div class="section-docs">' + rows + '</div>'
    + '<div class="locked-cta-wrap">'
    + '<a href="' + esc(calUrl) + '" target="_blank" class="locked-cta-btn">'
    + calIcon + '<span>Verbally commit to unlock</span></a>'
    + '<span class="locked-cta-hint">Once you commit, we\'ll unlock VC intro paths and co-investor connections.</span>'
    + '</div></div>';
}

async function renderCustomerIntrosSection(link) {
  var portfolio = [];
  try {
    var pid = link.partner_id || '';
    if (pid) portfolio = await dbQuery(
      "SELECT * FROM vc_portfolio WHERE partner_id=? ORDER BY verified DESC, icp_match_score DESC", [pid]);
  } catch(e) {}
  if (!portfolio.length) return '<div class="intros-investor">'
    + '<p style="text-align:center;color:var(--muted);padding:40px 0">Portfolio analysis coming soon.</p></div>';
  // Show top portfolio matches — verified first, then any with a score > 0
  var verified = portfolio.filter(function(p) { return p.verified == 1; });
  var unverified = portfolio.filter(function(p) { return p.verified != 1 && (p.icp_match_score || 0) > 0; });
  var pFirst = (link.partner_name || '').split(' ')[0] || 'the partner';
  var topLabel = verified.length ? 'verified' : 'ICP matches';
  var topList = verified.length ? verified : unverified.slice(0, 8);
  var extra = verified.length ? unverified : unverified.slice(8);
  // Compute avg customer intros sent by other VCs (from intros table)
  var avgIntros = 0;
  try {
    var rows = await dbQuery(
      "SELECT COUNT(*) AS n, COUNT(DISTINCT investor_id) AS vcs FROM intros "
      + "WHERE status IN ('sent','accepted','meeting_booked','closed_won')");
    if (rows && rows[0] && rows[0].vcs > 0) avgIntros = Math.round(rows[0].n / rows[0].vcs);
  } catch(e) {}
  // Email intro is always available (only requires company name + a VC partner name)
  var canIntro = true;
  var vCards = buildPortCards(topList, link, pFirst, canIntro);
  var uCards = extra.length ? '<div class="ic-header" style="margin-top:32px">'
    + '<span class="section-label">Other Portfolio Companies</span>'
    + '<span class="ic-count">' + extra.length + ' more</span></div>'
    + buildPortCards(extra, link, pFirst, canIntro) : '';
  var banner = typeof buildIntroStatsBanner === 'function'
    ? buildIntroStatsBanner(pFirst, topList.length, avgIntros) : '';
  return '<div class="intros-investor">' + banner
    + '<div class="ic-header">'
    + '<span class="section-label">Portfolio Companies · ICP Matches</span>'
    + '<span class="ic-count">' + topList.length + ' ' + topLabel + '</span></div>'
    + '<p style="font-size:13px;color:var(--muted);margin:0 0 16px">'
    + 'Companies ' + pFirst + ' has invested in that could benefit from Papr · '
    + '<em>one click opens your mail app with Papr CC\'d</em></p>'
    + vCards + uCards + '</div>';
}

function bindInvestorIntrosEvents(el) {
  bindBlurbEvents(el, false);
  el.querySelectorAll('.ist-tabs .tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      el.querySelectorAll('.ist-tabs .tab').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      el.querySelectorAll('.ist-panel').forEach(function(p) { p.style.display = 'none'; });
      var t = document.getElementById('ist-' + btn.dataset.ist);
      if (t) t.style.display = 'block';
    });
  });
  el.querySelectorAll('.inv-row-wrap').forEach(function(w) {
    var row = w.querySelector('.inv-row');
    if (row) row.onclick = function(){ w.classList.toggle('expanded'); };
  });
}


