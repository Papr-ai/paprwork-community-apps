// Cap Table viewer — slices Section 5 ("Cap Table") from the DDQ markdown.
// Same data source as DDQ so the two are always in sync.

function extractCapTableSection(md) {
  if (!md) return '';
  // Match "## 5. Cap Table..." up to the next "## " heading or end of doc.
  var re = /(^|\n)##\s*5\.[^\n]*Cap Table[\s\S]*?(?=\n##\s|\n*$)/i;
  var m = md.match(re);
  if (!m) return '';
  return m[0].replace(/^\n+/, '');
}

function openCapTable(isFounder) {
  loadDDQ().then(function(content) {
    ddqContent = content || ddqContent || '';
    var section = extractCapTableSection(ddqContent);
    var companyName = (window.COMPANY_INFO && window.COMPANY_INFO.name) || 'Your Company';
    var bodyHtml;
    if (section) {
      bodyHtml = mdToHtml(section);
    } else {
      bodyHtml = '<div class="memo-empty">' +
        '<div class="memo-empty-title">Cap table coming soon</div>' +
        '<p style="color:var(--text-secondary);margin-top:8px">' +
        'Full breakdown will appear here once published.</p>' +
        '</div>';
    }
    openViewer({
      title: 'Cap Table — ' + companyName,
      markdown: section || ' ',
      bodyHtml: bodyHtml
    });
  });
}
