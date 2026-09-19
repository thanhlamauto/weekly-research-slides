#!/usr/bin/env python3
"""Geometric pre-flight and visual preview for a figure.

    python scripts/qa_figure.py --spec figure_spec.yaml --style topconf-clean \
        --output-dir qa

Runs the static pre-flight, renders a PNG preview, and writes qa_report.json and
defect-log.md. Exit code is 1 when there are errors.
"""

from __future__ import annotations

import argparse
import pathlib

import yaml

import _common as C
import qa as qa_mod
import spec as spec_mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--spec")
    src.add_argument("--method")
    ap.add_argument("--style", default=None)
    ap.add_argument("--type", default="method-overview")
    ap.add_argument("--output-dir", default="qa")
    args = ap.parse_args()

    if args.spec:
        spec = C.load_spec(args.spec)
    else:
        model = yaml.safe_load(C.resolve(args.method).read_text(encoding="utf-8"))
        spec = spec_mod.from_method_model(model, style=args.style or "topconf-clean",
                                          figure_type=args.type)

    ir, _ = C.build_ir(spec, args.style)
    findings = qa_mod.preflight(ir)
    summary = qa_mod.summarize(findings)

    outdir = pathlib.Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    report = {"figure": ir["figure"]["id"], "counts": {k: summary[k] for k in ("errors", "warnings")},
              "findings": findings}
    (outdir / "qa_report.json").write_text(yaml.safe_dump(report, sort_keys=False), encoding="utf-8")

    preview = C.write_artifacts(ir, outdir / "preview", formats=("svg", "png"))
    lines = [f"# Defect log — {ir['figure']['id']}", "",
             f"- errors: {summary['errors']}", f"- warnings: {summary['warnings']}", ""]
    for f in findings:
        lines.append(f"- [{f['level']}] `{f['code']}` {f['where']}: {f['message']}")
    if not findings:
        lines.append("- no defects found by the static pre-flight")
    (outdir / "defect-log.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    for f in findings:
        print(f"[{f['level']}] {f['code']} {f['where']}: {f['message']}")
    print(f"qa: {summary['errors']} error(s), {summary['warnings']} warning(s)")
    if "png" in preview:
        print(f"preview: {preview['png']}")
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
