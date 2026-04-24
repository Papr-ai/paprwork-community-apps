// FAQ viewer — accordion style using shared viewer overlay
async function loadFAQ() {
  if (window.ROOM_DATA && window.ROOM_DATA.faq) return window.ROOM_DATA.faq;
  try {
    var rows = await dbQuery("SELECT * FROM faq ORDER BY sort_order");
    return rows;
  } catch(e) { return []; }
}

function faqToMarkdown(items) {
  var md = '# Papr — Frequently Asked Questions\n\n';
  var cat = '';
  items.forEach(function(q) {
    if (q.category !== cat) { cat = q.category; md += '## ' + cat + '\n\n'; }
    md += '### ' + q.question + '\n\n' + q.answer + '\n\n---\n\n';
  });
  return md;
}

function buildFAQBody(items) {
  var html = '';
  var cat = '';
  items.forEach(function(q, i) {
    if (q.category !== cat) {
      if (cat) html += '</div>';
      cat = q.category;
      html += '<div class="faq-cat"><div class="faq-cat-label">' + esc(cat) + '</div>';
    }
    html += '<div class="faq-item" data-fi="' + i + '">' +
      '<button class="faq-q"><span>' + esc(q.question) + '</span>' +
      '<svg class="faq-chevron" width="14" height="14" viewBox="0 0 14 14"><path d="M4 5.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg></button>' +
      '<div class="faq-a"><div class="faq-a-inner">' + mdToHtml(q.answer) + '</div></div></div>';
  });
  if (cat) html += '</div>';
  return html;
}

function openFAQ(isFounder) {
  loadFAQ().then(function(items) {
    if (!items.length) return;
    var md = faqToMarkdown(items);
    openViewer({
      title: 'FAQ',
      markdown: md,
      bodyHtml: buildFAQBody(items),
      onEdit: isFounder ? function() { closeViewer(); openOnePager(true); } : null,
      afterBind: function(el) {
        el.querySelectorAll('.faq-q').forEach(function(btn) {
          btn.onclick = function() {
            var item = btn.parentElement;
            var wasOpen = item.classList.contains('open');
            el.querySelectorAll('.faq-item.open').forEach(function(x) { x.classList.remove('open'); });
            if (!wasOpen) item.classList.add('open');
          };
        });
      }
    });
  });
}
