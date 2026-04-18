import sqlite3
from pathlib import Path

DB_DIR = Path(__file__).parent / 'data'
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / 'data.db'

db = sqlite3.connect(str(DB_PATH))
db.executescript('''
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS google_connections (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  picture_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scopes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS google_tokens (
  connection_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES google_connections(id) ON DELETE CASCADE
);
''')

for table in ['google_connections', 'google_tokens']:
    count = db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
    print(f'{table}: {count} rows')

db.close()
print('Schema ready.')
