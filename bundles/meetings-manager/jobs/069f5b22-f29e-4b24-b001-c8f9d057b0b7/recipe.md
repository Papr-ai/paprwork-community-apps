# Investor Follow-up Quality Recipe

## Intent
After every summarized investor meeting, an attached follow-up draft (if present in `meetings.follow_up_draft` or any document tagged with the meeting ID) MUST pass the 7-dimension investor follow-up rubric. The recipe scores each draft and surfaces what to fix.

## Success Criteria
- Body word count between 80 and 165 (target 120-150 for first partner-intro touch)
- Sentence 1 echoes a verbatim phrase from the meeting transcript (their question or thesis word)
- Exactly ONE call-to-action with a specific time window
- Pipeline FOMO uses counts (numbers) — never named funds
- Data room link is pre-commit slug format (`/<slug>?mode=pre`) with passcode
- One concrete proof point with $/% numbers, not adjectives
- Defers any explanation longer than 2 sentences to the data room
- Sign-off is "Best, [first name]" — not "Cheers" / "Best regards"

## Quality Rubric (score 0-2 per dimension, target ≥12/14)

1. **Verbatim question echo** — does sentence 1 quote/paraphrase their actual question?
2. **One killer proof** — single customer story with $ impact?
3. **Numbers > adjectives** — specific metrics with provenance?
4. **Subtle FOMO via counts** — pipeline counts, NEVER named funds?
5. **Scarce specific CTA** — one ask with concrete window?
6. **Defer depth to data room** — body ≤165 words, sections as bullets?
7. **Right ladder rung** — matches their stated interest level (don't skip rungs)?

## Anti-Patterns (auto-fail any of these)

- Logo soup (>3 named funds in single sentence)
- Sharing live CRM/pipeline link
- "Looping back" / "circling back" / "just following up"
- More than one question in the email
- Inline technical overview for non-technical partner
- Vague CTA ("happy to chat anytime" / "let me know what works")
- Sentence longer than 35 words
- More than 2 sentences before the first link or hard fact

## Edge Cases

- **Second-touch follow-up** (post-IC): target 80-100 words, can skip data-room reintro
- **Pass / cooling investor**: respect the no; ask for one specific intro to one named alternative, then stop
- **Term-sheet stage**: 200-300 words OK; reference materials list and comparable terms
- **Hybrid investor + customer**: must have 1 sentence each for both lenses, link to BOTH data room AND product trial
- **Non-English-native partner**: shorten sentences further, prefer simpler vocabulary, avoid idioms ("kill shot", "headroom")

## Required References

Each draft must cite at least one of:
- An exact phrase from the meeting transcript (verbatim)
- A real number from a Papr DB (raise_tracker, joe coffee ops, deeptrust)
- A real customer name (DeepTrust, Joe Coffee)

## Output Format
Scores rendered as a markdown table with:
- Dimension | Score | Notes
- Total / 14
- Failing dimensions: rewrite suggestion (1 sentence each)
- Overall verdict: SEND / REVISE / REWRITE
