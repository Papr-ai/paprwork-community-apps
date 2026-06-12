/* Per-link raise amount override — swaps $3M to custom amount.
   Uses MutationObserver to catch dynamically rendered content. */
(function() {
  var link = window.ROOM_LINK;
  if (!link || !link.raise_override) return;
  var ov = link.raise_override; // e.g. "$7M"
  var ovFull = ov === '$7M' ? '$7 million' : ov;
  var swaps = [
    [/\*\*\$3M pre-seed round\.\*\*/g, '**' + ovFull + ' raise.**'],
    [/\$3M pre-seed round/gi, ovFull + ' raise'],
    [/\$3M pre-seed/gi, ovFull],
    [/\$3M Pre-Seed/g, ovFull],
    [/\$3,000,000/g, ov === '$7M' ? '$7,000,000' : ov],
    [/raising \$3M/gi, 'raising ' + ovFull],
    [/raise \$3M/gi, 'raise ' + ovFull],
    [/\$3M round/gi, ovFull + ' round'],
    [/\$3M allocation/gi, ovFull + ' allocation'],
    [/\$3M/g, ovFull]
  ];
  function doSwap(root) {
    if (!root || !root.querySelectorAll) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var txt = node.nodeValue;
      if (!txt || txt.indexOf('$3') < 0) continue;
      var changed = false;
      for (var i = 0; i < swaps.length; i++) {
        if (swaps[i][0].test(txt)) { txt = txt.replace(swaps[i][0], swaps[i][1]); changed = true; }
      }
      if (changed) node.nodeValue = txt;
    }
    var els = root.querySelectorAll('*');
    els.forEach(function(el) {
      if (el.children && el.children.length === 0 && el.innerHTML && el.innerHTML.indexOf('$3') >= 0) {
        var h = el.innerHTML;
        for (var i = 0; i < swaps.length; i++) h = h.replace(swaps[i][0], swaps[i][1]);
        if (h !== el.innerHTML) el.innerHTML = h;
      }
    });
  }
  function swapAll() { doSwap(document.body); }
  var obs = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(n) { if (n.nodeType === 1) doSwap(n); });
    });
  });
  function init() {
    swapAll();
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(swapAll, 1500);
    setTimeout(swapAll, 4000);
  }
  if (link.deck_url) window._deckUrlOverride = link.deck_url;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
