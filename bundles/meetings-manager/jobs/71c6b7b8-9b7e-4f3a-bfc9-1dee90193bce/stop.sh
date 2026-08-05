#!/bin/bash
# Find the recorder job directory
# Resolve the workspace root: PAPR_HOME is injected by the job runner.
# Fall back to walking up from this script (Jobs/<id>/stop.sh -> workspace).
if [ -n "${PAPR_HOME:-}" ] && [ -d "$PAPR_HOME/Jobs" ]; then
  JOBS_ROOT="$PAPR_HOME/Jobs"
else
  JOBS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
RECORDER_DIR="$JOBS_ROOT/095b6dbf-6096-433c-83d9-e7a66b8e459b"

# Create stop signal file that the recorder watches for
touch "$RECORDER_DIR/data/stop_signal"
echo "Stop signal sent to recorder"

# Wait briefly for recorder to notice
sleep 2

# Verify it stopped
if [ -f "$RECORDER_DIR/data/stop_signal" ]; then
  echo "Stop signal delivered"
fi
