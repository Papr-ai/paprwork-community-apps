// Customer, revenue, pipeline, case study data — Sleep AI template
// FALLBACK ONLY — in Paprwork, data loads from SQLite via db-queries.js
if (!window.ROOM_DATA.revenue_history || window.ROOM_DATA.revenue_history.length === 0) {
window.ROOM_DATA.revenue_history = [
  { month: '2025-07', mrr: 0, paying_customers: 0 },
  { month: '2025-08', mrr: 800, paying_customers: 1 },
  { month: '2025-09', mrr: 1600, paying_customers: 1 },
  { month: '2025-10', mrr: 2400, paying_customers: 2 },
  { month: '2025-11', mrr: 3200, paying_customers: 2 },
  { month: '2025-12', mrr: 3750, paying_customers: 2 },
  { month: '2026-01', mrr: 3750, paying_customers: 2 },
  { month: '2026-02', mrr: 4200, paying_customers: 2 },
  { month: '2026-03', mrr: 4200, paying_customers: 3 },
  { month: '2026-04', mrr: 5800, paying_customers: 4 },
];
window.ROOM_DATA.customers = [
  { name: 'Coda', mrr: 2083, plan: 'Enterprise', months_active: 9, email: 'ops@coda.io', expanding: 1 },
  { name: 'AutoReview', mrr: 1667, plan: 'Enterprise', months_active: 7, email: 'eng@autoreview.dev' },
  { name: 'Relay AI', mrr: 800, plan: 'Growth', months_active: 3, email: 'team@relay-ai.com', expanding: 1 },
  { name: 'Promptly', mrr: 250, plan: 'Starter', months_active: 2, email: 'hello@promptly.dev' },
];
window.ROOM_DATA.pipeline = [
  { name: 'Coda', stage: 'Won', value: 25000, probability: 1, weighted_value: 25000, contact_name: 'Maria Lopez', contact_email: 'ops@coda.io', company_domain: 'coda.io' },
  { name: 'AutoReview', stage: 'Won', value: 20000, probability: 1, weighted_value: 20000, contact_name: 'Dev Patel', contact_email: 'eng@autoreview.dev', company_domain: 'github.com' },
  { name: 'Promptly', stage: 'Won', value: 3000, probability: 1, weighted_value: 3000, contact_name: '', company_domain: 'promptly.dev' },
  { name: 'Notion', stage: 'Qualified', value: 200000, probability: 0.3, weighted_value: 60000, contact_name: 'Jake Mendel', company_domain: 'notion.so' },
  { name: 'Vercel', stage: 'Deep Dive', value: 120000, probability: 0.5, weighted_value: 60000, contact_name: 'Sarah Chen', company_domain: 'vercel.com' },
  { name: 'Linear', stage: 'Testing', value: 80000, probability: 0.6, weighted_value: 48000, contact_name: 'Ian Storm', company_domain: 'linear.app' },
  { name: 'Relay AI', stage: 'Pilot Evaluation', value: 60000, probability: 0.7, weighted_value: 42000, contact_name: 'Priya Sharma', company_domain: 'relay-ai.com', notes: 'upgrade: expanding from 20 to 80 agents' },
  { name: 'Anthropic Internal', stage: 'Lead', value: 500000, probability: 0.1, weighted_value: 50000, company_domain: 'anthropic.com' },
  { name: 'Replit', stage: 'Discovery', value: 100000, probability: 0.2, weighted_value: 20000, company_domain: 'replit.com' },
];
window.ROOM_DATA.case_studies = [
  { customer_name: 'Coda', title: 'How Coda cut AI hallucinations by 40% with Sleep Cycles', result: 'Coda runs 200 AI support agents handling 50K tickets/month. Implementing nightly Sleep AI cycles reduced hallucination rates from 12% to 7.2%. CSAT improved 18%.' },
  { customer_name: 'AutoReview', title: '3x code review consistency over 90 days', result: 'AutoReview\'s 50 code review agents maintained consistent style guidelines for 90+ days with Dream Engine consolidation. False positive rate dropped from 23% to 8%.' },
];
} // end fallback guard
