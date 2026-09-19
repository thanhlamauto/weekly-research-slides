#!/usr/bin/env python3
"""Regenerate SRT/VTT sidecar subtitles from transcript.json."""

from __future__ import annotations

import argparse
import json
import pathlib

import _common as C
import subtitles as S


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--max-chars", type=int, default=S.DEFAULT_MAX_CHARS)
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))
    cues = S.cues_from_transcript(data, max_chars=args.max_chars)
    (tdir / "transcript.srt").write_text(S.to_srt(cues), encoding="utf-8")
    (tdir / "transcript.vtt").write_text(S.to_vtt(cues), encoding="utf-8")
    print(f"subtitles: {len(cues)} cues, max line {S.max_line_length(cues)} chars -> "
          f"{tdir / 'transcript.srt'}, {tdir / 'transcript.vtt'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
