# Meetings Manager

AI-powered meeting manager for Paprwork — sync your calendar, prep before meetings, record system audio, transcribe calls, generate adaptive summaries, and sync useful context back into memory.

## What's new in v4.1.0

- Adaptive meeting summaries that change based on meeting type
- Prep flow improvements with live progress and structured prep output
- Recurring-series note handling fixed so future meetings don't inherit old notes
- Notes page simplified to show summary-rich meetings
- Background art stays prominent on Home and subtle elsewhere
- Scroll position preserved during auto-refresh

## Installation

### Option 1: Import from GitHub
Import this bundle in Paprwork with:

```text
github.com/Papr-ai/paprwork-community-apps
subPath: bundles/meetings-manager
```

## Contents

- **App**: Meetings Manager
- **Jobs**: 10 jobs
  - Location Background Generator (python)
  - Calendar Reader (bash)
  - Check Screen Recording Permission (bash)
  - Whisper Transcriber (python)
  - Stop Recorder (bash)
  - System Audio Recorder (bash)
  - Meeting Memory Sync (agent)
  - Meeting Summarizer (agent)
  - Meeting Monitor (bash)
  - Meeting Prep Agent (agent)

## Requirements

- `ANTHROPIC_API_KEY`
- `APOLLO_API_KEY`
- `EXA_API_KEY`
- `GOOGLE_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_PLATFORM_KEY`

## Platform

- macos
- windows
