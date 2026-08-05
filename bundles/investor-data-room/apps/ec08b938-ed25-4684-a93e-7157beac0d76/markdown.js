// Markdown to HTML renderer with table support
function mdToHtml(md) {
  var html = esc(md);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m, text, url) {
    if (url.match(/^https?:\/\//)) return '<a href="' + url + '" target="_blank" class="md-link">' + text + '</a>';
    return '<a href="#" onclick="openDocLink(\'' + url + '\');return false" class="md-link md-link-doc">' + text + '</a>';
  });
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  // Tables: |col|col| rows grouped into <table>
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, function(block) {
    var rows = block.trim().split('\n');
    var out = '<table>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].replace(/^\||\|$/g, '').split('|').map(function(c) {
        return c.trim();
      });
      if (i === 1 && /^[\s:-]+$/.test(r.join(''))) continue;
      var tag = i === 0 ? 'th' : 'td';
      out += '<tr>' + r.map(function(c) {
        return '<' + tag + '>' + c + '</' + tag + '>';
      }).join('') + '</tr>';
    }
    return out + '</table>';
  });
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>(<h[123]>)/g, '$1');
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<table>)/g, '$1');
  html = html.replace(/(<\/table>)<\/p>/g, '$1');
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}
