// deck-ui.js — viewer overlay (cards + modal live in deck-cards.js)
var DK_EDIT='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
var DK_COPY='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.5"/></svg>';
var DK_EXT='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5v5M14 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
var DK_DL='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var DK_X='<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function closeDeckViewer(){
  if(!deckOverlay)return;
  deckOverlay.classList.remove('open');
  var el=deckOverlay;deckOverlay=null;
  setTimeout(function(){el.remove();},300);
}

function makeDeckHeader(deck,isFounder){
  var isDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;
  var sunIcon='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  var moonIcon='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 9.5A5 5 0 017.5 3a5 5 0 105.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  return '<div class="dk-header">'+
    '<span class="dk-title">'+esc(deck.title||'Pitch Deck')+'</span>'+
    '<div class="dk-actions">'+
    (isFounder?'<button class="vw-act" id="dk-edit" title="Edit">'+DK_EDIT+'</button>':'')+
    '<button class="vw-act" id="dk-theme" data-theme="'+(isDark?'dark':'light')+'" title="Toggle light/dark">'+(isDark?sunIcon:moonIcon)+'</button>'+
    '<button class="vw-act" id="dk-dl" title="Download PDF">'+DK_DL+'</button>'+
    '<button class="vw-act" id="dk-copy" title="Copy link">'+DK_COPY+'</button>'+
    '<button class="vw-act" id="dk-open" title="Open">'+DK_EXT+'</button>'+
    '<button class="vw-act vw-close" id="dk-close">'+DK_X+'</button>'+
    '</div></div>';
}

function buildDeckNarrative(deck){
  var op=window.ROOM_DATA?window.ROOM_DATA.one_pager:'';
  if(op)return'# '+esc(deck.title||'Sleep AI Pitch Deck')+'\n\n'+op;
  return'# '+(deck.title||'Sleep AI Pitch Deck')+'\n\n'
  +'**Company:** ' + ((window.ROOM_DATA && window.ROOM_DATA.company && window.ROOM_DATA.company.name) || 'Your Company') + '\n**Round:** ' + ((window.ROOM_DATA && window.ROOM_DATA.raise && window.ROOM_DATA.raise.stage) || 'Pre-Seed') + '\n\n'
  +'## Circadian Intelligence for AI Agents\n\n'
  +'AI agents run 24/7 — and it is killing their performance. Sleep AI\'s rest protocols '
  +'give agents scheduled downtime to consolidate, prune, and wake up sharper.\n\n'
  +'**Three layers:**\n- Layer 1: Transform — raw data → structured memory\n'
  +'- Layer 2: Recall — instant, context-aware retrieval\n'
  +'- Layer 3: Intelligence — automated workflows & decision support\n';
}
function generateDeckPDF(){
  // Open the print-optimized deck URL; deck-stage has @media print support
  var deck=window.ROOM_DATA&&window.ROOM_DATA.pitch_deck;
  var url=deck?deck.url:'/deck.html';
  // Use print variant if available
  var printUrl=url.replace(/\.html$/,'-print.html');
  var w=window.open(printUrl,'_blank');
  if(!w)w=window.open(url,'_blank');
  if(w)showToast('Deck opened — use ⌘P / Ctrl+P to save as PDF');
}
function bindDeckHeader(o,deck,isFounder){
  o.querySelector('#dk-close').onclick=closeDeckViewer;
  o.querySelector('#dk-open').onclick=function(){window.open(deck.url,'_blank');};
  var dlb=o.querySelector('#dk-dl');
  if(dlb)dlb.onclick=function(){generateDeckPDF();};
  o.querySelector('#dk-copy').onclick=function(){
    var md=buildDeckNarrative(deck);
    navigator.clipboard.writeText(md).then(function(){
      var b=o.querySelector('#dk-copy');b.style.color='#34d399';
      showToast('Deck narrative copied as Markdown');
      setTimeout(function(){b.style.color='';},1500);
    });
  };
  var eb=o.querySelector('#dk-edit');
  if(eb)eb.onclick=function(){closeDeckViewer();showDeckEditModal(deck);};
}

function buildSlideViewer(total){
  return '<div class="dk-slides" id="dk-slides">'+
    '<button class="dk-nav dk-prev" id="dk-prev">&#8249;</button>'+
    '<div class="dk-slide-img-wrap"><img class="dk-slide-img" id="dk-slide-img" draggable="false"/></div>'+
    '<button class="dk-nav dk-next" id="dk-next">&#8250;</button>'+
    '<div class="dk-slide-counter" id="dk-counter">1 / '+total+'</div></div>';
}
function loadSlide(n,img){
  if(window.DECK_SLIDES&&DECK_SLIDES[n])img.src='data:image/jpeg;base64,'+DECK_SLIDES[n];
}
function bindSlideNav(o,total){
  var cur=1,img=o.querySelector('#dk-slide-img'),ctr=o.querySelector('#dk-counter');
  function go(n){if(n<1||n>total)return;cur=n;
    loadSlide(cur,img);ctr.textContent=cur+' / '+total;
    o.querySelector('#dk-prev').style.opacity=cur===1?'0.3':'1';
    o.querySelector('#dk-next').style.opacity=cur===total?'0.3':'1';}
  o.querySelector('#dk-prev').onclick=function(){go(cur-1);};
  o.querySelector('#dk-next').onclick=function(){go(cur+1);};
  o.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')go(cur-1);
    else if(e.key==='ArrowRight')go(cur+1);
    else if(e.key==='Escape')closeDeckViewer();});
  o.tabIndex=0;o.focus();go(1);
}
function openDeckViewer(deck,isFounder){
  if(deckOverlay){deckOverlay.remove();deckOverlay=null;}
  var o=document.createElement('div');o.className='dk-overlay';
  var body='';
  var isHtmlDeck=deck.url&&(deck.url.endsWith('.html')||deck.url.startsWith('/deck'));
  // For HTML decks, use iframe with flash suppression + dark mode
  if(isHtmlDeck){
    var isDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;
    var deckSrc=deck.url+(deck.url.indexOf('?')>-1?'&':'?')+'theme='+(isDark?'dark':'light');
    body='<div class="dk-frame-wrap">'+
      '<iframe class="dk-frame" id="dk-iframe" src="'+esc(deckSrc)+'" allowfullscreen allow="fullscreen" style="opacity:0;transition:opacity 0.4s ease"></iframe>'+
      '<div class="dk-loading" id="dk-loading"><div class="dk-spinner"></div><span>Loading deck…</span></div>'+
      '</div>';
  } else if(isKeynoteUrl(deck.url)){
    body=makeKeynoteCard(deck);
  } else if(isFigmaUrl(deck.url)){
    body=makeFigmaCard(deck);
  } else if(isGSlidesShareUrl(deck.url)){
    body=makeGSlidesSetupCard(deck);
  } else if(window.DECK_SLIDES){
    var total=0;for(var k in DECK_SLIDES)if(DECK_SLIDES[k])total++;
    if(total>0)body=buildSlideViewer(total);
  }
  if(!body){
    body='<div class="dk-frame-wrap">'+
      '<iframe class="dk-frame" id="dk-iframe" src="'+getEmbedUrl(deck.url)+'" allowfullscreen allow="fullscreen"></iframe>'+
      '</div>';
  }
  o.innerHTML=makeDeckHeader(deck,isFounder)+body;
  document.body.appendChild(o);deckOverlay=o;
  requestAnimationFrame(function(){o.classList.add('open');});
  bindDeckHeader(o,deck,isFounder);
  if(o.querySelector('#dk-slides')){var st=0;for(var sk in DECK_SLIDES)if(DECK_SLIDES[sk])st++;bindSlideNav(o,st);}
  var ifr=o.querySelector('#dk-iframe');
  if(ifr){
    var ldr=o.querySelector('#dk-loading');
    ifr.onload=function(){
      // Wait for deck-stage to replace __bundler_thumbnail, then fade in
      setTimeout(function(){
        if(ldr)ldr.style.display='none';
        // Pass dark mode via postMessage (same-origin also via DOM)
        var isDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;
        try{
          ifr.contentWindow.postMessage({theme:isDark?'dark':'light'},'*');
          if(ifr.contentDocument){
            var thumb=ifr.contentDocument.getElementById('__bundler_thumbnail');
            if(thumb)thumb.style.display='none';
          }
        }catch(e){}
        ifr.style.opacity='1';
      },800);
    };
    // Failsafe: show after 5s even if onload didn't fire cleanly
    setTimeout(function(){if(ldr)ldr.style.display='none';ifr.style.opacity='1';},5000);
  }
}



