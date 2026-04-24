#!/usr/bin/env python3
"""
Community Data Room DB Setup
Creates a fresh database for the Investor Data Room template.
Copies public VC data, strips Papr proprietary info, seeds fake company.
"""
import sqlite3
import os
import json
import uuid

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JOB_DIR = os.path.dirname(SCRIPT_DIR)
NEW_DB = os.path.join(JOB_DIR, "data", "data.db")
PAPR_DB = os.path.join(os.path.expanduser("~"), "Papr", "Jobs",
                       "b6d2f0ea-6a97-495a-8d69-3582d31a670f", "data", "data.db")

# Safety: verify Papr DB exists but we ONLY read from it
assert os.path.exists(PAPR_DB), f"Papr DB not found: {PAPR_DB}"

# Remove old community DB if exists (fresh start)
if os.path.exists(NEW_DB):
    os.remove(NEW_DB)
    print(f"♻️  Removed old community DB")

print(f"📦 Creating fresh community DB: {NEW_DB}")
print(f"📖 Reading public data from: {PAPR_DB}")

# ── Open connections ──
src = sqlite3.connect(PAPR_DB)
src.row_factory = sqlite3.Row
dst = sqlite3.connect(NEW_DB)
dst.execute("PRAGMA journal_mode=WAL")
dst.execute("PRAGMA foreign_keys=OFF")  # Enable after schema creation

# ── Step 1: Copy schema ──
print("\n🔧 Step 1: Creating schema...")
schema_sql = src.execute(
    "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table','index') ORDER BY type DESC, name"
).fetchall()

skip_tables = {'sqlite_sequence'}  # Auto-managed
for row in schema_sql:
    sql = row[0]
    table_name = sql.split('(')[0].split()[-1] if 'CREATE TABLE' in sql else ''
    if table_name in skip_tables:
        continue
    try:
        dst.execute(sql)
    except sqlite3.OperationalError as e:
        if 'already exists' not in str(e):
            print(f"  ⚠️  Schema error: {e}")

dst.commit()
tables = [r[0] for r in dst.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print(f"  ✅ Created {len(tables)} tables")

# ── Step 2: Copy PUBLIC investor data (reset proprietary fields) ──
print("\n📊 Step 2: Copying public VC data...")

# 2a. Investors — copy all, reset proprietary fields
investors = src.execute("SELECT * FROM investors").fetchall()
cols = [desc[0] for desc in src.execute("SELECT * FROM investors LIMIT 1").description]

# Fields to reset
RESET_FIELDS = {
    'stage': 'Lead',
    'fit_score': 0,
    'fit_breakdown': '',
    'thesis_alignment_score': 0,
    'thesis_alignment_reason': '',
    'adjusted_fit_score': 0,
    'strategic_boost': 0,
    'competitor_adjustment': 0,
    'invested_amount': 0,
    'committed_amount': 0,
    'notes': '',
    'attio_record_id': '',
    'passcode': '',
    'investor_status': '',
    'best_intro_path': '',
    'portfolio_status': '',
    'competitor_risk': '',
    'competitor_risk_reason': '',
}

inv_count = 0
for inv in investors:
    row = dict(inv)
    for field, default in RESET_FIELDS.items():
        if field in row:
            row[field] = default
    placeholders = ','.join(['?' for _ in cols])
    col_names = ','.join(cols)
    values = [row.get(c, '') for c in cols]
    dst.execute(f"INSERT OR REPLACE INTO investors ({col_names}) VALUES ({placeholders})", values)
    inv_count += 1

dst.commit()
print(f"  ✅ {inv_count} investors copied (stages reset to 'Lead', scores cleared)")

# 2b. VC Partners — copy as-is (public data)
partners = src.execute("SELECT * FROM vc_partners").fetchall()
if partners:
    pcols = [desc[0] for desc in src.execute("SELECT * FROM vc_partners LIMIT 1").description]
    for p in partners:
        row = dict(p)
        placeholders = ','.join(['?' for _ in pcols])
        col_names = ','.join(pcols)
        values = [row.get(c, '') for c in pcols]
        dst.execute(f"INSERT OR REPLACE INTO vc_partners ({col_names}) VALUES ({placeholders})", values)
    dst.commit()
    print(f"  ✅ {len(partners)} VC partners copied")

# 2c. VC Portfolio Companies — copy as-is (public data)
vpc = src.execute("SELECT * FROM vc_portfolio_companies").fetchall()
if vpc:
    vcols = [desc[0] for desc in src.execute("SELECT * FROM vc_portfolio_companies LIMIT 1").description]
    for v in vpc:
        row = dict(v)
        placeholders = ','.join(['?' for _ in vcols])
        col_names = ','.join(vcols)
        values = [row.get(c, '') for c in vcols]
        dst.execute(f"INSERT OR REPLACE INTO vc_portfolio_companies ({col_names}) VALUES ({placeholders})", values)
    dst.commit()
    print(f"  ✅ {len(vpc)} portfolio companies copied")

# 2d. VC Portfolio (fund-level) — copy as-is
vp = src.execute("SELECT * FROM vc_portfolio").fetchall()
if vp:
    vpcols = [desc[0] for desc in src.execute("SELECT * FROM vc_portfolio LIMIT 1").description]
    for v in vp:
        row = dict(v)
        placeholders = ','.join(['?' for _ in vpcols])
        col_names = ','.join(vpcols)
        values = [row.get(c, '') for c in vpcols]
        dst.execute(f"INSERT OR REPLACE INTO vc_portfolio ({col_names}) VALUES ({placeholders})", values)
    dst.commit()
    print(f"  ✅ {len(vp)} VC portfolio entries copied")

# ── Step 3: Seed NovaMind AI fake company ──
print("\n🚀 Step 3: Seeding NovaMind AI template data...")

# 3a. Company info
dst.execute("""INSERT OR REPLACE INTO company_info
    (id, name, tagline, overview, stage, website, linkedin, substack, mission, bhag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
    'papr',  # Keep same ID so app code works
    'NovaMind AI',
    'AI-powered knowledge graphs for enterprise decision-making',
    'NovaMind AI transforms unstructured enterprise data into actionable knowledge graphs. '
    'Our platform helps Fortune 500 companies make faster, better decisions by connecting '
    'siloed data sources into a unified intelligence layer. [EDIT ME — Replace with your company overview]',
    'Pre-Seed',
    'https://novamind.ai',
    'https://linkedin.com/company/novamind-ai',
    '',
    'Build the world\'s most intelligent enterprise knowledge platform that makes every decision data-driven. [EDIT ME]',
    'Every enterprise decision powered by connected intelligence. [EDIT ME]'
))

# 3b. Raise tracker
dst.execute("""INSERT OR REPLACE INTO raise_tracker
    (id, target_amount, raised_amount, committed_amount, stage, currency, note, hide_from_vc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", (
    'current', 3000000, 0, 0, 'Pre-Seed', 'USD',
    '[EDIT ME — Add your raise notes]', 0
))

# 3c. Team members
team = [
    ('tm-1', 'Alex Chen', 'CEO & Co-founder',
     'Previously ML lead at Google Brain. Stanford CS PhD. 10+ years in enterprise AI. [EDIT ME]',
     '', 'https://linkedin.com/in/example-alex', '', 0),
    ('tm-2', 'Sarah Kim', 'CTO & Co-founder',
     'Ex-Meta Research scientist. Built knowledge graph systems at scale. MIT PhD. [EDIT ME]',
     '', 'https://linkedin.com/in/example-sarah', '', 1),
    ('tm-3', 'James Park', 'COO & Co-founder',
     'Former McKinsey engagement manager. Harvard MBA. Led GTM for 2 enterprise SaaS startups. [EDIT ME]',
     '', 'https://linkedin.com/in/example-james', '', 2),
]
for t in team:
    dst.execute("INSERT OR REPLACE INTO team_members (id, name, role, bio, photo_url, linkedin, x_url, sort_order) VALUES (?,?,?,?,?,?,?,?)", t)

# 3d. Sections
sections = [
    ('openProduct', 'Product & Demo', 'Product overview, architecture, and live demos', 0, 1, 1, 1),
    ('openMoat', 'Market & Moat', 'Market size, competitive landscape, and defensibility', 1, 1, 1, 1),
    ('openGTM', 'Go-to-Market', 'Sales strategy, pipeline, and growth plan', 2, 1, 1, 1),
    ('openFinancials', 'Financials', 'Revenue, burn rate, and financial projections', 3, 0, 1, 1),
    ('openFAQ', 'FAQ', 'Frequently asked questions from investors', 4, 1, 1, 1),
]
for s in sections:
    dst.execute("INSERT OR REPLACE INTO sections (id, label, description, sort_order, intro_visible, soft_commit_visible, diligence_visible) VALUES (?,?,?,?,?,?,?)", s)

# 3e. Documents (template with [EDIT ME])
docs = [
    ('doc-1', 'openProduct', 'Product Overview', '[EDIT ME — Describe what you\'re building, the core technology, and key differentiators]', '', 'text', 0),
    ('doc-2', 'openProduct', 'Architecture Diagram', '[EDIT ME — Add a link to your architecture diagram or technical overview]', '', 'link', 1),
    ('doc-3', 'openMoat', 'Market Analysis', '[EDIT ME — TAM/SAM/SOM analysis, market trends, and timing thesis]', '', 'text', 0),
    ('doc-4', 'openMoat', 'Competitive Landscape', '[EDIT ME — Key competitors, your differentiation, and why you win]', '', 'text', 1),
    ('doc-5', 'openGTM', 'GTM Strategy', '[EDIT ME — Go-to-market plan, sales motion, and growth strategy]', '', 'text', 0),
    ('doc-6', 'openGTM', 'Customer Pipeline', '[EDIT ME — Current pipeline, key accounts, and conversion metrics]', '', 'text', 1),
    ('doc-7', 'openFinancials', 'Financial Model', '[EDIT ME — Link to your financial model spreadsheet]', '', 'link', 0),
    ('doc-8', 'openFinancials', 'Revenue Projections', '[EDIT ME — Revenue projections and key assumptions]', '', 'text', 1),
    ('doc-9', 'openFAQ', 'Investor FAQ', 'See FAQ section below', '', 'text', 0),
]
for d in docs:
    dst.execute("INSERT OR REPLACE INTO documents (id, section_id, name, description, file_url, file_type, sort_order) VALUES (?,?,?,?,?,?,?)", d)

# 3f. FAQ (generic startup template)
faqs = [
    ('Product', 'What does your product do?', '[EDIT ME — Clear, concise explanation of your product and its value proposition]', 0),
    ('Product', 'How is your technology different from existing solutions?', '[EDIT ME — Technical differentiation and unique approach]', 1),
    ('Market', 'How big is your market?', '[EDIT ME — TAM/SAM/SOM with sources and methodology]', 2),
    ('Market', 'Who are your main competitors?', '[EDIT ME — Competitive landscape and your advantages]', 3),
    ('Business', 'What is your business model?', '[EDIT ME — Revenue model, pricing strategy, unit economics]', 4),
    ('Business', 'What are your current metrics?', '[EDIT ME — Key metrics: ARR, MRR, customers, growth rate, retention]', 5),
    ('Team', 'Why is your team uniquely positioned to build this?', '[EDIT ME — Team background and relevant experience]', 6),
    ('Fundraising', 'What are you raising and how will you use the funds?', '[EDIT ME — Round details, use of funds breakdown, milestones]', 7),
    ('Fundraising', 'What is your timeline for closing the round?', '[EDIT ME — Timeline and process details]', 8),
]
for f in faqs:
    dst.execute("INSERT INTO faq (category, question, answer, sort_order) VALUES (?,?,?,?)", f)

# 3g. Config defaults
configs = [
    ('founder_emails', ''),
    ('deploy_domain', ''),
    ('calendly_url', ''),
    ('onboarding_complete', 'false'),
    ('company_logo_dark', ''),
    ('company_logo_light', ''),
]
for k, v in configs:
    dst.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?,?)", (k, v))

# 3h. Empty tables (user fills via chat)
# investor_links, connectors, intro_pathways, customers, revenue_history,
# pipeline, demos, one_pager, pitch_deck, investment_memo, case_studies — all empty

# 3i. ICP criteria (generic template)
dst.execute("""INSERT OR REPLACE INTO icp_criteria
    (id, title_patterns, company_sizes, verticals, description, intro_blurb)
    VALUES (1, ?, ?, ?, ?, ?)""", (
    json.dumps(['VP Engineering', 'Head of Data', 'CTO', 'Director of Analytics']),
    json.dumps(['50-200', '200-500', '500-1000']),
    json.dumps(['Enterprise Software', 'Data Infrastructure', 'AI/ML']),
    'Enterprise teams with complex data ecosystems looking for better knowledge management. [EDIT ME]',
    'Hi! I\'m reaching out because your company seems like a great fit for what we\'re building. [EDIT ME]'
))

# 3j. Seed 10 example fit scores so users can see how scoring looks
example_scored = src.execute("""
    SELECT id FROM investors
    WHERE fit_score > 60
    ORDER BY fit_score DESC
    LIMIT 10
""").fetchall()
for i, row in enumerate(example_scored):
    score = 90 - (i * 5)  # 90, 85, 80, 75, 70...
    dst.execute("""UPDATE investors SET
        fit_score = ?,
        fit_breakdown = ?,
        thesis_alignment_score = ?,
        adjusted_fit_score = ?
        WHERE id = ?""", (
        score,
        json.dumps({
            'stage_fit': min(score + 5, 100),
            'check_size_fit': score,
            'sector_fit': max(score - 10, 40),
            'note': 'Example score — run VC Fit Scoring to compute real matches for your company'
        }),
        score - 5,
        score,
        row[0]
    ))

dst.commit()
print(f"  ✅ Seeded {len(example_scored)} example fit scores")

# ── Step 4: Verify ──
print("\n✅ Step 4: Verification...")
for table, expected_min in [
    ('investors', 1000), ('vc_partners', 2000), ('vc_portfolio_companies', 8000),
    ('company_info', 1), ('team_members', 3), ('sections', 5), ('documents', 9),
    ('faq', 9), ('config', 6), ('icp_criteria', 1), ('raise_tracker', 1),
]:
    count = dst.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    status = "✅" if count >= expected_min else "⚠️"
    print(f"  {status} {table}: {count} rows")

# Verify NO Papr-specific data leaked
papr_check = dst.execute("SELECT name FROM company_info WHERE id='papr'").fetchone()
assert papr_check[0] == 'NovaMind AI', f"Company name should be NovaMind AI, got: {papr_check[0]}"

stage_check = dst.execute("SELECT COUNT(*) FROM investors WHERE stage != 'Lead'").fetchone()[0]
print(f"  ✅ Non-Lead investors: {stage_check} (should be 0)")

# Verify empty tables stay empty
for table in ['investor_links', 'connectors', 'intro_pathways']:
    count = dst.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"  ✅ {table}: {count} rows (should be 0)")

src.close()
dst.close()

db_size = os.path.getsize(NEW_DB)
print(f"\n🎉 Community DB created: {db_size / 1024 / 1024:.1f}MB")
print(f"   Path: {NEW_DB}")
print(f"   Papr DB: UNTOUCHED ✅")
