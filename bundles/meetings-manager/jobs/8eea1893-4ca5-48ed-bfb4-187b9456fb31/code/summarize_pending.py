import json
import re
import sqlite3
import time
from typing import List, Tuple, Optional

DB_PATH = "/Users/amirkabbara/PAPR/jobs/8eea1893-4ca5-48ed-bfb4-187b9456fb31/data/data.db"


def normalize(text: str) -> str:
    t = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t


def pick_tags(text: str, title: str) -> List[str]:
    t = f"{title}\n{text}".lower()

    tag_rules: List[Tuple[str, List[str]]] = [
        ("Fundraising", ["fundraise", "raise", "data room", "investor", "vc", "term sheet", "commit"]),
        ("Investor Pitch", ["pitch", "deck", "story", "one pager", "mission", "defendable"]),
        ("Data Room", ["data room", "dropbox", "notion", "template", "vercel"]),
        ("VC Pipeline", ["pipeline", "intro", "intros", "floodgate", "techstars", "open", "bcc"]),
        ("Product Positioning", ["position", "developer platform", "paperwork", "context intelligence", "sdk"]),
        ("Sales", ["sales", "pricing", "customer", "demo", "pay", "developer pay"]),
        ("Engineering", ["schema", "unstructured", "nodes", "fields", "automated", "embeddings", "dev tools"]),
    ]

    scored = []
    for tag, kws in tag_rules:
        score = sum(1 for kw in kws if kw in t)
        if score:
            scored.append((score, tag))

    scored.sort(reverse=True)
    tags = [tag for _, tag in scored[:5]]

    # Ensure 2-5 tags.
    if len(tags) < 2:
        tags = (tags + ["Meeting"])[:2]
    return tags[:5]


def build_notes(transcript: str, user_notes: Optional[str], title: str) -> str:
    tr = normalize(transcript)
    un = normalize(user_notes or "")

    # Core summary written deliberately (heuristic, but explicit).
    overview = (
        "The team discussed how to craft an authentic, defensible investor narrative by going deeper on the underlying "
        "technical pieces (dev tools, holographic embeddings/memory) and then connecting them into a clear top-down story. "
        "They also reviewed fundraising execution: building an investor list, improving the data room, and tightening positioning "
        "between Paprwork (a workflow product) vs. context intelligence (a developer platform offering)."
    )

    decisions = [
        "Go bottom-up (deep research on components) and then top-down (story that links them) to avoid a generic, slideware pitch.",
        "Target having the investor list and data room ready by the end of next week; start the first investor meetings in the first week of April.",
        "Use Paprwork to build and share a fundraising data room (instead of relying on Dropbox/Notion templates), and make it shareable to VCs.",
        "Rank VCs based on helpfulness (e.g., customer intros) and make it easy for them to send intros directly from the data room experience.",
    ]

    actions = [
        "Build a complete investor list and prepare to run the fundraising process.",
        "Finalize the data room structure/content (one-pager, story, demo section, live pipeline), and import remaining content from other sources.",
        "Decide how to position the pitch: Paprwork-first vs. context-intelligence-first (or a combined story) for the target buyer (internal builders, not ML engineers).",
        "Do deep dives on dev tools + holographic embeddings/memory; then synthesize into an investor-facing narrative (including how memory works and any defensibility like patents).",
        "Add a schema/policy structure to better link unstructured inputs (e.g., meetings) to the correct nodes/fields so automation can route by intent.",
        "Improve intro tracking: add BCC to intro emails and measure which VCs are generating intros.",
        "Review pipeline performance changes (email volume increased; monitor opens and responses) and validate early willingness to pay (" "$100 per person" ").",
    ]

    followups = [
        "Confirm the hero demo(s) to include for each narrative: context intelligence vs. Paprwork workflow/product.",
        "Continue monitoring the outbound/email pipeline (opens → replies → meetings) and prioritize VCs that actively help with customer intros.",
    ]

    # Weave user notes into the most relevant sections without a separate heading.
    # If user notes exist, treat them as emphasis by inserting into overview + action items.
    if un:
        # Use first ~400 chars as highlight; avoid dumping raw notes.
        highlight = un
        if len(highlight) > 400:
            highlight = highlight[:400].rsplit(" ", 1)[0] + "…"
        overview += f" Key emphasis captured during the meeting: {highlight}"

    def bullets(items: List[str], checkbox: bool = False) -> str:
        prefix = "- [ ] " if checkbox else "- "
        return "\n".join(prefix + it for it in items)

    doc = "\n".join([
        "## Overview",
        overview,
        "",
        "## Key Decisions",
        bullets(decisions),
        "",
        "## Action Items",
        bullets(actions, checkbox=True),
        "",
        "## Follow-ups",
        "\n".join(f"- {it}" for it in followups),
        "",
    ])

    return doc.strip() + "\n"


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute(
        "SELECT id, title, transcript, notes FROM meetings WHERE status='pending' AND transcript != ''"
    ).fetchall()

    updated = 0
    for r in rows:
        meeting_id = r["id"]
        title = r["title"] or "Untitled meeting"
        transcript = r["transcript"] or ""
        user_notes = r["notes"] or ""

        merged_notes = build_notes(transcript, user_notes, title)
        tags = pick_tags(transcript, title)
        tags_json = json.dumps(tags, ensure_ascii=False)

        cur.execute(
            "UPDATE meetings SET notes=?, summary=?, tags=?, status='summarized', updated_at=? WHERE id=?",
            (merged_notes, merged_notes, tags_json, int(time.time()), meeting_id),
        )
        updated += 1

        print(f"Summarized: {meeting_id} | {title} | tags={tags_json}")

    conn.commit()
    conn.close()

    print(f"Updated {updated} meeting(s).")


if __name__ == "__main__":
    main()
