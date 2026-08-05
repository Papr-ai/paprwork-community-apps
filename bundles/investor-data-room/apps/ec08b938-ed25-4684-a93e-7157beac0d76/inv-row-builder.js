function fitBadge(score, invId, risk) {
  if (!score) return '';
  var cls = score >= 70 ? 'fit-hi' : score >= 50 ? 'fit-mid' : 'fit-lo';
  var riskDot = risk && risk !== 'none' ? '<span class="fit-risk-dot" title="Competitor risk: ' + risk + '"></span>' : '';
  return '<span class="fit-badge ' + cls + '" data-inv-id="' + invId + '" style="cursor:pointer" title="Click to see breakdown">' + riskDot + Math.round(score) + '</span>';
}
function buildInvRow(inv, pList) {
  var initLetter = (inv.name || '?')[0];
  var onerr = "this.style.display='none';this.nextElementSibling.style.display='flex';";
  var logoInner = inv.logo_url
    ? '<img src="' + esc(inv.logo_url) + '" class="inv-logo" alt="' + esc(inv.name) + '" loading="lazy" onerror="' + onerr + '"><div class="inv-logo-placeholder" style="display:none">' + initLetter + '</div>'
    : '<div class="inv-logo-placeholder">' + initLetter + '</div>';
  var logo = '<div class="inv-logo-wrap" data-inv-id="' + inv.id + '">' + logoInner
    + '<div class="inv-logo-overlay"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>'
    + '<input type="file" class="inv-logo-input" accept="image/*" style="display:none"/></div>';
  var amt = '';
  if (inv.invested_amount > 0) amt += '<span class="inv-amount raised-chip">' + fmt(inv.invested_amount) + '</span>';
  if (inv.committed_amount > 0) amt += '<span class="inv-amount committed-chip">' + fmt(inv.committed_amount) + '</span>';
  var webIcon = inv.fund_url ? '<a href="' + esc(inv.fund_url) + '" target="_blank" class="inv-web-link" onclick="event.stopPropagation()" title="Visit website"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>' : '';
  var meta = inv.hq_city ? '<span class="inv-meta">' + esc(inv.hq_city) + '</span>' : '';
  var d = String.fromCharCode(36);
  var mn = inv.preferred_amount_min || 0, mx = inv.preferred_amount_max || 0;
  var checks = (mn > 0 || mx > 0) ? '<span class="inv-check-chip">' + (mn > 0 && mx > 0 ? d+mn+'M-'+d+mx+'M' : mn > 0 ? d+mn+'M+' : '<'+d+mx+'M') + '</span>' : '';
  var avs = pList.slice(0, 3).map(function(p) {
    var ph = p.photo_url || '';
    return ph ? '<img class="inv-p-av" src="' + ph + '"/>' : '<span class="inv-p-av inv-p-av-i">' + p.name.split(' ').map(function(w){ return w[0]; }).join('') + '</span>';
  }).join('') + (pList.length > 3 ? '<span class="inv-p-av inv-p-av-i">+' + (pList.length - 3) + '</span>' : '');
  var pBadge = pList.length ? '<div class="inv-people-badge">' + avs + '</div>' : '';
  var pCards = pList.map(function(p){ return buildPartnerCard(p, inv); }).join('');
  var addBtn = '<button class="btn-xs glass add-person-btn" data-inv-id="' + inv.id + '" data-fund="' + esc(inv.name) + '" onclick="event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add person</button>';
  var displayScore = inv.adjusted_fit_score > 0 ? inv.adjusted_fit_score : inv.fit_score;
  return '<div class="inv-row-wrap" data-id="' + inv.id + '">'
    + '<div class="inv-row glass">' + logo
    + '<div class="inv-info"><span class="inv-name">' + esc(inv.name) + webIcon + '</span>'
    + '<span class="inv-stage ' + (STAGE_CLS[inv.stage] || '') + '">' + (STAGE_LABELS[inv.stage] || inv.stage) + '</span>'
    + meta + checks + '</div>'
    + fitBadge(displayScore, inv.id, inv.competitor_risk) + pBadge
    + '<div class="inv-amounts">' + amt + '</div>'
    + '<div class="inv-actions"><button class="btn-sm glass share-link-btn" data-id="' + inv.id + '" data-name="' + esc(inv.name) + '" onclick="event.stopPropagation()">Share</button></div>'
    + '<svg class="inv-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></div>'
    + '<div class="inv-expand"><div class="inv-expand-inner">' + pCards + addBtn + '</div></div></div>';
}
function buildPartnerCard(p, inv) {
  var ph = p.photo_url || '', init = p.name.split(' ').map(function(w){ return w[0]; }).join('');
  var av = ph ? '<img class="pcard-av" src="' + ph + '"/>' : '<span class="pcard-av pcard-av-i">' + init + '</span>';
  var li = p.linkedin_url ? '<a href="' + esc(p.linkedin_url) + '" target="_blank" class="pcard-li" onclick="event.stopPropagation();event.preventDefault();window.open(this.href,\'_blank\')">in</a>' : '';
  var xl = p.x_url ? '<a href="' + esc(p.x_url) + '" target="_blank" class="pcard-x" onclick="event.stopPropagation();event.preventDefault();window.open(this.href,\'_blank\')">\ud835\udd4f</a>' : '';
  var em = p.email ? '<span class="pcard-email">' + esc(p.email) + '</span>' : '';
  var editBtn = '<button class="pcard-edit edit-ptr-btn" data-ptr-id="' + p.id + '" onclick="event.stopPropagation()" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>';
  return '<div class="pcard glass">' + av + '<div class="pcard-info"><span class="pcard-name">' + esc(p.name) + li + xl + '</span>'
    + '<span class="pcard-title">' + esc(p.title || '') + '</span>' + em + '</div>'
    + editBtn
    + '<button class="btn-xs glass share-ptr-btn" data-inv-id="' + inv.id + '" data-ptr-id="' + p.id + '" data-name="' + esc(inv.name) + '" onclick="event.stopPropagation()">Share</button></div>';
}
