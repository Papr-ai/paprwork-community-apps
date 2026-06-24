#!/usr/bin/env python3
"""Backfill viral_score_v2 on all existing tweets."""
import sys, sqlite3
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from main import compute_viral_score_v2

DB = Path(__file__).parent.parent / "data" / "data.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

cols = [r[1] for r in conn.execute("PRAGMA table_info(tweets)")]
if "viral_score_v2" not in cols:
    conn.execute("ALTER TABLE tweets ADD COLUMN viral_score_v2 REAL DEFAULT 0")
    conn.commit()

rows = conn.execute("""
    SELECT id, like_count, retweet_count, reply_count,
           (julianday('now') - julianday(COALESCE(created_at_iso, fetched_at))) * 24 as real_hours
    FROM tweets
""").fetchall()

print(f"Backfilling {len(rows)} tweets...")
for r in rows:
    hours = r["real_hours"] if r["real_hours"] is not None else 999
    td = {"likeCount": r["like_count"] or 0, "retweetCount": r["retweet_count"] or 0, "replyCount": r["reply_count"] or 0}
    v2 = compute_viral_score_v2(td, hours)
    conn.execute("UPDATE tweets SET viral_score_v2 = ? WHERE id = ?", (v2, r["id"]))

conn.commit()

stats = conn.execute("""
    SELECT COUNT(*) as total,
           SUM(CASE WHEN viral_score_v2 > 0 THEN 1 ELSE 0 END) as nonzero,
           ROUND(MAX(viral_score_v2), 1) as max_v2,
           ROUND(AVG(CASE WHEN viral_score_v2 > 0 THEN viral_score_v2 END), 1) as avg_nz
    FROM tweets
""").fetchone()
print(f"Done. nonzero v2: {stats['nonzero']}/{stats['total']}  max: {stats['max_v2']}  avg(nz): {stats['avg_nz']}")

print("\nTop 5 by v2:")
for r in conn.execute("""
    SELECT substr(text,1,80) as t, author_username as u, like_count as l, retweet_count as rt,
           ROUND(viral_score_v2,1) as v2, ROUND(viral_score,1) as v1,
           ROUND((julianday('now') - julianday(COALESCE(created_at_iso, fetched_at)))*24, 1) as hrs
    FROM tweets WHERE viral_score_v2 > 0 ORDER BY viral_score_v2 DESC LIMIT 5
"""):
    print(f"  v2={r['v2']} v1={r['v1']} hrs={r['hrs']} L={r['l']} RT={r['rt']} @{r['u']}")
    print(f"    {r['t']}")

conn.close()
