#!/usr/bin/env python3
"""Voice QA: static narration checks plus audio sanity checks.

    python scripts/qa_voice.py --project examples/lesa
    python scripts/qa_voice.py --project examples/lesa \
        --audio-dir transcript/audio/gemini --renders-dir renders/final

Writes qa/voice/report.json. Exits non-zero on errors (for example narration
that is more than 3s longer than its animation, which means the pacing must be
rebuilt rather than finished on a frozen frame).
"""

from __future__ import annotations

import argparse
import json
import pathlib

import _common as C
import audio as audio_mod
import delivery as D
import voice_qa as V


def _rendered_durations(renders_dir: pathlib.Path | None) -> dict[str, float]:
    out: dict[str, float] = {}
    if not renders_dir or not renders_dir.exists():
        return out
    for f in sorted(renders_dir.glob("*.mp4")):
        try:
            out[f.stem] = audio_mod.probe_duration(f)
        except Exception:
            continue
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--audio-dir", default=None)
    ap.add_argument("--renders-dir", default=None)
    ap.add_argument("--mux-report", default=None,
                    help="use end-frame padding measured by mux_narration (default: renders/<quality>/narration_mux_report.json)")
    ap.add_argument("--output", default=None, help="default <project>/qa/voice/report.json")
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))
    plan = D.build_plan(data)

    audio_dir = pathlib.Path(args.audio_dir) if args.audio_dir else None
    manifest = None
    if audio_dir is None:
        for candidate in (tdir / "audio" / "gemini", tdir / "audio"):
            if (candidate / "audio_manifest.json").exists():
                audio_dir = candidate
                manifest = json.loads((candidate / "audio_manifest.json").read_text(encoding="utf-8"))
                break
    elif (audio_dir / "audio_manifest.json").exists():
        manifest = json.loads((audio_dir / "audio_manifest.json").read_text(encoding="utf-8"))

    renders_dir = pathlib.Path(args.renders_dir) if args.renders_dir else proj["path"] / "renders" / "final"
    rendered = _rendered_durations(renders_dir)
    mux_report = pathlib.Path(args.mux_report) if args.mux_report else renders_dir / "narration_mux_report.json"
    if mux_report.exists():
        # The narrated timeline is the truth: padding was measured at mux time,
        # not by comparing silent renders against narration audio.
        rendered = None

    findings = V.qa(data, plan, audio_dir=audio_dir, rendered=rendered, manifest=manifest)
    if rendered is None and mux_report.exists():
        findings.extend(V.padding_from_mux_report(json.loads(mux_report.read_text(encoding="utf-8"))))
    out = pathlib.Path(args.output) if args.output else proj["path"] / "qa" / "voice" / "report.json"
    report = V.write_report(findings, out)
    for f in findings:
        print(f"[{f['level']}] {f['where']}: {f['message']}")
    print(f"voice qa: {report['errors']} error(s), {report['warnings']} warning(s), "
          f"{report['infos']} info -> {out}")
    if audio_dir:
        print(f"  audio: {audio_dir}")
    if rendered:
        print(f"  renders: {renders_dir} ({len(rendered)} scene(s))")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
