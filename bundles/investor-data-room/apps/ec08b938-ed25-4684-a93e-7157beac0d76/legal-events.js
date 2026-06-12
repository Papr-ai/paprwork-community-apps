// Legal events — overlay open/close, upload, download, delete, rename, add section
function _lglUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0; return (c=='x'?r:(r&0x3|0x8)).toString(16);
  });
}
function _lglFileToB64(file) {
  return new Promise(function(ok, fail) {
    var r = new FileReader();
    r.onload = function(){ ok(r.result.split(',')[1]); };
    r.onerror = fail;
    r.readAsDataURL(file);
  });
}
async function _lglUpload(subId, file) {
  var b64 = await _lglFileToB64(file);
  await dbWrite(
    'INSERT INTO documents (id,section_id,name,description,file_type,file_data,file_size,mime_type,uploaded_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [_lglUuid(), subId, file.name, '', 'file', b64, file.size, file.type||'application/octet-stream', new Date().toISOString(), Date.now()]
  );
}
async function _lglDownload(docId) {
  try {
    var rows = await dbQuery('SELECT name,file_data,mime_type FROM documents WHERE id=?',[docId]);
    if (!rows||!rows[0]) { toast('Document not found'); return; }
    var d = rows[0];
    // If file_data is available locally (Paprwork app), use data: URI
    if (d.file_data) {
      var dataUri = 'data:' + (d.mime_type||'application/octet-stream') + ';base64,' + d.file_data;
      var a = document.createElement('a');
      a.href = dataUri; a.download = d.name;
      a.style.display = 'none'; document.body.appendChild(a);
      a.click();
      setTimeout(function(){ a.remove(); }, 2000);
      toast('Downloading ' + d.name);
      return;
    }
    // On Vercel (file_data stripped), fetch from /doc/{id} API endpoint
    toast('Downloading ' + d.name + '...');
    var a2 = document.createElement('a');
    a2.href = '/doc/' + docId; a2.download = d.name;
    a2.style.display = 'none'; document.body.appendChild(a2);
    a2.click();
    setTimeout(function(){ a2.remove(); }, 2000);
  } catch(e) {
    toast('Download failed: ' + (e.message||e));
  }
}
async function _lglDelete(docId) {
  if (!confirm('Delete this file?')) return false;
  await dbWrite('DELETE FROM documents WHERE id=?',[docId]);
  return true;
}
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
          if(files[i].size>8*1024*1024){toast('Skipped '+files[i].name+' (>8MB)');continue;}
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
}
