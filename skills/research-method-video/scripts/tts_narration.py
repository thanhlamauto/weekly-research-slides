#!/usr/bin/env python3
"""Synthesize narration with a selected TTS backend.

    # preferred: expressive, prosody-aware narration (needs Gemini auth)
    python scripts/tts_narration.py --project examples/lesa --backend gemini --voice Kore

    # local zero-account fallback / smoke test
    python scripts/tts_narration.py --project examples/lesa --backend say --voice Samantha

    # plan only: no network, writes the delivery plan and provider prompts
    python scripts/tts_narration.py --project examples/lesa --backend gemini --dry-run

The canonical transcript is never changed here. Synthesis is per semantic chunk
(8-25s), not per sentence, and actual audio durations replace the estimated
timings in transcript.json so animation pacing follows the voice.
"""

from __future__ import annotations

import argparse
import json
import pathlib

import yaml

import _common as C
import audio as audio_mod
import delivery as D
import transcript as T
import tts_gemini as G
import subtitles as S


def _cfg_voice(cfg: dict) -> str | None:
    voice = cfg.get("voice")
    if isinstance(voice, dict):
        return voice.get("name")
    return voice


def _fallback_cfg(cfg: dict, override: str | None) -> tuple[str | None, str | None]:
    if override == "none":
        return None, None
    fb = cfg.get("fallback") or {}
    backend = override or fb.get("backend")
    voice = fb.get("voice") or ("Samantha" if backend in ("say", "macos-say") else None)
    return backend, voice


def _scene_filter(data: dict, spec: str | None) -> list[dict]:
    if not spec:
        return data["scenes"]
    ids = {s.strip() for s in spec.split(",") if s.strip()}
    scenes = [s for s in data["scenes"] if s["id"] in ids]
    if not scenes:
        C.fail(f"no scene matching {spec}")
    return scenes


def _write_artifacts(tdir: pathlib.Path, data: dict, word_times: list[dict], method: str) -> None:
    (tdir / "narration.md").write_text(T.narration_markdown(data), encoding="utf-8")
    (tdir / "transcript.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    (tdir / "word_times.json").write_text(
        json.dumps({"method": method, "words": word_times}, indent=2, ensure_ascii=False),
        encoding="utf-8")
    cues = S.cues_from_transcript(data)
    (tdir / "transcript.srt").write_text(S.to_srt(cues), encoding="utf-8")
    (tdir / "transcript.vtt").write_text(S.to_vtt(cues), encoding="utf-8")


def _print_plan(plan: dict) -> None:
    print(f"  chunks ({len(plan['chunks'])}):")
    for chunk in plan["chunks"]:
        print(f"    {chunk['chunk_id']:<34} {chunk['estimated_seconds']:5.1f}s  "
              f"{len(chunk['beat_ids'])} beat(s)  {len(chunk['text'].split())} words")


def _dry_run(plan: dict, tdir: pathlib.Path, model: str, voice: str) -> int:
    out_dir = tdir / "audio" / "gemini"
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for chunk in plan["chunks"]:
        key = G.cache_key(model=model, voice=voice, prompt=chunk["prompt"])
        entries.append({"chunk_id": chunk["chunk_id"], "scene_id": chunk["scene_id"],
                        "beat_ids": chunk["beat_ids"], "estimated_seconds": chunk["estimated_seconds"],
                        "cache_key": key})
    (out_dir / "dry_run.json").write_text(json.dumps({
        "model": model, "voice": voice, "profile": plan["profile"], "chunks": entries,
        "note": "no audio synthesized; set GEMINI_API_KEY (or ADC) and rerun without --dry-run",
    }, indent=2), encoding="utf-8")
    print(f"  dry run: {len(entries)} chunk(s), model {model}, voice {voice}")
    print(f"  plan -> transcript/delivery_plan.yaml, keys -> transcript/audio/gemini/dry_run.json")
    print("  set GEMINI_API_KEY or run 'gcloud auth application-default login' to synthesize")
    return 0


def _synthesize_say(proj: dict, tdir: pathlib.Path, data: dict, *, voice: str | None,
                    scenes: list[dict] | None = None) -> dict:
    audio_dir = tdir / "audio"
    manifest = {"backend": "macos-say", "voice": voice, "scenes": []}
    for scene in (scenes or data["scenes"]):
        text = " ".join(b["text"].strip() for b in scene["narration"])
        out = audio_dir / f"{scene['id']}.aiff"
        info = audio_mod.synthesize(text, out, backend="say", voice=voice)
        manifest["scenes"].append({"id": scene["id"], "path": str(out.relative_to(proj["path"])),
                                   "duration": round(info["duration"], 3),
                                   "words": scene.get("word_count")})
        print(f"  {scene['id']}: {info['duration']:.2f}s -> {out}")
    (audio_dir / "audio_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def _merge_scene_audio(existing: dict | None, fresh: dict) -> dict:
    merged = dict(existing or {})
    for scene in fresh.get("scenes", []):
        merged[scene["id"]] = scene["duration"]
    return merged


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--backend", default="auto",
                    choices=["auto", "gemini", "macos-say", "say", "pyttsx3", "silent"])
    ap.add_argument("--voice", default=None)
    ap.add_argument("--model", default=None, help=f"Gemini TTS model (default {G.DEFAULT_MODEL})")
    ap.add_argument("--profile", default=None, help=f"voice profile (default {D.DEFAULT_PROFILE})")
    ap.add_argument("--scene", default=None, help="synthesize specific scene(s), comma-separated")
    ap.add_argument("--force", action="store_true", help="ignore the audio cache")
    ap.add_argument("--dry-run", action="store_true", help="write the plan and prompts, no network")
    ap.add_argument("--fallback", default=None,
                    help="explicit fallback backend when Gemini fails (e.g. say); 'none' disables the project policy")
    ap.add_argument("--no-timing", action="store_true",
                    help="do not replace estimated timings with audio durations")
    ap.add_argument("--delay", type=float, default=8.0,
                    help="seconds between Gemini chunk requests (free-tier rate limits); cached chunks are skipped")
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))
    cfg = data.get("narration") or {}

    profile = args.profile or cfg.get("profile") or D.DEFAULT_PROFILE
    plan = D.build_plan(data, profile=profile)
    (tdir / "delivery_plan.yaml").write_text(
        yaml.safe_dump(plan, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"delivery plan: profile {profile}, {len(plan['chunks'])} semantic chunk(s) "
          f"-> transcript/delivery_plan.yaml")
    _print_plan(plan)

    requested = args.backend
    if requested == "auto":
        requested = cfg.get("backend") or "auto"
    model = args.model or cfg.get("model") or G.DEFAULT_MODEL
    voice = args.voice or _cfg_voice(cfg)
    fb_backend, fb_voice = _fallback_cfg(cfg, args.fallback)

    if requested == "silent":
        print("silent mode: no audio synthesized; the transcript still paces the presenter")
        return 0

    if args.dry_run:
        return _dry_run(plan, tdir, model, voice or G.DEFAULT_VOICE)

    selected = audio_mod.select_backend(requested)
    if selected == "macos-say":
        if not voice:
            voice = fb_voice or "Samantha"
        scenes = _scene_filter(data, args.scene)
        if not scenes:
            C.fail(f"no scene matching {args.scene}")
        print(f"backend: macos-say, voice {voice} (local fallback; flatter prosody than Gemini)")
        manifest = _synthesize_say(proj, tdir, data, voice=voice, scenes=scenes)
    elif selected == "gemini":
        auth = G.auth_status()
        if not auth["available"]:
            message = f"Gemini TTS unavailable: {auth['detail']}"
            if fb_backend:
                print(f"[fallback] {message}")
                print(f"[fallback] using {fb_backend} voice {fb_voice}; requested voice was NOT generated")
                scenes = _scene_filter(data, args.scene)
                manifest = _synthesize_say(proj, tdir, data, voice=fb_voice, scenes=scenes)
            else:
                C.fail(message)
                return 2
        else:
            print(f"backend: gemini, model {model}, voice {voice or G.DEFAULT_VOICE}, auth {auth['mode']}")
            if args.scene:
                wanted = {x.strip() for x in args.scene.split(",") if x.strip()}
                plan["chunks"] = [c for c in plan["chunks"] if c["scene_id"] in wanted]
                if not plan["chunks"]:
                    C.fail(f"no chunk matching scene {args.scene}")
            try:
                manifest = G.synthesize_plan(plan, tdir / "audio" / "gemini",
                                             model=model, voice=voice or G.DEFAULT_VOICE,
                                             force=args.force, delay=args.delay)
            except G.GeminiError as exc:
                if fb_backend:
                    print(f"[fallback] Gemini TTS failed: {exc}")
                    print(f"[fallback] using {fb_backend} voice {fb_voice}; requested voice was NOT generated")
                    scenes = _scene_filter(data, args.scene)
                    manifest = _synthesize_say(proj, tdir, data, voice=fb_voice, scenes=scenes)
                else:
                    C.fail(f"Gemini TTS failed: {exc}")
                    return 2
            else:
                print(f"  synthesized {len(manifest['chunks'])} chunk(s), "
                      f"{len(manifest['scenes'])} scene audio file(s)")
    else:
        C.fail(f"backend '{selected}' cannot synthesize narration; use gemini or macos-say")
        return 2

    if args.no_timing:
        print("timing unchanged (--no-timing); transcript.json still holds estimated timings")
        return 0

    scene_audio = {s["id"]: s["duration"] for s in manifest.get("scenes", [])}
    chunk_map: dict[str, list[dict]] = {}
    for chunk in manifest.get("chunks", []):
        chunk_map.setdefault(chunk["scene_id"], []).append(chunk)
    existing_manifest = None
    for candidate in (tdir / "audio" / "gemini" / "audio_manifest.json", tdir / "audio" / "audio_manifest.json"):
        if candidate.exists():
            existing_manifest = json.loads(candidate.read_text(encoding="utf-8"))
            break
    if existing_manifest and len(scene_audio) < len(data["scenes"]):
        scene_audio = _merge_scene_audio(scene_audio, existing_manifest)
    enriched = T.apply_audio_timing(data, scene_audio, chunk_map if manifest.get("chunks") else None)
    T.validate(enriched, "audio-timed transcript")
    _write_artifacts(tdir, enriched, T.word_times_from_timings(enriched), "audio-duration")
    print("timing: actual audio durations replace estimates in transcript.json")
    for scene in enriched["scenes"]:
        actual = scene.get("audio_duration_seconds")
        if actual is None:
            continue
        print(f"  {scene['id']:<28} audio {actual:5.1f}s  tail hold {scene['tail_dwell']:4.1f}s")
    print("note: render with '--timing transcript' so the animation follows the voice.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
