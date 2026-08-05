// Context Intelligence — Animated Graph Builder
var ctxVizActive = false;
var ctxAnimFrame = null;
var ctxCurrentSchema = 'coda';
var ctxGeneration = 0;

function renderCtxIntelViz() {
  var s = CTX_SCHEMAS[ctxCurrentSchema];
  return '<div class="ctx-viz">' +
    '<div class="ctx-header">' +
      '<div class="ctx-toggles">' +
        '<button class="ctx-tog' + (ctxCurrentSchema === 'coda' ? ' active' : '') + '" data-schema="coda">Coda</button>' +
        '<button class="ctx-tog' + (ctxCurrentSchema === 'autoreview' ? ' active' : '') + '" data-schema="autoreview">AutoReview</button>' +
      '</div>' +
    '</div>' +
    '<div class="ctx-canvas-wrap">' +
      '<div class="ctx-code-panel" style="flex:0 0 310px">' +
        '<div class="ctx-panel-label">You write this →</div>' +
        '<div class="ctx-panel-hook">The graph builds itself</div>' +
        renderCodeSnippet(s) +
      '</div>' +
      '<div class="ctx-graph-area">' +
        '<svg id="ctx-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"></svg>' +
        '<div class="ctx-prediction" id="ctx-pred"></div>' +
      '</div>' +
    '</div>' +
    '<div class="ctx-bottom">' +
      '<div class="ctx-stat"><span class="ctx-stat-val">' + s.nodes.length + '</span><span class="ctx-stat-lbl">Node types</span></div>' +
      '<div class="ctx-stat"><span class="ctx-stat-val">' + s.edges.length + '</span><span class="ctx-stat-lbl">Relationships</span></div>' +
      '<div class="ctx-stat"><span class="ctx-stat-val">' + (s.nodes.length + 1) + '</span><span class="ctx-stat-lbl">Policies</span></div>' +
      '<div class="ctx-stat"><span class="ctx-stat-val">0</span><span class="ctx-stat-lbl">Lines of ML</span></div>' +
    '</div>' +
  '</div>';
}

function renderCodeSnippet(s) {
  var code = s.codeSnippet || CTX_CODE_SNIPPETS[ctxCurrentSchema];
  return '<pre class="ctx-code"><code>' + code + '</code></pre>';
}

function startCtxAnimation() {
  ctxVizActive = true;
  ctxGeneration++;
  var gen = ctxGeneration;
  var s = CTX_SCHEMAS[ctxCurrentSchema];
  var svg = document.getElementById('ctx-svg');
  if (!svg) return;
  svg.innerHTML = '';
  var pred = document.getElementById('ctx-pred');
  if (pred) pred.className = 'ctx-prediction';

  var nodeDelay = 400;
  s.nodes.forEach(function(n, i) {
    setTimeout(function() {
      if (gen !== ctxGeneration) return;
      addNodeToSvg(svg, n, i);
    }, i * nodeDelay);
  });

  var edgeStart = s.nodes.length * nodeDelay + 300;
  s.edges.forEach(function(e, i) {
    setTimeout(function() {
      if (gen !== ctxGeneration) return;
      addEdgeToSvg(svg, e, s.nodes);
    }, edgeStart + i * 250);
  });

  var predTime = edgeStart + s.edges.length * 250 + 600;
  setTimeout(function() {
    if (gen !== ctxGeneration) return;
    firePrediction(svg, s);
  }, predTime);
}

function addNodeToSvg(svg, n, idx) {
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'ctx-svg-node ctx-svg-type-' + n.type);
  g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
  g.style.opacity = '0';
  g.innerHTML = '<circle r="4" /><text y="-6" text-anchor="middle" class="ctx-svg-label">' + n.label + '</text>';
  svg.appendChild(g);
  requestAnimationFrame(function() { g.style.opacity = '1'; });
}

function addEdgeToSvg(svg, e, nodes) {
  var from = nodes.find(function(n) { return n.id === e.from; });
  var to = nodes.find(function(n) { return n.id === e.to; });
  if (!from || !to) return;
  var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
  line.setAttribute('class', 'ctx-svg-edge');
  svg.insertBefore(line, svg.firstChild);
}

function firePrediction(svg, s) {
  var pNode = s.nodes.find(function(n) { return n.id === s.prediction.node; });
  if (!pNode) return;
  var pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pulse.setAttribute('cx', pNode.x); pulse.setAttribute('cy', pNode.y);
  pulse.setAttribute('r', '6'); pulse.setAttribute('class', 'ctx-svg-pulse');
  svg.appendChild(pulse);
  var pred = document.getElementById('ctx-pred');
  if (pred) {
    pred.innerHTML = '<span class="ctx-pred-icon">⚡</span> ' + s.prediction.text +
      '<span class="ctx-pred-conf">' + s.prediction.confidence + '</span>';
    pred.className = 'ctx-prediction visible';
  }
}

function bindCtxViz(el) {
  el.querySelectorAll('.ctx-tog').forEach(function(btn) {
    btn.onclick = function() {
      ctxVizActive = false;
      ctxCurrentSchema = btn.dataset.schema;
      var wrap = el.querySelector('.ctx-viz');
      if (wrap) wrap.outerHTML = renderCtxIntelViz();
      bindCtxViz(el);
      setTimeout(startCtxAnimation, 200);
    };
  });
  setTimeout(startCtxAnimation, 500);
}
