// Investor Detail — timeline + multi-channel renderers (SVG icons, no emojis)
function _renderTimeline(detail) {
  var h = '<h3 class="id-section-title">Engagement Timeline</h3><div class="id-timeline">';
  if (!detail.length) return h + '<div class="ana-empty">No detailed events yet</div></div>';
  var byDate = {};
  detail.forEach(function(r) {
    var d = r[5] ? r[5].split('T')[0] : 'Unknown';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push({ event: r[0], section: r[1], doc: r[2], time: r[3], scroll: r[4], ts: r[5], city: r[6] });
  });
  Object.keys(byDate).slice(0, 14).forEach(function(date) {
    h += '<div class="id-date-group"><div class="id-date">' + date + '</div>';
    byDate[date].forEach(function(ev) {
      var icon = ev.event === 'dr_doc_click' ? AI.doc : ev.event === 'dr_session_end' ? AI.wave : AI.eye;
      var timeStr = ev.time ? _ftime(Math.round(parseFloat(ev.time)||0)) : '';
      var scrollStr = ev.scroll ? Math.round(parseFloat(ev.scroll)||0) + '% scroll' : '';
      var meta = [timeStr, scrollStr].filter(Boolean).join(' · ');
      h += '<div class="id-event"><span class="id-ev-icon">' + icon + '</span>';
      h += '<span class="id-ev-name">' + (ev.section || ev.doc || ev.event) + '</span>';
      if (meta) h += '<span class="id-ev-meta">' + meta + '</span>';
      if (ev.city) h += '<span class="id-ev-city">' + AI.pin + ' ' + ev.city + '</span>';
      h += '</div>';
    });
    h += '</div>';
  });
  return h + '</div>';
}
function _renderMulti(inv) {
  var h = '<h3 class="id-section-title">Multi-Channel Signals</h3><div class="id-multi">';
  var signals = [
    { icon: AI.mail, label: 'Emails', val: (inv.emailCount || 0) + (inv.lastEmailSubject ? ' · ' + inv.lastEmailSubject : '') },
    { icon: AI.handshake, label: 'Meetings', val: (inv.meetingCount || 0) + (inv.lastMeetingDate ? ' · last ' + inv.lastMeetingDate : '') },
    { icon: AI.calendar, label: 'Visit Days', val: (inv.visitDays || 0) + ' days' },
    { icon: AI.timer, label: 'Total Time', val: _ftime(inv.totalTime) }
  ];
  signals.forEach(function(s) {
    h += '<div class="id-signal"><span class="id-signal-icon">' + s.icon + '</span>';
    h += '<span class="id-signal-label">' + s.label + '</span>';
    h += '<span class="id-signal-val">' + s.val + '</span></div>';
  });
  return h + '</div>';
}
