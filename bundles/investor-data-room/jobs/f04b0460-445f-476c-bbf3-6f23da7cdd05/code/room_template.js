const ROOM = __ROOM_DATA__;
const LINKS = {};
(ROOM.links || []).forEach(l => { LINKS[l.token] = l; });
const CONNECTORS = {};
(ROOM.connectors || []).forEach(c => { if(c.share_token) CONNECTORS[c.share_token] = c; });
const FOLD_HTML = __FOLD_HTML__;
const DEMOS = __DEMOS_DATA__;
const ONE_PAGER = ROOM.one_pager || "";

module.exports = function handler(req, res) {
  const token = req.query.token || '';
  if (!token) return res.status(200).send(landing());
  const connector = CONNECTORS[token];
  if (connector) return res.status(200).send(renderConnector(ROOM, connector));
  const link = LINKS[token];
  if (!link) return res.status(404).send(err('Link not found', 'This link may have expired or been revoked.'));
  if (link.revoked) return res.status(403).send(err('Access revoked', 'This data room link has been revoked.'));
  return res.status(200).send(render(ROOM, link));
};

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
function fmt(n) { return n >= 1e6 ? '$'+(n/1e6).toFixed(1)+'M' : n >= 1e3 ? '$'+(n/1e3).toFixed(0)+'K' : '$'+n; }

function vidEmbed(u){var id='';if(u.indexOf('youtu.be/')>-1)id=u.split('youtu.be/')[1].split('?')[0];else if(u.indexOf('v=')>-1)id=u.split('v=')[1].split('&')[0];if(!id)return '<a href="'+esc(u)+'" target="_blank" class="dvb">Watch Demo</a>';return '<div class="dvw"><iframe src="https://www.youtube.com/embed/'+id+'?rel=0&modestbranding=1" allowfullscreen></iframe></div>';}
function mdToH(md){if(!md)return '';var h=esc(md);h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>');h=h.replace(/^## (.+)$/gm,'<h2>$1</h2>');h=h.replace(/^# (.+)$/gm,'<h1>$1</h1>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');h=h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');h=h.replace(/^---$/gm,'<hr>');h=h.replace(/((?:^\|.+\|$\n?)+)/gm,function(block){var rows=block.trim().split('\n');var out='<table>';for(var i=0;i<rows.length;i++){var r=rows[i].replace(/^\||\|$/g,'').split('|').map(function(c){return c.trim();});if(i===1&&/^[\s:-]+$/.test(r.join('')))continue;var tag=i===0?'th':'td';out+='<tr>'+r.map(function(c){return '<'+tag+'>'+c+'</'+tag+'>';}).join('')+'</tr>';}return out+'</table>';});h=h.replace(/^- (.+)$/gm,'<li>$1</li>');h=h.replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>');h=h.replace(/<\/ul>\s*<ul>/g,'');h=h.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>';h=h.replace(/<p>(<h[123]>)/g,'$1');h=h.replace(/(<\/h[123]>)<\/p>/g,'$1');h=h.replace(/<p>(<table>)/g,'$1');h=h.replace(/(<\/table>)<\/p>/g,'$1');h=h.replace(/<p>(<ul>)/g,'$1');h=h.replace(/(<\/ul>)<\/p>/g,'$1');h=h.replace(/<p>(<hr>)<\/p>/g,'$1');h=h.replace(/<p>(<blockquote>)/g,'$1');h=h.replace(/(<\/blockquote>)<\/p>/g,'$1');h=h.replace(/<p>\s*<\/p>/g,'');return h;}
function render(room, link) {
  const c = room.company, r = room.raise;
  const vis = link.sections_visible ? JSON.parse(link.sections_visible) : [];
  const secs = vis.length ? room.sections.filter(s => vis.includes(s.id)) : room.sections;
  const pR = Math.min((r.raised_amount/r.target_amount)*100,100);
  const pC = Math.min(((r.raised_amount+r.committed_amount)/r.target_amount)*100,100);
  const logo = link.logo_url ? `<img src="${esc(link.logo_url)}" class="flogo" onerror="this.style.display='none'">` : '';
  const pName = link.partner_name || '';
  const pTitle = link.partner_title || '';
  const pPhoto = link.partner_photo || '';
  const pInit = pName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const pAv = pPhoto ? '<img src="'+esc(pPhoto)+'" class="pav" onerror="this.outerHTML=\'<div class=pav-init>'+pInit+'</div>\'">': (pName ? '<div class="pav-init">'+pInit+'</div>' : '');
  const partnerHtml = pName ? '<div class="ppl">'+pAv+'<div class="ppd"><span class="ppn">'+esc(pName)+'</span>'+(pTitle?'<span class="ppt">'+esc(pTitle)+'</span>':'')+'</div></div>' : '';
  const secH = secs.map(s => {
    const docs = room.documents.filter(d => d.section_id === s.id);
    const dH = docs.map(d => {
      const ic = {pdf:'\u{1F4C4}',doc:'\u{1F4DD}',sheet:'\u{1F4CA}',video:'\u{1F3AC}',link:'\u{1F517}'}[d.file_type]||'\u{1F4C4}';
      return `<div class="dr">${ic}<div class="di"><b>${esc(d.name)}</b><span>${esc(d.description)}</span></div></div>`;
    }).join('');
    return `<div class="sec"><div class="sh"><small>${esc(s.label)}</small><span>${esc(s.description)}</span></div>${dH}</div>`;
  }).join('');
  const tH = room.team.map(m => {
    const ini = m.name.split(' ').map(n=>n[0]).join('');
    const ls = [m.linkedin?`<a href="${esc(m.linkedin)}" target="_blank">LinkedIn</a>`:'',m.x_url?`<a href="${esc(m.x_url)}" target="_blank">\u{1D54F}</a>`:''].filter(Boolean).join(' ');
    return `<div class="tc"><div class="av">${ini}</div><b>${esc(m.name)}</b><em>${esc(m.role)}</em><span>${esc(m.bio)}</span><div class="tl">${ls}</div></div>`;
  }).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.name)} \u00B7 Data Room</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;background:#050a12;color:rgba(255,255,255,.92);line-height:1.5;min-height:100vh}
a{color:#0CF}.mx{max-width:860px;margin:0 auto;padding:24px 24px 80px}.hd{text-align:center;padding:20px 0 8px;font-size:15px;color:rgba(255,255,255,.55);font-weight:500;letter-spacing:.5px}
.pf{display:flex;align-items:center;gap:12px;padding:14px 0;margin-bottom:20px;flex-wrap:wrap}.flogo{width:40px;height:40px;border-radius:10px;object-fit:contain}.pfn{font-size:14px;color:rgba(255,255,255,.55);font-weight:500}
.ppl{display:flex;align-items:center;gap:10px;margin-right:8px;padding-right:16px;border-right:1px solid rgba(255,255,255,.1)}
.pav{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.15)}
.pav-init{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0161E0,#0CF);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;letter-spacing:.5px}
.ppd{display:flex;flex-direction:column;gap:1px}
.ppn{font-size:14px;font-weight:600;color:rgba(255,255,255,.85)}
.ppt{font-size:12px;color:rgba(255,255,255,.45)}
.rb{padding:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:24px}.rbh{display:flex;justify-content:space-between;margin-bottom:12px}.rbl{font-size:14px;font-weight:600}.rbt{font-size:13px;color:rgba(255,255,255,.55)}
.rt{height:8px;background:rgba(255,255,255,.08);border-radius:4px;position:relative;overflow:hidden}.rf{position:absolute;top:0;left:0;height:100%;border-radius:4px}.rfr{background:linear-gradient(90deg,#0161E0,#0CF);z-index:2}.rfc{background:rgba(1,97,224,.35);z-index:1}
.rm{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}.rc{font-size:12px;padding:3px 10px;border-radius:6px;font-weight:500}.rcr{background:rgba(1,97,224,.18);color:#0CF}.rcc{background:rgba(1,97,224,.1);color:rgba(255,255,255,.55)}
.ch{padding:28px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:32px}.cn{font-size:36px;font-weight:700;letter-spacing:-.5px;margin-bottom:6px}
.ct{font-size:16px;color:#0CF;font-weight:500;margin-bottom:12px}.co{font-size:15px;color:rgba(255,255,255,.55);line-height:1.65;margin-bottom:20px}.cl{display:flex;gap:12px;flex-wrap:wrap}
.lp{display:inline-flex;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:500;color:#0CF;background:rgba(1,97,224,.12);border:1px solid rgba(1,97,224,.2);text-decoration:none}
.sec{margin-bottom:32px}.sh{margin-bottom:12px}.sh small{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.32);display:block;margin-bottom:4px}.sh span{font-size:13px;color:rgba(255,255,255,.55)}
.dr{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:2px;cursor:pointer}.di{flex:1}.di b{font-size:14px;font-weight:500;display:block}.di span{font-size:12px;color:rgba(255,255,255,.55);display:block}
.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.tc{padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px}
.av{width:66px;height:66px;border-radius:50%;background:linear-gradient(135deg,#0161E0,#0CF);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;margin-bottom:4px}
.tc b{font-size:14px}.tc em{font-size:12px;color:#0CF;font-weight:500;font-style:normal}.tc span{font-size:12px;color:rgba(255,255,255,.55);line-height:1.5}.tl{display:flex;gap:8px;margin-top:4px}.tl a{font-size:12px;opacity:.7}
.ft{text-align:center;padding:32px 0;border-top:1px solid rgba(255,255,255,.1);margin-top:40px;font-size:12px;color:rgba(255,255,255,.32)}
.opc{padding:24px;font-size:15px;line-height:1.8;color:rgba(255,255,255,.88)}.opc h1{font-size:26px;font-weight:700;margin:0 0 16px}.opc h2{font-size:20px;font-weight:600;margin:24px 0 12px;color:#0161E0}.opc h3{color:#0161E0}.opc h3{font-size:16px;font-weight:600;margin:20px 0 8px}.opc p{margin:0 0 12px}.opc strong{font-weight:600;color:rgba(255,255,255,.95)}.opc ul{margin:0 0 12px;padding-left:24px}.opc li{margin-bottom:4px}.opc blockquote{margin:12px 0;padding:12px 16px;border-left:3px solid #0161E0;background:rgba(1,97,224,.06);border-radius:0 8px 8px 0}.opc hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin:24px 0}.opc table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}.opc th{text-align:left;padding:10px 12px;border-bottom:2px solid #0161E0;font-weight:600;color:rgba(255,255,255,.95)}.opc td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1)}.opc tr:hover td{background:rgba(1,97,224,.04)}@media(max-width:640px){.tg{grid-template-columns:1fr}}

.demo-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .35s ease}
.demo-overlay.open{opacity:1}
.dob{position:absolute;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(12px)}
.dc{position:relative;width:90%;max-width:560px;max-height:85vh;overflow-y:auto;padding:32px 28px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 80px rgba(0,0,0,.5);transform:translateY(20px);transition:transform .35s ease}
.demo-overlay.open .dc{transform:translateY(0)}
.dx{position:absolute;top:16px;right:20px;background:none;border:none;color:rgba(255,255,255,.4);font-size:11px;letter-spacing:1.5px;cursor:pointer}
.dds{display:flex;gap:8px;justify-content:center;margin-bottom:24px}
.dd{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);border:none;cursor:pointer;padding:0;transition:all .2s}
.da{background:#0161E0;box-shadow:0 0 8px rgba(1,97,224,.5);transform:scale(1.35)}
.dst{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:600;margin-bottom:6px}
.dtt{font-size:26px;font-weight:700;margin-bottom:12px;background:linear-gradient(135deg,#fff,#0CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.dde{font-size:14px;color:rgba(255,255,255,.6);line-height:1.65;margin-bottom:24px}
.bl{display:flex;gap:20px;margin-bottom:16px;font-size:12px;color:rgba(255,255,255,.5)}
.li{display:flex;align-items:center;gap:6px}
.ld{width:10px;height:10px;border-radius:3px}
.lb{background:rgba(255,255,255,.15)}.lgp{background:linear-gradient(90deg,#0161E0,#0CF)}
.br{margin-bottom:18px}.bh{display:flex;justify-content:space-between;margin-bottom:2px}
.bh b{font-size:14px;color:rgba(255,255,255,.9)}.bh small{font-size:11px;color:rgba(255,255,255,.35)}
.bla{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px}
.bbs{display:flex;flex-direction:column;gap:4px}
.bbw{display:flex;align-items:center;gap:10px;height:22px}
.bb{height:100%;border-radius:6px;transition:width 1.2s cubic-bezier(.22,1,.36,1)}
.bbl{background:rgba(255,255,255,.1)}.bbp{background:linear-gradient(90deg,#0161E0,#0CF)}
.bv{font-size:13px;font-weight:600;color:rgba(255,255,255,.45);min-width:40px}
.bvp{color:#0CF}
.bi{margin-top:16px;padding:12px 16px;border-left:3px solid #0161E0;font-size:13px;color:rgba(255,255,255,.55);line-height:1.55;background:rgba(1,97,224,.06);border-radius:0 8px 8px 0}
.df{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.dfi{padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.dfi b{display:block;font-size:13px;color:rgba(255,255,255,.85);margin-bottom:4px}
.dfi span{display:block;font-size:12px;color:rgba(255,255,255,.45);line-height:1.5}
.dsh{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)}
.sa{font-size:28px;color:rgba(255,255,255,.3);cursor:pointer;padding:0 12px}.sa:hover{color:rgba(255,255,255,.8)}
.sla{font-size:12px;color:rgba(255,255,255,.3);letter-spacing:1px}
</style></head><body><div class="mx">
<div class="hd">${esc(c.name)} \u00B7 Data Room</div>
<div class="pf">${partnerHtml}${logo}<span class="pfn">${esc(link.fund_name)}</span></div>
<div class="rb"><div class="rbh"><span class="rbl">${esc(r.stage)} Round</span><span class="rbt">Target: ${fmt(r.target_amount)}</span></div>
<div class="rt"><div class="rf rfr" style="width:${pR}%"></div><div class="rf rfc" style="width:${pC}%"></div></div>
<div class="rm"><span class="rc rcr">Raised ${fmt(r.raised_amount)}</span><span class="rc rcc">Committed ${fmt(r.committed_amount)}</span></div></div>
<div class="ch"><div class="cnl"><svg width="180" height="42" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M712.5 27.4C722.2 9.1 738.6 1.1 756.5 3V3C759.8 3 762.5 5.7 762.5 9V18.9C762.5 22.2 759.8 24.9 756.5 25C735.5 25 715.5 40 714.5 81V91H714.5V134C714.5 134 714.5 134.1 714.5 134.1V137C714.5 142.5 710 147 704.5 147H702.5C702.6 147 702.5 147 702.5 147H696.5C691 147 686.5 142.5 686.5 137V13C686.5 7.5 691 3 696.5 3H702.5C708 3 712.4 7.4 712.5 12.9V27.4Z" fill="white"/><path d="M268.5 3C274 3 278.5 7.5 278.5 13V185C278.5 190.5 274 195 268.5 195H260.5C255 195 250.5 190.5 250.5 185V13C250.5 7.5 255 3 260.5 3H268.5Z" fill="white"/><path d="M264.5 75.1C265.5 31 290.5 1 323.5 3.2C359.1 3.2 384.5 35 382.5 75.1C382.5 114.8 360.1 146 323.5 147C286.9 148 268.6 122 264.5 75.1ZM318.3 27C295.5 27 285.5 46 283.5 75C282.7 104 295.5 123 318.3 123C339.5 123 354.5 104 353.3 75C352.2 48 341.5 27 318.3 27Z" fill="white"/><path d="M455.8 3.7C474.2 3.7 488.2 8.7 497.8 18.6C507.5 28.3 512.4 42.1 512.4 59.8V112.8C512.4 116 512.9 118.3 513.9 119.7C515.1 120.9 517 121.5 519.5 121.5H524.4V121.6C527.2 122.1 529.4 124.5 529.4 127.5V137C529.4 140 527.2 142.4 524.4 142.9V143C523.6 143.2 522.2 143.3 520.3 143.5C518.4 143.7 516.5 143.8 514.4 143.8C508.6 143.8 503.6 142.8 499.3 141C495.2 139.1 492.2 136 490.1 131.7C488.9 129 488 125.8 487.5 122C485.9 125.3 483.7 128.4 480.9 131.2C476.5 135.8 470.7 139.5 463.7 142.2C456.9 144.8 449.5 146.1 441.5 146.1C427.3 146.1 416 142.8 407.4 136.3C399.1 129.9 394.9 120.7 394.9 109C394.9 97.2 398.4 88 405.4 81.6C410.2 77.1 416.7 73.5 425 70.7L484.4 48.5C483.3 42.7 481.1 38.1 477.8 34.7C472.9 29.4 465.5 26.8 455.8 26.8C447.1 26.8 440.3 28.7 435.3 32.7C430.4 36.4 427 42 425.1 49.6C424.9 53 421.9 55.7 418.4 55.4L403.1 54.5C399.6 54.2 397 51.2 397.2 47.8C399.7 34.1 406.1 23.4 416.1 15.5C426.4 7.7 439.6 3.7 455.8 3.7ZM435.5 89L435.6 89.1C432.4 90.4 429.8 92 427.9 93.8C424.7 97.1 423 101.3 423 106.4C423 112.2 425 116.7 428.9 120C433 123 438.7 124.6 445.8 124.6C454 124.6 461 123 466.8 120C472.6 116.7 477.1 112.3 480.4 106.6C483.6 101 485.2 94.6 485.2 87.4V80.5L485.5 74L435.5 89Z" fill="white"/><path d="M560.5 3C566 3 570.5 7.5 570.5 13V183C570.5 188.5 566 193 560.5 193H552.5C547 193 542.5 188.5 542.5 183V13C542.5 7.5 547 3 552.5 3H560.5Z" fill="white"/><path d="M556.5 75.1C557.5 31 582.5 1 615.5 3.2C651.1 3.2 676.5 35 674.5 75.1C674.5 114.8 652.1 146 615.5 147C578.9 148 560.6 122 556.5 75.1ZM610.3 27C587.5 27 577.5 46 575.5 75C574.7 104 587.5 123 610.3 123C631.5 123 646.5 104 645.3 75C644.2 48 633.5 27 610.3 27Z" fill="white"/><path d="M82.5 162C20.1 251.1 52.2 89.6 109.7 104.6C198 127.6 220.2 34.8 170.5 15C101.9-12.1 120.4 104.5 82.5 162Z" stroke="url(#phero)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="phero" x1="68.3" y1="150.2" x2="149.8" y2="65.5" gradientUnits="userSpaceOnUse"><stop stop-color="#0161E0"/><stop offset="0.6" stop-color="#0CCDFF"/><stop offset="1" stop-color="#00FEFE"/></linearGradient></defs></svg></div><p class="ct">${esc(c.tagline)}</p><p class="co">${esc(c.overview)}</p>
<div class="cl">${c.website?`<a href="${esc(c.website)}" target="_blank" class="lp">Website</a>`:''}${c.linkedin?`<a href="${esc(c.linkedin)}" target="_blank" class="lp">LinkedIn</a>`:''}${c.substack?`<a href="${esc(c.substack)}" target="_blank" class="lp">Substack</a>`:''}</div></div>
${secH}
<div class="sec"><div class="sh"><small>Team</small></div><div class="tg">${tH}</div></div>
<div class="ft">Confidential \u00B7 Papr, Inc.</div>
</div>
<script>
document.addEventListener('click',function(e){
  var row=e.target.closest('.dr');if(!row)return;
  var name=row.querySelector('.di b');if(!name)return;
  var n=name.textContent;
  if(n==='Product Demo'&&window.DEMOS_DATA&&window.DEMOS_DATA.length){e.preventDefault();openDV(window.DEMOS_DATA);}
  if(n==='One-Pager'&&window.OP_DATA){e.preventDefault();openOP();}
});
var dIdx=0,dOvl=null;
function openDV(demos){dIdx=0;dOvl=document.createElement('div');dOvl.className='demo-overlay';document.body.appendChild(dOvl);rdC(demos);requestAnimationFrame(function(){dOvl.classList.add('open');});}
function rdC(demos){if(!dOvl)return;var d=demos[dIdx];var meta=d.benchmark_data?JSON.parse(d.benchmark_data):{};var ct='';
if(meta.benchmarks){var bl='<div class="bl"><span class="li"><span class="ld lb"></span>Baseline</span><span class="li"><span class="ld lgp"></span>Papr HNE</span></div>';var bars=meta.benchmarks.map(function(b){return '<div class="br"><div class="bh"><span class="bn">'+b.name+'</span><span class="bm">'+b.metric+'</span></div><div class="bbl">'+b.label+'</div><div class="bbs"><div class="bbw"><div class="bb lb" style="width:'+b.baseline+'%"></div><span class="bv">'+b.baseline+'%</span></div><div class="bbw"><div class="bb papr" style="width:'+b.papr+'%"></div><span class="bv pv">'+b.papr+'%</span></div></div></div>';}).join('');ct=bl+bars+(meta.key_insight?'<div class="bi">'+meta.key_insight+'</div>':'');}
else if(meta.features||meta.capabilities){var items=meta.features||meta.capabilities;ct='<div class="df">'+items.map(function(f){return '<div class="dfi"><span class="dfn">'+f.name+'</span><span class="dfd">'+f.desc+'</span></div>';}).join('')+'</div>';}
var dots=demos.map(function(_,i){return '<button class="dd'+(i===dIdx?' da':'')+'" data-i="'+i+'"></button>';}).join('');
var vid=d.video_url?vidEmbed(d.video_url):'';
dOvl.innerHTML='<div class="dob"></div><div class="dc"><button class="dx">CLOSE</button><div class="dds">'+dots+'</div><div class="dst">'+d.subtitle+'</div><h2 class="dtt">'+d.title+'</h2><p class="dde">'+d.description+'</p>'+ct+vid+'<div class="dsh">'+(dIdx>0?'<span class="dsa l">&#8249;</span>':'<span></span>')+'<span class="dsl">'+(dIdx+1)+'/'+demos.length+'</span>'+(dIdx<demos.length-1?'<span class="dsa r">&#8250;</span>':'<span></span>')+'</div></div>';
dOvl.querySelector('.dx').onclick=function(){dOvl.classList.remove('open');setTimeout(function(){dOvl.remove();dOvl=null;},350);};
dOvl.querySelector('.dob').onclick=dOvl.querySelector('.dx').onclick;
dOvl.querySelectorAll('.dd').forEach(function(b){b.onclick=function(){dIdx=parseInt(b.dataset.i);rdC(demos);};});
var la=dOvl.querySelector('.dsa.l'),ra=dOvl.querySelector('.dsa.r');
if(la)la.onclick=function(){dIdx--;rdC(demos);};if(ra)ra.onclick=function(){dIdx++;rdC(demos);};}
function openOP(){var o=document.createElement('div');o.className='demo-overlay';o.innerHTML='<div class="dob"></div><div class="dc" style="max-width:680px"><button class="dx">CLOSE</button><div class="opc">'+mdToH(window.OP_DATA)+'</div></div>';document.body.appendChild(o);requestAnimationFrame(function(){o.classList.add('open');});o.querySelector('.dx').onclick=function(){o.classList.remove('open');setTimeout(function(){o.remove();},350);};o.querySelector('.dob').onclick=o.querySelector('.dx').onclick;}
window.DEMOS_DATA=${JSON.stringify(DEMOS)};
window.OP_DATA=${JSON.stringify(ONE_PAGER)};
</script>
${FOLD_HTML}<script>
(function(){
  var demos = ${JSON.stringify(DEMOS)};
  if(!demos||!demos.length) return;
  var dIdx=0,ov=null;
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';}
  function openD(){
    dIdx=0;ov=document.createElement('div');ov.className='demo-overlay';
    document.body.appendChild(ov);renderD();setTimeout(function(){ov.classList.add('open');},10);
  }
  function closeD(){if(!ov)return;ov.classList.remove('open');setTimeout(function(){ov.remove();ov=null;},350);}
  function renderD(){
    if(!ov)return;var d=demos[dIdx],meta=d.benchmark_data?JSON.parse(d.benchmark_data):{};
    var content='';
    if(meta.benchmarks){
      content='<div class="bl"><span class="li"><span class="ld lb"></span>Baseline</span><span class="li"><span class="ld lgp"></span>Papr HNE</span></div>';
      meta.benchmarks.forEach(function(b){
        content+='<div class="br"><div class="bh"><b>'+esc(b.name)+'</b><small>'+esc(b.metric)+'</small></div><div class="bla">'+esc(b.label)+'</div><div class="bbs"><div class="bbw"><div class="bb bbl" style="width:'+b.baseline+'%"></div><span class="bv">'+b.baseline+'%</span></div><div class="bbw"><div class="bb bbp" style="width:'+b.papr+'%"></div><span class="bv bvp">'+b.papr+'%</span></div></div></div>';
      });
      if(meta.key_insight) content+='<div class="bi">'+esc(meta.key_insight)+'</div>';
    } else if(meta.features||meta.capabilities){
      var items=meta.features||meta.capabilities;
      content='<div class="df">';
      items.forEach(function(f){content+='<div class="dfi"><b>'+esc(f.name)+'</b><span>'+esc(f.desc)+'</span></div>';});
      content+='</div>';
    }
    var dots=demos.map(function(_,i){return '<button class="dd'+(i===dIdx?' da':'')+'" data-i="'+i+'"></button>';}).join('');
    ov.innerHTML='<div class="dob" onclick="this.parentElement.querySelector&&closeD()"></div><div class="dc"><button class="dx" onclick="closeD()">CLOSE</button><div class="dds">'+dots+'</div><div class="dst">'+esc(d.subtitle)+'</div><h2 class="dtt">'+esc(d.title)+'</h2><p class="dde">'+esc(d.description)+'</p>'+content+'<div class="dsh">'+(dIdx>0?'<span class="sa sl" onclick="dIdx--;renderD()">&lsaquo;</span>':'<span></span>')+'<span class="sla">'+(dIdx+1)+' / '+demos.length+'</span>'+(dIdx<demos.length-1?'<span class="sa sr" onclick="dIdx++;renderD()">&rsaquo;</span>':'<span></span>')+'</div></div>';
    ov.querySelectorAll('.dd').forEach(function(d){d.onclick=function(){dIdx=parseInt(d.dataset.i);renderD();};});
  }
  window.closeD=closeD;window.renderD=renderD;
  document.querySelectorAll('.dr').forEach(function(r){
    var b=r.querySelector('b');
    if(b&&b.textContent==='Product Demo'){r.style.cursor='pointer';r.onclick=openD;}
  });
})();
</script>
</body></html>`;
}

function renderConnector(room, connector) {
  const c = room.company, r = room.raise;
  const secs = room.sections;
  const pR = Math.min((r.raised_amount/r.target_amount)*100,100);
  const pC = Math.min(((r.raised_amount+r.committed_amount)/r.target_amount)*100,100);
  const cName = esc(connector.name);
  const firstName = cName.split(' ')[0];
  const cPhoto = connector.photo_url || '';
  const cInit = connector.name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  const cAv = cPhoto ? '<img src="'+esc(cPhoto)+'" class="pav" onerror="this.outerHTML=\'<div class=pav-init>'+cInit+'</div>\'">' : '<div class="pav-init">'+cInit+'</div>';
  const partnerHtml = '<div class="ppl">'+cAv+'<div class="ppd"><span class="ppn">'+cName+'</span>'+(connector.title?'<span class="ppt">'+esc(connector.title)+'</span>':'')+'</div></div>';
  const LOCKED_SEC = ['Legal','Cap Table'];
  const secH = secs.map(s => {
    const docs = room.documents.filter(d => d.section_id === s.id);
    const isLockedSec = LOCKED_SEC.some(k => s.label.indexOf(k)>-1);
    const dH = docs.map(d => {
      const locked = isLockedSec || LOCKED_SEC.some(k => d.name.indexOf(k)>-1);
      const ic = {pdf:'\u{1F4C4}',doc:'\u{1F4DD}',sheet:'\u{1F4CA}',video:'\u{1F3AC}',link:'\u{1F517}'}[d.file_type]||'\u{1F4C4}';
      if (locked) return '<div class="dr" style="opacity:.5">'+ic+'<div class="di"><b>'+esc(d.name)+'</b><span style="font-style:italic;color:rgba(255,255,255,.3)">Available after verbal commit</span></div></div>';
      return '<div class="dr">'+ic+'<div class="di"><b>'+esc(d.name)+'</b><span>'+esc(d.description)+'</span></div></div>';
    }).join('');
    return '<div class="sec"><div class="sh"><small>'+esc(s.label)+'</small><span>'+esc(s.description)+'</span></div>'+dH+'</div>';
  }).join('');
  const tH = room.team.map(m => {
    const ini = m.name.split(' ').map(n=>n[0]).join('');
    const ls = [m.linkedin?'<a href="'+esc(m.linkedin)+'" target="_blank">LinkedIn</a>':'',m.x_url?'<a href="'+esc(m.x_url)+'" target="_blank">\u{1D54F}</a>':''].filter(Boolean).join(' ');
    return '<div class="tc"><div class="av">'+ini+'</div><b>'+esc(m.name)+'</b><em>'+esc(m.role)+'</em><span>'+esc(m.bio)+'</span><div class="tl">'+ls+'</div></div>';
  }).join('');
  // Build intros
  var paths = (room.vc_intro_paths||[]).filter(p => p.connector_id == connector.id);
  var byVC = {};
  paths.forEach(p => {
    var k = p.investor_id;
    if(!byVC[k]) byVC[k] = {vc:p.investor_name, logo:p.vc_logo, fit:p.vc_fit, ppl:[]};
    byVC[k].ppl.push(p);
  });
  var vcKeys = Object.keys(byVC).sort((a,b) => (byVC[b].fit||0) - (byVC[a].fit||0));
  var introCards = vcKeys.map(k => {
    var g = byVC[k];
    var logoH = g.logo && g.logo.indexOf('data:') < 0 ? '<img src="'+esc(g.logo)+'" style="width:22px;height:22px;border-radius:4px" onerror="this.style.display=\'none\'">' : '';
    var pplH = g.ppl.map(p => {
      var ini = (p.via_person||'').split(' ').slice(0,2).map(w=>w[0]||'').join('');
      var liUrl = p.via_person_linkedin || '';
      var liH = liUrl ? '<a href="'+esc(liUrl)+'" target="_blank" style="font-size:11px;color:#0CF;margin-left:6px;text-decoration:none;font-weight:700;background:rgba(1,97,224,.08);padding:1px 5px;border-radius:4px">in</a>' : '';
      var subj = 'Intro Request: Papr \u2014 Context Intelligence Platform';
      var body = 'Hi '+(p.via_person||'').split(' ')[0]+',\n\nI wanted to connect you with {FOUNDER_NAME}, CEO of {COMPANY_NAME} \u2014 they build the circadian intelligence layer for AI agents.\n\nTheir Sleep AI reduces agent hallucinations by 40% through scheduled rest cycles \u2014 significantly outperforming existing retrieval approaches.\n\n{COMPANY_NAME} is backed by {INVESTORS}, with design partners including {CUSTOMERS}.\n\nWould you be open to a quick intro?\n\nBest,\n'+firstName;
      var mailto = 'mailto:?cc=shawkat%40papr.ai%2Camir%40papr.ai&subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.04)"><div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0"><div class="pav-init" style="width:34px;height:34px;font-size:12px;flex-shrink:0">'+ini+'</div><div style="display:flex;flex-direction:column;min-width:0"><span style="font-weight:500;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.via_person)+liH+'</span><span style="font-size:12px;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.via_person_title)+' at '+esc(p.investor_name)+'</span></div></div><a href="'+mailto+'" style="background:#0161E0;color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;text-decoration:none">Send Intro</a></div>';
    }).join('');
    return '<div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:10px 10px 0 0;border:1px solid rgba(255,255,255,.06);border-bottom:0">'+logoH+'<span style="font-weight:600;font-size:14px;flex:1">'+esc(g.vc)+'</span></div><div style="border:1px solid rgba(255,255,255,.06);border-radius:0 0 10px 10px;overflow:hidden">'+pplH+'</div></div>';
  }).join('');
  var totalPpl = paths.length, totalVCs = vcKeys.length;
  var introSection = totalPpl > 0 ? '<div id="intros-tab" style="display:none"><div style="text-align:center;margin-bottom:24px"><h2 style="font-size:24px;font-weight:700;margin-bottom:6px">Warm Intro Requests</h2><p style="color:rgba(255,255,255,.5);font-size:15px">Help Papr get warm intros to these VCs. Click &quot;Send Intro&quot; to draft an email.</p><div style="display:flex;gap:24px;justify-content:center;margin:16px 0"><div style="text-align:center"><b style="font-size:22px;display:block">'+totalPpl+'</b><span style="font-size:12px;color:rgba(255,255,255,.4)">Partners</span></div><div style="text-align:center"><b style="font-size:22px;display:block">'+totalVCs+'</b><span style="font-size:12px;color:rgba(255,255,255,.4)">VCs</span></div></div></div>'+introCards+'</div>' : '';
  var tabNav = totalPpl > 0 ? '<div style="display:flex;gap:8px;margin-bottom:20px"><button class="ctab active" onclick="switchCTab(this,\'room\')">Data Room</button><button class="ctab" onclick="switchCTab(this,\'intros\')">Intros ('+totalPpl+')</button></div>' : '';
  // Use the SAME CSS as render() but add tab styles
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(c.name)+' \u00B7 Data Room</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;background:#050a12;color:rgba(255,255,255,.92);line-height:1.5;min-height:100vh}a{color:#0CF}.mx{max-width:860px;margin:0 auto;padding:24px 24px 80px}.hd{text-align:center;padding:20px 0 8px;font-size:15px;color:rgba(255,255,255,.55);font-weight:500;letter-spacing:.5px}.pf{display:flex;align-items:center;gap:12px;padding:14px 0;margin-bottom:20px;flex-wrap:wrap}.flogo{width:40px;height:40px;border-radius:10px;object-fit:contain}.pfn{font-size:14px;color:rgba(255,255,255,.55);font-weight:500}.ppl{display:flex;align-items:center;gap:10px;margin-right:8px;padding-right:16px;border-right:1px solid rgba(255,255,255,.1)}.pav{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.15)}.pav-init{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0161E0,#0CF);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;letter-spacing:.5px}.ppd{display:flex;flex-direction:column;gap:1px}.ppn{font-size:14px;font-weight:600;color:rgba(255,255,255,.85)}.ppt{font-size:12px;color:rgba(255,255,255,.45)}.rb{padding:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:24px}.rbh{display:flex;justify-content:space-between;margin-bottom:12px}.rbl{font-size:14px;font-weight:600}.rbt{font-size:13px;color:rgba(255,255,255,.55)}.rt{height:8px;background:rgba(255,255,255,.08);border-radius:4px;position:relative;overflow:hidden}.rf{position:absolute;top:0;left:0;height:100%;border-radius:4px}.rfr{background:linear-gradient(90deg,#0161E0,#0CF);z-index:2}.rfc{background:rgba(1,97,224,.35);z-index:1}.rm{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}.rc{font-size:12px;padding:3px 10px;border-radius:6px;font-weight:500}.rcr{background:rgba(1,97,224,.18);color:#0CF}.rcc{background:rgba(1,97,224,.1);color:rgba(255,255,255,.55)}.ch{padding:28px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:32px}.cn{font-size:36px;font-weight:700;letter-spacing:-.5px;margin-bottom:6px}.ct{font-size:16px;color:#0CF;font-weight:500;margin-bottom:12px}.co{font-size:15px;color:rgba(255,255,255,.55);line-height:1.65;margin-bottom:20px}.cl{display:flex;gap:12px;flex-wrap:wrap}.lp{display:inline-flex;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:500;color:#0CF;background:rgba(1,97,224,.12);border:1px solid rgba(1,97,224,.2);text-decoration:none}.sec{margin-bottom:32px}.sh{margin-bottom:12px}.sh small{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.32);display:block;margin-bottom:4px}.sh span{font-size:13px;color:rgba(255,255,255,.55)}.dr{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:2px}.di{flex:1}.di b{font-size:14px;font-weight:500;display:block}.di span{font-size:12px;color:rgba(255,255,255,.55);display:block}.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.tc{padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px}.av{width:66px;height:66px;border-radius:50%;background:linear-gradient(135deg,#0161E0,#0CF);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;margin-bottom:4px}.tc b{font-size:14px}.tc em{font-size:12px;color:#0CF;font-weight:500;font-style:normal}.tc span{font-size:12px;color:rgba(255,255,255,.55);line-height:1.5}.tl{display:flex;gap:8px;margin-top:4px}.tl a{font-size:12px;opacity:.7}.ft{text-align:center;padding:32px 0;border-top:1px solid rgba(255,255,255,.1);margin-top:40px;font-size:12px;color:rgba(255,255,255,.32)}.ctab{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);padding:8px 20px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}.ctab.active{background:rgba(1,97,224,.15);border-color:rgba(1,97,224,.3);color:#0CF}@media(max-width:640px){.tg{grid-template-columns:1fr}}</style></head><body><div class="mx"><div class="hd">'+esc(c.name)+' \u00B7 Data Room</div><div class="pf">'+partnerHtml+'<span class="pfn">Prepared for '+cName+'</span></div>'+tabNav+'<div id="room-tab"><div class="rb"><div class="rbh"><span class="rbl">'+esc(r.stage)+' Round</span><span class="rbt">Target: '+fmt(r.target_amount)+'</span></div><div class="rt"><div class="rf rfr" style="width:'+pR+'%"></div><div class="rf rfc" style="width:'+pC+'%"></div></div><div class="rm"><span class="rc rcr">Raised '+fmt(r.raised_amount)+'</span><span class="rc rcc">Committed '+fmt(r.committed_amount)+'</span></div></div><div class="ch"><div class="cnl"><svg width="180" height="42" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M712.5 27.4C722.2 9.1 738.6 1.1 756.5 3V3C759.8 3 762.5 5.7 762.5 9V18.9C762.5 22.2 759.8 24.9 756.5 25C735.5 25 715.5 40 714.5 81V91H714.5V134C714.5 134 714.5 134.1 714.5 134.1V137C714.5 142.5 710 147 704.5 147H702.5C702.6 147 702.5 147 702.5 147H696.5C691 147 686.5 142.5 686.5 137V13C686.5 7.5 691 3 696.5 3H702.5C708 3 712.4 7.4 712.5 12.9V27.4Z" fill="white"/><path d="M268.5 3C274 3 278.5 7.5 278.5 13V185C278.5 190.5 274 195 268.5 195H260.5C255 195 250.5 190.5 250.5 185V13C250.5 7.5 255 3 260.5 3H268.5Z" fill="white"/><path d="M264.5 75.1C265.5 31 290.5 1 323.5 3.2C359.1 3.2 384.5 35 382.5 75.1C382.5 114.8 360.1 146 323.5 147C286.9 148 268.6 122 264.5 75.1ZM318.3 27C295.5 27 285.5 46 283.5 75C282.7 104 295.5 123 318.3 123C339.5 123 354.5 104 353.3 75C352.2 48 341.5 27 318.3 27Z" fill="white"/><path d="M455.8 3.7C474.2 3.7 488.2 8.7 497.8 18.6C507.5 28.3 512.4 42.1 512.4 59.8V112.8C512.4 116 512.9 118.3 513.9 119.7C515.1 120.9 517 121.5 519.5 121.5H524.4V121.6C527.2 122.1 529.4 124.5 529.4 127.5V137C529.4 140 527.2 142.4 524.4 142.9V143C523.6 143.2 522.2 143.3 520.3 143.5C518.4 143.7 516.5 143.8 514.4 143.8C508.6 143.8 503.6 142.8 499.3 141C495.2 139.1 492.2 136 490.1 131.7C488.9 129 488 125.8 487.5 122C485.9 125.3 483.7 128.4 480.9 131.2C476.5 135.8 470.7 139.5 463.7 142.2C456.9 144.8 449.5 146.1 441.5 146.1C427.3 146.1 416 142.8 407.4 136.3C399.1 129.9 394.9 120.7 394.9 109C394.9 97.2 398.4 88 405.4 81.6C410.2 77.1 416.7 73.5 425 70.7L484.4 48.5C483.3 42.7 481.1 38.1 477.8 34.7C472.9 29.4 465.5 26.8 455.8 26.8C447.1 26.8 440.3 28.7 435.3 32.7C430.4 36.4 427 42 425.1 49.6C424.9 53 421.9 55.7 418.4 55.4L403.1 54.5C399.6 54.2 397 51.2 397.2 47.8C399.7 34.1 406.1 23.4 416.1 15.5C426.4 7.7 439.6 3.7 455.8 3.7ZM435.5 89L435.6 89.1C432.4 90.4 429.8 92 427.9 93.8C424.7 97.1 423 101.3 423 106.4C423 112.2 425 116.7 428.9 120C433 123 438.7 124.6 445.8 124.6C454 124.6 461 123 466.8 120C472.6 116.7 477.1 112.3 480.4 106.6C483.6 101 485.2 94.6 485.2 87.4V80.5L485.5 74L435.5 89Z" fill="white"/><path d="M560.5 3C566 3 570.5 7.5 570.5 13V183C570.5 188.5 566 193 560.5 193H552.5C547 193 542.5 188.5 542.5 183V13C542.5 7.5 547 3 552.5 3H560.5Z" fill="white"/><path d="M556.5 75.1C557.5 31 582.5 1 615.5 3.2C651.1 3.2 676.5 35 674.5 75.1C674.5 114.8 652.1 146 615.5 147C578.9 148 560.6 122 556.5 75.1ZM610.3 27C587.5 27 577.5 46 575.5 75C574.7 104 587.5 123 610.3 123C631.5 123 646.5 104 645.3 75C644.2 48 633.5 27 610.3 27Z" fill="white"/><path d="M82.5 162C20.1 251.1 52.2 89.6 109.7 104.6C198 127.6 220.2 34.8 170.5 15C101.9-12.1 120.4 104.5 82.5 162Z" stroke="url(#phero)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="phero" x1="68.3" y1="150.2" x2="149.8" y2="65.5" gradientUnits="userSpaceOnUse"><stop stop-color="#0161E0"/><stop offset="0.6" stop-color="#0CCDFF"/><stop offset="1" stop-color="#00FEFE"/></linearGradient></defs></svg></div><p class="ct">'+esc(c.tagline)+'</p><p class="co">'+esc(c.overview)+'</p><div class="cl">'+(c.website?'<a href="'+esc(c.website)+'" target="_blank" class="lp">Website</a>':'')+(c.linkedin?'<a href="'+esc(c.linkedin)+'" target="_blank" class="lp">LinkedIn</a>':'')+(c.substack?'<a href="'+esc(c.substack)+'" target="_blank" class="lp">Substack</a>':'')+'</div></div>'+secH+'<div class="sec"><div class="sh"><small>Team</small></div><div class="tg">'+tH+'</div></div></div>'+introSection+'<div class="ft">Confidential \u00B7 Papr, Inc.</div></div><script>function switchCTab(btn,id){document.querySelectorAll(".ctab").forEach(t=>t.classList.remove("active"));btn.classList.add("active");document.getElementById("room-tab").style.display=id==="room"?"block":"none";var it=document.getElementById("intros-tab");if(it)it.style.display=id==="intros"?"block":"none";}</script></body></html>';
}

function landing() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Papr Data Room</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;background:#050a12;color:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body><div style="text-align:center"><h1 style="font-size:28px;margin-bottom:8px">Papr \u00B7 Data Room</h1><p style="color:rgba(255,255,255,.55)">Access requires a valid investor link.</p></div><script>
(function(){
  var demos = ${JSON.stringify(DEMOS)};
  if(!demos||!demos.length) return;
  var dIdx=0,ov=null;
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';}
  function openD(){
    dIdx=0;ov=document.createElement('div');ov.className='demo-overlay';
    document.body.appendChild(ov);renderD();setTimeout(function(){ov.classList.add('open');},10);
  }
  function closeD(){if(!ov)return;ov.classList.remove('open');setTimeout(function(){ov.remove();ov=null;},350);}
  function renderD(){
    if(!ov)return;var d=demos[dIdx],meta=d.benchmark_data?JSON.parse(d.benchmark_data):{};
    var content='';
    if(meta.benchmarks){
      content='<div class="bl"><span class="li"><span class="ld lb"></span>Baseline</span><span class="li"><span class="ld lgp"></span>Papr HNE</span></div>';
      meta.benchmarks.forEach(function(b){
        content+='<div class="br"><div class="bh"><b>'+esc(b.name)+'</b><small>'+esc(b.metric)+'</small></div><div class="bla">'+esc(b.label)+'</div><div class="bbs"><div class="bbw"><div class="bb bbl" style="width:'+b.baseline+'%"></div><span class="bv">'+b.baseline+'%</span></div><div class="bbw"><div class="bb bbp" style="width:'+b.papr+'%"></div><span class="bv bvp">'+b.papr+'%</span></div></div></div>';
      });
      if(meta.key_insight) content+='<div class="bi">'+esc(meta.key_insight)+'</div>';
    } else if(meta.features||meta.capabilities){
      var items=meta.features||meta.capabilities;
      content='<div class="df">';
      items.forEach(function(f){content+='<div class="dfi"><b>'+esc(f.name)+'</b><span>'+esc(f.desc)+'</span></div>';});
      content+='</div>';
    }
    var dots=demos.map(function(_,i){return '<button class="dd'+(i===dIdx?' da':'')+'" data-i="'+i+'"></button>';}).join('');
    ov.innerHTML='<div class="dob" onclick="this.parentElement.querySelector&&closeD()"></div><div class="dc"><button class="dx" onclick="closeD()">CLOSE</button><div class="dds">'+dots+'</div><div class="dst">'+esc(d.subtitle)+'</div><h2 class="dtt">'+esc(d.title)+'</h2><p class="dde">'+esc(d.description)+'</p>'+content+'<div class="dsh">'+(dIdx>0?'<span class="sa sl" onclick="dIdx--;renderD()">&lsaquo;</span>':'<span></span>')+'<span class="sla">'+(dIdx+1)+' / '+demos.length+'</span>'+(dIdx<demos.length-1?'<span class="sa sr" onclick="dIdx++;renderD()">&rsaquo;</span>':'<span></span>')+'</div></div>';
    ov.querySelectorAll('.dd').forEach(function(d){d.onclick=function(){dIdx=parseInt(d.dataset.i);renderD();};});
  }
  window.closeD=closeD;window.renderD=renderD;
  document.querySelectorAll('.dr').forEach(function(r){
    var b=r.querySelector('b');
    if(b&&b.textContent==='Product Demo'){r.style.cursor='pointer';r.onclick=openD;}
  });
})();
</script>
</body></html>`;
}

function err(t, m) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;background:#050a12;color:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body><div style="text-align:center;padding:24px"><h2 style="font-size:24px;margin-bottom:8px">${t}</h2><p style="color:rgba(255,255,255,.55)">${m}</p></div><script>
(function(){
  var demos = ${JSON.stringify(DEMOS)};
  if(!demos||!demos.length) return;
  var dIdx=0,ov=null;
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';}
  function openD(){
    dIdx=0;ov=document.createElement('div');ov.className='demo-overlay';
    document.body.appendChild(ov);renderD();setTimeout(function(){ov.classList.add('open');},10);
  }
  function closeD(){if(!ov)return;ov.classList.remove('open');setTimeout(function(){ov.remove();ov=null;},350);}
  function renderD(){
    if(!ov)return;var d=demos[dIdx],meta=d.benchmark_data?JSON.parse(d.benchmark_data):{};
    var content='';
    if(meta.benchmarks){
      content='<div class="bl"><span class="li"><span class="ld lb"></span>Baseline</span><span class="li"><span class="ld lgp"></span>Papr HNE</span></div>';
      meta.benchmarks.forEach(function(b){
        content+='<div class="br"><div class="bh"><b>'+esc(b.name)+'</b><small>'+esc(b.metric)+'</small></div><div class="bla">'+esc(b.label)+'</div><div class="bbs"><div class="bbw"><div class="bb bbl" style="width:'+b.baseline+'%"></div><span class="bv">'+b.baseline+'%</span></div><div class="bbw"><div class="bb bbp" style="width:'+b.papr+'%"></div><span class="bv bvp">'+b.papr+'%</span></div></div></div>';
      });
      if(meta.key_insight) content+='<div class="bi">'+esc(meta.key_insight)+'</div>';
    } else if(meta.features||meta.capabilities){
      var items=meta.features||meta.capabilities;
      content='<div class="df">';
      items.forEach(function(f){content+='<div class="dfi"><b>'+esc(f.name)+'</b><span>'+esc(f.desc)+'</span></div>';});
      content+='</div>';
    }
    var dots=demos.map(function(_,i){return '<button class="dd'+(i===dIdx?' da':'')+'" data-i="'+i+'"></button>';}).join('');
    ov.innerHTML='<div class="dob" onclick="this.parentElement.querySelector&&closeD()"></div><div class="dc"><button class="dx" onclick="closeD()">CLOSE</button><div class="dds">'+dots+'</div><div class="dst">'+esc(d.subtitle)+'</div><h2 class="dtt">'+esc(d.title)+'</h2><p class="dde">'+esc(d.description)+'</p>'+content+'<div class="dsh">'+(dIdx>0?'<span class="sa sl" onclick="dIdx--;renderD()">&lsaquo;</span>':'<span></span>')+'<span class="sla">'+(dIdx+1)+' / '+demos.length+'</span>'+(dIdx<demos.length-1?'<span class="sa sr" onclick="dIdx++;renderD()">&rsaquo;</span>':'<span></span>')+'</div></div>';
    ov.querySelectorAll('.dd').forEach(function(d){d.onclick=function(){dIdx=parseInt(d.dataset.i);renderD();};});
  }
  window.closeD=closeD;window.renderD=renderD;
  document.querySelectorAll('.dr').forEach(function(r){
    var b=r.querySelector('b');
    if(b&&b.textContent==='Product Demo'){r.style.cursor='pointer';r.onclick=openD;}
  });
})();
</script>
</body></html>`;
}
