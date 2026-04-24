// Moat editor helpers — add rows and save
function addMoatRow(el, type) {
  var html, container;
  if (type === 'fly') {
    container = '.mt-ed-flys';
    var row = document.createElement('div');
    row.className = 'mt-fly-step glass mt-ed-row-card';
    row.innerHTML = '<input class="mt-ed-tq mt-fly-num-ed" placeholder="77.3K">' +
      '<input class="mt-ed-tq mt-fly-name-ed" placeholder="Step name">' +
      '<input class="mt-ed-tq" placeholder="Description">' +
      '<input class="mt-ed-tq" placeholder="Unit">' +
      '<button class="mt-ed-rm">&times;</button>';
    el.querySelector(container).appendChild(row);
    return;
  } else if (type === 'layer') {
    container = '.mt-ed-layers';
    var row = document.createElement('div');
    row.className = 'mt-layer glass mt-ed-row-card';
    row.innerHTML = '<input class="mt-ed-tq mt-layer-name-ed" placeholder="Layer name">' +
      '<textarea class="mt-ed-ta" rows="2" placeholder="What"></textarea>' +
      '<textarea class="mt-ed-ta" rows="2" placeholder="Why it compounds"></textarea>' +
      '<button class="mt-ed-rm">&times;</button>';
    el.querySelector(container).appendChild(row);
    return;
  } else {
    container = '.mt-ed-comps';
    var row = document.createElement('div');
    row.className = 'mt-gap glass mt-ed-row-card';
    row.innerHTML = '<input class="mt-ed-tq mt-gap-who-ed" placeholder="Competitor">' +
      '<input class="mt-ed-tq" placeholder="Structural gap">' +
      '<button class="mt-ed-rm">&times;</button>';
    el.querySelector(container).appendChild(row);
    return;
  }
}

function saveMoatV2(el, d) {
  d.headline = el.querySelector('.mt-ed-hl').value;
  d.thesis = el.querySelector('.mt-ed-thesis').value;
  d.flywheel = []; d.layers = []; d.competitors = [];
  el.querySelectorAll('.mt-ed-flys .mt-ed-row-card').forEach(function(r) {
    var inputs = r.querySelectorAll('input');
    d.flywheel.push({ step: inputs[1].value, desc: inputs[2].value,
      num: inputs[0].value, unit: inputs[3].value });
  });
  el.querySelectorAll('.mt-ed-layers .mt-ed-row-card').forEach(function(r) {
    var inp = r.querySelector('input');
    var tas = r.querySelectorAll('textarea');
    d.layers.push({ name: inp.value, icon: 'circle',
      what: tas[0].value, why: tas[1].value });
  });
  el.querySelectorAll('.mt-ed-comps .mt-ed-row-card').forEach(function(r) {
    var inputs = r.querySelectorAll('input');
    d.competitors.push({ who: inputs[0].value, gap: inputs[1].value });
  });
  localStorage.setItem('moat_data_v2', JSON.stringify(d));
  closeViewer(true); openMoat(true);
}

function bindMoatEditorV2(el, d) {
  el.querySelectorAll('.mt-ed-add').forEach(function(btn) {
    btn.addEventListener('click', function() { addMoatRow(el, btn.dataset.t); });
  });
  el.addEventListener('click', function(e) {
    if (e.target.classList.contains('mt-ed-rm'))
      e.target.closest('.mt-ed-row-card').remove();
  });
  el.querySelector('.mt-ed-save').addEventListener('click', function() {
    saveMoatV2(el, d);
  });
  el.querySelector('.mt-ed-cancel').addEventListener('click', function() {
    closeViewer(true); openMoat(true);
  });
}
