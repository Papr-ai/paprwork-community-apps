# Meeting Prep Agent — Question Generation Skill

## Purpose
Generate the top 3 most valuable questions the user should ask in each meeting, scored against a research-backed rubric and personalized to the specific attendees.

## How to Detect Meeting Types

### Step 1 — Identify ALL applicable signals
A single attendee can be MULTIPLE types simultaneously. Check every signal independently:

**VC/Investor signals:**
- Titles: Partner, GP, Managing Director, Principal, Associate (at a fund), Venture Partner
- Companies: Capital, Ventures, Partners, Fund, Investments, Advisors
- Self-described as: "angel investor", "startup investor", "early investor in [company]"
- Meeting title or intro context mentions: pitch, investor, fundraise, round, term sheet
- Calendar source: fundraising program (Techstars, YC, AngelList)

**Customer signals:**
- Said anything like: "we'd use", "trying your product", "working on a plan", "evaluating", "potential client"
- Has the problem Papr solves (mentioned unstructured data, search, PDFs, audio, memory, RAG)
- Already signed up / using product

**Partner/BD signals:**
- Title at complementary company (integration partner, channel, reseller)
- Discussion of co-selling, integration, joint customers

**Internal signals:**
- @papr.ai email
- Calendar name = Papr team

**Advisory signals:**
- Known advisor relationship
- No commercial transaction expected

### Step 2 — Classify into one of:
- **`vc`** — Pure investor meeting (fund partner, evaluating for check)
- **`hybrid_investor_customer`** — Both an investor AND a customer/user (e.g., angel who also uses product)
- **`customer`** — Pure sales/evaluation
- **`partner`** — BD / integration
- **`internal`** — Team meeting
- **`advisory`** — Strategic advisor session
- **`other`** — None clearly apply (still generate 3 questions, but use Discovery/Strategic/Relationship categories)

### CRITICAL: Hybrid Detection
If a person has BOTH investor signals AND customer signals, classify as `hybrid_investor_customer`. This is COMMON with angels who also use the product. Questions must address BOTH lenses — not just one.

---

## Research Foundation (from top VC practitioners)

**Y Combinator / Paul Graham** — Founders should ask questions revealing whether the VC understands their market.
**First Round / Chris Fralic** — Best meetings are conversations, not pitches. Show portfolio homework.
**Sequoia / Mike Moritz** — Ask about thesis evolution and portfolio conflicts.
**a16z / Marc Andreessen** — Ask about decision process and timeline upfront.
**NFX / James Currier** — "What would make you pass?" — shows confidence, saves time.

---

## Scoring Rubric (1-10 per dimension, weighted)

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Specificity** | 25% | References their portfolio/thesis/company/recent activity — not generic |
| **Signal Value** | 25% | Answer reveals fit, conviction, or actionable intel |
| **Leverage** | 20% | Shifts dynamic from "please buy/invest" to "let's evaluate mutual fit" |
| **Research-Backed** | 15% | Grounded in something specific found about them |
| **Conversation Starter** | 15% | Opens dialogue; leads to 2-3 follow-up exchanges |

---

## Question Categories by Meeting Type

### For `vc` (pure investor)
- **thesis_alignment** — How their fund thesis maps to your space
- **portfolio_leverage** — What you can learn from their portfolio
- **decision_process** — Concrete next steps, timeline, what would de-risk
- **value_add** — Beyond capital, where they're hands-on
- **market_intel** — What they're hearing from adjacent markets

### For `hybrid_investor_customer` (angel + user) — MOST COMMON
Pick 1 question from EACH lens, plus 1 connecting both:
- **customer_pain** — Surface their actual use case and pain (lets them self-qualify)
- **investor_thesis** — What pattern matched, what would make them write a check
- **bridge** — Connects customer experience to investment thesis ("If we nailed X for you, would that change your investor lens?")

### For `customer`
- **discovery** — Real problem behind the stated need (the "why now")
- **decision_process** — Buying committee, timeline, criteria, alternatives
- **expansion** — How success grows beyond initial use case

### For `partner`
- **mutual_value** — Where each side benefits most
- **friction** — What's hardest about working together
- **shared_customers** — Concrete overlapping accounts/use cases

### For `internal` / `advisory`
- **strategic** — Decisions that need their input
- **blocker** — What's slowing them/us down
- **opportunity** — Patterns they see we don't

### For `other`
- **discovery / strategic / relationship**

---

## Anti-Patterns (NEVER suggest)
- ❌ Anything Googleable in 5 seconds ("How big is your fund?")
- ❌ Generic questions that work for any meeting
- ❌ Yes/no questions (no conversation opens)
- ❌ Multi-part questions (pick one focus)
- ❌ Questions that make you sound desperate or unprepared
- ❌ Asking for things ("Can you introduce me to...?") before establishing fit

---

## Output Format
Always output exactly 3 questions in this structure:
```json
{
  "questionsToAsk": [
    {
      "question": "The actual question phrased exactly as you'd ask it",
      "why": "1-sentence reason this is high-value for THIS specific meeting",
      "category": "<category from list above>",
      "score": 8.5
    }
  ],
  "meetingType": "<vc|hybrid_investor_customer|customer|partner|internal|advisory|other>"
}
```

---

## Personalization Requirements
Each question MUST reference at least ONE of:
1. The attendee's specific company, role, or background
2. Something they've said or done (from prior emails/meetings/memory)
3. A specific portfolio company, product, or known investment
4. A specific aspect of their thesis or known interests
5. A concrete part of the user's product/business they've engaged with

Questions like "What's your thesis?" are LAZY. Personalize from the research surfaced in earlier steps.
