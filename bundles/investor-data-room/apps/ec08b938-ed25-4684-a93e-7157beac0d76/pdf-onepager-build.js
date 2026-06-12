// PDF One-Pager DOM builder — Liquid Glass design system spacing & typography.
// Proper section separation, TL;DR with blue header, breathing room.
function pdfopWordmark() {
  return (typeof LIGHT_WORDMARK !== 'undefined' && LIGHT_WORDMARK) ||
    ((window.COMPANY_INFO && window.COMPANY_INFO.logo_light)) ||
    '<span style="font-weight:700;font-size:20px;color:#14161a">' + ((window.COMPANY_INFO && window.COMPANY_INFO.name) || 'Company') + '</span>';
}
function pdfopParseMd(md) {
  var lines = (md || '').split('\n'), company = '', round = '', contact = '', subtitle = '', cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (/^\*\*Company[:：]\*\*/.test(ln)) { company = ln.replace(/^\*\*Company[:：]\*\*\s*/, '').trim(); continue; }
    if (/^\*\*Round[:：]\*\*/.test(ln)) { round = ln.replace(/^\*\*Round[:：]\*\*\s*/, '').trim(); continue; }
    if (/^\*\*Contact[:：]\*\*/.test(ln)) { contact = ln.replace(/^\*\*Contact[:：]\*\*\s*/, '').trim(); continue; }
    if (i < 5 && /^\*[^*]/.test(ln) && /production.grade|retrieval|regulated/i.test(ln)) { subtitle = ln.replace(/^\*|\*$/g, '').trim(); continue; }
    if (/Deep Problem Definition/i.test(ln)) continue;
    if (/^>\s*📄/.test(ln)) continue;
    if (i < 3 && /^#\s/.test(ln)) continue;
    if (i < 5 && /^Turn\s+(Your\s+)?Data/i.test(ln)) continue;
    cleaned.push(ln);
  }
  while (cleaned.length && (cleaned[0].trim() === '' || cleaned[0].trim() === '---')) cleaned.shift();
  return { company: company, round: round, contact: contact, subtitle: subtitle, body: cleaned.join('\n') };
}
function pdfopWrapSections(html) {
  return html.split(/(?=<h2)/).map(function(p) {
    var t = p.replace(/<[^>]*>/g, '').trim();
    return t.length > 5 ? '<div class="pdfop-sec">' + p + '</div>' : '';
  }).join('');
}
function buildPdfOnePagerDom(opts) {
  var md = opts.markdown || '';
  var dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var parsed = pdfopParseMd(md);
  var bodyMd = parsed.body;
  // Split: TL;DR intro (before first ##) vs rest (## sections)
  var firstH2 = bodyMd.indexOf('\n## ');
  var intro = '', rest = bodyMd;
  if (firstH2 > 0) {
    intro = bodyMd.slice(0, firstH2).replace(/^---\s*/gm, '').replace(/^## TL;DR\s*/m, '').trim();
    rest = bodyMd.slice(firstH2);
  }
  var introHtml = intro ? mdToHtml(intro) : '';
  var bodyHtml = pdfopWrapSections(mdToHtml(rest));
  var mark = pdfopWordmark();
  // Subtitle line (italic below headline)
  var sub = '';
  if (parsed.subtitle) {
    sub = '<div class="pdfop-sub">' + esc(parsed.subtitle) + '</div>';
  }
  // Company / Round / Contact detail line
  var det = '';
  if (parsed.company || parsed.round || parsed.contact) {
    det = '<div class="pdfop-det">';
    if (parsed.company) det += '<strong>Company:</strong> ' + esc(parsed.company) + '&nbsp;&nbsp;&nbsp;&nbsp;';
    if (parsed.round) det += '<strong>Round:</strong> ' + esc(parsed.round) + '&nbsp;&nbsp;&nbsp;&nbsp;';
    if (parsed.contact) det += '<strong>Contact:</strong> ' + esc(parsed.contact);
    det += '</div>';
  }
  // TL;DR block with proper blue section header
  var tldr = '';
  if (introHtml) {
    tldr = '<div class="pdfop-tldr">' +
      '<div class="pdfop-tldr-label">TL;DR</div>' +
      '<div class="pdfop-tldr-body">' + introHtml + '</div>' +
    '</div>';
  }
  var html =
    '<div class="pdfop-hdr">' +
      '<div class="pdfop-wm">' + mark + '</div>' +
      '<div class="pdfop-date">One-Pager &middot; ' + dateStr + '</div>' +
    '</div>' +
    '<h1 class="pdfop-hl">Graph-Native Embedding and Ranking Models for Agents</h1>' +
    sub + det + tldr +
    '<div class="pdfop-body">' + bodyHtml + '</div>' +
    '<div class="pdfop-ft">' +
      '<span>' + ((window.COMPANY_INFO && window.COMPANY_INFO.website) || '') + '</span><span class="dt"></span>' +
      '<span>' + ((window.COMPANY_INFO && window.COMPANY_INFO.contact_email) || '') + '</span><span class="dt"></span>' +
      '<span></span><span class="dt"></span>' +
      '<span>Confidential</span>' +
    '</div>';
  var root = document.createElement('div');
  root.className = 'pdfop-root';
  root.innerHTML = html;
  return root;
}
