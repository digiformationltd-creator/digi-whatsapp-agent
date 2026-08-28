#!/usr/bin/env python3
"""
Official OpenAI Whisper CLI Bridge (https://github.com/openai/whisper)
Loads official OpenAI Whisper model and transcribes audio files to clean text.
"""

import sys
import os
import json
import warnings

warnings.filterwarnings("ignore")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No audio file provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(json.dumps({"ok": False, "error": f"File not found: {audio_path}"}))
        sys.exit(1)

    model_name = os.environ.get("WHISPER_MODEL", "base")

    try:
        import whisper
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path, fp16=False)
        text = (result.get("text") or "").strip()
        print(json.dumps({
            "ok": True,
            "text": text,
            "language": result.get("language", "auto"),
            "model": model_name
        }))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
