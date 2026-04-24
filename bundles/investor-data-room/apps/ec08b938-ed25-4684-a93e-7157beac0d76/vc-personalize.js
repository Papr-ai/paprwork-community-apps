// Personalized VC header with hover-to-upload photo
function buildVCBanner(link, isFounder) {
  if (!link || !link.partner_name) return '';
  var initials = link.partner_name.split(' ').map(function(w){return w[0]}).join('');
  var photoInner = link.partner_photo
    ? '<img class="vc-banner-photo" src="' + link.partner_photo + '"/>'
    : '<div class="vc-banner-initials">' + initials + '</div>';
  var camSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  var photoWrap = isFounder
    ? '<div class="vc-photo-wrap" data-partner-id="' + esc(link.partner_id || '') + '">'
      + photoInner + '<div class="vc-photo-overlay">' + camSvg + '<span>Upload</span></div>'
      + '<input type="file" class="vc-photo-input" accept="image/*"/></div>'
    : '<div class="vc-photo-wrap">' + photoInner + '</div>';
  var li = link.partner_linkedin
    ? '<a href="' + esc(link.partner_linkedin) + '" target="_blank" rel="noopener" class="vc-banner-li">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a>'
    : '';
  return '<div class="vc-banner glass"><div class="vc-banner-left">' + photoWrap
    + '<div class="vc-banner-info"><span class="vc-banner-prep">Prepared for</span>'
    + '<span class="vc-banner-name">' + esc(link.partner_name) + '</span>'
    + '<div class="vc-banner-meta"><span class="vc-banner-title">' + esc(link.partner_title || '') + ' · ' + esc(link.fund_name) + '</span>' + li + '</div>'
    + '</div></div></div>';
}
function initPhotoUpload() {
  document.querySelectorAll('.vc-photo-wrap[data-partner-id]').forEach(function(wrap) {
    var inp = wrap.querySelector('.vc-photo-input');
    if (!inp) return;
    wrap.addEventListener('click', function(e) { e.stopPropagation(); inp.click(); });
    inp.addEventListener('click', function(e) { e.stopPropagation(); });
    inp.addEventListener('change', function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result;
        var img = wrap.querySelector('.vc-banner-photo');
        var init = wrap.querySelector('.vc-banner-initials');
        if (img) { img.src = b64; }
        else if (init) {
          var newImg = document.createElement('img');
          newImg.className = 'vc-banner-photo';
          newImg.src = b64;
          init.replaceWith(newImg);
        }
        var pid = wrap.getAttribute('data-partner-id');
        if (pid) savePartnerPhoto(pid, b64);
      };
      reader.readAsDataURL(file);
    });
  });
}
function savePartnerPhoto(pid, b64) {
  dbQuery("UPDATE vc_partners SET partner_photo=? WHERE id=?", [b64, pid]).catch(function(){});
  dbQuery("UPDATE vc_partners SET photo_url=? WHERE id=?", [b64, pid]).catch(function(){});
}
