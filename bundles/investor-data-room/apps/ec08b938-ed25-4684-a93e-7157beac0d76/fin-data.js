/* Financial Model data — Sleep AI */
window.FIN_DATA = {
  title: 'Financial Model',
  pages: [
    {
      id: 'revenue',
      label: 'Revenue',
      headline: '$70K → $8.5M ARR in 24 months.',
      sub: '142% NDR drives expansion. Each customer grows as agent fleets scale and Dream Engine tuning unlocks premium tiers.',
      tiers: [
        { name: 'Free', price: '$0', unit: '/mo', ops: '5 agents', desc: 'Open source SDK, nightly cycles' },
        { name: 'Growth', price: '$800', unit: '/mo', ops: '100 agents', desc: 'Dream Engine, custom schedules, drift monitoring', featured: true },
        { name: 'Enterprise', price: 'Custom', unit: '', ops: 'Unlimited', desc: 'On-prem consolidation, SLA, SSO, dedicated sleep scientist' }
      ],
      projections: [
        { year: 'Today', arr: 70, customers: 4, note: 'Current traction' },
        { year: 'M6', arr: 360, customers: 12, note: 'Growth tier ramp' },
        { year: 'M12', arr: 1200, customers: 30, note: 'Enterprise land' },
        { year: 'M18', arr: 3500, customers: 80, note: 'Fleet expansion' },
        { year: 'M24', arr: 8500, customers: 170, note: '$8.5M ARR' }
      ],
      nrr: 142
    },
    {
      id: 'unit',
      label: 'Unit Economics',
      headline: 'Each sleep cycle becomes more efficient over time.',
      sub: 'Three structural tailwinds drive margin expansion as the platform scales.',
      grossMargin: { current: 68, target: 80, label: 'Gross Margin' },
      drivers: [
        { title: 'Batch consolidation optimization', desc: 'Dream Engine processes multiple agents in parallel. GPU cost per sleep cycle drops 60% at 500+ agent batches. Fine-tuned Llama models replace GPT-4 for consolidation.', impact: 'GPU cost per cycle \u2193 60%' },
        { title: 'Cross-agent learning amortization', desc: 'Sleep patterns learned from one customer improve policies for all customers. The consolidation model gets better without per-customer retraining.', impact: 'Model cost amortized \u2193' },
        { title: 'Embedding defrag gets cheaper', desc: 'Vector store reorganization uses in-house models. Storage and compute costs collapse as defrag algorithms optimize.', impact: 'Storage cost \u2193 40%' }
      ],
      cogs: [
        { name: 'GPU compute (Dream Engine)', pct: 45, future: 18 },
        { name: 'Vector store operations', pct: 20, future: 8 },
        { name: 'Infrastructure (API, monitoring)', pct: 20, future: 14 },
        { name: 'Support & sleep science', pct: 15, future: 10 }
      ]
    },
    {
      id: 'funds',
      label: 'Use of Funds',
      headline: '$4M seed to build the circadian intelligence layer that compounds.',
      sub: '24 months of runway to reach $2.4M ARR, 65+ customers, and Series A readiness.',
      raise: { amount: '$4M', type: 'Seed', runway: '24 months' },
      pillars: [
        { title: 'Dream Engine R&D', desc: 'Hire 3 research engineers to push consolidation science. Domain-specific sleep models, multi-agent orchestration, patent portfolio.', icon: 'psychology' },
        { title: 'Scale Platform', desc: 'Batch consolidation pipeline, enterprise security (SOC 2), 5 framework integrations, Wake Analytics dashboard.', icon: 'engineering' },
        { title: 'Go-to-Market', desc: 'Hire 2 AEs for enterprise, launch self-serve tier, open-source community investment, conference presence.', icon: 'campaign' }
      ],
      timeline: [
        { stage: 'TODAY', metric: '$70K ARR', detail: '4 customers, 0% logo churn', status: 'done' },
        { stage: 'M10', metric: '$360K ARR', detail: '3 enterprise logos, PMF signal', status: 'next' },
        { stage: 'M18', metric: '$2.4M ARR', detail: '65 customers, Series A ready', status: 'future' }
      ],
      proofs: [
        { value: '142%', label: 'Net Dollar Retention', desc: 'Agent fleets grow \u2192 usage compounds organically.' },
        { value: '40%', label: 'Hallucination Reduction', desc: 'Measured across 12,400 sleep cycles at Coda.' },
        { value: '0%', label: 'Logo Churn', desc: 'Zero customer losses in 9 months of operation.' }
      ],
      allocation: [
        { name: 'Dream Engine R&D', pct: 40, desc: 'Research engineers, sleep science', color: '#0161E0' },
        { name: 'Platform Engineering', pct: 25, desc: 'Infrastructure, integrations', color: '#6C8EEF' },
        { name: 'Go-to-Market', pct: 20, desc: '2 AEs, self-serve, community', color: '#A78BFA' },
        { name: 'GPU Infrastructure', pct: 8, desc: 'Batch consolidation cluster', color: '#34D399' },
        { name: 'Ops & Buffer', pct: 7, desc: 'SOC 2, legal, 3-mo buffer', color: '#F59E0B' }
      ]
    }
  ]
};
