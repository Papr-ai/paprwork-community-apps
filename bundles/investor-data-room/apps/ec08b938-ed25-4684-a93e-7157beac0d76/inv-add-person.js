// Add Person modal — inline within expanded VC row
function showAddPersonModal(investorId, fundName) {
  var existing = document.getElementById('add-person-modal');
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'add-person-modal'; m.className = 'modal-overlay';
  m.innerHTML = '<div class="modal glass" style="max-width:400px">'
    +'<h3 style="font-size:16px;margin-bottom:16px">Add person at '+esc(fundName)+'</h3>'
    +'<div class="ap-fields">'
    +'<input id="ap-name" class="ap-input" placeholder="Name" autocomplete="off"/>'
    +'<input id="ap-title" class="ap-input" placeholder="Title (e.g. Partner)" autocomplete="off"/>'
    +'<input id="ap-email" class="ap-input" placeholder="Email" type="email" autocomplete="off"/>'
    +'<input id="ap-linkedin" class="ap-input" placeholder="LinkedIn URL" autocomplete="off"/>'
    +'<div class="ap-photo-row">'
    +'<div class="ap-photo-preview" id="ap-photo-preview"></div>'
    +'<label class="btn-xs glass ap-photo-btn">Photo<input type="file" accept="image/*" id="ap-photo-file" hidden/></label>'
    +'</div></div>'
    +'<div class="modal-actions" style="margin-top:16px">'
    +'<button class="btn-sm glass" id="ap-cancel">Cancel</button>'
    +'<button class="btn-primary-sm" id="ap-save">Add & generate link</button>'
    +'</div></div>';
  document.body.appendChild(m);
  var photoB64 = '';
  document.getElementById('ap-photo-file').addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      photoB64 = ev.target.result;
      document.getElementById('ap-photo-preview').innerHTML = '<img src="'+photoB64+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/>';
    };
    r.readAsDataURL(f);
  });
  document.getElementById('ap-cancel').onclick = function() { m.remove(); };
  document.getElementById('ap-save').onclick = async function() {
    var name = document.getElementById('ap-name').value.trim();
    if (!name) { toast('Name is required'); return; }
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    var title = document.getElementById('ap-title').value.trim();
    var email = document.getElementById('ap-email').value.trim();
    var linkedin = document.getElementById('ap-linkedin').value.trim();
    await dbWrite("INSERT OR REPLACE INTO vc_partners (id,investor_id,name,title,fund_name,linkedin_url,photo_url) VALUES (?,?,?,?,?,?,?)",
      [id, investorId, name, title, fundName, linkedin, photoB64]);
    m.remove();
    toast(name + ' added');
    // Generate share link automatically
    var token = crypto.randomUUID(); var linkId = crypto.randomUUID();
    var sects = JSON.stringify(['overview','traction','financials','team','legal']);
    await dbWrite("INSERT INTO investor_links (id,investor_id,partner_id,token,sections_visible) VALUES (?,?,?,?,?)",
      [linkId, investorId, id, token, sects]);
    var base = window.DEPLOY_DOMAIN || '';
    var url = base+'?token='+token;
    await navigator.clipboard.writeText(url);
    toast('Share link copied! Publishing…');
    // Auto-publish so the token is live on Vercel
    try{
      fetch('/api/jobs/run',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({appId:APP_ID,jobId:window.PUBLISH_JOB_ID||'f04b0460-445f-476c-bbf3-6f23da7cdd05'})
      }).then(function(){toast('Link is live!');});
    }catch(e){}
    refreshInvestorsTab();
  };
}
