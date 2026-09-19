#!/usr/bin/env python3
"""Transcript QA: narration, linking, subtitles and (optionally) render timing."""

from __future__ import annotations

import argparse
import json
import pathlib

import _common as C
import qa_transcript as QA
import subtitles as S
import transcript as T


def _rendered_durations(directory: pathlib.Path) -> dict:
    from audio import probe_duration
    out = {}
    for mp4 in sorted(directory.glob("*.mp4")):
        try:
            out[mp4.stem] = round(probe_duration(mp4), 2)
        except Exception:
            pass
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--rendered-dir", default=None, help="directory of per-scene mp4s to compare against")
    ap.add_argument("--max-chars", type=int, default=S.DEFAULT_MAX_CHARS)
    ap.add_argument("--report", default=None)
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))

    rendered = _rendered_durations(pathlib.Path(args.rendered_dir)) if args.rendered_dir else None
    findings = T.link_check(data, proj["spec"]) + QA.qa(data, proj["spec"], rendered, args.max_chars)
    summary = QA.summarize(findings)

    report_path = pathlib.Path(args.report) if args.report else proj["path"] / "qa" / "transcript_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps({"counts": {"errors": summary["errors"],
                                                  "warnings": summary["warnings"]},
                                       "findings": findings}, indent=2), encoding="utf-8")
    for f in findings:
        print(f"[{f['level']}] {f['where']}: {f['message']}")
    print(f"transcript qa: {summary['errors']} error(s), {summary['warnings']} warning(s) -> {report_path}")
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
