// CSV export for Intro Gaps — separated to keep intro-gaps.js under 100 lines
async function exportIntroGapsCSV() {
  var leads = await dbQuery(
    "SELECT id, name, fit_score, fund_url, COALESCE(met,0) as met, COALESCE(last_met_at,'') as last_met_at "
    + "FROM investors WHERE (stage='Lead' AND COALESCE(fit_score,0)>=70) OR COALESCE(met,0)=1 "
    + "ORDER BY met DESC, fit_score DESC, name ASC"
  );
  var partners = await dbQuery("SELECT investor_id, name FROM vc_partners");
  var ptrMap = {}; partners.forEach(function(p){ (ptrMap[p.investor_id]=ptrMap[p.investor_id]||[]).push(p.name); });
  var paths = await dbQuery("SELECT ip.investor_id, ip.via_person, ip.via_person_title, ip.via_person_linkedin, c.name as connector_name, c.email as connector_email, c.linkedin_url as connector_li FROM intro_pathways ip LEFT JOIN connectors c ON c.id=ip.connector_id WHERE ip.via_person != ''");
  var pathMap = {}; paths.forEach(function(p){ (pathMap[p.investor_id]=pathMap[p.investor_id]||[]).push(p); });
  var q = function(s){ s=String(s==null?'':s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  var lines = ['Fund,Fit Score,Fund URL,Partners,Status,Met Date,Connector,Connector Email,Connector LinkedIn,Intro Via Person,Via Person Title,Via Person LinkedIn,"Who can intro? (add name)"'];
  leads.forEach(function(inv){
    var ps = q((ptrMap[inv.id]||[]).join('; '));
    var cs = pathMap[inv.id] || [];
    var nm = q(inv.name), fit = q(Math.round(inv.fit_score)), url = q(inv.fund_url||'');
    if (inv.met) {
      lines.push([nm, fit, url, ps, 'MET', q(inv.last_met_at||''), '', '', '', '', '', '', ''].join(','));
    } else if (!cs.length) {
      lines.push([nm, fit, url, ps, 'GAP', '', '', '', '', '', '', '', ''].join(','));
    } else {
      cs.forEach(function(c){
        lines.push([nm, fit, url, ps, 'COVERED', '', q(c.connector_name||''), q(c.connector_email||''), q(c.connector_li||''), q(c.via_person||''), q(c.via_person_title||''), q(c.via_person_linkedin||''), ''].join(','));
      });
    }
  });
  var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'intro-gaps-'+(new Date().toISOString().slice(0,10))+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)}, 1000);
  if (typeof toast === 'function') toast('CSV exported');
}
