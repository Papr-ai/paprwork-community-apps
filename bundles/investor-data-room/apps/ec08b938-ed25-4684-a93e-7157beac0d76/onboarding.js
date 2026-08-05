// Onboarding — Template mode banner + Build Your Own overlay
(function(){

  // ── Check template mode (runs on every load, re-checks after DB loads) ──
  function isTemplateMode() {
    var co = (window.ROOM_DATA && window.ROOM_DATA.company) || {};
    return !co.name || co.name === 'Sleep AI' || co.name === 'NovaMind AI';
  }
  function isCustomMode() {
    try { return localStorage.getItem('dr-mode') === 'custom'; } catch(e){ return false; }
  }

  // ── Inject banner (called after app renders) ──
  function injectBanner() {
    if (document.getElementById('ob-banner')) return;
    if (!isTemplateMode() || isCustomMode()) return;

    var banner = document.createElement('div');
    banner.id = 'ob-banner';
    var companyName = (window.ROOM_DATA && window.ROOM_DATA.company && window.ROOM_DATA.company.name) || 'template';
    banner.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
      + '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'
      + '<span>Viewing the <strong>' + companyName + '</strong> template</span>'
      + '<span class="ob-banner-dot"></span>'
      + '<span class="ob-banner-vc">1,062 real VCs included</span>'
      + '<button class="ob-banner-btn" onclick="window.showBuildOverlay()">Build your own \u2192</button>';

    // Insert as first child of body (before the app content)
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // Try banner injection at multiple timings to catch app render
  setTimeout(injectBanner, 800);
  setTimeout(injectBanner, 2000);
  // Also re-check after DB data loads
  window.addEventListener('dr:data-loaded', injectBanner);

  // ── Global: allow re-triggering onboarding from anywhere ──
  window.resetOnboarding = function() {
    try { localStorage.removeItem('dr-mode'); localStorage.removeItem('dr-company-name'); } catch(e){}
    var old = document.getElementById('ob-banner');
    if (old) old.remove();
    injectBanner();
    if (typeof toast === 'function') toast('Template mode restored');
  };

  // ── Build Your Own overlay ──
  window.showBuildOverlay = function() {
    if (document.getElementById('ob-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ob-overlay';
    ov.innerHTML =
      '<div class="ob-card">'
      + '<button class="ob-close" onclick="window.closeBuildOverlay()">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
      + '</button>'

      // Icon
      + '<div class="ob-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6C8EEF" stroke-width="1.5">'
      + '<path d="M12 3v18m-7-7l7 7 7-7"/></svg></div>'

      + '<h2 class="ob-title">Make it yours</h2>'
      + '<p class="ob-desc">Tell Pen your company name and it builds your data room — overview, team, FAQ, sections — in under a minute.</p>'

      // Single input
      + '<div class="ob-input-wrap">'
      + '<input id="ob-company-input" class="ob-input" type="text" placeholder="Your company name" autocomplete="off" spellcheck="false" />'
      + '<button class="ob-go" id="ob-go-btn" onclick="window.startBuild()">Go</button>'
      + '</div>'

      // What happens next
      + '<div class="ob-detail">'
      + '<div class="ob-detail-row"><span class="ob-check">1</span>Pen replaces Sleep AI content with your company</div>'
      + '<div class="ob-detail-row"><span class="ob-check">2</span>You review and edit each section inline</div>'
      + '<div class="ob-detail-row"><span class="ob-check">3</span>1,062 VCs are already loaded — generate share links</div>'
      + '</div>'

      + '<p class="ob-or">or keep exploring the template — switch anytime</p>'
      + '</div>';
    document.body.appendChild(ov);
    setTimeout(function(){ document.getElementById('ob-company-input').focus(); }, 100);

    // Enter key triggers Go
    document.getElementById('ob-company-input').addEventListener('keydown', function(e){
      if (e.key === 'Enter') window.startBuild();
    });
  };

  window.closeBuildOverlay = function() {
    var el = document.getElementById('ob-overlay');
    if (el) { el.style.opacity = '0'; setTimeout(function(){ el.remove(); }, 250); }
  };

  window.startBuild = function() {
    var input = document.getElementById('ob-company-input');
    var name = (input && input.value || '').trim();
    if (!name) { input.classList.add('ob-input-error'); setTimeout(function(){ input.classList.remove('ob-input-error'); }, 600); return; }

    // Mark as custom mode
    try { localStorage.setItem('dr-mode', 'custom'); localStorage.setItem('dr-company-name', name); } catch(e){}

    // Remove banner + overlay
    var banner = document.getElementById('ob-banner');
    if (banner) banner.remove();
    window.closeBuildOverlay();

    // Send message to Pen via Paprwork bridge
    var msg = 'Set up my investor data room for ' + name + '. Replace all Sleep AI template content with ' + name + ' — company info, team, overview, FAQ, documents, and sections. Keep the 1,062 VCs and run fit scoring when done.';
    if (window.paprBridge && window.paprBridge.sendChat) {
      window.paprBridge.sendChat(msg);
    } else if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ type: 'papr:chat', message: msg }, '*');
    }

    // Show confirmation toast
    if (typeof toast === 'function') toast('Setting up ' + name + ' — check the chat');
  };
})();
