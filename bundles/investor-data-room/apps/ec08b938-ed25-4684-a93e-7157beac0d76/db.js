const APP_ID = 'ec08b938-ed25-4684-a93e-7157beac0d76';
const DB_SOURCE = '5bebc6e1-7cbc-465b-a020-1f7e8dfcb63f:Community Data Room DB Setup (5bebc6e1)';

async function dbQuery(sql, params) {
  const body = { appId: APP_ID, sourceId: DB_SOURCE, sql };
  if (params) body.params = params;
  const r = await fetch('/api/db/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('DB query failed: ' + r.status);
  const data = await r.json();
  return data.rows || [];
}

async function dbWrite(sql, params) {
  const r = await fetch('/api/db/write', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sourceId: DB_SOURCE, sql, params: params || [] })
  });
  if (!r.ok) {
    var txt = ''; try { txt = await r.text(); } catch(e) {}
    throw new Error('DB write failed: ' + r.status + ' ' + txt.substring(0, 100));
  }
  return r.json();
}

async function loadCompany() {
  try {
    const rows = await dbQuery("SELECT * FROM company_info WHERE id='papr'");
    if (rows.length) return rows[0];
  } catch(e) {}
  if (window.ROOM_DATA && window.ROOM_DATA.company) {
    var c = window.ROOM_DATA.company;
    var links = window.ROOM_DATA.links || [];
    var fl = function(l){ var f = links.find(function(x){return x.label===l}); return f ? f.url : ''; };
    var co = { name: c.name||'', tagline: c.overview||'', overview: c.overview||'', website: fl('Website'), linkedin: fl('LinkedIn'), substack: fl('Substack') };
    try { var saved = localStorage.getItem('dr-company'); if (saved) Object.assign(co, JSON.parse(saved)); } catch(e){}
    return co;
  }
  return {};
}

async function loadRaise() {
  try {
    const rows = await dbQuery("SELECT * FROM raise_tracker WHERE id='current'");
    if (rows.length) return rows[0];
  } catch(e) {}
  if (window.ROOM_DATA && window.ROOM_DATA.company) {
    var c = window.ROOM_DATA.company;
    return { stage: c.stage||'Pre-Seed', target_amount: 3000000, raised_amount: 1200000, committed_amount: 0 };
  }
  return {};
}

async function loadSections() {
  try {
    var rows = await dbQuery("SELECT * FROM sections ORDER BY sort_order");
    if (rows.length) return rows;
  } catch(e) {}
  if (window.ROOM_DATA && window.ROOM_DATA.sections) {
    return window.ROOM_DATA.sections.map(function(s, i) {
      return { id: i + 1, label: s.label, description: '', sort_order: i };
    });
  }
  return [];
}

async function loadDocs(sectionId) {
  return dbQuery("SELECT * FROM documents WHERE section_id=? ORDER BY sort_order", [sectionId]);
}

async function loadAllDocs() {
  try {
    var rows = await dbQuery("SELECT * FROM documents ORDER BY section_id, sort_order");
    if (rows.length) return rows;
  } catch(e) {}
  if (window.ROOM_DATA && window.ROOM_DATA.sections) {
    var docs = [];
    window.ROOM_DATA.sections.forEach(function(s, si) {
      (s.docs || []).forEach(function(d, di) {
        docs.push({ id: si * 100 + di, section_id: si + 1, name: d.name, description: d.desc || '', file_type: 'link', sort_order: di });
      });
    });
    return docs;
  }
  return [];
}

async function loadTeam() {
  try {
    var rows = await dbQuery("SELECT * FROM team_members ORDER BY sort_order");
    if (rows.length) return rows;
  } catch(e) {}
  if (window.ROOM_DATA && window.ROOM_DATA.team) {
    return window.ROOM_DATA.team.map(function(m, i) {
      return { name: m.name, role: m.role, bio: m.bio, photo_url: m.photo||'', linkedin: m.linkedin||'', x_url: m.x||'', sort_order: i };
    });
  }
  return [];
}

// loadInvestors, loadIntros, esc, fmt etc. in db-queries.js
