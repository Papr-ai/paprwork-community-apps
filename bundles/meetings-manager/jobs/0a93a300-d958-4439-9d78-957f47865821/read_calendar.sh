#!/bin/bash
DB=$(for db in ~/Papr/jobs/*/data/data.db; do sqlite3 "$db" "SELECT name FROM sqlite_master WHERE name='meetings'" 2>/dev/null | grep -q meetings && echo "$db" && break; done)
if [ -z "$DB" ]; then echo "ERROR: meetings DB not found"; exit 1; fi
export MEETINGS_DB="$DB"
"$(dirname "$0")/.venv/bin/python" "$(dirname "$0")/read_calendar.py"
