#!/usr/bin/env python3
"""X Feed Fetcher v4 — Bird CLI with freshness & viral detection

Fetches:
1. Home timeline (curated by X algorithm)
2. Topic searches (AI/agents/memory/PLG)
3. YOUR OWN recent tweets (replies+quotes) → stored as style examples for scorer

Key improvements over v3:
- Stores created_at_iso for dynamic freshness (no more frozen hours_old)
- Computes viral_score for early-signal detection
- Auto-expires stale tweets (>48h) on each run
- Resolves bird CLI path from venv/nvm
"""
import os, sys, json, sqlite3, subprocess, logging, math, shutil
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

JOB_DIR = Path(os.environ.get('JOB_DIR', Path(__file__).parent.parent))
DB_PATH = JOB_DIR / "data" / "data.db"

# Auth tokens: prefer CLI args, fallback to env vars
AUTH_TOKEN = ''
CT0 = ''
def _parse_auth():
    global AUTH_TOKEN, CT0
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--auth-token', default=os.environ.get('X_AUTH_TOKEN', ''))
    parser.add_argument('--ct0', default=os.environ.get('X_CT0', ''))
    args, _ = parser.parse_known_args()
    AUTH_TOKEN = args.auth_token
    CT0 = args.ct0
_parse_auth()

# ── Resolve bird CLI path ────────────────────────────────
def find_bird():
    """Find bird CLI: check venv, nvm nodes, PATH."""
    # 1. Job's own venv
    venv_bird = JOB_DIR / ".venv" / "bin" / "bird"
    if venv_bird.exists():
        return str(venv_bird)
    # 2. NVM node versions (newest first)
    nvm_dir = Path.home() / ".nvm" / "versions" / "node"
    if nvm_dir.exists():
        for d in sorted(nvm_dir.iterdir(), reverse=True):
            b = d / "bin" / "bird"
            if b.exists():
                return str(b)
    # 3. System PATH
    found = shutil.which("bird")
    if found:
        return found
    return "bird"  # fallback — will fail with clear error

BIRD_PATH = find_bird()
log.info(f"Using bird CLI: {BIRD_PATH}")

def detect_x_username():
    """Auto-detect X handle via bird whoami."""
    import re
    try:
        result = subprocess.run([BIRD_PATH, 'whoami'], capture_output=True, text=True, timeout=15)
        for line in result.stdout.splitlines():
            m = re.search(r'@(\w+)', line)
            if m:
                return m.group(1)
    except Exception as e:
        log.warning(f'bird whoami failed: {e}')
    return os.environ.get('X_USERNAME', 'amirkabbara')

YOUR_USERNAME = detect_x_username()
log.info(f'Detected X username: @{YOUR_USERNAME}')

DEFAULT_TOPICS = [
    "AI agents memory", "LLM memory RAG", "agent infrastructure",
    "AI developer tools", "open source AI", "building AI startup",
    "developer PLG growth", "AI agents 2025", "LLM application",
]
FETCH_PER_TOPIC = 8

def parse_twitter_date(date_str):
    """Parse Twitter's date format to ISO 8601 UTC string.
    Input:  'Sat Jun 13 11:44:01 +0000 2026'
    Output: '2026-06-13T11:44:01Z'
    """
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, '%a %b %d %H:%M:%S %z %Y')
        return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        return None

def compute_viral_score(tweet_data, real_hours_old):
    """V1 (legacy) score 0-100: likelihood this tweet is about to blow up.
    Weights early signal, reply heat, retweet momentum, and freshness."""
    reply_c = int(tweet_data.get('replyCount') or tweet_data.get('reply_count') or 0)
    rt_c = int(tweet_data.get('retweetCount') or tweet_data.get('retweet_count') or 0)
    like_c = int(tweet_data.get('likeCount') or tweet_data.get('like_count') or 0)

    eng = reply_c * 3 + rt_c * 2 + like_c
    velocity = eng / max(real_hours_old, 0.25)

    # Freshness multiplier (exponential decay)
    if real_hours_old < 1:      fresh = 5.0
    elif real_hours_old < 3:    fresh = 3.0
    elif real_hours_old < 6:    fresh = 2.0
    elif real_hours_old < 12:   fresh = 1.0
    elif real_hours_old < 24:   fresh = 0.5
    else:                       fresh = 0.1

    # Reply heat: high reply:like ratio = discussion magnet
    reply_heat = min((reply_c / max(like_c, 1)) * 20, 30)

    # Early signal bonus: any engagement < 2h old is premium
    early_bonus = 50 if (real_hours_old < 2 and eng > 3) else 0

    # Retweet momentum
    rt_signal = min(rt_c * 5, 40)

    raw = (velocity * fresh) + reply_heat + early_bonus + rt_signal
    return min(round(raw, 1), 100.0)


def compute_viral_score_v2(tweet_data, real_hours_old):
    """V2 — research-grounded viral prediction. Refs:
    - Cheng et al. WWW 2014 (early-velocity dominates)
    - Zhao et al. SEISMIC KDD 2015 (log-transform engagement, hyperbolic decay)
    - Cao et al. DeepHawkes CIKM 2017 (piecewise time decay)
    - Martin et al. WWW 2016 (author baseline; ceiling on predictability)

    Score range: 0-100. Hard zero for tweets >48h old (verdict in, not predictive).
    """
    reply_c = int(tweet_data.get('replyCount') or tweet_data.get('reply_count') or 0)
    rt_c = int(tweet_data.get('retweetCount') or tweet_data.get('retweet_count') or 0)
    like_c = int(tweet_data.get('likeCount') or tweet_data.get('like_count') or 0)

    # Hard cutoff: >48h is post-hoc, not predictive
    if real_hours_old > 48:
        return 0.0

    # Step 1: log-transformed weighted engagement (Zhao 2015 power-law)
    # replies count most (Cheng — discussion signal), RTs next (spread), likes lowest (passive)
    raw_eng = like_c + 2 * rt_c + 3 * reply_c
    eng = math.log1p(raw_eng)

    # Step 2: velocity with log-denom (SEISMIC hyperbolic infectiousness ~ 1/(t+c))
    hours = max(real_hours_old, 0.25)
    velocity = eng / math.log1p(hours)  # log denom dampens long tail

    # Step 3: piecewise time-window multiplier (DeepHawkes)
    if hours < 1:    freshness = 3.0   # launch window
    elif hours < 4:  freshness = 2.0   # peak detection zone
    elif hours < 12: freshness = 1.0   # baseline
    else:            freshness = 0.3   # post-peak, less predictive

    # Step 4: reply ratio = discussion magnet (Cheng)
    reply_ratio = reply_c / max(like_c + rt_c, 1)
    discussion_bonus = min(reply_ratio, 0.5) * 4  # cap at 2.0

    # Step 5: early-spike bonus (Cheng — first-N-reshare timing)
    early_spike = 0.0
    if hours < 2 and (like_c + rt_c) > 5:
        early_spike = min((like_c + rt_c) / hours, 100) / 20  # cap at 5.0

    raw = (velocity * freshness) + discussion_bonus + early_spike
    # Scale to ~0-100 range (typical raw is 0-25)
    return min(round(raw * 4.0, 1), 100.0)

def setup_database():
    (JOB_DIR / "data").mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tweets (
            id TEXT PRIMARY KEY, text TEXT NOT NULL,
            author_username TEXT, author_name TEXT, author_id TEXT,
            created_at TEXT, reply_count INTEGER DEFAULT 0,
            retweet_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0,
            conversation_id TEXT, in_reply_to_id TEXT, media_url TEXT,
            search_topic TEXT, source TEXT DEFAULT 'search',
            score REAL DEFAULT 0, score_reason TEXT, status TEXT DEFAULT 'new',
            draft_reply TEXT, fetched_at TEXT DEFAULT (datetime('now')),
            acted_at TEXT, author_profile_image TEXT,
            score_type TEXT DEFAULT 'give_value', draft_quote TEXT,
            papr_context TEXT, scored_at TEXT,
            velocity_score REAL DEFAULT 0, hours_old REAL DEFAULT 0,
            created_at_iso TEXT, viral_score REAL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS mentions (
            id TEXT PRIMARY KEY, text TEXT NOT NULL,
            author_username TEXT, author_name TEXT, author_id TEXT,
            created_at TEXT, reply_count INTEGER DEFAULT 0,
            retweet_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0,
            conversation_id TEXT, in_reply_to_id TEXT,
            status TEXT DEFAULT 'new', draft_reply TEXT,
            fetched_at TEXT DEFAULT (datetime('now')), acted_at TEXT
        );
        CREATE TABLE IF NOT EXISTS my_style_tweets (
            id TEXT PRIMARY KEY, text TEXT NOT NULL,
            tweet_type TEXT DEFAULT 'original',
            like_count INTEGER DEFAULT 0, retweet_count INTEGER DEFAULT 0,
            reply_count INTEGER DEFAULT 0, engagement INTEGER DEFAULT 0,
            created_at TEXT, fetched_at TEXT DEFAULT (datetime('now')),
            quoted_tweet_text TEXT, in_reply_to_text TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tweets_status ON tweets(status);
        CREATE INDEX IF NOT EXISTS idx_tweets_score ON tweets(score DESC);
        CREATE INDEX IF NOT EXISTS idx_style_eng ON my_style_tweets(engagement DESC);
    """)
    # Seed default topics if none exist
    existing = conn.execute("SELECT value FROM settings WHERE key='topics'").fetchone()
    if not existing:
        conn.execute("INSERT INTO settings (key, value) VALUES ('topics', ?)",
                     (json.dumps(DEFAULT_TOPICS),))
    conn.commit()
    # Migration: add new columns to existing DBs
    for col, typ, default in [
        ('created_at_iso', 'TEXT', None),
        ('viral_score', 'REAL DEFAULT 0', None),
        ('viral_score_v2', 'REAL DEFAULT 0', None),
    ]:
        try:
            stmt = f"ALTER TABLE tweets ADD COLUMN {col} {typ}"
            if default: stmt += f" DEFAULT {default}"
            conn.execute(stmt)
            log.info(f"Migration: added column {col}")
        except sqlite3.OperationalError:
            pass  # already exists
    conn.commit()
    return conn

def load_topics(conn):
    """Load search topics from settings table, fallback to defaults."""
    row = conn.execute("SELECT value FROM settings WHERE key='topics'").fetchone()
    if row:
        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            pass
    return DEFAULT_TOPICS

def run_bird(args):
    cmd = [BIRD_PATH] + args + ["--json"]
    if AUTH_TOKEN: cmd += ["--auth-token", AUTH_TOKEN]
    if CT0: cmd += ["--ct0", CT0]
    log.info(f"Running: bird {args[0]} ...")
    try:
        env = os.environ.copy()
        # Find newest NVM node for bird CLI compatibility
        nvm_dir = Path.home() / ".nvm" / "versions" / "node"
        nvm_bins = sorted(nvm_dir.iterdir(), reverse=True) if nvm_dir.exists() else []
        nvm_path = str(nvm_bins[0] / "bin") + ":" if nvm_bins else ""
        env["PATH"] = nvm_path + "/usr/local/bin:/opt/homebrew/bin:" + env.get("PATH", "")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode != 0:
            log.warning(f"bird exit {result.returncode}: {result.stderr[:200]}")
            return []
        if not result.stdout.strip(): return []
        raw = json.loads(result.stdout)
        if isinstance(raw, dict):
            return raw.get("tweets", raw.get("results", []))
        return raw
    except subprocess.TimeoutExpired:
        log.warning("bird timed out"); return []
    except json.JSONDecodeError as e:
        log.warning(f"JSON parse failed: {e}"); return []

AI_KEYWORDS = {
    'ai', 'llm', 'agent', 'agents', 'memory', 'rag', 'model', 'gpt', 'claude',
    'openai', 'anthropic', 'ml', 'machine learning', 'neural',
    'embedding', 'vector', 'inference', 'prompt', 'token', 'context',
    'papr', 'developer', 'dev tools', 'open source', 'github', 'api', 'sdk',
    'startup', 'founder', 'building', 'ship', 'product', 'saas', 'plg',
    'mcp', 'agentic', 'autonomous', 'workflow', 'automation', 'code',
    'software', 'engineer', 'tech', 'data', 'compute', 'gpu', 'cursor',
}

def is_ai_relevant(text):
    return any(kw in text.lower() for kw in AI_KEYWORDS)

def compute_scores(t):
    """Returns (velocity, hours_old, iso_date, viral_score, viral_score_v2)."""
    now = datetime.now(timezone.utc)
    created_str = t.get("createdAt", "")
    hours_old = 999.0
    iso_date = None
    try:
        if created_str:
            try: dt = datetime.strptime(created_str, "%a %b %d %H:%M:%S %z %Y")
            except ValueError:
                dt = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
            hours_old = (now - dt).total_seconds() / 3600
            iso_date = dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception: pass
    likes = t.get("likeCount", 0) or 0
    rts = t.get("retweetCount", 0) or 0
    replies = t.get("replyCount", 0) or 0
    total_eng = likes + rts * 2 + replies * 3
    if hours_old < 1: mult = 10.0
    elif hours_old < 2: mult = 5.0
    elif hours_old < 6: mult = 2.0
    elif hours_old < 24: mult = 1.0
    else: mult = max(0.1, 0.3 * math.exp(-0.02 * (hours_old - 24)))
    reply_ratio = replies / max(likes, 1)
    reply_bonus = min(2.0, 1.0 + reply_ratio * 3)
    velocity = (total_eng / max(hours_old, 0.25)) * mult * reply_bonus
    v_score = compute_viral_score(t, hours_old)
    v2_score = compute_viral_score_v2(t, hours_old)
    return velocity, hours_old, iso_date, v_score, v2_score

def insert_tweet(conn, t, source, topic=""):
    tid = t.get("id", "")
    if not tid: return False
    text = t.get("text", "")
    if not is_ai_relevant(text): return False
    media_url = None
    if t.get("media") and len(t["media"]) > 0:
        media_url = t["media"][0].get("url", "")
    velocity, hours_old, iso_date, v_score, v2_score = compute_scores(t)
    author = t.get("author", {})
    try:
        conn.execute("""INSERT OR IGNORE INTO tweets
            (id, text, author_username, author_name, author_id, created_at, created_at_iso,
             reply_count, retweet_count, like_count, conversation_id,
             in_reply_to_id, media_url, search_topic, source, velocity_score, hours_old, viral_score, viral_score_v2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tid, text, author.get("username", ""), author.get("name", ""),
             t.get("authorId", ""), t.get("createdAt", ""), iso_date,
             t.get("replyCount", 0), t.get("retweetCount", 0),
             t.get("likeCount", 0), t.get("conversationId", ""),
             t.get("inReplyToStatusId", ""), media_url, topic, source, velocity, hours_old, v_score, v2_score))
        return True
    except Exception as e:
        log.warning(f"Insert error {tid}: {e}"); return False

def fetch_my_style_tweets(conn, count=40):
    """Fetch YOUR recent tweets - replies/quotes become style examples for scorer"""
    log.info("Fetching your recent tweets for style examples...")
    tweets = run_bird(["user-tweets", YOUR_USERNAME, "-n", str(count)])
    inserted = 0
    for t in tweets:
        tid = t.get("id", "")
        text = t.get("text", "")
        if not tid or text.startswith("RT @"): continue
        likes = t.get("likeCount", 0) or 0
        rts = t.get("retweetCount", 0) or 0
        replies = t.get("replyCount", 0) or 0
        eng = likes + rts * 2 + replies * 3
        is_reply = bool(t.get("inReplyToStatusId")) or text.startswith("@")
        is_quote = bool(t.get("quotedTweet"))
        tweet_type = "quote" if is_quote else ("reply" if is_reply else "original")
        quoted_text = t.get("quotedTweet", {}).get("text", "")[:500] if t.get("quotedTweet") else ""
        try:
            conn.execute("""INSERT OR REPLACE INTO my_style_tweets
                (id, text, tweet_type, like_count, retweet_count, reply_count,
                 engagement, created_at, quoted_tweet_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tid, text, tweet_type, likes, rts, replies, eng, t.get("createdAt", ""), quoted_text))
            inserted += 1
        except Exception as e:
            log.warning(f"Style insert error {tid}: {e}")
    conn.commit()
    log.info(f"Stored {inserted} style tweets")
    return inserted

def fetch_home(conn, count=20):
    tweets = run_bird(["home", "-n", str(count)])
    inserted = sum(1 for t in tweets if insert_tweet(conn, t, "home", "timeline"))
    conn.commit()
    log.info(f"Home timeline: {inserted} new AI-relevant tweets")
    return inserted

def fetch_search(conn, topic, count=FETCH_PER_TOPIC):
    tweets = run_bird(["search", topic, "-n", str(count)])
    inserted = sum(1 for t in tweets if insert_tweet(conn, t, "search", topic))
    conn.commit()
    log.info(f"Search '{topic}': {inserted} new")
    return inserted

def fetch_mentions(conn, count=15):
    tweets = run_bird(["mentions", "-n", str(count)])
    inserted = 0
    for t in tweets:
        tid = t.get("id", "")
        if not tid: continue
        author = t.get("author", {})
        try:
            conn.execute("""INSERT OR IGNORE INTO mentions
                (id, text, author_username, author_name, author_id, created_at,
                 reply_count, retweet_count, like_count, conversation_id, in_reply_to_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tid, t.get("text", ""), author.get("username", ""), author.get("name", ""),
                 t.get("authorId", ""), t.get("createdAt", ""),
                 t.get("replyCount", 0), t.get("retweetCount", 0),
                 t.get("likeCount", 0), t.get("conversationId", ""),
                 t.get("inReplyToStatusId", "")))
            inserted += 1
        except Exception: pass
    conn.commit()
    log.info(f"Mentions: {inserted} new")
    return inserted

def cleanup_old(conn, days=3):
    """Expire stale tweets: mark >14d as 'expired', delete >30 days."""
    # 1. Expire tweets older than 48h that haven't been acted on
    conn.execute("""UPDATE tweets SET status='expired'
        WHERE status IN ('new','scored') AND created_at_iso IS NOT NULL
        AND created_at_iso < datetime('now', '-14 days')""")
    expired = conn.execute("SELECT changes()").fetchone()[0]
    if expired: log.info(f"Expired {expired} stale tweets (>14d old)")

    # 2. Also backfill created_at_iso for old tweets that don't have it
    rows = conn.execute("SELECT id, created_at FROM tweets WHERE created_at_iso IS NULL AND created_at IS NOT NULL").fetchall()
    for tid, ca in rows:
        iso = parse_twitter_date(ca)
        if iso:
            conn.execute("UPDATE tweets SET created_at_iso=? WHERE id=?", (iso, tid))
    if rows: log.info(f"Backfilled created_at_iso for {len(rows)} tweets")

    # 3. Delete very old unacted tweets (>7 days)
    conn.execute("DELETE FROM tweets WHERE status IN ('new','expired') AND score=0 AND fetched_at < datetime('now', ?)", (f'-{days} days',))
    deleted = conn.execute("SELECT changes()").fetchone()[0]
    conn.commit()
    if deleted: log.info(f"Cleaned up {deleted} old unscored tweets (>{days}d)")

def main():
    if not AUTH_TOKEN or not CT0:
        log.error("X_AUTH_TOKEN and X_CT0 required"); sys.exit(1)
    conn = setup_database()
    total = 0
    topics = load_topics(conn)
    log.info(f'Using {len(topics)} search topics')
    fetch_my_style_tweets(conn, count=40)
    total += fetch_home(conn, count=20)
    for topic in topics:
        total += fetch_search(conn, topic)
    fetch_mentions(conn)
    cleanup_old(conn, days=3)
    new_count = conn.execute("SELECT COUNT(*) FROM tweets WHERE status='new'").fetchone()[0]
    style_count = conn.execute("SELECT COUNT(*) FROM my_style_tweets").fetchone()[0]
    log.info(f"Done! {total} new tweets fetched. {new_count} total new in DB. {style_count} style examples.")
    conn.close()

if __name__ == "__main__":
    main()
