// Papr Data Room — One job: investor evaluates this company.
declare const DARK_WORDMARK: string;
declare const LIGHT_WORDMARK: string;
declare const ROOM_DATA: {
  company: { name: string; overview: string; stage: string; raised: string; ask: string };
  sections: { label: string; docs: { name: string; desc: string }[] }[];
  team: { name: string; role: string; bio: string; linkedin?: string }[];
  links: { label: string; url: string }[];
};

let tt = 0;
function toast(m: string) {
  const el = document.getElementById('toast')!;
  el.textContent = m; el.classList.add('show');
  clearTimeout(tt); tt = window.setTimeout(() => el.classList.remove('show'), 1800);
}
function esc(s: string) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderDocs(docs: typeof ROOM_DATA.sections[0]['docs']) {
  return docs.map(d => `<div class="doc" data-doc="${esc(d.name)}">
    <div class="doc-info"><div class="doc-name">${esc(d.name)}</div>
    <div class="doc-desc">${esc(d.desc)}</div></div>
    <span class="doc-arrow">›</span></div>`).join('');
}

function render() {
  const { company: c, sections, team, links } = ROOM_DATA;
  document.getElementById('root')!.innerHTML = `<div class="shell">
    <header class="brand">
      <div class="brand-logo dark-logo">${DARK_WORDMARK}</div>
      <div class="brand-logo light-logo">${LIGHT_WORDMARK}</div>
      <span class="brand-sep">·</span>
      <span class="brand-room">Data Room</span>
    </header>
    <section class="hero">
      <h1>${esc(c.name)}</h1>
      <p class="hero-desc">${esc(c.overview)}</p>
      <div class="hero-meta">
        <span class="meta-item"><strong>${esc(c.stage)}</strong></span>
        <span class="meta-item">Raised <strong>${esc(c.raised)}</strong></span>
        <span class="meta-item">Raising <strong>${esc(c.ask)}</strong></span>
      </div>
      <div class="links">${links.map(l =>
        `<a class="link-pill" href="${esc(l.url)}" target="_blank">${esc(l.label)} ↗</a>`).join('')}
      </div>
    </section>
    ${sections.map(s => `<div class="section">
      <div class="section-label">${esc(s.label)}</div>
      <div class="docs">${renderDocs(s.docs)}</div>
    </div>`).join('')}
    <div class="section"><div class="section-label">Team</div>
      <div class="team-grid">${team.map(m => `<div class="team-card">
        <div class="team-name">${esc(m.name)}</div>
        <div class="team-role">${esc(m.role)}</div>
        <div class="team-bio">${esc(m.bio)}</div>
        ${m.linkedin ? `<a class="link-pill" href="${esc(m.linkedin)}" target="_blank" style="margin-top:10px">LinkedIn ↗</a>` : ''}
      </div>`).join('')}</div>
    </div>
    <footer class="footer">
      <span>Confidential · ${esc(c.name)}</span>
      <span>Powered by Papr</span>
    </footer>
    <div id="toast" class="toast"></div>
  </div>`;
  document.querySelectorAll('.doc').forEach(el => el.addEventListener('click', () =>
    toast(`${(el as HTMLElement).dataset.doc} — viewer coming soon`)));
}
render();
