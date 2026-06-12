#!/usr/bin/env python3
"""Papr Data Room One-Pager PDF Generator.

Server-side Markdown -> PDF renderer using ReportLab. Avoids browser print,
html2canvas, CSS/CORS, and viewport bugs. Produces a deterministic Papr-branded
one-page PDF suitable for direct download and Vercel static serving.
"""
import argparse, base64, html, os, re, sqlite3, sys, textwrap
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

JOB_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = JOB_DIR / "data"
DEFAULT_DB = Path.home() / "Papr/jobs/b6d2f0ea-6a97-495a-8d69-3582d31a670f/data/data.db"
DOWNLOADS = Path.home() / "Downloads"

PAGE_W, PAGE_H = letter  # 612 x 792 pt
MARGIN_X = 42
MARGIN_TOP = 34
MARGIN_BOTTOM = 34
BLUE = colors.HexColor("#0161E0")
INK = colors.HexColor("#14161A")
MUTED = colors.HexColor("#667085")
SOFT = colors.HexColor("#F6F9FF")
LINE = colors.HexColor("#E6EAF0")


def read_markdown(db_path: Path) -> str:
    conn = sqlite3.connect(str(db_path))
    try:
        row = conn.execute("SELECT content FROM one_pager WHERE id='main'").fetchone()
        if row and row[0]:
            return row[0]
        row = conn.execute("SELECT value FROM config WHERE key='one_pager'").fetchone()
        if row and row[0]:
            return row[0]
    finally:
        conn.close()
    raise RuntimeError(f"No one_pager content found in {db_path}")


def clean_inline(s: str) -> str:
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"__([^_]+)__", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    s = re.sub(r"_([^_]+)_", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def parse_md(md: str):
    lines = [ln.rstrip() for ln in md.replace('\r\n', '\n').split('\n')]
    title = "Papr"
    subtitle = ""
    sections = []
    current = {"heading": "Overview", "items": []}
    pre_sections = []
    seen_h2 = False

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("# "):
            title = clean_inline(line[2:])
            continue
        if line.startswith("## "):
            if current["items"] or seen_h2:
                sections.append(current)
            current = {"heading": clean_inline(line[3:]), "items": []}
            seen_h2 = True
            continue
        if line.startswith("### "):
            current["items"].append(("subhead", clean_inline(line[4:])))
            continue
        is_bullet = bool(re.match(r"^[-*•]\s+", line))
        text = clean_inline(re.sub(r"^[-*•]\s+", "", line))
        if not text or text == "---":
            continue
        kind = "bullet" if is_bullet else "para"
        if not seen_h2:
            pre_sections.append((kind, text))
            if not subtitle and raw.strip().startswith("*"):
                subtitle = text
        else:
            current["items"].append((kind, text))
    if current["items"] or seen_h2:
        sections.append(current)
    return {"title": title, "subtitle": subtitle, "intro": pre_sections, "sections": sections}


def wrap(c, text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            # hard split long words
            if stringWidth(w, font, size) > max_w:
                part = ""
                for ch in w:
                    if stringWidth(part + ch, font, size) <= max_w:
                        part += ch
                    else:
                        lines.append(part); part = ch
                cur = part
            else:
                cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_text(c, text, x, y, max_w, font="Helvetica", size=8.4, leading=10.5, color=INK, max_lines=None):
    c.setFillColor(color); c.setFont(font, size)
    lines = wrap(c, text, font, size, max_w)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,") + "…"
    for ln in lines:
        c.drawString(x, y, ln)
        y -= leading
    return y, len(lines)


def draw_rich_line(c, text, x, y, max_w, size=8.4, color=MUTED, bullet=False):
    if bullet:
        c.setFillColor(BLUE); c.circle(x + 2, y + 2.5, 1.5, fill=1, stroke=0)
        x += 10; max_w -= 10
    # Simple bold prefix support: "Label: rest"
    m = re.match(r"^([^:]{2,34}:)\s+(.*)$", text)
    if m:
        label, rest = m.group(1), m.group(2)
        label_w = stringWidth(label + " ", "Helvetica-Bold", size)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", size); c.drawString(x, y, label)
        return draw_text(c, rest, x + label_w, y, max_w - label_w, "Helvetica", size, size*1.35, color, max_lines=2)[0]
    return draw_text(c, text, x, y, max_w, "Helvetica", size, size*1.35, color, max_lines=3)[0]


def draw_papr_wordmark(c, x, y):
    # Vector/text wordmark: crisp at any PDF scale, no raster artifacts.
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 21)
    c.drawString(x, y, "Papr")
    c.setFillColor(BLUE)
    c.circle(x + 47.5, y + 14.5, 3.2, fill=1, stroke=0)


def build_pdf(md: str, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data = parse_md(md)
    c = canvas.Canvas(str(out_path), pagesize=letter)
    c.setTitle("Papr One-Pager")
    c.setAuthor("Papr")

    # Background
    c.setFillColor(colors.white); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Subtle liquid glass halo
    c.setFillColor(colors.Color(0.94, 0.97, 1.0, alpha=0.55)); c.circle(PAGE_W-62, PAGE_H-56, 78, fill=1, stroke=0)
    c.setFillColor(colors.Color(0.98, 0.99, 1.0, alpha=0.85)); c.roundRect(MARGIN_X-10, MARGIN_BOTTOM-8, PAGE_W-2*(MARGIN_X-10), PAGE_H-MARGIN_TOP-MARGIN_BOTTOM+14, 14, fill=1, stroke=0)

    y = PAGE_H - MARGIN_TOP
    draw_papr_wordmark(c, MARGIN_X, y - 16)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.6)
    c.drawRightString(PAGE_W - MARGIN_X, y - 8, datetime.now().strftime("%B %Y").upper())
    y -= 34
    c.setStrokeColor(LINE); c.setLineWidth(0.8); c.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
    y -= 16

    # Title
    title = data["title"].replace("Papr — ", "").replace("Papr - ", "")
    y, _ = draw_text(c, title, MARGIN_X, y, PAGE_W - 2*MARGIN_X, "Helvetica-Bold", 18, 21, INK, max_lines=2)
    if data["subtitle"]:
        y -= 2
        y, _ = draw_text(c, data["subtitle"], MARGIN_X, y, PAGE_W - 2*MARGIN_X, "Helvetica-Oblique", 8.8, 11.5, MUTED, max_lines=2)
    y -= 8

    # TL;DR card from intro paragraphs (first 5 meaningful lines)
    intro_items = [t for k, t in data["intro"] if t and t != data["subtitle"]]
    tldr = " ".join(intro_items[:4])
    c.setFillColor(SOFT); c.roundRect(MARGIN_X, y-58, PAGE_W - 2*MARGIN_X, 64, 9, fill=1, stroke=0)
    c.setFillColor(BLUE); c.setFont("Helvetica-Bold", 7.4); c.drawString(MARGIN_X+12, y-10, "TL;DR")
    draw_text(c, tldr, MARGIN_X+12, y-23, PAGE_W - 2*MARGIN_X - 24, "Helvetica", 8.2, 10.4, colors.HexColor("#344054"), max_lines=4)
    y -= 76

    # Sections in two columns
    gap = 22
    col_w = (PAGE_W - 2*MARGIN_X - gap) / 2
    col_x = [MARGIN_X, MARGIN_X + col_w + gap]
    col_y = [y, y]
    bottom = MARGIN_BOTTOM + 22
    col = 0

    def new_col():
        nonlocal col
        col = 1

    for sec in data["sections"]:
        # estimate block height
        est = 16 + min(6, len(sec["items"])) * 24
        if col_y[col] - est < bottom and col == 0:
            new_col()
        elif col_y[col] - 34 < bottom:
            continue
        x = col_x[col]; yy = col_y[col]
        c.setFillColor(BLUE); c.setFont("Helvetica-Bold", 8.3)
        c.drawString(x, yy, sec["heading"].upper()[:55])
        yy -= 10
        c.setStrokeColor(colors.Color(0.01,0.38,0.88,alpha=0.25)); c.line(x, yy+4, x+col_w, yy+4)
        shown = 0
        for kind, text in sec["items"]:
            if yy < bottom + 18:
                break
            if kind == "subhead":
                c.setFillColor(INK); c.setFont("Helvetica-Bold", 8.0); c.drawString(x, yy, text[:60]); yy -= 10
                continue
            yy = draw_rich_line(c, text, x, yy, col_w, size=7.7, color=colors.HexColor("#3A4150"), bullet=(kind == "bullet"))
            yy -= 2
            shown += 1
            if shown >= 5 and len(data["sections"]) > 5:
                break
        col_y[col] = yy - 8

    # Footer
    c.setStrokeColor(LINE); c.line(MARGIN_X, MARGIN_BOTTOM + 12, PAGE_W - MARGIN_X, MARGIN_BOTTOM + 12)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.2)
    c.drawCentredString(PAGE_W/2, MARGIN_BOTTOM, "Papr · Context intelligence infrastructure for AI-native teams · dataroom.papr.ai")
    c.showPage(); c.save()
    return out_path


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--markdown-file")
    p.add_argument("--output")
    p.add_argument("--downloads", action="store_true", help="Write to ~/Downloads with timestamped filename")
    p.add_argument("--json", action="store_true", help="Print JSON with path and base64")
    args = p.parse_args()

    if args.markdown_file:
        md = Path(args.markdown_file).read_text()
    else:
        # Do NOT read stdin by default. In Papr's job runner stdin is a pipe that
        # never closes, which previously caused 30-minute watchdog timeouts.
        md = read_markdown(Path(os.path.expanduser(args.db)))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    canonical = DATA_DIR / "one-pager.pdf"
    if args.output:
        out = Path(os.path.expanduser(args.output))
    elif args.downloads:
        out = DOWNLOADS / f"Papr_One_Pager_{datetime.now().strftime('%Y-%m-%d_%H%M')}.pdf"
    else:
        out = canonical

    build_pdf(md, out)
    if out != canonical:
        build_pdf(md, canonical)
    size = out.stat().st_size
    print(f"Generated PDF: {out} ({size:,} bytes)")
    print(f"Canonical PDF: {canonical} ({canonical.stat().st_size:,} bytes)")
    if args.json:
        b64 = base64.b64encode(out.read_bytes()).decode("ascii")
        print('{"path": ' + repr(str(out)).replace("'", '"') + ', "size": ' + str(size) + ', "base64": ' + repr(b64).replace("'", '"') + '}')

if __name__ == "__main__":
    main()
