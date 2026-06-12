"""Mercury Investor Database Scraper — fetches VCs and inserts into data room DB."""
import os, json, sqlite3, uuid, time, re
import requests
from bs4 import BeautifulSoup

DATA_ROOM_DB = os.path.expanduser("~/PAPR/jobs/b6d2f0ea-6a97-495a-8d69-3582d31a670f/data/data.db")
JOB_DB = os.environ.get("JOB_DB", "data/data.db")

# Configurable via env vars or defaults
STAGES = os.environ.get("STAGES", "Pre-seed").split(",")
INDUSTRIES = os.environ.get("INDUSTRIES", "AI/ML,Analytics,API,Automation,Cloud,Deep Tech/Hard Science,Developer Tools,Enterprise,SaaS").split(",")

BASE_URL = "https://mercury.com/investor-database"

def build_url(stages, industries):
    """Build Mercury URL with filters."""
    params = {"perPage": "All"}
    if industries:
        params["industries"] = ",".join(i.strip() for i in industries)
    if stages:
        params["stages"] = ",".join(s.strip() for s in stages)
    qs = "&".join(f"{k}={requests.utils.quote(v)}" for k, v in params.items())
    return f"{BASE_URL}?{qs}"

def scrape_mercury(url):
    """Scrape investor listings from Mercury page."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    print(f"Fetching: {url}")
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    
    investors = []
    # Mercury renders investor cards — look for common patterns
    # Try JSON data embedded in page first (Next.js/React apps often embed data)
    scripts = soup.find_all("script", {"type": "application/json"})
    for script in scripts:
        try:
            data = json.loads(script.string)
            investors.extend(extract_from_json(data))
        except:
            continue
    
    # Also try script tags with __NEXT_DATA__
    for script in soup.find_all("script", {"id": "__NEXT_DATA__"}):
        try:
            data = json.loads(script.string)
            investors.extend(extract_from_json(data))
        except:
            continue
    
    # Fallback: parse HTML cards
    if not investors:
        investors = parse_html_cards(soup)
    
    print(f"Found {len(investors)} investors")
    return investors

def extract_from_json(data, depth=0):
    """Recursively extract investor objects from JSON."""
    results = []
    if depth > 10:
        return results
    if isinstance(data, dict):
        # Look for investor-like objects
        if "name" in data and any(k in data for k in ["website", "fundUrl", "url", "slug", "description"]):
            if not data.get("name", "").startswith("http"):
                results.append({
                    "name": data.get("name", ""),
                    "url": data.get("website") or data.get("fundUrl") or data.get("url") or "",
                    "description": data.get("description") or data.get("bio") or "",
                    "stage": data.get("stage") or data.get("stages") or "",
                    "focus": data.get("industries") or data.get("focus") or "",
                })
        for v in data.values():
            results.extend(extract_from_json(v, depth+1))
    elif isinstance(data, list):
        for item in data:
            results.extend(extract_from_json(item, depth+1))
    return results

def parse_html_cards(soup):
    """Fallback HTML parsing for investor cards."""
    results = []
    for card in soup.select("[class*='investor'], [class*='card'], [data-testid*='investor']"):
        name_el = card.select_one("h2, h3, [class*='name']")
        link_el = card.select_one("a[href*='http']")
        if name_el:
            name = name_el.get_text(strip=True)
            url = link_el["href"] if link_el else ""
            if name and len(name) < 100:
                results.append({"name": name, "url": url, "description": "", "stage": "", "focus": ""})
    return results

def get_logo_url(fund_url):
    """Generate favicon URL from fund website."""
    if not fund_url:
        return None
    domain = re.sub(r"^https?://", "", fund_url).split("/")[0]
    return f"https://icon.horse/icon/{domain}"

def insert_investors(investors):
    """Insert investors into the data room DB."""
    conn = sqlite3.connect(DATA_ROOM_DB)
    cur = conn.cursor()
    inserted = 0
    skipped = 0
    
    for inv in investors:
        name = inv["name"].strip()
        if not name or len(name) < 2:
            continue
        # Check if already exists
        cur.execute("SELECT id FROM investors WHERE LOWER(name) = LOWER(?)", [name])
        if cur.fetchone():
            skipped += 1
            continue
        
        inv_id = str(uuid.uuid4())
        logo = get_logo_url(inv.get("url", ""))
        passcode = uuid.uuid4().hex[:6].upper()
        cur.execute(
            "INSERT INTO investors (id,name,fund_url,logo_url,stage,passcode,notes,created_at) VALUES (?,?,?,?,?,?,?,strftime('%s','now'))",
            [inv_id, name, inv.get("url",""), logo, "intro", passcode, f"Source: Mercury | {inv.get('description','')}"]
        )
        inserted += 1
    
    conn.commit()
    conn.close()
    print(f"Inserted {inserted} new investors, skipped {skipped} duplicates")
    return inserted

def save_to_job_db(investors):
    """Also save raw scrape results to job's own DB."""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(JOB_DB)
    conn.execute("""CREATE TABLE IF NOT EXISTS mercury_investors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, url TEXT, description TEXT, stage TEXT, focus TEXT,
        scraped_at TEXT DEFAULT (datetime('now'))
    )""")
    for inv in investors:
        conn.execute("INSERT INTO mercury_investors (name,url,description,stage,focus) VALUES (?,?,?,?,?)",
            [inv["name"], inv.get("url",""), inv.get("description",""), str(inv.get("stage","")), str(inv.get("focus",""))])
    conn.commit()
    conn.close()

def main():
    print(f"Mercury VC Scraper")
    print(f"Stages: {STAGES}")
    print(f"Industries: {INDUSTRIES}")
    
    url = build_url(STAGES, INDUSTRIES)
    investors = scrape_mercury(url)
    
    if investors:
        save_to_job_db(investors)
        count = insert_investors(investors)
        print(f"Done — {count} new VCs added to data room")
    else:
        print("No investors found — Mercury may require browser rendering")
        print(f"Manual import: visit {url}")
        print("Copy the investor list and we can parse it")

if __name__ == "__main__":
    main()
