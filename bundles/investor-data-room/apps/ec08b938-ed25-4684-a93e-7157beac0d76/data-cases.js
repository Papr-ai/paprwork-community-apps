// Case studies data
window.ROOM_DATA.case_studies = [
  {
    customer_name: 'joe.coffee',
    logo_url: 'https://www.google.com/s2/favicons?domain=joe.coffee&sz=128',
    hero_photo: (typeof HERO_PHOTOS !== 'undefined' && HERO_PHOTOS['joe.coffee']) || '',
    problem: 'AI barista serving 30+ NYC locations needed persistent memory to remember customer preferences, order history, and context across sessions.',
    solution: "Papr Memory gives joe.coffee's AI barista a real memory layer. Every interaction is stored, indexed, and retrievable in <50ms.",
    result: 'Deployed across 30+ locations. $5,000/mo contract. Repeat order accuracy up significantly.',
    quote: "Papr's memory layer makes our AI barista actually feel intelligent. Customers notice the difference immediately.",
    quote_author: 'joe.coffee Team',
    quote_role: 'Engineering',
    sort_order: 1
  },
  {
    customer_name: 'DeepTrust',
    logo_url: 'https://www.google.com/s2/favicons?domain=deeptrust.ai&sz=128',
    hero_photo: (typeof HERO_PHOTOS !== 'undefined' && HERO_PHOTOS['DeepTrust']) || '',
    problem: "AI security platform processing millions of trust signals daily. No memory of previous assessments, re-evaluating identical patterns from scratch.",
    solution: "Papr's predictive memory infrastructure lets DeepTrust's AI remember every trust assessment. Pattern recognition improves with each interaction.",
    result: '40% reduction in false positives within 6 months. Design partner since October 2025.',
    quote: 'Papr was the only one that could handle our scale and actually predict what we needed before we asked.',
    quote_author: 'Aman Ahuja',
    quote_role: 'CEO, DeepTrust',
    sort_order: 2
  }
];
