/* Moat Page 2 — Dual Moat: Customer vs Papr */
function buildDualMoatPage(dm) {
  if (!dm) return '';
  var h = '<div class="dm-page">';
  h += '<p class="dm-title">The Dual Moat</p>';
  h += '<p class="dm-headline">' + esc(dm.headline) + '</p>';
  h += '<p class="dm-subline">' + esc(dm.subline) + '</p>';
  h += '<div class="dm-verticals">';
  dm.verticals.forEach(function(v, i) { h += buildVerticalCard(v, i); });
  h += '</div>';
  if (dm.proof) {
    h += '<div class="dm-proof-section">';
    h += '<p class="dm-proof-title">Compounding Advantage</p>';
    h += buildProofBar(dm.proof);
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function buildVerticalCard(v) {
  var h = '<div class="dm-vert" style="--vc:' + v.color + '">';
  h += '<div class="dm-vert-head">';
  h += '<div class="dm-vert-badge" style="background:' + v.color + '">';
  h += esc(v.name.charAt(0)) + '</div>';
  h += '<div class="dm-vert-info">';
  h += '<span class="dm-vert-name">' + esc(v.name) + '</span>';
  h += '<span class="dm-vert-cust">' + esc(v.customer);
  h += ' &mdash; ' + esc(v.customerDesc) + '</span>';
  h += '</div></div>';
  h += '<div class="dm-two-col">';
  h += buildMoatSide(v.customer + ' keeps', v.keeps, 'keeps', v.color);
  h += buildMoatSide('Papr learns', v.learns, 'learns', '#0161E0');
  h += '</div></div>';
  return h;
}

function buildMoatSide(title, items, cls, clr) {
  var h = '<div class="dm-side dm-side-' + cls + '">';
  h += '<span class="dm-side-title" style="color:' + clr + '">';
  h += esc(title) + '</span>';
  items.forEach(function(it) {
    h += '<div class="dm-row">';
    h += '<span class="dm-dot" style="background:' + clr + '"></span>';
    h += '<div class="dm-row-text">';
    h += '<span class="dm-row-label">' + esc(it.label) + '</span>';
    h += '<span class="dm-row-detail">' + esc(it.detail) + '</span>';
    h += '</div></div>';
  });
  return h + '</div>';
}

function buildProofBar(p) {
  var h = '<div class="dm-proof">';
  h += '<div class="dm-proof-row">';
  h += '<div class="dm-proof-box dm-cold">';
  h += '<span class="dm-proof-label">' + esc(p.cold.label) + '</span>';
  h += '<span class="dm-proof-num">' + p.cold.conf + '</span>';
  h += '<span class="dm-proof-unit">' + p.cold.ms + '</span></div>';
  h += '<svg class="dm-proof-chevron" width="24" height="24" viewBox="0 0 24 24">';
  h += '<path d="M9 5l7 7-7 7" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  h += '<div class="dm-proof-box dm-warm">';
  h += '<span class="dm-proof-label">' + esc(p.warm.label) + '</span>';
  h += '<span class="dm-proof-num">' + p.warm.conf + '</span>';
  h += '<span class="dm-proof-unit">' + p.warm.ms + '</span></div>';
  h += '</div>';
  h += '<p class="dm-proof-delta">' + esc(p.delta) + '</p>';
  h += '</div>';
  return h;
}
