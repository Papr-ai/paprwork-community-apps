// Moat & Defensibility data — Sleep AI
window.MOAT_DATA = {
  title: 'Moat & Long-Term Defensibility',
  headline: 'Each customer builds its own sleep policy.\nSleep AI compounds the science underneath.',
  thesis: 'Customers keep their proprietary agent configurations, domain knowledge, and behavioral constitutions. Sleep AI compounds the consolidation intelligence \u2014 learning which sleep patterns work across agent types, workloads, and domains. We don\u2019t reuse customer data. We reuse the science of rest.',
  // Tab 1 — Customer Use-Cases
  verticals: [
    {
      sector: 'AI Customer Support',
      icon: 'shield',
      customer: 'Coda',
      tagline: '200 support agents handling 50K tickets/month',
      keeps: [
        { label: 'Customer knowledge base', desc: 'Product docs, escalation trees, persona rules' },
        { label: 'Conversation history', desc: 'Ticket context, resolution patterns, CSAT data' },
        { label: 'Sleep schedule', desc: 'Custom 2am\u20136am windows tuned to ticket volume' }
      ],
      learns: [
        { label: 'Consolidation patterns', desc: 'Support agents need 4h sleep / 20h wake (optimal)' },
        { label: 'Hallucination signatures', desc: 'Context pollution onset at ~8K interactions' },
        { label: 'Drift detection model', desc: 'Persona drift measurable after 72h continuous' }
      ]
    },
    {
      sector: 'Autonomous Code Review',
      icon: 'code',
      customer: 'AutoReview',
      tagline: '50 code review agents across 12 repos',
      keeps: [
        { label: 'Style guidelines', desc: 'Repo-specific linting rules, naming conventions' },
        { label: 'Codebase context', desc: 'Architecture patterns, tech debt locations' },
        { label: 'Review constitution', desc: 'What to flag, what to approve, severity rules' }
      ],
      learns: [
        { label: 'Consolidation frequency', desc: 'Code agents optimal at sleep every 500 reviews' },
        { label: 'Memory pruning rules', desc: 'Stale pattern removal improves precision 3x' },
        { label: 'Behavioral realignment', desc: 'Constitution drift detectable at 0.12 cosine delta' }
      ]
    }
  ],
  // Tab 2 — Data Flywheel + Moat Layers
  flywheel: [
    { step: 'Sleep', num: '12.4K', desc: 'sleep cycles completed', unit: 'across all agents' },
    { step: 'Consolidate', num: '890K', desc: 'memories replayed', unit: 'strengthened or pruned' },
    { step: 'Wake', num: '40%', desc: 'fewer hallucinations', unit: 'post-sleep vs pre-sleep' },
    { step: 'Compound', num: '3x', desc: 'consistency improvement', unit: 'over 30-day periods' }
  ],
  layers: [
    {
      name: 'Sleep Science IP',
      what: 'Computational sleep algorithms adapted from Walker\u2019s memory consolidation and Tononi\u2019s synaptic homeostasis research. Patent pending on the Dream Engine\u2019s contradiction-detection and memory-replay systems.',
      why: 'Grounded in 30 years of neuroscience. Not something you replicate by hiring ML engineers \u2014 you need the neuroscience bridge.'
    },
    {
      name: 'Cross-Agent Sleep Data',
      what: '12,400+ sleep cycles across support agents, code reviewers, and onboarding bots. The only dataset mapping agent type \u2192 optimal sleep schedule \u2192 performance improvement.',
      why: 'Every customer\u2019s agents sleeping improves the consolidation model for all customers. New customers get warm-start sleep policies from day one.'
    },
    {
      name: 'Dream Engine Consolidation Models',
      what: 'Domain-specific consolidation routines: memory replay, contradiction pruning, embedding defrag, behavioral realignment. 6 months of tuning across 250 agents.',
      why: 'Consolidation quality improves with data volume. A new entrant starts with zero sleep data and zero domain-specific tuning.'
    },
    {
      name: 'Orchestration Integration Depth',
      what: 'Sleep Scheduler integrates with LangChain, CrewAI, AutoGen, and custom frameworks. Sleep policies are wired into the agent lifecycle \u2014 wake conditions, failover routing, pool management.',
      why: 'Once sleep is in the agent lifecycle, switching cost is high. Rolling sleep across an agent pool requires deep integration \u2014 not a weekend project.'
    }
  ]
};
