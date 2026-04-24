function bindPartnerPhotoUploads() {
  document.querySelectorAll('.ptr-avatar-wrap').forEach(function(wrap) {
    var inp = wrap.querySelector('.ptr-avatar-input');
    if (!inp) return;
    wrap.addEventListener('click', function(e) {
      e.stopPropagation(); inp.click();
    });
    inp.addEventListener('click', function(e) { e.stopPropagation(); });
    inp.addEventListener('change', function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result;
        var avatar = wrap.querySelector('.ptr-avatar');
        avatar.innerHTML = '<img class="ptr-avatar-img" src="' + b64 + '"/>';
        var pid = wrap.getAttribute('data-ptr-id');
        if (pid) {
          dbWrite("UPDATE vc_partners SET photo_url=? WHERE id=?", [b64, pid]).catch(function(){});
          syncPartnerPhotoToJobDB(pid, b64);
        }
      };
      reader.readAsDataURL(file);
    });
  });
}

function syncPartnerPhotoToJobDB(partnerId, b64) {
  localStorage.setItem('vc-photo-' + partnerId, b64);
  toast('Photo updated — click Publish to push to Vercel');
}

function bindInvLogoUploads() {
  document.querySelectorAll('.inv-logo-wrap[data-inv-id]').forEach(function(wrap) {
    var inp = wrap.querySelector('.inv-logo-input');
    if (!inp) return;
    wrap.addEventListener('click', function(e) {
      e.stopPropagation(); inp.click();
    });
    inp.addEventListener('click', function(e) { e.stopPropagation(); });
    inp.addEventListener('change', function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result;
        var invId = wrap.getAttribute('data-inv-id');
        // Update UI — replace logo img or placeholder
        var img = wrap.querySelector('.inv-logo');
        var ph = wrap.querySelector('.inv-logo-placeholder');
        if (img) { img.src = b64; img.style.display = ''; if (ph) ph.style.display = 'none'; }
        else if (ph) {
          var newImg = document.createElement('img');
          newImg.className = 'inv-logo';
          newImg.src = b64;
          ph.style.display = 'none';
          wrap.insertBefore(newImg, ph);
        }
        // Save to DB
        if (invId) {
          dbWrite("UPDATE investors SET logo_url=? WHERE id=?", [b64, invId]).catch(function(){});
          toast('Logo updated — publish to push to Vercel');
        }
      };
      reader.readAsDataURL(file);
    });
  });
}
