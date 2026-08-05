// Competitive Analysis data — 2x2 + Market Map (Sleep AI)
window.COMP_DATA = {
  title: 'The circadian intelligence layer.',
  positioning: 'Sleep AI is the circadian intelligence layer \u2014 not an observability tool, not a guardrail, not a retraining pipeline. We manage the rest-wake lifecycle of AI agents. Others monitor what broke. We prevent the break by giving agents the rest they need.',
  axes: {
    x: { label: 'Agent Visibility', low: 'Black Box', high: 'Full Lifecycle' },
    y: { label: 'Reliability Approach', low: 'Reactive', high: 'Preventive' }
  },
  quadrants: [
    { pos: 'bl', label: 'Manual Restart', desc: 'Kill & restart \u2014 loses all learned behavior' },
    { pos: 'br', label: 'Observability', desc: 'Sees everything \u2014 but only after it breaks' },
    { pos: 'tl', label: 'Guardrails', desc: 'Prevents bad outputs \u2014 but not root cause' },
    { pos: 'tr', label: 'Circadian Intelligence', desc: 'Prevents degradation through scheduled rest cycles' }
  ],
  competitors: [
    { name: 'Kill & Restart', logo: null, x: 8, y: 8, note: 'Hard reset \u2014 amnesia, not rest' },
    { name: 'LangSmith', logo: 'langsmith', x: 75, y: 18, note: 'Full trace observability \u2014 tells you what broke, after' },
    { name: 'Langfuse', logo: 'langfuse', x: 65, y: 22, note: 'Open-source observability \u2014 reactive monitoring' },
    { name: 'Guardrails AI', logo: 'guardrails', x: 18, y: 58, note: 'Runtime validation \u2014 catches symptoms, not root cause' },
    { name: 'NeMo Guardrails', logo: 'nvidia', x: 25, y: 65, note: 'NVIDIA\u2019s programmable rails \u2014 prevention at output layer' },
    { name: 'Retraining', logo: null, x: 55, y: 42, note: 'Periodic fine-tuning \u2014 expensive, disruptive, lossy' },
    { name: 'Sleep AI', logo: 'sleepai', x: 80, y: 78, hero: true, note: 'Scheduled rest cycles \u2014 consolidate, prune, wake up sharper' }
  ]
};

window.COMP_MARKET_MAP = {
  title: 'Where Sleep AI sits in the stack',
  rows: [
    { layer: 'Applications', items: ['AI Agents', 'Copilots', 'Autonomous Workflows', 'Enterprise AI'] },
    { layer: 'Orchestration', items: ['LangChain / CrewAI', 'AutoGen', 'Custom frameworks', 'State (Temporal)'] },
    { layer: 'Circadian Intelligence', papr: true, items: ['Sleep Scheduler', 'Dream Engine (consolidation)', 'Wake Analytics'] },
    { layer: 'Reliability', items: ['Guardrails (runtime)', 'Observability (LangSmith)', 'Testing (promptfoo)'] },
    { layer: 'Foundation', items: ['LLMs (GPT, Claude, Llama)', 'Vector stores', 'RAG pipelines', 'Fine-tuning'] }
  ]
};
