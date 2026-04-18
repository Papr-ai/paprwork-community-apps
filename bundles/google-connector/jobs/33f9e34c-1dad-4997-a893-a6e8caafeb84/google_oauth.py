import http.server
import os
import sqlite3
import sys
import threading
import time
import urllib.parse
import webbrowser
from datetime import datetime, timedelta, timezone

import requests

PORT = 8765
REDIRECT_URI = f'http://127.0.0.1:{PORT}/google-oauth-callback'
DB_PATH = os.environ.get('GOOGLE_CONNECTOR_DB', '').strip()
CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()
SCOPES = 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file'

missing = [k for k, v in {'GOOGLE_CONNECTOR_DB': DB_PATH, 'GOOGLE_CLIENT_ID': CLIENT_ID, 'GOOGLE_CLIENT_SECRET': CLIENT_SECRET}.items() if not v]
if missing:
    print(f"Missing: {', '.join(missing)}")
    sys.exit(1)

auth_code = None
auth_error = None
done = threading.Event()

OK_HTML = b'<html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f0fdf4"><div style="text-align:center"><h1 style="color:#16a34a">Connected!</h1><p style="color:#64748b">You can close this tab and return to Paprwork.</p></div></body></html>'
ERR_HTML = b'<html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#fef2f2"><div style="text-align:center"><h1 style="color:#dc2626">Error</h1><p style="color:#64748b">Authentication was denied.</p></div></body></html>'

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code, auth_error
        p = urllib.parse.urlparse(self.path)
        if p.path != '/google-oauth-callback':
            self.send_response(404); self.end_headers(); return
        qs = urllib.parse.parse_qs(p.query)
        if 'error' in qs:
            auth_error = qs['error'][0]
            self.send_response(200); self.send_header('Content-Type','text/html'); self.end_headers()
            self.wfile.write(ERR_HTML); done.set(); return
        code = qs.get('code', [None])[0]
        if code:
            auth_code = code
            self.send_response(200); self.send_header('Content-Type','text/html'); self.end_headers()
            self.wfile.write(OK_HTML); done.set()
        else:
            self.send_response(400); self.end_headers()
    def log_message(self, *a): pass

def exchange(code):
    r = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code, 'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI, 'grant_type': 'authorization_code'})
    r.raise_for_status()
    return r.json()

def get_profile(token):
    r = requests.get('https://www.googleapis.com/oauth2/v2/userinfo',
                     headers={'Authorization': f'Bearer {token}'})
    r.raise_for_status()
    return r.json()

def store(td, user):
    cid = 'google:primary'
    now = datetime.now(timezone.utc).isoformat()
    exp = (datetime.now(timezone.utc) + timedelta(seconds=td.get('expires_in', 3600))).isoformat()
    db = sqlite3.connect(DB_PATH)
    db.execute('PRAGMA foreign_keys = ON')
    db.execute('''INSERT INTO google_connections(id,email,display_name,picture_url,status,scopes,created_at,updated_at)
        VALUES(?1,?2,?3,?4,'connected',?5,?6,?6) ON CONFLICT(id) DO UPDATE SET
        email=?2,display_name=?3,picture_url=?4,status='connected',scopes=?5,updated_at=?6''',
        (cid, user.get('email',''), user.get('name',''), user.get('picture',''), SCOPES, now))
    db.execute('''INSERT INTO google_tokens(connection_id,access_token,refresh_token,token_type,expires_at,updated_at)
        VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(connection_id) DO UPDATE SET
        access_token=?2,refresh_token=COALESCE(?3,google_tokens.refresh_token),token_type=?4,expires_at=?5,updated_at=?6''',
        (cid, td['access_token'], td.get('refresh_token'), td.get('token_type','Bearer'), exp, now))
    db.commit(); db.close()
    print(f"Connected: {user.get('email')} ({user.get('name','')})")

# Mark pending
cid = 'google:primary'
now = datetime.now(timezone.utc).isoformat()
db = sqlite3.connect(DB_PATH)
db.execute('PRAGMA foreign_keys = ON')
db.execute('''INSERT INTO google_connections(id,email,display_name,picture_url,status,scopes,created_at,updated_at)
    VALUES(?1,'','','','pending',?2,?3,?3) ON CONFLICT(id) DO UPDATE SET status='pending',updated_at=?3''',
    (cid, SCOPES, now))
db.commit(); db.close()

# Start server
try:
    srv = http.server.HTTPServer(('127.0.0.1', PORT), H)
except OSError as e:
    print(f"Port {PORT} busy: {e}"); sys.exit(1)
srv.timeout = 1
print(f"OAuth server on port {PORT}")

# Open browser
params = urllib.parse.urlencode({
    'client_id': CLIENT_ID, 'redirect_uri': REDIRECT_URI,
    'response_type': 'code', 'scope': SCOPES,
    'access_type': 'offline', 'prompt': 'consent select_account'})
webbrowser.open(f'https://accounts.google.com/o/oauth2/v2/auth?{params}')
print("Browser opened — waiting for sign-in...")

# Wait max 5 min
deadline = time.time() + 300
while not done.is_set() and time.time() < deadline:
    srv.handle_request()
srv.server_close()

if auth_code:
    print("Exchanging code...")
    td = exchange(auth_code)
    u = get_profile(td['access_token'])
    store(td, u)
    print("Done!")
elif auth_error:
    db = sqlite3.connect(DB_PATH)
    db.execute("UPDATE google_connections SET status='error',updated_at=? WHERE id='google:primary'",
               (datetime.now(timezone.utc).isoformat(),))
    db.commit(); db.close()
    print(f"Auth denied: {auth_error}"); sys.exit(1)
else:
    db = sqlite3.connect(DB_PATH)
    db.execute("UPDATE google_connections SET status='error',updated_at=? WHERE id='google:primary'",
               (datetime.now(timezone.utc).isoformat(),))
    db.commit(); db.close()
    print("Timed out (5 min)"); sys.exit(1)
