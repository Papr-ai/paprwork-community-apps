// Main app — state machine: disconnected → connecting → connected
import { getConnection, dbWrite, runJob, q, OAUTH_JOB, SCHEMA_JOB } from './helpers.ts';
import { renderSetupGuide } from './wizard.ts';
import { renderConnecting, renderDashboard } from './dashboard.ts';

const app = document.getElementById('app')!;
let polling = false;
let lastError = '';

async function ensureSchema() {
  try { await runJob(SCHEMA_JOB); } catch {}
}

async function checkJobStatus(jobId: string): Promise<string> {
  try {
    const r = await fetch('/api/jobs/status', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }) });
    const d = await r.json();
    return d?.status || 'unknown';
  } catch { return 'unknown'; }
}

async function startOAuth() {
  lastError = '';
  renderConnecting(app);
  polling = true;
  try {
    await runJob(OAUTH_JOB);
    for (let i = 0; i < 120 && polling; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const c = await getConnection();
      if (c?.status === 'connected') { polling = false; render(); return; }
      if (c?.status === 'error') {
        lastError = 'Connection failed. Check that your API keys are correct and APIs are enabled.';
        polling = false; render(); return;
      }
    }
  } catch (e: any) {
    lastError = e?.message || 'OAuth job failed to start. Are GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in Settings?';
  }
  polling = false;
  render();
}

async function disconnect() {
  if (!confirm('Disconnect your Google account?')) return;
  await dbWrite('DELETE FROM google_tokens WHERE connection_id = ?', ['google:primary']);
  await dbWrite('DELETE FROM google_connections WHERE id = ?', ['google:primary']);
  lastError = '';
  render();
}

async function render() {
  await ensureSchema();
  const conn = await getConnection();
  if (conn?.status === 'connected') {
    renderDashboard(app, conn, disconnect);
  } else {
    renderSetupGuide(app, startOAuth, lastError || undefined);
  }
}

render();
setInterval(() => { if (!polling) render(); }, 60000);
