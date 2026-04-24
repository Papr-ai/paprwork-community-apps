// Competitive Analysis editor — simplified for new data shape
function openCompEditor(d) {
  closeViewer(true);
  var rows = d.competitors.map(function(c, i) {
    return compEditorRow(c, i);
  }).join('');
  var body = '<div class="cp-ed-wrap">' +
    '<label class="cp-ed-label">Positioning</label>' +
    '<textarea class="cp-ed-pos" rows="3">' + esc(d.positioning) + '</textarea>' +
    '<label class="cp-ed-label">Competitors</label>' +
    '<div class="cp-ed-header"><span>Name</span><span>X</span>' +
    '<span>Y</span><span>Hero</span><span></span></div>' +
    '<div class="cp-ed-list">' + rows + '</div>' +
    '<button class="cp-ed-add">+ Add</button>' +
    '<div class="cp-ed-actions">' +
    '<button class="cp-ed-save">Save</button>' +
    '<button class="cp-ed-cancel">Cancel</button></div></div>';
  openViewer({
    title: 'Edit \u2014 Competitive Analysis',
    bodyHtml: body,
    afterBind: function(el) { bindCompEdEvents(el, d); }
  });
}

function compEditorRow(c, i) {
  return '<div class="cp-ed-row" data-i="' + i + '">' +
    '<input class="cp-ed-name" value="' + esc(c.name) + '" placeholder="Name">' +
    '<input class="cp-ed-x" type="number" min="0" max="100" value="' + c.x + '">' +
    '<input class="cp-ed-y" type="number" min="0" max="100" value="' + c.y + '">' +
    '<label class="cp-ed-hero"><input type="checkbox"' +
    (c.hero ? ' checked' : '') + '> Hero</label>' +
    '<button class="cp-ed-rm">&times;</button></div>';
}

function bindCompEdEvents(el, d) {
  el.querySelector('.cp-ed-add').addEventListener('click', function() {
    var list = el.querySelector('.cp-ed-list');
    var i = list.children.length;
    var row = document.createElement('div');
    row.className = 'cp-ed-row'; row.innerHTML = compEditorRow(
      { name: '', x: 50, y: 50, hero: false }, i
    ).replace(/<div[^>]*>/, '').replace(/<\/div>$/, '');
    list.appendChild(row);
  });
  el.addEventListener('click', function(e) {
    if (e.target.classList.contains('cp-ed-rm'))
      e.target.closest('.cp-ed-row').remove();
  });
  el.querySelector('.cp-ed-save').addEventListener('click', function() {
    d.positioning = el.querySelector('.cp-ed-pos').value;
    d.competitors = [];
    el.querySelectorAll('.cp-ed-row').forEach(function(row) {
      var name = row.querySelector('.cp-ed-name').value;
      d.competitors.push({
        name: name, logo: name.toLowerCase().replace(/\s/g,''),
        x: parseInt(row.querySelector('.cp-ed-x').value) || 50,
        y: parseInt(row.querySelector('.cp-ed-y').value) || 50,
        hero: row.querySelector('.cp-ed-hero input').checked
      });
    });
    localStorage.setItem('comp_data', JSON.stringify(d));
    closeViewer(true); openCompAnalysis(true);
  });
  el.querySelector('.cp-ed-cancel').addEventListener('click', function() {
    closeViewer(true); openCompAnalysis(true);
  });
}
