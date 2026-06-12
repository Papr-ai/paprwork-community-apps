// Interest Prediction Score (0-100)
// Grounded in: Forrester Demand Unit Waterfall, MIT CISR engagement-decay, Gartner buyer-intent
var SCORE_W = { recency: 0.20, depth: 0.25, breadth: 0.15, velocity: 0.15, multi: 0.25 };
var SEC_W = { 'Investment Memo': 5, 'Financials': 4, 'Legal': 3, 'Team': 2.5, 'Traction': 2, 'Product Demo': 2, 'Overview': 1, 'FAQ': 1 };

function computeInterestScores(investors) {
  investors.forEach(function(inv) {
    var bd = {};
    // 1. Recency — exponential decay, 14-day half-life
    var days = inv.lastSeen ? (Date.now() - new Date(inv.lastSeen).getTime()) / 86400000 : 999;
    bd.recency = Math.round(100 * Math.exp(-0.693 * days / 14));
    // 2. Depth — weighted time on high-value sections (cap 30min)
    var wt = 0;
    var ns = Math.max(inv.sections.length, 1);
    inv.sections.forEach(function(s) { wt += (SEC_W[s] || 1) * (inv.totalTime / ns); });
    bd.depth = Math.round(Math.min(100, (wt / 1800) * 100));
    // 3. Breadth — unique sections / 7 total
    bd.breadth = Math.round(Math.min(100, (inv.sections.length / 7) * 100));
    // 4. Velocity — return visit days (3+ = 100)
    bd.velocity = Math.round(Math.min(100, ((inv.visitDays || 1) / 3) * 100));
    // 5. Multi-channel — emails + meetings (filled by mail/meeting sync)
    bd.multi = Math.round(Math.min(100, ((inv.emailCount || 0) * 15) + ((inv.meetingCount || 0) * 25)));
    // Weighted total
    inv.score = Math.round(bd.recency * SCORE_W.recency + bd.depth * SCORE_W.depth + bd.breadth * SCORE_W.breadth + bd.velocity * SCORE_W.velocity + bd.multi * SCORE_W.multi);
    inv.scoreBreakdown = bd;
    inv.nextAction = _nextAction(inv);
  });
}
function _nextAction(inv) {
  var bd = inv.scoreBreakdown;
  if (inv.score >= 80) return 'Schedule follow-up call — high engagement signals';
  if (bd.depth > 60 && bd.recency < 30) return 'Re-engage — strong past interest, gone quiet';
  if (inv.sections.indexOf('Investment Memo') !== -1) return 'Send memo follow-up — they reviewed your thesis';
  if (inv.sections.indexOf('Financials') !== -1) return 'Prepare financial deep-dive — they spent time on numbers';
  if (inv.visitDays >= 2) return 'They keep coming back — send a personal note';
  if (bd.breadth > 50) return 'Broad interest — invite to a detailed walkthrough';
  return 'Share targeted content based on their section interest';
}
function scoreLabel(s) { return s >= 75 ? 'Hot' : s >= 50 ? 'Warm' : s >= 25 ? 'Cool' : 'Cold'; }
function scoreColor(s) { return s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : s >= 25 ? '#6b7280' : '#ef4444'; }
