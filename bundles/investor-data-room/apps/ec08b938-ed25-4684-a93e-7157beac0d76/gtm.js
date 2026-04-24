// Go-to-Market viewer
function openGTM(isFounder) {
  var d = window.GTM_DATA; if (!d) return;
  var saved = localStorage.getItem('gtm_data_v1');
  if (saved) { try { Object.assign(d, JSON.parse(saved)); } catch(e){} }
  var body = '<div class="gtm-wrap">' +
    '<p class="gtm-headline">' + esc(d.headline) + '</p>' +
    '<p class="gtm-thesis">' + esc(d.thesis) + '</p>' +
    buildDistLoop(d.distribution) +
    buildCommunity(d.community) +
    buildPricing(d.pricing) +
    buildGrowth(d.growth) +
    buildUseFundsLink() +
    '</div>';
  openViewer({
    title: d.title,
    bodyHtml: body,
    markdown: buildGTMMarkdown(d),
    onEdit: isFounder ? function() { openGTMEditor(d); } : null
  });
  // Wire Use of Funds cross-link with retry
  var _founder = isFounder;
  function wireFundsLink(tries) {
    var link = document.getElementById('gtm-funds-nav');
    if (link) {
      link.style.cursor = 'pointer';
      link.onclick = function() {
        closeViewer();
        setTimeout(function() { openFinancials(_founder, 2); }, 300);
      };
    } else if (tries < 10) {
      setTimeout(function() { wireFundsLink(tries + 1); }, 100);
    }
  }
  wireFundsLink(0);
}

// Helper to navigate to a specific financial page
function goToFinPage(pgIdx) {
  var wrap = document.querySelector('.fn-wrap');
  if (!wrap) return;
  var dots = wrap.querySelectorAll('.fn-dot');
  var pages = wrap.querySelectorAll('.fn-page');
  if (!dots.length || !pages.length) return;
  pages.forEach(function(p) { p.classList.add('hidden'); });
  dots.forEach(function(d) { d.classList.remove('active'); });
  if (pages[pgIdx]) pages[pgIdx].classList.remove('hidden');
  if (dots[pgIdx]) dots[pgIdx].classList.add('active');
  var vb = document.querySelector('.vw-body');
  if (vb) vb.scrollTop = 0;
  var fd = window.FIN_DATA;
  if (pgIdx === 2 && typeof renderAllocChart === 'function' && fd) {
    renderAllocChart(fd.pages[2].allocation);
  }
}

function buildDistLoop(dist) {
  if (!dist || !dist.length) return '';
  var html = '<div class="gtm-section">' +
    '<span class="gtm-section-title">Unfair Distribution Loop</span>' +
    '<div class="gtm-dist-grid">';
  dist.forEach(function(ch) {
    html += '<div class="gtm-ch">' +
      '<span class="gtm-ch-icon">' + (window.ICONS[ch.icon] || ch.icon) + '</span>' +
      '<div class="gtm-ch-body">' +
      '<span class="gtm-ch-name">' + esc(ch.channel) + '</span>' +
      '<span class="gtm-ch-desc">' + esc(ch.desc) + '</span>' +
      '<span class="gtm-ch-detail">' + esc(ch.detail) + '</span>' +
      '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function buildCommunity(comm) {
  if (!comm || !comm.length) return '';
  var html = '<div class="gtm-section">' +
    '<span class="gtm-section-title">Community & Content</span>' +
    '<div class="gtm-comm-grid">';
  comm.forEach(function(c) {
    html += '<div class="gtm-comm">' +
      '<span class="gtm-comm-metric">' + esc(c.metric) + '</span>' +
      '<span class="gtm-comm-label">' + esc(c.label) + '</span>' +
      '</div>';
  });
  html += '</div></div>';
  return html;
}
