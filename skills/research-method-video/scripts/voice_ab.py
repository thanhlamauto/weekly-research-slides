#!/usr/bin/env python3
"""A/B the same narration with two voices: macOS Samantha vs Gemini Kore.

    python scripts/voice_ab.py --project examples/lesa --gemini live
    python scripts/voice_ab.py --project examples/lesa --gemini dry-run

Writes qa/voice/ab/{samantha,gemini-kore}/ plus comparison.md. The script is
identical on both sides: only the voice changes. When Gemini credentials are
missing, the Gemini side is a dry run (prompt + cache key) and comparison.md
says so explicitly instead of pretending audio was generated.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import subprocess

import _common as C
import audio as audio_mod
import delivery as D
import tts_gemini as G

SEGMENTS = {
    "setup": "lesa_01_why_cache",
    "aha": "lesa_03_stage_dynamics",
    "training": "lesa_06_training",
}


def pitch_proxy(path: pathlib.Path) -> dict | None:
    """Autocorrelation F0 proxy. Not a perceptual quality measure."""
    try:
        import numpy as np
    except Exception:
        return None
    if not shutil.which("ffmpeg"):
        return None
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000",
                        "-f", "f32le", "-"], capture_output=True)
    if r.returncode != 0:
        return None
    x = np.frombuffer(r.stdout, dtype="<f4")
    frame, hop, rate = 640, 320, 16000
    f0 = []
    for i in range(0, max(0, len(x) - frame), hop):
        seg = x[i:i + frame]
        if float(np.sqrt((seg ** 2).mean())) < 1e-3:
            continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, "full")[frame - 1:]
        lo, hi = int(rate / 400), int(rate / 80)
        if hi >= len(ac):
            continue
        peak = lo + int(np.argmax(ac[lo:hi]))
        if peak > 0:
            f0.append(rate / peak)
    if len(f0) < 5:
        return None
    arr = np.array(f0)
    return {"frames": int(len(arr)), "mean_hz": round(float(arr.mean()), 1),
            "std_hz": round(float(arr.std()), 1),
            "p10_hz": round(float(np.percentile(arr, 10)), 1),
            "p90_hz": round(float(np.percentile(arr, 90)), 1)}


def compress(src: pathlib.Path, dst: pathlib.Path) -> bool:
    if not shutil.which("ffmpeg"):
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-c:a", "aac",
                        "-b:a", "96k", str(dst)], capture_output=True)
    return r.returncode == 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--gemini", choices=["dry-run", "live"], default="dry-run")
    ap.add_argument("--segments", default="setup,aha,training")
    ap.add_argument("--model", default=G.DEFAULT_MODEL)
    ap.add_argument("--voice", default=G.DEFAULT_VOICE)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--no-reuse", action="store_true",
                    help="always synthesize the Gemini side instead of reusing project narration audio")
    ap.add_argument("--keep-wav", action="store_true", help="keep uncompressed audio (local only)")
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    data = json.loads((tdir / "transcript.json").read_text(encoding="utf-8"))
    plan = D.build_plan(data)
    out = proj["path"] / "qa" / "voice" / "ab"
    sam_dir, gem_dir = out / "samantha", out / "gemini-kore"
    sam_dir.mkdir(parents=True, exist_ok=True)
    gem_dir.mkdir(parents=True, exist_ok=True)

    auth = G.auth_status()
    live = args.gemini == "live"
    if live and not auth["available"]:
        print(f"[warn] Gemini unavailable: {auth['detail']}")
        print("[warn] writing the Gemini side as a dry run; comparison.md will say so")
        live = False

    rows = []
    for name in [s.strip() for s in args.segments.split(",") if s.strip()]:
        sid = SEGMENTS.get(name)
        if not sid:
            C.fail(f"unknown segment '{name}' (have: {', '.join(SEGMENTS)})")
        scene = next(s for s in data["scenes"] if s["id"] == sid)
        text = " ".join(b["text"].strip() for b in scene["narration"])
        scene_chunks = [c for c in plan["chunks"] if c["scene_id"] == sid]
        prompt = "\n\n".join(c["prompt"] for c in scene_chunks)
        (gem_dir / f"{sid}.prompt.txt").write_text(prompt, encoding="utf-8")

        # A: macOS Samantha
        sam_wav = sam_dir / f"{sid}.aiff"
        sam_info = audio_mod.synthesize(text, sam_wav, backend="say", voice="Samantha")
        sam_m4a = sam_dir / f"{sid}.m4a"
        compress(sam_wav, sam_m4a)

        # B: Gemini Kore. Reuse the project's generated scene audio when it
        # exists (same script, same delivery plan) instead of spending API quota.
        gem_meta = {"model": args.model, "voice": args.voice, "generated": False,
                    "cache_key": G.cache_key(model=args.model, voice=args.voice, prompt=prompt)}
        gem_duration = None
        gem_m4a = None
        project_audio = tdir / "audio" / "gemini" / f"{sid}.wav"
        if live and project_audio.exists() and not args.no_reuse:
            local = gem_dir / f"{sid}.wav"
            shutil.copyfile(project_audio, local)
            gem_duration = G.probe_duration(local)
            gem_meta.update({"generated": True, "source": "project narration (reused, no new API call)"})
            gem_m4a = gem_dir / f"{sid}.m4a"
            compress(local, gem_m4a)
        elif live:
            gem_wav = gem_dir / f"{sid}.wav"
            try:
                info = G.synthesize(text, gem_wav, model=args.model, voice=args.voice,
                                    prompt=prompt, cache_dir=gem_dir / "cache", force=args.force)
                gem_meta.update({"generated": True, "cached": info["cached"], "key": info["key"]})
                gem_duration = info["duration"]
                gem_m4a = gem_dir / f"{sid}.m4a"
                compress(gem_wav, gem_m4a)
            except G.GeminiError as exc:
                gem_meta["error"] = str(exc)
                print(f"[warn] Gemini failed for {name}: {exc}")
        else:
            (gem_dir / f"{sid}.meta.json").write_text(json.dumps(gem_meta, indent=2), encoding="utf-8")

        rows.append({
            "segment": name, "scene": sid, "text": text,
            "delivery": {b["beat_id"]: (b.get("delivery") or {}) for b in scene["narration"]},
            "prompt": prompt,
            "samantha": {"duration": sam_info["duration"], "file": str(sam_m4a.relative_to(out)),
                         "pitch": pitch_proxy(sam_wav)},
            "gemini": {"duration": gem_duration, "file": str(gem_m4a.relative_to(out)) if gem_m4a else None,
                       "meta": gem_meta, "pitch": pitch_proxy(gem_dir / f"{sid}.wav") if live else None},
            "estimated_seconds": scene.get("duration_seconds"),
        })
        print(f"  {name:<9} {sid:<28} Samantha {sam_info['duration']:5.1f}s"
              + (f"  Gemini {gem_duration:5.1f}s" if gem_duration else "  Gemini dry-run"))

    _write_comparison(out / "comparison.md", rows, args, auth)
    print(f"A/B -> {out}/comparison.md")
    return 0


def _fmt_pitch(p: dict | None) -> str:
    if not p:
        return "n/a"
    return f"F0 {p['mean_hz']}Hz, sd {p['std_hz']}Hz, p10-p90 {p['p10_hz']}-{p['p90_hz']}Hz"


def _write_comparison(path: pathlib.Path, rows: list[dict], args, auth: dict) -> None:
    lines = [
        "# Voice A/B — Samantha (macOS `say`) vs Gemini Kore",
        "",
        "Same script, same delivery plan, same chunk boundaries. Only the voice backend changes.",
        "",
        f"- Gemini model: `{args.model}`, voice `{args.voice}`",
        f"- Gemini auth: {auth['mode'] or 'unavailable'} — {auth['detail']}",
        f"- Gemini audio generated: {'yes' if any(r['gemini']['duration'] for r in rows) else 'no (dry run)'}",
        "",
        "Objective measurements only. Subjective listening quality is a human judgement and is not claimed here.",
        "The pitch proxy is an autocorrelation F0 estimate, not a perceptual quality metric.",
        "",
        "| segment | scene | words | Samantha | Gemini Kore |",
        "|---|---|---|---|---|",
    ]
    for r in rows:
        sam = f"{r['samantha']['duration']:.1f}s" if r["samantha"]["duration"] else "n/a"
        gem = f"{r['gemini']['duration']:.1f}s" if r["gemini"]["duration"] else "dry run"
        lines.append(f"| {r['segment']} | `{r['scene']}` | {len(r['text'].split())} | {sam} | {gem} |")
    lines.append("")
    for r in rows:
        lines += [
            f"## {r['segment']} — `{r['scene']}`",
            "",
            "**Transcript**",
            "",
            "> " + r["text"],
            "",
            "**Delivery instructions**",
            "",
        ]
        for beat_id, d in r["delivery"].items():
            bits = [f"`{beat_id}`"]
            for key in ("intent", "tone", "pace", "energy"):
                if d.get(key):
                    bits.append(f"{key}={d[key]}")
            for key in ("pause_before_ms", "pause_after_ms"):
                if d.get(key):
                    bits.append(f"{key.replace('_ms', '')}={d[key]}ms")
            if d.get("emphasis"):
                bits.append(f"emphasis={', '.join(d['emphasis'])}")
            if d.get("direction"):
                bits.append(f"direction: {d['direction']}")
            lines.append(f"- {'; '.join(bits)}")
        lines += [
            "",
            "**Samantha**",
            "",
            f"- duration {r['samantha']['duration']:.2f}s, pitch proxy {_fmt_pitch(r['samantha']['pitch'])}",
            f"- file `{r['samantha']['file']}`",
            "",
            "**Gemini Kore**",
            "",
        ]
        if r["gemini"]["duration"]:
            lines += [f"- duration {r['gemini']['duration']:.2f}s, pitch proxy {_fmt_pitch(r['gemini']['pitch'])}",
                      f"- file `{r['gemini']['file']}`"]
        else:
            lines += ["- not generated (dry run)",
                      f"- prompt `gemini-kore/{r['scene']}.prompt.txt`",
                      f"- cache key `{r['gemini']['meta']['cache_key']}`"]
            if r["gemini"]["meta"].get("error"):
                lines.append(f"- error: {r['gemini']['meta']['error']}")
        lines += [
            "",
            "**Timing effect on animation**",
            "",
            f"- estimated narration for this scene: {r['estimated_seconds']:.1f}s"
            if r["estimated_seconds"] else "- estimated narration: n/a",
            f"- Samantha audio changes the scene hold by "
            f"{r['samantha']['duration'] - (r['estimated_seconds'] or r['samantha']['duration']):+.1f}s",
        ]
        if r["gemini"]["duration"]:
            lines.append(f"- Gemini audio changes the scene hold by "
                         f"{r['gemini']['duration'] - (r['estimated_seconds'] or r['gemini']['duration']):+.1f}s")
        lines += [
            "",
            "**Listening observations**",
            "",
            "- objective: see durations and pitch proxy above; re-render with `--timing transcript` to",
            "  see the animation follow the voice.",
            "- subjective (pauses, emphasis, naturalness): human review required; not claimed by this report.",
            "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
