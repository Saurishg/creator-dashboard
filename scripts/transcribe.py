#!/usr/bin/env python3
"""Local Whisper transcription — called from Node.js pipeline.
Usage: python3 scripts/transcribe.py <video_url> [model_size]
Prints transcript to stdout, exits 0 on success."""
import sys, os, tempfile, urllib.request

def main():
    if len(sys.argv) < 2:
        print("", end="")
        sys.exit(0)

    url = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"

    import whisper

    tmp = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            tmp = f.name

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp, "wb") as out:
            out.write(resp.read())

        model = whisper.load_model(model_name)
        result = model.transcribe(tmp, fp16=True, language=None)
        print(result["text"].strip())
    except Exception as e:
        print(f"[whisper error: {e}]", file=sys.stderr)
        print("", end="")
    finally:
        if tmp:
            try: os.unlink(tmp)
            except: pass

if __name__ == "__main__":
    main()
