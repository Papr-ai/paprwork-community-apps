// Legal events — overlay open/close, upload, download, delete, rename, add section
// Upload/download/delete live in legal-files.js (App Files). Do not put
// file bytes in SQLite or the app directory.
async function _lglRename(docId, cur) {
  var name = prompt('Rename file', cur);
  if (!name||name===cur) return false;
  await dbWrite('UPDATE documents SET name=? WHERE id=?',[name,docId]);
  return true;
}
function _lglClosePopover() {
  var p = document.querySelector('.lgl-popover'); if(p) p.remove();
}
function _lglPopover(btn, docId, name, refreshOverlay) {
  _lglClosePopover();
  var rect = btn.getBoundingClientRect();
  var pop = document.createElement('div');
  pop.className='lgl-popover';
  pop.innerHTML=
    '<button data-a="dl">'+(window.ICONS.download_arrow||'')+'Download</button>'+
    '<button data-a="rn">'+(window.ICONS.file_doc||'')+'Rename</button>'+
    '<button data-a="del" class="lgl-danger">'+(window.ICONS.trash||'')+'Delete</button>';
  pop.style.top=(rect.bottom+4)+'px';
  pop.style.left=Math.max(4,rect.right-160)+'px';
  document.body.appendChild(pop);
  pop.addEventListener('click', async function(e){
    var b=e.target.closest('button'); if(!b) return;
    _lglClosePopover();
    if(b.dataset.a==='dl') await _lglDownload(docId);
    else if(b.dataset.a==='rn'){ if(await _lglRename(docId,name)) refreshOverlay(); }
    else if(b.dataset.a==='del'){ if(await _lglDelete(docId)) refreshOverlay(); }
  });
  setTimeout(function(){
    document.addEventListener('click', function h(e){
      if(!e.target.closest('.lgl-popover')&&!e.target.closest('.lgl-file-menu')){
        _lglClosePopover(); document.removeEventListener('click',h);
      }
    });
  },10);
}

// Bind events inside the full-page overlay
function _bindOverlayEvents(o, sub, allDocs, editable, refreshParent) {
  var close = function(){ closeLegalOverlay(); refreshParent && refreshParent(); };
  o.querySelector('.lgl-ov-back').onclick = close;
  o.querySelector('.lgl-ov-close').onclick = close;
  // ESC to close
  var esc = function(e){ if(e.key==='Escape') close(); };
  document.addEventListener('keydown', esc);
  // Remove listener when overlay closes
  var mo = new MutationObserver(function(){
    if(!document.body.contains(o)) { document.removeEventListener('keydown',esc); mo.disconnect(); }
  });
  mo.observe(document.body, {childList:true});

  var refreshOverlay = function(){
    closeLegalOverlay();
    (async function(){
      var newAll = await loadAllDocs();
      openLegalSubOverlay(sub, newAll||[], editable, refreshParent);
    })();
  };

  if (editable) {
    o.querySelectorAll('.lgl-upload-input').forEach(function(inp){
      inp.addEventListener('change', async function(){
        var files = Array.from(inp.files||[]);
        if(!files.length) return;
        toast('Uploading '+files.length+' file'+(files.length===1?'':'s')+'…');
        for(var i=0;i<files.length;i++){
          await _lglUpload(sub.id, files[i]);
        }
        toast('Uploaded ✓'); refreshOverlay();
      });
    });
    o.querySelectorAll('.lgl-file-menu').forEach(function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        var row = b.closest('.lgl-file-row');
        _lglPopover(b, b.dataset.doc, row.dataset.name, refreshOverlay);
      });
    });
  } else {
    o.querySelectorAll('.lgl-file-dl').forEach(function(b){
      b.addEventListener('click',function(e){e.stopPropagation();_lglDownload(b.dataset.doc);});
    });
    o.querySelectorAll('.lgl-file-row').forEach(function(r){
      r.addEventListener('click',function(e){
        if(e.target.closest('button')) return;
        _lglDownload(r.dataset.doc);
      });
    });
  }
}

// Global click handlers — called via inline onclick="" in the HTML
// No event binding needed, works regardless of DOM re-renders or caching
var _lglEditable = false;
var _lglRefresh = null;

function handleLegalSubClick(subId) {
  // Use cached data from renderLegalSection — zero async, instant open
  var sections = window._lglSections || [];
  var allDocs = window._lglAllDocs || [];
  var sub = sections.find(function(s){ return s.id === subId; });
  if (!sub) {
    console.error('[legal] sub not found:', subId, 'sections:', sections.length);
    toast('Could not open section');
    return;
  }
  openLegalSubOverlay(sub, allDocs, _lglEditable, _lglRefresh);
}

async function handleLegalAddSection() {
  var label = prompt('New section name (e.g. "Trademarks")');
  if (!label||!label.trim()) return;
  var desc = prompt('Short description (optional)','')||'';
  var id = 'legal_'+label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  try {
    var secs = await loadSections();
    var maxOrd = 0;
    (secs||[]).forEach(function(s){ if(s.parent_id==='legal'&&(s.sort_order||0)>maxOrd) maxOrd=s.sort_order; });
    await dbWrite(
      'INSERT INTO sections (id,label,description,sort_order,intro_visible,soft_commit_visible,diligence_visible,parent_id) VALUES (?,?,?,?,1,1,1,?)',
      [id, label.trim(), desc.trim(), maxOrd+1, 'legal']
    );
    toast('Section added ✓');
    _lglRefresh && _lglRefresh();
  } catch(err) { console.error('[legal] add section failed', err); }
}

function bindLegalEvents(rootEl, editable, refresh) {
  _lglEditable = editable;
  _lglRefresh = refresh;
  if (editable && typeof migrateLegalBlobsToAppFiles === 'function') {
    migrateLegalBlobsToAppFiles().catch(function(err) {
      console.warn('[legal] blob migration skipped', err);
    });
  }
}
