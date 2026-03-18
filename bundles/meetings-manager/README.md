# Meetings Manager

An AI-powered meeting workflow for Paprwork that handles your entire meeting lifecycle — from calendar sync to post-meeting memory.

## What It Does

**Before meetings:** Reads your macOS Calendar, identifies upcoming meetings, and generates AI-powered prep documents with attendee research, prior meeting context, and suggested talking points.

**During meetings:** Record and take notes directly in the app. Your notes are woven into the final summary.

**After meetings:** Automatically summarizes transcripts, generates smart topic tags, and syncs everything (summaries, participants, action items, decisions) to PAPR Memory for future recall.

## The Pipeline

```
Calendar Reader → Meeting Summarizer → Meeting Memory Sync
                    ↗ (on demand)
        Meeting Prep Agent
```

| Job | What It Does | Trigger |
|-----|-------------|---------|
| **Calendar Reader** | Reads macOS Calendar via EventKit, syncs events + attendees to the database | Scheduled / manual |
| **Meeting Summarizer** | Summarizes transcripts, generates topic tags, weaves in your notes | Runs after Calendar Reader |
| **Meeting Memory Sync** | Stores meetings, participants, action items, and decisions to PAPR Memory | Runs after Summarizer |
| **Meeting Prep Agent** | Researches attendees (Apollo/Exa), pulls prior context from Memory, generates prep docs | On demand per meeting |

## Requirements

| Key | Required | Used By |
|-----|----------|---------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Summarizer, Memory Sync, Prep Agent (powers the AI sub-agents) |
| `PAPR_MEMORY_API_KEY` | Optional | Memory Sync (stores meetings/people/decisions to PAPR Memory) |
| `APOLLO_API_KEY` | Optional | Prep Agent (enriches attendee profiles — name, title, company, LinkedIn) |
| `EXA_API_KEY` | Optional | Prep Agent (web search for additional meeting context) |

## Platform

**macOS only** — the Calendar Reader uses Apple's EventKit framework to read calendar events natively. Requires `pyobjc-framework-EventKit`.

## Install

Import via Paprwork's Community Apps tab, or manually:

```
Import App Bundle → ~/PAPR/bundles/meetings-manager
```

After import, add your API keys in Settings → API Keys → Custom API Keys.
