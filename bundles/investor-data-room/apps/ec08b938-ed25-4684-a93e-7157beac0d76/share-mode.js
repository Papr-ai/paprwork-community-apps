// Share mode picker — shows pre/post URL options for the same token
// Two URLs, same token, no republish to flip modes:
//   post-commit (unlocked): https://your-domain/?token=XXX
//   pre-commit (locked):    https://your-domain/?token=XXX&mode=pre
function buildShareUrls(token) {
  var base = (window.DEPLOY_DOMAIN || '') + '/?token=' + token;
  return { post: base, pre: base + '&mode=pre' };
}
function showShareModeDialog(label, token, onPick) {
  var lockIcon = (window.ICONS && window.ICONS.lock) || '';
  var openIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 017.3-2.3"/><circle cx="12" cy="15.5" r="1" fill="currentColor"/><path d="M12 16.5v2"/></svg>';
  var urls = buildShareUrls(token);
  var m = document.createElement('div');
  m.className = 'modal-overlay';
  m.innerHTML = '<div class="modal glass share-mode-dialog">' +
    '<h3>Share data room with ' + esc(label) + '</h3>' +
    '<p class="share-mode-sub">Same link, two modes. Pick one to copy — flip anytime by re-sharing.</p>' +
    '<div class="share-mode-opts">' +
      '<button class="share-mode-btn smb-locked" data-mode="pre">' +
        '<span class="smb-icon">' + lockIcon + '</span>' +
        '<span class="smb-text"><span class="smb-title">Pre-commit (locked)</span>' +
        '<span class="smb-desc">Hides Cap Table &amp; Legal Documentation. Shows locked cards with unlock CTA.</span>' +
        '<span class="smb-url">' + esc(urls.pre) + '</span></span>' +
      '</button>' +
      '<button class="share-mode-btn smb-unlocked" data-mode="post">' +
        '<span class="smb-icon">' + openIcon + '</span>' +
        '<span class="smb-text"><span class="smb-title">Post-commit (unlocked)</span>' +
        '<span class="smb-desc">Full access. Send after verbal commitment.</span>' +
        '<span class="smb-url">' + esc(urls.post) + '</span></span>' +
      '</button>' +
    '</div>' +
    '<div class="share-mode-cancel"><button class="btn-sm glass" id="sm-cancel">Cancel</button></div>' +
    '</div>';
  document.body.appendChild(m);
  m.querySelector('#sm-cancel').onclick = function(){ m.remove(); };
  m.addEventListener('click', function(e){ if (e.target === m) m.remove(); });
  m.querySelectorAll('.share-mode-btn').forEach(function(b){
    b.onclick = async function(){
      var mode = b.dataset.mode;
      // Persist commit_mode so LINKS on Vercel knows pre/post-close
      try{
        await dbWrite("UPDATE investor_links SET commit_mode=? WHERE token=?",
          [mode==='pre'?'pre_commit':'post_close', token]);
      }catch(e){}
      // Auto-publish so the token goes live if it's new
      try{
        fetch('/api/jobs/run',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({appId:APP_ID,jobId:window.PUBLISH_JOB_ID||'f04b0460-445f-476c-bbf3-6f23da7cdd05'})
        });
      }catch(e){}
      m.remove();
      onPick(mode, urls[mode]);
    };
  });
}
