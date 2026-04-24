// Utility functions
async function syncPhotosToDb() {
  if (typeof localStorage === 'undefined') return;
  var team = await loadTeam();
  team.forEach(function(m) {
    var stored = localStorage.getItem('dr-photo-' + m.name.replace(/\s/g, '-'));
    if (stored && stored !== m.photo_url) {
      dbWrite("UPDATE team_members SET photo_url=? WHERE name=?", [stored, m.name]).catch(function(){});
    }
  });
}

// Open a linked document — fetches from Papr docs and opens in viewer
function openDocLink(docId) {
  fetch('/api/documents/' + docId).then(function(r) {
    if (!r.ok) throw new Error('Document not found');
    return r.json();
  }).then(function(doc) {
    if (viewerOverlay) closeViewer(true);
    var content = doc.content || doc.data && doc.data.content || '';
    openViewer({
      title: doc.title || doc.data && doc.data.title || 'Document',
      markdown: content,
      bodyHtml: mdToHtml(content)
    });
  }).catch(function(e) {
    toast('Could not open document: ' + e.message);
  });
}

function toast(msg) {
  var t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('show'); }, 10);
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 2500);
}
