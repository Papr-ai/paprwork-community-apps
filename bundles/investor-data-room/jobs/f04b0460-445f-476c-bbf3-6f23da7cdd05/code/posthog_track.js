// PostHog event tracking for investor data room pages (injected on Vercel)
(function() {
  if (typeof posthog === 'undefined') return;
  var L = window.ROOM_LINK || {};
  var token = L.token || new URLSearchParams(window.location.search).get('token') || 'unknown';
  var fund = L.fund_name || 'unknown';
  var partner = L.partner_name || '';
  var partnerTitle = L.partner_title || '';
  var logoUrl = L.logo_url || '';
  // Identify visitor with rich person properties
  posthog.identify(token, {
    fund_name: fund, partner_name: partner, partner_title: partnerTitle,
    logo_url: logoUrl, type: 'investor'
  });
  // Track section views via IntersectionObserver
  function observeSections() {
    var secs = document.querySelectorAll('.section');
    if (!secs.length || !window.IntersectionObserver) return;
    var seen = {};
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        var label = e.target.querySelector('.section-label');
        var name = label ? label.textContent.trim() : 'unknown';
        if (seen[name]) return; seen[name] = true;
        posthog.capture('dr_section_view', { section_name: name, fund_name: fund, partner_name: partner, token: token });
      });
    }, { threshold: 0.3 });
    secs.forEach(function(s) { obs.observe(s); });
    // Also observe fold sections (story fold, pitch deck, etc)
    document.querySelectorAll('.fold-section').forEach(function(f) {
      var inner = f.querySelector('.fold-section-inner');
      var fName = inner ? (inner.getAttribute('data-fold') || 'fold') : 'fold';
      obs.observe(f);
    });
  }
  // Track document clicks
  document.addEventListener('click', function(ev) {
    var row = ev.target.closest('.doc-row');
    if (!row) return;
    var nameEl = row.querySelector('.doc-name');
    var sec = row.closest('.section');
    var secLabel = sec ? sec.querySelector('.section-label') : null;
    posthog.capture('dr_doc_click', {
      doc_name: nameEl ? nameEl.textContent.trim() : 'unknown',
      section_name: secLabel ? secLabel.textContent.trim() : 'unknown',
      fund_name: fund, partner_name: partner, token: token
    });
  });
  // Track scroll depth + time
  var maxScroll = 0;
  window.addEventListener('scroll', function() {
    var h = document.body.scrollHeight - window.innerHeight;
    if (h > 0) { var pct = Math.round((window.scrollY / h) * 100); if (pct > maxScroll) maxScroll = pct; }
  });
  var start = Date.now();
  function sendExit() {
    posthog.capture('dr_session_end', {
      time_spent_seconds: Math.round((Date.now() - start) / 1000),
      scroll_depth_pct: maxScroll, fund_name: fund, partner_name: partner, token: token
    });
  }
  window.addEventListener('beforeunload', sendExit);
  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') sendExit(); });
  // Observe sections once DOM is ready
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', observeSections); }
  else { observeSections(); }
})();
