#!/usr/bin/env python3
"""Synthesize narration with a local TTS backend (optional).

    python scripts/tts_narration.py --project examples/lesa --voice Samantha

Uses macOS `say` (free, local, no account) or pyttsx3. Word timings from a TTS
backend are estimated from each scene's audio duration and labelled as such.
Audio is written under transcript/audio/ (git-ignored).
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
    ap.add_argument("--voice", default=None)
    ap.add_argument("--scene", default=None, help="synthesize one scene only")
    ap.add_argument("--backend", default="auto", choices=["auto", "say", "pyttsx3"])
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))

    backends = audio_mod.tts_backends()
    if args.backend == "auto" and not (backends["say"] or backends["pyttsx3"]):
        C.fail("no local TTS backend (macOS 'say' or pyttsx3); silent mode needs no audio")
    if args.backend == "say" and not backends["say"]:
        C.fail("macOS 'say' not available")

    scenes = [s for s in data["scenes"] if not args.scene or s["id"] == args.scene]
    if not scenes:
        C.fail(f"no scene matching {args.scene}")

    audio_dir = tdir / "audio"
    manifest = {"backend": args.backend, "voice": args.voice, "scenes": []}
    for scene in scenes:
        text = " ".join(b["text"].strip() for b in scene["narration"])
        out = audio_dir / f"{scene['id']}.aiff"
        info = audio_mod.synthesize(text, out, backend=args.backend, voice=args.voice)
        manifest["scenes"].append({"id": scene["id"], "path": str(out.relative_to(proj["path"])),
                                   "duration": round(info["duration"], 3), "words": scene["word_count"]})
        print(f"  {scene['id']}: {info['duration']:.2f}s -> {out}")
    (audio_dir / "audio_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"tts: {len(manifest['scenes'])} scene(s), backend {manifest['scenes'][0] and args.backend or args.backend}")
    print("note: word timings from local TTS are estimated from audio duration.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
