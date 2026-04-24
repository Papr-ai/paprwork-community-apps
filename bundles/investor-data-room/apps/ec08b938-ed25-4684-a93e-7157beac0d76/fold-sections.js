// Section content builders for fold narrative
function s0() {
  return '<p class="fold-question">What if AI could <span class="fold-gradient">sleep</span>?</p>' +
    '<p class="fold-sub">Not just run. Not just process. Actually rest and consolidate.</p>' +
    '<div class="fold-scroll-hint">SCROLL<div class="fold-scroll-arrow"></div></div>';
}
function s1() {
  return '<p class="fold-question">Every conversation.<br>Every decision.<br>Every <span class="fold-gradient">context</span>.</p>' +
    '<p class="fold-sub">Today, AI starts from zero every single time. No history. No patterns. No growth.</p>';
}
function s2() {
  return '<p class="fold-question">What if it could <span class="fold-gradient">dream</span>?</p>' +
    '<p class="fold-sub">Build on what came before. Connect insights across time. Get better with every interaction.</p>';
}
function s3() {
  return '<p class="fold-question">Not just faster.<br><span class="fold-gradient">Wiser.</span></p>' +
    '<p class="fold-sub">Memory that improves with scale. 92% retrieval accuracy. Under 150ms.</p>';
}
function s4() {
  return '<div class="fold-mission-label">WHAT BECOMES POSSIBLE</div>' +
    '<p class="fold-question">When AI has <span class="fold-gradient">memory that works</span></p>' +
    '<div class="fold-possible-grid">' +
    '<div class="fold-pcard"><div class="fold-pcard-title">Knowledge Never Dies</div><p class="fold-pcard-text">Every insight, decision, and lesson preserved and connected across agents, teams, and time.</p></div>' +
    '<div class="fold-pcard"><div class="fold-pcard-title">Wisdom Compounds</div><p class="fold-pcard-text">Like compound interest for intelligence. Each interaction makes the entire system smarter.</p></div>' +
    '<div class="fold-pcard"><div class="fold-pcard-title">Agent Fleets That Learn</div><p class="fold-pcard-text">Multi-agent systems with shared memory. Continuity, auditability, real collaboration.</p></div>' +
    '<div class="fold-pcard"><div class="fold-pcard-title">20 Watts of Wisdom</div><p class="fold-pcard-text">Memory that gets faster, more accurate, and more efficient at scale. Like the human brain.</p></div></div>';
}
function s5() {
  var founderImg = (typeof FOUNDER_PHOTO !== 'undefined') ? FOUNDER_PHOTO : '';
  var cofounderStored = (typeof localStorage !== 'undefined') ? localStorage.getItem('dr-photo-cofounder') : '';
  var cofounderImg = cofounderStored || '';
  var founderPhoto = founderImg
    ? '<img src="' + founderImg + '" class="fold-card-photo" alt="Founder">'
    : '<div class="fold-card-avatar" style="background:linear-gradient(135deg,#0161E0,#0CF)">SK</div>';
  var cofounderPhoto = cofounderImg
    ? '<img src="' + cofounderImg + '" class="fold-card-photo" alt="Co-founder">'
    : '<div class="fold-card-avatar" style="background:linear-gradient(135deg,#6366f1,#0CF)">AK</div>';
  return '<div class="fold-mission-label">WHY US</div>' +
    '<p class="fold-question">Learning velocity is our <span class="fold-gradient">deepest edge</span></p>' +
    '<div class="fold-team-cards">' +
    '<div class="fold-tcard"><div class="fold-tcard-photo-ring">' + founderPhoto + '</div>' +
    '<span class="fold-tcard-name">Dr. Luna Park</span><span class="fold-tcard-role">CEO & Co-founder</span>' +
    '<span class="fold-tcard-edge">Shipped sleep protocol features at Google Brain</span>' +
    '<span class="fold-tcard-path">Stanford Sleep Lab \u00b7 Anthropic \u00b7 Bain \'26</span></div>' +
    '<div class="fold-tcard"><div class="fold-tcard-photo-ring">' + cofounderPhoto + '</div>' +
    '<span class="fold-tcard-name">Kai Nakamura</span><span class="fold-tcard-role">COO & Co-founder</span>' +
    '<span class="fold-tcard-edge">70K+ r/RAG Community</span>' +
    '<span class="fold-tcard-path">Bain \u00b7 Harvard MBA \'26</span></div>' +
    '<div class="fold-tcard"><div class="fold-tcard-photo-ring">' +
    '<div class="fold-card-avatar" style="background:linear-gradient(135deg,#10b981,#0CF)">RF</div></div>' +
    '<span class="fold-tcard-name">David Liu</span><span class="fold-tcard-role">Technology Advisor</span>' +
    '<span class="fold-tcard-edge">25 patents \u00b7 IEEE Fellow</span>' +
    '<span class="fold-tcard-path">Stanford Professor</span></div></div>';
}
function s6() {
  var src = (typeof FOUNDERS_PHOTO !== 'undefined') ? FOUNDERS_PHOTO : 'DSC00842.jpg';
  return '<div class="fold-founders-photo"><img src="' + src + '" alt="Co-founders" class="fold-hero-img" /></div>' +
    '<p class="fold-photo-caption">Luna & Kai <span class="fold-gradient">Co-Founders</span></p>';
}
function s7() {
  return '<div class="fold-mission-label">OUR MISSION</div>' +
    '<p class="fold-mission-text">Our mission is to transform memories into wisdom, empowering teams and robots to build a wiser, more enlightened future for us all.</p>' +
    '<div class="fold-line"></div>';
}
function s8() {
  return '<div class="fold-mission-label">BHAG</div>' +
    '<div class="fold-bhag-num" id="bhag-counter">0</div>' +
    '<div class="fold-bhag-unit">AI agents and robots</div>' +
    '<p class="fold-bhag-text">Powered with memory that works like the human brain. By 2035.</p>';
}
function initFoldObs() {
  var panel = document.getElementById('fold-panel');
  if (!panel) return;
  var secs = panel.querySelectorAll('.fold-section-inner');
  var dots = panel.querySelectorAll('.fold-dots .dot');
  var counted = false;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        var idx = parseInt(e.target.dataset.fold);
        dots.forEach(function(d,i){ d.classList.toggle('active', i===idx); });
        if (idx === 5 && !counted) { counted = true; animateCounter(); }
      }
    });
  }, { root: panel, threshold: 0.4 });
  secs.forEach(function(s) { obs.observe(s); });
}
function animateCounter() {
  var el = document.getElementById('bhag-counter');
  if (!el) return;
  var target = 100000000, dur = 2500, st = performance.now();
  function tick(now) {
    var p = Math.min((now - st) / dur, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
