#!/usr/bin/env python3
"""Whisper transcriber with chunking + silence removal for large files."""
import os, sqlite3, subprocess, tempfile, glob
from pathlib import Path
from openai import OpenAI

def _jobs_root():
    """Workspace Jobs/ directory.

    PAPR_HOME is injected by the job runner. Fall back to the parent of this
    job's own folder so the script follows the workspace if env is missing.
    """
    papr_home = os.environ.get("PAPR_HOME", "")
    if papr_home and os.path.isdir(os.path.join(papr_home, "Jobs")):
        return os.path.join(papr_home, "Jobs")
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


JOBS_ROOT = _jobs_root()
RECORDER_JOB_DIR = os.path.join(JOBS_ROOT, "095b6dbf-6096-433c-83d9-e7a66b8e459b")
MAX_WHISPER_SIZE = 24 * 1024 * 1024  # 24MB
CHUNK_MINUTES = 15  # Split into 15-min chunks for reliability

def find_meetings_db():
    for root, _, files in os.walk(JOBS_ROOT):
        if root.endswith("/data") and "data.db" in files:
            db_path = os.path.join(root, "data.db")
            try:
                conn = sqlite3.connect(db_path)
                tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
                conn.close()
                if "meetings" in tables:
                    return db_path
            except: pass
    raise RuntimeError("Could not find meetings database")

MEETINGS_DB = find_meetings_db()

def get_transcription_client():
    """Try Groq first (free Whisper), fall back to OpenAI."""
    # Prefer .groq_key file (job-runner env injection is unreliable for custom keychain keys)
    groq_key = ""
    groq_key_file = os.path.join(os.path.dirname(__file__), ".groq_key")
    if os.path.exists(groq_key_file):
        groq_key = open(groq_key_file).read().strip()
    # Fall back to env, but only if it looks like a real Groq key
    if not groq_key:
        env_key = os.environ.get("GROQ_API_KEY", "")
        if env_key.startswith("gsk_"):
            groq_key = env_key
    if groq_key and groq_key.startswith("gsk_"):
        print(f"  Using Groq Whisper (free): {groq_key[:8]}... ({len(groq_key)} chars)")
        return OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1"), "whisper-large-v3"
    
    key_file = os.path.join(os.path.dirname(__file__), ".openai_platform_key")
    key = ""
    if os.path.exists(key_file):
        key = open(key_file).read().strip()
    if not key or not key.startswith("sk-"):
        key = os.environ.get("OPENAI_PLATFORM_KEY", "") or os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise RuntimeError("No API key found (tried GROQ_API_KEY, OPENAI_PLATFORM_KEY)")
    print(f"  Using OpenAI Whisper: {key[:8]}... ({len(key)} chars)")
    return OpenAI(api_key=key), "gpt-4o-transcribe"

def get_audio_duration(path):
    """Get duration in seconds via ffprobe."""
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip()) if r.stdout.strip() else 0

def remove_silence(input_path, output_path):
    """Remove silence segments > 3s, keeping 0.5s padding."""
    print(f"  Removing silence from {os.path.basename(input_path)}...")
    r = subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-af", "silenceremove=stop_periods=-1:stop_duration=3:stop_threshold=-35dB:stop_silence=0.5",
        "-ac", "1", "-ar", "16000",
        output_path
    ], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  Silence removal failed, using original: {r.stderr[:200]}")
        return input_path
    
    old_dur = get_audio_duration(input_path)
    new_dur = get_audio_duration(output_path)
    removed = old_dur - new_dur if old_dur > 0 else 0
    print(f"  Silence removed: {old_dur:.0f}s → {new_dur:.0f}s ({removed:.0f}s of silence stripped)")
    return output_path

def split_into_chunks(audio_path, chunk_dir, chunk_seconds=900):
    """Split audio into chunks of chunk_seconds (default 15 min)."""
    duration = get_audio_duration(audio_path)
    if duration <= chunk_seconds + 60:  # Don't chunk if barely over
        return [audio_path]
    
    n_chunks = int(duration / chunk_seconds) + 1
    print(f"  Splitting {duration:.0f}s audio into {n_chunks} chunks of {chunk_seconds}s...")
    
    chunks = []
    for i in range(n_chunks):
        start = i * chunk_seconds
        chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.mp3")
        r = subprocess.run([
            "ffmpeg", "-y", "-i", audio_path,
            "-ss", str(start), "-t", str(chunk_seconds),
            "-ac", "1", "-ar", "16000", "-b:a", "48k",
            chunk_path
        ], capture_output=True, text=True)
        if r.returncode == 0 and os.path.getsize(chunk_path) > 1000:
            chunks.append(chunk_path)
            size_mb = os.path.getsize(chunk_path) / (1024*1024)
            print(f"    Chunk {i}: {size_mb:.1f}MB")
    
    return chunks

def compress_single(audio_path):
    """Compress a single file to fit under Whisper limit."""
    file_size = os.path.getsize(audio_path)
    if file_size <= MAX_WHISPER_SIZE:
        return audio_path, False
    
    mp3_path = audio_path.replace(".wav", "_compressed.mp3")
    if os.path.exists(mp3_path) and os.path.getsize(mp3_path) <= MAX_WHISPER_SIZE:
        print(f"  Using existing compressed: {os.path.getsize(mp3_path) // (1024*1024)}MB")
        return mp3_path, True
    
    # Try progressively lower bitrates
    for bitrate in ["48k", "32k", "24k", "16k", "12k", "8k"]:
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_path, "-ac", "1", "-ar", "16000", "-b:a", bitrate, mp3_path],
            capture_output=True, text=True
        )
        if os.path.exists(mp3_path) and os.path.getsize(mp3_path) <= MAX_WHISPER_SIZE:
            print(f"  Compressed at {bitrate}: {os.path.getsize(mp3_path) // (1024*1024)}MB")
            return mp3_path, True
    
    return mp3_path, True

def transcribe_file(client, audio_path, model="whisper-large-v3", verbose=False, prompt=None):
    """Transcribe a single audio file via Whisper API.
    verbose=True returns segments with timestamps (needed for dual-track merge)."""
    kwargs = {"model": model, "response_format": "verbose_json" if verbose else "text"}
    if prompt:
        kwargs["prompt"] = prompt
    with open(audio_path, "rb") as f:
        kwargs["file"] = f
        return client.audio.transcriptions.create(**kwargs)


# Speaker prompt boosts proper-noun accuracy (Whisper `prompt` param)
DEFAULT_PROMPT = "Speakers include Shawkat Kabbara, Newton Howard, Wasseem, Chad. Discussing Paprwork, holographic embeddings, phase-amplitude coupling."


def _segments_from_verbose(vj):
    """Extract [(start, end, text)] from a verbose_json response (dict or object)."""
    segs = vj.get("segments") if isinstance(vj, dict) else getattr(vj, "segments", None)
    if not segs:
        # No segments → fall back to whole-file single segment
        text = vj.get("text") if isinstance(vj, dict) else getattr(vj, "text", "")
        return [(0.0, 0.0, (text or "").strip())] if text else []
    out = []
    for s in segs:
        if isinstance(s, dict):
            out.append((float(s.get("start", 0)), float(s.get("end", 0)), (s.get("text") or "").strip()))
        else:
            out.append((float(getattr(s, "start", 0)), float(getattr(s, "end", 0)), (getattr(s, "text", "") or "").strip()))
    return [x for x in out if x[2]]


def transcribe_dual_track(mic_path, sys_path):
    """Transcribe mic + system audio separately, merge chronologically with [me]/[remote] tags."""
    client, model = get_transcription_client()
    print(f"  Dual-track: mic={os.path.basename(mic_path)} sys={os.path.basename(sys_path)}")

    all_segments = []  # (start_sec, speaker, text)

    for path, speaker in [(mic_path, "me"), (sys_path, "remote")]:
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            print(f"  Skipping {speaker} track (missing or empty)")
            continue

        duration = get_audio_duration(path)
        size = os.path.getsize(path)
        print(f"  [{speaker}] {size // (1024*1024)}MB, {duration:.0f}s")

        with tempfile.TemporaryDirectory() as tmp:
            working = path
            # Silence removal WOULD break timestamp alignment across the two tracks,
            # so we skip it here and rely on chunking/compression for size.
            if os.path.getsize(working) > MAX_WHISPER_SIZE:
                if duration < CHUNK_MINUTES * 60 * 2:
                    working, _ = compress_single(working)

            if os.path.getsize(working) <= MAX_WHISPER_SIZE:
                try:
                    vj = transcribe_file(client, working, model, verbose=True, prompt=DEFAULT_PROMPT)
                    for start, end, text in _segments_from_verbose(vj):
                        all_segments.append((start, speaker, text))
                    print(f"    → {sum(1 for s in all_segments if s[1]==speaker)} segments")
                except Exception as e:
                    print(f"    ERROR [{speaker}]: {e}")
            else:
                # Chunk & transcribe with per-chunk time offset
                chunks = split_into_chunks(working, tmp, CHUNK_MINUTES * 60)
                for i, chunk in enumerate(chunks):
                    offset = i * CHUNK_MINUTES * 60
                    if os.path.getsize(chunk) > MAX_WHISPER_SIZE:
                        comp = chunk.replace(".mp3", "_comp.mp3")
                        subprocess.run(["ffmpeg","-y","-i",chunk,"-ac","1","-ar","16000","-b:a","24k",comp], capture_output=True)
                        chunk = comp
                    try:
                        vj = transcribe_file(client, chunk, model, verbose=True, prompt=DEFAULT_PROMPT)
                        for start, end, text in _segments_from_verbose(vj):
                            all_segments.append((start + offset, speaker, text))
                    except Exception as e:
                        print(f"    ERROR [{speaker}] chunk {i+1}: {e}")

    # Merge chronologically, collapsing consecutive segments from the same speaker
    all_segments.sort(key=lambda x: x[0])
    lines = []
    cur_speaker = None
    cur_buf = []
    for _, speaker, text in all_segments:
        if speaker != cur_speaker:
            if cur_buf:
                lines.append(f"[{cur_speaker}] " + " ".join(cur_buf))
            cur_speaker = speaker
            cur_buf = [text]
        else:
            cur_buf.append(text)
    if cur_buf:
        lines.append(f"[{cur_speaker}] " + " ".join(cur_buf))

    combined = "\n\n".join(lines)
    print(f"  Merged transcript: {len(combined)} chars, {len(lines)} speaker turns")
    return combined

def transcribe_audio(audio_path):
    """Full pipeline: silence removal → chunk → transcribe → combine."""
    client, model = get_transcription_client()
    duration = get_audio_duration(audio_path)
    file_size = os.path.getsize(audio_path)
    print(f"  Audio: {file_size // (1024*1024)}MB, {duration:.0f}s ({duration/60:.1f} min)")
    
    with tempfile.TemporaryDirectory() as tmp:
        working_path = audio_path
        
        # Step 1: Remove silence for files > 5 min
        if duration > 300:
            desilenced = os.path.join(tmp, "desilenced.wav")
            working_path = remove_silence(audio_path, desilenced)
        
        new_duration = get_audio_duration(working_path)
        new_size = os.path.getsize(working_path)
        
        # Step 2: If small enough after silence removal, transcribe directly
        if new_size <= MAX_WHISPER_SIZE:
            print(f"  File fits under 24MB after processing, transcribing directly...")
            return transcribe_file(client, working_path, model)
        
        # Step 3: Try compression
        if new_duration < CHUNK_MINUTES * 60 * 2:  # Under 30 min
            compressed, _ = compress_single(working_path)
            if os.path.getsize(compressed) <= MAX_WHISPER_SIZE:
                print(f"  Compressed fits, transcribing directly...")
                return transcribe_file(client, compressed, model)
        
        # Step 4: Chunk and transcribe each piece
        print(f"  File too large even compressed, chunking into {CHUNK_MINUTES}-min segments...")
        chunks = split_into_chunks(working_path, tmp, CHUNK_MINUTES * 60)
        
        all_text = []
        for i, chunk in enumerate(chunks):
            # Compress chunk if needed
            chunk_size = os.path.getsize(chunk)
            if chunk_size > MAX_WHISPER_SIZE:
                comp_chunk = chunk.replace(".mp3", "_comp.mp3")
                subprocess.run(
                    ["ffmpeg", "-y", "-i", chunk, "-ac", "1", "-ar", "16000", "-b:a", "24k", comp_chunk],
                    capture_output=True
                )
                chunk = comp_chunk
            
            print(f"  Transcribing chunk {i+1}/{len(chunks)} ({os.path.getsize(chunk) // (1024*1024)}MB)...")
            try:
                text = transcribe_file(client, chunk, model)
                if text and text.strip():
                    all_text.append(text.strip())
                    print(f"    → {len(text)} chars")
            except Exception as e:
                print(f"    ERROR on chunk {i+1}: {e}")
        
        combined = " ".join(all_text)
        print(f"  Combined transcript: {len(combined)} chars from {len(all_text)} chunks")
        return combined

def save_transcript(meeting_id, transcript_text):
    """Save transcript text to database."""
    conn = sqlite3.connect(MEETINGS_DB)
    text = transcript_text if isinstance(transcript_text, str) else transcript_text.text if hasattr(transcript_text, 'text') else str(transcript_text)
    
    conn.execute("""
        UPDATE meetings 
        SET transcript = ?, status = 'pending', updated_at = strftime('%s','now')
        WHERE id = ?
    """, (text, meeting_id))
    conn.commit()
    conn.close()
    
    print(f"  Saved: {len(text)} chars. Status → pending")
    return text

def main():
    conn = sqlite3.connect(MEETINGS_DB)
    rows = conn.execute(
        "SELECT id, title, audio_path FROM meetings WHERE status IN ('recorded','transcribing') ORDER BY created_at ASC"
    ).fetchall()
    conn.close()
    
    if not rows:
        print("No meetings to transcribe.")
        return
    
    print(f"Found {len(rows)} meeting(s) to transcribe.\n")
    success = 0
    
    for mid, title, audio_path in rows:
        print(f"Processing: {title} ({mid})")
        
        # Find audio file(s) — prefer dual-track {id}_mic.wav + {id}_sys.wav
        rec_dir = os.path.join(RECORDER_JOB_DIR, "data", "recordings")
        mic_path = os.path.join(rec_dir, f"{mid}_mic.wav")
        sys_path = os.path.join(rec_dir, f"{mid}_sys.wav")
        per_meeting = os.path.join(rec_dir, f"{mid}.wav")

        has_mic = os.path.exists(mic_path) and os.path.getsize(mic_path) > 1000
        has_sys = os.path.exists(sys_path) and os.path.getsize(sys_path) > 1000
        dual_track = has_mic and has_sys

        if dual_track:
            path = None  # signaled by dual_track flag below
        elif audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
            path = audio_path
        elif os.path.exists(per_meeting) and os.path.getsize(per_meeting) > 1000:
            path = per_meeting
        elif has_mic:
            path = mic_path  # fallback: only mic captured
        elif has_sys:
            path = sys_path  # fallback: only sys captured
        else:
            print(f"  SKIP: No audio file found\n")
            continue

        # Mark transcribing
        c = sqlite3.connect(MEETINGS_DB)
        c.execute("UPDATE meetings SET status='transcribing', updated_at=strftime('%s','now') WHERE id=?", (mid,))
        c.commit(); c.close()

        try:
            if dual_track:
                print(f"  Dual-track mode: transcribing mic + system audio separately")
                transcript = transcribe_dual_track(mic_path, sys_path)
            else:
                transcript = transcribe_audio(path)
            text = save_transcript(mid, transcript)
            preview = text[:200] + "..." if len(text) > 200 else text
            print(f"  Preview: {preview}\n")
            success += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            c = sqlite3.connect(MEETINGS_DB)
            c.execute("UPDATE meetings SET status='recorded', updated_at=strftime('%s','now') WHERE id=?", (mid,))
            c.commit(); c.close()
    
    print(f"\nDone! Transcribed {success}/{len(rows)} meetings.")

if __name__ == "__main__":
    main()
