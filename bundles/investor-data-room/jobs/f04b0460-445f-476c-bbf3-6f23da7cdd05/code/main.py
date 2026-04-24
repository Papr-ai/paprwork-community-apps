"""
Data Room Publish — Single Source of Truth Architecture

Instead of maintaining a separate Vercel template, this job:
1. Reads ALL CSS/JS files from the local mini-app
2. Replaces db.js with a static shim (reads from window.ROOM_DATA)
3. Bundles everything into one self-contained HTML
4. Deploys to Vercel with a thin token-validation wrapper

Result: Local app and Vercel investor view use IDENTICAL code.
"""

import sqlite3, json, os, sys, argparse, requests, base64, glob

parser = argparse.ArgumentParser()
parser.add_argument('--vercel-key', required=True)
args = parser.parse_args()

DB_PATH = os.path.expanduser("~/Papr/Jobs/5bebc6e1-7cbc-465b-a020-1f7e8dfcb63f/data/data.db")
APP_DIR = os.path.expanduser("~/PAPR/apps/ec08b938-ed25-4684-a93e-7157beac0d76")
APP_DB = os.path.join(APP_DIR, "database.db")
TEAM_ID = "team_PiNRym1Tdw3hjmQkAFxfzUrk"
# Dynamic project name from company in DB
import re as _re
def _get_project_name():
    try:
        import sqlite3 as _sq
        _c = _sq.connect(DB_PATH)
        name = _c.execute("SELECT name FROM company_info LIMIT 1").fetchone()[0]
        _c.close()
        # Slugify: "Sleep AI" → "sleep-ai-dataroom"
        slug = _re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        return slug + '-dataroom'
    except:
        return 'community-dataroom'

PROJECT = _get_project_name()
print(f"Vercel project: {PROJECT}")

# CSS files in order (matching index.html)
CSS_FILES = [
    "style.css",
    "publish.css", "style-panels.css", "fold.css", "fold-extra.css",
    "viewer.css", "demos.css", "faq.css", "intros.css", "memo.css",
    "deck.css", "deck-figma.css", "customers.css",
    "icp.css", "icp-edit.css", "edit-summary.css",
    "comp.css", "comp-edit2.css", "comp-mm.css",
    "moat.css", "moat-page2.css",
    "gtm.css", "gtm2.css",
    "fin.css", "fin2.css", "fin3.css", "fin-funds.css",
    "moat-edit2.css", "onepager.css", "vc-personalize.css", "inv-expand.css",
    "locked-section.css",
    "ctx-intel-style.css"
]

# JS files in order (matching index.html)
# db.js is replaced with the static shim
JS_FILES = [
    "hero-photos.js",          # Hero team photos base64
    "deck-slides-1.js",        # Pitch deck slides base64 (part 1)
    "deck-slides-2.js",        # Pitch deck slides base64 (part 2)
    "data.js",                 # Default data (sections, docs, pitch_deck URL)
    "data-customers.js",       # Customer data defaults
    "data-cases.js",           # Case study defaults
    "founders-photo.js",       # Founder photo base64
    # db.js is REPLACED with static shim (see below)
    "db-queries.js",           # DB query helpers
    "utils.js",                # Utility functions
    "logos.js",                # SVG wordmark logos
    "shawkat-b64.js",         # Shawkat's photo base64
    "icons.js",                # SVG icon registry
    "components.js",           # Shared render functions
    "share-mode.js",           # Share mode picker (pre/post-commit)
    "modals.js",               # Edit modals (founder only)
    "publish.js",              # Publish to Vercel
    "fold-sections.js",        # Fold section content
    "fold.js",                 # Fold init/nav
    "markdown.js",             # Markdown renderer
    "viewer.js",               # Shared viewer overlay
    "demos.js",                # Demo viewer
    "ctx-intel-data.js",       # Context Intelligence schema data
    "ctx-intel-viz.js",        # Context Intelligence graph visualization
    "onepager.js",             # One-pager viewer
    "rubric-data.js",           # Embedded rubric markdown for Vercel
    "rubric-dl.js",            # Deep problem definition viewer
    "blurb.js",                # Company blurb card
    "faq.js",                  # FAQ viewer
    "memo.js",                 # Investment memo
    "memo-viewer.js",          # Memo viewer/editor
    "icp-data.js",             # ICP default data
    "icp.js",                  # ICP viewer
    "icp-photo.js",            # ICP photo handler
    "icp-edit.js",             # ICP editor
    "icp-save.js",             # ICP save logic (V2 — all fields)
    "comp-logos.js",           # Competitor logos (base64 PNGs)
    "comp-data.js",            # Competitive analysis default data
    "comp.js",                 # Competitive analysis viewer
    "comp-edit.js",            # Competitive analysis editor
    "moat-data.js",            # Moat default data
    "moat-build.js",           # Moat helper functions (flywheel, layers, gaps)
    "moat-page2.js",           # Moat page 2 (dual moat)
    "moat.js",                 # Moat viewer
    "moat-pager.js",           # Moat page swipe logic
    "moat-visuals2.js",        # Moat canvas visuals (part 2)
    "moat-visuals.js",         # Moat canvas visuals (part 1)
    "moat-edit.js",            # Moat editor
    "moat-edit-save.js",       # Moat editor save logic
    "gtm-data.js",             # GTM default data
    "gtm-build.js",            # GTM section builders
    "gtm.js",                  # GTM viewer
    "gtm-edit.js",             # GTM editor
    "fin-data.js",             # Financial model default data
    "fin-rev.js",              # Revenue page builder
    "fin-md.js",               # Financial markdown builder
    "fin-chart.js",            # Revenue chart (canvas)
    "fin.js",                  # Financial model viewer
    "fin-unit.js",             # Unit economics page
    "fin-funds.js",            # Use of funds page
    "fin-pager.js",            # Financial page swipe logic
    "fin-edit.js",             # Financial editor
    "deck-data.js",            # Pitch deck data loader
    "deck-cards.js",           # Pitch deck platform cards
    "deck-ui.js",              # Pitch deck viewer UI
    "customers-data.js",       # Customer data loaders + charts
    "customers-pipeline.js",   # Pipeline + top customers
    "customers-view.js",       # Customer data viewer
    "edit-summary.js",         # Edit summary component
    "founder.js",              # Founder view render
    "intros.js",               # Founder intros tab
    "intros-investor.js",      # Investor intros tab
    "intros-cards.js",         # Portfolio card builders
    "intros-vc-paths.js",      # VC intro pathways for connector view
    "intros-vc-card.js",       # VC person card builder
    "vc-detail-card.js",       # Partner card + render detail page
    "vc-detail-events.js",     # Detail event bindings
    "vc-detail-share.js",      # Share connector logic
    "investor-events.js",      # Investor view event bindings
    "investors.js",            # Investors tab
    "inv-row-builder.js",      # Investor row builder (pcard, fit badge)
    "inv-photo-upload.js",     # Partner photo upload
    "vc-personalize.js",
    "connector-room.js",        # Connector room view       # Personalized VC banner
    "app.js",                  # App init (route by token)
]

def ensure_text(val):
    """Convert blob/bytes to text string."""
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    return val if val else ''

def load_room():
    """Extract all data from SQLite for baking into the deployment."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    company = dict(c.execute("SELECT * FROM company_info WHERE id='papr'").fetchone())
    raise_data = dict(c.execute("SELECT * FROM raise_tracker WHERE id='current'").fetchone())
    sections = [dict(r) for r in c.execute("SELECT * FROM sections ORDER BY sort_order").fetchall()]
    documents = [dict(r) for r in c.execute("SELECT * FROM documents ORDER BY section_id, sort_order").fetchall()]
    team = [dict(r) for r in c.execute("SELECT * FROM team_members ORDER BY sort_order").fetchall()]
    # Only include investors with active share links (not all 1000+) to stay under Vercel 10MB limit
    linked_ids = [r[0] for r in c.execute("SELECT DISTINCT investor_id FROM investor_links WHERE revoked=0").fetchall()]
    if linked_ids:
        placeholders = ','.join(['?'] * len(linked_ids))
        investors = [dict(r) for r in c.execute(f"SELECT * FROM investors WHERE id IN ({placeholders})", linked_ids).fetchall()]
    else:
        investors = []
    links = [dict(r) for r in c.execute("""
        SELECT il.*, i.name as fund_name, i.logo_url, i.fund_url, i.stage as inv_stage,
               vp.name as partner_name, vp.title as partner_title, vp.photo_url as partner_photo,
               vp.linkedin_url as partner_linkedin, vp.bio as partner_bio
        FROM investor_links il
        JOIN investors i ON il.investor_id = i.id
        LEFT JOIN vc_partners vp ON il.partner_id = vp.id
        WHERE il.revoked=0
    """).fetchall()]
    try:
        vc_portfolio = [dict(r) for r in c.execute("""
            SELECT vp.*, vc.name as partner_name FROM vc_portfolio vp
            LEFT JOIN vc_partners vc ON vp.partner_id = vc.id
            ORDER BY vp.icp_match_score DESC
        """).fetchall()]
    except:
        vc_portfolio = []
    # vc_partners — needed for VC intro enrichment (photos, LinkedIn) on investor view
    try:
        vc_partners_data = [dict(r) for r in c.execute("""
            SELECT id, name, title, linkedin_url, photo_url, investor_id, fund_name
            FROM vc_partners
            WHERE investor_id IN (SELECT DISTINCT investor_id FROM investor_links WHERE revoked=0)
        """).fetchall()]
    except:
        vc_partners_data = []

    # Fallback: read partner photos from app DB if Room Builder DB has none
    if os.path.exists(APP_DB):
        try:
            app_conn = sqlite3.connect(APP_DB)
            app_conn.row_factory = sqlite3.Row
            app_photos = {str(r['id']): r['partner_photo'] for r in
                app_conn.execute("SELECT id, partner_photo FROM vc_partners WHERE partner_photo IS NOT NULL AND partner_photo != ''").fetchall()}
            app_conn.close()
            # Merge photos into links
            for link in links:
                if not link.get('partner_photo') and link.get('partner_id'):
                    photo = app_photos.get(str(link['partner_id']))
                    if photo:
                        link['partner_photo'] = photo
                        print(f"  Photo synced from app DB for partner {link['partner_id']}")
        except Exception as e:
            print(f"  App DB photo fallback failed: {e}")
    try:
        demos = [dict(r) for r in c.execute("SELECT * FROM demos ORDER BY sort_order").fetchall()]
    except:
        demos = []
    try:
        op_row = c.execute("SELECT content FROM one_pager WHERE id='main'").fetchone()
        one_pager = ensure_text(op_row['content']) if op_row else ''
    except:
        one_pager = ''
    try:
        faq_raw = [dict(r) for r in c.execute("SELECT * FROM faq ORDER BY sort_order").fetchall()]
        faq = [{k: ensure_text(v) if isinstance(v, bytes) else v for k, v in r.items()} for r in faq_raw]
    except:
        faq = []
    try:
        im_row = c.execute("SELECT content FROM investment_memo WHERE id='main'").fetchone()
        investment_memo = ensure_text(im_row['content']) if im_row else ''

        # Pitch deck URL
        try:
            dk_row = c.execute("SELECT * FROM pitch_deck WHERE id=1").fetchone()
            pitch_deck = dict(dk_row) if dk_row else {}
        except:
            pitch_deck = {}
    except:
        investment_memo = ''
    try:
        icp = dict(c.execute("SELECT * FROM icp_criteria WHERE id=1").fetchone() or {})
    except:
        icp = {}
    # ICP viewer data (with photos) stored in config
    try:
        icp_view_row = c.execute("SELECT value FROM config WHERE key='icp_view_data'").fetchone()
        icp_view_data = json.loads(icp_view_row['value']) if icp_view_row else None
        # Reassemble chunked photos if present
        if icp_view_data:
            chunks_row = c.execute("SELECT value FROM config WHERE key='icp_photo_chunks'").fetchone()
            if chunks_row:
                chunks_meta = json.loads(chunks_row['value'])
                for key, prefix, count_key in [('backgroundPhoto','icp_bg_','bg'), ('profilePhoto','icp_pf_','pf')]:
                    n = chunks_meta.get(count_key, 0)
                    if n > 0:
                        parts = []
                        for i in range(n):
                            r = c.execute(f"SELECT value FROM config WHERE key='{prefix}{i}'").fetchone()
                            if r: parts.append(r['value'])
                        if parts:
                            icp_view_data[key] = ''.join(parts)
            # If photos are already inline (non-chunked), keep them
            print(f"  ICP: bg={len(icp_view_data.get('backgroundPhoto',''))} pf={len(icp_view_data.get('profilePhoto',''))}")
    except Exception as e:
        print(f"  ICP load error: {e}")
        icp_view_data = None
    # Calendly URL for verbal-commit unlock CTA on pre-commit VC links
    try:
        cal_row = c.execute("SELECT value FROM config WHERE key='calendly_url'").fetchone()
        calendly_url = cal_row['value'] if cal_row else ''
    except:
        calendly_url = ''
    try:
        intro_contacts = [dict(r) for r in c.execute("SELECT * FROM intro_contacts ORDER BY match_score DESC").fetchall()]
    except:
        intro_contacts = []
    try:
        intros = [dict(r) for r in c.execute("""
            SELECT i.*, c.name as contact_name, c.title, c.company,
                   inv.name as fund_name
            FROM intros i
            JOIN intro_contacts c ON i.contact_id=c.id
            JOIN investors inv ON i.investor_id=inv.id
            ORDER BY i.sent_at DESC
        """).fetchall()]
    except:
        intros = []
    try:
        intro_stats = [dict(r) for r in c.execute("""
            SELECT inv.name as fund_name, inv.id as investor_id,
                   COUNT(i.id) as intro_count
            FROM investors inv LEFT JOIN intros i ON inv.id=i.investor_id
            GROUP BY inv.id ORDER BY intro_count DESC
        """).fetchall()]
    except:
        intro_stats = []
    try:
        revenue_history = [dict(r) for r in c.execute("SELECT * FROM revenue_history ORDER BY month").fetchall()]
    except:
        revenue_history = []
    try:
        customers = [dict(r) for r in c.execute("SELECT * FROM customers WHERE mrr > 0 ORDER BY mrr DESC").fetchall()]
    except:
        customers = []
    try:
        pipeline = [dict(r) for r in c.execute("SELECT * FROM pipeline ORDER BY value DESC").fetchall()]
    except:
        pipeline = []
    try:
        case_studies = [dict(r) for r in c.execute("SELECT * FROM case_studies ORDER BY sort_order").fetchall()]
    except:
        case_studies = []
    try:
        vc_intro_paths = [dict(r) for r in c.execute("""
            SELECT ip.connector_id, ip.investor_id, ip.investor_name, ip.pathway_type,
                   ip.via_person, ip.confidence, ip.intro_quality, ip.partner_id,
                   COALESCE(vp.linkedin_url, ip.via_person_linkedin) as via_person_linkedin,
                   COALESCE(vp.title, ip.via_person_title) as via_person_title,
                   vp.photo_url as via_person_photo,
                   i.logo_url as vc_logo, i.fit_score as vc_fit
            FROM intro_pathways ip
            JOIN investors i ON i.id = ip.investor_id
            LEFT JOIN vc_partners vp ON vp.id = ip.partner_id
            WHERE ip.via_person != ''
            ORDER BY ip.connector_id, i.fit_score DESC
        """).fetchall()]
    except:
        vc_intro_paths = []
    try:
        connectors = [dict(r) for r in c.execute("""
            SELECT id, name, title, company, intro_quality_tier, vc_reach_count, photo_url, share_token
            FROM connectors WHERE is_curated=1 ORDER BY intro_score DESC
        """).fetchall()]
        # Strip large photo data for payload size
        for cn in connectors:
            if cn.get('photo_url') and len(cn['photo_url']) > 100:
                cn['photo_url'] = ''
    except:
        connectors = []
    # Read blurb BEFORE closing connection (cursor dies after conn.close())
    blurb = _load_setting(c, "blurb")
    conn.close()
    return {
        "company": company, "raise": raise_data, "sections": sections,
        "documents": documents, "team": team, "investors": investors,
        "links": links, "demos": demos, "one_pager": one_pager, "faq": faq,
        "icp": icp, "intro_contacts": intro_contacts,
        "intros": intros, "intro_stats": intro_stats,
        "investment_memo": investment_memo, "pitch_deck": pitch_deck,
        "revenue_history": revenue_history, "customers": customers,
        "pipeline": pipeline, "case_studies": case_studies,
        "vc_portfolio": vc_portfolio,
        "vc_partners": vc_partners_data,
        "icp_view_data": icp_view_data,
        "vc_intro_paths": vc_intro_paths,
        "connectors": connectors,
        "calendly_url": calendly_url,
        "blurb": blurb
    }

def read_app_file(name):
    """Read a file from the mini-app directory."""
    path = os.path.join(APP_DIR, name)
    if not os.path.exists(path):
        print(f"   ⚠ Missing: {name}")
        return ""
    with open(path, encoding='utf-8') as f:
        return f.read()

def build_db_static_shim():
    """
    Generate db-static.js — replaces db.js for Vercel.
    All load* functions read from window.ROOM_DATA instead of SQLite.
    dbWrite is a no-op. dbQuery simulates basic queries.
    """
    return """
// db-static.js — Static data shim for Vercel deployment
// Replaces db.js: reads from window.ROOM_DATA instead of SQLite
var ROOM_DATA = window.ROOM_DATA || {};
var ROOM_LINK = window.ROOM_LINK || null;
var APP_ID = 'b0a164c2-cfe0-415f-88d1-de867d96d337';

async function dbQuery(sql, params) {
  var s = sql.toLowerCase();
  if (s.indexOf('vc_portfolio') >= 0 && params && params[0]) {
    return (ROOM_DATA.vc_portfolio || []).filter(function(p) { return String(p.partner_id) === String(params[0]); }).sort(function(a,b){ return (b.verified||0)-(a.verified||0) || (b.icp_match_score||0)-(a.icp_match_score||0); });
  }
  if (s.indexOf('vc_partners') >= 0) {
    var vps = ROOM_DATA.vc_partners || [];
    if (params && params.length > 0) return vps.filter(function(v) { return params.indexOf(v.id) >= 0; });
    return vps;
  }
  if (s.indexOf('intro_contacts') >= 0) {
    if (params && params[0]) return (ROOM_DATA.intro_contacts || []).filter(function(c) { return c.investor_id == params[0]; });
    return ROOM_DATA.intro_contacts || [];
  }
  if (s.indexOf('intros') >= 0 && s.indexOf('intro_contacts') < 0 && s.indexOf('intro_stats') < 0) {
    if (params && params[0]) return (ROOM_DATA.intros || []).filter(function(i) { return i.investor_id == params[0]; });
    return ROOM_DATA.intros || [];
  }
  if (s.indexOf('intro_pathways') >= 0) {
    var paths = ROOM_DATA.vc_intro_paths || [];
    if (params && params[0]) return paths.filter(function(p) { return p.connector_id == params[0]; });
    return paths;
  }
  if (s.indexOf('connectors') >= 0) return ROOM_DATA.connectors || [];
  if (s.indexOf('settings') >= 0) {
    if (params && params[0] === 'blurb') return ROOM_DATA.blurb ? [{value: ROOM_DATA.blurb}] : [];
    return [];
  }
  if (s.indexOf('config') >= 0) return [];
  return [];
}
async function dbWrite(sql, params) { return {}; }

async function loadCompany() { return ROOM_DATA.company || {}; }
async function loadRaise() { return ROOM_DATA.raise || {}; }
async function loadSections() { return ROOM_DATA.sections || []; }
async function loadDocs(sectionId) {
  return (ROOM_DATA.documents || []).filter(function(d) { return d.section_id === sectionId; });
}
async function loadAllDocs() { return ROOM_DATA.documents || []; }
async function loadTeam() { return ROOM_DATA.team || []; }
async function loadInvestors() { return ROOM_DATA.investors || []; }
async function loadInvestorLinks(investorId) { return []; }
async function loadVercelUrl() { return null; }
async function loadDemos() { return ROOM_DATA.demos || []; }
async function loadDeck() { return ROOM_DATA.pitch_deck || null; }
async function loadOnePager() { return ROOM_DATA.one_pager || ''; }
async function loadICP() { return ROOM_DATA.icp || {}; }
async function loadIntroContacts(investorId) {
  // Show all ICP-matched contacts to every investor
  return ROOM_DATA.intro_contacts || [];
}
async function loadIntros(investorId) {
  var all = ROOM_DATA.intros || [];
  if (investorId) return all.filter(function(i){ return i.investor_id === investorId; });
  return all;
}
async function loadIntroStats() { return ROOM_DATA.intro_stats || []; }
async function loadFAQ() { return ROOM_DATA.faq || []; }
async function loadMemo() { return ROOM_DATA.investment_memo || ""; }
async function loadRevenueHistory() { return ROOM_DATA.revenue_history || []; }
async function loadCustomers() { return ROOM_DATA.customers || []; }
async function loadPipeline() { return ROOM_DATA.pipeline || []; }
async function loadCaseStudies() { return ROOM_DATA.case_studies || []; }

function esc(s) {
  if (!s) return '';
  var t = String(s);
  t = t.replace(/&/g, '&amp;');
  t = t.replace(/</g, '&lt;');
  t = t.replace(/>/g, '&gt;');
  return t;
}
function fmt(n) {
  if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
  return '$' + n;
}
"""

def _load_setting(cursor, key):
    try:
        row = cursor.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return dict(row)["value"] if row else ""
    except:
        return ""
def build_html(room_data):
    """Bundle all CSS and JS into a single self-contained HTML page."""
    # Collect CSS
    all_css = ""
    for name in CSS_FILES:
        css = read_app_file(name)
        if css:
            all_css += f"\n/* === {name} === */\n{css}\n"

    # Collect JS — replace db.js with static shim
    # Inject saved ICP overrides — icp-data.js will merge these on top of defaults
    all_js = ""
    if room.get('icp_view_data'):
        icp_json = json.dumps(room["icp_view_data"])
        all_js += "\nwindow._ICP_DB_OVERRIDES = " + icp_json + ";\n"
    for name in JS_FILES:
        js = read_app_file(name)
        if js:
            all_js += f"\n// === {name} ===\n{js}\n"

    # The static data shim
    db_shim = build_db_static_shim()

    # Baked data
    data_json = json.dumps(room_data, default=str)

    # Agent-friendly structured data
    c = room_data.get("company", {})
    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": c.get("name", "Papr"),
        "description": c.get("overview", ""),
        "url": c.get("website", ""),
        "foundingDate": "2024",
        "founder": [{"@type": "Person", "name": m.get("name","")} for m in room_data.get("team", [])],
        "sameAs": [x for x in [c.get("linkedin",""), c.get("substack","")] if x]
    }, indent=2)
    faq_items = room_data.get("faq", [])
    faq_text = "".join(f"<h3>{q.get('question','')}</h3><p>{q.get('answer','')[:200]}...</p>" for q in faq_items)
    one_pager_text = (room_data.get("one_pager", "") or "")[:2000]
    company_name = c.get("name", "Papr")
    company_tagline = c.get("tagline", "")
    company_overview = c.get("overview", "")
    company_website = c.get("website", "")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Papr · Data Room</title>
  <meta name="description" content="Papr, Inc. — Context Intelligence Infrastructure. Predictive Memory and Holographic Neural Embeddings for AI agents.">
  <meta name="robots" content="noindex">
  <meta property="og:title" content="Papr · Investor Data Room">
  <meta property="og:description" content="Context Intelligence Infrastructure — Predictive Memory for AI Agents">
  <meta property="og:type" content="website">
  <style>{all_css}</style>
__POSTHOG_SDK__
</head>
<body>
  <div id="app"></div>
  <!-- Agent-readable: structured data for AI assistants -->
  <script type="application/ld+json">
  {json_ld}
  </script>
  <noscript>
  <article itemscope itemtype="https://schema.org/Organization">
    <h1 itemprop="name">{company_name}</h1>
    <p itemprop="description">{company_overview}</p>
    <p>Tagline: {company_tagline}</p>
    <p>Website: {company_website}</p>
    <section><h2>One-Pager</h2><div>{one_pager_text}</div></section>
    <section><h2>FAQ</h2>{faq_text}</section>
  </article>
  </noscript>
  <script>
    window.ROOM_DATA = {data_json};
    window.ROOM_LINK = null; // Set by serverless function
  </script>
  <script>{db_shim}</script>
  <script>{all_js}</script>
  __POSTHOG_TRACK__
</body>
</html>"""
    # Inject PostHog SDK + tracking (outside f-string to avoid curly brace conflicts)
    posthog_sdk = open(os.path.join(os.path.dirname(__file__), 'posthog_snippet.html'), 'r').read()
    posthog_track = open(os.path.join(os.path.dirname(__file__), 'posthog_track.js'), 'r').read()
    html = html.replace('__POSTHOG_SDK__', posthog_sdk)
    html = html.replace('__POSTHOG_TRACK__', '<script>' + posthog_track + '</script>')
    return html

def build_serverless_function(html_content):
    """
    Thin Vercel serverless function:
    - Validates token from query param
    - Reads static HTML from filesystem
    - Injects ROOM_LINK data (for investors) or ROOM_CONNECTOR data (for connectors)
    - Serves the page
    """
    room = load_room()
    links_by_token = {}
    for link in room['links']:
        links_by_token[link['token']] = {
            'fund_name': link.get('fund_name', ''),
            'logo_url': link.get('logo_url', ''),
            'fund_url': link.get('fund_url', ''),
            'investor_id': link.get('investor_id', ''),
            'sections_visible': link.get('sections_visible', '[]'),
            'token': link['token'],
            'inv_stage': link.get('inv_stage', 'intro'),
            'partner_id': link.get('partner_id', ''),
            'partner_name': link.get('partner_name', ''),
            'partner_title': link.get('partner_title', ''),
            'partner_photo': link.get('partner_photo', ''),
            'partner_linkedin': link.get('partner_linkedin', ''),
            'partner_bio': link.get('partner_bio', ''),
            'commit_mode': link.get('commit_mode', 'pre_commit')
        }
    # Build connector tokens map — re-query DB for photos (they get stripped from room data)
    connectors_by_token = {}
    try:
        import sqlite3 as _sq
        _cdb = _sq.connect(DB_PATH)
        _cdb.row_factory = _sq.Row
        _crows = _cdb.execute("SELECT id, name, title, company, photo_url, share_token FROM connectors WHERE share_token IS NOT NULL AND share_token != ''").fetchall()
        for _cr in _crows:
            connectors_by_token[_cr['share_token']] = {
                'id': _cr['id'],
                'name': _cr['name'] or '',
                'title': _cr['title'] or '',
                'company': _cr['company'] or '',
                'photo_url': _cr['photo_url'] or '',
                'share_token': _cr['share_token'],
                'is_connector': True
            }
        _cdb.close()
    except Exception as e:
        print(f"  ⚠ Connector photo query failed: {e}")
        for cn in room.get('connectors', []):
            if cn.get('share_token'):
                connectors_by_token[cn['share_token']] = {
                    'id': cn['id'], 'name': cn.get('name',''), 'title': cn.get('title',''),
                    'company': cn.get('company',''), 'photo_url': cn.get('photo_url',''),
                    'share_token': cn['share_token'], 'is_connector': True
                }
    
    links_json = json.dumps(links_by_token, default=str)
    connectors_json = json.dumps(connectors_by_token, default=str)
    
    return f"""
const fs = require('fs');
const path = require('path');
const LINKS = {links_json};
const CONNECTORS = {connectors_json};

module.exports = function(req, res) {{
  const token = req.query.token || '';
  
  if (!token) {{
    return res.status(200).send(landing());
  }}
  
  // Check connector tokens first
  const connector = CONNECTORS[token];
  if (connector) {{
    const htmlPath = path.join(__dirname, '..', 'public', 'room.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // Inject connector as ROOM_LINK with connector flag
    const connData = JSON.stringify(connector);
    html = html.replace(
      'window.ROOM_LINK = null; // Set by serverless function',
      'window.ROOM_LINK = ' + connData + ';'
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).send(html);
  }}
  
  const link = LINKS[token];
  if (!link) {{
    return res.status(403).send(errorPage('Access Denied', 'Invalid or expired link'));
  }}
  
  // Read the static HTML file
  const htmlPath = path.join(__dirname, '..', 'public', 'room.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Inject the link data
  const linkData = JSON.stringify(link);
  html = html.replace(
    'window.ROOM_LINK = null; // Set by serverless function',
    'window.ROOM_LINK = ' + linkData + ';'
  );
  
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  return res.status(200).send(html);
}};

function landing() {{
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Papr Data Room</title>' +
    '<style>body{{font-family:-apple-system,sans-serif;background:#050a12;color:rgba(255,255,255,.92);' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}}' +
    'h1{{font-size:32px;font-weight:700;margin-bottom:8px}}p{{color:rgba(255,255,255,.5);font-size:16px}}</style></head>' +
    '<body><div><h1>Papr</h1><p>Data Room</p></div></body></html>';
}}

function errorPage(title, msg) {{
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Papr Data Room</title>' +
    '<style>body{{font-family:-apple-system,sans-serif;background:#050a12;color:rgba(255,255,255,.92);' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}}' +
    'h2{{font-size:24px;margin-bottom:8px}}p{{color:rgba(255,255,255,.5)}}</style></head>' +
    '<body><div><h2>' + title + '</h2><p>' + msg + '</p></div></body></html>';
}}
"""


def deploy(vercel_key, function_js, html_content):
    """Deploy to Vercel using SHA-based file upload (handles large files)."""
    import hashlib
    headers = {"Authorization": f"Bearer {vercel_key}"}

    # Negative-lookahead so /deck.html, /deck-print.html, /assets/* are served
    # as static files instead of being routed to the serverless function.
    vercel_json_str = json.dumps({
        "rewrites": [{"source": "/((?!deck\\.html$|deck-print\\.html$|assets/).*)", "destination": "/api/room"}],
        "headers": [
            # Deck: allow framing from Paprwork localhost + dataroom.papr.ai (no X-Frame-Options → CSP wins)
            {"source": "/deck.html", "headers": [
                {"key": "Content-Security-Policy", "value": "frame-ancestors 'self' http://localhost:* https://dataroom.papr.ai https://*.vercel.app"},
                {"key": "X-Content-Type-Options", "value": "nosniff"},
                {"key": "Cache-Control", "value": "public, max-age=300"}
            ]},
            # Everything else: no framing, no caching (token-gated content)
            {"source": "/((?!deck\\.html$).*)", "headers": [
                {"key": "X-Frame-Options", "value": "DENY"},
                {"key": "X-Content-Type-Options", "value": "nosniff"},
                {"key": "Cache-Control", "value": "no-store, no-cache, must-revalidate"},
                {"key": "Pragma", "value": "no-cache"}
            ]}
        ]
    })
    pkg_json = '{"name":"papr-dataroom","private":true}'

    # Prepare all files with their SHA1 hashes
    files_data = {
        "api/room.js": function_js.encode('utf-8'),
        "public/room.html": html_content.encode('utf-8'),
        "vercel.json": vercel_json_str.encode('utf-8'),
        "package.json": pkg_json.encode('utf-8')
    }

    # Add pitch deck (Papr Deck.html — uses external assets/ folder) at /deck.html
    deck_path = os.path.join(os.path.dirname(__file__), "pitch_deck", "Papr Deck.html")
    if os.path.exists(deck_path):
        with open(deck_path, 'rb') as f:
            deck_bytes = f.read()
            dark_inject = b'<style>body{background:var(--bg)!important;color:var(--ink)!important;transition:background 0.2s ease}</style><script>(function(){function setTheme(t){var de=document.documentElement;var b=document.body;if(t==="dark"){de.classList.add("dark");if(b)b.classList.add("dark");}else{de.classList.remove("dark");if(b)b.classList.remove("dark");}}var p=new URLSearchParams(window.location.search);var urlTheme=p.get("theme");if(urlTheme==="dark"||urlTheme==="light"){setTheme(urlTheme);}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches){setTheme("dark");}window.addEventListener("message",function(e){if(e.data&&(e.data.theme==="dark"||e.data.theme==="light"))setTheme(e.data.theme);});})()</script>'
            deck_bytes = deck_bytes.replace(b'</head>', dark_inject + b'\n</head>')
            files_data["public/deck.html"] = deck_bytes
        print(f"   ✓ Pitch deck loaded: {len(files_data['public/deck.html']):,} bytes")
    else:
        print(f"   ⚠ Pitch deck not found at {deck_path}")

    # Upload deck-stage.js (web component for slide navigation) at /deck-stage.js
    deck_stage_path = os.path.join(os.path.dirname(__file__), "pitch_deck", "deck-stage.js")
    if os.path.exists(deck_stage_path):
        with open(deck_stage_path, 'rb') as f:
            files_data["public/deck-stage.js"] = f.read()
        print(f"   ✓ deck-stage.js loaded: {len(files_data['public/deck-stage.js']):,} bytes")

    # Upload deck assets (logos, fonts, images) at /assets/*
    assets_dir = os.path.join(os.path.dirname(__file__), "pitch_deck", "assets")
    if os.path.isdir(assets_dir):
        asset_count = 0
        asset_bytes = 0
        for root, _, files in os.walk(assets_dir):
            for fname in files:
                if fname.startswith('.'): continue
                full = os.path.join(root, fname)
                rel = os.path.relpath(full, assets_dir)
                with open(full, 'rb') as f:
                    data = f.read()
                files_data[f"public/assets/{rel}"] = data
                asset_count += 1
                asset_bytes += len(data)
        print(f"   ✓ Deck assets loaded: {asset_count} files, {asset_bytes:,} bytes")

    # Add print variant of pitch deck
    deck_print_path = os.path.join(os.path.dirname(__file__), "pitch_deck", "Papr Deck-print.html")
    if os.path.exists(deck_print_path):
        with open(deck_print_path, 'rb') as f:
            files_data["public/deck-print.html"] = f.read()
        print(f"   ✓ Pitch deck print variant loaded")

    file_entries = []
    for filepath, data in files_data.items():
        sha = hashlib.sha1(data).hexdigest()
        file_entries.append({"file": filepath, "sha": sha, "size": len(data)})
        
        # Upload file by SHA
        upload_resp = requests.post(
            f"https://api.vercel.com/v2/files?teamId={TEAM_ID}",
            headers={**headers, "Content-Type": "application/octet-stream",
                     "x-vercel-digest": sha, "Content-Length": str(len(data))},
            data=data
        )
        if upload_resp.status_code in [200, 409]:  # 409 = already exists
            print(f"   ✓ Uploaded {filepath} ({len(data):,} bytes, sha={sha[:8]})")
        else:
            print(f"   ✗ Upload failed for {filepath}: {upload_resp.status_code} {upload_resp.text[:200]}")
    
    # Create deployment referencing uploaded files
    payload = {
        "name": PROJECT,
        "files": file_entries,
        "projectSettings": {"framework": None},
        "target": "production"
    }
    resp = requests.post(
        f"https://api.vercel.com/v13/deployments?teamId={TEAM_ID}",
        headers={**headers, "Content-Type": "application/json"},
        json=payload
    )
    return resp.json()


if __name__ == "__main__":
    print("📦 Loading room data from SQLite...")
    room = load_room()
    print(f"   Company: {room['company']['name']}")
    print(f"   Sections: {len(room['sections'])}")
    print(f"   Documents: {len(room['documents'])}")
    print(f"   Team: {len(room['team'])}")
    print(f"   Investors: {len(room['investors'])}")
    print(f"   Active links: {len(room['links'])}")
    print(f"   Demos: {len(room['demos'])}")
    print(f"   One-pager: {'Yes' if room['one_pager'] else 'No'}")

    print("\n🔨 Building self-contained HTML from app files...")
    print(f"   App dir: {APP_DIR}")
    html = build_html(room)
    print(f"   HTML size: {len(html):,} bytes")

    print("\n📦 Building serverless function...")
    function_js = build_serverless_function(html)
    print(f"   Function size: {len(function_js):,} bytes")

    print("\n🚀 Deploying to Vercel...")
    result = deploy(args.vercel_key, function_js, html)
    if "error" in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)
    
    url = result.get("url", "")
    print(f"✅ Deployed!")
    print(f"   URL: https://{url}")
    print(f"   State: {result.get('readyState')}")
    
    # Save deploy URL to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)")
    conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('vercel_url', ?)", ("https://dataroom.papr.ai",))
    conn.commit()
    conn.close()
    print(f"   Saved deploy URL to config table")

    # Print investor links
    if room['links']:
        print(f"\n🔗 Investor links:")
        for link in room['links']:
            print(f"   {link['fund_name']}: https://{url}?token={link['token']}")

    # Run post-deploy verification tests
    print(f"\n🧪 Running verification tests...")
    import time
    time.sleep(15)  # Wait for Vercel to become available
    try:
        from verify_deploy import run_tests
        test_token = room['links'][0]['token'] if room['links'] else ""
        if test_token:
            success = run_tests(f"https://{url}", test_token)
            if not success:
                print("\n⚠️  Some tests failed — review above")
            else:
                print("\n✅ All verification tests passed!")
        else:
            print("  ⏭ No investor links to test")
    except Exception as e:
        print(f"  ⚠️ Tests error: {e}")
