// Setup guide — steps shown first, connect button at the bottom
export function renderSetupGuide(el: HTMLElement, onConnect: () => void, error?: string) {
  const GCP = 'https://console.cloud.google.com/projectcreate';
  const API = 'https://console.cloud.google.com/apis/library';
  const CRED = 'https://console.cloud.google.com/apis/credentials';
  const errHtml = error ? `<div class="error-msg">${error}</div>` : '';
  const gSvg = `<svg class="g-logo" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
  el.innerHTML = `<div class="card">
    <h1>Google Connector</h1>
    <p class="sub">Connect Gmail, Calendar & Drive. Complete the steps below first, then click Connect.</p>
  </div>
  ${errHtml}
  <div class="card wizard">
    <h2 class="wizard-title">Before you connect</h2>
    <div class="step"><div class="step-num">1</div><div class="step-body">
      <h3>Create a Google Cloud Project</h3>
      <p>Free — no billing required.</p>
      <a href="${GCP}" target="_blank" class="link-btn">Open Google Cloud Console ↗</a>
    </div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body">
      <h3>Enable APIs</h3>
      <p>Enable these three APIs in your project:</p>
      <div class="api-links">
        <a href="${API}/gmail.googleapis.com" target="_blank">Gmail ↗</a>
        <a href="${API}/calendar-json.googleapis.com" target="_blank">Calendar ↗</a>
        <a href="${API}/drive.googleapis.com" target="_blank">Drive ↗</a>
      </div>
    </div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body">
      <h3>Create OAuth Credentials</h3>
      <p>Create a <strong>Desktop app</strong> OAuth client. Copy the Client ID and Secret.</p>
      <a href="${CRED}" target="_blank" class="link-btn">Create Credentials ↗</a>
    </div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body">
      <h3>Add Keys to Paprwork</h3>
      <p>Go to <strong>Settings → API Keys → Custom Keys</strong> and add:</p>
      <div class="key-list"><code>GOOGLE_CLIENT_ID</code><code>GOOGLE_CLIENT_SECRET</code></div>
    </div></div>
  </div>
  <div class="card empty">
    <p class="sub">Done with the steps above?</p>
    <button class="btn-connect" onclick="window.__connect()">${gSvg} Connect Google Account</button>
  </div>`;
  (window as any).__connect = onConnect;
}
