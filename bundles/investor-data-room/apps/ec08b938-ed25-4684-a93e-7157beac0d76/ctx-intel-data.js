// Context Intelligence demo — Sleep AI agent lifecycle visualization
var CTX_CODE_SNIPPETS = {
  coda: '<span class="ck">sleep_policy</span>(<span class="cs">"support_fleet"</span>)\n<span class="ck">class</span> <span class="cn">SupportSleep</span>:\n\n  <span class="ck">@schedule</span>\n  window = <span class="cs">"02:00-06:00 UTC"</span>\n  trigger = context_saturation > <span class="cv">0.80</span>\n\n  <span class="ck">@consolidate</span>\n  memory_replay = <span class="cv">True</span>\n  contradiction_prune = <span class="cv">True</span>\n  drift_check = <span class="cv">True</span>\n\n  <span class="ck">@wake</span>\n  condition = consolidation_complete\n  health_check = hallucination_rate < <span class="cv">0.08</span>',
  autoreview: '<span class="ck">sleep_policy</span>(<span class="cs">"code_review_fleet"</span>)\n<span class="ck">class</span> <span class="cn">ReviewSleep</span>:\n\n  <span class="ck">@trigger</span>\n  every = <span class="cv">500</span> reviews\n  or_when = drift_score > <span class="cv">0.12</span>\n\n  <span class="ck">@dream_engine</span>\n  replay_mode = <span class="cs">"style_patterns"</span>\n  prune = stale_patterns(age > <span class="cv">14</span>d)\n  realign = constitution(<span class="cs">"review_standards.md"</span>)\n\n  <span class="ck">@wake</span>\n  verify = false_positive_rate < <span class="cv">0.10</span>'
};

var CTX_SCHEMAS = {
  coda: {
    name: 'Coda Support',
    industry: 'AI Customer Support',
    nodes: [
      { id: 'agent', label: 'Agent', x: 50, y: 50, type: 'source' },
      { id: 'context', label: 'Context Window', x: 20, y: 35, type: 'entity' },
      { id: 'memory', label: 'Memory Store', x: 80, y: 30, type: 'entity' },
      { id: 'sleep', label: 'Sleep Cycle', x: 55, y: 15, type: 'derived' },
      { id: 'health', label: 'Health Score', x: 30, y: 70, type: 'insight' },
      { id: 'wake', label: 'Wake State', x: 75, y: 70, type: 'insight' }
    ],
    edges: [
      { from: 'agent', to: 'context', label: 'accumulates' },
      { from: 'agent', to: 'memory', label: 'stores_in' },
      { from: 'context', to: 'sleep', label: 'triggers' },
      { from: 'memory', to: 'sleep', label: 'consolidates' },
      { from: 'sleep', to: 'health', label: 'improves' },
      { from: 'sleep', to: 'wake', label: 'produces' },
      { from: 'wake', to: 'agent', label: 'restores' }
    ],
    prediction: { node: 'health', text: 'Hallucination rate: 7.2% (post-sleep)', confidence: '40% reduction' }
  },
  autoreview: {
    name: 'AutoReview',
    industry: 'Autonomous Code Review',
    nodes: [
      { id: 'reviewer', label: 'Review Agent', x: 50, y: 50, type: 'source' },
      { id: 'patterns', label: 'Style Patterns', x: 20, y: 30, type: 'entity' },
      { id: 'constitution', label: 'Constitution', x: 80, y: 30, type: 'entity' },
      { id: 'drift', label: 'Drift Score', x: 25, y: 70, type: 'derived' },
      { id: 'dream', label: 'Dream Engine', x: 55, y: 15, type: 'derived' },
      { id: 'quality', label: 'Review Quality', x: 75, y: 70, type: 'insight' }
    ],
    edges: [
      { from: 'reviewer', to: 'patterns', label: 'learns' },
      { from: 'reviewer', to: 'constitution', label: 'follows' },
      { from: 'patterns', to: 'drift', label: 'measures' },
      { from: 'drift', to: 'dream', label: 'triggers_at_0.12' },
      { from: 'dream', to: 'patterns', label: 'prunes_stale' },
      { from: 'dream', to: 'quality', label: 'restores' },
      { from: 'constitution', to: 'dream', label: 'realigns_to' }
    ],
    prediction: { node: 'quality', text: 'False positive rate: 8% (was 23%)', confidence: '3x consistency' }
  }
};
