// Additional DB query functions
async function loadInvestors() {
  try { return await dbQuery("SELECT * FROM investors ORDER BY fit_score DESC, created_at DESC"); }
  catch(e) { return []; }
}
async function loadInvestorLinks(investorId) {
  return dbQuery("SELECT * FROM investor_links WHERE investor_id=? AND revoked=0 ORDER BY created_at DESC", [investorId]);
}
async function loadVercelUrl() {
  window.VERCEL_DEPLOY_URL = window.DEPLOY_DOMAIN || '';
  return window.VERCEL_DEPLOY_URL;
}
async function loadDemos() {
  if (window.ROOM_DATA && window.ROOM_DATA.demos) return window.ROOM_DATA.demos;
  try { return await dbQuery("SELECT * FROM demos ORDER BY sort_order"); }
  catch(e) { return []; }
}
async function loadICP() {
  if (window.ROOM_DATA && window.ROOM_DATA.icp) return window.ROOM_DATA.icp;
  try { var rows = await dbQuery("SELECT * FROM icp_criteria WHERE id=1"); return rows[0] || {}; }
  catch(e) { return {}; }
}
async function loadIntroContacts(investorId) {
  if (investorId) return dbQuery("SELECT * FROM intro_contacts WHERE investor_id=? ORDER BY match_score DESC", [investorId]);
  return dbQuery("SELECT * FROM intro_contacts ORDER BY match_score DESC");
}
async function loadIntros(investorId) {
  if (investorId) return dbQuery("SELECT i.*, c.name as contact_name, c.title, c.company FROM intros i JOIN intro_contacts c ON i.contact_id=c.id WHERE i.investor_id=?", [investorId]);
  return dbQuery("SELECT i.*, c.name as contact_name, c.title, c.company, inv.name as fund_name FROM intros i JOIN intro_contacts c ON i.contact_id=c.id JOIN investors inv ON i.investor_id=inv.id ORDER BY i.sent_at DESC");
}
async function loadIntroStats() {
  return dbQuery("SELECT inv.name as fund_name, inv.id as investor_id, COUNT(i.id) as intro_count FROM investors inv LEFT JOIN intros i ON inv.id=i.investor_id GROUP BY inv.id ORDER BY intro_count DESC");
}
async function loadInvestorPortfolio(investorId) {
  return dbQuery(
    "SELECT * FROM vc_portfolio_companies WHERE investor_id=? AND (company_domain<>'' OR source_confidence>=0.75) AND lower(company_name) NOT IN ('blog','blogs','the blog','devblogs','connect with us','our investments') ORDER BY CASE competitor_category WHEN 'direct' THEN 0 WHEN 'adjacent' THEN 1 WHEN 'theme' THEN 2 ELSE 3 END, intro_priority_score DESC, company_name",
    [investorId]
  );
}
function esc(s) {
  if (!s) return '';
  var t = String(s);
  t = t.replace(/&/g, '&amp;');
  t = t.replace(/</g, '&lt;');
  t = t.replace(/>/g, '&gt;');
  return t;
}
async function loadPartners() {
  try { return await dbQuery("SELECT * FROM vc_partners"); }
  catch(e) { return []; }
}
function fmt(n) {
  if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
  return '$' + n;
}
