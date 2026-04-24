/* Moat visuals — holographic embeddings + vertical compounding */
function drawHolographicEmbeddings(c) {
  const x = c.getContext('2d'); c.width = c.height = 180;
  const cx=90, cy=90;
  [60,45,30,18].forEach((r,i)=>{
    x.beginPath();
    for(let a=0;a<360;a+=2){
      const rad=a*Math.PI/180;
      const wave=r+Math.sin(a*(0.05+i*0.02))*(4+i*2);
      const px=cx+Math.cos(rad)*wave, py=cy+Math.sin(rad)*wave;
      a?x.lineTo(px,py):x.moveTo(px,py);
    }
    x.closePath();
    const alpha=0.15+i*0.1;
    x.strokeStyle=`rgba(168,85,247,${alpha+0.2})`;
    x.lineWidth=1.5; x.stroke();
    x.fillStyle=`rgba(168,85,247,${alpha*0.3})`;
    x.fill();
  });
  const g=x.createRadialGradient(cx,cy,0,cx,cy,25);
  g.addColorStop(0,'rgba(168,85,247,0.6)');
  g.addColorStop(0.5,'rgba(168,85,247,0.15)');
  g.addColorStop(1,'transparent');
  x.fillStyle=g; x.fillRect(cx-30,cy-30,60,60);
  x.beginPath(); x.arc(cx,cy,5,0,Math.PI*2);
  x.fillStyle='#a855f7'; x.fill();
  x.strokeStyle='rgba(255,255,255,0.6)'; x.lineWidth=1; x.stroke();
}

function drawVerticalCompounding(c) {
  const x = c.getContext('2d'); c.width = c.height = 180;
  const layers = [
    {y:140,h:28,c:'rgba(245,158,11,0.2)',b:'rgba(245,158,11,0.5)',l:'Commerce'},
    {y:105,h:28,c:'rgba(59,130,246,0.2)',b:'rgba(59,130,246,0.5)',l:'FinTech'},
    {y:70,h:28,c:'rgba(16,185,129,0.2)',b:'rgba(16,185,129,0.5)',l:'Healthcare'},
    {y:35,h:28,c:'rgba(168,85,247,0.2)',b:'rgba(168,85,247,0.5)',l:'Enterprise'}
  ];
  layers.forEach((la,i)=>{
    const w=140-i*15, lx=(180-w)/2;
    x.fillStyle=la.c; x.strokeStyle=la.b; x.lineWidth=1.5;
    x.beginPath(); x.roundRect(lx,la.y,w,la.h,6); x.fill(); x.stroke();
    x.fillStyle='#1a1a2e';
    x.font='600 11px -apple-system,system-ui,sans-serif';
    x.textAlign='center'; x.fillText(la.l,90,la.y+18);
  });
  [125,90,55].forEach(y=>{
    x.beginPath(); x.moveTo(85,y); x.lineTo(90,y-8); x.lineTo(95,y);
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=1.5; x.stroke();
  });
  x.beginPath(); x.moveTo(160,155); x.lineTo(160,30);
  x.strokeStyle='rgba(0,0,0,0.15)'; x.lineWidth=1; x.stroke();
  x.beginPath(); x.moveTo(155,35); x.lineTo(160,25); x.lineTo(165,35);
  x.fillStyle='rgba(0,0,0,0.3)'; x.fill();
}
