# Papr Data Room — Architecture & Design

## Design Brief
- **App name:** Papr Data Room
- **Primary persona:** VC / Angel investor receiving a data room link
- **Job-to-be-done:** "When I receive a data room link, I want to quickly evaluate this company, so I can decide whether to invest."
- **Primary outcome:** Investor forms conviction faster
- **Success metric:** Time-to-decision (< 10 min to scan full room)
- **Non-goals:** Document management UI, admin dashboard, file upload UI (v2)
- **Primary CTA:** Open document

## Architecture Overview

### Current State (v1 — Static MVP)
```
index.html → loads logos.js, data.js, utils.js, app.js
data.js    → all room content (company, sections, team, links)
app.js     → renders the single-page data room
utils.js   → helpers (toast, escape, photo upload, doc rendering)
logos.js   → Papr brand SVG wordmarks (dark + light)
style.css  → Liquid Glass design system
```
Everything is client-side. No backend. No database. Data is hardcoded in `data.js`.
Photos persist via `localStorage` (click-to-upload on team cards).

### Target State (v2 — Live + Secure)
```
┌─────────────────────────────────────────────┐
│                  Founder View                │
│  (Paprwork mini-app — edit content, manage   │
│   investors, generate links, track views)    │
└──────────────────┬──────────────────────────┘
                   │ writes to
                   ▼
┌─────────────────────────────────────────────┐
│              SQLite Database                 │
│  Tables:                                     │
│  - company_info   (name, overview, stage...) │
│  - sections       (label, order)             │
│  - documents      (section_id, name, desc,   │
│                    file_path, file_url)       │
│  - team_members   (name, role, bio, photo,   │
│                    linkedin, x_url)           │
│  - investors      (name, fund, stage, email, │
│                    logo_url, passcode)        │
│  - investor_links (investor_id, token,       │
│                    created_at, expires_at,    │
│                    sections_visible)          │
│  - raise_tracker  (raised, committed,        │
│                    remaining, target, updated)│
│  - view_events    (investor_id, doc_name,    │
│                    action, timestamp)         │
└──────────────────┬──────────────────────────┘
                   │ read by
                   ▼
┌─────────────────────────────────────────────┐
│              Investor View                   │
│  (Vercel-hosted page — tokenized URL)        │
│  e.g. room.papr.ai/e14?token=abc123         │
│                                              │
│  - Passcode gate on first visit              │
│  - Per-investor logo + subtle personalization│
│  - Only shows sections the founder enabled   │
│  - Tracks: viewed, downloaded, time spent    │
│  - Auto-updates when founder changes data    │
└─────────────────────────────────────────────┘
```

## Data Model — Detailed

### `raise_tracker` (single row, founder updates manually)
| Column | Type | Description |
|--------|------|-------------|
| target | TEXT | Total raise target, e.g. "$5M" |
| raised | TEXT | Already received (closed), e.g. "$270K" |
| committed | TEXT | Soft commits not yet wired, e.g. "$500K" |
| remaining | TEXT | Auto-calculated: target - raised - committed |
| stage | TEXT | Pre-Seed, Seed, Series A |
| updated_at | INTEGER | Last manual update timestamp |

**Raised vs Committed:**
- **Raised** = money received, in the bank. e14 Fund ($50K) + Techstars ($220K) = $270K raised.
- **Committed** = verbal/written commit, not yet wired. Could change.
- **Remaining** = target - raised - committed = what's still needed.
- All three show on the investor-facing room.

### `investors` (one row per VC/angel)
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| name | TEXT | "e14 Fund" |
| fund_url | TEXT | "http://e14.vc" |
| logo_url | TEXT | Auto-fetched via `logo.clearbit.com/{domain}` or Google |
| contact_name | TEXT | Partner name |
| contact_email | TEXT | For passcode delivery |
| stage | TEXT | intro / soft_commit / diligence / closed |
| passcode | TEXT | 6-digit code, generated per investor |
| attio_record_id | TEXT | Link back to Attio CRM |
| invested_amount | TEXT | If closed, how much |
| committed_amount | TEXT | If soft-committed |
| created_at | INTEGER | |
| updated_at | INTEGER | |

### `investor_links` (one per share event)
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| investor_id | TEXT | FK → investors |
| token | TEXT | Unique URL token (crypto.randomUUID) |
| sections_visible | TEXT | JSON array of section IDs visible |
| expires_at | INTEGER | Optional expiry |
| revoked | INTEGER | 0/1 — instant revoke |
| created_at | INTEGER | |

### `view_events` (analytics)
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| investor_id | TEXT | FK |
| doc_name | TEXT | What they looked at |
| action | TEXT | viewed / downloaded / time_spent |
| value | TEXT | Duration in seconds, or "1" for view |
| ip | TEXT | Optional |
| timestamp | INTEGER | |

## Integration Plan

### 1. SQLite (Papr Job)
- One job: `data-room-db` — creates tables, seeds from current `data.js`
- Mini-app reads/writes via `/api/db/query` and `/api/db/write`
- Founder edits content in-app → writes to DB → investor sees updated room

### 2. Vercel SDK
- **What we need:** `VERCEL_API_KEY` (or project token)
- **Purpose:** Host the investor-facing page as a Vercel serverless function
- **Flow:**
  1. Founder creates investor in Papr → generates token + passcode
  2. Founder shares URL: `room.papr.ai/{investor-slug}?token={uuid}`
  3. Investor visits → passcode gate → room renders from DB
  4. Room content auto-updates (no re-sharing needed)
- **Alternative (simpler v2.1):** Use Papr's own mini-app URL with token param
  - No Vercel needed initially
  - Just: `papr.ai/room/{token}` → renders from SQLite

### 3. Attio CRM Sync
- **Key available:** `ATTIO_API_KEY` ✅
- **Purpose:** Pull existing VC prospects + investor data from Attio
- **Sync job:** `attio-investor-sync`
  - Pulls companies from Attio lists (VCs, Angels)
  - Maps to `investors` table
  - Syncs stage changes bidirectionally
  - Auto-fetches logos via domain
- **Existing investors to seed:**
  - e14 Fund → $50K raised (closed)
  - Techstars → $220K raised (closed)

### 4. Per-Investor Personalization
- When VC visits their room link:
  - Their fund logo appears subtly in the header
  - "Prepared for {Fund Name}" appears below the company name
  - Raise progress bar shows current state
  - Sections are filtered to what founder enabled for that stage
- Logo fetching: `https://logo.clearbit.com/{domain}` (free, no key needed)
  - Fallback: Google Favicon API `https://www.google.com/s2/favicons?domain={domain}&sz=128`

## Techstars Best Practices (Encoded)

### Progressive Disclosure by Stage
| Stage | What's Visible |
|-------|---------------|
| Intro (Meeting 1) | Pitch Deck, One-Pager, Product Demo, FAQ |
| Soft Commit | + Financial Model, Use of Funds, Customer Data, ICP, GTM |
| Diligence | + Cap Table, Entity Formation, IP & Patents, Contracts, Tax |

### "Make it the FINAL step"
- Don't send full room after meeting 1
- Redirect data room asks to second meeting
- Share what's decision-useful, not everything

### "I assume you run your company like you run your data room"
- Richard Dulude, Underscore VC
- Aesthetics matter. Spelling, grammar, consistency.
- One source of truth. Not scattered across Notion, Dropbox, Drive.

## Design Principles (Liquid Glass)

### Applied to Data Room
1. **One job per screen** — investor evaluates company
2. **One primary action** — open document
3. **Progressive disclosure** — sections expand, docs open in viewer
4. **Premium simplicity** — dark glass, subtle borders, clean type
5. **No friction onboarding** — passcode → room → scan in 10 seconds

### Typography
- H1: 42px, -0.5px tracking (company name)
- Body: 16px, 1.65 line-height (descriptions)
- Labels: 11px uppercase, 1.2px tracking (section headers)
- Pills: 13px, 500 weight (links)

### Spacing
- Section gap: 40px
- Doc rows: 14px padding, 1px gap (stacked)
- Link pills: 10px gap
- Meta items: 24px gap
- Mission/BHAG blocks: 32px gap

### Color
- Accent: `#0161E0` (Papr blue)
- Glass: `rgba(255,255,255,0.06)` on dark
- Text primary: `rgba(255,255,255,0.92)`
- Text secondary: `rgba(255,255,255,0.55)`
- Text tertiary: `rgba(255,255,255,0.32)`

### Team Cards — Liquid Glass Photo Ring
- 88px circular photo
- Gradient ring: `linear-gradient(135deg, #0161E0, #0CF, #0161E0)`
- Ring opacity: 0.5 → 0.85 on hover
- Inner glass shadow: `inset 0 1px 0 rgba(255,255,255,0.12)`
- Click-to-upload with frosted hint overlay

## File Structure (Target v2)
```
index.html          — shell, loads scripts
style.css           — Liquid Glass tokens + components
logos.js            — Papr SVG wordmarks
data.js             — static fallback data (seed)
utils.js            — helpers, photo upload, doc rendering
app.js              — main render (founder view)
investor-view.js    — investor-facing render (token-gated)
db.js               — SQLite read/write helpers
ARCHITECTURE.md     — this file
agent.md            — agent learnings
```

## Security Model
- **Passcode:** 6-digit, per-investor, delivered via email
- **Token:** UUID in URL, maps to `investor_links` row
- **Expiry:** Optional, set per link
- **Revoke:** Instant, flip `revoked=1`
- **Sections:** Per-investor visibility (JSON array)
- **Watermark:** Optional, investor name faintly overlaid on docs
- **No download by default:** Documents render in-app, download requires explicit enable

## Build Order
1. ✅ Static MVP (current) — hardcoded data, Liquid Glass UI
2. 🔲 SQLite backend — editable content, raise tracker
3. 🔲 Investor management — add/remove VCs, generate links
4. 🔲 Secure investor view — passcode gate, per-investor rendering
5. 🔲 Attio sync — pull VCs from CRM
6. 🔲 Vercel hosting — public investor URLs
7. 🔲 Analytics — view tracking, time spent, audit trail
8. 🔲 AI summaries — Vercel AI SDK for investor-specific cover notes
