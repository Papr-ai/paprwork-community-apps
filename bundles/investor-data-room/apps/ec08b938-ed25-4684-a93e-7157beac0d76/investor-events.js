// Investor view events — tab switching, doc clicks, intros lazy load, share links

async function generatePartnerShareLink(investorId,partnerId,fundName){
  var existing=await dbQuery("SELECT token FROM investor_links WHERE investor_id=? AND partner_id=? AND revoked=0 LIMIT 1",[investorId,partnerId]);
  var token;
  if(existing.length){ token=existing[0].token; }
  else {
    token=crypto.randomUUID();var id=crypto.randomUUID();
    var sects=JSON.stringify(['overview','traction','financials','team','legal']);
    await dbWrite("INSERT INTO investor_links (id,investor_id,partner_id,token,sections_visible) VALUES (?,?,?,?,?)",[id,investorId,partnerId,token,sects]);
  }
  showShareModeDialog(fundName, token, async function(mode, url){
    await navigator.clipboard.writeText(url);
    toast((mode === 'post' ? 'Unlocked link' : 'Pre-commit link')+' copied for '+fundName);
  });
}

function bindInvestorViewEvents(el, link) {
  // Tab switching
  var invIntrosLoaded = false;
  el.querySelectorAll('.tab').forEach(function(t) {
    t.addEventListener('click', async function() {
      el.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
      t.classList.add('active');
      el.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active')});
      var target = document.getElementById('tab-'+t.dataset.tab);
      if (target) target.classList.add('active');
      if (t.dataset.tab === 'inv-intros' && !invIntrosLoaded) {
        invIntrosLoaded = true;
        if (link.is_connector) {
          // Connector view: reuse same renderVCIntrosSection for consistent design
          var connObj = {id: link.connector_id, name: link.connector_name || link.partner_name};
          target.innerHTML = await renderVCIntrosSection(connObj);
          bindInvestorIntrosEvents(el, link);
        } else {
          target.innerHTML = await renderInvestorIntrosTab(link);
          bindInvestorIntrosEvents(el, link);
        }
      }
    });
  });

  // Init fold
  if (typeof initFold === 'function') initFold();

  // Bind clickable doc rows — immediate, no async dependency
  var docHandlers = {
    'One-Pager':     function() { openOnePager(false); },
    'FAQ':           function() { openFAQ(false); },
    'Pitch Deck':    function() { openDeck(false); },
    'Customer Data': function() { openCustomerData(false); },
    'Ideal Customer Profile': function() { openICP(false); },
    'Competitive Analysis': function() { openCompAnalysis(false); },
    'Moat & Defensibility': function() { openMoat(false); },
    'Go-to-Market Strategy': function() { openGTM(false); },
    'Financial Model': function() { openFinancials(false); },
    'Use of Funds': function() { openFinancials(false, 2); }
  };
  el.querySelectorAll('.doc-row').forEach(function(row) {
    var nameEl = row.querySelector('.doc-name');
    if (!nameEl) return;
    var name = nameEl.textContent.replace(/lock/g,'').trim();
    if (docHandlers[name]) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', docHandlers[name]);
    }
    if (name === 'Product Demo') {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        loadDemos().then(function(d) { if(d.length) openDemoViewer(d); });
      });
    }
    if (name === 'Investment Memo') {
      row.style.cursor = 'pointer';
      var stage = link.inv_stage || link.stage || '';
      if (!canAccessMemo(stage)) row.classList.add('doc-row-locked');
      row.addEventListener('click', function() { openMemo(false, stage); });
    }
  });
}