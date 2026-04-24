// Edit Partner modal — edit LinkedIn, X/Twitter URL, photo
function ensurePartnerColumns() {
  dbWrite("ALTER TABLE vc_partners ADD COLUMN x_url TEXT DEFAULT ''").catch(function(){});
}
ensurePartnerColumns();

function showEditPartnerModal(partnerId) {
  dbQuery("SELECT * FROM vc_partners WHERE id=?", [partnerId]).then(function(rows) {
    if (!rows.length) return;
    var p = rows[0];
    var existing = document.getElementById('edit-partner-modal');
    if (existing) existing.remove();
    var ph = p.photo_url || '';
    var initials = p.name.split(' ').map(function(w){return w[0]}).join('');
    var avHtml = ph
      ? '<img id="ep-av-img" src="'+ph+'" class="ep-avatar-img"/>'
      : '<span id="ep-av-img" class="ep-avatar-init">'+initials+'</span>';
    var m = document.createElement('div');
    m.id = 'edit-partner-modal';
    m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal glass ep-modal">'
      +'<div class="ep-header">'
      +'<div class="ep-av-wrap" id="ep-av-wrap">'+avHtml
      +'<div class="ep-av-overlay"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>'
      +'<input type="file" accept="image/*" id="ep-photo-file" hidden/>'
      +'</div>'
      +'<div class="ep-name-block">'
      +'<span class="ep-name">'+esc(p.name)+'</span>'
      +'<span class="ep-title">'+esc(p.title||'')+'</span>'
      +'</div>'
      +'<button class="ep-close" id="ep-close">&times;</button>'
      +'</div>'
      +'<div class="ep-fields">'
      +'<label class="ep-label"><span class="ep-label-text">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
      +' LinkedIn</span>'
      +'<input id="ep-linkedin" class="ep-input" value="'+esc(p.linkedin_url||'')+'" placeholder="https://linkedin.com/in/..."/>'
      +'</label>'
      +'<label class="ep-label"><span class="ep-label-text">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
      +' X / Twitter</span>'
      +'<input id="ep-xurl" class="ep-input" value="'+esc(p.x_url||'')+'" placeholder="https://x.com/..."/>'
      +'</label>'
      +'</div>'
      +'<div class="ep-actions">'
      +'<button class="btn-sm glass" id="ep-cancel">Cancel</button>'
      +'<button class="btn-primary-sm" id="ep-save">Save</button>'
      +'</div>'
      +'</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){ if(e.target===m) m.remove(); });
    document.getElementById('ep-close').onclick = function(){ m.remove(); };
    document.getElementById('ep-cancel').onclick = function(){ m.remove(); };
    var avWrap = document.getElementById('ep-av-wrap');
    avWrap.style.cursor = 'pointer';
    avWrap.onclick = function(){ document.getElementById('ep-photo-file').click(); };
    document.getElementById('ep-photo-file').onchange = function(e){
      var f = e.target.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(ev){
        var el = document.getElementById('ep-av-img');
        if(el.tagName==='IMG'){ el.src=ev.target.result; }
        else { var img=document.createElement('img'); img.id='ep-av-img'; img.className='ep-avatar-img'; img.src=ev.target.result; el.replaceWith(img); }
      };
      r.readAsDataURL(f);
    };
    document.getElementById('ep-save').onclick = async function(){
      try {
        var li = document.getElementById('ep-linkedin').value.trim();
        var xu = document.getElementById('ep-xurl').value.trim();
        var avEl = document.getElementById('ep-av-img');
        var newPhoto = (avEl.tagName==='IMG' && avEl.src!==ph) ? avEl.src : null;
        // Update linkedin + x_url (try with x_url first, fallback without)
        try {
          await dbWrite("UPDATE vc_partners SET linkedin_url=?, x_url=? WHERE id=?", [li, xu, partnerId]);
        } catch(e1) {
          await dbWrite("UPDATE vc_partners SET linkedin_url=? WHERE id=?", [li, partnerId]);
          try { await dbWrite("ALTER TABLE vc_partners ADD COLUMN x_url TEXT DEFAULT ''"); } catch(ig){}
          try { await dbWrite("UPDATE vc_partners SET x_url=? WHERE id=?", [xu, partnerId]); } catch(ig){}
        }
        if(newPhoto){
          await dbWrite("UPDATE vc_partners SET photo_url=? WHERE id=?", [newPhoto, partnerId]);
          if(typeof syncPartnerPhotoToJobDB==='function') syncPartnerPhotoToJobDB(partnerId, newPhoto);
        }
        m.remove();
        toast(p.name+' updated');
        refreshInvestorsTab();
      } catch(err) {
        toast('Save failed: ' + err.message);
      }
    };
  });
}
