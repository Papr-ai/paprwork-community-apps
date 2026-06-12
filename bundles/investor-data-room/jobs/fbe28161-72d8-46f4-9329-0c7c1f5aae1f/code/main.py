import sqlite3, json, os, sys, argparse, requests, uuid, hashlib, time, re

parser = argparse.ArgumentParser()
parser.add_argument('--attio-key', required=True)
args = parser.parse_args()

DB_PATH = os.path.expanduser("~/PAPR/jobs/b6d2f0ea-6a97-495a-8d69-3582d31a670f/data/data.db")
ATTIO_BASE = "https://api.attio.com/v2"

def get_vcs(key):
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    all_records = []
    offset = None
    while True:
        body = {"limit": 50}
        if offset:
            body["offset"] = offset
        resp = requests.post(f"{ATTIO_BASE}/objects/vc_fundraising/records/query", headers=headers, json=body)
        data = resp.json()
        records = data.get("data", [])
        all_records.extend(records)
        offset = data.get("next_cursor")
        if not offset or len(records) < 50:
            break
    return all_records

def clean_domain(raw):
    if not raw:
        return None
    raw = raw.strip()
    raw = re.sub(r'^https?://(www\.)?', '', raw).rstrip('/')
    if '/' in raw:
        raw = raw.split('/')[0]
    if '.' not in raw:
        return None
    return raw

def parse_vc(record):
    vals = record.get("values", {})
    rid = record.get("id", {}).get("record_id", str(uuid.uuid4()))
    domain_raw = vals.get("firm_logo", [{}])[0].get("value", "") if vals.get("firm_logo") else ""
    domain = clean_domain(domain_raw)
    stage_data = vals.get("stage_4", [{}])[0] if vals.get("stage_4") else {}
    status_obj = stage_data.get("status", {}) if isinstance(stage_data, dict) else {}
    stage_title = status_obj.get("title", "unknown") if isinstance(status_obj, dict) else "unknown"
    stage_map = {
        "closed_won": "closed", "closed_lost": "closed_lost",
        "lead": "intro", "meeting": "intro", "outreach": "intro",
        "Ghosted": "ghosted", "Late Stage VC": "late_stage",
        "Waiting on lead, wants to participate": "waiting",
        "verbal_commit": "verbal_commit",
        "active_diligence": "active_diligence", "negotiation": "active_diligence",
        "qualified": "verbal_commit"
    }
    stage = stage_map.get(stage_title, "intro")
    amount = 0
    if vals.get("investment_amount"):
        amt_val = vals["investment_amount"][0].get("value", 0)
        amount = float(amt_val) if amt_val else 0
    name = domain_raw or rid[:12]
    if domain:
        name = domain.split('.')[0].replace('-', ' ').title()
        if len(name) < 3:
            name = domain
    return {
        "attio_id": rid, "name": name, "domain": domain, "domain_raw": domain_raw,
        "stage": stage, "amount": amount,
        "logo_url": f"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{domain}&size=128" if domain else None
    }

def sync_to_db(vcs):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    inserted, updated, skipped = 0, 0, 0
    for vc in vcs:
        if vc["stage"] == "closed_lost":
            skipped += 1
            continue
        c.execute("SELECT id FROM investors WHERE attio_record_id=?", (vc["attio_id"],))
        existing = c.fetchone()
        invested = vc["amount"] if vc["stage"] == "closed" else 0
        committed = vc["amount"] if vc["stage"] == "verbal_commit" else 0
        if existing:
            c.execute("""UPDATE investors SET name=?, fund_url=?, logo_url=?, stage=?,
                invested_amount=?, committed_amount=?, updated_at=? WHERE attio_record_id=?""",
                (vc["name"], f"https://{vc['domain']}" if vc['domain'] else None,
                 vc["logo_url"], vc["stage"], invested, committed, int(time.time()), vc["attio_id"]))
            updated += 1
        else:
            passcode = hashlib.sha256(f"{vc['attio_id']}-{time.time()}".encode()).hexdigest()[:6].upper()
            c.execute("""INSERT INTO investors (id, name, fund_url, logo_url, stage, passcode,
                attio_record_id, invested_amount, committed_amount, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (str(uuid.uuid4()), vc["name"], f"https://{vc['domain']}" if vc['domain'] else None,
                 vc["logo_url"], vc["stage"], passcode, vc["attio_id"],
                 invested, committed, int(time.time()), int(time.time())))
            inserted += 1
    conn.commit()
    # Auto-generate share links for ALL visible investors (not closed_lost)
    c.execute("""SELECT i.id, i.name, i.stage FROM investors i
        WHERE i.stage NOT IN ('closed_lost')
        AND NOT EXISTS (SELECT 1 FROM investor_links il WHERE il.investor_id = i.id AND il.revoked=0)""")
    new_links = c.fetchall()
    for row in new_links:
        inv_id, inv_name = row[0], row[1]
        token = str(uuid.uuid4())
        link_id = str(uuid.uuid4())
        sections = json.dumps(['overview','traction','financials','team','legal'])
        c.execute("""INSERT INTO investor_links (id, investor_id, token, sections_visible)
            VALUES (?,?,?,?)""", (link_id, inv_id, token, sections))
        print(f"   🔗 Auto-generated link for {inv_name}: token={token}")
    # Update committed from verbal_commit investors
    verbal_total = c.execute(
        "SELECT COALESCE(SUM(committed_amount),0) FROM investors WHERE stage='verbal_commit'"
    ).fetchone()[0]
    if verbal_total > 0:
        c.execute("UPDATE raise_tracker SET committed_amount=? WHERE id='current'", (verbal_total,))
        print(f"   💰 Updated committed amount: ${verbal_total:,.0f} from verbal commits")
    conn.commit()
    total = c.execute("SELECT COUNT(*) FROM investors").fetchone()[0]
    conn.close()
    return inserted, updated, skipped, total

if __name__ == "__main__":
    print("📡 Fetching VCs from Attio...")
    records = get_vcs(args.attio_key)
    print(f"   Found {len(records)} VC records")
    vcs = [parse_vc(r) for r in records]
    print(f"\n🔄 Syncing to Data Room DB...")
    inserted, updated, skipped, total = sync_to_db(vcs)
    print(f"   ✅ Inserted: {inserted}")
    print(f"   🔄 Updated: {updated}")
    print(f"   ⏭️  Skipped (closed_lost): {skipped}")
    print(f"   📊 Total investors in DB: {total}")
