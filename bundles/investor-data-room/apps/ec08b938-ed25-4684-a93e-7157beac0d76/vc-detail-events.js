// Detail event bindings — connector photo + partner photo uploads
function _bindDetailEvents(el,c,cid,uid){
  el.querySelector('.vd-back').onclick=function(){
    el.innerHTML=el._prev;bindBlurbEvents(el,true);_bindIntroSubtabs(el);
  };
  el.querySelector('.vd-share').addEventListener('click',function(){ _shareConnector(cid); });
  // Connector photo upload
  var fi=document.getElementById(uid);
  if(fi) fi.addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;
    if(f.size>5*1024*1024){toast('Photo must be under 5MB');return;}
    var r=new FileReader();
    r.onload=function(){
      dbWrite("UPDATE connectors SET photo_url=? WHERE id=?",[r.result,cid])
        .then(function(){toast('Photo saved \u2713');openConnectorDetail(cid);})
        .catch(function(err){toast('Save failed');});
    };
    r.readAsDataURL(f);
  });
  // Partner photo uploads (blue circle click -> file dialog)
  el.querySelectorAll('.vd-file-input[data-pid]').forEach(function(inp){
    inp.addEventListener('change',function(e){
      var f=e.target.files[0];if(!f)return;
      var pid=inp.getAttribute('data-pid');if(!pid)return;
      if(f.size>5*1024*1024){toast('Photo must be under 5MB');return;}
      var r=new FileReader();
      r.onload=function(){
        dbWrite("UPDATE vc_partners SET photo_url=? WHERE id=?",[r.result,pid])
          .then(function(){toast('Partner photo saved \u2713');openConnectorDetail(cid);})
          .catch(function(err){toast('Save failed');});
      };
      r.readAsDataURL(f);
    });
  });
}
