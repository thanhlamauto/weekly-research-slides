#!/usr/bin/env python3
"""Align a recorded narration to the canonical transcript.

    python scripts/align_recording.py --project examples/lesa --audio narration.wav

Uses WhisperX forced alignment when it is installed; otherwise it falls back to
a clearly-labelled estimate that scales the transcript's estimated word times to
the recording duration. The canonical text is never replaced by ASR output.
"""

from __future__ import annotations

import argparse
import json
import pathlib

import _common as C
import audio as audio_mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--audio", required=True)
    ap.add_argument("--backend", default="auto", choices=["auto", "whisperx", "estimated"])
    ap.add_argument("--language", default="en")
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))

    audio_path = pathlib.Path(args.audio)
    if not audio_path.exists():
        audio_path = proj["path"] / args.audio
    if not audio_path.exists():
        C.fail(f"audio not found: {args.audio}")

    backends = audio_mod.alignment_backends()
    if args.backend == "whisperx" and not backends["whisperx"]:
        C.fail("WhisperX is not installed. Install it (pip install whisperx) or use --backend estimated.")
    if args.backend == "auto" and not backends["whisperx"]:
        print("note: WhisperX not installed; using estimated alignment (not forced alignment).")
        print("      install whisperx for word-accurate forced alignment.")

    words, method = audio_mod.align(audio_path, data, backend=args.backend, language=args.language)
    out = {"method": method, "audio": str(audio_path), "words": words}
    (tdir / "word_times.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"alignment: {method}  words: {len(words)} -> {tdir / 'word_times.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
