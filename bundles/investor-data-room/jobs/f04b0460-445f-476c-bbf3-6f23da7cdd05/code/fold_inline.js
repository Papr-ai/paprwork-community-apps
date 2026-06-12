// Complete fold experience for investor view — all 9 sections
function getFoldHTML() {
  return `
<style>
.fold-corner{position:fixed;top:0;right:0;z-index:50;cursor:pointer}
.fold-triangle{width:52px;height:52px;position:relative;overflow:hidden;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.fold-triangle:hover{transform:scale(1.12)}
.fold-triangle::before{content:'';position:absolute;top:0;right:0;border-style:solid;border-width:0 52px 52px 0;border-color:transparent #0161E0 transparent transparent;filter:drop-shadow(-2px 2px 6px rgba(1,97,224,.25))}
.fold-triangle:hover::before{filter:drop-shadow(-3px 3px 14px rgba(1,97,224,.5))}
.fold-dot{position:absolute;top:13px;right:13px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.85);animation:fp 2.5s ease-in-out infinite}
@keyframes fp{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.fold-panel{position:fixed;inset:0;z-index:90;opacity:0;pointer-events:none;transition:opacity .6s cubic-bezier(.16,1,.3,1);background:#050a14;overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth}
.fold-panel.open{opacity:1;pointer-events:auto}
.fold-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.fold-orb{position:absolute;border-radius:50%;filter:blur(140px);opacity:.18;animation:od 25s ease-in-out infinite alternate}
.fo1{width:500px;height:500px;background:#0161E0;top:-10%;left:-10%}
.fo2{width:400px;height:400px;background:#06b6d4;bottom:-5%;right:-10%;animation-delay:-8s}
@keyframes od{0%{transform:translate(0,0) scale(1)}100%{transform:translate(20px,-15px) scale(1.05)}}
.fold-nodes{position:fixed;inset:0;z-index:0;pointer-events:none}
.fold-node{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(1,97,224,.5);animation:nf 4s ease-in-out infinite}
@keyframes nf{0%,100%{opacity:0;transform:scale(0)}40%,60%{opacity:.6;transform:scale(1)}}
.fold-close{position:fixed;top:20px;right:24px;z-index:95;background:none;border:none;color:rgba(255,255,255,.35);font-size:13px;font-weight:500;cursor:pointer;letter-spacing:1.5px;font-family:-apple-system,sans-serif}
.fold-close:hover{color:rgba(255,255,255,.7)}
.fold-dots{position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:95;display:flex;flex-direction:column;gap:14px}
.fold-dots .dt{width:8px;height:8px;border-radius:50%;border:none;padding:0;background:rgba(255,255,255,.2);cursor:pointer;transition:all .4s}
.fold-dots .dt.active{background:#0161E0;transform:scale(1.35);box-shadow:0 0 12px rgba(1,97,224,.5)}
.fold-dots .dt:hover:not(.active){background:rgba(255,255,255,.45)}
.fs{position:relative;z-index:2;height:100vh;display:flex;align-items:center;justify-content:center;padding:60px 48px;scroll-snap-align:start}
.fsi{max-width:700px;width:100%;text-align:center;opacity:0;transform:translateY(40px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.fsi.visible{opacity:1;transform:translateY(0)}
.fq{font-size:clamp(2rem,5vw,3.4rem);font-weight:800;color:rgba(255,255,255,.95);line-height:1.12;letter-spacing:-.03em;margin-bottom:24px}
.fsb{font-size:clamp(1.05rem,2.2vw,1.35rem);color:rgba(255,255,255,.65);line-height:1.65;font-weight:300;max-width:520px;margin:0 auto}
.fg{background:linear-gradient(135deg,#4d9fff,#0CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.fml{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:28px}
.fmt{font-size:clamp(1.4rem,3vw,2.1rem);font-weight:600;color:rgba(255,255,255,.92);line-height:1.45;max-width:600px;margin:0 auto 32px}
.fln{width:40px;height:1.5px;background:rgba(255,255,255,.2);margin:0 auto;border-radius:1px}
.fbn{font-size:clamp(2.8rem,8vw,5.5rem);font-weight:900;line-height:1;letter-spacing:-.04em;background:linear-gradient(135deg,#0161E0,#0CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.fbu{font-size:clamp(1rem,2.5vw,1.5rem);font-weight:600;color:rgba(255,255,255,.6);margin:12px 0 28px}
.fbt{font-size:clamp(.95rem,1.8vw,1.15rem);color:rgba(255,255,255,.6);line-height:1.6;max-width:460px;margin:0 auto}
.fsh{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;color:rgba(255,255,255,.25);font-size:11px;letter-spacing:1.5px}
.fsa{width:1px;height:20px;background:rgba(255,255,255,.15);animation:sp 2s ease-in-out infinite;position:relative}
.fsa::after{content:'';position:absolute;bottom:0;left:-3px;width:7px;height:7px;border-right:1px solid rgba(255,255,255,.25);border-bottom:1px solid rgba(255,255,255,.25);transform:rotate(45deg)}
@keyframes sp{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:.6;transform:translateY(4px)}}
.fpg{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px;text-align:left}
.fpc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;transition:transform .3s,border-color .3s}
.fpc:hover{transform:translateY(-3px);border-color:rgba(1,97,224,.3)}
.fpct{font-size:15px;font-weight:700;color:rgba(255,255,255,.9);margin-bottom:8px}
.fpcd{font-size:13px;color:rgba(255,255,255,.5);line-height:1.55;margin:0}
.ftp{display:flex;flex-direction:column;gap:20px;margin-top:32px;text-align:left}
.ftc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px 24px;border-left:3px solid #0161E0}
.ftn{font-size:16px;font-weight:700;color:rgba(255,255,255,.92);display:block;margin-bottom:4px}
.fte{font-size:12px;font-weight:600;color:#4d9fff;display:block;margin-bottom:8px;letter-spacing:.3px}
.ftl{font-size:13px;color:rgba(255,255,255,.45);display:block;line-height:1.5}
.ffp{max-width:560px;margin:0 auto 24px;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.ffi{width:100%;height:auto;display:block}
.ffc{font-size:16px;font-weight:500;color:rgba(255,255,255,.7);letter-spacing:.5px}
</style>
<div class="fold-corner" onclick="document.getElementById('fp').classList.add('open');document.getElementById('fp').scrollTop=0;setTimeout(initFO,150)">
<div class="fold-triangle"><div class="fold-dot"></div></div></div>
<div class="fold-panel" id="fp">
<div class="fold-orbs"><div class="fold-orb fo1"></div><div class="fold-orb fo2"></div></div>
<div class="fold-nodes" id="fn"></div>
<button class="fold-close" onclick="document.getElementById('fp').classList.remove('open')">CLOSE</button>
<div class="fold-dots" id="fd"></div>
<div class="fs"><div class="fsi" data-f="0"><p class="fq">What if AI could <span class="fg">remember</span>?</p><p class="fsb">Not just retrieve. Not just search. Actually remember.</p><div class="fsh">SCROLL<div class="fsa"></div></div></div></div>
<div class="fs"><div class="fsi" data-f="1"><p class="fq">Every conversation.<br>Every decision.<br>Every <span class="fg">context</span>.</p><p class="fsb">Today, AI starts from zero every single time. No history. No patterns. No growth.</p></div></div>
<div class="fs"><div class="fsi" data-f="2"><p class="fq">What if it could <span class="fg">learn</span>?</p><p class="fsb">Build on what came before. Connect insights across time. Get better with every interaction.</p></div></div>
<div class="fs"><div class="fsi" data-f="3"><p class="fq">Not just faster.<br><span class="fg">Wiser.</span></p><p class="fsb">Memory that improves with scale. 92% retrieval accuracy. Under 150ms.</p></div></div>
<div class="fs"><div class="fsi" data-f="4"><div class="fml">OUR MISSION</div><p class="fmt">Transform memories into wisdom &mdash; building the memory layer that makes every AI agent and robot truly intelligent.</p><div class="fln"></div></div></div>
<div class="fs"><div class="fsi" data-f="5"><div class="fml">BHAG</div><div class="fbn" id="bc">0</div><div class="fbu">AI agents and robots</div><p class="fbt">Powered with memory that works like the human brain. By 2035.</p></div></div>
<div class="fs"><div class="fsi" data-f="6"><div class="fml">WHAT BECOMES POSSIBLE</div><p class="fq">When AI has <span class="fg">memory that works</span></p><div class="fpg"><div class="fpc"><div class="fpct">Knowledge Never Dies</div><p class="fpcd">Every insight, decision, and lesson preserved and connected across agents, teams, and time.</p></div><div class="fpc"><div class="fpct">Wisdom Compounds</div><p class="fpcd">Like compound interest for intelligence. Each interaction makes the entire system smarter.</p></div><div class="fpc"><div class="fpct">Agent Fleets That Learn</div><p class="fpcd">Multi-agent systems with shared memory. Continuity, auditability, real collaboration.</p></div><div class="fpc"><div class="fpct">20 Watts of Wisdom</div><p class="fpcd">Memory that gets faster, more accurate, and more efficient at scale. Like the human brain.</p></div></div></div></div>
<div class="fs"><div class="fsi" data-f="7"><div class="fml">WHY US</div><p class="fq">Learning velocity is our <span class="fg">deepest edge</span></p><p class="fsb">A three-person team that out-ships teams 10x our size. Built and scaled platforms at Apple, Shopify, GM, Meta, AWS, and Intel.</p><div class="ftp"><div class="ftc"><span class="ftn">Founder 1</span><span class="fte">Your key achievement</span><span class="ftl">Career highlights</span></div><div class="ftc"><span class="ftn">Founder 2</span><span class="fte">Your key achievement</span><span class="ftl">Career highlights</span></div></div></div></div></div>
<div class="fs"><div class="fsi" data-f="8"><div class="ffp"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666' font-size='14'%3EFounder Photo%3C/text%3E%3C/svg%3E" alt="Founder and Co-Founder " class="ffi" /></div><p class="ffc">Founder & Co-Founder  <span class="fg">Co-Founders</span></p></div></div>
</div>
<script>
(function(){var n='';for(var i=0;i<10;i++){var t=Math.random()*90+5,l=Math.random()*90+5,d=(Math.random()*3+2).toFixed(1),dl=(Math.random()*4).toFixed(1);n+='<div class="fold-node" style="top:'+t+'%;left:'+l+'%;animation-delay:'+dl+'s;animation-duration:'+d+'s"></div>';}document.getElementById('fn').innerHTML=n;var ds='';for(var j=0;j<9;j++)ds+='<button class="dt'+(j===0?' active':'')+'" data-i="'+j+'"></button>';document.getElementById('fd').innerHTML=ds;document.querySelectorAll('.fold-dots .dt').forEach(function(d,i){d.addEventListener('click',function(){document.querySelectorAll('.fs')[i].scrollIntoView({behavior:'smooth'});});});})();
function initFO(){var p=document.getElementById('fp');if(!p)return;var s=p.querySelectorAll('.fsi'),d=p.querySelectorAll('.dt'),c=false;var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');var idx=parseInt(e.target.dataset.f);d.forEach(function(b,i){b.classList.toggle('active',i===idx)});if(idx===5&&!c){c=true;var el=document.getElementById('bc');if(el){var tg=100000000,du=2500,st=performance.now();(function tk(now){var pr=Math.min((now-st)/du,1);el.textContent=Math.floor((1-Math.pow(1-pr,3))*tg).toLocaleString();if(pr<1)requestAnimationFrame(tk)})(st)}}}})},{root:p,threshold:0.4});s.forEach(function(x){o.observe(x)})}
</script>
`;
}
module.exports = { getFoldHTML };
