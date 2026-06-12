// FAQ editor — same pattern as moat-edit/gtm-edit
function openFAQEditor(items) {
  closeViewer(true);
  // Deep clone so cancel works
  var data = JSON.parse(JSON.stringify(items));
  var rows = data.map(function(q, i) { return _faqEditRow(q, i); }).join('');
  var body = '<div class="mt-ed-wrap">' +
    '<div class="mt-ed-header"><label class="mt-ed-label">FAQ Questions & Answers</label>' +
    '<div class="faq-ed-hint">Edit, reorder, add or remove questions. Changes save to your browser.</div></div>' +
    '<div class="mt-ed-pages"><div class="mt-ed-page faq-ed-list">' + rows + '</div></div>' +
    '<button class="mt-ed-add" id="faq-ed-add">+ Add question</button>' +
    '<div class="mt-ed-actions">' +
    '<button class="mt-ed-save" id="faq-ed-save">Save</button>' +
    '<button class="mt-ed-cancel" id="faq-ed-cancel">Cancel</button>' +
    '<button class="mt-ed-cancel" id="faq-ed-reset" style="margin-left:auto;opacity:0.7">Reset to defaults</button>' +
    '</div></div>';
  openViewer({
    title: 'Edit — FAQ',
    bodyHtml: body,
    afterBind: function(el) { _bindFAQEditor(el); }
  });
}

function _faqEditRow(q, i) {
  return '<div class="mt-ed-row-card glass faq-ed-row" data-i="' + i + '">' +
    '<div class="faq-ed-top">' +
    '<input class="mt-ed-tq faq-ed-cat" value="' + esc(q.category || '') + '" placeholder="Category (e.g. Technical)">' +
    '<button class="mt-ed-rm faq-ed-up" title="Move up">&uarr;</button>' +
    '<button class="mt-ed-rm faq-ed-down" title="Move down">&darr;</button>' +
    '<button class="mt-ed-rm faq-ed-del" title="Remove">&times;</button>' +
    '</div>' +
    '<input class="mt-ed-tq faq-ed-q" value="' + esc(q.question || '') + '" placeholder="Question">' +
    '<textarea class="mt-ed-ta faq-ed-a" rows="6" placeholder="Answer (Markdown supported)">' + esc(q.answer || '') + '</textarea>' +
    '</div>';
}

function _bindFAQEditor(el) {
  var listEl = el.querySelector('.faq-ed-list');

  el.querySelector('#faq-ed-add').addEventListener('click', function() {
    var n = listEl.querySelectorAll('.faq-ed-row').length;
    var div = document.createElement('div');
    div.innerHTML = _faqEditRow({ category: '', question: '', answer: '' }, n);
    listEl.appendChild(div.firstChild);
  });

  listEl.addEventListener('click', function(e) {
    var row = e.target.closest('.faq-ed-row');
    if (!row) return;
    if (e.target.classList.contains('faq-ed-del')) {
      row.remove();
    } else if (e.target.classList.contains('faq-ed-up')) {
      var prev = row.previousElementSibling;
      if (prev) listEl.insertBefore(row, prev);
    } else if (e.target.classList.contains('faq-ed-down')) {
      var next = row.nextElementSibling;
      if (next) listEl.insertBefore(next, row);
    }
  });

  el.querySelector('#faq-ed-save').addEventListener('click', function() {
    _saveFAQ(el);
  });
  el.querySelector('#faq-ed-cancel').addEventListener('click', function() {
    closeViewer(true); openFAQ(true);
  });
  el.querySelector('#faq-ed-reset').addEventListener('click', function() {
    if (confirm('Reset FAQ to default questions? This cannot be undone.')) {
      localStorage.removeItem('faq_data_v1');
      closeViewer(true); openFAQ(true);
    }
  });
}

function _saveFAQ(el) {
  var rows = el.querySelectorAll('.faq-ed-row');
  var items = [];
  rows.forEach(function(r, i) {
    var cat = r.querySelector('.faq-ed-cat').value.trim();
    var q = r.querySelector('.faq-ed-q').value.trim();
    var a = r.querySelector('.faq-ed-a').value.trim();
    if (q || a) {
      items.push({
        id: i + 1,
        category: cat || 'General',
        question: q,
        answer: a,
        sort_order: i + 1
      });
    }
  });
  localStorage.setItem('faq_data_v1', JSON.stringify(items));
  closeViewer(true); openFAQ(true);
}
