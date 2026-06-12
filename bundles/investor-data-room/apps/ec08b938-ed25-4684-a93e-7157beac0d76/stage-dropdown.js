/* Stage dropdown — inline stage picker for investor rows */
var _stageDD = null;

function openStageDropdown(el) {
  closeStageDropdown();
  var invId = el.dataset.invId;
  var cur = el.dataset.stage;
  var rect = el.getBoundingClientRect();

  var dd = document.createElement('div');
  dd.className = 'stage-dd';
  var keys = Object.keys(STAGE_LABELS);
  keys.forEach(function(k) {
    var opt = document.createElement('div');
    opt.className = 'stage-dd-opt ' + (STAGE_CLS[k] || '') + (k === cur ? ' stage-dd-active' : '');
    opt.textContent = STAGE_LABELS[k];
    opt.dataset.stage = k;
    opt.onclick = function(e) {
      e.stopPropagation();
      pickStage(invId, k, el);
    };
    dd.appendChild(opt);
  });

  document.body.appendChild(dd);
  /* position below the badge */
  var top = rect.bottom + 6;
  var left = rect.left;
  if (left + 160 > window.innerWidth) left = window.innerWidth - 168;
  if (top + dd.offsetHeight > window.innerHeight) top = rect.top - dd.offsetHeight - 6;
  dd.style.top = top + 'px';
  dd.style.left = left + 'px';
  requestAnimationFrame(function() { dd.classList.add('stage-dd-open'); });
  _stageDD = dd;
  setTimeout(function() {
    document.addEventListener('click', _closeDDHandler, { once: true });
  }, 0);
}

function _closeDDHandler() { closeStageDropdown(); }

function closeStageDropdown() {
  if (_stageDD) {
    _stageDD.classList.remove('stage-dd-open');
    setTimeout(function() { if (_stageDD) { _stageDD.remove(); _stageDD = null; } }, 150);
  }
}

async function pickStage(invId, stage, badge) {
  closeStageDropdown();
  /* optimistic update */
  badge.className = 'inv-stage ' + (STAGE_CLS[stage] || '');
  badge.textContent = STAGE_LABELS[stage];
  badge.dataset.stage = stage;
  if (INV_BY_ID[invId]) INV_BY_ID[invId].stage = stage;
  /* ensure the target stage filter is ON so investor stays visible */
  if (!INV_FILTERS[stage]) INV_FILTERS[stage] = true;
  /* persist */
  await dbWrite("UPDATE investors SET stage=? WHERE id=?", [stage, invId]);
  /* full re-render + rebind events */
  await refreshInvestorsTab();
}
