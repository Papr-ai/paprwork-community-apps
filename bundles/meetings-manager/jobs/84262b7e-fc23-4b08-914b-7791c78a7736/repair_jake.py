#!/usr/bin/env python3
"""One-off repair: silence-aware re-transcription for a single meeting.

Removes long silence per track (so Whisper stops hallucinating "Thank you" /
"3D printed image" during dead air), transcribes speech-only audio, and merges
mic (=[me]) + sys (=[remote]) chronologically by mapping desilenced timestamps
back to original time.
"""
import os, re, sqlite3, subprocess, tempfile, sys
from openai import OpenAI

MEETING_ID = "a385cab2-531f-4aa2-915c-f52bc57ae0e4"
REC_DIR = os.path.expanduser("~/Papr/orgs/Y8D4H7Yp3Z/namespaces/85ZIB7mD1V/Jobs/095b6dbf-6096-433c-83d9-e7a66b8e459b/data/recordings")
MEETINGS_DB = os.path.expanduser("~/Papr/orgs/Y8D4H7Yp3Z/namespaces/85ZIB7mD1V/Jobs/40407339-ca0b-4650-a009-426201025e81/data/data.db")
MIC = os.path.join(REC_DIR, f"{MEETING_ID}_mic.wav")
SYS = os.path.join(REC_DIR, f"{MEETING_ID}_sys.wav")

NOISE_DB = "-35dB"     # silence threshold
MIN_SIL = 2.0          # min silence length to cut (s)
PAD = 0.30             # keep padding around speech (s)
MERGE_GAP = 1.0        # bridge speech islands closer than this (s)
MIN_SEG = 0.40         # drop speech blips shorter than this (s)
MAX_SIZE = 24 * 1024 * 1024
PROMPT = ("Speakers include Shawkat Kabbara and Jake from Cannage Capital. "
          "Discussing Papr, Paprwork, graph-native embeddings, memory, pre-seed raise, "
          "Mem0, Zep, Cognee, STaRK benchmark, ARR, data room.")


def client_model():
    k = open(os.path.join(os.path.dirname(__file__), ".groq_key")).read().strip()
    return OpenAI(api_key=k, base_url="https://api.groq.com/openai/v1"), "whisper-large-v3"


def duration(p):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                        "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def speech_intervals(path):
    """Return [(start,end)] speech regions (original time) via silencedetect complement."""
    total = duration(path)
    r = subprocess.run(["ffmpeg", "-i", path, "-af",
                        f"silencedetect=noise={NOISE_DB}:d={MIN_SIL}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sil = []
    cur = None
    for line in r.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", line)
        if m:
            cur = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and cur is not None:
            sil.append((cur, float(m.group(1))))
            cur = None
    if cur is not None:
        sil.append((cur, total))
    # complement = speech
    speech, prev = [], 0.0
    for s, e in sil:
        if s - prev > 0:
            speech.append((max(0, prev - PAD), min(total, s + PAD)))
        prev = e
    if total - prev > 0:
        speech.append((max(0, prev - PAD), total))
    # merge close + drop tiny
    merged = []
    for s, e in speech:
        if merged and s - merged[-1][1] < MERGE_GAP:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return [(s, e) for s, e in merged if e - s >= MIN_SEG], total


def build_clean(path, speech, tmp, tag):
    """Extract speech segments, concat into one file, return (audio_path, mapping)."""
    mapping = []  # (concat_start, orig_start, dur)
    listfile = os.path.join(tmp, f"{tag}_list.txt")
    concat_t = 0.0
    with open(listfile, "w") as lf:
        for i, (s, e) in enumerate(speech):
            seg = os.path.join(tmp, f"{tag}_{i:04d}.wav")
            subprocess.run(["ffmpeg", "-y", "-ss", str(s), "-to", str(e), "-i", path,
                            "-ac", "1", "-ar", "16000", seg],
                           capture_output=True, text=True)
            if not (os.path.exists(seg) and os.path.getsize(seg) > 200):
                continue
            d = duration(seg)
            mapping.append((concat_t, s, d))
            concat_t += d
            lf.write(f"file '{seg}'\n")
    out = os.path.join(tmp, f"{tag}_clean.wav")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
                    "-ac", "1", "-ar", "16000", out], capture_output=True, text=True)
    # compress if too big for Whisper
    if os.path.getsize(out) > MAX_SIZE:
        mp3 = os.path.join(tmp, f"{tag}_clean.mp3")
        for br in ["48k", "32k", "24k", "16k"]:
            subprocess.run(["ffmpeg", "-y", "-i", out, "-ac", "1", "-ar", "16000",
                            "-b:a", br, mp3], capture_output=True, text=True)
            if os.path.getsize(mp3) <= MAX_SIZE:
                out = mp3
                break
        else:
            out = mp3
    return out, mapping, concat_t


def map_back(concat_start, mapping):
    best = mapping[0][1]
    for c0, o0, d in mapping:
        if concat_start >= c0 - 0.05:
            best = o0 + (concat_start - c0)
        else:
            break
    return best


def transcribe(client, model, path):
    with open(path, "rb") as f:
        return client.audio.transcriptions.create(
            model=model, file=f, response_format="verbose_json", prompt=PROMPT)


def segs_of(vj):
    s = vj.get("segments") if isinstance(vj, dict) else getattr(vj, "segments", None)
    out = []
    for x in (s or []):
        g = (lambda k, d=0: x.get(k, d) if isinstance(x, dict) else getattr(x, k, d))
        t = (g("text", "") or "").strip()
        if t:
            out.append((float(g("start", 0)), t))
    return out


def main():
    client, model = client_model()
    all_segments = []
    for path, speaker in [(MIC, "me"), (SYS, "remote")]:
        if not (os.path.exists(path) and os.path.getsize(path) > 1000):
            print(f"skip {speaker}: missing"); continue
        speech, total = speech_intervals(path)
        kept = sum(e - s for s, e in speech)
        print(f"[{speaker}] {total:.0f}s total -> {kept:.0f}s speech in {len(speech)} regions")
        with tempfile.TemporaryDirectory() as tmp:
            clean, mapping, clen = build_clean(path, speech, tmp, speaker)
            if not mapping:
                print(f"  no speech kept for {speaker}"); continue
            print(f"  clean audio {os.path.getsize(clean)//1024}KB, {clen:.0f}s -> transcribing")
            vj = transcribe(client, model, clean)
            for cstart, text in segs_of(vj):
                all_segments.append((map_back(cstart, mapping), speaker, text))
            print(f"  -> {sum(1 for x in all_segments if x[1]==speaker)} segments")

    all_segments.sort(key=lambda x: x[0])
    lines, cur, buf = [], None, []
    for _, sp, text in all_segments:
        if sp != cur:
            if buf:
                lines.append(f"[{cur}] " + " ".join(buf))
            cur, buf = sp, [text]
        else:
            buf.append(text)
    if buf:
        lines.append(f"[{cur}] " + " ".join(buf))
    transcript = "\n\n".join(lines)
    print(f"\nFinal transcript: {len(transcript)} chars, {len(lines)} turns")

    conn = sqlite3.connect(MEETINGS_DB)
    conn.execute("UPDATE meetings SET transcript=?, status='pending', updated_at=strftime('%s','now') WHERE id=?",
                 (transcript, MEETING_ID))
    conn.commit(); conn.close()
    print("Saved transcript, status -> pending")
    print("\n--- PREVIEW ---\n" + transcript[:1200])


if __name__ == "__main__":
    main()
