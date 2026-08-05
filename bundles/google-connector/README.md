# Google Connector v2.0.0

Connect your Google account to Paprwork with one click. Supports Gmail, Calendar, and Drive.

## What's New in v2.0.0
- **Setup wizard** — clear step-by-step guide visible before connecting
- **One-click OAuth** — local callback server catches the redirect automatically (no copy-paste)
- **Auto token refresh** — scheduled job refreshes tokens every 45 minutes
- **Liquid Glass UI** — redesigned with the Paprwork design system
- **Modular architecture** — 4 focused TypeScript files instead of 1 monolith

## Setup
1. Create a Google Cloud project (free)
2. Enable Gmail, Calendar, and Drive APIs
3. Create a Desktop OAuth client
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Settings → API Keys → Custom Keys
5. Click **Connect Google Account**

## Jobs
| Job | Purpose | Schedule |
|-----|---------|----------|
| google-connector-schema | Creates database tables | Run once |
| google-connector-oauth | Handles OAuth flow with local callback server | On demand |
| google-connector-refresh | Refreshes tokens before expiry | Every 45 min |

## Requirements
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
