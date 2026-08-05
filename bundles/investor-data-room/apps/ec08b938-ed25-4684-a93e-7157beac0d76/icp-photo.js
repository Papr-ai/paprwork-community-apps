// ICP photo upload + editor row builders + save (V2)
var _icpPhotos = { profile: '', background: '' };
var _BUYER_COLORS = ['#0161E0','#4f46e5','#7c3aed','#059669','#EA580C','#CA8A04'];

function handleICPPhoto(e, type, el) {
  var file = e.target.files && e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    _icpPhotos[type] = ev.target.result;
    if (type === 'background') {
      el.querySelector('#icp-bg-upload').innerHTML = '<img src="'+ev.target.result+'" class="icp-ed-bg-img"><div class="icp-ed-bg-hint">Background</div>';
    } else {
      el.querySelector('#icp-pf-upload').innerHTML = '<img src="'+ev.target.result+'" class="icp-ed-pf-img">';
    }
  };
  reader.readAsDataURL(file);
}

function _icpFilterRow(f) {
  return '<div class="icp-filter glass mt-ed-row-card">' +
    '<input class="mt-ed-tq icp-f-lbl" value="'+esc(f.label)+'" placeholder="Filter label">' +
    '<input class="mt-ed-tq icp-f-val" value="'+esc(f.value)+'" placeholder="Filter value">' +
    '<button class="mt-ed-rm">\u00d7</button></div>';
}
function _icpBuyerRow(b) {
  return '<div class="icp-buyer glass mt-ed-row-card" style="border-left:3px solid '+(b.color||'#0161E0')+'">' +
    '<input class="mt-ed-tq icp-b-role" value="'+esc(b.role)+'" placeholder="Role (e.g. ML Engineer)">' +
    '<div style="display:flex;gap:6px"><input class="mt-ed-tq icp-b-type" value="'+esc(b.type)+'" placeholder="Type" style="flex:1">' +
    '<input class="mt-ed-tq icp-b-deal" value="'+esc(b.deal)+'" placeholder="Deal size" style="flex:1">' +
    '<input class="mt-ed-tq icp-b-color" type="color" value="'+(b.color||'#0161E0')+'" style="width:36px;padding:2px"></div>' +
    '<textarea class="mt-ed-ta icp-b-desc" rows="2" placeholder="Description">'+esc(b.desc)+'</textarea>' +
    '<button class="mt-ed-rm">\u00d7</button></div>';
}
function _icpVertRow(v) {
  return '<div class="glass mt-ed-row-card icp-v-card">' +
    '<input class="mt-ed-tq icp-v-name" value="'+esc(v.name)+'" placeholder="Vertical name" style="font-weight:600">' +
    '<textarea class="mt-ed-ta" rows="1" placeholder="Entry pain">'+esc(v.pain)+'</textarea>' +
    '<textarea class="mt-ed-ta" rows="1" placeholder="Why flat fails">'+esc(v.why)+'</textarea>' +
    '<input class="mt-ed-tq" value="'+esc(v.targets)+'" placeholder="Targets">' +
    '<input class="mt-ed-tq" value="'+esc(v.champion)+'" placeholder="Champion">' +
    '<input class="mt-ed-tq" value="'+esc(v.trigger)+'" placeholder="Trigger">' +
    '<button class="mt-ed-rm">\u00d7</button></div>';
}

function _bindIcpEditorV2(el, d) {
  // Tab switching (reuse moat pattern)
  el.querySelectorAll('.mt-tabs .mt-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      el.querySelectorAll('.mt-tabs .mt-tab').forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');
      el.querySelectorAll('.mt-ed-page').forEach(function(p){p.classList.add('hidden')});
      var target = el.querySelector('#icp-ed-'+tab.dataset.ed);
      if (target) target.classList.remove('hidden');
    });
  });
  // Photo uploads
  var bgUp=el.querySelector('#icp-bg-upload'),pfUp=el.querySelector('#icp-pf-upload');
  if(bgUp) bgUp.onclick=function(){el.querySelector('#icp-bg-file').click()};
  if(pfUp) pfUp.onclick=function(){el.querySelector('#icp-pf-file').click()};
  el.querySelector('#icp-bg-file').onchange=function(e){handleICPPhoto(e,'background',el)};
  el.querySelector('#icp-pf-file').onchange=function(e){handleICPPhoto(e,'profile',el)};
  // Add buttons
  el.querySelectorAll('.mt-ed-add').forEach(function(btn){
    btn.addEventListener('click',function(){ _addIcpRow(el, btn.dataset.t); });
  });
  // Remove buttons
  el.addEventListener('click',function(e){
    if(e.target.classList.contains('mt-ed-rm')) e.target.closest('.mt-ed-row-card,.icp-ed-pair').remove();
  });
  // Save / Cancel
  el.querySelector('#icp-save-v2').addEventListener('click',function(){ _saveIcpV2(el,d); });
  el.querySelector('#icp-cancel-v2').addEventListener('click',function(){ closeViewer(true); openICP(true); });
}

function _addIcpRow(el, type) {
  if (type==='filter') {
    var c=el.querySelector('.icp-ed-filters'); if(!c) return;
    c.insertAdjacentHTML('beforeend', _icpFilterRow({label:'',value:''}));
  } else if (type==='buyer') {
    var c=el.querySelector('.icp-ed-buyers'); if(!c) return;
    c.insertAdjacentHTML('beforeend', _icpBuyerRow({role:'',type:'',desc:'',deal:'',color:_BUYER_COLORS[c.children.length%6]}));
  } else if (type==='vert') {
    var c=el.querySelector('.icp-ed-verts'); if(!c) return;
    c.insertAdjacentHTML('beforeend', _icpVertRow({name:'',pain:'',why:'',targets:'',champion:'',trigger:''}));
  } else {
    var c=el.querySelector('.icp-ed-crits'); if(!c) return;
    c.insertAdjacentHTML('beforeend',
      '<div class="icp-ed-pair"><input class="icp-ed-lbl" placeholder="Label"><input class="icp-ed-val" placeholder="Value"><button class="mt-ed-rm">\u00d7</button></div>');
  }
}
