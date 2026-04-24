/* Moat Layer Canvas Visuals */
function drawKnowledgeGraph(c) {
  const x = c.getContext('2d'); c.width = c.height = 180;
  const nodes = [
    {x:90,y:90,r:7,m:1},{x:35,y:30},{x:145,y:28},{x:152,y:110},
    {x:40,y:140},{x:90,y:160},{x:135,y:155},{x:22,y:85},
    {x:162,y:70},{x:70,y:25},{x:115,y:48},{x:50,y:105},{x:138,y:138}
  ];
  const edges = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
    [1,9],[9,10],[10,2],[2,8],[8,3],[3,12],[12,6],
    [4,11],[11,7],[7,1],[5,12],[5,6],[4,7],[9,1]
  ];
  edges.forEach(([a,b]) => {
    const g = x.createLinearGradient(nodes[a].x,nodes[a].y,nodes[b].x,nodes[b].y);
    g.addColorStop(0,'rgba(59,130,246,0.5)');
    g.addColorStop(1,'rgba(139,92,246,0.3)');
    x.beginPath(); x.moveTo(nodes[a].x,nodes[a].y);
    x.lineTo(nodes[b].x,nodes[b].y);
    x.strokeStyle=g; x.lineWidth=1.5; x.stroke();
  });
  nodes.forEach(n => {
    const r = n.r||4;
    const g = x.createRadialGradient(n.x,n.y,0,n.x,n.y,r*3);
    g.addColorStop(0,n.m?'rgba(59,130,246,0.4)':'rgba(139,92,246,0.15)');
    g.addColorStop(1,'transparent');
    x.fillStyle=g; x.fillRect(n.x-r*3,n.y-r*3,r*6,r*6);
    x.beginPath(); x.arc(n.x,n.y,r,0,Math.PI*2);
    x.fillStyle=n.m?'#3b82f6':'rgba(139,92,246,0.8)'; x.fill();
    x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=1; x.stroke();
  });
}

function drawPredictiveModels(c) {
  const x = c.getContext('2d'); c.width = c.height = 180;
  const pts = [];
  for(let i=0;i<=40;i++){
    const t=i/40, px=15+t*150, py=155-(Math.pow(t,0.6)*120)+Math.sin(t*8)*7;
    pts.push({x:px,y:py});
  }
  x.beginPath();
  pts.forEach((p,i)=>{const s=14-(i/40)*10;i?x.lineTo(p.x,p.y-s):x.moveTo(p.x,p.y-s);});
  for(let i=40;i>=0;i--){const s=14-(i/40)*10;x.lineTo(pts[i].x,pts[i].y+s);}
  x.closePath(); x.fillStyle='rgba(16,185,129,0.1)'; x.fill();
  x.beginPath();
  pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));
  const g=x.createLinearGradient(15,0,165,0);
  g.addColorStop(0,'rgba(16,185,129,0.3)'); g.addColorStop(1,'#10b981');
  x.strokeStyle=g; x.lineWidth=2.5; x.stroke();
  [10,20,30,38].forEach(i=>{
    x.beginPath(); x.arc(pts[i].x,pts[i].y,3.5,0,Math.PI*2);
    x.fillStyle='#10b981'; x.fill();
    x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=1; x.stroke();
  });
  x.strokeStyle='rgba(255,255,255,0.12)'; x.lineWidth=1;
  x.beginPath(); x.moveTo(15,168); x.lineTo(170,168);
  x.moveTo(15,168); x.lineTo(15,20); x.stroke();
}

function renderMoatVisuals() {
  const map = {
    'graph': drawKnowledgeGraph, 'predict': drawPredictiveModels,
    'embed': drawHolographicEmbeddings, 'vertical': drawVerticalCompounding
  };
  Object.entries(map).forEach(([id, fn]) => {
    const el = document.getElementById('moat-vis-' + id);
    if (el) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:100%;';
      el.innerHTML = ''; el.appendChild(canvas); fn(canvas);
    }
  });
}
