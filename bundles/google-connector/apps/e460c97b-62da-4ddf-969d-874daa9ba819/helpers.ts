// Shared constants and utilities
export const APP_ID = 'e460c97b-62da-4ddf-969d-874daa9ba819';
export const OAUTH_JOB = '33f9e34c-1dad-4997-a893-a6e8caafeb84';
export const SCHEMA_JOB = '1b1fd68b-f25a-4433-a5cf-359b34b4147e';
export const esc = (s = '') => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function q(sql: string, p: any[] = []) {
  const r = await fetch('/api/db/query', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sql, params: p }) });
  return (await r.json()).rows || [];
}

export async function dbWrite(sql: string, p: any[] = []) {
  await fetch('/api/db/write', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, sql, params: p }) });
}

export async function runJob(jobId: string) {
  await fetch('/api/jobs/run', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }) });
}

export interface ConnectionInfo {
  id: string; email: string; display_name: string;
  picture_url: string; status: string; scopes: string;
  expires_at: string; token_updated: string;
}

export async function getConnection(): Promise<ConnectionInfo | null> {
  const rows = await q(`SELECT c.*, t.expires_at, t.updated_at as token_updated
    FROM google_connections c LEFT JOIN google_tokens t ON t.connection_id = c.id
    WHERE c.id = 'google:primary'`);
  return rows[0] || null;
}
