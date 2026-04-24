// Room data — Template fallback (Sleep AI example)
// In Paprwork, data loads from SQLite via db-queries.js — this is just fallback
if (!window.ROOM_DATA || !window.ROOM_DATA.company) window.ROOM_DATA = {
  company: {
    name: 'Sleep AI',
    tagline: 'Give your AI agents the rest they need to think better',
    overview: 'Humans sleep 8 hours a day — and it is the single most important process for memory consolidation, pattern recognition, and cognitive health. AI agents run 24/7 and it is destroying their performance. Sleep AI introduces scheduled rest cycles for AI systems: downtime where agents consolidate learnings, prune bad patterns, strengthen useful connections, and wake up sharper.',
    stage: 'Pre-Seed',
    raised: '$0',
    ask: '$3M',
    mission: 'Build the circadian infrastructure for artificial intelligence.',
    bhag: 'Every AI agent on the planet sleeps by 2032.',
    values: ['Rest is productive', 'Ship fast, sleep well', 'Neuroscience-first', 'Build for 10B agents'],
  },
  sections: [
    { id:'overview', label: 'Company Overview', docs: [
      { name: 'Pitch Deck', desc: 'The case for why AI agents need rest' },
      { name: 'One-Pager', desc: 'Executive summary — the Sleep Protocol' },
      { name: 'Product Demo', desc: 'Sleep dashboard and Dream Engine walkthrough' },
      { name: 'FAQ', desc: 'Top investor questions answered' },
      { name: 'Investment Memo', desc: 'Detailed thesis on agent rest cycles' },
    ]},
    { id:'traction', label: 'Traction & Market', docs: [
      { name: 'Customer Data', desc: 'Design partner results: Coda + AutoReview' },
      { name: 'Ideal Customer Profile', desc: 'Companies running 50+ agents in production' },
      { name: 'Competitive Analysis', desc: 'Creating a new category — no direct competitors' },
      { name: 'Moat & Defensibility', desc: 'Neuroscience IP, data network effects, integration depth' },
      { name: 'Go-to-Market Strategy', desc: 'Bottom-up developer adoption' },
    ]},
    { id:'financials', label: 'Financials', docs: [
      { name: 'Financial Model', desc: '$0.002/sleep cycle usage model' },
      { name: 'Use of Funds', desc: '$3M allocation breakdown' },
    ]},
    { id:'team', label: 'Team & Cap Table', docs: [
      { name: 'Cap Table', desc: 'Three co-founders, clean structure' },
    ]},
    { id:'legal', label: 'Legal Documentation', docs: [
      { name: 'Entity Formation Documents', desc: 'Delaware C-Corp, NVCA-compliant' },
      { name: 'Customer & Partner Contracts', desc: 'Design partner agreements' },
      { name: 'Intellectual Property', desc: 'Patent pending on computational sleep algorithms' },
      { name: 'Tax Filings', desc: 'Incorporated Q1 2025' },
    ]},
  ],
  team: [
    { name: 'Dr. Luna Park', role: 'CEO & Co-founder', bio: 'Former Stanford Sleep Lab. PhD computational neuroscience. 8 papers on sleep-dependent learning.', linkedin: '', photo: null },
    { name: 'Kai Nakamura', role: 'CTO & Co-founder', bio: 'Former Anthropic senior engineer. Built context management for Claude agents.', linkedin: '', photo: null },
    { name: 'Maya Santos', role: 'COO & Co-founder', bio: 'Former Bain consultant. Harvard MBA. Scaled two AI startups.', linkedin: '', photo: null },
  ],
  pitch_deck: null,
  one_pager: "# Sleep AI — One Pager\n\nGive Your AI Agents the Rest They Need to Think Better\n\n## Problem\nAI agents run 24/7 and performance degrades: hallucinations compound, context overflows, behavior drifts.\n\n## Solution\nScheduled rest cycles — sleep windows where agents consolidate memory, prune errors, and realign behavior.\n\n## Traction\n2 design partners, $45K ACV, 40% hallucination reduction, 100% retention.\n\n## Team\nStanford Sleep Lab + Anthropic + Bain\n\n## The Ask\n$3M Pre-Seed → 18 months to $500K ARR",
  raise: { target: 3000000, raised: 0, committed: 0, stage: 'Pre-Seed' },
};
