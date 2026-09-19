#!/usr/bin/env python3
"""Mux narration audio onto rendered scenes and concatenate a narrated video.

    python scripts/mux_narration.py --project examples/lesa --quality final

For each scene, the video is extended (frozen last frame) or the audio is padded
so the output is as long as the longer of the two: no spoken words are cut and
no silent gap is longer than the animation. Scenes are then concatenated.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil

import _common as C
from audio import probe_duration

AUDIO_EXTS = (".aiff", ".wav", ".m4a", ".mp3", ".flac")


def find_audio(audio_dir: pathlib.Path, scene_id: str) -> pathlib.Path | None:
    for ext in AUDIO_EXTS:
        p = audio_dir / f"{scene_id}{ext}"
        if p.exists():
            return p
    return None


def mux_scene(video: pathlib.Path, audio: pathlib.Path, out: pathlib.Path) -> tuple[float, float]:
    C.require_ffmpeg()
    vd, ad = probe_duration(video), probe_duration(audio)
    extend = max(0.0, ad - vd)
    filt = (f"[0:v]tpad=stop_mode=clone:stop_duration={extend:.3f}[v];[1:a]apad[a]")
    cmd = ["ffmpeg", "-y", "-i", str(video), "-i", str(audio),
           "-filter_complex", filt, "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p",
           "-shortest", str(out)]
    r = C.run(cmd)
    if r.returncode != 0:
        tail = (r.stderr or "").strip().splitlines()[-8:]
        C.fail(f"ffmpeg mux failed for {video.name}:\n  " + "\n  ".join(tail))
    return vd, ad


def concat(files: list[pathlib.Path], out: pathlib.Path) -> None:
    list_file = out.parent / "_narrated_concat.txt"
    list_file.write_text("\n".join(f"file '{f.resolve()}'" for f in files), encoding="utf-8")
    r = C.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
               "-c", "copy", str(out)])
    if r.returncode != 0:
        tail = (r.stderr or "").strip().splitlines()[-8:]
        C.fail("ffmpeg concat failed:\n  " + "\n  ".join(tail))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--quality", choices=["draft", "final"], default="final")
    ap.add_argument("--audio-dir", default=None)
    ap.add_argument("--output", default=None)
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    audio_dir = pathlib.Path(args.audio_dir) if args.audio_dir else proj["path"] / "transcript" / "audio"
    if not audio_dir.exists():
        C.fail(f"no narration audio in {audio_dir}; run tts_narration.py or record narration first")

    work = proj["path"] / "renders" / "_narrated_work" / args.quality
    work.mkdir(parents=True, exist_ok=True)
    pieces = []
    print(f"muxing {len(proj['spec']['scenes'])} scene(s) at {args.quality} quality")
    for scene in proj["spec"]["scenes"]:
        sid = scene["id"]
        video = proj["path"] / "renders" / args.quality / f"{sid}.mp4"
        audio = find_audio(audio_dir, sid)
        if not video.exists():
            C.fail(f"missing rendered scene {video}; render before muxing")
        if not audio:
            C.fail(f"missing narration audio for {sid} in {audio_dir}")
        out = work / f"{sid}.mp4"
        vd, ad = mux_scene(video, audio, out)
        pieces.append(out)
        delta = ad - vd
        note = f"video +{delta:.1f}s hold" if delta > 0 else f"audio padded +{-delta:.1f}s"
        print(f"  {sid:<28} video {vd:5.1f}s  audio {ad:5.1f}s  ({note})")

    out = pathlib.Path(args.output) if args.output else \
        proj["path"] / "renders" / args.quality / "lesa-method-explainer-narrated.mp4"
    concat(pieces, out)
    print(f"narrated video -> {out} ({probe_duration(out):.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
