# Data Room Community App — Publishing Plan

> **Goal:** Publish the Papr Data Room as a reusable community app template. Strip all Papr-proprietary data, keep the full design/UX, seed with example data, and provide a chat-first onboarding so any startup can build their own investor data room.

---

## 1. Architecture Overview

### Current System
```
┌─────────────────────────────────────────────────────────┐
│  Mini-App: Papr · Data Room (b0a164c2)                  │
│  60+ JS/CSS files, Liquid Glass design                  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Founder View │  │ Investor View│  │ Connector View │ │
│  │ (admin/edit) │  │ (VC portal)  │  │ (intro helper) │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│         ▼                ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │        SQLite DB (data.db via data-sources)      │   │
│  │  company_info · sections · documents · investors │   │
│  │  vc_partners · vc_portfolio · intro_pathways     │   │
│  │  team_members · faq · customers · icp_criteria   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│ Data Room DB    │          │ Data Room Publish     │
│ Setup (b6d2f0ea)│ ──dep──▶│ (686d5ffa)            │
│ Schema + seed   │          │ Bake HTML → Vercel    │
└─────────────────┘          └──────────────────────┘
```

### Supporting Jobs (pipeline)
| Job | ID (short) | Role | Include in Bundle? |
|-----|-----------|------|-------------------|
| Data Room DB Setup | `b6d2f0ea` | Schema creation, seed data | ✅ Yes (modified) |
| Data Room Publish | `686d5ffa` | Bake HTML + deploy to Vercel | ✅ Yes (as-is) |
| VC Fit Score Calculator | `0cb673e1` | Compute thesis match scores | ✅ Yes |
| VC Portfolio Intelligence Builder | `5b59195c` | Build portfolio data | ✅ Yes |
| VC Portfolio Researcher | `631f1b5d` | Research portfolio cos | ✅ Yes |
| Connector Share Page Deploy | `c3cb3cc3` | Deploy connector pages | ⚠️ Optional |

### App Files (60+ files)
**Core rendering:** `app.js`, `investor-room.js`, `connector-room.js`, `components.js`
**Investor tabs:** `intros-investor.js`, `intros-vc-paths.js`, `intros-vc-card.js`, `intros-cards.js`
**Company sections:** `comp.js`, `comp-data.js`, `comp-edit.js`, `comp-logos.js`
**ICP/Fit:** `icp-data.js`, `ctx-intel-data.js`, `ctx-intel-viz.js`, `fit-explainer.js`
**Styles:** `style.css`, `comp.css`, `demos.css`, `fit-explainer.css`, `comp-mm.css`
**Assets:** `logos.js` (SVG wordmarks), `DSC00841-50.jpg` (team photos)
**Config:** `ARCHITECTURE.md`, `agent.md`, `data-sources.json`

---

## 2. Data Classification: Strip vs Keep vs Seed

### 🔴 STRIP — Papr Proprietary (must remove)

| Data | Location | Action |
|------|----------|--------|
| Company info (Papr, Inc.) | `company_info` table | Replace with fake company |
| Documents content (moat, GTM, financials) | `documents` table | Replace with template docs |
| Team members (Shawkat, Amir, etc.) | `team_members` table | Replace with fake founders |
| Team photos (DSC00841-50.jpg) | App image files | Replace with placeholder avatars |
| FAQ answers (Papr-specific) | `faq` table | Replace with template FAQs |
| Pitch deck | `pitch_deck` table + HTML file | Remove, add placeholder |
| ICP criteria (Papr's ICP) | `icp_criteria` table + `icp-data.js` | Replace with fake ICP |
| Customer data | `customers` table | Replace with fake customers |
| Case studies | `case_studies` table | Replace with template |
| Raise tracker (amount, terms) | `raise_tracker` table | Replace with example raise |
| Investment memo | `investment_memo` table | Replace with template |
| Revenue history | `revenue_history` table | Replace with example |
| Investor links / tokens | `investor_links` table | Clear (generated per-user) |
| Connector data (names, photos) | `connectors` table | Clear (user adds own) |
| Intro pathways (manually curated) | `intro_pathways` table | Clear (user adds own) |
| Config (calendly URL, etc.) | `config` table | Reset to defaults |
| Papr logos (SVG wordmarks) | `logos.js` | Replace with placeholder |
| Hardcoded emails | `intros-vc-card.js`, `inv-share.js` | Make dynamic from DB |
| Hardcoded domain (`dataroom.papr.ai`) | `inv-add-person.js`, `inv-share.js` | Make configurable |

### 🟢 KEEP — Valuable Public Data (ship with bundle)

| Data | Rows | Rationale |
|------|------|-----------|
| Investors (VC firms) | 1,062 | Public VC directory — huge value for any founder |
| VC Partners (people at VCs) | 2,434 | Public info — names, titles, LinkedIn |
| VC Portfolio Companies | 8,256 | Public portfolio data |
| VC Portfolio (fund-level) | 40 | Fund sizes, vintages |
| Investor metadata (description, HQ, preferred_industry, check sizes) | All | Public fund profiles |

### 🟡 MODIFY — Keep Structure, Reset Values

| Field | Current | Community Default |
|-------|---------|-------------------|
| `investors.stage` | Mixed (Lead/closed/verbal_commit/etc.) | All → `'Lead'` |
| `investors.fit_score` | Papr-specific scores (0-100) | All → `null` |
| `investors.fit_breakdown` | JSON with Papr thesis match | All → `null` |
| `investors.thesis_alignment_score` | Papr-specific | All → `null` |
| `investors.adjusted_fit_score` | Papr-specific | All → `null` |
| `investors.portfolio_status` | Papr-specific overlap | All → `null` |
| `investors.invested_amount` | Papr-specific | All → `0` |
| `investors.committed_amount` | Papr-specific | All → `0` |
| `investors.notes` | Papr-specific notes | All → `''` |
| `investors.investor_status` | Papr-specific | All → `null` |
| `investors.attio_record_id` | Papr CRM integration | All → `null` |
| `investors.passcode` | Papr-specific | All → `null` |

### 🔵 SEED — Fake Example Data

Create a fictional company **"NovaMind AI"** for the template:

```
Company: NovaMind AI
Tagline: "AI-powered knowledge graphs for enterprise"
Stage: Pre-Seed
Category: Enterprise AI / Knowledge Management
Founded: 2025
HQ: San Francisco, CA

Founders:
- Alex Chen, CEO (ex-Google AI)
- Sarah Kim, CTO (ex-Meta Research)
- James Park, COO (ex-McKinsey)

Raising: $3M Pre-Seed
Committed: $0 (starting fresh)

Sections: Product & Demo, Market & Moat, GTM, Financials, FAQ
Documents: Template versions of each with [EDIT ME] placeholders
```

**Fake ICP data** based on NovaMind:
- Target: Enterprise knowledge management teams
- Filters: "Knowledge Graph in Stack", "50-500 employees", "Series A+"

**Fake thesis match scores** (seeded for ~10 VCs so user sees how it works):
- Show 3-4 VCs with high match (75-90), rest at 0/null
- Breakdown shows how scoring works as example

---

## 3. Onboarding Experience

### Philosophy
> **Chat-first, not click-first.** Users customize their data room by talking to Pen in chat. The UI has inline edit buttons for quick tweaks, but the primary flow is conversational.

### Onboarding Flow

#### Step 1: Welcome Screen (first launch)
When the app loads with empty/template data, show an onboarding overlay:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│     🚀 Welcome to your Data Room                 │
│                                                  │
│  You're looking at a template data room          │
│  pre-loaded with example data for "NovaMind AI"  │
│                                                  │
│  To make it yours:                               │
│                                                  │
│  1. Tell Pen about your company                  │
│     "Set up my data room for [Company Name]"     │
│                                                  │
│  2. Pen will populate your sections              │
│     Company info, team, documents, FAQ           │
│                                                  │
│  3. Fine-tune with inline edits                  │
│     Click ✏️ on any section to edit directly      │
│                                                  │
│  4. Share with investors                         │
│     Generate unique links per VC                 │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Open Chat & Get Started                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Or explore the template first →                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Step 2: Chat-Guided Setup
Pen guides the user through setup via conversation:

```
Pen: "Let's set up your data room! Tell me:
      1. Company name
      2. One-line tagline
      3. What you're building (2-3 sentences)
      4. Your founding team (names + titles)
      5. What round are you raising? How much?"

User: "We're Acme Labs, building AI-powered supply chain..."

Pen: "Got it! I've set up your company profile.
      Now let's fill in the sections..."
```

**Chat commands the user learns:**
| What they say | What happens |
|---------------|-------------|
| "Set up my data room for [Company]" | Full guided setup |
| "Update my company tagline to..." | Updates company_info |
| "Add [Name] as CTO to the team" | Adds team member |
| "Upload my pitch deck" | Processes and embeds deck |
| "Generate a link for Sequoia" | Creates investor_link token |
| "Add intro path: [Person] at [VC] via [Connector]" | Creates intro_pathway |
| "Run VC fit scoring" | Triggers VC Fit Score Calculator job |
| "Publish my data room" | Triggers Publish job → Vercel deploy |

#### Step 3: Progressive Disclosure
- Template data has `[EDIT ME]` markers in document content
- Sections show a subtle "Template data — customize via chat" badge
- After user replaces company info, badge disappears
- Investor section works immediately (real VC data, just no scores yet)

### Onboarding for Specific Features

**Investors Tab:**
> Already populated with 1,062 real VCs. User sees them all in "Lead" stage.
> Prompt: "Ask Pen to run VC Fit Scoring to see which VCs match your company."
> After scoring: VCs get fit scores, sorted by relevance.

**Intros Tab:**
> Empty by default. Show an empty state:
> "No intro pathways yet. To add intros, tell Pen:
> 'Add intro path: [Person Name] at [VC Name], connected via [Connector Name]'"
> Or: "Paste your intro spreadsheet and I'll import it."

**Connectors:**
> Empty by default. Show empty state:
> "Connectors are people who help you get warm intros to VCs.
> Tell Pen: 'Add [Name] as a connector' to get started."

---

## 4. Liquid Glass Design System — Data Room Patterns

### Foundation (from Paprwork Design System)

```css
/* ── Color Tokens ── */
--bg:            #050a12;           /* Deep navy base */
--surface:       rgba(255,255,255,0.03);  /* Glass panel */
--surface-hover: rgba(255,255,255,0.06);  /* Glass hover */
--border:        rgba(255,255,255,0.08);  /* Subtle edges */
--text:          rgba(255,255,255,0.92);  /* Primary text */
--text-secondary:rgba(255,255,255,0.55);  /* Muted text */
--accent:        #6C8EEF;           /* Action blue */
--accent-glow:   rgba(108,142,239,0.15);  /* Glow behind accent */
--success:       #34d399;           /* Green — high score */
--warning:       #fbbf24;           /* Yellow — mid score */
--muted:         #9ca3af;           /* Gray — low/null */
--danger:        #ef4444;           /* Red — errors */

/* ── Glass Surface ── */
.glass {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  backdrop-filter: blur(24px);
}

/* ── Typography ── */
--font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Inter', sans-serif;
--font-mono: 'SF Mono', 'Fira Code', monospace;

/* Scale: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 */
```

### Data Room Component Patterns

#### 1. Section Card (Documents Panel)
```
┌─────────────────────────────────────────┐  ← glass surface
│ 📄 Section Icon    Section Name         │  ← section-header
│─────────────────────────────────────────│
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  ← doc-grid
│ │ Doc Card │ │ Doc Card │ │ Doc Card│   │
│ │ name     │ │ name     │ │ name    │   │
│ │ type pill │ │ type pill│ │ type    │   │
│ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```
- Glass card with `border-radius: 14px`
- Section icon: SVG only (no emoji), 18×18
- Doc cards: `border-radius: 10px`, hover → `surface-hover`
- Type pill: small tag (PDF/Text/Link), `font-size: 11px`

#### 2. Investor Row (Accordion)
```
┌─────────────────────────────────────────┐
│ [Logo] Fund Name         Fit: 85%  ▶    │  ← inv-row glass
│─────────────────────────────────────────│
│ │ [Photo] Partner Name                  │  ← inv-expand (hidden)
│ │         Title · LinkedIn              │
│ │         [Request Intro]               │
│ │                                       │
│ │ [Photo] Partner Name                  │
│ │         Title · LinkedIn              │
│ │         [Request Intro]               │
│ └───────────────────────────────────────│
└─────────────────────────────────────────┘
```
- Row: `inv-row glass` — clickable accordion
- Fit pill: color-coded (green ≥55, yellow ≥45, gray <45)
- Partner photos: 36×36 circle, fallback to initials (blue circle)
- Expand animation: `max-height` transition, 300ms ease
- "Request Intro" button: ghost style, accent border

#### 3. Hero Banner
```
┌─────────────────────────────────────────────────┐
│  [Company Logo - dark/light variants]            │
│  Company Tagline                                 │
│  Company Overview (2-3 lines)                    │
│  [Website] [LinkedIn]                ← link-pill │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Raising $3M · Pre-Seed · Q2 2025        │   │  ← raise-bar
│  │ ████████░░░░░░░░░  $500K / $3M          │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```
- Full-width, no border-radius on top
- Logo: `window.COMPANY_LOGO_DARK` / `_LIGHT` (configurable)
- Raise bar: gradient fill, animated on load
- Link pills: `border-radius: 20px`, ghost style

#### 4. Tab Navigation
```
[Data Room]  [Investors (52)]  [Intros (26)]
────────────────────────────────────────────
```
- Horizontal tabs, `font-size: 13px`, `font-weight: 600`
- Active: `border-bottom: 2px solid var(--accent)`
- Count badges: `(N)` in tab label
- Content lazy-loaded on tab click (not pre-rendered)

#### 5. Onboarding Overlay (NEW)
```
┌─────────────────────────────────────────────┐
│ glass surface, centered, max-width: 520px   │
│ border-radius: 18px                         │
│ backdrop-filter: blur(32px)                 │
│                                             │
│ Heading: 22px, font-weight: 700             │
│ Body: 14px, line-height: 1.6                │
│ Steps: numbered list, 16px spacing          │
│                                             │
│ CTA button: accent bg, white text           │
│   border-radius: 10px, padding: 12px 28px   │
│   hover: brightness(1.1)                    │
│                                             │
│ Skip link: text-secondary, underline        │
└─────────────────────────────────────────────┘
```

#### 6. Empty State Pattern (NEW)
```
┌─────────────────────────────────────────┐
│         [Subtle SVG illustration]        │
│                                          │
│   No [items] yet                         │  ← 18px, semi-bold
│                                          │
│   [Instructional text explaining         │  ← 14px, text-secondary
│    how to add items via chat]            │
│                                          │
│   💬 "Add [item]: ..."                   │  ← code-style prompt
│                                          │
└─────────────────────────────────────────┘
```
- Center-aligned, `padding: 48px 32px`
- Chat prompt in monospace, `background: rgba(108,142,239,0.08)`
- No emoji — use subtle SVG icon only

### Design Rules for Future Changes

1. **No emoji in UI** — SVG icons only, Material Design language
2. **Glass surfaces** — every card/panel uses `var(--surface)` + `backdrop-filter`
3. **14px base** — body text is 14px, secondary is 13px, headings 18-28px
4. **Border-radius scale** — pills: 20px, cards: 14px, buttons: 10px, inputs: 8px
5. **Color-coded scores** — green (#34d399) ≥55%, yellow (#fbbf24) ≥45%, gray (#9ca3af) below
6. **Hover = lighter** — `surface-hover` on interactive elements
7. **Transitions** — 200ms ease for hover, 300ms for expand/collapse
8. **Dark-only** — no light mode toggle (deep navy background always)
9. **Mobile-responsive** — single column below 768px, tabs become scrollable
10. **Loading states** — skeleton shimmer (`@keyframes shimmer`), never empty flash

---

## 5. Required Code Refactors

### Priority 1: Make Hardcoded Values Dynamic (5 files)

#### 5.1 `intros-vc-card.js` — Hardcoded CC emails
```javascript
// BEFORE (line ~20):
var ml = 'mailto:?cc=shawkat%40papr.ai%2Camir%40papr.ai&subject=...'

// AFTER: Read from company_info or config
var founders = await dbQuery("SELECT email FROM config WHERE key='founder_emails'");
var cc = founders.length ? founders[0].email : '';
var ml = 'mailto:?cc=' + encodeURIComponent(cc) + '&subject=...'
```
**Effort:** Small — 1 function change

#### 5.2 `inv-share.js` / `inv-add-person.js` — Hardcoded domain
```javascript
// BEFORE:
var base = 'https://dataroom.papr.ai';

// AFTER: Read from config
var domainRow = await dbQuery("SELECT value FROM config WHERE key='deploy_domain'");
var base = domainRow.length ? domainRow[0].value : 'https://your-dataroom.vercel.app';
```
**Effort:** Small — 2 files, 1 line each

#### 5.3 `logos.js` — Papr SVG wordmarks
```javascript
// BEFORE: Hardcoded Papr SVG paths
window.PAPR_LOGO_DARK = '<svg>...Papr wordmark...</svg>';
window.PAPR_LOGO_LIGHT = '<svg>...Papr wordmark...</svg>';

// AFTER: Load from company_info or config
// Rename to COMPANY_LOGO_DARK / COMPANY_LOGO_LIGHT
// DB Setup job stores user's logo SVG in config table
// Default: show company name as text fallback
```
**Effort:** Medium — need to update `logos.js` + `app.js` + `connector-room.js` + `components.js`

#### 5.4 `icp-data.js` — Hardcoded ICP for Papr
```javascript
// BEFORE: Static window.ICP_DATA with Papr-specific filters
// AFTER: Load from DB (already partially done — merges DB overrides)
// Just need to change the DEFAULTS to generic template data
```
**Effort:** Small — change default values only

#### 5.5 `demos.js` — Product demos
```javascript
// Currently loads Papr-specific demo videos/links
// AFTER: Load from config table, show empty state if none
```
**Effort:** Small

### Priority 2: DB Setup Job Modifications (1 job)

#### `Data Room DB Setup` (b6d2f0ea)
Modify the seed data script to insert NovaMind AI template data instead of Papr data:

```python
# Changes needed in the setup job:
# 1. company_info → NovaMind AI template
# 2. sections → same 5 sections (structure preserved)
# 3. documents → template content with [EDIT ME] markers
# 4. team_members → 3 fake founders
# 5. faq → generic startup FAQ template
# 6. raise_tracker → example $3M pre-seed
# 7. investors → KEEP all 1,062 VCs, but:
#    - Reset stage → 'Lead' for all
#    - Null out fit_score, fit_breakdown, thesis_alignment_score
#    - Zero out invested_amount, committed_amount
#    - Clear notes, attio_record_id, passcode
# 8. vc_partners → KEEP as-is (public data)
# 9. vc_portfolio_companies → KEEP as-is (public data)
# 10. intro_pathways → CLEAR (empty, user adds own)
# 11. connectors → CLEAR (empty, user adds own)
# 12. customers → template examples
# 13. config → reset to defaults, add founder_emails + deploy_domain keys
# 14. investor_links → CLEAR (user generates own)
# 15. pitch_deck → CLEAR (user uploads own)
```

**Effort:** Medium — modify seed SQL, ~100 lines of changes

### Priority 3: Publish Job Modifications (1 job)

#### `Data Room Publish` (686d5ffa)
```python
# Changes needed:
# 1. Read deploy_domain from config instead of hardcoding dataroom.papr.ai
# 2. Read founder_emails from config for CC in intro mailto links
# 3. Pitch deck: handle missing deck gracefully (show upload prompt)
# 4. Logo: use COMPANY_LOGO_DARK/LIGHT instead of PAPR_LOGO
# 5. Remove Papr-specific pitch deck HTML file from bundle
```
**Effort:** Small — 5 string replacements in main.py

### Priority 4: Add Onboarding Component (1 new file)

#### `onboarding.js` (NEW)
```javascript
// Check if company_info still has template data
// If so, show the onboarding overlay
// After user completes setup via chat, overlay disappears
// Store onboarding_complete=true in config table
```
**Effort:** Medium — new 80-line JS file + CSS

### Priority 5: Add Empty States (modify 3 files)

#### `intros-vc-paths.js` — Empty intros state
```javascript
// When intro_pathways is empty, show:
// "No intro pathways yet. Tell Pen:
//  'Add intro path: [Person] at [VC] via [Connector]'"
```

#### `connector-room.js` — Empty connectors state
```javascript
// When no connectors exist, show empty state with instructions
```

#### `intros-investor.js` — Empty customer intros
```javascript
// When no customers, show prompt to add via chat
```

**Effort:** Small — add 15-20 lines per file

---

## 6. Bundle Structure

```
bundles/data-room-template/
├── manifest.json
├── README.md
├── apps/
│   └── b0a164c2/
│       ├── app.js, app.ts, style.css, ...  (all 60+ files)
│       ├── onboarding.js  (NEW)
│       └── logos.js  (modified — generic placeholder)
├── jobs/
│   ├── b6d2f0ea/  (DB Setup — modified seed data)
│   ├── 686d5ffa/  (Publish — modified for generic deploy)
│   ├── 0cb673e1/  (VC Fit Score Calculator)
│   ├── 5b59195c/  (VC Portfolio Intelligence Builder)
│   └── 631f1b5d/  (VC Portfolio Researcher)
└── .gitignore
```

### Requirements
```json
{
  "requirements": [
    {"name": "VERCEL_API_KEY", "description": "Vercel API key for deployment"},
    {"name": "OPENAI_API_KEY", "description": "For VC fit scoring (optional)"}
  ],
  "platform": ["macos"],
  "minPaprworkVersion": "1.0.0"
}
```

---

## 7. Implementation Checklist

### Phase 1: Data Scrubbing (do first)
- [ ] Create `seed-template-data.sql` with NovaMind AI fake company
- [ ] Write investor data scrub script (keep VCs, reset proprietary fields)
- [ ] Verify all 1,062 VCs + 2,434 partners + 8,256 portfolio cos preserved
- [ ] Verify all stages reset to 'Lead', scores nulled, amounts zeroed
- [ ] Create template documents with [EDIT ME] markers for each section
- [ ] Create template FAQ (generic startup questions)
- [ ] Create fake ICP data for NovaMind

### Phase 2: Code Refactors (5 files + 1 new)
- [ ] `intros-vc-card.js` — dynamic CC emails from config
- [ ] `inv-share.js` + `inv-add-person.js` — dynamic domain from config
- [ ] `logos.js` — rename to COMPANY_LOGO, use text fallback
- [ ] `icp-data.js` — generic default values
- [ ] `onboarding.js` — create onboarding overlay component
- [ ] Add empty states to intros-vc-paths.js, connector-room.js

### Phase 3: Job Modifications (2 jobs)
- [ ] `Data Room DB Setup` — modified seed with template data
- [ ] `Data Room Publish` — read config for domain/emails/logo

### Phase 4: Test & Export
- [ ] Test fresh install: onboarding shows, template data renders
- [ ] Test chat setup flow: "Set up my data room for Acme Labs"
- [ ] Test VC fit scoring with new company data
- [ ] Test publish to Vercel with new company
- [ ] Test investor link generation
- [ ] Export bundle with `export_app_bundle`
- [ ] Verify scrub removes databases/logs/personal data
- [ ] Write README with setup instructions

### Phase 5: Publish
- [ ] Fork `Papr-ai/paprwork-community-apps`
- [ ] Add bundle to `bundles/data-room-template/`
- [ ] Add entry to `registry.json`
- [ ] Open PR

---

## 8. Estimated Effort

| Phase | Files Changed | New Files | Estimated Work |
|-------|--------------|-----------|----------------|
| Data Scrubbing | 1 SQL script | 1 | 2-3 hours |
| Code Refactors | 5 JS files | 1 (onboarding.js) | 2-3 hours |
| Job Modifications | 2 Python files | 0 | 1-2 hours |
| Testing | 0 | 1 test script | 1-2 hours |
| Bundle & Publish | 0 | README + manifest | 1 hour |
| **Total** | **8 files** | **3 new** | **~8-10 hours** |

### Key Principle
> **Minimal refactoring.** The app is already well-structured. We're not rewriting — we're swapping ~200 lines of hardcoded Papr data for config-driven values, adding 1 onboarding component, and scrubbing the seed data. The entire Liquid Glass design system, investor rendering, and Vercel deployment pipeline ship as-is.
