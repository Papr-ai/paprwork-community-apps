// Deep Problem Definition — opens in viewer overlay
function bindRubricLinks(el) {
  var links = el.querySelectorAll('a.md-link-doc');
  for (var i = 0; i < links.length; i++) {
    var onclick = links[i].getAttribute('onclick') || '';
    if (onclick.indexOf('deep-problem-definition') > -1) {
      links[i].setAttribute('onclick', '');
      links[i].removeAttribute('onclick');
      links[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openRubricViewer();
      });
      links[i].style.cursor = 'pointer';
    }
  }
}

function openRubricViewer() {
  // On Vercel (ROOM_DATA present), use embedded RUBRIC_MD directly
  if (window.ROOM_DATA && window.RUBRIC_MD) {
    showRubricInViewer(window.RUBRIC_MD); return;
  }
  // Local: try fetching file, fall back to embedded
  fetch('deep-problem-definition.md')
    .then(function(r) {
      if (!r.ok) throw new Error('not found');
      return r.text();
    })
    .then(function(md) {
      // Guard: if response is HTML (Vercel catch-all), use embedded
      if (md.trim().substring(0, 15).indexOf('<!DOCTYPE') >= 0 || md.trim().substring(0, 5) === '<html') {
        if (window.RUBRIC_MD) { showRubricInViewer(window.RUBRIC_MD); return; }
      }
      showRubricInViewer(md);
    })
    .catch(function() {
      if (window.RUBRIC_MD) { showRubricInViewer(window.RUBRIC_MD); return; }
      toast('Could not load rubric');
    });
}

function showRubricInViewer(md) {
  if (viewerOverlay) closeViewer(true);
  openViewer({
    title: 'Deep Problem Definition & Rubric',
    markdown: md,
    bodyHtml: mdToHtml(md)
  });
}
