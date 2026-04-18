const APP_ID = 'e460c97b-62da-4ddf-969d-874daa9ba819';
const OAUTH_JOB = '33f9e34c-1dad-4997-a893-a6e8caafeb84';
const app = document.getElementById('app')!;
const esc = (s = '') => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const SCOPE_LABELS: Record<string, string> = {
  'gmail.readonly': 'Gmail', 'calendar': 'Calendar', 'drive.file': 'Drive'
};

async function q(sql: string, p: any[] = []) {
  const r = await fetch('/api/db/query', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sql, params: p }) });
  return (await r.json()).rows || [];
}

async function startOAuth() {
  const btn = app.querySelector('.btn-connect') as HTMLButtonElement;
  if (btn) { btn.disabled = true; btn.textContent = 'Opening browser…'; }
  try {
    await fetch('/api/jobs/run', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: OAUTH_JOB }) });
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const [c] = await q('SELECT status FROM google_connections WHERE id = ?', ['google:primary']);
      if (c?.status === 'connected' || c?.status === 'error') break;
    }
  } catch (e: any) { /* falls through to render */ }
  render();
}

async function disconnect() {
  if (!confirm('Disconnect your Google account?')) return;
  await fetch('/api/db/write', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sql: 'DELETE FROM google_tokens WHERE connection_id = ?', params: ['google:primary'] }) });
  await fetch('/api/db/write', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sql: 'DELETE FROM google_connections WHERE id = ?', params: ['google:primary'] }) });
  render();
}

async function render() {
  const rows = await q(`SELECT c.*, t.expires_at, t.updated_at as token_updated
    FROM google_connections c LEFT JOIN google_tokens t ON t.connection_id = c.id WHERE c.id = 'google:primary'`);
  const c = rows[0];
  const now = new Date().toISOString();
  const connected = c?.status === 'connected';
  const live = connected && c.expires_at && c.expires_at > now;
  const pending = c?.status === 'pending';
  const scopes = (c?.scopes || '').split(' ').filter((s: string) => s.includes('googleapis'))
    .map((s: string) => { const k = Object.keys(SCOPE_LABELS).find(k => s.includes(k)); return k ? SCOPE_LABELS[k] : null; })
    .filter(Boolean);

  app.innerHTML = `<div class="card">
    <h1>Google Connector</h1>
    <p class="sub">One-click OAuth — connects Gmail, Calendar & Drive. Tokens refresh automatically.</p>
  </div>
  ${connected ? `<div class="card">
    <div class="account">
      ${c.picture_url ? `<img class="avatar" src="${esc(c.picture_url)}" referrerpolicy="no-referrer">` :
        `<div class="avatar">${esc((c.display_name?.[0] || c.email?.[0] || '?').toUpperCase())}</div>`}
      <div class="info"><strong>${esc(c.email)}</strong><span>${esc(c.display_name || '')}</span></div>
    </div>
    <div class="meta">
      <span class="badge ${live ? 'ok' : 'err'}">${live ? '● Connected' : '○ Token expired'}</span>
      ${c.expires_at ? `<span>Expires ${esc(c.expires_at.replace('T', ' ').slice(0, 19))} UTC</span>` : ''}
    </div>
    ${scopes.length ? `<div class="scopes">${scopes.map((s: string) => `<span class="scope-tag">${esc(s)}</span>`).join('')}</div>` : ''}
    <button class="btn-disconnect" onclick="handleDisconnect()">Disconnect</button>
  </div>` : `<div class="card empty">
    ${pending ? '<p>Waiting for Google sign-in…</p><button class="btn-connect" disabled>Connecting…</button>' :
      `<p>No Google account connected yet.</p>
      <button class="btn-connect" onclick="handleConnect()">
        <svg class="g-logo" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Connect Google Account</button>`}
  </div>`}`;
}

(window as any).handleConnect = startOAuth;
(window as any).handleDisconnect = disconnect;
render();

