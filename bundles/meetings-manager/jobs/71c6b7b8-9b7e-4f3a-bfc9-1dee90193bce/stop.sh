#!/bin/bash
# Find the recorder job directory
RECORDER_DIR="$HOME/Papr/jobs/095b6dbf-6096-433c-83d9-e7a66b8e459b"

# Create stop signal file that the recorder watches for
touch "$RECORDER_DIR/data/stop_signal"
echo "Stop signal sent to recorder"

# Wait briefly for recorder to notice
sleep 2

# Verify it stopped
if [ -f "$RECORDER_DIR/data/stop_signal" ]; then
  echo "Stop signal delivered"
fi
