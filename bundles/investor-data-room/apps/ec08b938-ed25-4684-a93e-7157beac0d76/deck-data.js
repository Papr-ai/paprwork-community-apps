// deck-data.js — load/save pitch deck data
var deckOverlay=null;
function isFigmaUrl(u){try{return new URL(u).hostname.includes('figma.com');}catch(e){return false;}}
function isLocalDeck(u){return u&&(u.startsWith('pitch_deck/')||u.endsWith('.html'))&&!u.startsWith('http');}
function isKeynoteUrl(u){try{var h=new URL(u).hostname;return h.includes('icloud.com')&&u.includes('/keynote/');}catch(e){return false;}}
function isGSlidesUrl(u){try{var p=new URL(u);return p.hostname.includes('docs.google.com')&&p.pathname.includes('/presentation/');}catch(e){return false;}}
function isGSlidesPubUrl(u){try{return isGSlidesUrl(u)&&(new URL(u).pathname.includes('/pub')||new URL(u).pathname.includes('/embed'));}catch(e){return false;}}
function isGSlidesShareUrl(u){return isGSlidesUrl(u)&&!isGSlidesPubUrl(u);}
function getGSlidesId(u){try{var m=u.match(/\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:'';}catch(e){return '';}}
function getEmbedUrl(u){
  if(!u)return'';
  try{
    var p=new URL(u),h=p.hostname,path=p.pathname;
    if(h.includes('docs.google.com')&&path.includes('/presentation/')){
      if(path.includes('/pub')||path.includes('/embed')){
        return u.split('?')[0].replace('/pub','/embed')+'?start=false&loop=false&delayms=0';
      }
      var m=path.match(/\/d\/(?!e\/)([a-zA-Z0-9_-]{10,})/);
      if(m)return 'https://docs.google.com/presentation/d/'+m[1]+'/embed?start=false&loop=false&delayms=0';
    }
    if(h.includes('drive.google.com'))return u.replace('/view','/preview').replace('/edit','/preview');
    if(h.includes('canva.com'))return u+(u.includes('?')?'&':'?')+'embed';
    if(h.includes('loom.com'))return u.replace('/share/','/embed/');
    return u;
  }catch(e){return u;}
}
var DECK_KEY='dr-pitch-deck';
function loadDeck(){
  if(window.ROOM_DATA&&window.ROOM_DATA.pitch_deck)return window.ROOM_DATA.pitch_deck;
  try{var s=localStorage.getItem(DECK_KEY);if(s){var d=JSON.parse(s);if(d&&d.url)return d;}}catch(e){}
  return null;
}
function saveDeckUrl(url,title,desc){
  var deck={url:url,title:title||'Pitch Deck',description:desc||''};
  localStorage.setItem(DECK_KEY,JSON.stringify(deck));
  if(!window.ROOM_DATA)window.ROOM_DATA={};
  window.ROOM_DATA.pitch_deck=deck;
}
function openDeck(isFounder){
  var deck=loadDeck();
  if(!deck||!deck.url){if(isFounder)showDeckEditModal({url:'',title:'Pitch Deck',description:''});return;}
  openDeckViewer(deck,isFounder);
}
