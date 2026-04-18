// Connected state dashboard
import { esc, getConnection, dbWrite, runJob, OAUTH_JOB, ConnectionInfo } from './helpers.ts';

const SCOPE_MAP: Record<string, string> = {
  'gmail.readonly': 'Gmail', 'calendar': 'Calendar', 'drive.file': 'Drive'
};

function parseScopes(scopes: string): string[] {
  return (scopes || '').split(/\s+/).filter(s => s.includes('googleapis'))
    .map(s => { const k = Object.keys(SCOPE_MAP).find(k => s.includes(k)); return k ? SCOPE_MAP[k] : null; })
    .filter(Boolean) as string[];
}

function tokenStatus(expiresAt: string): { label: string; cls: string } {
  if (!expiresAt) return { label: 'No token', cls: 'err' };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expired — auto-refresh pending', cls: 'warn' };
  const mins = Math.round(diff / 60000);
  if (mins < 10) return { label: `Expires in ${mins}m — refreshing soon`, cls: 'warn' };
  return { label: `Active — refreshes in ${mins}m`, cls: 'ok' };
}

export function renderConnecting(el: HTMLElement) {
  el.innerHTML = `<div class="card"><h1>Google Connector</h1>
    <p class="sub">Connect Gmail, Calendar & Drive with one click.</p></div>
    <div class="card empty"><div class="spinner"></div>
    <p>Waiting for Google sign-in…</p>
    <p class="sub">A browser window should have opened. Sign in and grant access.</p></div>`;
}

export function renderReady(el: HTMLElement, onConnect: () => void) {
  el.innerHTML = `<div class="card"><h1>Google Connector</h1>
    <p class="sub">Connect Gmail, Calendar & Drive with one click.<br>Your keys are configured — click below to connect.</p></div>
    <div class="card empty">
      <button class="btn-connect" onclick="window.__connect()">
        <svg class="g-logo" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Connect Google Account</button></div>`;
  (window as any).__connect = onConnect;
}

export function renderDashboard(el: HTMLElement, c: ConnectionInfo, onDisconnect: () => void) {
  const tok = tokenStatus(c.expires_at);
  const scopes = parseScopes(c.scopes);
  const errMsg = c.status === 'error' ? `<div class="error-msg">Connection error. Try reconnecting.</div>` : '';
  el.innerHTML = `<div class="card"><h1>Google Connector</h1>
    <p class="sub">Connected and syncing automatically.</p></div>
    ${errMsg}
    <div class="card">
      <div class="account">
        ${c.picture_url ? `<img class="avatar" src="${esc(c.picture_url)}" referrerpolicy="no-referrer">` :
          `<div class="avatar">${esc((c.display_name?.[0] || c.email?.[0] || '?').toUpperCase())}</div>`}
        <div class="info"><strong>${esc(c.email)}</strong><span>${esc(c.display_name || '')}</span></div>
      </div>
      <div class="meta">
        <span class="badge ${tok.cls}">● ${tok.label}</span>
      </div>
      ${scopes.length ? `<div class="scopes">${scopes.map(s => `<span class="scope-tag">${esc(s)}</span>`).join('')}</div>` : ''}
      <div class="meta"><span class="sub">Token auto-refreshes every 45 min</span></div>
      <button class="btn-disconnect" onclick="window.__disconnect()">Disconnect</button>
    </div>`;
  (window as any).__disconnect = onDisconnect;
}
