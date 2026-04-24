/* Financial Model editor (founder only) */
function openFinEditor(d) {
  var el = document.querySelector('.vw-overlay');
  if (!el) return;
  var p = d.pages;
  var h = '<div style="padding:20px;max-height:70vh;overflow-y:auto">';
  h += '<h3 style="margin:0 0 16px;font:600 16px -apple-system,system-ui,sans-serif">Edit Financial Model</h3>';
  // Revenue projections
  h += '<label style="font:600 12px -apple-system,system-ui,sans-serif;color:#667085;text-transform:uppercase">Revenue Headline</label>';
  h += '<input id="fe-rh" value="' + esc(p[0].headline) + '" style="width:100%;padding:8px;margin:4px 0 12px;border:1px solid rgba(15,23,42,0.12);border-radius:8px;font:400 14px -apple-system,system-ui,sans-serif">';
  // Projections
  p[0].projections.forEach(function(pr, i) {
    h += '<div style="display:flex;gap:8px;margin-bottom:8px">';
    h += '<input id="fe-py'+i+'" value="'+esc(pr.year)+'" style="width:60px;padding:6px;border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:13px" placeholder="Year">';
    h += '<input id="fe-pa'+i+'" value="'+pr.arr+'" style="width:80px;padding:6px;border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:13px" placeholder="ARR ($K)">';
    h += '<input id="fe-pc'+i+'" value="'+pr.customers+'" style="width:80px;padding:6px;border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:13px" placeholder="Customers">';
    h += '</div>';
  });
  // Gross margin
  h += '<div style="display:flex;gap:12px;margin:12px 0">';
  h += '<div><label style="font:500 11px -apple-system,system-ui,sans-serif;color:#667085">Current Margin %</label>';
  h += '<input id="fe-gmc" value="'+p[1].grossMargin.current+'" style="width:60px;padding:6px;border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:13px"></div>';
  h += '<div><label style="font:500 11px -apple-system,system-ui,sans-serif;color:#667085">Target Margin %</label>';
  h += '<input id="fe-gmt" value="'+p[1].grossMargin.target+'" style="width:60px;padding:6px;border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:13px"></div>';
  h += '</div>';
  // Save
  h += '<button id="fe-save" style="margin-top:16px;padding:10px 24px;background:#0161E0;color:#fff;border:none;border-radius:10px;font:600 14px -apple-system,system-ui,sans-serif;cursor:pointer">Save</button>';
  h += '</div>';
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4)';
  modal.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2)">' + h + '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  document.getElementById('fe-save').addEventListener('click', function() {
    p[0].headline = document.getElementById('fe-rh').value;
    p[0].projections.forEach(function(pr, i) {
      pr.year = document.getElementById('fe-py'+i).value;
      pr.arr = parseInt(document.getElementById('fe-pa'+i).value) || pr.arr;
      pr.customers = parseInt(document.getElementById('fe-pc'+i).value) || pr.customers;
    });
    p[1].grossMargin.current = parseInt(document.getElementById('fe-gmc').value) || 75;
    p[1].grossMargin.target = parseInt(document.getElementById('fe-gmt').value) || 85;
    localStorage.setItem('fin_data_v1', JSON.stringify(d));
    modal.remove();
    var ov = document.querySelector('.vw-overlay');
    if (ov) ov.remove();
    openFinancials(true);
  });
}
