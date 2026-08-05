// Paper fold — scroll narrative with dot nav (9 sections)
var FOLD_N = 9;
function initFold() {
  document.querySelectorAll('.fold-corner,.fold-panel').forEach(function(e){e.remove();});
  var corner = document.createElement('div');
  corner.className = 'fold-corner';
  corner.innerHTML = '<div class="fold-triangle"><div class="fold-dot"></div></div>';
  document.body.appendChild(corner);
  var panel = document.createElement('div');
  panel.className = 'fold-panel'; panel.id = 'fold-panel';
  panel.innerHTML = buildFoldHTML();
  document.body.appendChild(panel);
  corner.addEventListener('click', function() {
    panel.classList.add('open'); panel.scrollTop = 0;
    setTimeout(initFoldObs, 150);
  });
  panel.querySelector('.fold-close').addEventListener('click', function(e) {
    e.stopPropagation(); panel.classList.remove('open');
  });
  panel.querySelectorAll('.fold-dots .dot').forEach(function(d, i) {
    d.addEventListener('click', function() {
      var s = panel.querySelectorAll('.fold-section')[i];
      if (s) s.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
function sec(n, c) {
  return '<div class="fold-section"><div class="fold-section-inner" data-fold="'+n+'">' + c + '</div></div>';
}
function buildFoldHTML() {
  var nd = '', dt = '';
  for (var i = 0; i < 10; i++) nd += '<div class="fold-node" style="top:'+(Math.random()*90+5)+'%;left:'+(Math.random()*90+5)+'%;animation-delay:'+(Math.random()*4).toFixed(1)+'s;animation-duration:'+(Math.random()*3+2).toFixed(1)+'s"></div>';
  for (var j = 0; j < FOLD_N; j++) dt += '<button class="dot'+(j===0?' active':'')+'"></button>';
  return '<div class="fold-orbs"><div class="fold-orb o1"></div><div class="fold-orb o2"></div></div>' +
    '<div class="fold-nodes">' + nd + '</div><button class="fold-close">CLOSE</button>' +
    '<div class="fold-dots">' + dt + '</div>' +
    sec(0,s0()) + sec(1,s1()) + sec(2,s2()) + sec(3,s3()) +
    sec(4,s7()) + sec(5,s8()) + sec(6,s4()) + sec(7,s5()) + sec(8,s6());
}
