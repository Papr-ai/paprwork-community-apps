import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

import requests

DB_PATH = os.environ.get('GOOGLE_CONNECTOR_DB', '').strip()
CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()

if not all([DB_PATH, CLIENT_ID, CLIENT_SECRET]):
    missing = [k for k,v in {'GOOGLE_CONNECTOR_DB':DB_PATH,'GOOGLE_CLIENT_ID':CLIENT_ID,'GOOGLE_CLIENT_SECRET':CLIENT_SECRET}.items() if not v]
    print(f"Missing: {', '.join(missing)}"); sys.exit(1)

db = sqlite3.connect(DB_PATH)
db.row_factory = sqlite3.Row

threshold = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
rows = db.execute('''
    SELECT t.connection_id, t.refresh_token, c.email
    FROM google_tokens t JOIN google_connections c ON c.id = t.connection_id
    WHERE t.refresh_token IS NOT NULL AND t.expires_at < ? AND c.status = 'connected'
''', (threshold,)).fetchall()

if not rows:
    print("No tokens need refreshing.")
    db.close()
    sys.exit(0)

for row in rows:
    print(f"Refreshing {row['email']}...")
    try:
        r = requests.post('https://oauth2.googleapis.com/token', data={
            'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
            'refresh_token': row['refresh_token'], 'grant_type': 'refresh_token'})
        r.raise_for_status()
        d = r.json()
        exp = (datetime.now(timezone.utc) + timedelta(seconds=d.get('expires_in', 3600))).isoformat()
        now = datetime.now(timezone.utc).isoformat()
        db.execute('UPDATE google_tokens SET access_token=?,expires_at=?,updated_at=? WHERE connection_id=?',
                   (d['access_token'], exp, now, row['connection_id']))
        db.commit()
        print(f"  Refreshed. Expires: {exp}")
    except Exception as e:
        now = datetime.now(timezone.utc).isoformat()
        db.execute("UPDATE google_connections SET status='error',updated_at=? WHERE id=?",
                   (now, row['connection_id']))
        db.commit()
        print(f"  Failed: {e}")

db.close()
print("Done.")
