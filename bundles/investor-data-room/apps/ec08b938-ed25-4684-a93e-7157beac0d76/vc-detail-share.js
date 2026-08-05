// Share connector — use their share_token, show pre/post commit picker
async function _shareConnector(cid){
  var conn=(await dbQuery("SELECT * FROM connectors WHERE id=?",[cid]))[0];
  if(!conn){toast('Connector not found');return;}
  var token=conn.share_token;
  if(!token){toast('No share token for '+conn.name+' — generate one first');return;}
  showShareModeDialog(conn.name, token, function(mode, url){
    navigator.clipboard.writeText(url).then(function(){
      toast((mode==='pre'?'Pre-commit':'Full access')+' link copied for '+conn.name+'!');
    });
  });
}
