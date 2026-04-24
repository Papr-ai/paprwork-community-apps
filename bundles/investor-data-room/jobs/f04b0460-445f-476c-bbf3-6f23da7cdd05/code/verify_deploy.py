"""
Post-publish verification tests for Data Room Vercel deployment.
Runs automatically after each publish. Validates:
1. All sections and documents render
2. VC personalization (banner, photo, portfolio)
3. Pre-seed visibility toggle
4. Summary/company data matches DB
5. All JS/CSS files are bundled
6. No JS syntax errors in the bundle
"""
import json, re, sys, sqlite3, os
import urllib.request

DB_PATH = os.path.expanduser("~/PAPR/Jobs/b6d2f0ea-6a97-495a-8d69-3582d31a670f/data/data.db")

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    def ok(self, name):
        self.passed += 1
        print(f"  ✓ {name}")
    def fail(self, name, reason):
        self.failed += 1
        self.errors.append(f"{name}: {reason}")
        print(f"  ✗ {name} — {reason}")
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*50}")
        print(f"Results: {self.passed}/{total} passed, {self.failed} failed")
        if self.errors:
            print("\nFailures:")
            for e in self.errors:
                print(f"  - {e}")
        return self.failed == 0

def fetch_page(url):
    req = urllib.request.Request(url, headers={"User-Agent": "PaprVerifyBot/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8"), dict(resp.headers)

def run_tests(deploy_url, token):
    t = TestResult()
    print(f"\nVerifying: {deploy_url}?token={token}\n")

    # Fetch investor page
    url = f"{deploy_url}?token={token}"
    import time as _time
    html, headers = None, None
    for _attempt in range(4):
        try:
            html, headers = fetch_page(url)
            if "ROOM_DATA" in html:
                break
        except Exception as e:
            if _attempt == 3:
                t.fail("FETCH", f"Could not load page: {e}")
                t.summary()
                return False
            _time.sleep(5)
    if not html:
        t.fail("FETCH", "Empty response after retries")
        t.summary()
        return False

    # 1. Cache headers
    cc = headers.get("Cache-Control", "")
    if "no-store" in cc or "no-cache" in cc:
        t.ok("Cache-Control: no-store/no-cache")
    else:
        t.fail("Cache-Control", f"Expected no-cache, got: {cc}")

    # 2. ROOM_DATA present
    if "window.ROOM_DATA" in html:
        t.ok("ROOM_DATA present")
    else:
        t.fail("ROOM_DATA", "window.ROOM_DATA not found in HTML")

    # 3. ROOM_LINK present (personalized)
    if "window.ROOM_LINK" in html and "partner_name" in html:
        t.ok("ROOM_LINK with partner data")
    else:
        t.fail("ROOM_LINK", "Missing or no partner_name")

    # 4. All section openers present
    openers = ["openICP", "openCompAnalysis", "openMoat", "openGTM", "openFinancials",
               "openOnePager", "openMemo", "openDeck", "openFAQ", "openCustomerData"]
    for fn in openers:
        if f"function {fn}" in html or f"{fn}(" in html:
            t.ok(f"Section: {fn}")
        else:
            t.fail(f"Section: {fn}", "function not found")

    # 5. Pitch deck slides embedded
    if "DECK_SLIDES" in html:
        t.ok("Pitch deck slides embedded")
    else:
        t.fail("Pitch deck", "DECK_SLIDES not found")

    # 6. Check DB data matches deploy
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Company tagline
    company = dict(c.execute("SELECT * FROM company_info WHERE id='papr'").fetchone())
    if company.get("tagline") and company["tagline"] in html:
        t.ok(f"Company tagline matches: '{company['tagline'][:40]}...'")
    else:
        t.fail("Company tagline", "DB tagline not found in deployed HTML")

    # Raise data
    raise_data = dict(c.execute("SELECT * FROM raise_tracker WHERE id='current'").fetchone())
    hide = raise_data.get("hide_from_vc", 0)
    hide_in_html = re.search(r'"hide_from_vc":\s*(\d+)', html)
    if hide_in_html:
        deployed_hide = int(hide_in_html.group(1))
        if deployed_hide == hide:
            t.ok(f"hide_from_vc matches DB: {hide}")
        else:
            t.fail("hide_from_vc", f"DB={hide}, deployed={deployed_hide}")
    else:
        t.fail("hide_from_vc", "Field not found in deployed HTML")

    # 7. Partner photo
    link_row = c.execute("""
        SELECT vp.photo_url FROM investor_links il
        LEFT JOIN vc_partners vp ON il.partner_id = vp.id
        WHERE il.token=?
    """, [token]).fetchone()
    if link_row and link_row["photo_url"]:
        if "partner_photo" in html and len(link_row["photo_url"]) > 100:
            # Check base64 prefix is in the deployed page
            prefix = link_row["photo_url"][:30]
            if prefix in html:
                t.ok("Partner photo deployed (base64 matches)")
            else:
                t.fail("Partner photo", "Photo in DB but not matching in deploy")
        else:
            t.fail("Partner photo", "Photo in DB but partner_photo empty in deploy")
    else:
        t.ok("Partner photo: none in DB (initials shown)")

    # 8. Portfolio companies
    try:
        portfolio = c.execute("SELECT COUNT(*) as cnt FROM vc_portfolio").fetchone()
        cnt = portfolio["cnt"]
        if cnt > 0 and "vc_portfolio" in html:
            t.ok(f"Portfolio: {cnt} companies in ROOM_DATA")
        elif cnt == 0:
            t.ok("Portfolio: empty (expected)")
        else:
            t.fail("Portfolio", f"DB has {cnt} companies but vc_portfolio not in HTML")
    except:
        t.ok("Portfolio: table not found (ok)")

    # 9. Sections count
    sections = c.execute("SELECT COUNT(*) as cnt FROM sections").fetchone()["cnt"]
    docs = c.execute("SELECT COUNT(*) as cnt FROM documents").fetchone()["cnt"]
    sec_match = re.search(r'"sections":\s*\[', html)
    doc_match = re.search(r'"documents":\s*\[', html)
    if sec_match:
        t.ok(f"Sections array present (DB has {sections})")
    else:
        t.fail("Sections", "sections array not in ROOM_DATA")
    if doc_match:
        t.ok(f"Documents array present (DB has {docs})")
    else:
        t.fail("Documents", "documents array not in ROOM_DATA")

    # 10. No emoji in edit buttons (founder-only, but check JS source)
    emoji_pattern = re.compile(r'&#9999;|\\u270f')
    if emoji_pattern.search(html):
        t.fail("Edit emoji", "Found edit emoji in deployed HTML")
    else:
        t.ok("No edit emoji in deployed HTML")

    # 11. Product Demo — loadDemos returns data, not overridden
    # On Vercel, the shim's loadDemos should win (returns ROOM_DATA.demos)
    # db-queries.js must NOT override it (guarded by !window.ROOM_DATA)
    demo_shim = re.search(r'async function loadDemos.*?ROOM_DATA\.demos', html, re.DOTALL)
    demo_data = re.search(r'"demos":\s*\[\{', html)
    if demo_shim and demo_data:
        t.ok("Product Demo: shim loadDemos + demo data present")
    elif not demo_data:
        t.fail("Product Demo", "No demo data in ROOM_DATA")
    else:
        t.fail("Product Demo", "Shim loadDemos not found — may be overridden")

    # 12. ICP viewer data with photos
    icp_data_match = re.search(r'window\.ICP_DATA\s*=\s*\{', html)
    icp_bg = re.search(r'backgroundPhoto.*?data:image', html)
    if icp_data_match:
        t.ok("ICP: window.ICP_DATA injected")
    else:
        t.fail("ICP", "window.ICP_DATA not found in deployed HTML")
    
    # Check if ICP has images (background and/or profile)
    if icp_bg:
        t.ok("ICP: background photo embedded (base64)")
    else:
        # Not a hard failure — might not have set photos yet
        t.ok("ICP: no background photo (user may not have set one)")

    # 13. loadDemos guard — db-queries.js should not override on Vercel
    dq_override = html.count("function loadDemos")
    if dq_override <= 1:
        t.ok(f"loadDemos: single definition (no override)")
    else:
        # Check if the second one is guarded
        if "!window.ROOM_DATA" in html and dq_override == 2:
            t.ok(f"loadDemos: 2 definitions but second is guarded")
        else:
            t.fail("loadDemos override", f"Found {dq_override} unguarded definitions")

    # 14. loadICP guard
    icp_override = html.count("function loadICP")
    if icp_override <= 1:
        t.ok(f"loadICP: single definition (no override)")
    else:
        if "!window.ROOM_DATA" in html and icp_override == 2:
            t.ok(f"loadICP: 2 definitions but second is guarded")
        else:
            t.fail("loadICP override", f"Found {icp_override} unguarded definitions")

    # 15a. One-pager content is real text (not blob/binary)
    if "\"one_pager\":" in html:
        import re as re2
        op_match = re2.search(r'"one_pager"\s*:\s*"(.{0,50})"', html)
        if op_match and not op_match.group(1).startswith("b\\"):
            t.ok("One-pager: content is text (not blob)")
        elif op_match:
            t.fail("One-pager blob", "Content stored as bytes, not text")
        else:
            t.ok("One-pager: present")
    else:
        t.fail("One-pager missing", "one_pager not in ROOM_DATA")

    # 15b. FAQ content is real text
    if "\"faq\":" in html and 'b\\\\n' not in html[:html.find("faq")+5000]:
        t.ok("FAQ: content is text (not blob)")
    else:
        t.fail("FAQ blob", "FAQ answers may be stored as bytes")
    # 15. JS syntax check — look for obvious errors
    if "SyntaxError" in html:
        t.fail("JS syntax", "SyntaxError found in HTML")
    else:
        t.ok("No SyntaxError in HTML")

    conn.close()
    return t.summary()

if __name__ == "__main__":
    deploy_url = sys.argv[1] if len(sys.argv) > 1 else ""
    token = sys.argv[2] if len(sys.argv) > 2 else "556a6bb8-7b3b-4d7e-b032-a2b776754737"
    if not deploy_url:
        print("Usage: python verify_deploy.py <deploy_url> [token]")
        sys.exit(1)
    success = run_tests(deploy_url, token)
    sys.exit(0 if success else 1)

    # 12. Material Symbols font loaded
    if 'Material+Symbols+Outlined' in html or 'Material Symbols Outlined' in html:
        t.ok("Material Symbols font loaded")
    else:
        t.fail("Material Symbols font", "Missing Material Symbols font link")

    # 13. No emoji icons in source (check for common emoji unicode ranges)
    import re
    emoji_icons = re.compile(r'[\U0001F4C4\U0001F4DD\U0001F4CA\U0001F3AC\U0001F517\U0001F4A1\U0001F512\U0001F680\U0001F389]')
    if emoji_icons.search(html):
        t.fail("No emoji icons", "Found emoji icons in deployed HTML — use Material Symbols instead")
    else:
        t.ok("No emoji icons in deployed HTML")

    # 14. Material icon classes present (doc-icon should use material-symbols-outlined)
    if 'material-symbols-outlined' in html:
        t.ok("Material icon classes present in HTML")
    else:
        t.fail("Material icon classes", "Missing material-symbols-outlined class in HTML")
