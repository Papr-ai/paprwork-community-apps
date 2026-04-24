// VC person card — matches founder pcard style (horizontal, avatar + info + subtle button)
function _vcPersonCard(p) {
  var ini = p.via_person.split(' ').map(function(w){return w[0]}).join('').slice(0,2);
  var liUrl = p._li || p.via_person_linkedin || '';
  var liHtml = liUrl ? '<a href="'+esc(liUrl)+'" target="_blank" class="pcard-li" onclick="event.stopPropagation();event.preventDefault();window.open(this.href,\'_blank\')">in</a>' : '';
  var avHtml = p._photo
    ? '<img class="pcard-av" src="'+p._photo+'"/>'
    : '<span class="pcard-av pcard-av-i">'+ini+'</span>';
  return '<div class="pcard glass">'+avHtml+
    '<div class="pcard-info"><span class="pcard-name">'+esc(p.via_person)+liHtml+'</span>'+
    '<span class="pcard-title">'+esc(p._title||p.via_person_title)+'</span></div>'+
    '<a href="'+buildVCMailLink(p)+'" class="btn-sm glass" style="text-decoration:none;font-size:11px">Request Intro</a></div>';
}

function buildVCMailLink(p) {
  var sub = 'Intro Request: Papr - Context Intelligence Platform';
  var body = 'Hi '+p.via_person.split(' ')[0]+',\n\n'+
    'I wanted to introduce you to Alex and Sarah, co-founders of Sleep AI.\n\n'+
    'Papr is building the structured memory layer for AI - they achieved state-of-the-art '+
    'on the STaRK benchmark, have $72K ARR with 23 customers, and are backed by Techstars.\n\n'+
    'Would love to connect you all.\n\nBest';
  return 'mailto:?cc='+encodeURIComponent(window.FOUNDER_EMAILS||'')+
    '&subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body);
}
