#!/usr/bin/env python3
"""Build the transcript artifacts from the authored narration source.

    python scripts/build_transcript.py --project examples/lesa \
        --audience adjacent-researcher

Reads <project>/transcript/transcript.yaml, estimates deterministic timings,
and writes narration.md, transcript.json, transcript.srt, transcript.vtt and
word_times.json. The narration text is never inferred from a rendered video.
"""

from __future__ import annotations

import argparse
import pathlib

import yaml

import _common as C
import transcript as T
import subtitles as S
import delivery as D


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--source", default=None, help="authored transcript yaml (default transcript/transcript.yaml)")
    ap.add_argument("--audience", default=None, choices=list(T.AUDIENCE_PROFILES))
    ap.add_argument("--mode", default=None, choices=["silent", "tts", "recorded"])
    ap.add_argument("--max-chars", type=int, default=S.DEFAULT_MAX_CHARS)
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    source = pathlib.Path(args.source) if args.source else tdir / "transcript.yaml"
    if not source.exists():
        C.fail(f"authored narration source not found: {source}")
    data = T.load(source)
    if args.audience:
        data["audience"]["level"] = args.audience
        data["audience"].pop("target_wpm", None)
    if args.mode:
        data["mode"] = args.mode

    enriched, word_times = T.estimate(data)
    findings = T.link_check(enriched, proj["spec"])
    for f in findings:
        print(f"[{f['level']}] {f['where']}: {f['message']}")

    import json
    tdir.mkdir(parents=True, exist_ok=True)
    plan = D.write_plan(enriched, tdir / "delivery_plan.yaml")
    (tdir / "narration.md").write_text(T.narration_markdown(enriched), encoding="utf-8")
    (tdir / "transcript.json").write_text(
        json.dumps(enriched, indent=2, ensure_ascii=False), encoding="utf-8")
    (tdir / "word_times.json").write_text(
        json.dumps({"method": "estimated", "words": word_times}, indent=2), encoding="utf-8")
    cues = S.cues_from_transcript(enriched, max_chars=args.max_chars)
    (tdir / "transcript.srt").write_text(S.to_srt(cues), encoding="utf-8")
    (tdir / "transcript.vtt").write_text(S.to_vtt(cues), encoding="utf-8")

    print(f"transcript: {enriched['video']['id']}  audience={enriched['audience']['level']}  "
          f"mode={enriched.get('mode', 'silent')}")
    print(f"  words: {enriched['word_count']}  estimated duration: {enriched['duration_seconds']:.1f}s  "
          f"cues: {len(cues)}  max line: {S.max_line_length(cues)}")
    print(f"  delivery plan: profile {plan['profile']}, {len(plan['chunks'])} semantic chunk(s)")
    for scene in enriched["scenes"]:
        print(f"  {scene['id']:<28} {scene['duration_seconds']:6.1f}s  {scene['word_count']:>3} words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
