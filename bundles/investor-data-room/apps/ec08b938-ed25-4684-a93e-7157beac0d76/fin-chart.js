/* Revenue projection canvas chart — animated bars */
function renderFinRevenueChart(projections) {
  var c = document.getElementById('fn-rev-chart');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width, H = c.height;
  var pad = { t: 30, r: 40, b: 50, l: 60 };
  var cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  var maxArr = 0;
  projections.forEach(function(p) { if (p.arr > maxArr) maxArr = p.arr; });
  maxArr = Math.ceil(maxArr / 1000) * 1000;
  var bw = cw / projections.length;
  var progress = 0;
  var duration = 40;

  function draw(pct) {
    ctx.clearRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(100,120,140,0.12)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var gy = pad.t + ch - (ch * i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + cw, gy); ctx.stroke();
      ctx.fillStyle = '#667085';
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'right';
      var val = (maxArr * i / 4);
      var lbl = val >= 1000 ? '$' + (val/1000) + 'M' : '$' + val + 'K';
      ctx.fillText(lbl, pad.l - 8, gy + 4);
    }
    // Bars
    var pts = [];
    projections.forEach(function(p, idx) {
      var x = pad.l + bw * idx + bw / 2;
      var fullH = (p.arr / maxArr) * ch;
      var barH = fullH * pct;
      var y = pad.t + ch - barH;
      var barW = bw * 0.45;
      var grad = ctx.createLinearGradient(0, y, 0, pad.t + ch);
      grad.addColorStop(0, 'rgba(1,97,224,0.8)');
      grad.addColorStop(1, 'rgba(1,97,224,0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - barW/2, y, barW, barH);
      // Year label
      ctx.fillStyle = '#14161a';
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.year, x, pad.t + ch + 20);
      // ARR label above bar
      if (pct > 0.9) {
        ctx.fillStyle = '#0161E0';
        ctx.font = '600 11px -apple-system, system-ui, sans-serif';
        var arrLbl = p.arr >= 1000 ? '$' + (p.arr/1000) + 'M' : '$' + p.arr + 'K';
        ctx.fillText(arrLbl, x, y - 8);
      }
      pts.push({ x: x, y: y });
    });
    // Connecting bezier
    if (pts.length > 1 && pct > 0.1) {
      ctx.strokeStyle = '#0161E0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < pts.length; j++) {
        var cpx = pts[j-1].x + (pts[j].x - pts[j-1].x) * 0.5;
        ctx.bezierCurveTo(cpx, pts[j-1].y, cpx, pts[j].y, pts[j].x, pts[j].y);
      }
      ctx.stroke();
      pts.forEach(function(pt) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0161E0'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      });
    }
    // Y-axis
    ctx.save();
    ctx.translate(14, pad.t + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#667085';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARR', 0, 0);
    ctx.restore();
  }

  function step() {
    progress++;
    var ease = 1 - Math.pow(1 - progress / duration, 3);
    draw(Math.min(ease, 1));
    if (progress < duration) requestAnimationFrame(step);
  }
  step();
}
