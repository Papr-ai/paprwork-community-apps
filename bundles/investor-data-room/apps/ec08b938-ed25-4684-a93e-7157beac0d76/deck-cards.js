// deck-cards.js — platform-specific cards and edit modal
var DK_FIGMA='<svg width="28" height="42" viewBox="0 0 38 57" fill="none"><path d="M19 57a9.5 9.5 0 0 0 9.5-9.5V38H19a9.5 9.5 0 0 0 0 19z" fill="#0ACF83"/><path d="M9.5 28.5a9.5 9.5 0 0 1 9.5-9.5h0v19H19a9.5 9.5 0 0 1-9.5-9.5z" fill="#A259FF"/><path d="M9.5 9.5A9.5 9.5 0 0 1 19 0h0v19H19A9.5 9.5 0 0 1 9.5 9.5z" fill="#F24E1E"/><path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19V0z" fill="#FF7262"/><path d="M38 28.5a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0z" fill="#1ABCFE"/></svg>';
var DK_GSLIDES='<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="8" fill="#FBBC04"/><rect x="10" y="14" width="28" height="20" rx="2" fill="white"/><rect x="14" y="18" width="20" height="2" rx="1" fill="#FBBC04"/><rect x="14" y="23" width="16" height="2" rx="1" fill="#FBBC04"/><rect x="14" y="28" width="12" height="2" rx="1" fill="#FBBC04"/></svg>';

function makeFigmaCard(deck){
  return '<div class="dk-platform-wrap"><div class="dk-platform-card glass">'+
    '<div class="dk-plt-icon">'+DK_FIGMA+'</div><div class="dk-plt-label">Figma</div>'+
    '<h2 class="dk-plt-title">'+esc(deck.title||'Pitch Deck')+'</h2>'+
    '<p class="dk-plt-desc">'+esc(deck.description||'')+'</p>'+
    '<button class="dk-plt-primary" id="dk-fo">Open in Figma</button>'+
    '<button class="dk-plt-sec" id="dk-fc">Copy link</button>'+
    '<p class="dk-plt-note">Figma requires its own window for the full experience</p>'+
  '</div></div>';
}

var DK_KEYNOTE='<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#007AFF"/><path d="M32 14l16 9v18L32 50 16 41V23L32 14z" fill="white" fill-opacity="0.9"/><path d="M32 14v36M16 23l32 18M48 23L16 41" stroke="#007AFF" stroke-width="1.2" stroke-opacity="0.3"/></svg>';

function makeKeynoteCard(deck){
  return '<div class="dk-keynote-viewer">'+
    '<div class="dk-kn-stage">'+
      '<div class="dk-kn-icon">'+DK_KEYNOTE+'</div>'+
      '<h2 class="dk-kn-title">'+esc(deck.title||'Pitch Deck')+'</h2>'+
      (deck.description?'<p class="dk-kn-desc">'+esc(deck.description)+'</p>':'')+
      '<button class="dk-kn-present" id="dk-fo">'+
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l12 6-12 6V4z"/></svg>'+
        'Open Presentation'+
      '</button>'+
      '<button class="dk-kn-copy" id="dk-fc">Copy link</button>'+
      '<p class="dk-kn-note">Opens in iCloud Keynote — Apple doesn\'t allow inline embedding</p>'+
    '</div>'+
  '</div>';
}

function makeGSlidesSetupCard(deck){
  return '<div class="dk-platform-wrap"><div class="dk-platform-card glass">'+
    '<div class="dk-plt-icon">'+DK_GSLIDES+'</div><div class="dk-plt-label">Google Slides</div>'+
    '<h2 class="dk-plt-title">One quick step</h2>'+
    '<p class="dk-plt-desc">Google Slides needs "Publish to the web" to embed — different from "anyone with link".</p>'+
    '<div class="dk-gs-steps">'+
      '<div class="dk-gs-step"><span class="dk-gs-num">1</span><span>In Google Slides: <strong>File → Share → Publish to the web</strong></span></div>'+
      '<div class="dk-gs-step"><span class="dk-gs-num">2</span><span>Click <strong>Publish</strong> → copy the link</span></div>'+
      '<div class="dk-gs-step"><span class="dk-gs-num">3</span><span>Come back, click Edit and paste the link</span></div>'+
    '</div>'+
    '<button class="dk-plt-primary" id="dk-fo">Open Google Slides</button>'+
    '<button class="dk-plt-sec" id="dk-paste-pub">Paste published link</button>'+
  '</div></div>';
}

function showDeckEditModal(deck,showHint){
  var hint=showHint||isGSlidesShareUrl(deck.url||'');
  var m=document.createElement('div');m.className='dk-modal-bg';
  m.innerHTML='<div class="dk-modal glass">'+
    '<p class="dk-lbl">Deck URL</p>'+
    '<input id="dk-url" class="dk-input" placeholder="Figma, Google Slides (published), Pitch, Canva…" value="'+esc(deck.url||'')+'">'+
    (hint?'<div class="dk-gs-hint"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>For Google Slides: use <em>File → Share → Publish to the web</em> — not the share link</div>':'')+
    '<p class="dk-lbl" style="margin-top:12px">Title</p>'+
    '<input id="dk-ttl" class="dk-input" placeholder="Pitch Deck" value="'+esc(deck.title||'')+'">'+
    '<div class="dk-modal-btns"><button id="dk-mc">Cancel</button><button id="dk-ms" class="dk-btn-save">Save</button></div></div>';
  document.body.appendChild(m);
  m.querySelector('#dk-url').addEventListener('input',function(){
    var v=this.value.trim(),h=m.querySelector('.dk-gs-hint');
    if(isGSlidesShareUrl(v)&&!h){var d=document.createElement('div');d.className='dk-gs-hint';d.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>For Google Slides: use <em>File → Share → Publish to the web</em>';m.querySelector('#dk-url').after(d);}
    else if(!isGSlidesShareUrl(v)&&h)h.remove();
  });
  m.querySelector('#dk-mc').onclick=function(){m.remove();};
  m.querySelector('#dk-ms').onclick=function(){
    var url=m.querySelector('#dk-url').value.trim(),ttl=m.querySelector('#dk-ttl').value.trim()||'Pitch Deck';
    if(!url)return;
    saveDeckUrl(url,ttl,deck.description||'');
    m.remove();openDeckViewer({url:url,title:ttl,description:deck.description||''},true);
  };
}
