# Google Connector

One-click Google OAuth connector for Paprwork. Click **Connect**, sign in with Google, done.

## What it does

- **One-click OAuth** — Click Connect, browser opens, sign in, redirect is caught automatically
- **Auto token refresh** — Tokens refresh every 45 minutes, always stays connected
- **Gmail, Calendar & Drive** — Scopes for reading email, calendar events, and Drive file access

## Setup

### Prerequisites
1. A **Google Cloud project** (free) at [console.cloud.google.com](https://console.cloud.google.com)
2. **Gmail API**, **Google Calendar API**, and **Google Drive API** enabled
3. An **OAuth 2.0 Client ID** (Desktop app type)
4. Redirect URI set to: `http://127.0.0.1:8765/google-oauth-callback`

### API Keys Required
Add these in Paprwork → Settings → Custom API Keys:
- `GOOGLE_CLIENT_ID` — Your OAuth Client ID
- `GOOGLE_CLIENT_SECRET` — Your OAuth Client Secret

## Architecture

| Job | Purpose |
|-----|---------|
| `google-connector-schema` | Creates database tables (run once) |
| `google-connector-oauth` | Runs local HTTP server, opens browser, exchanges code for tokens |
| `google-connector-refresh` | Refreshes tokens every 45 min (scheduled) |

## Database Schema

**google_connections** — Connected Google accounts (id, email, display_name, picture_url, status, scopes)

**google_tokens** — OAuth tokens (connection_id, access_token, refresh_token, expires_at)

Other jobs can query these tables to use the stored tokens for Google API calls.
