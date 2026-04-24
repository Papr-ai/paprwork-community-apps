# Investor Data Room — Agent Guide

## What This App Is
This is the **community-publishable version** of the Papr Data Room. It's a full duplicate
of the production data room, intended to be modified for community release.

**DO NOT** modify the original Papr Data Room (b0a164c2-cfe0-415f-88d1-de867d96d337).
All community publishing changes happen HERE in this app (ec08b938).

## Key References
- `ARCHITECTURE.md` — Full technical architecture, design brief, file map
- `PUBLISHING-PLAN.md` — Complete publishing plan with data classification, 
  onboarding design, refactor checklist, and Liquid Glass design system tokens

## Architecture
- **Founder View** — Admin/edit mode for the company building the data room
- **Investor View** — Read-only portal for VCs receiving share links
- **Connector View** — Intro helper view for people facilitating warm intros

## Data Sources
Currently wired to the same Papr data (shared data-sources.json).
When implementing community changes, create a fresh DB with template seed data.

## Jobs Pipeline
- `Data Room DB Setup` (b6d2f0ea) — Schema + seed data
- `Data Room Publish` (686d5ffa) — Bake HTML → deploy to Vercel
- `VC Fit Score Calculator` (0cb673e1) — Compute thesis match scores
- `VC Portfolio Intelligence Builder` (5b59195c) — Build portfolio data
- `VC Portfolio Researcher` (631f1b5d) — Research portfolio companies

## Design System
Liquid Glass — see PUBLISHING-PLAN.md §4 for full token reference.
Dark-only, glass surfaces, SVG icons (no emoji in UI), 14px base typography.
