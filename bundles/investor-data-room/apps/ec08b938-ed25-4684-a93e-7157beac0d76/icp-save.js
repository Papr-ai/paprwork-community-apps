// ICP save — collects ALL editor fields and persists
function _saveIcpV2(el, d) {
  var data = {
    name: (el.querySelector('#icp-name')||{}).value||'',
    tagline: (el.querySelector('#icp-tagline')||{}).value||'',
    profilePhoto: _icpPhotos.profile,
    backgroundPhoto: _icpPhotos.background,
    filters: [], buyers: [], verticals: [], criteria: [],
    graphSignal: (el.querySelector('.icp-ed-signal')||{}).value||''
  };
  // Collect filters
  el.querySelectorAll('.icp-ed-filters .mt-ed-row-card').forEach(function(r) {
    var lbl = r.querySelector('.icp-f-lbl'), val = r.querySelector('.icp-f-val');
    if (lbl && val && (lbl.value||val.value))
      data.filters.push({ label: lbl.value, value: val.value });
  });
  // Collect buyers
  el.querySelectorAll('.icp-ed-buyers .mt-ed-row-card').forEach(function(r) {
    var role=r.querySelector('.icp-b-role'), tp=r.querySelector('.icp-b-type'),
        deal=r.querySelector('.icp-b-deal'), desc=r.querySelector('.icp-b-desc'),
        col=r.querySelector('.icp-b-color');
    if (role && role.value)
      data.buyers.push({ role:role.value, type:(tp||{}).value||'',
        desc:(desc||{}).value||'', deal:(deal||{}).value||'',
        color:(col||{}).value||'#0161E0' });
  });
  // Collect verticals
  el.querySelectorAll('.icp-ed-verts .mt-ed-row-card').forEach(function(r) {
    var inputs = r.querySelectorAll('input.mt-ed-tq');
    var tas = r.querySelectorAll('textarea');
    if (inputs[0] && inputs[0].value)
      data.verticals.push({
        name: inputs[0].value,
        pain: (tas[0]||{}).value||'',
        why: (tas[1]||{}).value||'',
        targets: (inputs[1]||{}).value||'',
        champion: (inputs[2]||{}).value||'',
        trigger: (inputs[3]||{}).value||''
      });
  });
  // Collect criteria
  el.querySelectorAll('.icp-ed-crits .icp-ed-pair').forEach(function(r) {
    var lbl=r.querySelector('.icp-ed-lbl'), val=r.querySelector('.icp-ed-val');
    if (lbl && val && (lbl.value||val.value))
      data.criteria.push({ label: lbl.value, value: val.value });
  });
  saveIcpData(data);
  toast('ICP saved');
  openICP(true);
}
